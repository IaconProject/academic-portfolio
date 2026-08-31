'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import { isSupabaseAuthConfigured } from '@/lib/supabase/config';
import {
  removeSessionItem,
  writeSessionItem,
} from '@/lib/admin-session-storage';

type LoginStep =
  | 'credentials'
  | 'challenge'
  | 'enrollment'
  | 'reset-request'
  | 'reset-verify'
  | 'complete';

type CharacterMode = 'idle' | 'pointer' | 'typing' | 'privacy' | 'success';

function friendlyAuthError(message?: string) {
  const value = (message || '').toLowerCase();
  if (value.includes('invalid login credentials')) {
    return 'E-posta adresi veya parola hatalı.';
  }
  if (value.includes('email not confirmed')) {
    return 'Supabase hesabının e-posta doğrulaması tamamlanmamış.';
  }
  if (value.includes('mfa') || value.includes('challenge')) {
    return 'Doğrulama kodu kabul edilmedi. Yeni kodla tekrar deneyin.';
  }
  return 'Giriş tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.';
}

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [activeField, setActiveField] = useState<'email' | 'password' | null>(
    null
  );

  const completeLogin = useCallback(async () => {
    setIsBusy(true);
    setError('');
    try {
      const response = await fetch('/api/blog/auth/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true) {
        throw new Error(
          payload?.error?.message || 'Blog yönetici yetkisi doğrulanamadı.'
        );
      }

      // Only a non-sensitive UI marker is persisted. The compatibility token
      // remains in an HttpOnly cookie and cannot be read by JavaScript.
      writeSessionItem('academic_admin_auth', 'true');
      removeSessionItem('admin_token');
      setStep('complete');
      router.replace('/admin?tab=articles');
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'Yönetici oturumu açılamadı.'
      );
    } finally {
      setIsBusy(false);
    }
  }, [router]);

  const prepareSecondFactor = useCallback(async () => {
    if (!supabase) return;
    setIsBusy(true);
    setError('');
    try {
      const assurance =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (assurance.error) throw assurance.error;

      if (assurance.data.currentLevel === 'aal2') {
        await completeLogin();
        return;
      }

      const factors = await supabase.auth.mfa.listFactors();
      if (factors.error) throw factors.error;
      const verifiedFactor = factors.data.totp.find(
        (factor) => factor.status === 'verified'
      );

      if (verifiedFactor) {
        setFactorId(verifiedFactor.id);
        setCode('');
        setStep('challenge');
        return;
      }

      // Remove abandoned enrollment attempts before starting a fresh setup.
      for (const pendingFactor of factors.data.totp.filter(
        (factor) => factor.status !== 'verified'
      )) {
        await supabase.auth.mfa.unenroll({ factorId: pendingFactor.id });
      }

      const enrollment = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Muhammed Akan Blog CMS',
      });
      if (enrollment.error) throw enrollment.error;

      setFactorId(enrollment.data.id);
      setQrCode(enrollment.data.totp.qr_code);
      setSecret(enrollment.data.totp.secret);
      setCode('');
      setStep('enrollment');
    } catch (mfaError) {
      setError(
        friendlyAuthError(
          mfaError instanceof Error ? mfaError.message : undefined
        )
      );
    } finally {
      setIsBusy(false);
    }
  }, [completeLogin, supabase]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    void supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .then(({ data }) => {
        if (!active) return;
        if (data?.currentLevel === 'aal2') void completeLogin();
        else if (data?.currentLevel === 'aal1') void prepareSecondFactor();
      });

    return () => {
      active = false;
    };
  }, [completeLogin, prepareSecondFactor, supabase]);

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setError('');
    setNotice('');
    try {
      let supabaseError: Error | null = null;
      if (supabase) {
        const result = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (!result.error) {
          await prepareSecondFactor();
          return;
        }
        supabaseError = result.error;
      }

      // Geçiş döneminde mevcut portfolyo yöneticisi hesabını korur. Bu yol
      // yalnızca server-side ALLOW_LEGACY_ADMIN_LOGIN=true iken açıktır.
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true) {
        if (response.status === 410 && supabaseError) throw supabaseError;
        throw new Error(
          typeof payload?.error === 'string'
            ? payload.error
            : friendlyAuthError(supabaseError?.message)
        );
      }

      // Legacy token yalnız HttpOnly cookie'de kalır; tarayıcı depolamasına
      // taşınmaz. Marker yalnız eski panelin görsel oturum durumudur.
      writeSessionItem('academic_admin_auth', 'true');
      removeSessionItem('admin_token');
      setStep('complete');
      router.replace('/admin?tab=articles');
      router.refresh();
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : 'Giriş tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.'
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_otp',
          email: resetEmail.trim(),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || 'Doğrulama kodu gönderilemedi.');
      }
      setNotice(payload.message || 'Doğrulama kodu e-posta adresinize gönderildi.');
      setResetCode('');
      setStep('reset-verify');
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : 'Doğrulama kodu gönderilemedi.'
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function completePasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword.length < 8) {
      setError('Yeni parola en az 8 karakter olmalıdır.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Yeni parolalar birbiriyle eşleşmiyor.');
      return;
    }
    if (!/^\d{6}$/.test(resetCode)) {
      setError('E-postadaki 6 haneli doğrulama kodunu girin.');
      return;
    }

    setIsBusy(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_and_reset',
          email: resetEmail.trim(),
          otpCode: resetCode,
          newPassword,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || 'Parola güncellenemedi.');
      }
      setEmail(resetEmail.trim());
      setPassword('');
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('credentials');
      setNotice(
        payload.message || 'Parolanız güncellendi. Yeni parolanızla giriş yapabilirsiniz.'
      );
    } catch (resetError) {
      setError(
        resetError instanceof Error
          ? resetError.message
          : 'Parola güncellenemedi.'
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function verifySecondFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !factorId || !/^\d{6}$/.test(code)) {
      setError('Authenticator uygulamasındaki 6 haneli kodu girin.');
      return;
    }

    setIsBusy(true);
    setError('');
    try {
      const result = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code,
      });
      if (result.error) throw result.error;
      await completeLogin();
    } catch (verifyError) {
      setCode('');
      setError(
        friendlyAuthError(
          verifyError instanceof Error ? verifyError.message : undefined
        )
      );
    } finally {
      setIsBusy(false);
    }
  }

  async function startOver() {
    if (supabase) await supabase.auth.signOut({ scope: 'local' });
    setStep('credentials');
    setPassword('');
    setCode('');
    setFactorId('');
    setQrCode('');
    setSecret('');
    setError('');
    setNotice('');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
  }

  async function copySecret() {
    if (!secret || !navigator.clipboard) return;
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const characterMode: CharacterMode =
    step === 'complete'
      ? 'success'
      : step !== 'credentials'
        ? 'idle'
        : activeField === 'password'
          ? 'privacy'
          : activeField === 'email'
            ? 'typing'
            : 'pointer';

  const heading =
    step === 'credentials'
      ? 'Hoş geldin'
      : step === 'challenge'
        ? 'Kodu doğrula'
        : step === 'enrollment'
          ? 'Authenticator kurulumu'
          : step === 'reset-request'
            ? 'Parolanı yenile'
            : step === 'reset-verify'
              ? 'Yeni parolanı belirle'
              : 'Giriş tamamlandı';

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#fff7df] p-4 text-[#27333b] sm:p-6 lg:p-10">
      <div className="pointer-events-none absolute -left-24 top-10 h-64 w-64 rounded-full bg-[#ffdd71]/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-[#b9ead5]/45 blur-3xl" />
      <Link
        href="/"
        className="absolute left-5 top-5 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-2 text-xs font-bold text-[#73550e] shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white sm:left-8 sm:top-8"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Siteye dön
      </Link>
      <div className="relative flex w-full max-w-md flex-col items-center">
        <section className="relative z-10 -mb-4 flex items-end justify-center overflow-hidden" aria-hidden="true">
          <CharacterFrames mode={characterMode} emailLength={email.length} />
        </section>

        <section className="relative z-20 w-full overflow-hidden rounded-[2.25rem] border border-[#ead9ad] bg-white p-6 shadow-[0_30px_90px_rgba(72,53,20,0.18)] sm:p-10">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-black tracking-[-0.045em] text-[#27333b] sm:text-[1.75rem]">
                {heading}
              </h1>
              {step === 'credentials' ? (
                <p className="mt-1.5 text-sm leading-6 text-[#66737b]">
                  Devam etmek için giriş yap.
                </p>
              ) : null}
            </div>

            {!isSupabaseAuthConfigured ? (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                Supabase Auth henüz yapılandırılmamış. Ortam değişkenlerine
                proje URL&apos;sini ve publishable key&apos;i ekleyin.
              </div>
            ) : null}

            {error ? (
              <div
                role="alert"
                className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
              >
                {error}
              </div>
            ) : null}

            {notice ? (
              <div
                role="status"
                className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                {notice}
              </div>
            ) : null}

            {step === 'credentials' ? (
              <form onSubmit={submitCredentials} className="space-y-5">
                <label className="block space-y-2">
                  <span className="text-sm font-bold">E-posta adresi</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      autoComplete="username"
                      required
                      value={email}
                      onFocus={() => setActiveField('email')}
                      onBlur={() => setActiveField(null)}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-14 w-full rounded-[1.1rem] border border-[#e7ddc7] bg-[#fffdf7] px-12 py-3.5 text-[#27333b] outline-none transition placeholder:text-[#a9a196] focus:border-[#edb52c] focus:ring-4 focus:ring-[#f7d66c]/35"
                      placeholder="bilgi@muhammedakan.com"
                    />
                  </span>
                </label>

                <label className="block space-y-2">
                  <span className="flex items-center justify-between gap-3 text-sm font-bold">
                    <span>Parola</span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        setResetEmail(email.trim());
                        setError('');
                        setNotice('');
                        setStep('reset-request');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 transition hover:text-amber-900 hover:underline dark:text-amber-400 dark:hover:text-amber-300"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                      Şifremi unuttum
                    </button>
                  </span>
                  <span className="relative block">
                    <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onFocus={() => setActiveField('password')}
                      onBlur={() => setActiveField(null)}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-14 w-full rounded-[1.1rem] border border-[#e7ddc7] bg-[#fffdf7] px-12 py-3.5 pr-14 text-[#27333b] outline-none transition placeholder:text-[#a9a196] focus:border-[#edb52c] focus:ring-4 focus:ring-[#f7d66c]/35"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-800 dark:hover:bg-stone-800 dark:hover:text-white"
                      aria-label={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-[1.1rem] bg-[#27333b] px-5 text-sm font-extrabold text-white shadow-[0_12px_24px_rgba(39,51,59,0.18)] transition hover:-translate-y-0.5 hover:bg-[#3a4b55] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ArrowRight className="h-5 w-5" />
                  )}
                  Güvenli giriş yap
                </button>
              </form>
            ) : null}

            {step === 'reset-request' ? (
              <form onSubmit={requestPasswordReset} className="space-y-5">
                <p className="text-sm leading-6 text-stone-600 dark:text-stone-300">
                  Kayıtlı yönetici e-posta adresinize 10 dakika geçerli,
                  6 haneli bir doğrulama kodu göndereceğiz.
                </p>
                <label className="block space-y-2">
                  <span className="text-sm font-bold">Yönetici e-postası</span>
                  <span className="relative block">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={resetEmail}
                      onChange={(event) => setResetEmail(event.target.value)}
                      className="w-full rounded-2xl border border-stone-300 bg-white px-12 py-3.5 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-stone-700 dark:bg-stone-900"
                      placeholder="bilgi@muhammedakan.com"
                    />
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
                >
                  {isBusy ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Mail className="h-5 w-5" />
                  )}
                  Doğrulama kodu gönder
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setNotice('');
                    setStep('credentials');
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-300 px-4 py-3 text-sm font-bold text-stone-600 transition hover:bg-stone-100 hover:text-stone-950 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-900 dark:hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Giriş ekranına dön
                </button>
              </form>
            ) : null}

            {step === 'reset-verify' ? (
              <form onSubmit={completePasswordReset} className="space-y-4">
                <p className="text-sm leading-6 text-stone-600 dark:text-stone-300">
                  <strong>{resetEmail}</strong> adresine gönderilen kodu ve yeni
                  parolanızı girin.
                </p>
                <label className="block space-y-2">
                  <span className="text-sm font-bold">6 haneli kod</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={resetCode}
                    onChange={(event) =>
                      setResetCode(
                        event.target.value.replace(/\D/g, '').slice(0, 6)
                      )
                    }
                    className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 text-center font-mono text-2xl font-black tracking-[0.3em] outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-stone-700 dark:bg-stone-900"
                    aria-label="E-posta doğrulama kodu"
                    placeholder="000000"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-bold">Yeni parola</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-stone-700 dark:bg-stone-900"
                    placeholder="En az 8 karakter"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm font-bold">Yeni parola tekrar</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-3.5 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-stone-700 dark:bg-stone-900"
                    placeholder="Yeni parolayı tekrar girin"
                  />
                </label>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
                >
                  {isBusy ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-5 w-5" />
                  )}
                  Parolayı güvenle güncelle
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setNotice('');
                    setStep('reset-request');
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-300 px-4 py-3 text-sm font-bold text-stone-600 transition hover:bg-stone-100 hover:text-stone-950 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-900 dark:hover:text-white"
                >
                  <RefreshCw className="h-4 w-4" />
                  Yeni kod iste
                </button>
              </form>
            ) : null}

            {step === 'enrollment' ? (
              <div className="space-y-5">
                <p className="text-sm leading-6 text-stone-600 dark:text-stone-300">
                  Authenticator uygulamanızla QR kodu tarayın. Ardından oluşan
                  6 haneli kodu aşağıya girerek MFA&apos;yı etkinleştirin.
                </p>
                {qrCode ? (
                  <div className="mx-auto w-fit rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
                    <Image
                      src={qrCode}
                      alt="TOTP authenticator kurulum QR kodu"
                      width={220}
                      height={220}
                      unoptimized
                      className="h-[220px] w-[220px]"
                    />
                  </div>
                ) : null}
                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 dark:border-stone-800 dark:bg-stone-900">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                    Elle kurulum anahtarı
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <code className="min-w-0 flex-1 break-all text-xs font-bold text-stone-800 dark:text-stone-200">
                      {secret}
                    </code>
                    <button
                      type="button"
                      onClick={copySecret}
                      className="rounded-xl border border-stone-200 bg-white p-2 text-stone-500 transition hover:text-stone-950 dark:border-stone-700 dark:bg-stone-800 dark:hover:text-white"
                      aria-label="Kurulum anahtarını kopyala"
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <MfaCodeForm
                  code={code}
                  setCode={setCode}
                  isBusy={isBusy}
                  onSubmit={verifySecondFactor}
                  buttonLabel="MFA'yı etkinleştir"
                />
              </div>
            ) : null}

            {step === 'challenge' ? (
              <div className="space-y-5">
                <p className="text-sm leading-6 text-stone-600 dark:text-stone-300">
                  Authenticator uygulamanızdaki güncel 6 haneli kodu girin.
                  Kodlar yaklaşık 30 saniyede bir yenilenir.
                </p>
                <MfaCodeForm
                  code={code}
                  setCode={setCode}
                  isBusy={isBusy}
                  onSubmit={verifySecondFactor}
                  buttonLabel="Kodu doğrula"
                />
                <button
                  type="button"
                  onClick={startOver}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-stone-300 px-4 py-3 text-sm font-bold text-stone-600 transition hover:bg-stone-100 hover:text-stone-950 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-900 dark:hover:text-white"
                >
                  <RefreshCw className="h-4 w-4" />
                  Farklı hesapla başla
                </button>
              </div>
            ) : null}

            {step === 'complete' ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm font-semibold text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6" />
                  Yönetim paneli açılıyor…
                </div>
              </div>
            ) : null}

          </div>
        </section>
      </div>
    </main>
  );
}

