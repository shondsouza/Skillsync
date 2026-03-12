import React, { useEffect, useState } from 'react';
import {
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
import { fetchProfile, updateProfile } from '@/utils/api';

export default function ProfileScreen() {
  const [name, setName] = useState('');
  const [headline, setHeadline] = useState('');
  const [currentRole, setCurrentRole] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [yearsExp, setYearsExp] = useState('');
  const [bio, setBio] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchProfile();
        setName(data.name ?? '');
        const p = data.profile ?? {};
        setHeadline(p.headline ?? '');
        setCurrentRole(p.current_role ?? '');
        setTargetRole(p.target_role ?? '');
        setYearsExp(p.years_experience ?? '');
        setBio(p.bio ?? '');
      } catch {
        // If not logged in or profile missing, keep defaults.
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSave = () => {
    updateProfile({
      name,
      headline,
      current_role: currentRole,
      target_role: targetRole,
      years_experience: yearsExp,
      bio,
    }).finally(() => {
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>Your profile</Text>
            <Text style={styles.subtitle}>
              Tell Evalio who you are so we can tailor your quizzes and feedback.
            </Text>
          </View>

          <View style={styles.card}>
            {loading && <Text style={styles.loading}>Loading profile…</Text>}
            <Text style={styles.label}>Full name</Text>
            <TextInput
              style={styles.input}
              placeholder="Jane Doe"
              placeholderTextColor="#64748b"
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Headline</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Frontend engineer, React specialist"
              placeholderTextColor="#64748b"
              value={headline}
              onChangeText={setHeadline}
            />

            <Text style={styles.label}>Current role</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mid-level frontend engineer"
              placeholderTextColor="#64748b"
              value={currentRole}
              onChangeText={setCurrentRole}
            />

            <Text style={styles.label}>Target role</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Senior frontend / Staff engineer"
              placeholderTextColor="#64748b"
              value={targetRole}
              onChangeText={setTargetRole}
            />

            <Text style={styles.label}>Years of experience</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 5"
              placeholderTextColor="#64748b"
              keyboardType="number-pad"
              value={yearsExp}
              onChangeText={setYearsExp}
            />

            <Text style={styles.label}>About you</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              placeholder="Short summary of your background and what you want to work on next."
              placeholderTextColor="#64748b"
              multiline
              textAlignVertical="top"
              value={bio}
              onChangeText={setBio}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveText}>{saved ? 'Saved' : 'Save profile'}</Text>
            </TouchableOpacity>
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
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#eef2ff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#9ca3af' },
  card: {
    backgroundColor: '#0b1120',
    borderRadius: 16,
    padding: 16,
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
  multiline: { minHeight: 100 },
  saveButton: {
    marginTop: 18,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
  },
  saveText: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
  loading: { color: '#9ca3af', fontSize: 12, marginBottom: 8 },
});

