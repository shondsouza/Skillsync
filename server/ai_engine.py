# server/ai_engine.py
# Using Google Gemini instead of Claude

import google.generativeai as genai
import json
import os
from dotenv import load_dotenv

load_dotenv()

# Configure Gemini
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")


def generate_quiz(company, role, company_stack, resume_skills):
    stack_str = ", ".join(company_stack[:8])
    resume_str = ", ".join(resume_skills[:10])

    prompt = f"""You are a senior technical interviewer at {company}.
You are interviewing a candidate for: {role}

Company tech stack: {stack_str}
Candidate resume skills: {resume_str}

Generate between 8 and 10 UNIQUE multiple-choice technical interview questions.
Every question MUST:
- Be directly related to BOTH the company tech stack and the candidate skills.
- Be specific to the role and realistic for a real interview.
- Have a clear difficulty level: "Easy", "Medium", or "Hard".
- Include EXACTLY 4 options that are all plausible answers.
- Avoid giving away which option is correct inside the text.

DO NOT repeat the same question or trivial variations.

Return ONLY valid JSON, no extra text, no markdown:
{{
  "questions": [
    {{
      "id": 1,
      "skill": "React",
      "question": "What is the Virtual DOM?",
      "difficulty": "Easy",
      "why_prompt": "Can you give a real example from your projects?",
      "options": [
        "A JavaScript object representation of the UI tree used for efficient updates",
        "A browser API that directly manipulates HTML elements",
        "A CSS optimization engine that reduces repaint cost",
        "A build tool that bundles React components"
      ],
      "expected_keywords": ["virtual dom", "diffing", "reconciliation"]
    }}
  ]
}}"""

    try:
        response = model.generate_content(prompt)
        text = response.text
        # Clean any markdown formatting Gemini adds
        clean = text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean)

        # Post-process to guarantee options and ids
        questions = data.get("questions", [])
        if not isinstance(questions, list):
            questions = []

        processed = []
        for idx, q in enumerate(questions, start=1):
            if not isinstance(q, dict):
                continue
            # Ensure id is present and stable
            q.setdefault("id", idx)

            skill = q.get("skill", "General")
            # Ensure we always have 4 options
            opts = q.get("options")
            if not isinstance(opts, list) or len(opts) < 4:
                q["options"] = [
                    f"A strong and accurate answer related to {skill}",
                    f"A partially correct but incomplete answer about {skill}",
                    f"An answer that confuses {skill} with a different concept",
                    f"An irrelevant or clearly incorrect answer unrelated to {skill}",
                ]
            processed.append(q)

        return {"questions": processed}

    except Exception as e:
        print(f"Gemini quiz generation error: {e}")
        # Fallback questions
        return {
            "questions": [
                {
                    "id": 1,
                    "skill": "Core Concepts",
                    "question": f"Explain a key concept in {role} you use daily.",
                    "difficulty": "Easy",
                    "why_prompt": "Why is this important for the role?",
                    "expected_keywords": []
                },
                {
                    "id": 2,
                    "skill": "Problem Solving",
                    "question": "How do you debug a complex technical issue?",
                    "difficulty": "Medium",
                    "why_prompt": "What tools do you prefer and why?",
                    "expected_keywords": ["debug", "logs", "systematic"]
                },
                {
                    "id": 3,
                    "skill": "Best Practices",
                    "question": "How do you ensure code quality?",
                    "difficulty": "Medium",
                    "why_prompt": "Give a real example from your projects.",
                    "expected_keywords": ["testing", "review", "clean code"]
                },
                {
                    "id": 4,
                    "skill": "System Design",
                    "question": f"Design a scalable feature for {company}.",
                    "difficulty": "Hard",
                    "why_prompt": "What tradeoffs would you consider?",
                    "expected_keywords": ["scale", "performance", "tradeoffs"]
                },
                {
                    "id": 5,
                    "skill": "Experience",
                    "question": "Describe your most challenging project.",
                    "difficulty": "Medium",
                    "why_prompt": "What would you do differently now?",
                    "expected_keywords": ["challenge", "learned", "improved"]
                }
            ]
        }


def evaluate_answers(company, role, answers, company_stack):
    answers_text = ""
    for i, a in enumerate(answers):
        answers_text += f"""
Question {i+1} ({a['skill']} - {a['difficulty']}):
Q: {a['question']}
Answer: {a['answer']}
Why: {a['why_answer']}
Expected keywords: {', '.join(a.get('expected_keywords', []))}
---"""

    prompt = f"""You are evaluating a candidate for {role} at {company}.
Company tech stack: {', '.join(company_stack[:6])}

Answers:
{answers_text}

Evaluate strictly but fairly. Score 70+ means eligible.

Return ONLY valid JSON, no markdown, no extra text:
{{
  "overall_score": 68,
  "eligible": false,
  "minimum_required": 70,
  "verdict": "One sentence about overall performance",
  "skill_scores": [
    {{
      "skill": "React",
      "score": 75,
      "feedback": "Brief specific feedback"
    }}
  ],
  "strengths": ["specific strength from answers"],
  "gaps": [
    {{
      "skill": "TypeScript",
      "score": 45,
      "why_weak": "What was missing in their answer",
      "resources": [
        {{
          "name": "TypeScript Official Handbook",
          "url": "https://www.typescriptlang.org/docs/handbook/",
          "time": "1 week",
          "type": "Documentation"
        }},
        {{
          "name": "TypeScript Full Course",
          "url": "https://www.youtube.com/results?search_query=typescript+tutorial",
          "time": "3 hours",
          "type": "Video"
        }}
      ]
    }}
  ],
  "next_attempt_tips": ["Actionable tip for next attempt"]
}}"""

    try:
        response = model.generate_content(prompt)
        text = response.text
        clean = text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean)

    except Exception as e:
        print(f"Gemini evaluation error: {e}")
        return {
            "overall_score": 60,
            "eligible": False,
            "minimum_required": 70,
            "verdict": "Evaluation failed. Please try again.",
            "skill_scores": [],
            "strengths": [],
            "gaps": [],
            "next_attempt_tips": ["Retry the assessment"]
        }


def get_gap_analysis(resume_skills, company_stack, role):
    prompt = f"""Compare skill sets for a {role} position.

Candidate has: {', '.join(resume_skills)}
Company needs: {', '.join(company_stack)}

Return ONLY valid JSON, no markdown:
{{
  "match_score": 65,
  "strong_matches": ["skill1", "skill2"],
  "partial_matches": [
    {{"skill": "React", "gap": "Has basics but needs advanced"}}
  ],
  "missing_critical": ["TypeScript", "GraphQL"],
  "missing_optional": ["Jest", "CI/CD"]
}}"""

    try:
        response = model.generate_content(prompt)
        text = response.text
        clean = text.replace("```json", "").replace("```", "").strip()
        return json.loads(clean)

    except Exception as e:
        print(f"Gemini gap analysis error: {e}")
        return {
            "match_score": 50,
            "strong_matches": [],
            "partial_matches": [],
            "missing_critical": [],
            "missing_optional": []
        }