const FRAME_W = 270;
const FRAME_H = 480;
const COLS = 6;
const FRAMES_PER_SHEET = 60;
const TOTAL_FRAMES = 240;

// Continuous frame sequences (0-indexed)
// Raising hands to cover eyes: frames 153 to 180 (28 consecutive frames)
const RAISE_FRAMES = Array.from({ length: 28 }, (_, i) => 152 + i);
// Lowering hands from eyes: frames 205 to 217 (13 consecutive frames)
const LOWER_FRAMES = Array.from({ length: 13 }, (_, i) => 204 + i);

function calculateGazeFrame(dx: number, dy: number): number {
  const dist = Math.hypot(dx, dy);
  if (dist < 0.14) {
    return 49; // Neutral Center (frame 50)
  }

  // Mid-level horizontal gaze (-0.35 <= dy <= 0.35)
  if (Math.abs(dy) <= 0.35) {
    if (dx > 0.15) {
      const t = Math.min(Math.max((dx - 0.15) / 0.75, 0), 1);
      return Math.round(30 + t * 10); // Frames 31..40 (Center to Right)
    } else if (dx < -0.15) {
      const t = Math.min(Math.max((-dx - 0.15) / 0.75, 0), 1);
      return Math.round(9 + t * 11); // Frames 10..20 (Center to Left)
    }
  }

  // Upward gaze (dy < -0.2)
  if (dy < -0.2) {
    const tY = Math.min(Math.max((-dy - 0.2) / 0.75, 0), 1);
    if (dx > 0.1) {
      return Math.round(53 + tY * 17); // Frames 54..70 (Up-Right)
    } else if (dx < -0.1) {
      return Math.round(86 + tY * 18); // Frames 87..104 (Up-Left)
    } else {
      return Math.round(88 + tY * 4); // Frames 89..92 (Up-Center)
    }
  }

  // Downward gaze (dy > 0.15)
  if (dy > 0.15) {
    const tY = Math.min(Math.max((dy - 0.15) / 0.75, 0), 1);
    if (dx < -0.1) {
      return Math.round(135 + tY * 9); // Frames 136..144 (Down-Left)
    } else if (dx > 0.1) {
      return Math.round(214 + tY * 5); // Frames 215..219 (Down-Right)
    } else {
      return Math.round(145 + tY * 6); // Frames 146..151 (Down-Center)
    }
  }

  return 49;
}

