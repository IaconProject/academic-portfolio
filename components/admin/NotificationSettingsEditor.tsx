'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Bell, Save, Send, ToggleLeft, ToggleRight, Key, Plus, X, AlertTriangle } from 'lucide-react';
import { NotificationSettings, PortfolioData } from '@/lib/types';
import { savePortfolioDataLocally } from '@/lib/cms-store';
import { readSessionItem } from '@/lib/admin-session-storage';
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
    recipientEmail: 'bilgi@muhammedakan.com',
    recipientEmails: ['bilgi@muhammedakan.com'],
    resendApiKey: '',
  });

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    if (portfolioData.notificationSettings) {
      const ns = portfolioData.notificationSettings;
      setSettings((prev) => ({
        ...prev,
        ...ns,
        // Ensure recipientEmails is always an array
        recipientEmails:
          ns.recipientEmails && ns.recipientEmails.length > 0
            ? ns.recipientEmails
            : ns.recipientEmail
              ? [ns.recipientEmail]
              : prev.recipientEmails,
      }));
    }
  }, [portfolioData]);

  const addEmail = () => {
    const cleaned = newEmail.trim().toLowerCase();
    if (!cleaned || !cleaned.includes('@') || !cleaned.includes('.')) {
      toast.error('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }

    const currentEmails = settings.recipientEmails || [];
    if (currentEmails.includes(cleaned)) {
      toast.error('Bu e-posta adresi zaten listeye eklenmiş.');
      return;
    }

    if (currentEmails.length >= 5) {
      toast.error('En fazla 5 alıcı e-posta adresi ekleyebilirsiniz.');
      return;
    }

    const updated = [...currentEmails, cleaned];
    setSettings({
      ...settings,
      recipientEmails: updated,
      recipientEmail: updated[0], // Keep legacy field in sync
    });
    setNewEmail('');
    toast.success(`${cleaned} bildirim listesine eklendi.`);
  };

  const removeEmail = (email: string) => {
    const currentEmails = settings.recipientEmails || [];
    if (currentEmails.length <= 1) {
      toast.error('En az bir alıcı e-posta adresi bulunmalıdır.');
      return;
    }

    const updated = currentEmails.filter(e => e !== email);
    setSettings({
      ...settings,
      recipientEmails: updated,
      recipientEmail: updated[0],
    });
    toast.success(`${email} listeden kaldırıldı.`);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const emails = settings.recipientEmails || [];
    if (emails.length === 0 || !emails[0]?.includes('@')) {
      toast.error('Lütfen en az bir geçerli alıcı e-posta adresi ekleyin.');
      return;
    }

    setSaving(true);

    try {
      const updatedFull: PortfolioData = {
        ...portfolioData,
        notificationSettings: {
          ...settings,
          recipientEmail: emails[0], // Sync legacy field
        },
      };

      const token = typeof window !== 'undefined' ? readSessionItem('admin_token') || '' : '';

      const res = await fetch('/api/cms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Admin-Token': token } : {}),
        },
        body: JSON.stringify({ notificationSettings: updatedFull.notificationSettings }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success === true) {
        savePortfolioDataLocally(updatedFull);
        onUpdate(updatedFull);
        toast.success('E-posta bildirim ayarları başarıyla kaydedildi.');
      } else {
        const message = typeof json?.error === 'string'
          ? json.error
          : json?.error?.message || 'Ayarlar kaydedilirken bir hata oluştu.';
        toast.error(message);
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
      const token = typeof window !== 'undefined' ? readSessionItem('admin_token') || '' : '';

      const res = await fetch('/api/cms/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Admin-Token': token } : {}),
        },
        body: JSON.stringify({}), // Will send to all registered emails
      });

      const json = await res.json();
      if (json.success) {
        toast.success(json.message || 'Test maili gönderildi!');
      } else {
        toast.error(json.message || json.error || 'Test e-postası gönderilemedi.');
      }
    } catch (e) {
      toast.error('Test e-postası gönderilirken sunucu hatası oluştu.');
    } finally {
      setTesting(false);
    }
  };

  const recipientEmails = settings.recipientEmails || [];

  return (
    <form
      onSubmit={handleSave}
      className="admin-panel-card space-y-6 font-sans"
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
          className={`p-4 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
            settings.emailNotificationsEnabled
              ? 'bg-amber-50/70 dark:bg-stone-800/80 border-amber-400 dark:border-amber-600'
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
          className={`p-4 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
            settings.notifyOnNewMessage && settings.emailNotificationsEnabled
              ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-700'
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
          className={`p-4 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
            settings.notifyOnNewVisitor && settings.emailNotificationsEnabled
              ? 'bg-amber-50/70 dark:bg-stone-800/80 border-amber-400 dark:border-amber-600'
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

      {/* Multi-Email Recipients */}
      <div className="space-y-3">
        <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
          Bildirim Alıcı E-posta Adresleri <span className="text-rose-500">*</span>
          <span className="text-[10px] font-normal normal-case tracking-normal text-stone-400 ml-2">
            (En fazla 5 adres)
          </span>
        </label>

        {/* Existing email list */}
        <div className="space-y-2">
          {recipientEmails.map((email, index) => (
            <div
              key={email}
              className="flex items-center gap-2 px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl"
            >
              <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="flex-1 text-sm text-stone-900 dark:text-stone-100 font-medium truncate">
                {email}
              </span>
              {index === 0 && (
                <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/50 px-2 py-0.5 rounded-md shrink-0">
                  Birincil
                </span>
              )}
              <button
                type="button"
                onClick={() => removeEmail(email)}
                disabled={recipientEmails.length <= 1}
                className="p-1 text-stone-400 hover:text-rose-500 dark:hover:text-rose-400 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                title="Kaldır"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add new email input */}
        {recipientEmails.length < 5 && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addEmail();
                  }
                }}
                placeholder="yeni-adres@ornek.com"
                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={addEmail}
              className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-stone-900 dark:bg-amber-600 hover:bg-stone-800 dark:hover:bg-amber-500 text-stone-50 dark:text-stone-950 text-xs font-bold rounded-xl transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ekle</span>
            </button>
          </div>
        )}

        <p className="text-[11px] text-stone-400 flex items-start gap-1.5">
          <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
          <span>
            Form mesajları ve ziyaretçi oturum uyarıları listedeki tüm adreslere gönderilir.
            Resend test modunda mailler hesap sahibi e-postanıza yönlendirilir.
          </span>
        </p>
      </div>

      {/* Sender Email & Resend API Key */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300 mb-2">
            Gönderen E-posta Adresi (Doğrulanmış Domain)
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="email"
              value={settings.senderEmail || 'noreply@muhammedakan.com'}
              onChange={(e) => setSettings({ ...settings, senderEmail: e.target.value })}
              placeholder="noreply@muhammedakan.com"
              className="w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
            />
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            Resend üzerinde doğruladığınız alan adından bir adres (örn: noreply@muhammedakan.com).
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
              placeholder="re_123456789... (Vercel ENV'de Aktif)"
              className="w-full pl-10 pr-4 py-3 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
            />
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
            ✓ Vercel sunucusunda (RESEND_API_KEY) tanımlı olduğu için bu alanı boş bırakabilirsiniz.
          </p>
        </div>
      </div>

      {/* Mobile Test Email Button */}
      <div className="sm:hidden">
        <button
          type="button"
          onClick={handleSendTestEmail}
          disabled={testing}
          className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold rounded-xl border border-stone-200 dark:border-stone-700 transition-colors"
        >
          <Send className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>{testing ? 'Gönderiliyor...' : 'Tüm Adreslere Test Maili Gönder'}</span>
        </button>
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
