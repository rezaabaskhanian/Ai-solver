import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppButton } from '../../components/common/AppButton';
import { AppText } from '../../components/common/AppText';
import { Icon, type IconName } from '../../components/common/Icon';
import { Logo } from '../../components/common/Logo';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { useIsRTL } from '../../hooks/useIsRTL';
import { toApiError, translationKeyForApiError } from '../../services/api/apiError';
import { resetPassword, sendOtp, verifyOtp, type OtpPurpose } from '../../services/api/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { fontFamily, fontSize, makeStyles, radius, spacing, useColors } from '../../theme';

// Login / sign-up / forgot password — the same flow as LingoFlow's
// app/src/screens/AuthScreens.tsx, in this app's look:
//   login:    phone + password
//   sign up:  nickname + phone + password → SMS code → account
//   reset:    phone → SMS code → new password
// Rendered by App.tsx instead of the navigator until signed in, so it
// uses no navigation hooks.

type Mode = 'login' | 'register' | 'reset';

const OTP_LENGTH = 5;
const MIN_PASSWORD = 6;

// Server messages for auth are already Persian (internal/service/account);
// only network/rate-limit errors need the app's own wording.
function useErrorText() {
  const { t } = useTranslation();
  return (err: unknown) => {
    const apiError = toApiError(err);
    if (apiError.code === 'network' || apiError.code === 'rate_limited' || apiError.code === 'internal_error') {
      return t(translationKeyForApiError(apiError));
    }
    return apiError.message || t('errors.generic');
  };
}

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');

  if (mode === 'register') {
    return <RegisterForm onBack={() => setMode('login')} />;
  }
  if (mode === 'reset') {
    return <ResetForm onBack={() => setMode('login')} />;
  }
  return <LoginForm onRegister={() => setMode('register')} onReset={() => setMode('reset')} />;
}

// ---------- shared pieces ----------

