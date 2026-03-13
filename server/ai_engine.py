# server/ai_engine.py
# Using Google Gemini for AI-powered quiz generation and evaluation

from google import genai
import json
import os
import traceback
from dotenv import load_dotenv

load_dotenv()

_api_key = os.getenv("GEMINI_API_KEY")
if not _api_key:
    raise RuntimeError(
        "MISSING GEMINI_API_KEY: add GEMINI_API_KEY=... to server/.env and restart the server."
    )

print(f"[ai_engine] Gemini API key loaded: {'*' * (len(_api_key) - 6)}{_api_key[-6:]}")

# Configure Gemini
client = genai.Client(api_key=_api_key)


def generate_quiz(company, role, company_stack, resume_skills, primary_field="General Developer"):
    stack_str = ", ".join(company_stack[:8]) if company_stack else "General tech stack"
    resume_str = ", ".join(resume_skills[:12]) if resume_skills else "various skills"

    prompt = f"""You are a senior technical interviewer at {company}.
You are interviewing a candidate for: {role}
The candidate's primary field is: {primary_field}

Company tech stack: {stack_str}
Candidate resume skills: {resume_str}

Generate exactly 4 UNIQUE multiple-choice technical interview questions tailored to the candidate's field ({primary_field}).

Every question MUST:
- Be directly relevant to the candidate's primary field and skills
- Be specific, realistic, and appropriate for a real technical interview
- Have a clear difficulty level: "Easy", "Medium", or "Hard"
- Have EXACTLY 4 answer options (A, B, C, D) that are all plausible
- Include a thought-provoking "why_prompt" asking the candidate to explain their reasoning
- Include 3-5 expected_keywords that a correct answer should mention

Vary the difficulty: include at least 1 Easy, 1 Medium, and 1 Hard question.
DO NOT repeat the same question or trivial variations.

Return ONLY valid JSON with no extra text, no markdown fences:
{{
  "questions": [
    {{
      "id": 1,
      "skill": "React",
      "question": "What is the Virtual DOM and why does React use it?",
      "difficulty": "Easy",
      "why_prompt": "Can you relate this to a real project you built?",
      "options": [
        "A JavaScript object representation of the UI tree used for efficient diffing and updates",
        "A browser API that directly manipulates native HTML elements faster than standard DOM",
        "A CSS optimization engine that reduces browser repaint and reflow costs",
        "A build tool that pre-renders React components to static HTML at compile time"
      ],
      "expected_keywords": ["virtual dom", "diffing", "reconciliation", "performance", "re-render"]
    }}
  ]
}}"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        text = response.text
        clean = text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean)

        questions = data.get("questions", [])
        if not isinstance(questions, list):
            questions = []

        processed = []
        for idx, q in enumerate(questions, start=1):
            if not isinstance(q, dict):
                continue
            q.setdefault("id", idx)
            skill = q.get("skill", "General")

            opts = q.get("options")
            if not isinstance(opts, list) or len(opts) < 4:
                q["options"] = [
                    f"The most accurate and complete answer demonstrating deep knowledge of {skill}",
                    f"A partially correct answer that shows basic understanding of {skill}",
                    f"An answer that confuses {skill} concepts with a related but different technology",
                    f"An incorrect or irrelevant answer that misunderstands {skill} entirely",
                ]
            else:
                q["options"] = q["options"][:4]

            q.setdefault("why_prompt", f"Why did you choose this? How have you used {skill} in practice?")
            q.setdefault("expected_keywords", [])
            processed.append(q)

        while len(processed) < 4:
            idx = len(processed) + 1
            processed.append({
                "id": idx,
                "skill": primary_field.split("/")[0].strip(),
                "question": f"Describe a challenging problem you solved using your {primary_field} skills.",
                "difficulty": "Medium",
                "why_prompt": "What was your approach and what did you learn?",
                "options": [
                    "Systematically broke down the problem, researched solutions, and implemented iteratively",
                    "Used trial and error until the most obvious solution worked",
                    "Delegated the problem to a senior team member who solved it",
                    "Avoided the problem by redesigning the feature requirements"
                ],
                "expected_keywords": ["approach", "debug", "solution", "learned", "iterative"]
            })

        return {"questions": processed[:4]}

    except Exception as e:
        print(f"Gemini quiz generation error: {e}")
        field_skill = primary_field.split("/")[0].strip() or "Software Development"
        return {
            "questions": [
                {
                    "id": 1,
                    "skill": field_skill,
                    "question": f"What is the most important principle in {field_skill} and why?",
                    "difficulty": "Easy",
                    "why_prompt": "Give a real example from your work or projects.",
                    "options": [
                        "Writing clean, maintainable, and well-documented code that others can understand",
                        "Optimizing performance at every layer, even before functionality is complete",
                        "Shipping features as fast as possible to meet business deadlines",
                        "Using the newest and most popular frameworks regardless of project needs"
                    ],
                    "expected_keywords": ["clean code", "maintainability", "best practices"]
                },
                {
                    "id": 2,
                    "skill": "Problem Solving",
                    "question": "How do you approach debugging a complex issue in production?",
                    "difficulty": "Medium",
                    "why_prompt": "Walk me through a real incident you dealt with.",
                    "options": [
                        "Reproduce locally, check logs, isolate variables systematically, then fix and monitor",
                        "Restart the service and hope the issue resolves itself",
                        "Ask a colleague to look at it since debugging is time-consuming",
                        "Roll back the last deployment without investigating the root cause"
                    ],
                    "expected_keywords": ["reproduce", "logs", "isolate", "systematic", "monitor"]
                },
                {
                    "id": 3,
                    "skill": "System Design",
                    "question": f"How would you design a scalable API for {company}'s {role} use case?",
                    "difficulty": "Hard",
                    "why_prompt": "What tradeoffs did you consider in your design?",
                    "options": [
                        "Use load balancing, caching (Redis), database sharding, and async queues for scale",
                        "Build a monolith first, then split into microservices only when traffic demands it",
                        "Use a single server with vertical scaling since it is simpler to manage",
                        "Rely entirely on third-party SaaS solutions to avoid infrastructure complexity"
                    ],
                    "expected_keywords": ["scale", "cache", "async", "tradeoffs", "load balancing"]
                },
                {
                    "id": 4,
                    "skill": "Code Quality",
                    "question": "What practices do you follow to ensure high code quality?",
                    "difficulty": "Medium",
                    "why_prompt": "How have these practices helped your team in the past?",
                    "options": [
                        "Code reviews, unit/integration tests, linting, CI pipelines, and documentation",
                        "Manual testing only since automated tests slow down development velocity",
                        "Having the senior dev review all code before merging without tests",
                        "Skipping reviews for small changes since they rarely introduce bugs"
                    ],
                    "expected_keywords": ["tests", "review", "ci/cd", "lint", "documentation"]
                }
            ]
        }


def evaluate_answers(company, role, answers, company_stack):
    answers_text = ""
    for i, a in enumerate(answers):
        answers_text += f"""
