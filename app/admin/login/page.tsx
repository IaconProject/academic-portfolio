'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, ArrowRight, Sun, Moon, KeyRound, CheckCircle2, RefreshCw } from 'lucide-react';
import { getAdminCredentials, saveAdminCredentials } from '@/lib/cms-store';
import { BlockchainCanvasAnimation } from '@/components/admin/BlockchainCanvasAnimation';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Password Reset Modal State
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [currentPassVerify, setCurrentPassVerify] = useState('');
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const creds = getAdminCredentials();

    setTimeout(() => {
      if (
        email.trim().toLowerCase() === creds.email.trim().toLowerCase() &&
        password === creds.password
      ) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('academic_admin_auth', 'true');
        }
        toast.success('Yönetici kimliği doğrulandı!');
        router.push('/admin');
      } else {
        toast.error('Geçersiz e-posta adresi veya şifre!');
      }
      setLoading(false);
    }, 400);
  };

  const handlePasswordResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const creds = getAdminCredentials();

    if (resetEmail.trim().toLowerCase() !== creds.email.trim().toLowerCase()) {
      toast.error('Girdiğiniz e-posta adresi sistemdeki yönetici e-postası ile eşleşmiyor.');
      return;
    }

    if (!newResetPassword || newResetPassword.length < 6) {
      toast.error('Yeni şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    if (newResetPassword !== confirmResetPassword) {
      toast.error('Yeni şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setResetting(true);

    try {
      const updatedCreds = {
        email: creds.email,
        password: newResetPassword,
        updatedAt: new Date().toISOString(),
      };

      saveAdminCredentials(updatedCreds);

      await fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminCredentials: updatedCreds }),
      });

      toast.success('Şifreniz güvenle güncellendi. Yeni şifrenizle giriş yapabilirsiniz.');
      setPassword(newResetPassword);
      setShowResetModal(false);
      setNewResetPassword('');
      setConfirmResetPassword('');
    } catch (err) {
      toast.error('Şifre güncellenirken hata oluştu.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f5f0] dark:bg-[#121110] text-stone-900 dark:text-stone-100 flex items-center justify-center p-4 selection:bg-amber-200 relative overflow-hidden transition-colors duration-300 font-sans">
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
                placeholder="admin@cedkan.com"
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
                  setShowResetModal(true);
                }}
                className="text-xs text-amber-700 dark:text-amber-400 hover:underline font-medium"
              >
                Şifremi Unuttum / Sıfırla
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

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 space-y-6 shadow-2xl text-stone-900 dark:text-stone-100 font-sans relative animate-fade-in">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-4">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-lg font-bold">Güvenli Şifre Sıfırlama</h3>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handlePasswordResetSubmit} className="space-y-4">
              <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">
                Yönetici e-posta adresinizi doğrulayarak yeni şifrenizi güvenli bir şekilde belirleyebilirsiniz.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                  Yönetici E-postanız <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="admin@cedkan.com"
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-1">
                  Yeni Şifre <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={newResetPassword}
                  onChange={(e) => setNewResetPassword(e.target.value)}
                  placeholder="En az 6 karakter..."
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
                  placeholder="Yeni şifrenizi tekrar girin..."
                  className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
                />
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
                  disabled={resetting}
                  className="py-2.5 px-5 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-stone-50 dark:text-stone-950 text-xs font-bold rounded-xl shadow-md disabled:opacity-50"
                >
                  {resetting ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
