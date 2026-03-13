import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Layout from '../components/Layout';
import {
  BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

/* ── Helpers ── */
function getScoreColor(score) {
  if (score >= 70) return 'var(--success)';
  if (score >= 50) return 'var(--warning)';
  return 'var(--danger)';
}

function getScoreBarClass(score) {
  if (score >= 70) return 'scoreBarHigh';
  if (score >= 50) return 'scoreBarMid';
  return 'scoreBarLow';
}

/* SVG circular ring */
function ScoreRing({ score, size = 160 }) {
  const [displayed, setDisplayed] = useState(0);
  const radius = 60;
  const stroke = 10;
  const circ = 2 * Math.PI * radius;
  const center = size / 2;
  const color = getScoreColor(score);

  // Animate count up
  useEffect(() => {
    let start = null;
    const duration = 1200;
    const step = (ts) => {
      if (!start) start = ts;
      const prog = Math.min((ts - start) / duration, 1);
      setDisplayed(Math.round(prog * score));
      if (prog < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [score]);

  const offset = circ - (displayed / 100) * circ;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background ring */}
      <circle
        cx={center} cy={center} r={radius}
        fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}
      />
      {/* Glow filter */}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Progress arc */}
      <circle
        cx={center} cy={center} r={radius}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${center} ${center})`}
        style={{ transition: 'stroke-dashoffset 0.05s linear' }}
        filter="url(#glow)"
      />
      {/* Score text */}
      <text x={center} y={center - 8} textAnchor="middle" fill="white" fontSize="28" fontWeight="900" fontFamily="Inter, sans-serif">
        {displayed}
      </text>
      <text x={center} y={center + 14} textAnchor="middle" fill="#64748b" fontSize="11" fontWeight="500" fontFamily="Inter, sans-serif">
        out of 100
      </text>
    </svg>
  );
}

/* Resource type → icon + class */
function ResourceIcon({ type = '' }) {
  const t = type.toLowerCase();
  if (t.includes('youtube') || t.includes('video')) return <span className="resourceIcon resourceYt">▶</span>;
  if (t.includes('github') || t.includes('repo')) return <span className="resourceIcon resourceGh">⬡</span>;
  if (t.includes('doc') || t.includes('handbook') || t.includes('book')) return <span className="resourceIcon resourceDoc">📖</span>;
  if (t.includes('course')) return <span className="resourceIcon resourceCourse">🎓</span>;
  return <span className="resourceIcon resourceDoc">🔗</span>;
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state ?? {};

  const sessionId = state.sessionId ?? null;
  const company = state.company ?? null;
  const role = state.role ?? null;
  const result = state.result ?? null;
  const primaryField = state.primaryField ?? null;

  const [showAll, setShowAll] = useState(false);

  // All hooks MUST be declared before any conditional returns (Rules of Hooks)
  const chart = useMemo(() => {
    const safeSkillScores = result?.skill_scores ?? [];
    const safeGaps = result?.gaps ?? [];
    const source = safeSkillScores.length ? safeSkillScores : safeGaps;
    const labels = source.map((x) => x.skill);
    const data = source.map((x) => (typeof x.score === 'number' ? x.score : 0));
    return {
      data: {
        labels,
        datasets: [{
          label: 'Score',
          data,
          backgroundColor: data.map(s => s >= 70 ? 'rgba(16,185,129,0.5)' : s >= 50 ? 'rgba(245,158,11,0.5)' : 'rgba(239,68,68,0.5)'),
          borderColor: data.map(s => s >= 70 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444'),
          borderWidth: 1,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
        scales: {
          y: { min: 0, max: 100, ticks: { color: '#64748b', font: { size: 11 } }, grid: { color: 'rgba(255,255,255,0.04)' } },
          x: { ticks: { color: '#64748b', font: { size: 11 } }, grid: { display: false } },
        },
      },
    };
  }, [result]);

  if (!sessionId || !company || !role || !result) {
    return <Navigate to="/" replace />;
  }

  const score = result.overall_score ?? 0;
  const isReady = result.readiness_verdict === 'Interview Ready' || result.eligible === true;
  const gaps = result.gaps ?? [];
  const strengths = result.strengths ?? [];


  return (
    <Layout
      title="Results"
      subtitle={`${company} • ${role}`}
      right={
        <div className="row" style={{ gap: 8 }}>
          {primaryField && <span className="pill pillAccent">🎯 {primaryField}</span>}
          <span className="pill pillDark">Session {sessionId}</span>
        </div>
      }
    >
      {/* ── Verdict Banner ── */}
      <div className={`verdictBanner ${isReady ? 'verdictReady' : 'verdictNotReady'} fadeIn`} style={{ marginBottom: 20 }}>
        <span className="verdictIcon">{isReady ? '🎉' : '📚'}</span>
        <div>
          <div className="verdictTitle">
            {result.readiness_verdict || (isReady ? 'Interview Ready!' : 'Not Prepared Yet')}
          </div>
          <div className="verdictSubtitle">{result.verdict}</div>
          {typeof result.minimum_required === 'number' && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Minimum required: {result.minimum_required} / 100
            </div>
          )}
        </div>
      </div>

      {/* ── Top row: Score Ring + Strengths ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16, marginBottom: 16 }}>
        {/* Score ring card */}
        <Card className="fadeIn" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '28px 20px', gap: 12 }}>
          <ScoreRing score={score} size={160} />
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span className={`pill ${isReady ? 'pillSuccess' : 'pillDanger'}`}>
              {isReady ? '✅ Eligible' : '❌ Not Eligible'}
            </span>
          </div>
        </Card>

        {/* Strengths */}
        <Card className="fadeIn" style={{ animationDelay: '0.1s' }}>
          <div className="h2" style={{ marginBottom: 14 }}>💪 Strengths</div>
          {strengths.length ? (
            strengths.map((s, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 0',
                  borderBottom: idx < strengths.length - 1 ? '1px solid var(--border)' : 'none',
                  fontSize: '0.875rem', color: 'var(--text-subtle)', lineHeight: 1.5
                }}
                className="fadeIn"
              >
                <span style={{ color: 'var(--success)', fontSize: '1rem', flexShrink: 0 }}>✓</span>
                {s}
              </div>
            ))
          ) : (
            <div className="muted" style={{ fontSize: '0.875rem' }}>No strengths returned by the evaluator.</div>
          )}
        </Card>
      </div>

      {/* ── Skill Scores Chart ── */}
      {chart.data.labels.length > 0 && (
        <Card className="fadeIn" style={{ marginBottom: 16, animationDelay: '0.15s' }}>
          <div className="h2" style={{ marginBottom: 16 }}>📊 Skill Scores</div>
          <Bar data={chart.data} options={chart.options} />
        </Card>
      )}

      {/* ── Gaps & Resources ── */}
      {gaps.length > 0 && (
        <Card className="fadeIn" style={{ marginBottom: 16, animationDelay: '0.2s' }}>
          <div className="h2" style={{ marginBottom: 16 }}>
            🔍 Gaps & Learning Resources
          </div>
          {(showAll ? gaps : gaps.slice(0, 3)).map((g, idx) => (
            <div
              key={idx}
              style={{
                paddingTop: idx ? 20 : 0,
                marginTop: idx ? 20 : 0,
                borderTop: idx ? '1px solid var(--border)' : 'none',
              }}
              className="fadeIn"
            >
              {/* Gap header */}
              <div className="row spaceBetween" style={{ marginBottom: 8 }}>
                <div className="row" style={{ gap: 8 }}>
                  <span style={{ fontWeight: 800, color: 'var(--title)' }}>{g.skill}</span>
                  {typeof g.score === 'number' && (
                    <span className={`pill ${g.score >= 70 ? 'pillSuccess' : g.score >= 50 ? 'pillWarning' : 'pillDanger'}`}>
                      {g.score}/100
                    </span>
                  )}
                </div>
              </div>

              {/* Score bar */}
              {typeof g.score === 'number' && (
                <div className="scoreBar" style={{ marginBottom: 10 }}>
                  <div
                    className={`scoreBarFill ${getScoreBarClass(g.score)}`}
                    style={{ width: `${g.score}%` }}
                  />
                </div>
              )}

              {/* Why weak */}
              {g.why_weak && (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-subtle)', lineHeight: 1.5, marginBottom: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, borderLeft: '3px solid rgba(245,158,11,0.4)' }}>
                  {g.why_weak}
                </div>
              )}

              {/* Resource links */}
              {g.resources?.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {g.resources.map((r, rIdx) => (
                    <a
                      key={rIdx}
                      href={r.url}
                      target="_blank"
                      rel="noreferrer"
                      className="resourceCard"
                    >
                      <ResourceIcon type={r.type} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="resourceName">{r.name}</div>
                        <div className="resourceMeta">
                          {r.type && <span>{r.type}</span>}
                          {r.type && r.time && <span> · </span>}
                          {r.time && <span>{r.time}</span>}
                        </div>
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>↗</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}

          {gaps.length > 3 && (
            <button
              className="btn btnSoft w100"
              style={{ marginTop: 16 }}
              onClick={() => setShowAll((v) => !v)}
            >
              {showAll ? '↑ Show fewer gaps' : `↓ Show ${gaps.length - 3} more gaps`}
            </button>
          )}
        </Card>
      )}

      {/* ── Next Attempt Tips ── */}
      {result.next_attempt_tips?.length > 0 && (
        <Card className="fadeIn" style={{ marginBottom: 20, animationDelay: '0.25s' }}>
          <div className="h2" style={{ marginBottom: 14 }}>💡 Tips for Your Next Attempt</div>
          {result.next_attempt_tips.map((t, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                padding: '8px 0',
                borderBottom: idx < result.next_attempt_tips.length - 1 ? '1px solid var(--border)' : 'none',
                fontSize: '0.875rem', color: 'var(--text-subtle)', lineHeight: 1.5
              }}
            >
              <span style={{ color: 'var(--primary2)', flexShrink: 0 }}>→</span>
              {t}
            </div>
          ))}
        </Card>
      )}

      {/* ── Question Review (per-question breakdown) ── */}
      {result.question_review?.length > 0 && (
        <Card className="fadeIn" style={{ marginBottom: 16, animationDelay: '0.28s' }}>
          <div className="h2" style={{ marginBottom: 4 }}>📝 Question-by-Question Review</div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 18 }}>
            See which questions you got wrong and exactly what to study to fix it.
          </p>
          {result.question_review.map((qr, idx) => (
            <div
              key={idx}
              style={{
                paddingTop: idx ? 20 : 0,
                marginTop: idx ? 20 : 0,
                borderTop: idx ? '1px solid var(--border)' : 'none',
              }}
              className="fadeIn"
            >
              {/* Header row */}
              <div className="row" style={{ gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span className="pill pillDark" style={{ fontWeight: 800 }}>Q{qr.question_number ?? idx + 1}</span>
                <span className="pill pillDark">{qr.skill}</span>
                <span
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: '0.8rem', fontWeight: 700, padding: '4px 10px', borderRadius: 999,
                    background: qr.is_correct ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                    color: qr.is_correct ? 'var(--success)' : 'var(--danger)',
                    border: `1px solid ${qr.is_correct ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  }}
                >
                  {qr.is_correct ? '✅ Correct' : '❌ Wrong'}
                </span>
              </div>

              {/* Question text */}
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--title)', marginBottom: 8, lineHeight: 1.5 }}>
                {qr.question}
              </div>

              {/* Candidate's answer */}
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 10 }}>
                <span style={{ fontWeight: 600, color: 'var(--text-subtle)' }}>Your answer: </span>
                {qr.candidate_answer}
              </div>

              {/* Correct answer explanation */}
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 10,
                background: 'rgba(16,185,129,0.06)',
                borderLeft: '3px solid rgba(16,185,129,0.5)',
                fontSize: '0.875rem', color: 'var(--text-subtle)', lineHeight: 1.6
              }}>
                <span style={{ fontWeight: 700, color: 'var(--success)', marginRight: 6 }}>✓ Correct Answer:</span>
                {qr.correct_answer}
              </div>

              {/* What was wrong (only for wrong answers) */}
              {!qr.is_correct && qr.what_was_wrong && (
                <div style={{
                  padding: '10px 14px', borderRadius: 8, marginBottom: 12,
                  background: 'rgba(239,68,68,0.05)',
                  borderLeft: '3px solid rgba(239,68,68,0.4)',
                  fontSize: '0.82rem', color: 'var(--text-subtle)', lineHeight: 1.6
                }}>
                  <span style={{ fontWeight: 700, color: 'var(--danger)', marginRight: 6 }}>⚠ What was wrong:</span>
                  {qr.what_was_wrong}
                </div>
              )}

              {/* Per-question resources (only for wrong answers) */}
              {!qr.is_correct && qr.resources?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    Study resources for this question:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {qr.resources.map((r, rIdx) => {
                      const isYt = r.type?.toLowerCase().includes('youtube') || r.type?.toLowerCase().includes('video');
                      return (
                        <a
                          key={rIdx}
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          className="resourceCard"
                        >
                          <span className={`resourceIcon ${isYt ? 'resourceYt' : 'resourceDoc'}`}>
                            {isYt ? '▶' : '📖'}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="resourceName">{r.name}</div>
                            <div className="resourceMeta">{r.type}</div>
                          </div>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>↗</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* ── Action Buttons ── */}
      <div className="row" style={{ gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
        <button className="btn btnPrimary btnLg" onClick={() => navigate('/dashboard', { replace: true })}>
          🚀 New Assessment
        </button>
        <button className="btn btnSoft" onClick={() => navigate('/quiz', { state })}>
          🔄 Retake Same Quiz
        </button>
      </div>
    </Layout>
  );
}

