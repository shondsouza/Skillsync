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
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { fetchProfile, updateProfile } from '@/utils/api';
import { User, Briefcase, Target, Clock, MessageSquare, Save } from 'lucide-react-native';

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
      {/* Absolute Background Image */}
      <Image 
        source={require('@/assets/images/banner.jpg')} 
        style={[StyleSheet.absoluteFillObject, { opacity: 0.1 }]} 
        contentFit="cover" 
        transition={1000}
      />

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

          <BlurView intensity={20} tint="dark" style={styles.card}>
            {loading && <Text style={styles.loading}>Loading profile…</Text>}
            
            <Text style={styles.label}>Full name</Text>
            <View style={styles.inputWrap}>
              <User color="#9ca3af" size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Jane Doe"
                placeholderTextColor="#64748b"
                value={name}
                onChangeText={setName}
              />
            </View>

            <Text style={styles.label}>Headline</Text>
            <View style={styles.inputWrap}>
              <MessageSquare color="#9ca3af" size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. Frontend engineer, React specialist"
                placeholderTextColor="#64748b"
                value={headline}
                onChangeText={setHeadline}
              />
            </View>

            <View style={styles.inputGrid}>
              <View style={styles.inputCol}>
                <Text style={styles.label}>Current role</Text>
                <View style={styles.inputWrap}>
                  <Briefcase color="#9ca3af" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Mid-level"
                    placeholderTextColor="#64748b"
                    value={currentRole}
                    onChangeText={setCurrentRole}
                  />
                </View>
              </View>

              <View style={[styles.inputCol, { marginLeft: 12 }]}>
                <Text style={styles.label}>Target role</Text>
                <View style={styles.inputWrap}>
                  <Target color="#9ca3af" size={18} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Senior"
                    placeholderTextColor="#64748b"
                    value={targetRole}
                    onChangeText={setTargetRole}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>Years of experience</Text>
            <View style={styles.inputWrap}>
              <Clock color="#9ca3af" size={18} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="e.g. 5"
                placeholderTextColor="#64748b"
                keyboardType="number-pad"
                value={yearsExp}
                onChangeText={setYearsExp}
              />
            </View>

            <Text style={styles.label}>About you</Text>
            <TextInput
              style={[styles.input, styles.multiline, { paddingLeft: 14 }]}
              placeholder="Short summary of your background and what you want to work on next."
              placeholderTextColor="#64748b"
              multiline
              textAlignVertical="top"
              value={bio}
              onChangeText={setBio}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              {saved ? (
                <>
                  <Save color="#fff" size={18} style={{ marginRight: 6 }} />
                  <Text style={styles.saveText}>Saved</Text>
                </>
              ) : (
                <Text style={styles.saveText}>Save profile</Text>
              )}
            </TouchableOpacity>
          </BlurView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, zIndex: 1 },
  safe: { flex: 1, backgroundColor: '#03050a' },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 32,
    paddingBottom: 40,
    backgroundColor: 'transparent',
  },
  header: { marginBottom: 24, paddingHorizontal: 4 },
  title: { fontSize: 28, fontWeight: '800', color: '#eef2ff', marginBottom: 6, letterSpacing: 0.2 },
  subtitle: { fontSize: 14, color: '#9ca3af', lineHeight: 20 },
  card: {
    backgroundColor: 'rgba(11, 17, 32, 0.4)',
    borderRadius: 20,
    padding: 24,
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
    marginTop: 16,
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
    paddingLeft: 38,
    paddingRight: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  multiline: { minHeight: 110, paddingTop: 14 },
  saveButton: {
    marginTop: 24,
    borderRadius: 999,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
  },
  saveText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  loading: { color: '#9ca3af', fontSize: 12, marginBottom: 8 },
});

