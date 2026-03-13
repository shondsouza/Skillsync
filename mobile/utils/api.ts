import axios from 'axios';
import { getAuthToken } from '@/utils/authStore';

// TODO: Replace this with your laptop's actual local IP address.
// Your phone cannot reach "localhost" on your computer.
// Example: http://192.168.1.5:8000
// IMPORTANT: Include both http:// and :8000
const BASE_URL = 'http://192.168.137.238:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    (config.headers as any) = {
      ...(config.headers as any),
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

export const uploadResume = async (fileUri: string, company: string, role: string) => {
  const form = new FormData();
  form.append('file', {
    uri: fileUri,
    type: 'application/pdf',
    name: 'resume.pdf',
  } as any);
  form.append('company', company);
  form.append('role', role);

  const res = await api.post('/upload-resume', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const generateQuiz = async (sessionId: string, company: string, role: string) => {
  const res = await api.post('/generate-quiz', {
    session_id: sessionId,
    company,
    role,
  });
  return res.data;
};

export const evaluateAnswers = async (
  sessionId: string,
  company: string,
  role: string,
  answers: any[],
) => {
  const res = await api.post('/evaluate', {
    session_id: sessionId,
    company,
    role,
    answers,
  });
  return res.data;
};

export const registerUser = async (name: string, email: string, password: string) => {
  const res = await api.post('/auth/register', { name, email, password });
  return res.data as { token: string; user: { id: string; name: string; email: string } };
};

export const loginUser = async (email: string, password: string) => {
  const res = await api.post('/auth/login', { email, password });
  return res.data as { token: string; user: { id: string; name: string; email: string } };
};

export const fetchProfile = async () => {
  const res = await api.get('/me');
  return res.data as {
    id: string;
    name: string;
    email: string;
    profile: {
      headline?: string;
      current_role?: string;
      target_role?: string;
      years_experience?: string;
      bio?: string;
    };
  };
};

export const updateProfile = async (profile: {
  name?: string;
  headline?: string;
  current_role?: string;
  target_role?: string;
  years_experience?: string;
  bio?: string;
}) => {
  const res = await api.put('/me', profile);
  return res.data;
};


