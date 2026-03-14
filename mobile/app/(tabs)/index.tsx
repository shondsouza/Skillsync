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
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Building2, Briefcase, FileText, CheckCircle2, ChevronRight, UploadCloud } from 'lucide-react-native';

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
          <ScrollView contentContainerStyle={[styles.container, { paddingTop: 40 }]}>
            <View style={styles.header}>
              <Text style={styles.brand}>Quiz</Text>
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

            <BlurView intensity={20} tint="dark" style={styles.card}>
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
            </BlurView>

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
          <ScrollView contentContainerStyle={[styles.container, { paddingTop: 40 }]}>
            <View style={styles.header}>
              <Text style={styles.brand}>Results</Text>
              <Text style={styles.subtitle}>
                {company} • {role}
              </Text>
            </View>

          <BlurView intensity={20} tint="dark" style={[styles.card, { borderColor: results.eligible ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)' }]}>
            <View style={styles.scoreRow}>
              <Text style={[styles.scoreNumber, { color: results.eligible ? '#10b981' : '#ef4444' }]}>{results.overall_score}</Text>
              <View style={styles.scoreMeta}>
                <Text style={styles.scoreLabel}>Overall score</Text>
                <Text style={[styles.resultEligible, { color: results.eligible ? '#34d399' : '#fca5a5' }]}>
                  {results.eligible ? 'Eligible' : 'Not yet eligible'}
                </Text>
                {typeof results.minimum_required === 'number' && (
                  <Text style={styles.resultMeta}>Min required: {results.minimum_required}</Text>
                )}
              </View>
            </View>
            <Text style={styles.resultVerdict}>{results.verdict}</Text>
          </BlurView>

          {results.strengths && results.strengths.length > 0 && (
            <BlurView intensity={20} tint="dark" style={styles.card}>
              <Text style={styles.sectionTitle}>Strengths</Text>
              {results.strengths.map((s, idx) => (
                <Text key={idx} style={styles.listItem}>
                  • {s}
                </Text>
              ))}
            </BlurView>
          )}

          {results.gaps && results.gaps.length > 0 && (
            <BlurView intensity={20} tint="dark" style={styles.card}>
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
                        <Text key={rIdx} style={styles.resourceListItem}>
                          • {r.name}
                          {r.type ? ` — ${r.type}` : ''}
                          {r.time ? ` (${r.time})` : ''}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </BlurView>
          )}

          {results.next_attempt_tips && results.next_attempt_tips.length > 0 && (
            <BlurView intensity={20} tint="dark" style={styles.card}>
              <Text style={styles.sectionTitle}>Next attempt tips</Text>
              {results.next_attempt_tips.map((t, idx) => (
                <Text key={idx} style={styles.listItem}>
                  • {t}
                </Text>
              ))}
            </BlurView>
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
      {/* Background Image common across steps */}
      <Image 
        source={require('@/assets/images/banner.jpg')} 
        style={[StyleSheet.absoluteFillObject, { opacity: 0.1 }]} 
        contentFit="cover" 
        transition={1000}
      />
      
      <KeyboardAvoidingView
        style={[styles.flex, { zIndex: 1 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Image 
              source={require('@/assets/images/logo.png')} 
              style={{ width: 120, height: 40, marginBottom: 12 }} 
              contentFit="contain" 
            />
            <Text style={styles.subtitle}>AI-powered interview readiness</Text>
          </View>

          {/* Stepper equivalent */}
          <View style={styles.stepperWrap}>
             <View style={[styles.stepDot, styles.stepActive]}><Text style={styles.stepNum}>1</Text></View>
             <View style={styles.stepLine} />
             <View style={styles.stepDot}><Text style={styles.stepNumInactive}>2</Text></View>
             <View style={styles.stepLine} />
             <View style={styles.stepDot}><Text style={styles.stepNumInactive}>3</Text></View>
          </View>

          <BlurView intensity={20} tint="dark" style={styles.card}>
            <View style={styles.inputGrid}>
              <View style={styles.inputCol}>
                <Text style={styles.label}>Company</Text>
                <View style={styles.inputWrap}>
                  <Building2 color="#9ca3af" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Google"
                    placeholderTextColor="#64748b"
                    value={company}
                    onChangeText={setCompany}
                    editable={!isBusy}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={[styles.inputCol, { marginLeft: 12 }]}>
                <Text style={styles.label}>Role</Text>
                <View style={styles.inputWrap}>
                  <Briefcase color="#9ca3af" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Frontend"
                    placeholderTextColor="#64748b"
                    value={role}
                    onChangeText={setRole}
                    editable={!isBusy}
                    returnKeyType="done"
                  />
                </View>
              </View>
            </View>

            <Text style={[styles.label, { marginTop: 24, marginBottom: 16 }]}>Resume PDF</Text>
            
            <TouchableOpacity 
              style={[styles.uploadZone, pickedFileName && styles.uploadZoneActive]} 
              onPress={handlePickAndUpload}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              {pickedFileName ? (
                <>
                   <CheckCircle2 color="#10b981" size={32} style={{ marginBottom: 12 }} />
                   <Text style={[styles.uploadText, { color: '#10b981' }]}>{pickedFileName}</Text>
                   <Text style={styles.uploadSubtext}>Tap to change file</Text>
                </>
              ) : (
                <>
                   <UploadCloud color="#6366f1" size={32} style={{ marginBottom: 12 }} />
                   <Text style={styles.uploadText}>Tap to select PDF</Text>
                   <Text style={styles.uploadSubtext}>Maximum size 5MB</Text>
                </>
              )}
            </TouchableOpacity>

            {isBusy ? (
              <View style={styles.busyContainer}>
                 <ActivityIndicator color="#6366f1" size="small" />
                 <Text style={styles.busyTextLabel}>{busyLabel}</Text>
              </View>
            ) : null}

            {!isBusy && pickedFileName && (
               <TouchableOpacity
                 style={[styles.button, styles.primaryButton, { marginTop: 24 }]}
                 onPress={handlePickAndUpload}
               >
                 <Text style={styles.buttonText}>Start Evaluation</Text>
                 <ChevronRight color="#fff" size={20} />
               </TouchableOpacity>
            )}

          </BlurView>

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
  safe: { flex: 1, backgroundColor: '#03050a' },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 32,
    paddingBottom: 40,
    backgroundColor: 'transparent',
  },
  header: { alignItems: 'center', marginBottom: 24 },
  brand: { fontSize: 28, fontWeight: '800', color: '#eef2ff', letterSpacing: 0.4 },
  subtitle: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    paddingHorizontal: 40,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: '#6366f1',
  },
  stepNum: { color: '#c7d2fe', fontSize: 13, fontWeight: '700' },
  stepNumInactive: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 8,
  },
  card: {
    backgroundColor: 'rgba(11, 17, 32, 0.4)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  inputGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  inputCol: { flex: 1 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d1d5db',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 12,
    zIndex: 1,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: '#e5e7eb',
    paddingLeft: 40,
    paddingRight: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 110,
  },
  uploadZone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(99, 102, 241, 0.3)',
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.03)',
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadZoneActive: {
    borderColor: 'rgba(16, 185, 129, 0.5)',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
  },
  uploadText: { fontSize: 16, fontWeight: '700', color: '#e0e7ff', marginBottom: 6 },
  uploadSubtext: { fontSize: 13, color: '#64748b' },
  busyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingVertical: 12,
    borderRadius: 10,
  },
  busyTextLabel: {
    color: '#c7d2fe',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 10,
  },
  button: {
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: '#6366f1',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginRight: 6,
  },
  disabled: { opacity: 0.55 },
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
    fontSize: 14,
    color: '#d1d5db',
    marginBottom: 6,
    lineHeight: 20,
  },
  resourceListItem: {
    fontSize: 13,
    color: '#a5b4fc',
    marginBottom: 6,
  },
  gapItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  gapTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#eef2ff',
  },
  gapWhy: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    lineHeight: 20,
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  optionButtonSelected: {
    borderColor: '#6366f1',
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  optionText: {
    color: '#e2e8f0',
    fontSize: 15,
  },
  optionTextSelected: {
    color: '#eef2ff',
    fontWeight: '700',
  },
});

