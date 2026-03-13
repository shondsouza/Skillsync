import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { loginUser } from '../utils/api';
import { isAuthed, setAuthToken } from '../utils/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  if (isAuthed()) return <Navigate to="/dashboard" replace />;

  const onLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    try {
      setIsBusy(true);
      const res = await loginUser(email.trim(), password);
      const token = res?.token;
      if (!token) throw new Error('Login succeeded but no token was returned.');
      setAuthToken(token);
      setIsBusy(false);
      navigate(from, { replace: true });
    } catch (e) {
      setIsBusy(false);
      if (e?.code === 'ERR_NETWORK' || e?.message === 'Network Error') {
        setError(
          'Cannot connect to the server. Please make sure the backend is running at http://localhost:8000'
        );
      } else {
        setError(e?.response?.data?.detail || e?.message || 'Login failed. Please try again.');
      }
    }
  };

  const onKeyDown = (e) => { if (e.key === 'Enter') onLogin(); };

  return (
    <div className="authPage">
      {/* Left Panel — Branding */}
      <div className="authLeft">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="authBrand">Evalio</div>
          <p className="authTagline">
            AI-powered career readiness platform. Upload your resume and discover if you're truly interview-ready.
          </p>

          <div style={{ marginTop: 40 }}>
            {[
              { icon: '🧠', text: 'Smart resume parsing with field detection' },
              { icon: '🎯', text: 'Tailored technical quiz based on your skills' },
              { icon: '📊', text: 'Detailed score with gap analysis' },
              { icon: '🚀', text: 'Curated resources to close your skill gaps' },
            ].map((f, i) => (
              <div key={i} className="authFeature">
                <span className="authFeatureIcon">{f.icon}</span>
                <span className="authFeatureText">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="authRight">
        <div style={{ maxWidth: 400, width: '100%', margin: '0 auto' }}>
          <div className="h1" style={{ marginBottom: 8, fontSize: '1.8rem' }}>Welcome back</div>
          <p className="muted" style={{ marginBottom: 32, fontSize: '0.9rem' }}>
            Sign in to continue your assessment
          </p>

          <div style={{ marginBottom: 18 }}>
            <div className="label">Email</div>
            <div className="inputWrap">
              <span className="inputIcon">✉</span>
              <input
                id="login-email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="you@example.com"
                disabled={isBusy}
                autoComplete="email"
                autoFocus
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <div className="label">Password</div>
            <div className="inputWrap">
              <span className="inputIcon">🔒</span>
              <input
                id="login-password"
                className="input"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="••••••••"
                disabled={isBusy}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="inputToggle"
                onClick={() => setShowPwd((p) => !p)}
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                {showPwd ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button
            id="login-submit"
            className="btn btnPrimary btnLg btnFull"
            onClick={onLogin}
            disabled={isBusy}
          >
            {isBusy ? (
              <><span className="spinner" /> Signing in…</>
            ) : (
              'Sign in →'
            )}
          </button>

          {error && (
            <div className="error" style={{ marginTop: 16 }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--primary2)', fontWeight: 700 }}>
              Create one →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
