'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';
import { getAdminCredentials } from '@/lib/cms-store';
import toast from 'react-hot-toast';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const creds = getAdminCredentials();
    if (creds?.email) {
      setEmail(creds.email);
    }
  }, []);

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
        toast.success('Yönetici girişi başarılı!');
        router.push('/admin');
      } else {
        toast.error('Geçersiz e-posta veya şifre!');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-academic-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-academic-navy text-amber-400 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-academic-navy">
            CMS Yönetim Girişi
          </h1>
          <p className="text-xs text-slate-500">
            Muhammed Akan Akademik Portfolyo İçerik Yönetim Sistemi
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              E-posta
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-academic-navy outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Şifre
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-academic-navy outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-academic-navy text-white font-bold rounded-xl hover:bg-academic-blue transition-all shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <span>{loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 text-center">
          <a
            href="/"
            className="text-xs text-academic-slate hover:text-academic-navy font-semibold hover:underline"
          >
            ← Portfolyo Sayfasına Dön
          </a>
        </div>
      </div>
    </div>
  );
}
