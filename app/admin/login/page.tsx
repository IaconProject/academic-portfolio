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
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
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

type CharacterMode = 'idle' | 'pointer' | 'typing' | 'privacy' | 'peeking';

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
      setNotice(
        payload.message || 'Doğrulama kodu e-posta adresinize gönderildi.'
      );
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
        payload.message ||
          'Parolanız güncellendi. Yeni parolanızla giriş yapabilirsiniz.'
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
    step !== 'credentials'
      ? 'idle'
      : activeField === 'password'
        ? showPassword
          ? 'peeking'
          : 'privacy'
        : activeField === 'email'
          ? 'typing'
          : 'pointer';

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-[#FAF7F0] p-4 text-[#2D2A26] sm:p-6 md:p-8">
      {/* Background Ambient Elements */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-[#FFE58F]/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-[#B7EB8F]/30 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-[#FFD591]/25 blur-3xl" />

      {/* Top Siteye Dön Button */}
      <div className="absolute left-4 top-4 z-20 sm:left-8 sm:top-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-full border border-stone-200/80 bg-white/80 px-4 py-2 text-xs font-bold text-stone-700 shadow-sm backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-stone-950 hover:shadow-md"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>Siteye Dön</span>
        </Link>
      </div>

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-[420px] pt-4">
        <div className="overflow-hidden rounded-[2.25rem] border border-[#EBE4D5] bg-white shadow-[0_24px_70px_rgba(65,48,20,0.09)]">
          {/* Top Character Stage */}
          <div className="relative flex flex-col items-center justify-end overflow-hidden border-b border-[#F2ECE0] bg-white pt-6 pb-2">
            <InteractiveMinion
              mode={characterMode}
              emailLength={email.length}
            />
            {/* Ground Shadow for Real Physics */}
            <div className="mt-[-8px] h-3 w-32 rounded-[50%] bg-stone-900/[0.07] blur-[3px]" />
          </div>

          {/* Form Content Area */}
          <div className="px-6 py-7 sm:px-8">
            {/* Title & Badge */}
            <div className="mb-6 text-center">
              <div className="mx-auto mb-2 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
                <Sparkles className="h-3 w-3 text-amber-500" />
                <span>Yönetici Paneli</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-[#2D2A26] sm:text-[1.65rem]">
                {step === 'credentials' && 'Hoş Geldiniz'}
                {step === 'challenge' && 'Kodu Doğrula'}
                {step === 'enrollment' && 'İki Aşamalı Güvenlik'}
                {step === 'reset-request' && 'Parolayı Sıfırla'}
                {step === 'reset-verify' && 'Yeni Parola Belirle'}
                {step === 'complete' && 'Giriş Başarılı'}
              </h1>
              <p className="mt-1 text-xs font-medium text-stone-500">
                {step === 'credentials' && 'Devam etmek için oturum açın.'}
                {step === 'challenge' && 'Authenticator uygulamanızdaki 6 haneli kodu girin.'}
                {step === 'enrollment' && 'QR kodu tarayarak MFA kurulumunu tamamlayın.'}
                {step === 'reset-request' && 'E-posta adresinize doğrulama kodu göndereceğiz.'}
                {step === 'reset-verify' && 'E-postanıza gelen kodu ve yeni parolanızı girin.'}
                {step === 'complete' && 'Yönetim paneline yönlendiriliyorsunuz...'}
              </p>
            </div>

            {!isSupabaseAuthConfigured && (
              <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs font-medium leading-5 text-amber-900">
                Supabase Auth henüz yapılandırılmamış. Ortam değişkenlerini kontrol edin.
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold leading-5 text-red-800"
              >
                {error}
              </div>
            )}

            {notice && (
              <div
                role="status"
                className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold leading-5 text-emerald-800"
              >
                {notice}
              </div>
            )}

            {/* STEP: CREDENTIALS */}
            {step === 'credentials' && (
              <form onSubmit={submitCredentials} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700">
                    E-posta adresi
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      autoComplete="username"
                      required
                      value={email}
                      onFocus={() => setActiveField('email')}
                      onBlur={() => setActiveField(null)}
                      onChange={(event) => setEmail(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-10 text-sm font-medium text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/20"
                      placeholder="admin@muhammedakan.com"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-700">
                      Parola
                    </label>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        setResetEmail(email.trim());
                        setError('');
                        setNotice('');
                        setStep('reset-request');
                      }}
                      className="text-xs font-semibold text-amber-700 transition hover:text-amber-900 hover:underline"
                    >
                      Şifremi unuttum
                    </button>
                  </div>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onFocus={() => setActiveField('password')}
                      onBlur={() => setActiveField(null)}
                      onChange={(event) => setPassword(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50/50 pl-10 pr-11 text-sm font-medium text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/20"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
                      aria-label={showPassword ? 'Parolayı gizle' : 'Parolayı göster'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2D2A26] text-sm font-bold text-white shadow-[0_8px_20px_rgba(45,42,38,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#3F3B36] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>Giriş Yap</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STEP: PASSWORD RESET REQUEST */}
            {step === 'reset-request' && (
              <form onSubmit={requestPasswordReset} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-700">
                    Kayıtlı E-posta
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={resetEmail}
                      onChange={(event) => setResetEmail(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-stone-200 bg-stone-50/50 px-10 text-sm font-medium text-stone-900 outline-none transition-all placeholder:text-stone-400 focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-400/20"
                      placeholder="admin@muhammedakan.com"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2D2A26] text-sm font-bold text-white shadow-md transition-all hover:bg-[#3F3B36] disabled:opacity-60"
                >
                  {isBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Mail className="h-4 w-4" />
                      <span>Kod Gönder</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setNotice('');
                    setStep('credentials');
                  }}
                  className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-stone-200 text-xs font-bold text-stone-600 transition hover:bg-stone-50 hover:text-stone-900"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Giriş ekranına dön</span>
                </button>
              </form>
            )}

            {/* STEP: PASSWORD RESET VERIFY */}
            {step === 'reset-verify' && (
              <form onSubmit={completePasswordReset} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">
                    6 Haneli Kod
                  </label>
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
                    className="h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-center font-mono text-xl font-black tracking-[0.25em] text-stone-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
                    placeholder="000000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">
                    Yeni Parola
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
                    placeholder="En az 8 karakter"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">
                    Yeni Parola Tekrar
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="h-11 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
                    placeholder="Yeni parolayı tekrar girin"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2D2A26] text-sm font-bold text-white shadow-md transition-all hover:bg-[#3F3B36] disabled:opacity-60"
                >
                  {isBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span>Parolayı Güncelle</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setNotice('');
                    setStep('reset-request');
                  }}
                  className="flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl border border-stone-200 text-xs font-bold text-stone-600 transition hover:bg-stone-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Yeni kod iste</span>
                </button>
              </form>
            )}

            {/* STEP: ENROLLMENT (QR CODE) */}
            {step === 'enrollment' && (
              <div className="space-y-4">
                {qrCode && (
                  <div className="mx-auto flex w-fit justify-center rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
                    <Image
                      src={qrCode}
                      alt="TOTP QR Kodu"
                      width={180}
                      height={180}
                      unoptimized
                      className="h-[180px] w-[180px]"
                    />
                  </div>
                )}
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                    Kurulum Anahtarı
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <code className="min-w-0 flex-1 break-all text-xs font-bold text-stone-800">
                      {secret}
                    </code>
                    <button
                      type="button"
                      onClick={copySecret}
                      className="rounded-lg border border-stone-200 bg-white p-1.5 text-stone-600 transition hover:text-stone-900"
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
                  buttonLabel="MFA'yı Etkinleştir"
                />
              </div>
            )}

            {/* STEP: CHALLENGE (MFA TOTP) */}
            {step === 'challenge' && (
              <div className="space-y-4">
                <MfaCodeForm
                  code={code}
                  setCode={setCode}
                  isBusy={isBusy}
                  onSubmit={verifySecondFactor}
                  buttonLabel="Kodu Doğrula"
                />
                <button
                  type="button"
                  onClick={startOver}
                  className="flex h-10 w-full items-center justify-center gap-1.5 rounded-2xl border border-stone-200 text-xs font-bold text-stone-600 transition hover:bg-stone-50"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Farklı hesapla başla</span>
                </button>
              </div>
            )}

            {/* STEP: COMPLETE */}
            {step === 'complete' && (
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <span>Yönetim paneli açılıyor…</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * Calculates target timestamp based on state & interaction
 */
function getTargetTimestamp(
  mode: CharacterMode,
  emailLength: number,
  pointerX: number
): number {
  if (mode === 'privacy') {
    // Hands covering eyes
    return 8.2;
  }
  if (mode === 'peeking') {
    // Hands peeking through fingers
    return 9.4;
  }
  if (mode === 'typing') {
    // Smooth left-to-right eye tracking when typing email
    // Range: t=3.6s (looking left-down) to t=4.8s (looking right-down)
    const progress = Math.min(emailLength / 26, 1);
    return 3.6 + progress * 1.2;
  }
  if (mode === 'pointer') {
    // Screen cursor tracking:
    // Left edge (pointerX=0): t=2.0s
    // Center (pointerX=0.5): t=6.0s (direct eye contact)
    // Right edge (pointerX=1): t=4.5s
    const clampedX = Math.min(Math.max(pointerX, 0), 1);
    if (clampedX < 0.5) {
      const norm = clampedX / 0.5; // 0 to 1
      return 2.0 + norm * (6.0 - 2.0);
    } else {
      const norm = (clampedX - 0.5) / 0.5; // 0 to 1
      return 6.0 + norm * (4.5 - 6.0);
    }
  }
  return 6.0;
}

/**
 * Interactive Minion Character Component with butter-smooth RAF interpolation
 */
function InteractiveMinion({
  mode,
  emailLength,
}: {
  mode: CharacterMode;
  emailLength: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State refs for buttery 60fps RAF loop
  const pointerPosRef = useRef<{ x: number; y: number }>({ x: 0.5, y: 0.5 });
  const currentSeekRef = useRef<number>(6.0);
  const currentTransformRef = useRef<{ x: number; y: number; rotate: number }>({
    x: 0,
    y: 0,
    rotate: 0,
  });

  // Track global pointermove
  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      pointerPosRef.current = {
        x: event.clientX / window.innerWidth,
        y: event.clientY / window.innerHeight,
      };
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', onPointerMove);
  }, []);

  // Continuous RAF interpolation loop
  useEffect(() => {
    let animFrameId: number;

    const tick = () => {
      const video = videoRef.current;
      const container = containerRef.current;

      const targetTime = getTargetTimestamp(
        mode,
        emailLength,
        pointerPosRef.current.x
      );

      // Smooth timestamp interpolation (lerp)
      const lerpSpeed = mode === 'privacy' || mode === 'peeking' ? 0.25 : 0.16;
      currentSeekRef.current +=
        (targetTime - currentSeekRef.current) * lerpSpeed;

      if (video && video.readyState >= HTMLMediaElement.HAVE_METADATA) {
        // Fast seek without stutter
        if (Math.abs(video.currentTime - currentSeekRef.current) > 0.02) {
          video.currentTime = currentSeekRef.current;
        }
      }

      // Smooth 3D tilt and translation physics
      if (container) {
        let targetX = 0;
        let targetY = 0;
        let targetRotate = 0;

        if (mode === 'pointer') {
          targetX = (pointerPosRef.current.x - 0.5) * 16;
          targetY = (pointerPosRef.current.y - 0.5) * 10;
          targetRotate = (pointerPosRef.current.x - 0.5) * 6;
        } else if (mode === 'typing') {
          targetX = (Math.min(emailLength / 26, 1) - 0.5) * 10;
          targetY = 4; // tilt down towards the input
          targetRotate = (Math.min(emailLength / 26, 1) - 0.5) * 4;
        } else if (mode === 'privacy') {
          targetY = -2;
          targetRotate = 0;
        }

        currentTransformRef.current.x +=
          (targetX - currentTransformRef.current.x) * 0.12;
        currentTransformRef.current.y +=
          (targetY - currentTransformRef.current.y) * 0.12;
        currentTransformRef.current.rotate +=
          (targetRotate - currentTransformRef.current.rotate) * 0.12;

        container.style.transform = `translate3d(${currentTransformRef.current.x}px, ${currentTransformRef.current.y}px, 0) rotate(${currentTransformRef.current.rotate}deg)`;
      }

      animFrameId = requestAnimationFrame(tick);
    };

    animFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameId);
  }, [mode, emailLength]);

  return (
    <div className="relative flex h-[140px] w-full items-end justify-center overflow-visible sm:h-[155px]">
      <div
        ref={containerRef}
        className="pointer-events-none relative flex items-end justify-center will-change-transform"
      >
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          className="h-[185px] w-auto max-w-none select-none mix-blend-multiply sm:h-[205px]"
          style={{
            filter: 'contrast(1.02) brightness(1.0)',
          }}
        >
          <source src="/media/monion.mp4" type="video/mp4" />
        </video>
      </div>
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
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-stone-700">
          6 Haneli Doğrulama Kodu
        </label>
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
          className="h-14 w-full rounded-2xl border border-stone-200 bg-white px-4 text-center font-mono text-2xl font-black tracking-[0.3em] text-stone-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-400/20"
          placeholder="000000"
        />
      </div>
      <button
        type="submit"
        disabled={isBusy || code.length !== 6}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#2D2A26] text-sm font-bold text-white shadow-md transition hover:bg-[#3F3B36] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )}
        <span>{buttonLabel}</span>
      </button>
    </form>
  );
}
