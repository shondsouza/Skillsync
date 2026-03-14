import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { loginUser } from '@/utils/api';
import { setAuth } from '@/utils/authStore';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Mail, Lock } from 'lucide-react-native';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      return;
    }
    try {
      setError(null);
      setIsSubmitting(true);
      const res = await loginUser(email.trim(), password);
      setAuth(res.token, res.user);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? 'Unable to log in. Check your credentials and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = email.trim().length > 0 && password.trim().length >= 6 && !isSubmitting;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Absolute Background Image */}
      <Image 
        source={require('@/assets/images/banner.jpg')} 
        style={[StyleSheet.absoluteFillObject, { opacity: 0.15 }]} 
        contentFit="cover" 
        transition={1000}
      />
      
      <KeyboardAvoidingView
        style={[styles.flex, { zIndex: 1 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Image 
              source={require('@/assets/images/logo.png')} 
              style={{ width: 140, height: 48, marginBottom: 16 }} 
              contentFit="contain" 
            />
            <Text style={styles.subtitle}>Log in to continue your Evalio journey.</Text>
          </View>

          <BlurView intensity={20} tint="dark" style={styles.card}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputWrap}>
              <Mail color="#9ca3af" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrap}>
              <Lock color="#9ca3af" size={20} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="At least 6 characters"
                placeholderTextColor="#64748b"
                secureTextEntry
                autoComplete="password"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, !canSubmit && styles.disabled]}
              onPress={handleLogin}
              disabled={!canSubmit}
            >
              <Text style={styles.buttonText}>{isSubmitting ? 'Logging in…' : 'Log in'}</Text>
            </TouchableOpacity>
          </BlurView>

          <View style={styles.authRow}>
            <Text style={styles.authText}>New to Evalio?</Text>
            <Link href="/register" asChild>
              <TouchableOpacity>
                <Text style={styles.authLink}>Create account</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#050816' },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    backgroundColor: 'transparent',
  },
  header: { marginBottom: 32, alignItems: 'center' },
  brand: { fontSize: 28, fontWeight: '800', color: '#eef2ff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  card: {
    backgroundColor: 'rgba(11, 17, 32, 0.4)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#d1d5db',
    marginBottom: 8,
    marginTop: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 14,
    zIndex: 1,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: '#e5e7eb',
    paddingLeft: 44,
    paddingRight: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  button: {
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryButton: { backgroundColor: '#4f46e5' },
  buttonText: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
  disabled: { opacity: 0.55 },
  error: { color: '#f97373', fontSize: 12, marginTop: 8 },
  authRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
  },
  authText: { color: '#9ca3af', fontSize: 13 },
  authLink: { color: '#a5b4fc', fontSize: 13, fontWeight: '600' },
});