function CharacterFrames({
  mode,
  emailLength,
}: {
  mode: CharacterMode;
  emailLength: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const characterRef = useRef<HTMLDivElement>(null);
  const sheetsRef = useRef<HTMLImageElement[]>([]);
  const lastDrawnFrameRef = useRef<number>(-1);

  const targetPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const smoothPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const smoothTypingRef = useRef<number>(0);

  const animStateRef = useRef<{
    mode: CharacterMode;
    privacyPhase: 'none' | 'raising' | 'covered' | 'lowering';
    privacyStart: number;
    emailLength: number;
    targetFrame: number;
  }>({
    mode,
    privacyPhase: mode === 'privacy' ? 'covered' : 'none',
    privacyStart: 0,
    emailLength,
    targetFrame: mode === 'privacy' ? 179 : 49,
  });

  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const f = Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(frameIndex)));
    const sheetIdx = Math.floor(f / FRAMES_PER_SHEET);
    const localIdx = f % FRAMES_PER_SHEET;
    const col = localIdx % COLS;
    const row = Math.floor(localIdx / COLS);

    const sheet = sheetsRef.current[sheetIdx];
    if (sheet && sheet.complete && sheet.naturalWidth > 0) {
      ctx.clearRect(0, 0, FRAME_W, FRAME_H);
      ctx.drawImage(
        sheet,
        col * FRAME_W,
        row * FRAME_H,
        FRAME_W,
        FRAME_H,
        0,
        0,
        FRAME_W,
        FRAME_H
      );
      lastDrawnFrameRef.current = f;
    }
  }, []);

  // Preload all 4 sprite sheets
  useEffect(() => {
    const sheets: HTMLImageElement[] = [];
    for (let i = 0; i < 4; i++) {
      const img = new window.Image();
      img.src = `/media/character/sheet_${i}.webp`;
      img.onload = () => {
        if (i === 0 || i === 2) {
          drawFrame(animStateRef.current.targetFrame);
        }
      };
      sheets.push(img);
    }
    sheetsRef.current = sheets;
  }, [drawFrame]);

  // Synchronize state when mode or emailLength changes
  useEffect(() => {
    const state = animStateRef.current;
    const prevMode = state.mode;
    state.mode = mode;
    state.emailLength = emailLength;

    if (mode === 'privacy') {
      if (
        prevMode !== 'privacy' &&
        state.privacyPhase !== 'raising' &&
        state.privacyPhase !== 'covered'
      ) {
        state.privacyPhase = 'raising';
        state.privacyStart = performance.now();
      }
    } else {
      if (
        prevMode === 'privacy' ||
        state.privacyPhase === 'covered' ||
        state.privacyPhase === 'raising'
      ) {
        state.privacyPhase = 'lowering';
        state.privacyStart = performance.now();
      }
    }
  }, [mode, emailLength]);

  // Master 60fps render and physics animation loop
  useEffect(() => {
    let rafId = 0;

    const tick = (now: number) => {
      const state = animStateRef.current;
      let frameToDraw = state.targetFrame;

      // Smooth pointer position lerp (spring effect)
      smoothPointerRef.current.x +=
        (targetPointerRef.current.x - smoothPointerRef.current.x) * 0.18;
      smoothPointerRef.current.y +=
        (targetPointerRef.current.y - smoothPointerRef.current.y) * 0.18;

      if (state.privacyPhase === 'raising') {
        const elapsed = now - state.privacyStart;
        const frameIdx = Math.floor(elapsed / 30); // ~33fps playback
        if (frameIdx >= RAISE_FRAMES.length - 1) {
          state.privacyPhase = 'covered';
          frameToDraw = 179; // Frame 180 (Hands holding eyes covered)
        } else {
          frameToDraw = RAISE_FRAMES[frameIdx];
        }
      } else if (state.privacyPhase === 'covered') {
        frameToDraw = 179; // Frame 180 (Hold eyes covered)
      } else if (state.privacyPhase === 'lowering') {
        const elapsed = now - state.privacyStart;
        const frameIdx = Math.floor(elapsed / 30); // ~33fps playback
        if (frameIdx >= LOWER_FRAMES.length - 1) {
          state.privacyPhase = 'none';
          frameToDraw = 49;
        } else {
          frameToDraw = LOWER_FRAMES[frameIdx];
        }
      } else {
        // Normal interactive modes (privacyPhase === 'none')
        if (state.mode === 'typing') {
          const targetP = Math.min(state.emailLength, 30) / 30;
          smoothTypingRef.current +=
            (targetP - smoothTypingRef.current) * 0.2;
          const p = smoothTypingRef.current;

          if (p < 0.4) {
            const t = p / 0.4;
            frameToDraw = Math.round(138 + t * 6); // Down-Left
          } else if (p < 0.7) {
            const t = (p - 0.4) / 0.3;
            frameToDraw = Math.round(146 + t * 5); // Down-Center
          } else {
            const t = (p - 0.7) / 0.3;
            frameToDraw = Math.round(215 + t * 4); // Down-Right
          }

          const character = characterRef.current;
          if (character) {
            const offsetX = (p - 0.5) * 16;
            character.style.transform = `translate3d(${offsetX}px, 6px, 0) rotate(${(p - 0.5) * 2}deg)`;
          }
        } else if (state.mode === 'success') {
          frameToDraw = 234; // Frame 235: Happy celebration
          const character = characterRef.current;
          if (character) {
            character.style.transform = `translate3d(0, 0, 0) scale(1.04)`;
          }
        } else if (state.mode === 'idle') {
          frameToDraw = 49; // Frame 50: Neutral forward
          const character = characterRef.current;
          if (character) {
            character.style.transform = `translate3d(0, 0, 0)`;
          }
        } else {
          // Pointer tracking mode
          const { x: sx, y: sy } = smoothPointerRef.current;
          frameToDraw = calculateGazeFrame(sx, sy);

          const character = characterRef.current;
          if (character) {
            character.style.transform = `translate3d(${sx * 12}px, ${sy * 10}px, 0) rotate(${sx * 1.8}deg)`;
          }
        }
      }

      state.targetFrame = frameToDraw;
      if (lastDrawnFrameRef.current !== frameToDraw) {
        drawFrame(frameToDraw);
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [drawFrame]);

  // Pointer listener for eye tracking and 3D parallax
  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const state = animStateRef.current;
      if (state.privacyPhase !== 'none' || state.mode !== 'pointer') return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const charCenterX = rect.left + rect.width / 2;
      const charEyesY = rect.top + rect.height * 0.35;

      const halfW = Math.max(window.innerWidth * 0.4, 200);
      const halfH = Math.max(window.innerHeight * 0.4, 200);

      const dx = Math.max(-1, Math.min(1, (event.clientX - charCenterX) / halfW));
      const dy = Math.max(-1, Math.min(1, (event.clientY - charEyesY) / halfH));

      targetPointerRef.current = { x: dx, y: dy };
    };

    window.addEventListener('pointermove', handlePointerMove, {
      passive: true,
    });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  return (
    <div
      ref={characterRef}
      className="will-change-transform"
      style={{ transition: 'transform 0.08s ease-out' }}
    >
      <canvas
        ref={canvasRef}
        width={FRAME_W}
        height={FRAME_H}
        className="h-[14rem] w-auto max-w-none sm:h-[17rem] lg:h-[20rem]"
      />
    </div>
  );
}


function MfaCodeForm({
  code,
  setCode,
  isBusy,
  onSubmit,
  buttonLabel,
}: {
  code: string;
  setCode: (value: string) => void;
  isBusy: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  buttonLabel: string;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block space-y-2">
        <span className="text-sm font-bold">Tek kullanımlık kod</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, '').slice(0, 6))
          }
          className="w-full rounded-2xl border border-stone-300 bg-white px-4 py-4 text-center font-mono text-3xl font-black tracking-[0.34em] outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:border-stone-700 dark:bg-stone-900"
          aria-label="Altı haneli doğrulama kodu"
          placeholder="000000"
        />
      </label>
      <button
        type="submit"
        disabled={isBusy || code.length !== 6}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
      >
        {isBusy ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <ShieldCheck className="h-5 w-5" />
        )}
        {buttonLabel}
      </button>
    </form>
  );
}
