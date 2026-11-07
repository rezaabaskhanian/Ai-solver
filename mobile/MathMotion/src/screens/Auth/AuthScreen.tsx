import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { AppText } from '../../components/common/AppText';
import { Icon, type IconName } from '../../components/common/Icon';
import { ScreenContainer } from '../../components/common/ScreenContainer';
import { useIsRTL } from '../../hooks/useIsRTL';
import { toApiError, translationKeyForApiError } from '../../services/api/apiError';
import { resetPassword, sendOtp, verifyOtp, type OtpPurpose } from '../../services/api/auth';
import { useAuthStore } from '../../store/useAuthStore';
import { fontFamily, fontSize, makeStyles, radius, spacing, useColors } from '../../theme';

// «مجهول» Auth Screens:
//   login:    phone + password (or fast SMS OTP)
//   sign up:  name + phone + password + confirm password → SMS code → account
//   reset:    phone → SMS code → new password
type Mode = 'login' | 'register' | 'reset' | 'loginOtp';

const OTP_LENGTH = 5;
const MIN_PASSWORD = 6;

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

export function AuthScreen({ initialMode = 'login' }: { initialMode?: 'login' | 'register' }) {
  const [mode, setMode] = useState<Mode>(initialMode);

  if (mode === 'register') {
    return <RegisterForm onBack={() => setMode('login')} onLoginClick={() => setMode('login')} />;
  }
  if (mode === 'reset') {
    return <ResetForm onBack={() => setMode('login')} />;
  }
  if (mode === 'loginOtp') {
    return <LoginOtpForm onBack={() => setMode('login')} onRegister={() => setMode('register')} />;
  }
  return (
    <LoginForm
      onRegister={() => setMode('register')}
      onReset={() => setMode('reset')}
      onOtpLogin={() => setMode('loginOtp')}
    />
  );
}

// ---------- Visual Building Blocks ----------

function BrandIcon({ type }: { type: 'login' | 'register' }) {
  const styles = useStyles();
  if (type === 'login') {
    return (
      <View style={styles.brandIconWrapper}>
        <View style={styles.brandLogoBox}>
          <Icon name="show-chart" size={32} color="#FFFFFF" />
        </View>
        <View style={styles.lightningBadge}>
          <Icon name="flash-on" size={13} color="#0F1F05" />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.brandIconWrapper}>
      <View style={styles.registerIconBox}>
        <Icon name="person-add" size={30} color="#4EA800" />
      </View>
      <View style={styles.lightningBadge}>
        <Icon name="flash-on" size={13} color="#0F1F05" />
      </View>
    </View>
  );
}

