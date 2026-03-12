import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';

import { uploadResume, generateQuiz, evaluateAnswers } from '@/utils/api';

type Step = 'upload' | 'quiz' | 'results';

type QuizQuestion = {
  id: number;
  skill: string;
  difficulty: string;
  question: string;
  why_prompt?: string;
  options?: string[];
  expected_keywords?: string[];
};

type EvaluationResult = {
  overall_score: number;
  eligible: boolean;
  minimum_required?: number;
  verdict: string;
  strengths?: string[];
  gaps?: {
    skill: string;
    score?: number;
    why_weak?: string;
    resources?: { name: string; url: string; time?: string; type?: string }[];
  }[];
  next_attempt_tips?: string[];
};

export default function HomeScreen() {
  const [step, setStep] = useState<Step>('upload');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, { answer: string; why: string }>>({});
  const [results, setResults] = useState<EvaluationResult | null>(null);
  const [pickedFileName, setPickedFileName] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);

  const isBusy = isUploading || isGeneratingQuiz || isEvaluating;
  const busyLabel = useMemo(() => {
    if (isUploading) return 'Uploading resume…';
    if (isGeneratingQuiz) return 'Generating quiz…';
    if (isEvaluating) return 'Evaluating answers…';
    return null;
  }, [isUploading, isGeneratingQuiz, isEvaluating]);

  const handlePickAndUpload = async () => {
    if (!company.trim() || !role.trim()) {
      Alert.alert('Missing info', 'Please enter both company and role first.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: false,
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const file = result.assets?.[0];
      if (!file?.uri) {
        Alert.alert('Upload failed', 'Could not read the selected file.');
        return;
      }
      setPickedFileName(file.name ?? 'resume.pdf');

      setIsUploading(true);

      const uploadRes = await uploadResume(file.uri, company.trim(), role.trim());
      const newSessionId = uploadRes.session_id as string;
      setSessionId(newSessionId);

      setIsUploading(false);
      setIsGeneratingQuiz(true);

      const quizRes = await generateQuiz(newSessionId, company.trim(), role.trim());
      const qs = (quizRes.questions || []) as QuizQuestion[];

      if (!qs.length) {
        Alert.alert('No questions generated', 'Please try again or adjust the role/company.');
        setIsGeneratingQuiz(false);
        return;
      }

      setQuestions(qs);
      setAnswers({});
      setQuizIndex(0);
      setIsGeneratingQuiz(false);
      setStep('quiz');
    } catch (err: any) {
      console.error('Upload or quiz error', err);
      setIsUploading(false);
      setIsGeneratingQuiz(false);
      Alert.alert(
        'Something went wrong',
        err?.message ?? 'Unable to upload resume or generate quiz. Please try again.',
      );
    }
  };

  const handleSubmitAnswers = async () => {
    if (!sessionId) {
      Alert.alert('Session missing', 'Please upload your resume again.');
      return;
    }

    const missing = questions.some((q) => {
      const a = answers[q.id];
      return !a || !a.answer.trim() || !a.why.trim();
    });

    if (missing) {
      Alert.alert('Incomplete', 'Please answer all questions and fill in the "Why" fields.');
      return;
    }

    try {
      setIsEvaluating(true);

      const payloadAnswers = questions.map((q) => ({
        question_id: q.id,
        skill: q.skill,
        difficulty: q.difficulty,
        question: q.question,
        answer: answers[q.id].answer.trim(),
        why_answer: answers[q.id].why.trim(),
        expected_keywords: q.expected_keywords ?? [],
      }));

      const evalRes = await evaluateAnswers(sessionId, company.trim(), role.trim(), payloadAnswers);
      setResults(evalRes.result as EvaluationResult);
      setIsEvaluating(false);
      setStep('results');
    } catch (err: any) {
      console.error('Evaluation error', err);
      setIsEvaluating(false);
      Alert.alert(
        'Evaluation failed',
        err?.message ?? 'Unable to evaluate your answers. Please try again.',
      );
    }
  };

  const handleRetake = () => {
    setAnswers({});
    setResults(null);
    setQuizIndex(0);
    setStep('quiz');
  };

  const handleRestart = () => {
    setCompany('');
    setRole('');
    setSessionId(null);
    setQuestions([]);
    setAnswers({});
    setResults(null);
    setPickedFileName(null);
    setQuizIndex(0);
    setStep('upload');
  };

  if (step === 'quiz') {
    const total = questions.length;
    const q = questions[quizIndex];
    const current = answers[q.id] ?? { answer: '', why: '' };
    const canGoBack = quizIndex > 0;
    const canGoNext = quizIndex < total - 1;
    const canContinue = current.answer.trim().length > 0 && current.why.trim().length > 0;

    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
              <Text style={styles.brand}>Evalio</Text>
              <Text style={styles.subtitle}>
                {company} • {role}
              </Text>
            </View>

            <View style={styles.progressWrap}>
              <Text style={styles.progressText}>
                Question {quizIndex + 1} of {total}
              </Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${((quizIndex + 1) / total) * 100}%` }]} />
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.metaRow}>
                <Text style={styles.pill}>{q.skill}</Text>
                <Text style={[styles.pill, styles.pillSoft]}>{q.difficulty}</Text>
              </View>

              <Text style={styles.questionText}>{q.question}</Text>
              {q.why_prompt ? <Text style={styles.whyPrompt}>{q.why_prompt}</Text> : null}

              <Text style={styles.label}>Choose an option</Text>
              <View style={{ marginTop: 4 }}>
                {(q.options ?? []).map((opt) => {
                  const isSelected = current.answer === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
                      onPress={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.id]: { ...(prev[q.id] ?? { why: '' }), answer: opt },
                        }))
                      }
                      disabled={isEvaluating}
                    >
                      <Text
                        style={[styles.optionText, isSelected && styles.optionTextSelected]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {current.answer ? (
                <>
                  <Text style={styles.label}>Why did you choose this?</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    multiline
                    textAlignVertical="top"
                    placeholder="Explain your thinking…"
                    placeholderTextColor="#64748b"
                    value={current.why}
                    onChangeText={(text) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [q.id]: { ...(prev[q.id] ?? { answer: current.answer }), why: text },
                      }))
                    }
                  />
                </>
              ) : null}

              <View style={styles.navRow}>
                <TouchableOpacity
                  style={[styles.navButton, styles.navButtonGhost, !canGoBack && styles.disabled]}
                  onPress={() => setQuizIndex((i) => Math.max(0, i - 1))}
                  disabled={!canGoBack || isEvaluating}
                >
                  <Text style={styles.navButtonTextGhost}>Back</Text>
                </TouchableOpacity>

                {canGoNext ? (
                  <TouchableOpacity
                    style={[
                      styles.navButton,
                      styles.navButtonPrimary,
                      (!canContinue || isEvaluating) && styles.disabled,
                    ]}
                    onPress={() => setQuizIndex((i) => Math.min(total - 1, i + 1))}
                    disabled={!canContinue || isEvaluating}
                  >
                    <Text style={styles.navButtonTextPrimary}>Next</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.navButton,
                      styles.navButtonPrimary,
                      (!canContinue || isEvaluating) && styles.disabled,
                    ]}
                    onPress={handleSubmitAnswers}
                    disabled={!canContinue || isEvaluating}
                  >
                    {isEvaluating ? (
                      <ActivityIndicator color="#0b1020" />
                    ) : (
                      <Text style={styles.navButtonTextPrimary}>Finish</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleRestart} disabled={isEvaluating}>
              <Text style={styles.secondaryButtonText}>Start over</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (step === 'results' && results) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.header}>
            <Text style={styles.brand}>Results</Text>
            <Text style={styles.subtitle}>
              {company} • {role}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.scoreRow}>
              <Text style={styles.scoreNumber}>{results.overall_score}</Text>
              <View style={styles.scoreMeta}>
                <Text style={styles.scoreLabel}>Overall score</Text>
                <Text style={styles.resultEligible}>
                  {results.eligible ? 'Eligible' : 'Not yet eligible'}
                </Text>
                {typeof results.minimum_required === 'number' && (
                  <Text style={styles.resultMeta}>Min required: {results.minimum_required}</Text>
                )}
              </View>
            </View>
            <Text style={styles.resultVerdict}>{results.verdict}</Text>
          </View>

          {results.strengths && results.strengths.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Strengths</Text>
              {results.strengths.map((s, idx) => (
                <Text key={idx} style={styles.listItem}>
                  • {s}
                </Text>
              ))}
            </View>
          )}

          {results.gaps && results.gaps.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Gaps & resources</Text>
              {results.gaps.map((g, idx) => (
                <View key={idx} style={styles.gapItem}>
                  <Text style={styles.gapTitle}>{g.skill}</Text>
                  {typeof g.score === 'number' && (
                    <Text style={styles.resultMeta}>Score: {g.score}</Text>
                  )}
                  {g.why_weak ? <Text style={styles.gapWhy}>{g.why_weak}</Text> : null}
                  {g.resources && g.resources.length > 0 && (
                    <View style={styles.resourcesList}>
                      {g.resources.map((r, rIdx) => (
                        <Text key={rIdx} style={styles.listItem}>
                          • {r.name}
                          {r.type ? ` — ${r.type}` : ''}
                          {r.time ? ` (${r.time})` : ''}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {results.next_attempt_tips && results.next_attempt_tips.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Next attempt tips</Text>
              {results.next_attempt_tips.map((t, idx) => (
                <Text key={idx} style={styles.listItem}>
                  • {t}
                </Text>
              ))}
            </View>
          )}

          <TouchableOpacity style={[styles.button, styles.primaryButton]} onPress={handleRetake}>
            <Text style={styles.buttonText}>Retake quiz</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={handleRestart}>
            <Text style={styles.secondaryButtonText}>Back to upload</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Upload step (default)
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.brand}>Evalio</Text>
            <Text style={styles.subtitle}>AI-powered interview readiness</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Company</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Google"
              placeholderTextColor="#64748b"
              value={company}
              onChangeText={setCompany}
              editable={!isBusy}
              returnKeyType="next"
            />

            <Text style={styles.label}>Role</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Senior Frontend Engineer"
              placeholderTextColor="#64748b"
              value={role}
              onChangeText={setRole}
              editable={!isBusy}
              returnKeyType="done"
            />

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Before you start</Text>
              <Text style={styles.infoText}>
                Your phone must be able to reach your laptop. In `utils/api.ts`, set `BASE_URL` to
                your laptop’s IPv4 + `:8000`.
              </Text>
            </View>

            {pickedFileName ? (
              <Text style={styles.filePill}>Selected: {pickedFileName}</Text>
            ) : null}

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, isBusy && styles.disabled]}
              onPress={handlePickAndUpload}
              disabled={isBusy}
            >
              {isBusy ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator color="#0b1020" />
                  <Text style={styles.busyText}>{busyLabel}</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Upload resume PDF</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.authRow}>
            <Text style={styles.authText}>Already have an account?</Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.authLink}>Log in</Text>
              </TouchableOpacity>
            </Link>
          </View>

          <View style={styles.authRow}>
            <Text style={styles.authText}>New to Evalio?</Text>
            <Link href="/register" asChild>
              <TouchableOpacity>
                <Text style={styles.authLink}>Create account</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#050816' },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#050816',
  },
  header: { alignItems: 'center', marginBottom: 16 },
  brand: { fontSize: 28, fontWeight: '800', color: '#eef2ff', letterSpacing: 0.4 },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#0b1120',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#111827',
  },
  label: {
    fontSize: 14,
    color: '#d1d5db',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#020617',
    color: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 110,
  },
  infoBox: {
    marginTop: 12,
    marginBottom: 12,
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#060b1f',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  infoTitle: { color: '#c7d2fe', fontWeight: '700', marginBottom: 4 },
  infoText: { color: '#94a3b8', fontSize: 12, lineHeight: 17 },
  filePill: {
    marginTop: 4,
    marginBottom: 8,
    color: '#cbd5e1',
    fontSize: 12,
  },
  button: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
  },
  buttonText: {
    color: '#f9fafb',
    fontSize: 15,
    fontWeight: '600',
  },
  disabled: { opacity: 0.55 },
  busyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  busyText: { color: '#0b1020', fontWeight: '700' },
  secondaryButton: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#374151',
    marginTop: 8,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500',
  },
  progressWrap: { marginBottom: 12 },
  progressText: { color: '#cbd5e1', fontSize: 12, marginBottom: 6, textAlign: 'center' },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#0b1228',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#111827',
  },
  progressFill: { height: '100%', backgroundColor: '#a5b4fc' },
  metaRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#111827',
    color: '#e5e7eb',
    fontSize: 12,
    overflow: 'hidden',
  },
  pillSoft: { backgroundColor: '#0f172a', color: '#c7d2fe' },
  questionMeta: {
    fontSize: 13,
    color: '#a5b4fc',
    marginBottom: 4,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 8,
  },
  whyPrompt: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 8,
  },
  navRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  navButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonPrimary: { backgroundColor: '#a5b4fc' },
  navButtonGhost: { borderWidth: 1, borderColor: '#334155', backgroundColor: 'transparent' },
  navButtonTextPrimary: { color: '#0b1020', fontWeight: '800' },
  navButtonTextGhost: { color: '#e5e7eb', fontWeight: '700' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 },
  scoreNumber: { fontSize: 42, fontWeight: '900', color: '#eef2ff' },
  scoreMeta: { flex: 1 },
  scoreLabel: { color: '#9ca3af', fontSize: 12, marginBottom: 2 },
  resultScore: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  resultEligible: {
    fontSize: 16,
    fontWeight: '600',
    color: '#c7d2fe',
    marginBottom: 4,
  },
  resultMeta: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
  resultVerdict: {
    fontSize: 14,
    color: '#e5e7eb',
    marginTop: 6,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 6,
  },
  listItem: {
    fontSize: 13,
    color: '#d1d5db',
    marginBottom: 4,
  },
  gapItem: {
    marginBottom: 10,
  },
  gapTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
  },
  gapWhy: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 2,
  },
  resourcesList: {
    marginTop: 4,
  },
  authRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  authText: { color: '#9ca3af', fontSize: 13 },
  authLink: { color: '#a5b4fc', fontSize: 13, fontWeight: '600' },
  optionButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1f2937',
    backgroundColor: '#020617',
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  optionButtonSelected: {
    borderColor: '#a5b4fc',
    backgroundColor: '#111827',
  },
  optionText: {
    color: '#e5e7eb',
    fontSize: 14,
  },
  optionTextSelected: {
    color: '#c7d2fe',
    fontWeight: '600',
  },
});

