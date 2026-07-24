'use client';

import React, { useState } from 'react';
import { getAdminCredentials, saveAdminCredentials } from '@/lib/cms-store';
import { Mail, Lock, KeyRound, Save, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export const CredentialsEditor: React.FC = () => {
  const currentCreds = getAdminCredentials();
  const [email, setEmail] = useState<string>(currentCreds.email);
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  const [showCurrentPass, setShowCurrentPass] = useState<boolean>(false);
  const [showNewPass, setShowNewPass] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (currentPassword !== currentCreds.password) {
      toast.error('Mevcut şifreniz hatalı!');
      return;
    }

    if (newPassword && newPassword.length < 4) {
      toast.error('Yeni şifreniz en az 4 karakter olmalıdır!');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.error('Yeni şifre ve şifre tekrarı uyuşmuyor!');
      return;
    }

    const updatedCreds = {
      email,
      password: newPassword || currentCreds.password,
      updatedAt: new Date().toISOString(),
    };

    saveAdminCredentials(updatedCreds);

    fetch('/api/cms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminCredentials: updatedCreds }),
    }).catch(() => {});

    toast.success('Giriş bilgileri başarıyla güncellendi!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-slate-950/80 p-6 md:p-8 rounded-2xl border border-emerald-500/30 shadow-2xl backdrop-blur-md">
      <div className="border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-2.5 text-slate-100">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-mono font-bold uppercase tracking-wider">
            Güvenlik & Giriş Bilgileri Yönetimi
          </h2>
        </div>
        <p className="text-xs font-mono text-slate-400 mt-1">
          CMS yönetim paneline giriş yapmak için kullandığınız e-posta adresini ve şifrenizi güncelleyin.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-2">
            Yönetici E-posta Adresi
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none transition-colors"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800/80">
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-2">
            Mevcut Şifreniz (Doğrulama İçin Zorunlu)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type={showCurrentPass ? 'text' : 'password'}
              required
              placeholder="Mevcut şifrenizi girin..."
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full pl-11 pr-12 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPass(!showCurrentPass)}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
            >
              {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-2">
              Yeni Şifre (Boş Bırakılabilir)
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type={showNewPass ? 'text' : 'password'}
                placeholder="Yeni şifreniz..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNewPass(!showNewPass)}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200"
              >
                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-2">
              Yeni Şifre Tekrarı
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type={showNewPass ? 'text' : 'password'}
                placeholder="Yeni şifrenizi tekrar girin..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-mono text-slate-100 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 outline-none transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800 flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-2 py-3.5 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-extrabold rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 text-sm"
        >
          <Save className="w-4 h-4" />
          <span>GİRİŞ BİLGİLERİNİ GÜNCELLE</span>
        </button>
      </div>
    </form>
  );
};
