'use client';

import React, { useState, useEffect } from 'react';
import { KeyRound, Save, Eye, EyeOff } from 'lucide-react';
import { getAdminCredentials, saveAdminCredentials } from '@/lib/cms-store';
import toast from 'react-hot-toast';

export const CredentialsEditor: React.FC = () => {
  const [currentEmail, setCurrentEmail] = useState('bilgi@muhammedakan.com');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const creds = getAdminCredentials();
    if (creds?.email) {
      setCurrentEmail(creds.email);
    }

    const token = sessionStorage.getItem('admin_token') || '';
    fetch('/api/cms', {
      headers: token ? { 'X-Admin-Token': token } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.adminCredentials?.email) {
          setCurrentEmail(data.adminCredentials.email);
        }
      })
      .catch(() => {});
  }, []);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast.error('Lütfen mevcut şifrenizi girin.');
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      toast.error('Yeni şifre en az 8 karakter olmalıdır.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Yeni şifreler birbiriyle eşleşmiyor.');
      return;
    }

    setSaving(true);
    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') || '' : '';

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Admin-Token': token } : {}),
        },
        body: JSON.stringify({
          currentPassword,
          newEmail: newEmail.trim(),
          newPassword,
        }),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        toast.success(json.message || 'Yönetici e-posta ve şifreniz güvenli bir şekilde güncellendi.');
        
        const updatedEmail = json.email || (newEmail.trim() ? newEmail.trim().toLowerCase() : currentEmail);
        saveAdminCredentials({
          email: updatedEmail,
          password: '',
          updatedAt: new Date().toISOString(),
        });

        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setNewEmail('');
        setCurrentEmail(updatedEmail);
      } else {
        toast.error(json.error || 'Şifre güncellenirken sunucu hatası oluştu.');
      }
    } catch (err) {
      toast.error('Şifre güncellenirken hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handlePasswordChange}
      className="admin-panel-card space-y-6 font-sans"
    >
      <div className="border-b border-stone-100 dark:border-stone-800 pb-4">
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          <span>Güvenlik & Güvenli Şifre Yönetimi</span>
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
          CMS yönetim paneli giriş bilgilerinizi güncelleyin. Güvenliğiniz için mevcut şifrenizi doğrulamanız gerekmektedir.
        </p>
      </div>

      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
            Mevcut Giriş E-postası
          </label>
          <input
            type="email"
            disabled
            value={currentEmail}
            className="w-full px-4 py-3 bg-stone-100 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-semibold text-stone-600 dark:text-stone-400 outline-none cursor-not-allowed"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
            Yeni E-posta Adresi (İsteğe Bağlı Değiştirin)
          </label>
          <input
            type="email"
            placeholder={currentEmail}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
            Mevcut Şifreniz <span className="text-rose-500">*</span>
          </label>
          <input
            type={showPass ? 'text' : 'password'}
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
            Yeni Şifre <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="En az 8 karakter..."
              className="w-full pl-4 pr-11 py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-3.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
            Yeni Şifre (Tekrar) <span className="text-rose-500">*</span>
          </label>
          <input
            type={showPass ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Yeni şifrenizi tekrar girin..."
            className="w-full px-4 py-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 py-3 px-6 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-stone-50 dark:text-stone-950 font-bold rounded-xl transition-all shadow-md active:scale-95 text-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Güncelleniyor...' : 'Şifreyi Güvenli Güncelle'}</span>
        </button>
      </div>
    </form>
  );
};