Question {i+1} ({a['skill']} - {a['difficulty']}):
Q: {a['question']}
Answer chosen: {a['answer']}
Candidate's reasoning: {a['why_answer']}
Expected keywords: {', '.join(a.get('expected_keywords', []))}
---"""

    prompt = f"""You are evaluating a technical interview candidate for {role} at {company}.
Company tech stack: {', '.join(company_stack[:6]) if company_stack else 'Not specified'}

Candidate's quiz answers:
{answers_text}

Evaluate strictly but fairly based on BOTH the MCQ answer chosen AND the quality of reasoning given.
A score of 70 or above means the candidate is ready for the interview.

Instructions for the "gaps" section:
- Include 2-4 areas where the candidate is weak
- For each gap provide 3 high-quality resources:
  * 1 YouTube search URL (use https://www.youtube.com/results?search_query=... format)
  * 1 official documentation link
  * 1 additional resource (GitHub repo, free book, or course)

Instructions for the "question_review" section:
- Include ONE entry per question (all {len(answers)} questions)
- Set is_correct: true if the answer was correct AND reasoning showed understanding
- Set is_correct: false if the answer was wrong OR reasoning was shallow/incorrect
- For WRONG answers only: include what_was_wrong and 2 resources (1 YouTube + 1 Documentation)
- For CORRECT answers: omit what_was_wrong and resources (or set to empty arrays)
- correct_answer must be a clear 2-3 sentence explanation of the right answer

Return readiness_verdict as exactly "Interview Ready" if overall_score >= 70, otherwise "Not Prepared".

Return ONLY valid JSON, no markdown, no extra text:
{{
  "overall_score": 68,
  "eligible": false,
  "minimum_required": 70,
  "readiness_verdict": "Not Prepared",
  "verdict": "Shows promise in frontend concepts but needs to deepen knowledge in TypeScript and system design.",
  "skill_scores": [
    {{
      "skill": "React",
      "score": 80,
      "feedback": "Good understanding of core concepts with practical examples."
    }}
  ],
  "strengths": [
    "Solid understanding of React component lifecycle",
    "Good systematic debugging approach"
  ],
  "gaps": [
    {{
      "skill": "TypeScript",
      "score": 40,
      "why_weak": "Did not mention type safety, interfaces, or generics in reasoning.",
      "resources": [
        {{
          "name": "TypeScript Official Handbook",
          "url": "https://www.typescriptlang.org/docs/handbook/intro.html",
          "time": "1 week",
          "type": "Documentation"
        }},
        {{
          "name": "TypeScript Full Course for Beginners",
          "url": "https://www.youtube.com/results?search_query=typescript+full+course+beginners+2024",
          "time": "4 hours",
          "type": "YouTube"
        }},
        {{
          "name": "TypeScript Deep Dive (Free Book)",
          "url": "https://basarat.gitbook.io/typescript/",
          "time": "2 weeks",
          "type": "Book"
        }}
      ]
    }}
  ],
  "question_review": [
    {{
      "question_number": 1,
      "skill": "React",
      "question": "What is the Virtual DOM?",
      "candidate_answer": "A browser API that directly manipulates HTML elements",
      "is_correct": false,
      "correct_answer": "The Virtual DOM is a JavaScript object representation of the real DOM. React creates and compares (diffs) this in-memory copy to calculate the minimal set of real DOM updates needed, making rendering highly efficient.",
      "what_was_wrong": "The candidate confused Virtual DOM with direct DOM APIs. The Virtual DOM is NOT a browser API — it is React's own in-memory abstraction for performance optimization.",
      "resources": [
        {{
          "name": "React Docs — Render and Commit",
          "url": "https://react.dev/learn/render-and-commit",
          "type": "Documentation"
        }},
        {{
          "name": "React Virtual DOM Explained",
          "url": "https://www.youtube.com/results?search_query=react+virtual+dom+explained+2024",
          "type": "YouTube"
        }}
      ]
    }},
    {{
      "question_number": 2,
      "skill": "TypeScript",
      "question": "What is a TypeScript interface?",
      "candidate_answer": "A class that can be instantiated to create objects",
      "is_correct": true,
      "correct_answer": "An interface in TypeScript defines the shape (structure) of an object — the property names, types, and methods it must have. It is a compile-time contract only; interfaces are erased at runtime.",
      "what_was_wrong": "",
      "resources": []
    }}
  ],
  "next_attempt_tips": [
    "Study TypeScript generics and utility types",
    "Practice system design with real-world scenarios"
  ]
}}"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
        text = response.text
        clean = text.replace("```json", "").replace("```", "").strip()
        result = json.loads(clean)

        # Ensure readiness_verdict is always set
        if "readiness_verdict" not in result:
            score = result.get("overall_score", 0)
            result["readiness_verdict"] = "Interview Ready" if score >= 70 else "Not Prepared"

        # Ensure question_review exists
        if "question_review" not in result:
            result["question_review"] = []

        return result

    except Exception as e:
        print(f"\n[evaluate_answers] ERROR: {type(e).__name__}: {e}")
        traceback.print_exc()
        raise RuntimeError(f"Gemini evaluation failed: {type(e).__name__}: {e}") from e


def get_gap_analysis(resume_skills, company_stack, role):
    prompt = f"""Compare skill sets for a {role} position.

Candidate has: {', '.join(resume_skills)}
Company needs: {', '.join(company_stack)}

Return ONLY valid JSON, no markdown:
{{
  "match_score": 65,
  "strong_matches": ["skill1", "skill2"],
  "partial_matches": [
    {{"skill": "React", "gap": "Has basics but needs advanced patterns"}}
  ],
  "missing_critical": ["TypeScript", "GraphQL"],
  "missing_optional": ["Jest", "CI/CD"]
}}"""

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt
        )
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