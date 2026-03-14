import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { registerUser } from '../utils/api';
import { isAuthed, setAuthToken } from '../utils/auth';
import bannerImg from '../assets/banner.jpg';
import logoImg from '../assets/logo.png';
import { FileText, Bot, CheckCircle, BookOpen, User, Mail, Lock, EyeOff, Eye } from 'lucide-react';

function getPasswordStrength(pw) {
  if (pw.length === 0) return null;
  if (pw.length < 6) return { label: 'Too short', color: 'var(--danger)', width: '20%' };
  if (pw.length < 8) return { label: 'Weak', color: 'var(--warning)', width: '40%' };
  const hasUpper = /[A-Z]/.test(pw);
  const hasDigit = /[0-9]/.test(pw);
  const hasSpecial = /[^A-Za-z0-9]/.test(pw);
  const score = (hasUpper ? 1 : 0) + (hasDigit ? 1 : 0) + (hasSpecial ? 1 : 0);
  if (score === 0) return { label: 'Weak', color: 'var(--warning)', width: '40%' };
  if (score === 1) return { label: 'Fair', color: 'var(--warning)', width: '60%' };
  if (score === 2) return { label: 'Good', color: 'var(--success)', width: '80%' };
  return { label: 'Strong', color: 'var(--success)', width: '100%' };
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  if (isAuthed()) return <Navigate to="/dashboard" replace />;

  const strength = getPasswordStrength(password);

  const onRegister = async () => {
    setError('');
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    try {
      setIsBusy(true);
      const res = await registerUser(name.trim(), email.trim(), password);
      const token = res?.token;
      if (!token) throw new Error('Registration succeeded but no token was returned.');
      setAuthToken(token);
      setIsBusy(false);
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setIsBusy(false);
      if (e?.code === 'ERR_NETWORK' || e?.message === 'Network Error') {
        setError('Cannot connect to the server. Please make sure the backend is running at http://localhost:8000');
      } else {
        setError(e?.response?.data?.detail || e?.message || 'Registration failed. Please try again.');
      }
    }
  };

  const onKeyDown = (e) => { if (e.key === 'Enter') onRegister(); };

  return (
    <div className="authPage">
      {/* Left Panel */}
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
            Join thousands of developers who are using AI to prepare for their dream job interviews.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="authRight">
        <div className="authFormCard fadeIn">
          <div className="h1 cascade-1" style={{ marginBottom: 12 }}>Create account</div>
          <p className="muted cascade-1" style={{ marginBottom: 40, fontSize: '1.05rem' }}>
            Start your interview readiness journey
          </p>

          <div className="cascade-2" style={{ marginBottom: 20 }}>
            <div className="label">Full Name</div>
            <div className="inputWrap">
              <span className="inputIcon" style={{ display: 'flex', alignItems: 'center' }}><User size={18} /></span>
              <input
                id="register-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Your full name"
                disabled={isBusy}
                autoComplete="name"
                autoFocus
              />
            </div>
          </div>

          <div className="cascade-3" style={{ marginBottom: 20 }}>
            <div className="label">Email</div>
            <div className="inputWrap">
              <span className="inputIcon" style={{ display: 'flex', alignItems: 'center' }}><Mail size={18} /></span>
              <input
                id="register-email"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="you@example.com"
                disabled={isBusy}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="cascade-4" style={{ marginBottom: 32 }}>
            <div className="label">Password</div>
            <div className="inputWrap">
              <span className="inputIcon" style={{ display: 'flex', alignItems: 'center' }}><Lock size={18} /></span>
              <input
                id="register-password"
                className="input"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Choose a strong password"
                disabled={isBusy}
                autoComplete="new-password"
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
            {strength && (
              <div style={{ marginTop: 12 }}>
                <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: strength.width, background: strength.color, borderRadius: 999, transition: 'width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), background 0.4s ease' }} />
                </div>
                <div style={{ fontSize: '0.8rem', color: strength.color, marginTop: 6, fontWeight: 600 }}>
                  {strength.label}
                </div>
              </div>
            )}
          </div>

          <div className="cascade-4">
            <button
              id="register-submit"
              className="btn btnPrimary btnLg btnFull"
              onClick={onRegister}
              disabled={isBusy}
            >
              {isBusy ? (
                <><span className="spinner" /> Creating account…</>
              ) : (
                'Create account →'
              )}
            </button>

            {error && (
              <div className="error" style={{ marginTop: 20 }}>
                {error}
              </div>
            )}

            <div style={{ marginTop: 32, textAlign: 'center', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: 'var(--primary2)', fontWeight: 700, textDecoration: 'none' }}>
                Sign in →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
