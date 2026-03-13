import React, { useMemo, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Layout from '../components/Layout';
import { evaluateAnswers } from '../utils/api';

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

export default function QuizPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state;

  const sessionId = state?.sessionId;
  const company = state?.company;
  const role = state?.role;
  const questions = state?.questions || [];
  const primaryField = state?.primaryField || '';

  const [quizIndex, setQuizIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [error, setError] = useState('');

  const q = questions[quizIndex] || null;
  const total = questions.length;

  // IMPORTANT: All hooks must be declared before any conditional returns
  const current = useMemo(() => {
    if (!q) return { answer: '', why: '' };
    return answers[q.id] ?? { answer: '', why: '' };
  }, [answers, q]);

  if (!sessionId || !company || !role || !questions.length) {
    return <Navigate to="/" replace />;
  }

  const setCurrent = (patch) => {
    setAnswers((prev) => ({
      ...prev,
      [q.id]: { ...(prev[q.id] ?? { answer: '', why: '' }), ...patch },
    }));
  };

  const progressPct = ((quizIndex + 1) / total) * 100;
  const answeredCount = Object.values(answers).filter((a) => a.answer?.trim()).length;
  const canGoBack = quizIndex > 0;
  const canGoNext = quizIndex < total - 1;
  const canContinue = current.answer?.trim() && current.why?.trim();


  const onFinish = async () => {
    setError('');
    const missing = questions.some((qq) => {
      const a = answers[qq.id];
      return !a || !a.answer?.trim() || !a.why?.trim();
    });
    if (missing) {
      setError('Please answer all questions and fill in the "Why?" field for each one.');
      return;
    }
    try {
      setIsEvaluating(true);
      const payloadAnswers = questions.map((qq) => ({
        question_id: qq.id,
        skill: qq.skill,
        difficulty: qq.difficulty,
        question: qq.question,
        answer: answers[qq.id].answer.trim(),
        why_answer: answers[qq.id].why.trim(),
        expected_keywords: qq.expected_keywords ?? [],
      }));
      const evalRes = await evaluateAnswers(sessionId, company, role, payloadAnswers);
      const result = evalRes.result;
      setIsEvaluating(false);
      navigate('/results', { state: { sessionId, company, role, result, primaryField } });
    } catch (e) {
      setIsEvaluating(false);
      setError(e?.response?.data?.detail || e?.message || 'Evaluation failed. Please try again.');
    }
  };

  const difficultyColor = {
    Easy: 'pillSuccess',
    Medium: 'pillWarning',
    Hard: 'pillDanger',
  }[q.difficulty] || 'pill';

  return (
    <Layout
      title="Quiz"
      subtitle={`${company} • ${role}`}
      right={
        <div className="row" style={{ gap: 8 }}>
          {primaryField && <span className="pill pillAccent">🎯 {primaryField}</span>}
          <span className="pill">{answeredCount}/{total} answered</span>
        </div>
      }
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: 24 }}>
          <div className="row spaceBetween" style={{ marginBottom: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Question {quizIndex + 1} of {total}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary3)' }}>{Math.round(progressPct)}%</span>
          </div>
          <div className="progressBar">
            <div className="progressFill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        <Card className="fadeIn" key={q.id}>
          {/* Question header */}
          <div className="row" style={{ marginBottom: 14, gap: 8 }}>
            <span className="pill pillDark">Q{quizIndex + 1}</span>
            <span className="pill pillDark">{q.skill}</span>
            <span className={`pill ${difficultyColor}`}>{q.difficulty}</span>
          </div>

          {/* Question text */}
          <div style={{
            fontSize: '1.05rem', fontWeight: 700, color: 'var(--title)',
            lineHeight: 1.5, marginBottom: 18
          }}>
            {q.question}
          </div>

          {/* MCQ Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {(q.options ?? []).map((opt, idx) => {
              const selected = current.answer === opt;
              return (
                <button
                  key={opt}
                  className={`optionCard ${selected ? 'selected' : ''}`}
                  onClick={() => setCurrent({ answer: opt })}
                  disabled={isEvaluating}
                >
                  <span className="optionLetter">{OPTION_LETTERS[idx]}</span>
                  <span style={{ flex: 1 }}>{opt}</span>
                </button>
              );
            })}
          </div>

          {/* Why box — appears only when an option is selected */}
          {current.answer ? (
            <div className="whyBox" style={{ marginTop: 20 }}>
              <div className="label" style={{ marginBottom: 8 }}>
                💭 {q.why_prompt || 'Why did you choose this answer?'}
              </div>
              <textarea
                className="textarea"
                value={current.why}
                onChange={(e) => setCurrent({ why: e.target.value })}
                placeholder="Explain your reasoning — be specific about concepts and examples from your experience…"
                disabled={isEvaluating}
                rows={4}
              />
              {current.why?.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
                  {current.why.length} chars
                </div>
              )}
            </div>
          ) : (
            <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 8, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              👆 Select an answer above to unlock the "Why?" field
            </div>
          )}

          {error && <div className="error" style={{ marginTop: 16 }}>{error}</div>}

          {/* Navigation */}
          <div className="row spaceBetween" style={{ marginTop: 20 }}>
            <button
              className="btn"
              onClick={() => setQuizIndex((i) => Math.max(0, i - 1))}
              disabled={!canGoBack || isEvaluating}
            >
              ← Back
            </button>

            <div className="row" style={{ gap: 8 }}>
              <button
                className="btn btnDanger"
                style={{ padding: '9px 14px', fontSize: '0.8rem' }}
                onClick={() => navigate('/', { replace: true })}
                disabled={isEvaluating}
              >
                Start over
              </button>

              {canGoNext ? (
                <button
                  className="btn btnSoft"
                  onClick={() => setQuizIndex((i) => Math.min(total - 1, i + 1))}
                  disabled={!canContinue || isEvaluating}
                >
                  Next →
                </button>
              ) : (
                <button
                  className="btn btnPrimary"
                  onClick={onFinish}
                  disabled={!canContinue || isEvaluating}
                  style={{ minWidth: 140 }}
                >
                  {isEvaluating ? (
                    <><span className="spinner" /> Evaluating…</>
                  ) : (
                    '🎯 Submit Quiz'
                  )}
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* Question dots */}
        <div className="row center" style={{ marginTop: 20, gap: 6 }}>
          {questions.map((_, i) => {
            const a = answers[questions[i].id];
            const answered = a?.answer?.trim() && a?.why?.trim();
            return (
              <button
                key={i}
                onClick={() => !isEvaluating && setQuizIndex(i)}
                disabled={isEvaluating}
                style={{
                  width: 10, height: 10, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
                  background: i === quizIndex
                    ? 'var(--primary)'
                    : answered
                    ? 'var(--success)'
                    : 'rgba(255,255,255,0.1)',
                  transition: 'background 0.2s ease',
                }}
                title={`Question ${i + 1}${answered ? ' ✓' : ''}`}
              />
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
