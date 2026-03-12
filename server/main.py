from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict, Any
import uvicorn
import shutil
import os
import json
import uuid
from datetime import datetime
import hashlib

from parser import parse_resume
from company_intel import get_company_intelligence
from ai_engine import generate_quiz, evaluate_answers, get_gap_analysis

# ============================================
# App Setup
# ============================================
app = FastAPI(
    title="Evalio",
    description="AI-powered career readiness assessment",
    version="1.0.0"
)

# Allow React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Temp folder for uploaded resumes
os.makedirs("temp_resumes", exist_ok=True)

# Simple JSON database for storing results
RESULTS_FILE = "results_db.json"
USERS_FILE = "users_db.json"


def load_results():
    if os.path.exists(RESULTS_FILE):
        with open(RESULTS_FILE, "r") as f:
            return json.load(f)
    return {}


def save_results(data):
    with open(RESULTS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def load_users() -> Dict[str, Any]:
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, "r") as f:
            return json.load(f)
    return {"users": []}


def save_users(data: Dict[str, Any]):
    with open(USERS_FILE, "w") as f:
        json.dump(data, f, indent=2)


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def create_token() -> str:
    return str(uuid.uuid4())


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    headline: Optional[str] = None
    current_role: Optional[str] = None
    target_role: Optional[str] = None
    years_experience: Optional[str] = None
    bio: Optional[str] = None


class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr


class AuthResponse(BaseModel):
    token: str
    user: UserPublic


def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.split(" ", 1)[1].strip()

    users_db = load_users()
    for user in users_db.get("users", []):
        if token in user.get("tokens", []):
            return user

    raise HTTPException(status_code=401, detail="Invalid or expired token")


# ============================================
# Request/Response Models for quiz flow
# ============================================
class QuizRequest(BaseModel):
    session_id: str
    company: str
    role: str


class AnswerItem(BaseModel):
    question_id: int
    skill: str
    difficulty: str
    question: str
    answer: str
    why_answer: str
    expected_keywords: Optional[List[str]] = []


class EvaluateRequest(BaseModel):
    session_id: str
    company: str
    role: str
    answers: List[AnswerItem]


# ============================================
# Auth & Profile Routes
# ============================================


@app.post("/auth/register", response_model=AuthResponse)
def register_user(payload: RegisterRequest):
    users_db = load_users()
    users = users_db.get("users", [])

    # Check if email already exists
    if any(u.get("email").lower() == payload.email.lower() for u in users):
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    password_hash = hash_password(payload.password)
    token = create_token()

    user = {
        "id": user_id,
        "name": payload.name,
        "email": payload.email,
        "password_hash": password_hash,
        "tokens": [token],
        "profile": {
            "headline": "",
            "current_role": "",
            "target_role": "",
            "years_experience": "",
            "bio": "",
        },
    }
    users.append(user)
    users_db["users"] = users
    save_users(users_db)

    return AuthResponse(
        token=token,
        user=UserPublic(id=user_id, name=payload.name, email=payload.email),
    )


@app.post("/auth/login", response_model=AuthResponse)
def login_user(payload: LoginRequest):
    users_db = load_users()
    users = users_db.get("users", [])
    password_hash = hash_password(payload.password)

    for user in users:
        if user.get("email").lower() == payload.email.lower() and user.get("password_hash") == password_hash:
            token = create_token()
            tokens = user.get("tokens", [])
            tokens.append(token)
            user["tokens"] = tokens
            save_users(users_db)
            return AuthResponse(
                token=token,
                user=UserPublic(id=user["id"], name=user["name"], email=user["email"]),
            )

    raise HTTPException(status_code=401, detail="Invalid email or password")


@app.get("/me")
def get_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    profile = current_user.get("profile", {})
    return {
        "id": current_user["id"],
        "name": current_user["name"],
        "email": current_user["email"],
        "profile": profile,
    }


