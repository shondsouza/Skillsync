import React from 'react';
import { Link } from 'react-router-dom';
import { clearAuthToken, isAuthed } from '../utils/auth';

export default function Layout({ title, subtitle, right, children }) {

  return (
    <div>
      <nav className="topbar">
        <div className="topbarInner row spaceBetween">
          <div className="row" style={{ gap: 12 }}>
            <Link to={isAuthed() ? '/dashboard' : '/login'} style={{ textDecoration: 'none' }}>
              <span className="logo">Evalio</span>
            </Link>
            {title ? <span className="pill pillDark">{title}</span> : null}
          </div>

          <div className="row" style={{ gap: 10 }}>
            {right}
            {isAuthed() ? (
              <button
                className="btn btnDanger"
                style={{ padding: '7px 14px', fontSize: '0.8rem' }}
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
