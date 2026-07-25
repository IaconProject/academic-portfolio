'use client';

import React, { useState } from 'react';
import { Mail, Send, Check, Copy, MapPin, MessageSquare, CheckCircle2, RefreshCw, User, Phone, Tag } from 'lucide-react';
import { Profile } from '@/lib/types';
import { AcademicCard } from '../AcademicCard';
import toast from 'react-hot-toast';

interface ContactSectionProps {
  profile: Profile;
}

const SUBJECT_OPTIONS = [
  'Akademik İş Birliği',
  'Seminer / Konferans Daveti',
  'Danışmanlık / Proje',
  'Genel İletişim',
  'Diğer',
];

export const ContactSection: React.FC<ContactSectionProps> = ({ profile }) => {
  const [copied, setCopied] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState(SUBJECT_OPTIONS[0]);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [websiteHp, setWebsiteHp] = useState('');

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleCopyEmail = () => {
    if (profile.email) {
      navigator.clipboard.writeText(profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Lütfen adınızı ve soyadınızı girin.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast.error('Lütfen geçerli bir e-posta adresi girin.');
      return;
    }
    if (!message.trim() || message.trim().length < 5) {
      toast.error('Lütfen en az 5 karakterlik mesaj yazın.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          subject,
          phone: phone.trim(),
          message: message.trim(),
          website_hp: websiteHp,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setSubmitted(true);
        toast.success('Mesajınız başarıyla iletildi!');
        setName('');
        setEmail('');
        setPhone('');
        setMessage('');
      } else {
        toast.error(json.error || 'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      }
    } catch (err) {
      toast.error('Sunucu bağlantı hatası oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AcademicCard
      id="iletisim"
      title="İletişim & Mesaj Gönderin"
      icon={Mail}
      className="bg-[#f7f5f0] border-none shadow-none"
    >
      <div className="space-y-8 max-w-2xl mx-auto">
        {/* 1. Direct Visitor Message Form Box (TOP) */}
        <div className="bg-white/95 p-6 md:p-8 rounded-2xl border border-[#e7e3d8] shadow-sm space-y-6">
          <div className="border-b border-stone-100 pb-4">
            <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-stone-700" />
              <span>Doğrudan Mesaj Bırakın</span>
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Aşağıdaki formu doldurarak iletinizi doğrudan yönetim panelime ulaştırabilirsiniz.
            </p>
          </div>

          {submitted ? (
            <div className="p-8 text-center bg-emerald-50/80 border border-emerald-200/80 rounded-2xl space-y-4 animate-fadeIn">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-emerald-900">Mesajınız Alındı!</h4>
                <p className="text-xs text-emerald-700 max-w-md mx-auto leading-relaxed">
                  İletiniz başarıyla yönetim sistemine iletilmiştir. En kısa sürede belirttiğiniz e-posta adresi üzerinden dönüş yapılacaktır.
                </p>
              </div>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-2 text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
              >
                + Yeni Bir Mesaj Gönder
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Anti-spam Honeypot Field */}
              <input
                type="text"
                name="website_hp"
                value={websiteHp}
                onChange={(e) => setWebsiteHp(e.target.value)}
                className="hidden opacity-0 w-0 h-0 pointer-events-none absolute"
                tabIndex={-1}
                autoComplete="off"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Ad Soyad <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      placeholder="Adınız ve Soyadınız..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-stone-50/80 border border-[#e7e3d8] rounded-xl text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    E-posta Adresi <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      placeholder="ornek@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-stone-50/80 border border-[#e7e3d8] rounded-xl text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Konu Kategorisi
                  </label>
                  <div className="relative">
                    <Tag className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-stone-50/80 border border-[#e7e3d8] rounded-xl text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900 outline-none transition-colors appearance-none"
                    >
                      {SUBJECT_OPTIONS.map((subj) => (
                        <option key={subj} value={subj}>
                          {subj}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                    Telefon / WhatsApp (İsteğe Bağlı)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      placeholder="+90 5XX XXX XX XX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-stone-50/80 border border-[#e7e3d8] rounded-xl text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900 outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
                  Mesajınız <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="İletinizi buraya detaylı bir şekilde yazabilirsiniz..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full p-4 bg-stone-50/80 border border-[#e7e3d8] rounded-xl text-sm text-stone-900 focus:border-stone-900 focus:bg-white focus:ring-1 focus:ring-stone-900 outline-none transition-colors leading-relaxed resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 py-3.5 px-7 bg-stone-900 hover:bg-stone-800 text-stone-50 font-bold rounded-xl transition-all shadow-md active:scale-95 text-xs md:text-sm disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>İLETİLİYOR...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>MESAJI GÖNDER</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* 2. Direct Email Header Card (BOTTOM) */}
        <div className="text-center py-4 space-y-5 bg-white/95 p-6 md:p-8 rounded-2xl border border-[#e7e3d8] shadow-sm">
          <p className="text-stone-600 text-sm md:text-base leading-relaxed">
            Akademik davetler, seminerler, proje işbirlikleri ve görüş alışverişi için doğrudan e-posta adresi üzerinden de iletişime geçebilirsiniz:
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href={`mailto:${profile.email}`}
              className="inline-flex items-center justify-center gap-2.5 py-3 px-6 bg-stone-900 text-stone-50 rounded-xl font-bold shadow-md hover:bg-stone-800 transition-all active:scale-95 text-xs md:text-sm w-full sm:w-auto"
            >
              <Send className="w-4 h-4" />
              <span>{profile.email}</span>
            </a>

            <button
              onClick={handleCopyEmail}
              aria-label="E-postayı kopyala"
              className="inline-flex items-center justify-center gap-2 py-3 px-5 bg-stone-100 border border-stone-200 text-stone-700 rounded-xl font-semibold text-xs hover:bg-stone-200 transition-colors w-full sm:w-auto"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Kopyalandı!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-stone-500" />
                  <span>Adresi Kopyala</span>
                </>
              )}
            </button>
          </div>

          {profile.location && (
            <div className="inline-flex items-center gap-1.5 text-xs text-stone-500 font-medium pt-1">
              <MapPin className="w-4 h-4 text-stone-400" />
              <span>{profile.location}</span>
            </div>
          )}
        </div>
      </div>
    </AcademicCard>
  );
};
