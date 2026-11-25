import { useRouter } from 'expo-router';
import { ArrowLeft, KeyRound, Lock, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { extractErrorMessage } from '@/api/axios.client';
import { forgotPasswordApi, resetPasswordApi } from '@/api/endpoints/auth.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from '@/store/useToastStore';
import { FONTS, useAppTheme } from '@/theme/colors';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colors = useAppTheme();

  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async () => {
    if (!email.trim()) {
      toast.error('Ingresa tu correo electrónico');
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPasswordApi({ email: email.trim() });
      toast.success('Revisa tu correo electrónico', {
        description: res.message,
      });
      setStep('reset');
    } catch (err) {
      toast.error('No se pudo enviar la solicitud', {
        description: extractErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async () => {
    if (!token.trim()) {
      toast.error('Pega el token recibido en tu correo');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    try {
      await resetPasswordApi({
        token: token.trim(),
        newPassword,
      });
      toast.success('¡Contraseña actualizada!', {
        description: 'Ya puedes iniciar sesión con tu nueva contraseña.',
      });
      router.replace('/(auth)/login');
    } catch (err) {
      toast.error('Token inválido o expirado', {
        description: extractErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={() => router.back()} style={styles.backRow}>
            <ArrowLeft size={17} color={colors.primary} strokeWidth={2.2} />
            <Text style={[styles.backText, { color: colors.primary }]}>
              Volver a Iniciar Sesión
            </Text>
          </Pressable>

          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View
              style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}
            >
              <KeyRound size={26} color={colors.primary} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              {step === 'request'
                ? 'Recuperar Contraseña'
                : 'Restablecer Contraseña'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {step === 'request'
                ? 'Te enviaremos un enlace/token seguro a tu correo registrado.'
                : 'Pega el token que llegó a tu correo y define tu nueva contraseña.'}
            </Text>

            {step === 'request' ? (
              <>
                <Input
                  label="Correo electrónico"
                  placeholder="tu@correo.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  leftIcon={<Mail size={18} color={colors.textMuted} />}
                />
                <Button
                  title="Enviar instrucciones"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  onPress={() => void handleRequestReset()}
                />
                <Button
                  title="Ya tengo un token de recuperación"
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onPress={() => setStep('reset')}
                />
              </>
            ) : (
              <>
                <Input
                  label="Token de recuperación"
                  placeholder="Pega aquí el token del correo"
                  value={token}
                  onChangeText={setToken}
                  autoCapitalize="none"
                  leftIcon={<KeyRound size={18} color={colors.textMuted} />}
                />
                <Input
                  label="Nueva contraseña"
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  isPassword
                  leftIcon={<Lock size={18} color={colors.textMuted} />}
                />
                <Button
                  title="Actualizar Contraseña"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  onPress={() => void handleConfirmReset()}
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 16,
  },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backText: {
    fontFamily: FONTS.sansBold,
    fontSize: 13.5,
  },
  card: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 22,
    gap: 15,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 21,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: -6,
  },
});