function TopBar({
  onBack,
  badgeType,
}: {
  onBack: () => void;
  badgeType: 'help' | 'majhoul';
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const isRTL = useIsRTL();
  return (
    <View style={[styles.topBar, isRTL && styles.rowRTL]}>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
      >
        <Icon name={isRTL ? 'arrow-forward' : 'arrow-back'} size={20} color="#374151" />
      </Pressable>
      {badgeType === 'help' ? (
        <View style={[styles.topBadge, isRTL && styles.rowRTL]}>
          <Icon name="help-outline" size={15} color="#6B7280" />
          <AppText size="xs" weight="medium" color="#6B7280">
            {t('auth.help', { defaultValue: 'راهنما' })}
          </AppText>
        </View>
      ) : (
        <View style={[styles.topBadge, isRTL && styles.rowRTL]}>
          <View style={styles.greenDot} />
          <AppText size="xs" weight="medium" color="#15803D">
            {t('auth.majhoulMath', { defaultValue: 'مجهول ریاضی' })}
          </AppText>
        </View>
      )}
    </View>
  );
}

interface LabeledFieldProps extends TextInputProps {
  label: string;
  icon: IconName;
  secret?: boolean;
  prefix?: string;
  headerAction?: React.ReactNode;
}

function LabeledField({
  label,
  icon,
  secret,
  prefix,
  headerAction,
  style,
  ...rest
}: LabeledFieldProps) {
  const styles = useStyles();
  const isRTL = useIsRTL();
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.labeledFieldContainer}>
      <View style={[styles.fieldHeaderRow, isRTL && styles.rowRTL]}>
        <AppText size="xs" weight="medium" color="#374151">
          {label}
        </AppText>
        {headerAction}
      </View>
      <View style={[styles.fieldBox, isRTL && styles.rowRTL]}>
        <Icon name={icon} size={20} color="#9CA3AF" />
        <TextInput
          placeholderTextColor="#9CA3AF"
          secureTextEntry={secret && !visible}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, style]}
          {...rest}
        />
        {prefix ? (
          <View style={styles.prefixBox}>
            <AppText size="xs" color="#9CA3AF" weight="medium">
              {prefix}
            </AppText>
          </View>
        ) : null}
        {secret ? (
          <Pressable accessibilityRole="button" onPress={() => setVisible(v => !v)} hitSlop={8}>
            <Icon name={visible ? 'visibility-off' : 'visibility'} size={20} color="#9CA3AF" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function PasswordSecurityMeter({ password }: { password: string }) {
  const { t } = useTranslation();
  const styles = useStyles();
  const isRTL = useIsRTL();

  const len = password.length;
  let level = 0;
  if (len >= MIN_PASSWORD) level = 2;
  else if (len > 0) level = 1;
  if (len >= 8 && /[0-9]/.test(password) && /[^0-9]/.test(password)) level = 3;

  return (
    <View style={styles.meterContainer}>
      <View style={[styles.meterTextRow, isRTL && styles.rowRTL]}>
        <AppText size="xs" color="#6B7280">
          {t('auth.passwordSecurity', { defaultValue: 'امنیت رمز عبور:' })}
        </AppText>
        <AppText size="xs" color={level >= 2 ? '#16A34A' : '#9CA3AF'}>
          {t('auth.minSixChars', { defaultValue: 'حداقل ۶ کاراکتر' })}
        </AppText>
      </View>
      <View style={styles.meterBarsRow}>
        <View style={[styles.meterBar, level >= 1 && (level === 1 ? styles.meterBarRed : styles.meterBarGreen)]} />
        <View style={[styles.meterBar, level >= 2 && styles.meterBarGreen]} />
        <View style={[styles.meterBar, level >= 3 && styles.meterBarGreen]} />
      </View>
    </View>
  );
}

function LimeButton({
  label,
  onPress,
  loading,
  disabled,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
}) {
  const isRTL = useIsRTL();
  const styles = useStyles();
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.limeButton,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.limeButtonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#0F1F05" size="small" />
      ) : (
        <View style={[styles.limeButtonContent, isRTL && styles.rowRTL]}>
          <AppText size="md" weight="bold" color="#0F1F05">
            {label}
          </AppText>
          <Icon name={isRTL ? 'arrow-back' : 'arrow-forward'} size={20} color="#0F1F05" />
        </View>
      )}
    </Pressable>
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

// ---------- Login Screen ----------

function LoginForm({
  onRegister,
  onReset,
  onOtpLogin,
}: {
  onRegister: () => void;
  onReset: () => void;
  onOtpLogin: () => void;
}) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const styles = useStyles();
  const isRTL = useIsRTL();
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
      <TopBar onBack={onRegister} badgeType="help" />

      <View style={styles.header}>
        <BrandIcon type="login" />
        <AppText size="xl" weight="bold" align="center" color="#111827">
          {t('auth.loginTitleMajhoul', { defaultValue: 'خوش‌آمدید به مجهول' })}
        </AppText>
        <AppText size="xs" color="#6B7280" align="center" style={styles.subtitle}>
          {t('auth.loginSubMajhoul', { defaultValue: 'برای دسترسی به سوابق حل مسئله و هوش مصنوعی، وارد شوید' })}
        </AppText>
      </View>

      <View style={styles.formCard}>
        <LabeledField
          label={t('auth.phoneLabel', { defaultValue: 'شماره موبایل' })}
          placeholder={t('auth.phoneSample', { defaultValue: '۰۹۱۲ ۳۴۵ ۶۷۸۹' })}
          icon="phone-iphone"
          prefix="۹۸+"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <LabeledField
          label={t('auth.passwordLabel', { defaultValue: 'رمز عبور' })}
          placeholder={t('auth.passwordPlaceholder', { defaultValue: 'رمز عبور حساب کاربری' })}
          icon="lock"
          secret
          value={password}
          onChangeText={setPassword}
          onSubmitEditing={submit}
          headerAction={
            <Pressable accessibilityRole="button" onPress={onReset} hitSlop={8}>
              <AppText size="xs" weight="medium" color="#4F46E5">
                {t('auth.forgotPasswordShort', { defaultValue: 'فراموش کردید؟' })}
              </AppText>
            </Pressable>
          }
        />

        <ErrorText text={error} />

        <LimeButton
          label={t('auth.loginButton', { defaultValue: 'ورود به حساب' })}
          onPress={submit}
          loading={loading}
          disabled={loading}
        />

        {/* Divider «یا» */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <AppText size="xs" color="#9CA3AF" style={styles.dividerText}>
            {t('auth.or', { defaultValue: 'یا' })}
          </AppText>
          <View style={styles.dividerLine} />
        </View>

        {/* OTP Fast Login */}
        <Pressable
          accessibilityRole="button"
          onPress={onOtpLogin}
          style={({ pressed }) => [styles.otpButton, pressed && styles.pressed, isRTL && styles.rowRTL]}
        >
          <Icon name="sms" size={18} color="#4F46E5" />
          <AppText size="xs" weight="bold" color="#374151">
            {t('auth.loginWithOtp', { defaultValue: 'ورود سریع با پیامک یک‌بار مصرف (OTP)' })}
          </AppText>
        </Pressable>
      </View>

      {/* Footer */}
      <View style={styles.footerSection}>
        <Pressable
          accessibilityRole="button"
          onPress={onRegister}
          style={[styles.footerLinkRow, isRTL && styles.rowRTL]}
        >
          <AppText size="xs" color="#6B7280">
            {t('auth.noAccountPrompt', { defaultValue: 'حساب کاربری ندارید؟' })}{' '}
          </AppText>
          <AppText size="xs" weight="bold" color="#4F46E5">
            {t('auth.freeSignUp', { defaultValue: 'ثبت‌نام رایگان' })}{' '}
            {isRTL ? '←' : '→'}
          </AppText>
        </Pressable>

        <AppText size="xs" color="#9CA3AF" align="center" style={styles.disclaimerText}>
          {t('auth.termsLoginNotice', { defaultValue: 'با ورود، شرایط و قوانین مجهول را می‌پذیرید.' })}
        </AppText>
      </View>
    </ScreenContainer>
  );
}

