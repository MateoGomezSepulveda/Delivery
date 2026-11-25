import axios from 'axios';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Lock,
  Mail,
  MessageSquare,
  Phone,
  User as UserIcon,
  UserPlus,
} from 'lucide-react-native';
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
import { loginApi, registerApi } from '@/api/endpoints/auth.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { setStoredTokens } from '@/storage/tokenStorage';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';
import { FONTS, useAppTheme } from '@/theme/colors';
import type { VerificationChannel } from '@/types/auth.types';
import { validatePhoneNumber } from '@/utils/phone';

export default function RegisterScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const setSession = useAuthStore((s) => s.setSession);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationChannel, setVerificationChannel] =
    useState<VerificationChannel>('email');
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const nextErrors: typeof errors = {};
    if (!name.trim() || name.trim().length < 2) {
      nextErrors.name = 'Ingresa tu nombre completo (mínimo 2 caracteres).';
    }
    if (!email.trim()) {
      nextErrors.email = 'El correo electrónico es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Ingresa un correo electrónico válido.';
    }
    const phoneErr = validatePhoneNumber(phone);
    if (phoneErr) nextErrors.phone = phoneErr;

    if (!password || password.length < 6) {
      nextErrors.password = 'La contraseña debe tener mínimo 6 caracteres.';
    }
    if (confirmPassword !== password) {
      nextErrors.confirmPassword = 'Las contraseñas no coinciden.';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);

    try {
      const createdUser = await registerApi({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        verificationChannel,
      });

      if (
        createdUser.requiresEmailVerification !== false &&
        !createdUser.isEmailVerified
      ) {
        const channel = createdUser.verificationChannel ?? verificationChannel;
        toast.success(
          channel === 'sms'
            ? createdUser.smsDelivered
              ? '¡Cuenta creada! Revisa tu SMS'
              : '¡Cuenta creada! Revisa tu código en Gmail'
            : '¡Cuenta creada! Revisa tu correo electrónico',
          {
            description: 'Ingresa el código de 6 dígitos para activar tu cuenta.',
          },
        );

        router.replace({
          pathname: '/(auth)/verify-email',
          params: {
            email: createdUser.email,
            phone: createdUser.phone || phone.trim(),
            channel,
          },
        });
        return;
      }

      const tokens = await loginApi({
        email: email.trim(),
        password,
      });
      await setStoredTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });
      await setSession(tokens, createdUser);

      toast.success(`¡Cuenta creada con éxito, ${createdUser.name}!`);
      router.replace('/(client)');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        const msg = extractErrorMessage(error);
        setErrors((prev) => ({ ...prev, email: msg }));
        toast.error('Correo ya registrado', { description: msg });
      } else {
        toast.error('No se pudo completar el registro', {
          description: extractErrorMessage(error),
        });
      }
    } finally {
      setIsSubmitting(false);
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
          showsVerticalScrollIndicator={false}
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
            {/* Stepper 2 Pasos igual a la Web */}
            <View style={styles.stepperRow}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text style={styles.stepNumActive}>1</Text>
                </View>
                <Text style={[styles.stepLabelActive, { color: colors.primary }]}>
                  Tus datos
                </Text>
              </View>
              <View
                style={[styles.stepLine, { backgroundColor: colors.border }]}
              />
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    { backgroundColor: colors.surfaceMuted },
                  ]}
                >
                  <Text
                    style={[styles.stepNumMuted, { color: colors.textMuted }]}
                  >
                    2
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepLabelMuted,
                    { color: colors.textSecondary },
                  ]}
                >
                  Verificar cuenta
                </Text>
              </View>
            </View>

            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                Crear Cuenta
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Regístrate para hacer tus pedidos a domicilio en minutos.
              </Text>
            </View>

            <Input
              label="Nombre completo"
              placeholder="Ej. Sofía Ramírez"
              value={name}
              onChangeText={setName}
              error={errors.name}
              leftIcon={<UserIcon size={18} color={colors.textMuted} />}
            />

            <Input
              label="Correo electrónico"
              placeholder="sofia@gmail.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
              leftIcon={<Mail size={18} color={colors.textMuted} />}
            />

            <Input
              label="Número de celular (obligatorio)"
              placeholder="300 123 4567"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              error={errors.phone}
              leftIcon={<Phone size={18} color={colors.textMuted} />}
            />

            {/* Selector de Canal de Verificación idéntico a la Web */}
            <View style={styles.channelWrap}>
              <Text style={[styles.channelLabel, { color: colors.text }]}>
                ¿Cómo quieres verificar tu cuenta?
              </Text>
              <View style={styles.channelRow}>
                <Pressable
                  onPress={() => setVerificationChannel('email')}
                  style={[
                    styles.channelCard,
                    {
                      borderColor:
                        verificationChannel === 'email'
                          ? colors.primary
                          : colors.border,
                      backgroundColor:
                        verificationChannel === 'email'
                          ? colors.primarySoft
                          : colors.surfaceMuted,
                    },
                  ]}
                >
                  <Mail
                    size={16}
                    color={
                      verificationChannel === 'email'
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.channelText,
                      {
                        color:
                          verificationChannel === 'email'
                            ? colors.primaryText
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    Correo Gmail
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setVerificationChannel('sms')}
                  style={[
                    styles.channelCard,
                    {
                      borderColor:
                        verificationChannel === 'sms'
                          ? colors.primary
                          : colors.border,
                      backgroundColor:
                        verificationChannel === 'sms'
                          ? colors.primarySoft
                          : colors.surfaceMuted,
                    },
                  ]}
                >
                  <MessageSquare
                    size={16}
                    color={
                      verificationChannel === 'sms'
                        ? colors.primary
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.channelText,
                      {
                        color:
                          verificationChannel === 'sms'
                            ? colors.primaryText
                            : colors.textSecondary,
                      },
                    ]}
                  >
                    SMS Celular
                  </Text>
                </Pressable>
              </View>
            </View>

            <Input
              label="Contraseña"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              isPassword
              error={errors.password}
              leftIcon={<Lock size={18} color={colors.textMuted} />}
            />

            <Input
              label="Confirmar contraseña"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              isPassword
              error={errors.confirmPassword}
              leftIcon={<Lock size={18} color={colors.textMuted} />}
            />

            <Button
              title="Crear mi Cuenta"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              onPress={() => void handleSubmit()}
              leftIcon={<UserPlus size={18} color="#FFFFFF" />}
            />
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
    paddingTop: 10,
    paddingBottom: 32,
    gap: 14,
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
    padding: 20,
    gap: 14,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 99,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumActive: {
    color: '#FFFFFF',
    fontFamily: FONTS.sansBold,
    fontSize: 12,
  },
  stepNumMuted: {
    fontFamily: FONTS.sansBold,
    fontSize: 12,
  },
  stepLabelActive: {
    fontFamily: FONTS.sansBold,
    fontSize: 12,
  },
  stepLabelMuted: {
    fontFamily: FONTS.sansSemi,
    fontSize: 12,
  },
  stepLine: {
    flex: 1,
    height: 2,
    borderRadius: 99,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 22,
  },
  subtitle: {
    marginTop: 3,
    fontFamily: FONTS.sans,
    fontSize: 13,
    lineHeight: 18,
  },
  channelWrap: {
    gap: 7,
  },
  channelLabel: {
    fontFamily: FONTS.sansSemi,
    fontSize: 13,
  },
  channelRow: {
    flexDirection: 'row',
    gap: 10,
  },
  channelCard: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 13,
    borderWidth: 1.2,
    paddingHorizontal: 10,
  },
  channelText: {
    fontFamily: FONTS.sansBold,
    fontSize: 12.5,
  },
});
