import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from './Card';
import { generateQuiz, uploadResume } from '../utils/api';

const STEPS = ['Upload Resume', 'Parse & Analyze', 'Generate Quiz'];



export default function UploadFlow() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const [step, setStep] = useState(0); // 0=idle, 1=uploading, 2=generating
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState('');

  const isBusy = step === 1 || step === 2;

  const busyLabel = useMemo(() => {
    if (step === 1) return 'Parsing resume with pdfplumber…';
    if (step === 2) return 'Generating your quiz with Gemini AI…';
    return '';
  }, [step]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const onStart = async () => {
    setError('');
    if (!company.trim() || !role.trim()) { setError('Please enter both company and role.'); return; }
    if (!file) { setError('Please upload your PDF resume.'); return; }
    if (!file.name?.toLowerCase().endsWith('.pdf')) { setError('Only PDF files are accepted.'); return; }

    try {
      setStep(1);
      const uploadRes = await uploadResume(file, company.trim(), role.trim());
      setUploadResult(uploadRes);
      const sessionId = uploadRes.session_id;
      setStep(2);

      const quizRes = await generateQuiz(sessionId, company.trim(), role.trim(), uploadRes.primary_field);
      const questions = quizRes.questions || [];

      if (!questions.length) { setError('No questions were generated. Please try again.'); setStep(0); return; }

      navigate('/quiz', {
        state: {
          sessionId,
          company: company.trim(),
          role: role.trim(),
          questions,
          primaryField: uploadRes.primary_field || quizRes.primary_field,
        },
      });
    } catch (e) {
      setStep(0);
      if (e?.code === 'ERR_NETWORK' || e?.message === 'Network Error') {
        setError('');
      } else {
        setError(e?.response?.data?.detail || e?.message || 'Something went wrong. Please try again.');
      }
    }
  };

  // Skill categories for display
  const skillsByCategory = useMemo(() => {
    if (!uploadResult?.skills_found?.length) return [];
    const skills = uploadResult.skills_found;
    return skills.map(s => ({ skill: s, category: 'frontend' })).slice(0, 20);
  }, [uploadResult]);

  return (
    <div>
      {/* Step Indicator */}
      <div className="steps" style={{ marginBottom: 28 }}>
        {STEPS.map((label, i) => (
          <div key={i} className={`step ${step > i ? 'done' : step === i && isBusy ? 'active' : ''}`}>
            <div className="stepDot">
              {step > i ? '✓' : i + 1}
            </div>
            <div className="stepLabel">{label}</div>
          </div>
        ))}
      </div>

      <Card>
        {/* Company + Role row */}
        <div className="grid2" style={{ marginBottom: 20 }}>
          <div>
            <div className="label">Target Company</div>
            <div className="inputWrap">
              <span className="inputIcon">🏢</span>
              <input
                className="input"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Google"
                disabled={isBusy}
                autoComplete="organization"
              />
            </div>
          </div>
          <div>
            <div className="label">Target Role</div>
            <div className="inputWrap">
              <span className="inputIcon">💼</span>
              <input
                className="input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Full Stack Engineer"
                disabled={isBusy}
              />
            </div>
          </div>
        </div>

        {/* Drag-and-drop upload zone */}
        <div className="label">Resume PDF</div>
        <div
          className={`uploadZone ${dragOver ? 'dragOver' : ''} ${file ? 'hasFile' : ''}`}
          onClick={() => !isBusy && fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && !isBusy && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={isBusy}
          />
          {file ? (
            <>
              <span className="uploadIcon">✅</span>
              <div style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 4 }}>{file.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {(file.size / 1024).toFixed(0)} KB — Click to change
              </div>
            </>
          ) : (
            <>
              <span className="uploadIcon">📂</span>
              <div style={{ fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 4 }}>
                Drag & drop your PDF here
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                or click to browse — PDF only
              </div>
            </>
          )}
        </div>

        {/* Busy progress bar */}
        {isBusy && (
          <div style={{ marginTop: 16 }}>
            <div className="progressBar">
              <div
                className="progressFill"
                style={{ width: step === 1 ? '45%' : '85%', transition: 'width 1.5s ease' }}
              />
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
              <span className="spinner" style={{ display: 'inline-block', marginRight: 8 }} />
              {busyLabel}
            </div>
          </div>
        )}

        {/* Upload result summary */}
        {uploadResult && !isBusy && (
          <div className="fadeIn" style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-sm)' }}>
            <div className="row spaceBetween" style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.9rem' }}>
                ✅ Resume parsed successfully
              </div>
              {uploadResult.primary_field && (
                <span className="pill pillAccent">
                  🎯 {uploadResult.primary_field}
                </span>
              )}
            </div>
            {uploadResult.skills_found?.length > 0 && (
              <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
                {uploadResult.skills_found.slice(0, 18).map((s, i) => (
                  <span key={i} className="skillChip" style={{ animationDelay: `${i * 0.04}s` }}>{s}</span>
                ))}
                {uploadResult.skills_found.length > 18 && (
                  <span className="muted" style={{ fontSize: '0.78rem' }}>+{uploadResult.skills_found.length - 18} more</span>
                )}
              </div>
            )}
          </div>
        )}

        {error && <div className="error">{error}</div>}

        {/* CTA */}
        <div style={{ marginTop: 20 }}>
          <button
            className="btn btnPrimary btnLg btnFull"
            onClick={onStart}
            disabled={isBusy}
            id="upload-start-btn"
          >
            {isBusy ? (
              <><span className="spinner" />{busyLabel}</>
            ) : (
              '🚀 Upload & Start Quiz'
            )}
          </button>
        </div>
      </Card>
    </div>
  );
}