@app.put("/me")
def update_profile(update: ProfileUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    users_db = load_users()
    users = users_db.get("users", [])

    for user in users:
        if user.get("id") == current_user["id"]:
            if update.name is not None:
                user["name"] = update.name
            profile = user.get("profile", {})
            if update.headline is not None:
                profile["headline"] = update.headline
            if update.current_role is not None:
                profile["current_role"] = update.current_role
            if update.target_role is not None:
                profile["target_role"] = update.target_role
            if update.years_experience is not None:
                profile["years_experience"] = update.years_experience
            if update.bio is not None:
                profile["bio"] = update.bio
            user["profile"] = profile
            save_users({"users": users})
            return {
                "id": user["id"],
                "name": user["name"],
                "email": user["email"],
                "profile": profile,
            }

    raise HTTPException(status_code=404, detail="User not found")


# ============================================
# Quiz & Results Routes
# ============================================

@app.get("/")
def root():
    return {
        "message": "Evalio API is running!",
        "version": "1.0.0",
        "endpoints": [
            "POST /upload-resume",
            "POST /generate-quiz",
            "POST /evaluate",
            "GET /results/{session_id}",
            "GET /progress/{email}"
        ]
    }


@app.post("/upload-resume")
async def upload_resume(
    file: UploadFile = File(...),
    company: str = "",
    role: str = ""
):
    """
    Step 1: Upload and parse resume PDF
    Returns extracted skills and session ID
    """

    # Validate file type
    if not file.filename.endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are accepted"
        )

    # Save file temporarily
    session_id = str(uuid.uuid4())[:8]
    file_path = f"temp_resumes/{session_id}.pdf"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Parse the resume
    resume_data = parse_resume(file_path)

    if not resume_data["success"]:
        os.remove(file_path)
        raise HTTPException(
            status_code=400,
            detail=resume_data["error"]
        )

    # Get company intelligence if provided
    company_intel = {}
    if company and role:
        company_intel = get_company_intelligence(company, role)

    # Get quick gap analysis
    gap_analysis = {}
    if company_intel.get("role_specific_stack"):
        gap_analysis = get_gap_analysis(
            resume_skills=resume_data["skills"]["all"],
            company_stack=company_intel["role_specific_stack"],
            role=role
        )

    # Store session data
    results_db = load_results()
    results_db[session_id] = {
        "created_at": datetime.now().isoformat(),
        "resume_data": resume_data,
        "company": company,
        "role": role,
        "company_intel": company_intel,
        "gap_analysis": gap_analysis,
        "quiz_attempts": []
    }
    save_results(results_db)

    # Clean up temp file
    os.remove(file_path)

    return {
        "success": True,
        "session_id": session_id,
        "skills_found": resume_data["skills"]["all"],
        "skill_count": resume_data["skill_count"],
        "red_flags": resume_data["red_flags"],
        "company_stack": company_intel.get("role_specific_stack", []),
        "gap_analysis": gap_analysis,
        "summary": resume_data["summary"]
    }


@app.post("/generate-quiz")
async def generate_quiz_endpoint(request: QuizRequest):
    """
    Step 2: Generate custom quiz questions
    Based on company's tech stack
    """

    # Load session
    results_db = load_results()
    session = results_db.get(request.session_id)

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found. Please upload resume first."
        )

    # Get company intel
    company_intel = get_company_intelligence(
        request.company,
        request.role
    )

    company_stack = company_intel.get(
        "role_specific_stack",
        company_intel.get("stack", [])
    )

    resume_skills = session["resume_data"]["skills"]["all"]

    # Generate quiz using AI
    quiz_data = generate_quiz(
        company=request.company,
        role=request.role,
        company_stack=company_stack,
        resume_skills=resume_skills
    )

    # Save quiz to session
    results_db[request.session_id]["current_quiz"] = quiz_data
    results_db[request.session_id]["company_stack"] = company_stack
    save_results(results_db)

    return {
        "success": True,
        "session_id": request.session_id,
        "company": request.company,
        "role": request.role,
        "company_stack": company_stack,
        "questions": quiz_data["questions"],
        "total_questions": len(quiz_data["questions"])
    }


@app.post("/evaluate")
async def evaluate_endpoint(request: EvaluateRequest):
    """
    Step 3: Evaluate all answers
    Returns score, verdict, and learning roadmap
    """

    # Load session
    results_db = load_results()
    session = results_db.get(request.session_id)

    company_stack = []
    if session:
        company_stack = session.get("company_stack", [])

    # Convert answers to dict format
    answers_list = [
        {
            "skill": a.skill,
            "difficulty": a.difficulty,
            "question": a.question,
            "answer": a.answer,
            "why_answer": a.why_answer,
            "expected_keywords": a.expected_keywords
        }
        for a in request.answers
    ]

    # Evaluate using AI
    evaluation = evaluate_answers(
        company=request.company,
        role=request.role,
        answers=answers_list,
        company_stack=company_stack
    )

    # Save attempt to history
    if session:
        attempt = {
            "attempt_number": len(
                session.get("quiz_attempts", [])
            ) + 1,
            "timestamp": datetime.now().isoformat(),
            "score": evaluation["overall_score"],
            "eligible": evaluation["eligible"],
            "company": request.company,
            "role": request.role
        }
        results_db[request.session_id]["quiz_attempts"].append(attempt)
        results_db[request.session_id]["latest_result"] = evaluation
        save_results(results_db)

    return {
        "success": True,
        "session_id": request.session_id,
        "company": request.company,
        "role": request.role,
        "result": evaluation
    }


@app.get("/results/{session_id}")
def get_results(session_id: str):
    """
    Get full results for a session including
    attempt history and progress
    """
    results_db = load_results()
    session = results_db.get(session_id)

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found"
        )

    attempts = session.get("quiz_attempts", [])
    progress = None

    if len(attempts) >= 2:
        first_score = attempts[0]["score"]
        latest_score = attempts[-1]["score"]
        progress = {
            "improved": latest_score > first_score,
            "points_gained": latest_score - first_score,
            "attempts_count": len(attempts),
            "scores_history": [a["score"] for a in attempts]
        }

    return {
        "session_id": session_id,
        "skills_found": session["resume_data"]["skills"]["all"],
        "company": session.get("company"),
        "role": session.get("role"),
        "latest_result": session.get("latest_result"),
        "attempts": attempts,
        "progress": progress
    }


@app.get("/health")
def health_check():
    return {"status": "healthy", "message": "Evalio is running"}


# ============================================
# Run Server
# ============================================
if __name__ == "__main__":
    print("=" * 50)
    print("  Evalio Backend Starting...")
    print("=" * 50)
    print("  API: http://localhost:8000")
    print("  Docs: http://localhost:8000/docs")
    print("=" * 50)
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
