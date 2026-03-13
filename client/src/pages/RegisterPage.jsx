import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { registerUser } from '../utils/api';
import { isAuthed, setAuthToken } from '../utils/auth';

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
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="authBrand">Evalio</div>
          <p className="authTagline">
            Join thousands of developers who are using AI to prepare for their dream job interviews.
          </p>
          <div style={{ marginTop: 40 }}>
            {[
              { icon: '📄', text: 'Upload your PDF resume in seconds' },
              { icon: '🤖', text: 'AI detects your technical domain automatically' },
              { icon: '✅', text: 'Get a clear "Interview Ready" or "Keep Learning" verdict' },
              { icon: '📚', text: 'Personalized YouTube & docs links for every gap' },
            ].map((f, i) => (
              <div key={i} className="authFeature">
                <span className="authFeatureIcon">{f.icon}</span>
                <span className="authFeatureText">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="authRight">
        <div style={{ maxWidth: 400, width: '100%', margin: '0 auto' }}>
          <div className="h1" style={{ marginBottom: 8, fontSize: '1.8rem' }}>Create account</div>
          <p className="muted" style={{ marginBottom: 32, fontSize: '0.9rem' }}>
            Start your interview readiness journey
          </p>

          <div style={{ marginBottom: 18 }}>
            <div className="label">Full Name</div>
            <div className="inputWrap">
              <span className="inputIcon">👤</span>
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

          <div style={{ marginBottom: 18 }}>
            <div className="label">Email</div>
            <div className="inputWrap">
              <span className="inputIcon">✉</span>
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

          <div style={{ marginBottom: 24 }}>
            <div className="label">Password</div>
            <div className="inputWrap">
              <span className="inputIcon">🔒</span>
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
                onClick={() => setShowPwd((p) => !p)}
                tabIndex={-1}
                aria-label="Toggle password visibility"
              >
                {showPwd ? '🙈' : '👁'}
              </button>
            </div>
            {strength && (
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 4, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: strength.width, background: strength.color, borderRadius: 999, transition: 'width 0.3s ease, background 0.3s ease' }} />
                </div>
                <div style={{ fontSize: '0.78rem', color: strength.color, marginTop: 4, fontWeight: 600 }}>
                  {strength.label}
                </div>
              </div>
            )}
          </div>

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
            <div className="error" style={{ marginTop: 16 }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: 24, textAlign: 'center', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--primary2)', fontWeight: 700 }}>
              Sign in →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
