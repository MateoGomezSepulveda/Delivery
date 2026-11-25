import axios from 'axios';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  Lock,
  LogIn,
  Mail,
  MailWarning,
  Sparkles,
  Wine,
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
import {
  extractApiErrorDetails,
  extractErrorMessage,
} from '@/api/axios.client';
import { loginApi, resendVerificationApi } from '@/api/endpoints/auth.api';
import { getUserByIdApi } from '@/api/endpoints/users.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { setStoredTokens } from '@/storage/tokenStorage';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';
import { FONTS, useAppTheme } from '@/theme/colors';
import { decodeJwtPayload } from '@/utils/jwt';

export default function LoginScreen() {
  const router = useRouter();
  const colors = useAppTheme();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [isSendingVerification, setIsSendingVerification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      nextErrors.email = 'El correo electrónico es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = 'Ingresa un formato de correo electrónico válido.';
    }

    if (!password) {
      nextErrors.password = 'La contraseña es obligatoria.';
    } else if (password.length < 6) {
      nextErrors.password = 'La contraseña debe tener al menos 6 caracteres.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleFillAdminSeed = () => {
    setEmail('admin@delivery.com');
    setPassword('Admin123456');
    setErrors({});
    setRateLimitWarning(null);
    toast.info('Credenciales de Admin cargadas', {
      description: 'Tomadas del seed configurado en delivery-backend',
    });
  };

  const handleVerifyPendingEmail = async () => {
    if (!unverifiedEmail) return;
    setIsSendingVerification(true);
    try {
      await resendVerificationApi({ email: unverifiedEmail });
      toast.success('Te enviamos un nuevo código de verificación', {
        description: 'Revisa tu correo para activar tu cuenta.',
      });
    } catch (err) {
      toast.error('No se pudo reenviar el código', {
        description: extractErrorMessage(err),
      });
    } finally {
      setIsSendingVerification(false);
      router.push({
        pathname: '/(auth)/verify-email',
        params: { email: unverifiedEmail },
      });
    }
  };

  const handleSubmit = async () => {
    setRateLimitWarning(null);
    setUnverifiedEmail(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const tokens = await loginApi({
        email: email.trim(),
        password,
      });

      await setStoredTokens({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      });

      const payload = decodeJwtPayload(tokens.access_token);
      if (!payload?.sub) {
        throw new Error(
          'El token JWT recibido no contiene un identificador de usuario válido.',
        );
      }

      const userProfile = await getUserByIdApi(payload.sub);
      await setSession(tokens, userProfile);

      toast.success(`¡Bienvenido de nuevo, ${userProfile.name}!`, {
        description: `Sesión iniciada con rol ${userProfile.role}`,
      });

      if (userProfile.role === 'DELIVERY') {
        router.replace('/(delivery)');
      } else {
        router.replace('/(client)');
      }
    } catch (error) {
      const details = extractApiErrorDetails(error);
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const msg =
          'Demasiados intentos de inicio de sesión (máx. 5 por minuto). Espera 60 segundos antes de volver a intentar.';
        setRateLimitWarning(msg);
        toast.error('Límite de intentos alcanzado', { description: msg });
      } else if (
        details.statusCode === 403 &&
        details.code === 'EMAIL_NOT_VERIFIED'
      ) {
        const targetEmail = details.email || email.trim();
        setUnverifiedEmail(targetEmail);
        toast.warning('Correo pendiente de verificación', {
          description: 'Confirma tu cuenta para poder iniciar sesión.',
        });
      } else {
        toast.error('Error al iniciar sesión', {
          description: details.message,
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
          {/* Botón volver al catálogo */}
          <Pressable
            onPress={() => router.replace('/(client)')}
            style={styles.backRow}
          >
            <ArrowLeft size={17} color={colors.primary} strokeWidth={2.2} />
            <Text style={[styles.backText, { color: colors.primary }]}>
              Volver al Catálogo
            </Text>
          </Pressable>

          {/* Identidad de Marca */}
          <View style={styles.brandHeader}>
            <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
              <Wine size={24} color="#FFFFFF" strokeWidth={2.2} />
            </View>
            <Text style={[styles.brandName, { color: colors.text }]}>
              Delivery<Text style={{ color: colors.primary }}>Pro</Text>
            </Text>
          </View>

          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View>
              <Text style={[styles.title, { color: colors.text }]}>
                Iniciar Sesión
              </Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Ingresa tus credenciales para acceder a tu cuenta en DeliveryPro.
              </Text>
            </View>

            {/* Modo Desarrollo idéntico al Frontend Web */}
            <View
              style={[
                styles.devBanner,
                {
                  backgroundColor: colors.primarySoft,
                  borderColor: colors.primaryBorder,
                },
              ]}
            >
              <View style={styles.flex}>
                <Text style={[styles.devTitle, { color: colors.primaryText }]}>
                  Modo Desarrollo
                </Text>
                <Text style={[styles.devDesc, { color: colors.textSecondary }]}>
                  Autocompletar cuenta por defecto
                </Text>
              </View>
              <Button
                title="Usar Admin"
                variant="outline"
                size="sm"
                onPress={handleFillAdminSeed}
                leftIcon={<Sparkles size={14} color={colors.primary} />}
              />
            </View>

            {rateLimitWarning ? (
              <View
                style={[
                  styles.alertBox,
                  {
                    backgroundColor: colors.warningSoft,
                    borderColor: colors.warningBorder,
                  },
                ]}
              >
                <AlertTriangle size={18} color={colors.warning} />
                <View style={styles.flex}>
                  <Text style={[styles.alertTitle, { color: colors.warning }]}>
                    Protección Anti-Fuerza Bruta
                  </Text>
                  <Text style={[styles.alertDesc, { color: colors.text }]}>
                    {rateLimitWarning}
                  </Text>
                </View>
              </View>
            ) : null}

            {unverifiedEmail ? (
              <View
                style={[
                  styles.unverifiedBox,
                  {
                    backgroundColor: colors.warningSoft,
                    borderColor: colors.warningBorder,
                  },
                ]}
              >
                <View style={styles.rowGap}>
                  <MailWarning size={19} color={colors.warning} />
                  <View style={styles.flex}>
                    <Text style={[styles.alertTitle, { color: colors.warning }]}>
                      Tu cuenta aún no está verificada
                    </Text>
                    <Text style={[styles.alertDesc, { color: colors.text }]}>
                      Enviaremos un código a {unverifiedEmail} para activarla.
                    </Text>
                  </View>
                </View>
                <Button
                  title="Verificar mi cuenta ahora"
                  variant="primary"
                  size="sm"
                  fullWidth
                  loading={isSendingVerification}
                  onPress={() => void handleVerifyPendingEmail()}
                />
              </View>
            ) : null}

            <Input
              label="Correo electrónico"
              placeholder="tu@correo.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={errors.email}
              leftIcon={<Mail size={18} color={colors.textMuted} />}
            />

            <Input
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              isPassword
              error={errors.password}
              leftIcon={<Lock size={18} color={colors.textMuted} />}
            />

            <Pressable
              onPress={() => router.push('/(auth)/forgot-password')}
              style={styles.forgotWrap}
            >
              <Text style={[styles.forgotText, { color: colors.primary }]}>
                ¿Olvidaste tu contraseña?
              </Text>
            </Pressable>

            <Button
              title="Iniciar Sesión"
              variant="primary"
              size="lg"
              fullWidth
              loading={isSubmitting}
              onPress={() => void handleSubmit()}
              leftIcon={<LogIn size={18} color="#FFFFFF" />}
            />

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                ¿Aún no tienes cuenta?{' '}
              </Text>
              <Pressable onPress={() => router.push('/(auth)/register')}>
                <Text style={[styles.footerLink, { color: colors.primary }]}>
                  Regístrate aquí
                </Text>
              </Pressable>
            </View>
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
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 4,
  },
  logoBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontFamily: FONTS.heading,
    fontSize: 24,
  },
  card: {
    borderRadius: 26,
    borderWidth: 1,
    padding: 22,
    gap: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 22,
  },
  subtitle: {
    marginTop: 4,
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    lineHeight: 19,
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  devTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 12.5,
  },
  devDesc: {
    fontFamily: FONTS.sans,
    fontSize: 11.5,
    marginTop: 1,
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  unverifiedBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 13,
    gap: 10,
  },
  rowGap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  alertTitle: {
    fontFamily: FONTS.sansBold,
    fontSize: 13,
  },
  alertDesc: {
    fontFamily: FONTS.sans,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 17,
  },
  forgotWrap: {
    alignSelf: 'flex-end',
    marginTop: -6,
  },
  forgotText: {
    fontFamily: FONTS.sansSemi,
    fontSize: 13,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  footerText: {
    fontFamily: FONTS.sans,
    fontSize: 13.5,
  },
  footerLink: {
    fontFamily: FONTS.sansBold,
    fontSize: 13.5,
  },
});
