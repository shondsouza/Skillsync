from supabase import create_client
import os
from dotenv import load_dotenv
load_dotenv()

supabase = create_client(
  os.getenv('SUPABASE_URL'),
  os.getenv('SUPABASE_KEY')
)

def create_session(session_id, company, role, skills, red_flags):
  supabase.table('sessions').insert({
    'id': session_id, 'company': company,
    'role': role, 'skills_found': skills,
    'skill_count': len(skills), 'red_flags': red_flags
  }).execute()

def save_attempt(session_id, attempt_num, company, role,
                 score, eligible, skill_scores, strengths,
                 gaps, verdict):
  supabase.table('quiz_attempts').insert({
    'session_id': session_id, 'attempt_number': attempt_num,
    'company': company, 'role': role,
    'overall_score': score, 'eligible': eligible,
    'skill_scores': skill_scores, 'strengths': strengths,
    'gaps': gaps, 'verdict': verdict
  }).execute()

def get_session(session_id):
  r = supabase.table('sessions').select('*')
    .eq('id', session_id).execute()
  return r.data[0] if r.data else None
def get_attempts(session_id):
  r = supabase.table('quiz_attempts').select('*')
    .eq('session_id', session_id)
    .order('attempted_at').execute()
  return r.data
