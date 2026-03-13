import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import UploadFlow from '../components/UploadFlow';
import { fetchProfile } from '../utils/api';
import { clearAuthToken } from '../utils/auth';
import { useNavigate } from 'react-router-dom';

const FEATURES = [
  { icon: '📄', title: 'Resume Parsing', desc: 'pdfplumber extracts your skills and detects your primary field automatically.' },
  { icon: '🎯', title: 'AI Quiz', desc: 'Google Gemini generates 4 targeted MCQ questions tailored to your domain.' },
  { icon: '📊', title: 'Gap Report', desc: 'Get a readiness verdict with curated YouTube, docs, and GitHub resources.' },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [userName, setUserName] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchProfile()
      .then((me) => {
        if (!cancelled) {
          setUserName(me?.name ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        clearAuthToken();
        if (!cancelled) navigate('/login', { replace: true });
      });
    return () => { cancelled = true; };
  }, [navigate]);

  const firstName = userName?.split(' ')[0] ?? 'there';

  return (
    <Layout
      title="Dashboard"
      right={
        userName ? (
          <span className="pill" style={{ gap: 8 }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 800, color: 'white'
            }}>
              {userName[0]?.toUpperCase()}
            </span>
            {userName}
          </span>
        ) : null
      }
    >
      {/* Hero Banner */}
      <div className="dashHero fadeIn">
        <div className="dashHeroName">
          {loading ? '…' : `Hey, ${firstName}! 👋`}
        </div>
        <div className="dashHeroSub">
          Ready to assess your interview readiness? Upload your resume below to get started.
        </div>
      </div>

      {/* Feature highlights */}
      <div className="grid3 mb16" style={{ marginBottom: 24 }}>
        {FEATURES.map((f, i) => (
          <div
            key={i}
            className="card fadeIn"
            style={{ animationDelay: `${i * 0.08}s`, padding: '18px 20px' }}
          >
            <div style={{ fontSize: '1.6rem', marginBottom: 10 }}>{f.icon}</div>
            <div className="h3" style={{ marginBottom: 6 }}>{f.title}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Main upload flow */}
      <div className="fadeIn" style={{ animationDelay: '0.2s' }}>
        <UploadFlow />
      </div>
    </Layout>
  );
}