// ---------- Register Screen ----------

function RegisterForm({ onBack, onLoginClick }: { onBack: () => void; onLoginClick: () => void }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const styles = useStyles();
  const isRTL = useIsRTL();
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
      <TopBar onBack={onBack} badgeType="majhoul" />

      <View style={styles.header}>
        <BrandIcon type="register" />
        <AppText size="xl" weight="bold" align="center" color="#111827">
          {t('auth.registerTitleMajhoul', { defaultValue: 'ثبت‌نام در مجهول' })}
        </AppText>
        <AppText size="xs" color="#6B7280" align="center" style={styles.subtitle}>
          {t('auth.registerSubMajhoul', { defaultValue: 'یک حساب بساز تا تاریخچه حل‌ها، فرمول‌ها و درسنامه‌ها روی هر گوشی همراهت باشه' })}
        </AppText>
      </View>

      <View style={styles.formCard}>
        <LabeledField
          label={t('auth.nameLabel', { defaultValue: 'نام و نام خانوادگی' })}
          placeholder={t('auth.nameLabel', { defaultValue: 'نام و نام خانوادگی' })}
          icon="person"
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="words"
        />

        <LabeledField
          label={t('auth.phoneLabel', { defaultValue: 'شماره موبایل' })}
          placeholder={t('auth.phone', { defaultValue: 'شماره موبایل (۰۹…)' })}
          icon="phone-iphone"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <LabeledField
          label={t('auth.passwordLabel', { defaultValue: 'رمز عبور' })}
          placeholder={t('auth.password', { defaultValue: 'رمز عبور' })}
          icon="lock"
          secret
          value={password}
          onChangeText={setPassword}
        />

        <PasswordSecurityMeter password={password} />

        <LabeledField
          label={t('auth.confirmPassword', { defaultValue: 'تکرار رمز عبور' })}
          placeholder={t('auth.confirmPassword', { defaultValue: 'تکرار رمز عبور' })}
          icon="verified-user"
          secret
          value={confirm}
          onChangeText={setConfirm}
        />

        <ErrorText text={error} />

        <LimeButton
          label={t('auth.continueAndGetCode', { defaultValue: 'ادامه و دریافت کد' })}
          onPress={next}
          loading={loading}
          disabled={loading}
        />
      </View>

      {/* Footer */}
      <View style={styles.footerSection}>
        <Pressable
          accessibilityRole="button"
          onPress={onLoginClick}
          style={[styles.footerLinkRow, isRTL && styles.rowRTL]}
        >
          <AppText size="xs" color="#6B7280">
            {t('auth.haveAccountPrompt', { defaultValue: 'حساب داری؟' })}{' '}
          </AppText>
          <AppText size="xs" weight="bold" color="#16A34A">
            {t('auth.enterHere', { defaultValue: 'وارد شو' })}
          </AppText>
        </Pressable>

        <AppText size="xs" color="#9CA3AF" align="center" style={styles.disclaimerText}>
          {t('auth.termsRegisterNotice', { defaultValue: 'با ثبت‌نام، شرایط استفاده و قوانین حریم خصوصی مجهول را می‌پذیرید.' })}
        </AppText>
      </View>
    </ScreenContainer>
  );
}

