import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { loginUser } from '../utils/api';
import { isAuthed, setAuthToken } from '../utils/auth';
import bannerImg from '../assets/banner.jpg';
import logoImg from '../assets/logo.png';
import { Brain, Target, BarChart2, Rocket, Mail, Lock, EyeOff, Eye } from 'lucide-react';

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
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${bannerImg})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.15,
            zIndex: 0
          }}
        />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <img src={logoImg} alt="Evalio Logo" style={{ height: 220, marginBottom: 24, display: 'block' }} />
          <p className="authTagline">
            AI-powered career readiness platform. Upload your resume and discover if you're truly interview-ready.
          </p>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="authRight">
        <div className="authFormCard fadeIn">
          <div className="h1 cascade-1" style={{ marginBottom: 12 }}>Welcome back</div>
          <p className="muted cascade-1" style={{ marginBottom: 40, fontSize: '1.05rem' }}>
            Sign in to continue your assessment
          </p>

          <div className="cascade-2" style={{ marginBottom: 20 }}>
            <div className="label">Email</div>
            <div className="inputWrap">
              <span className="inputIcon" style={{ display: 'flex', alignItems: 'center' }}><Mail size={18} /></span>
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

          <div className="cascade-3" style={{ marginBottom: 32 }}>
            <div className="label">Password</div>
            <div className="inputWrap">
              <span className="inputIcon" style={{ display: 'flex', alignItems: 'center' }}><Lock size={18} /></span>
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
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => setShowPwd((p) => !p)}
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="cascade-4">
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
              <div className="error" style={{ marginTop: 20 }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: 32, textAlign: 'center', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: 'var(--primary2)', fontWeight: 700, textDecoration: 'none' }}>
                Create one →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
