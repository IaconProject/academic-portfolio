'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, ArrowRight, Sun, Moon, KeyRound, CheckCircle2, RefreshCw, AlertCircle, ShieldAlert } from 'lucide-react';
import { getAdminCredentials, saveAdminCredentials } from '@/lib/cms-store';
import { writeSessionItem } from '@/lib/admin-session-storage';
import { BlockchainCanvasAnimation } from '@/components/admin/BlockchainCanvasAnimation';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Secure Password Reset Modal State (2-Step OTP Verification)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<1 | 2>(1);
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [resetSendingOtp, setResetSendingOtp] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    // Theme sync
    const savedTheme = localStorage.getItem('admin_theme') as 'light' | 'dark' | null;
    const initialTheme = savedTheme || 'light';
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const creds = getAdminCredentials();
    if (creds?.email) {
      setEmail(creds.email);
    }

  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('admin_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        if (typeof window !== 'undefined') {
          // 7 günlük TTL ile localStorage'a yazılır; tarayıcı kapatılsa bile
          // oturum açık kalır.
          writeSessionItem('academic_admin_auth', 'true');
          if (json.token) {
            writeSessionItem('admin_token', json.token);
          }
        }
        toast.success(json.message || 'Yönetici kimliği doğrulandı!');
        router.push('/admin');
      } else {
        toast.error(json.error || 'Geçersiz e-posta adresi veya şifre!');
      }
    } catch (err) {
      toast.error('Sunucu bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Request 6-Digit OTP Code via Email
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetEmail.includes('@')) {
      toast.error('Lütfen geçerli e-posta adresinizi girin.');
      return;
    }

    setResetSendingOtp(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_otp',
          email: resetEmail,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Doğrulama kodu e-postanıza gönderildi!');
        setResetStep(2);
      } else {
        toast.error(data.error || 'Doğrulama kodu gönderilemedi.');
      }
    } catch (e) {
      toast.error('Sunucu bağlantı hatası.');
    } finally {
      setResetSendingOtp(false);
    }
  };

  // Step 2: Verify OTP Code & Set New Password
  const handleVerifyOtpAndReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otpCode || otpCode.trim().length !== 6) {
      toast.error('Lütfen e-postanıza gelen 6 haneli doğrulama kodunu girin.');
      return;
    }

    if (!newResetPassword || newResetPassword.length < 8) {
      toast.error('Yeni şifreniz güvenlik nedeniyle en az 8 karakter olmalıdır.');
      return;
    }

    if (newResetPassword !== confirmResetPassword) {
      toast.error('Yeni şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setResetting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_and_reset',
          email: resetEmail,
          otpCode: otpCode.trim(),
          newPassword: newResetPassword,
        }),
      });

      const data = await res.json();
      if (data.success) {
        saveAdminCredentials({
          email: resetEmail.trim(),
          password: newResetPassword,
          updatedAt: new Date().toISOString(),
        });
        setEmail(resetEmail.trim());
        setPassword(newResetPassword);
        toast.success('Şifreniz güvenle güncellendi! Yeni şifrenizle giriş yapabilirsiniz.');
        setShowResetModal(false);
        setResetStep(1);
        setOtpCode('');
        setNewResetPassword('');
        setConfirmResetPassword('');
      } else {
        toast.error(data.error || 'Şifre güncellenemedi.');
      }
    } catch (e) {
      toast.error('Sunucu hatası.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-academic-bg dark:bg-[#121110] text-stone-900 dark:text-stone-100 flex items-center justify-center p-4 selection:bg-amber-200 relative overflow-hidden transition-colors duration-300 font-sans">
      {/* Interactive Particle Animation Background */}
      <BlockchainCanvasAnimation theme={theme} />

      {/* Top Theme Switcher Button */}
      <div className="absolute top-6 right-6 z-20">
        <button
          onClick={toggleTheme}
          className="p-2.5 bg-white/80 dark:bg-stone-800/80 hover:bg-white dark:hover:bg-stone-700 text-stone-800 dark:text-stone-100 rounded-xl border border-stone-200 dark:border-stone-700 shadow-md backdrop-blur-md transition-all active:scale-95 flex items-center gap-2 text-xs font-bold"
          title="Tema Değiştir"
        >
          {theme === 'light' ? (
            <>
              <Moon className="w-4 h-4 text-stone-700" />
              <span>Koyu Tema</span>
            </>
          ) : (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span>Açık Tema</span>
            </>
          )}
        </button>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-white/90 dark:bg-stone-900/90 rounded-2xl shadow-2xl border border-stone-200/90 dark:border-stone-800 p-8 space-y-6 backdrop-blur-xl relative z-10 animate-fade-in">
        {/* Top Accent Indicator */}
        <div className="w-12 h-1 bg-stone-900 dark:bg-amber-500 rounded-full mx-auto" />

        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-amber-400 border border-stone-200 dark:border-stone-700 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-7 h-7 text-amber-700 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-stone-100 tracking-tight">
            Yönetim Paneli Girişi
          </h1>
          <p className="text-xs text-stone-500 dark:text-stone-400 font-sans">
            Akademik Portfolyo & CMS Sistem Güvenliği
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
              Yönetici E-posta
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="bilgi@muhammedakan.com"
                className="w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Şifre
              </label>
              <button
                type="button"
                onClick={() => {
                  setResetEmail(email);
                  setResetStep(1);
                  setShowResetModal(true);
                }}
                className="text-xs text-amber-700 dark:text-amber-400 hover:underline font-medium flex items-center gap-1"
              >
                <KeyRound className="w-3 h-3" />
                <span>Şifremi Unuttum</span>
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-stone-50 dark:text-stone-950 font-bold rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <span>{loading ? 'Kimlik Doğrulanıyor...' : 'Giriş Yap'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-stone-100 dark:border-stone-800 text-center">
          <a
            href="/"
            className="text-xs font-medium text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            ← Portfolyo Sayfasına Dön
          </a>
        </div>
      </div>

      {/* 2-Factor / OTP Secure Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-6 shadow-2xl text-stone-900 dark:text-stone-100 font-sans relative animate-fade-in">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-lg font-bold">2 Adımlı E-posta Doğrulamalı Şifre Sıfırlama</h3>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {resetStep === 1 ? (
              /* Step 1: Request 6-Digit OTP Email */
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                  Güvenlik nedeniyle şifrenizi sıfırlamak için kayıtlı yönetici e-posta adresinize tek kullanımlık <strong>6 haneli doğrulama kodu (OTP)</strong> gönderilecektir.
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1.5">
                    Kayıtlı Yönetici E-postanız <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@muhammedakan.com"
                      className="w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    className="py-2.5 px-4 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold rounded-xl"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={resetSendingOtp}
                    className="py-2.5 px-5 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-stone-50 dark:text-stone-950 text-xs font-bold rounded-xl shadow-md disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {resetSendingOtp ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Kod Gönderiliyor...</span>
                      </>
                    ) : (
                      <>
                        <span>Doğrulama Kodu Gönder</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2: Verify OTP Code & Set New Password */
              <form onSubmit={handleVerifyOtpAndReset} className="space-y-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
                  <strong>{resetEmail}</strong> adresine gönderilen 6 haneli doğrulama kodunu ve yeni şifrenizi girin.
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                    6 Haneli E-posta Doğrulama Kodu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-center font-mono text-lg font-bold tracking-[6px] text-amber-700 dark:text-amber-400 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                    Yeni Şifre (En az 8 karakter) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={newResetPassword}
                    onChange={(e) => setNewResetPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                    Yeni Şifre (Tekrar) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmResetPassword}
                    onChange={(e) => setConfirmResetPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
                  />
                </div>

                <div className="pt-2 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="text-xs text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 underline"
                  >
                    ← E-postayı Değiştir
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowResetModal(false)}
                      className="py-2.5 px-4 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-bold rounded-xl"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={resetting}
                      className="py-2.5 px-5 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-stone-50 dark:text-stone-950 text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
                    >
                      {resetting ? 'Doğrulanıyor...' : 'Şifreyi Doğrula ve Değiştir'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