// ---------- Quick OTP Login Screen ----------

function LoginOtpForm({ onBack, onRegister }: { onBack: () => void; onRegister: () => void }) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const styles = useStyles();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
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

  if (step === 'otp') {
    return (
      <OtpStep
        phone={phone.trim()}
        purpose="reset"
        onVerified={() => {
          onBack();
        }}
        onBack={() => setStep('phone')}
      />
    );
  }

  return (
    <ScreenContainer scroll>
      <TopBar onBack={onBack} badgeType="help" />
      <View style={styles.header}>
        <BrandIcon type="login" />
        <AppText size="xl" weight="bold" align="center" color="#111827">
          {t('auth.loginWithOtp', { defaultValue: 'ورود سریع با پیامک یک‌بار مصرف' })}
        </AppText>
        <AppText size="xs" color="#6B7280" align="center" style={styles.subtitle}>
          {t('auth.resetSub')}
        </AppText>
      </View>

      <View style={styles.formCard}>
        <LabeledField
          label={t('auth.phoneLabel', { defaultValue: 'شماره موبایل' })}
          placeholder={t('auth.phoneSample', { defaultValue: '۰۹۱۲ ۳۴۵ ۶۷۸۹' })}
          icon="phone-iphone"
          prefix="۹۸+"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <ErrorText text={error} />
        <LimeButton
          label={t('auth.sendCode')}
          onPress={sendCode}
          loading={loading}
          disabled={loading}
        />
      </View>
    </ScreenContainer>
  );
}

// ---------- SMS code (shared) ----------

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
  const inputRef = useRef<any>(null);
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
      <TopBar onBack={onBack} badgeType="help" />
      <View style={styles.header}>
        <View style={styles.brandIconWrapper}>
          <View style={styles.brandLogoBox}>
            <Icon name="verified-user" size={32} color="#FFFFFF" />
          </View>
        </View>
        <AppText size="xl" weight="bold" align="center" color="#111827">
          {t('auth.enterCode')}
        </AppText>
        <AppText size="xs" color="#6B7280" align="center" style={styles.subtitle}>
          {t('auth.codeSentTo', { phone })}
        </AppText>
      </View>

      <View style={styles.formCard}>
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
        <LimeButton label={t('auth.verifyCode')} onPress={() => verify()} loading={loading} disabled={loading} />
        <Pressable accessibilityRole="button" onPress={resend} hitSlop={8} style={styles.resendBtn}>
          <AppText size="xs" weight="medium" color="#4F46E5" align="center">
            {resending ? '…' : t('auth.resendCode')}
          </AppText>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

// ---------- Forgot Password Screen ----------

function ResetForm({ onBack }: { onBack: () => void }) {
  const colors = useColors();
  const styles = useStyles();
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
        <View style={styles.header}>
          <View style={styles.brandIconWrapper}>
            <View style={[styles.brandLogoBox, { backgroundColor: '#16A34A' }]}>
              <Icon name="check-circle" size={32} color="#FFFFFF" />
            </View>
          </View>
          <AppText size="xl" weight="bold" align="center" color="#111827">
            {t('auth.resetDoneTitle')}
          </AppText>
          <AppText size="xs" color="#6B7280" align="center" style={styles.subtitle}>
            {t('auth.resetDoneSub')}
          </AppText>
        </View>
        <LimeButton label={t('auth.backToLogin')} onPress={onBack} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <TopBar onBack={onBack} badgeType="help" />
      <View style={styles.header}>
        <View style={styles.brandIconWrapper}>
          <View style={styles.brandLogoBox}>
            <Icon name="lock-reset" size={32} color="#FFFFFF" />
          </View>
        </View>
        <AppText size="xl" weight="bold" align="center" color="#111827">
          {t('auth.resetTitle')}
        </AppText>
        <AppText size="xs" color="#6B7280" align="center" style={styles.subtitle}>
          {step === 'phone' ? t('auth.resetSub') : undefined}
        </AppText>
      </View>

      <View style={styles.formCard}>
        {step === 'phone' ? (
          <>
            <LabeledField
              label={t('auth.phoneLabel', { defaultValue: 'شماره موبایل' })}
              placeholder={t('auth.phone', { defaultValue: 'شماره موبایل (۰۹…)' })}
              icon="phone-iphone"
              prefix="۹۸+"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <ErrorText text={error} />
            <LimeButton label={t('auth.sendCode')} onPress={sendCode} loading={loading} disabled={loading} />
          </>
        ) : (
          <>
            <LabeledField
              label={t('auth.newPassword')}
              icon="lock"
              secret
              placeholder={t('auth.newPassword')}
              value={password}
              onChangeText={setPassword}
            />
            <LabeledField
              label={t('auth.confirmPassword')}
              icon="lock"
              secret
              placeholder={t('auth.confirmPassword')}
              value={confirm}
              onChangeText={setConfirm}
            />
            <ErrorText text={error} />
            <LimeButton label={t('auth.savePassword')} onPress={save} loading={loading} disabled={loading} />
          </>
        )}
      </View>
      <AppText size="xs" color={colors.textSecondary} align="center" style={styles.subtitle}>
        {t('auth.resetHint')}
      </AppText>
    </ScreenContainer>
  );
}

