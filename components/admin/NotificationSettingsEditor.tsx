'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Bell, ShieldCheck, Save, Send, CheckCircle2, ToggleLeft, ToggleRight, Key } from 'lucide-react';
import { NotificationSettings, PortfolioData } from '@/lib/types';
import { getPortfolioData, savePortfolioDataLocally } from '@/lib/cms-store';
import toast from 'react-hot-toast';

interface NotificationSettingsEditorProps {
  portfolioData: PortfolioData;
  onUpdate: (updatedData: PortfolioData) => void;
}

export const NotificationSettingsEditor: React.FC<NotificationSettingsEditorProps> = ({
  portfolioData,
  onUpdate,
}) => {
  const [settings, setSettings] = useState<NotificationSettings>({
    emailNotificationsEnabled: true,
    notifyOnNewMessage: true,
    notifyOnNewVisitor: false,
    recipientEmail: 'info@cedkan.com',
    resendApiKey: '',
  });

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (portfolioData.notificationSettings) {
      setSettings((prev) => ({
        ...prev,
        ...portfolioData.notificationSettings,
      }));
    }
  }, [portfolioData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!settings.recipientEmail || !settings.recipientEmail.includes('@')) {
      toast.error('Lütfen bildirimlerin gönderileceği geçerli bir e-posta adresi girin.');
      return;
    }

    setSaving(true);

    try {
      const updatedFull: PortfolioData = {
        ...portfolioData,
        notificationSettings: settings,
      };

      savePortfolioDataLocally(updatedFull);

      const res = await fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationSettings: settings }),
      });

      if (res.ok) {
        onUpdate(updatedFull);
        toast.success('E-posta bildirim ayarları başarıyla kaydedildi.');
      } else {
        toast.error('Ayarlar kaydedilirken bir hata oluştu.');
      }
    } catch (err) {
      toast.error('Sunucu bağlantı hatası.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    setTesting(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Sistem Testi (Admin)',
          email: settings.recipientEmail,
          subject: 'E-posta Bildirim Testi',
          message: 'Bu bir e-posta bildirim test mesajıdır. CMS ayarlarınız başarıyla çalışmaktadır.',
        }),
      });

      if (res.ok) {
        toast.success(`Test bildirimi ${settings.recipientEmail} adresine iletildi!`);
      } else {
        toast.error('Test e-postası gönderilemedi.');
      }
    } catch (e) {
      toast.error('Test e-postası gönderilirken hata oluştu.');
    } finally {
      setTesting(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="bg-white/90 dark:bg-stone-900/90 p-6 md:p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-md backdrop-blur-md space-y-6 transition-colors duration-300 font-sans"
    >
      <div className="border-b border-stone-100 dark:border-stone-800 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                Otomatik E-posta Bildirim Yönetimi (CMS)
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                Ziyaretçi mesajları ve yeni ziyaretçi oturumları için e-posta bildirimlerini yönetin.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSendTestEmail}
            disabled={testing}
            className="hidden sm:inline-flex items-center gap-1.5 py-2 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold rounded-xl border border-stone-200 dark:border-stone-700 transition-colors"
          >
            <Send className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{testing ? 'Gönderiliyor...' : 'Test Maili Gönder'}</span>
          </button>
        </div>
      </div>

      {/* Main Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Toggle 1: Global Email Enable */}
        <div
          onClick={() =>
            setSettings({
              ...settings,
              emailNotificationsEnabled: !settings.emailNotificationsEnabled,
            })
          }
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
            settings.emailNotificationsEnabled
              ? 'bg-amber-50/70 dark:bg-stone-800/80 border-amber-400 dark:border-amber-600 shadow-sm'
              : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 opacity-70'
          }`}
        >
          <div className="space-y-1">
            <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
              E-posta Bildirimleri
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              {settings.emailNotificationsEnabled ? 'Genel bildirimler AKTİF' : 'Genel bildirimler PASİF'}
            </p>
          </div>
          {settings.emailNotificationsEnabled ? (
            <ToggleRight className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          ) : (
            <ToggleLeft className="w-7 h-7 text-stone-400" />
          )}
        </div>

        {/* Toggle 2: Notify on Visitor Messages */}
        <div
          onClick={() =>
            setSettings({
              ...settings,
              notifyOnNewMessage: !settings.notifyOnNewMessage,
            })
          }
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
            settings.notifyOnNewMessage && settings.emailNotificationsEnabled
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700 shadow-sm'
              : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 opacity-70'
          }`}
        >
          <div className="space-y-1">
            <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
              Yeni Mesaj Bildirimi
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              {settings.notifyOnNewMessage ? 'Ziyaretçi mesajlarında mail at' : 'Mesaj bildirimleri kapalı'}
            </p>
          </div>
          {settings.notifyOnNewMessage ? (
            <ToggleRight className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <ToggleLeft className="w-7 h-7 text-stone-400" />
          )}
        </div>

        {/* Toggle 3: Notify on New Visitor Sessions */}
        <div
          onClick={() =>
            setSettings({
              ...settings,
              notifyOnNewVisitor: !settings.notifyOnNewVisitor,
            })
          }
          className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
            settings.notifyOnNewVisitor && settings.emailNotificationsEnabled
              ? 'bg-amber-50/70 dark:bg-stone-800/80 border-amber-400 dark:border-amber-600 shadow-sm'
              : 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-700 opacity-70'
          }`}
        >
          <div className="space-y-1">
            <div className="text-xs font-bold text-stone-900 dark:text-stone-100">
              Yeni Ziyaretçi Oturumu
            </div>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              {settings.notifyOnNewVisitor ? 'Yeni ziyaretçide mail at' : 'Ziyaretçi log bildirimi kapalı'}
            </p>
          </div>
          {settings.notifyOnNewVisitor ? (
            <ToggleRight className="w-7 h-7 text-amber-600 dark:text-amber-400" />
          ) : (
            <ToggleLeft className="w-7 h-7 text-stone-400" />
          )}
        </div>
      </div>

      {/* Recipient & Provider Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
            Bildirimlerin İletileceği E-posta Adresi <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="email"
              required
              value={settings.recipientEmail}
              onChange={(e) => setSettings({ ...settings, recipientEmail: e.target.value })}
              placeholder="ornek@domain.com"
              className="w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
            />
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Form mesajları ve ziyaretçi uyarıları bu e-posta adresinize gönderilir.
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
            Resend API Key (İsteğe Bağlı)
          </label>
          <div className="relative">
            <Key className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="password"
              value={settings.resendApiKey || ''}
              onChange={(e) => setSettings({ ...settings, resendApiKey: e.target.value })}
              placeholder="re_123456789..."
              className="w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
            />
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Vercel veya Resend.com üzerinden ücretsiz e-posta gönderim anahtarınız.
          </p>
        </div>
      </div>

      <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 py-3 px-6 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-stone-50 dark:text-stone-950 font-bold rounded-xl transition-all shadow-md active:scale-95 text-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Kaydediliyor...' : 'Bildirim Ayarlarını Kaydet'}</span>
        </button>
      </div>
    </form>
  );
};
