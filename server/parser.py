# ============================================
# parser.py - Resume PDF Parser
# ============================================
# Extracts text and skills from uploaded resume PDF
# and detects the candidate's primary technical field.
# ============================================

import pdfplumber
import re

# Master list of skills we look for
SKILL_KEYWORDS = {
    "frontend": [
        "html", "css", "javascript", "typescript", "react", "next.js", "vue",
        "angular", "tailwind", "bootstrap", "sass", "webpack", "vite",
        "redux", "graphql", "jest", "cypress", "figma", "svelte", "jquery"
    ],
    "backend": [
        "python", "node.js", "java", "c++", "c#", "go", "rust", "php",
        "fastapi", "django", "flask", "express", "spring", "laravel",
        "rest api", "microservices", "docker", "kubernetes", "redis",
        "postgresql", "mysql", "mongodb", "firebase", "supabase", "graphql"
    ],
    "ai": [
        "machine learning", "deep learning", "nlp", "natural language processing",
        "computer vision", "tensorflow", "pytorch", "keras", "scikit-learn",
        "pandas", "numpy", "transformers", "huggingface", "llm", "langchain",
        "openai", "gemini", "stable diffusion", "reinforcement learning",
        "neural network", "data science", "feature engineering", "xgboost",
        "lightgbm", "bert", "gpt", "rag", "vector database", "embeddings"
    ],
    "data": [
        "sql", "power bi", "tableau", "excel", "r", "matlab", "hadoop", "spark",
        "data warehouse", "etl", "airflow", "dbt", "snowflake", "bigquery",
        "data pipeline", "analytics", "looker", "metabase"
    ],
    "devops": [
        "git", "github", "gitlab", "ci/cd", "jenkins", "aws", "azure",
        "gcp", "linux", "bash", "terraform", "ansible", "helm", "istio",
        "prometheus", "grafana", "elk stack", "nginx", "docker", "kubernetes",
        "cloudformation", "pulumi", "argocd", "devops", "sre", "infrastructure"
    ]
}

# Field labels for display
FIELD_LABELS = {
    "frontend": "Frontend Developer",
    "backend": "Backend Developer",
    "ai": "AI / ML Engineer",
    "data": "Data Engineer",
    "devops": "DevOps / Cloud Engineer",
    "fullstack": "Full Stack Developer",
}


def extract_text_from_pdf(file_path: str) -> str:
    """
    Extract raw text from a PDF resume using pdfplumber
    """
    full_text = ""
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if text:
                    full_text += text + "\n"
    except Exception as e:
        print(f"PDF extraction error: {e}")
        return ""
    return full_text


def extract_skills(text: str) -> dict:
    """
    Find all skills mentioned in resume text.
    Returns dict of found skills by category.
    """
    text_lower = text.lower()
    found_skills = {
        "frontend": [],
        "backend": [],
        "ai": [],
        "data": [],
        "devops": [],
        "all": []
    }

    for category, skills in SKILL_KEYWORDS.items():
        for skill in skills:
            if skill.lower() in text_lower:
                found_skills[category].append(skill)
                if skill not in found_skills["all"]:
                    found_skills["all"].append(skill)

    return found_skills


def detect_primary_field(skills: dict) -> str:
    """
    Determine the candidate's primary technical field based on skill counts.
    Returns one of: "Full Stack Developer", "AI / ML Engineer",
    "DevOps / Cloud Engineer", "Backend Developer", "Frontend Developer",
    "Data Engineer", or "General Developer"
    """
    counts = {
        "frontend": len(skills.get("frontend", [])),
        "backend": len(skills.get("backend", [])),
        "ai": len(skills.get("ai", [])),
        "data": len(skills.get("data", [])),
        "devops": len(skills.get("devops", [])),
    }

    # Full stack: significant frontend AND backend presence
    if counts["frontend"] >= 3 and counts["backend"] >= 3:
        return "Full Stack Developer"

    # AI is dominant
    if counts["ai"] >= 3:
        return "AI / ML Engineer"

    # Find the top single category
    top_field = max(counts, key=counts.get)
    top_count = counts[top_field]

    if top_count == 0:
        return "General Developer"

    return FIELD_LABELS.get(top_field, "General Developer")


def extract_experience(text: str) -> dict:
    """
    Extract education and work experience info
    """
    experience = {
        "education": [],
        "companies": [],
        "years_experience": 0,
        "projects_count": 0
    }

    # Look for degree mentions
    degrees = ["b.e", "b.tech", "m.tech", "mca", "bca", "b.sc", "m.sc",
               "bachelor", "master", "phd", "diploma", "b.s", "m.s"]
    for degree in degrees:
        if degree in text.lower():
            experience["education"].append(degree.upper())

    # Count project mentions
    project_count = len(re.findall(
        r'\bproject\b', text.lower()
    ))
    experience["projects_count"] = min(project_count, 20)

    # Look for internship/work
    work_keywords = ["internship", "intern", "developer", "engineer",
                     "analyst", "worked at", "experience at", "software engineer",
                     "full stack", "fullstack"]
    companies_found = []
    for keyword in work_keywords:
        if keyword in text.lower():
            companies_found.append(keyword)
    experience["companies"] = companies_found[:5]

    # Estimate experience level
    if len(experience["companies"]) == 0:
        experience["years_experience"] = 0
    elif len(experience["companies"]) <= 2:
        experience["years_experience"] = 1
    else:
        experience["years_experience"] = 2

    return experience


def parse_resume(file_path: str) -> dict:
    """
    Main function - parses entire resume.
    Returns structured data ready for AI analysis,
    including detected primary_field.
    """
    # Step 1: Extract raw text via pdfplumber
    raw_text = extract_text_from_pdf(file_path)

    if not raw_text:
        return {
            "success": False,
            "error": "Could not read PDF. Make sure it is a valid, text-based PDF file.",
            "raw_text": "",
            "skills": {},
            "experience": {},
            "primary_field": "General Developer"
        }

    # Step 2: Extract skills by category
    skills = extract_skills(raw_text)

    # Step 3: Detect primary technical field
    primary_field = detect_primary_field(skills)

    # Step 4: Extract experience signals
    experience = extract_experience(raw_text)

    # Step 5: Detect red flags
    red_flags = []

    if len(skills["all"]) > 15 and experience["projects_count"] < 2:
        red_flags.append(
            "Many skills listed but very few projects found. "
            "This may reduce credibility in an interview."
        )

    advanced_skills = ["kubernetes", "tensorflow", "pytorch", "aws", "llm", "langchain"]
    for skill in advanced_skills:
        if skill in skills["all"] and experience["projects_count"] < 3:
            red_flags.append(
                f"'{skill}' listed but limited project evidence found."
            )

    skill_count = len(skills["all"])
    summary = (
        f"Detected {skill_count} skills across "
        f"{experience['projects_count']} project(s). "
        f"Primary field: {primary_field}."
    )

    return {
        "success": True,
        "raw_text": raw_text[:4000],  # First 4000 chars for AI context
        "skills": skills,
        "experience": experience,
        "red_flags": red_flags,
        "skill_count": skill_count,
        "primary_field": primary_field,
        "summary": summary
    }