// ---------- Stylesheet ----------

const useStyles = makeStyles(colors =>
  StyleSheet.create({
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.sm,
      marginBottom: spacing.md,
      marginTop: spacing.xs,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
    },
    greenDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#16A34A',
    },
    header: {
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.lg,
    },
    brandIconWrapper: {
      width: 72,
      height: 72,
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    brandLogoBox: {
      width: 64,
      height: 64,
      borderRadius: 20,
      backgroundColor: '#4F46E5',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#4F46E5',
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 4,
    },
    registerIconBox: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#E8FADC',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#D2F4B8',
    },
    lightningBadge: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: '#76E000',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: '#FFFFFF',
      elevation: 3,
    },
    subtitle: {
      maxWidth: 290,
      lineHeight: 18,
    },
    formCard: {
      backgroundColor: '#FFFFFF',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: '#EEF0F4',
      padding: spacing.lg,
      gap: spacing.md,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    },
    labeledFieldContainer: {
      gap: 6,
    },
    fieldHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 2,
    },
    fieldBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minHeight: 52,
      paddingHorizontal: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
    },
    rowRTL: {
      flexDirection: 'row-reverse',
    },
    input: {
      flex: 1,
      fontFamily: fontFamily.fa.regular,
      fontSize: fontSize.sm,
      color: '#111827',
      textAlign: 'right',
      paddingVertical: 10,
    },
    prefixBox: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      backgroundColor: '#F3F4F6',
    },
    meterContainer: {
      gap: 4,
      marginTop: -2,
    },
    meterTextRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 2,
    },
    meterBarsRow: {
      flexDirection: 'row',
      gap: 6,
      height: 4,
    },
    meterBar: {
      flex: 1,
      borderRadius: 2,
      backgroundColor: '#E5E7EB',
    },
    meterBarGreen: {
      backgroundColor: '#16A34A',
    },
    meterBarRed: {
      backgroundColor: '#EF4444',
    },
    limeButton: {
      minHeight: 52,
      borderRadius: 16,
      backgroundColor: '#76E000',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#76E000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 3,
      marginTop: 2,
    },
    limeButtonPressed: {
      backgroundColor: '#68C700',
      opacity: 0.9,
    },
    limeButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    disabled: {
      opacity: 0.5,
    },
    pressed: {
      opacity: 0.7,
    },
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginVertical: spacing.xs,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: '#E5E7EB',
    },
    dividerText: {
      paddingHorizontal: 4,
    },
    otpButton: {
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    footerSection: {
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.xl,
      marginBottom: spacing.lg,
    },
    footerLinkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    disclaimerText: {
      lineHeight: 16,
    },
    resendBtn: {
      paddingVertical: spacing.xs,
    },
    otpRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.sm,
      direction: 'ltr',
      marginVertical: spacing.sm,
    },
    otpBox: {
      width: 52,
      height: 58,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: '#E5E7EB',
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    otpBoxFilled: {
      borderColor: '#4F46E5',
    },
    otpBoxActive: {
      borderColor: '#4F46E5',
      borderWidth: 2,
    },
    otpHiddenInput: {
      position: 'absolute',
      width: '100%',
      height: '100%',
      opacity: 0,
    },
  }),
);
