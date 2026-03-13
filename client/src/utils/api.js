import axios from 'axios';

const BASE_URL = 'http://localhost:8000';
const api = axios.create({ baseURL: BASE_URL, timeout: 30000 });

const getToken = () => {
  try {
    return localStorage.getItem('evalio_token');
  } catch {
    return null;
  }
};

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = {
      ...(config.headers || {}),
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

export const uploadResume = async (file, company, role) => {
  const form = new FormData();
  form.append('file', file);
  form.append('company', company);
  form.append('role', role);
  const res = await api.post('/upload-resume', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const generateQuiz = async (sessionId, company, role, primaryField = 'General Developer') => {
  const res = await api.post('/generate-quiz', {
    session_id: sessionId,
    company,
    role,
    primary_field: primaryField,
  });
  return res.data;
};

export const checkHealth = async () => {
  const res = await api.get('/health', { timeout: 4000 });
  return res.data;
};

export const evaluateAnswers = async (sessionId, company, role, answers) => {
  const res = await api.post('/evaluate', { session_id: sessionId, company, role, answers });
  return res.data;
};

export const getResults = async (sessionId) => {
  const res = await api.get('/results/' + sessionId);
  return res.data;
};

export const registerUser = async (name, email, password) => {
  const res = await api.post('/auth/register', { name, email, password });
  return res.data;
};

export const loginUser = async (email, password) => {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
};

export const fetchProfile = async () => {
  const res = await api.get('/me');
  return res.data;
};
