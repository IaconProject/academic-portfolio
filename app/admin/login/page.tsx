'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Lock, Mail, ArrowRight, Cpu, KeyRound } from 'lucide-react';
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
        toast.success('Yönetici oturumu doğrulandı!');
        router.push('/admin');
      } else {
        toast.error('Geçersiz e-posta adresi veya şifre!');
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex items-center justify-center p-4 selection:bg-cyan-500 selection:text-black">
      <div className="w-full max-w-md bg-slate-950/90 rounded-2xl shadow-2xl border border-cyan-500/30 p-8 space-y-6 backdrop-blur-xl relative overflow-hidden">
        {/* Top Glowing Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-emerald-400 to-cyan-500" />

        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-cyan-950/80 text-cyan-400 border border-cyan-500/40 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-cyan-500/10">
            <Cpu className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl font-mono font-bold tracking-wider text-slate-100 uppercase">
            CMS // AUTH_NODE
          </h1>
          <p className="text-xs font-mono text-slate-400">
            Kriptografik Güvenlikli Akademik İçerik Yönetimi
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-1.5">
              YÖNETİCİ E-POSTA
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-1.5">
              ŞİFRE
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-extrabold rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            <span>{loading ? 'KİMLİK DOĞRULANIYOR...' : 'SİSTEME GİRİŞ YAP'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-900 text-center">
          <a
            href="/"
            className="text-xs font-mono text-slate-500 hover:text-cyan-400 transition-colors"
          >
            ← Portfolyo Sayfasına Dön
          </a>
        </div>
      </div>
    </div>
  );
}
