import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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
import {
  resendVerificationApi,
  verifyEmailApi,
} from '@/api/endpoints/auth.api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { setStoredTokens } from '@/storage/tokenStorage';
import { useAuthStore } from '@/store/useAuthStore';
import { toast } from '@/store/useToastStore';
import { FONTS, useAppTheme } from '@/theme/colors';
import type { VerificationChannel } from '@/types/auth.types';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    email?: string;
    phone?: string;
    channel?: string;
  }>();
  const colors = useAppTheme();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState(params.email ?? '');
  const [code, setCode] = useState('');
  const [channel, setChannel] = useState<VerificationChannel>(
    params.channel === 'sms' ? 'sms' : 'email',
  );
  const [cooldown, setCooldown] = useState(params.email ? 60 : 0);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleVerify = async () => {
    if (!email.trim()) {
      toast.error('Ingresa tu correo electrónico');
      return;
    }
    const cleanCode = code.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      toast.error('El código debe tener 6 dígitos numéricos');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await verifyEmailApi({
        email: email.trim(),
        code: cleanCode,
      });

      await setStoredTokens({
        accessToken: res.access_token,
        refreshToken: res.refresh_token,
      });
      await setSession(
        { access_token: res.access_token, refresh_token: res.refresh_token },
        res.user,
      );

      toast.success('¡Cuenta verificada con éxito!', {
        description: `Bienvenido a DeliveryPro, ${res.user.name}.`,
      });

      if (res.user.role === 'DELIVERY') {
        router.replace('/(delivery)');
      } else {
        router.replace('/(client)');
      }
    } catch (err) {
      toast.error('Código inválido o expirado', {
        description: extractErrorMessage(err),
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!email.trim() || cooldown > 0) return;
    setIsResending(true);
    try {
      const res = await resendVerificationApi({
        email: email.trim(),
        channel,
      });
      setCooldown(60);
      toast.success('Nuevo código enviado', { description: res.message });
    } catch (err) {
      toast.error('No se pudo reenviar el código', {
        description: extractErrorMessage(err),
      });
    } finally {
      setIsResending(false);
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
          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            style={styles.backRow}
          >
            <ArrowLeft size={17} color={colors.primary} strokeWidth={2.2} />
            <Text style={[styles.backText, { color: colors.primary }]}>
              Ir a Iniciar Sesión
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
              <ShieldCheck size={28} color={colors.primary} />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              Verifica tu Cuenta
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Ingresa el código de 6 dígitos enviado a tu{' '}
              {channel === 'sms' ? 'celular / Gmail de respaldo' : 'correo electrónico'}.
            </Text>

            <Input
              label="Correo de la cuenta"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              leftIcon={<Mail size={18} color={colors.textMuted} />}
            />

            <Input
              label="Código de verificación (6 dígitos)"
              placeholder="123456"
              value={code}
              onChangeText={(txt) => setCode(txt.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
            />

            <Button
              title="Activar mi Cuenta"
              variant="primary"
              size="lg"
              fullWidth
              loading={isVerifying}
              onPress={() => void handleVerify()}
              leftIcon={<CheckCircle2 size={18} color="#FFFFFF" />}
            />

            <View style={styles.resendWrap}>
              <Button
                title={
                  cooldown > 0
                    ? `Reenviar código en ${cooldown}s`
                    : 'Reenviar código'
                }
                variant="outline"
                size="sm"
                fullWidth
                disabled={cooldown > 0}
                loading={isResending}
                onPress={() => void handleResend()}
                leftIcon={<RefreshCw size={15} color={colors.text} />}
              />
              <Pressable
                onPress={() =>
                  setChannel((prev) => (prev === 'email' ? 'sms' : 'email'))
                }
              >
                <Text style={[styles.switchText, { color: colors.primary }]}>
                  Cambiar envío a {channel === 'email' ? 'SMS' : 'Correo Gmail'}
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
    width: 54,
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  title: {
    fontFamily: FONTS.heading,
    fontSize: 22,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: FONTS.sans,
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: -6,
  },
  resendWrap: {
    gap: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  switchText: {
    fontFamily: FONTS.sansSemi,
    fontSize: 12.5,
  },
});
