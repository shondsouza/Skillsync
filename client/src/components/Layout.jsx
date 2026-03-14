import React from 'react';
import { Link } from 'react-router-dom';
import { clearAuthToken, isAuthed } from '../utils/auth';
import logoImg from '../assets/logo.png';

export default function Layout({ title, subtitle, right, children }) {

  return (
    <div>
      <nav className="topbar">
        <div className="topbarInner row spaceBetween">
          <div className="row" style={{ gap: 12 }}>
            <Link to={isAuthed() ? '/dashboard' : '/login'} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}>
              <img src={logoImg} alt="Evalio Logo" style={{ height: 72 }} />
            </Link>
            {title ? <span className="pill pillDark">{title}</span> : null}
          </div>

          <div className="row" style={{ gap: 16 }}>
            {right}
            {isAuthed() ? (
              <button
                className="btn btnDanger"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                onClick={() => {
                  clearAuthToken();
                  window.location.href = '/login';
                }}
              >
                Log out
              </button>
            ) : null}
          </div>
        </div>
      </nav>

      <div className="container">
        {subtitle ? (
          <p className="sub" style={{ marginTop: 8 }}>{subtitle}</p>
        ) : null}
        {children}
      </div>
    </div>
  );
}