function Header({ icon, title, subtitle }: { icon?: IconName; title: string; subtitle?: string }) {
  const colors = useColors();
  const styles = useStyles();
  return (
    <View style={styles.header}>
      {icon ? (
        <View style={styles.headerIcon}>
          <Icon name={icon} size={30} color={colors.primaryText} />
        </View>
      ) : (
        <Logo size={64} />
      )}
      <AppText size="xl" weight="bold" align="center">
        {title}
      </AppText>
      {subtitle ? (
        <AppText size="sm" color={colors.textSecondary} align="center">
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('auth.back')}
      onPress={onPress}
      style={({ pressed }) => [styles.back, isRTL ? styles.backRTL : null, pressed && styles.pressed]}
    >
      <Icon name={isRTL ? 'arrow-forward' : 'arrow-back'} />
    </Pressable>
  );
}

interface FieldProps extends TextInputProps {
  icon: IconName;
  secret?: boolean;
}

// An input row: icon + text field (+ show/hide for passwords).
function Field({ icon, secret, style, ...rest }: FieldProps) {
  const colors = useColors();
  const styles = useStyles();
  const isRTL = useIsRTL();
  const [visible, setVisible] = useState(false);
  return (
    <View style={[styles.field, isRTL && styles.rowRTL]}>
      <Icon name={icon} size={20} color={colors.textSecondary} />
      <TextInput
        placeholderTextColor={colors.textSecondary}
        secureTextEntry={secret && !visible}
        autoCapitalize="none"
        autoCorrect={false}
        style={[styles.input, style]}
        {...rest}
      />
      {secret && (
        <Pressable accessibilityRole="button" onPress={() => setVisible(v => !v)} hitSlop={8}>
          <Icon name={visible ? 'visibility-off' : 'visibility'} size={20} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

function ErrorText({ text }: { text: string }) {
  const colors = useColors();
  return text ? (
    <AppText size="sm" color={colors.danger} align="center">
      {text}
    </AppText>
  ) : null;
}

function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={8}>
      <AppText size="sm" weight="bold" color={colors.primaryText} align="center">
        {label}
      </AppText>
    </Pressable>
  );
}

// ---------- login ----------

function LoginForm({ onRegister, onReset }: { onRegister: () => void; onReset: () => void }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const login = useAuthStore(s => s.login);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!phone.trim() || !password) {
      setError(t('auth.fillAllFields'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(phone.trim(), password);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <Header title={t('auth.welcomeBack')} subtitle={t('auth.loginSub')} />
      <Field icon="phone-iphone" placeholder={t('auth.phone')} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <Field
        icon="lock"
        secret
        placeholder={t('auth.password')}
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={submit}
      />
      <ErrorText text={error} />
      <AppButton label={t('auth.login')} onPress={submit} loading={loading} disabled={loading} />
      <LinkButton label={t('auth.forgotPassword')} onPress={onReset} />
      <AppButton label={t('auth.signUp')} icon="person-add" variant="secondary" onPress={onRegister} />
    </ScreenContainer>
  );
}

// ---------- SMS code (shared by sign-up and reset) ----------

function OtpStep({
  phone,
  purpose,
  onVerified,
  onBack,
}: {
  phone: string;
  purpose: OtpPurpose;
  onVerified: (token: string) => void;
  onBack: () => void;
}) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const errorText = useErrorText();
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const autoSubmitted = useRef(false);

  const verify = async (value = code) => {
    if (value.length < OTP_LENGTH) {
      setError(t('auth.fillAllFields'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      onVerified(await verifyOtp(phone, value, purpose));
    } catch (err) {
      autoSubmitted.current = false;
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  // A code filled in by SMS autofill (or typed) is submitted as soon as
  // it's complete — no need to press the button (same as LingoFlow).
  useEffect(() => {
    if (code.length === OTP_LENGTH && !loading && !autoSubmitted.current) {
      autoSubmitted.current = true;
      verify(code);
    }
    if (code.length < OTP_LENGTH) {
      autoSubmitted.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const resend = async () => {
    setError('');
    setInfo('');
    setResending(true);
    try {
      await sendOtp(phone, purpose);
      setInfo(t('auth.codeResent'));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setResending(false);
    }
  };

  return (
    <ScreenContainer scroll>
      <BackButton onPress={onBack} />
      <Header icon="verified-user" title={t('auth.enterCode')} subtitle={t('auth.codeSentTo', { phone })} />
      {/* Always LTR: the digits are typed left to right. */}
      <Pressable style={styles.otpRow} onPress={() => inputRef.current?.focus()}>
        {Array.from({ length: OTP_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[styles.otpBox, i < code.length && styles.otpBoxFilled, i === code.length && styles.otpBoxActive]}
          >
            <AppText size="xl" weight="bold">
              {code[i] ?? ''}
            </AppText>
          </View>
        ))}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={text => {
            setCode(text.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\D/g, '').slice(0, OTP_LENGTH));
            setError('');
          }}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          autoComplete="sms-otp"
          textContentType="oneTimeCode"
          autoFocus
          style={styles.otpHiddenInput}
        />
      </Pressable>
      <ErrorText text={error} />
      {info ? (
        <AppText size="sm" color={colors.success} align="center">
          {info}
        </AppText>
      ) : null}
      <AppButton label={t('auth.verifyCode')} onPress={() => verify()} loading={loading} disabled={loading} />
      <LinkButton label={resending ? '…' : t('auth.resendCode')} onPress={resend} />
    </ScreenContainer>
  );
}

// ---------- sign up ----------

function RegisterForm({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const register = useAuthStore(s => s.register);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const next = async () => {
    if (!nickname.trim() || !phone.trim() || !password) {
      setError(t('auth.fillAllFields'));
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError(t('auth.weakPassword'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendOtp(phone.trim(), 'register');
      setStep('otp');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  const onVerified = async (otpToken: string) => {
    try {
      await register(nickname.trim(), phone.trim(), password, otpToken);
    } catch (err) {
      setError(errorText(err));
      setStep('form');
    }
  };

  if (step === 'otp') {
    return <OtpStep phone={phone.trim()} purpose="register" onVerified={onVerified} onBack={() => setStep('form')} />;
  }

  return (
    <ScreenContainer scroll>
      <BackButton onPress={onBack} />
      <Header icon="person-add" title={t('auth.signUp')} subtitle={t('auth.registerSub')} />
      <Field icon="person" placeholder={t('auth.nickname')} value={nickname} onChangeText={setNickname} autoCapitalize="words" />
      <Field icon="phone-iphone" placeholder={t('auth.phone')} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <Field icon="lock" secret placeholder={t('auth.password')} value={password} onChangeText={setPassword} />
      <Field icon="lock" secret placeholder={t('auth.confirmPassword')} value={confirm} onChangeText={setConfirm} />
      <ErrorText text={error} />
      <AppButton label={t('auth.continue')} onPress={next} loading={loading} disabled={loading} />
      <LinkButton label={t('auth.haveAccount')} onPress={onBack} />
    </ScreenContainer>
  );
}

// ---------- forgot password ----------

function ResetForm({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  const { t } = useTranslation();
  const errorText = useErrorText();
  const [step, setStep] = useState<'phone' | 'otp' | 'password' | 'done'>('phone');
  const [phone, setPhone] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sendCode = async () => {
    if (!phone.trim()) {
      setError(t('auth.fillAllFields'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendOtp(phone.trim(), 'reset');
      setStep('otp');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (password.length < MIN_PASSWORD) {
      setError(t('auth.weakPassword'));
      return;
    }
    if (password !== confirm) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(phone.trim(), otpToken, password);
      setStep('done');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <OtpStep
        phone={phone.trim()}
        purpose="reset"
        onVerified={token => {
          setOtpToken(token);
          setStep('password');
        }}
        onBack={() => setStep('phone')}
      />
    );
  }

  if (step === 'done') {
    return (
      <ScreenContainer scroll>
        <Header icon="check-circle" title={t('auth.resetDoneTitle')} subtitle={t('auth.resetDoneSub')} />
        <AppButton label={t('auth.backToLogin')} onPress={onBack} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <BackButton onPress={onBack} />
      <Header icon="lock-reset" title={t('auth.resetTitle')} subtitle={step === 'phone' ? t('auth.resetSub') : undefined} />
      {step === 'phone' ? (
        <>
          <Field icon="phone-iphone" placeholder={t('auth.phone')} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <ErrorText text={error} />
          <AppButton label={t('auth.sendCode')} onPress={sendCode} loading={loading} disabled={loading} />
        </>
      ) : (
        <>
          <Field icon="lock" secret placeholder={t('auth.newPassword')} value={password} onChangeText={setPassword} />
          <Field icon="lock" secret placeholder={t('auth.confirmPassword')} value={confirm} onChangeText={setConfirm} />
          <ErrorText text={error} />
          <AppButton label={t('auth.savePassword')} onPress={save} loading={loading} disabled={loading} />
        </>
      )}
      <AppText size="xs" color={colors.textSecondary} align="center">
        {t('auth.resetHint')}
      </AppText>
    </ScreenContainer>
  );
}

const useStyles = makeStyles(colors => StyleSheet.create({
  header: {
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryMuted,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  backRTL: {
    alignSelf: 'flex-end',
  },
  pressed: {
    opacity: 0.7,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.fa.regular,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    textAlign: 'right',
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    direction: 'ltr',
  },
  otpBox: {
    width: 52,
    height: 58,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFilled: {
    borderColor: colors.primary,
  },
  otpBoxActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  otpHiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
}));
