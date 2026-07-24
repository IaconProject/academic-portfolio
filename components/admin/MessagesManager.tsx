'use client';

import React, { useEffect, useState } from 'react';
import { ContactMessage } from '@/lib/types';
import {
  Inbox,
  Mail,
  Star,
  Trash2,
  CheckCircle2,
  RefreshCw,
  Search,
  Download,
  Calendar,
  Phone,
  User,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
  Eye,
  CheckCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const MessagesManager: React.FC = () => {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'unread' | 'starred'>('all');
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/messages?t=' + Date.now());
      if (res.ok) {
        const json = await res.json();
        if (json.messages) {
          setMessages(json.messages);
        }
      }
    } catch (e) {
      toast.error('Mesajlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleToggleStar = async (msg: ContactMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStarred = !msg.isStarred;
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isStarred: newStarred } : m))
    );
    if (selectedMessage?.id === msg.id) {
      setSelectedMessage((prev) => (prev ? { ...prev, isStarred: newStarred } : null));
    }

    try {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msg.id, isStarred: newStarred }),
      });
    } catch (e) {}
  };

  const handleMarkAsRead = async (msg: ContactMessage, isRead = true) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, isRead } : m))
    );
    if (selectedMessage?.id === msg.id) {
      setSelectedMessage((prev) => (prev ? { ...prev, isRead } : null));
    }

    try {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: msg.id, isRead }),
      });
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
    toast.success('Tüm mesajlar okundu olarak işaretlendi.');
    try {
      await fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true }),
      });
    } catch (e) {}
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;

    setMessages((prev) => prev.filter((m) => m.id !== id));
    if (selectedMessage?.id === id) {
      setSelectedMessage(null);
    }
    toast.success('Mesaj silindi.');

    try {
      await fetch(`/api/messages?id=${id}`, { method: 'DELETE' });
    } catch (e) {}
  };

  const handleDeleteAllRead = async () => {
    if (!confirm('Okunmuş tüm mesajları silmek istediğinize emin misiniz?')) return;

    setMessages((prev) => prev.filter((m) => !m.isRead));
    toast.success('Okunan mesajlar temizlendi.');

    try {
      await fetch('/api/messages?deleteRead=true', { method: 'DELETE' });
    } catch (e) {}
  };

  const handleOpenDetail = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    if (!msg.isRead) {
      handleMarkAsRead(msg, true);
    }
  };

  const handleExportCSV = () => {
    if (messages.length === 0) {
      toast.error('İndirilecek mesaj bulunmuyor.');
      return;
    }

    const headers = ['ID', 'Tarih', 'Ad Soyad', 'E-posta', 'Telefon', 'Konu', 'Mesaj', 'Okundu', 'Yıldızlı', 'IP'];
    const rows = messages.map((m) => [
      m.id,
      new Date(m.createdAt).toLocaleString('tr-TR'),
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.email}"`,
      `"${m.phone || ''}"`,
      `"${m.subject.replace(/"/g, '""')}"`,
      `"${m.message.replace(/"/g, '""')}"`,
      m.isRead ? 'Evet' : 'Hayır',
      m.isStarred ? 'Evet' : 'Hayır',
      m.ipAddress || '',
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gelen_mesajlar_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Mesajlar CSV olarak indirildi.');
  };

  // Metrics
  const totalMessages = messages.length;
  const unreadCount = messages.filter((m) => !m.isRead).length;
  const starredCount = messages.filter((m) => m.isStarred).length;
  const todayCount = messages.filter((m) => {
    const d = new Date(m.createdAt);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  }).length;

  // Filtered List
  const filteredMessages = messages.filter((msg) => {
    if (filterTab === 'unread' && msg.isRead) return false;
    if (filterTab === 'starred' && !msg.isStarred) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        msg.name.toLowerCase().includes(q) ||
        msg.email.toLowerCase().includes(q) ||
        msg.subject.toLowerCase().includes(q) ||
        msg.message.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-slate-950/80 p-6 md:p-8 rounded-2xl border border-cyan-500/20 shadow-2xl backdrop-blur-md space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <Inbox className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-mono font-bold text-slate-100 uppercase tracking-wider">
              Gelen Mesajlar Yönetimi
            </h2>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 bg-emerald-500 text-slate-950 text-xs font-mono font-extrabold rounded-full animate-pulse shadow-lg shadow-emerald-500/30">
                {unreadCount} YENİ
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Ziyaretçilerin web siteniz üzerinden gönderdikleri mesajları anlık takip edin ve yanıtlayın.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMessages}
            disabled={loading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-colors"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-mono font-bold rounded-xl border border-slate-800 transition-colors"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>CSV İNDİR</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[11px] text-slate-400 uppercase font-bold">TOPLAM MESAJ</span>
          <div className="text-2xl font-bold text-slate-100">{totalMessages}</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-emerald-500/30 rounded-xl space-y-1">
          <span className="text-[11px] text-emerald-400 uppercase font-bold">OKUNMAMIŞ</span>
          <div className="text-2xl font-bold text-emerald-400">{unreadCount}</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-amber-500/30 rounded-xl space-y-1">
          <span className="text-[11px] text-amber-400 uppercase font-bold">YILDIZLI</span>
          <div className="text-2xl font-bold text-amber-400">{starredCount}</div>
        </div>

        <div className="p-4 bg-slate-900/80 border border-cyan-500/30 rounded-xl space-y-1">
          <span className="text-[11px] text-cyan-400 uppercase font-bold">BUGÜN GELEN</span>
          <div className="text-2xl font-bold text-cyan-400">{todayCount}</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterTab === 'all' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            TÜMÜ ({totalMessages})
          </button>
          <button
            onClick={() => setFilterTab('unread')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterTab === 'unread' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            OKUNMAMIŞ ({unreadCount})
          </button>
          <button
            onClick={() => setFilterTab('starred')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterTab === 'starred' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            YILDIZLI ({starredCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Mesajlarda veya kişide ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:border-cyan-400 outline-none"
          />
        </div>
      </div>

      {/* Quick Actions Bar */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1">
          <span>Gösterilen: <strong className="text-slate-200">{filteredMessages.length}</strong> / {totalMessages}</span>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="hover:text-emerald-400 inline-flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Tümünü Okundu İşaretle</span>
              </button>
            )}
            <button
              onClick={handleDeleteAllRead}
              className="hover:text-red-400 inline-flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Okunanları Temizle</span>
            </button>
          </div>
        </div>
      )}

      {/* Message List Table / Cards */}
      <div className="space-y-2.5 font-mono">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <span>MESAJLAR YÜKLENİYOR...</span>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-500 text-xs">
            {searchQuery ? 'Aramanıza uygun mesaj bulunamadı.' : 'Gelen kutunuzda henüz mesaj bulunmuyor.'}
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => handleOpenDetail(msg)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                !msg.isRead
                  ? 'bg-slate-900/90 border-cyan-500/40 shadow-lg shadow-cyan-500/5 hover:border-cyan-400'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 opacity-90'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                {/* Star & Unread Dot */}
                <div className="flex items-center gap-2 pt-1 sm:pt-0 shrink-0">
                  <button
                    onClick={(e) => handleToggleStar(msg, e)}
                    className="text-slate-600 hover:text-amber-400 transition-colors"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        msg.isStarred ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                    />
                  </button>
                  {!msg.isRead && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                  )}
                </div>

                <div className="min-w-0 space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-100 text-sm truncate">{msg.name}</span>
                    <span className="text-[11px] text-slate-400 truncate">&lt;{msg.email}&gt;</span>
                    <span className="text-[10px] bg-slate-900 border border-slate-800 text-cyan-400 px-2 py-0.5 rounded font-bold">
                      {msg.subject}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 truncate max-w-2xl font-sans">
                    {msg.message}
                  </p>
                </div>
              </div>

              {/* Date & Actions */}
              <div className="flex items-center gap-3 shrink-0 text-xs text-slate-400 sm:self-center justify-between sm:justify-end border-t sm:border-t-0 border-slate-800/80 pt-2 sm:pt-0">
                <span className="text-[11px]">
                  {new Date(msg.createdAt).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>

                <div className="flex items-center gap-1">
                  <a
                    href={`mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="E-posta ile Yanıtla"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                  <button
                    onClick={(e) => handleDelete(msg.id, e)}
                    className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Message Reader Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-950 border border-cyan-500/40 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl font-mono text-slate-100 max-h-[90vh] overflow-y-auto relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">// MESAJ DETAYI</span>
                  <span className="text-[10px] bg-slate-900 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded">
                    {selectedMessage.subject}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-100">{selectedMessage.name}</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleStar(selectedMessage)}
                  className="p-2 text-slate-400 hover:text-amber-400 bg-slate-900 rounded-xl border border-slate-800"
                >
                  <Star className={`w-4 h-4 ${selectedMessage.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-2 text-slate-400 hover:text-slate-100 bg-slate-900 rounded-xl border border-slate-800 text-xs font-bold"
                >
                  ✕ KAPAT
                </button>
              </div>
            </div>

            {/* Sender Meta Box */}
            <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <span>E-posta: <a href={`mailto:${selectedMessage.email}`} className="text-cyan-400 underline font-bold">{selectedMessage.email}</a></span>
                </div>

                {selectedMessage.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-400" />
                    <span>Telefon: <strong className="text-slate-200">{selectedMessage.phone}</strong></span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-slate-400 text-[11px]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Gönderim Tarihi: {new Date(selectedMessage.createdAt).toLocaleString('tr-TR')}</span>
                </div>

                {selectedMessage.ipAddress && (
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span>IP: {selectedMessage.ipAddress}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Message Content Body */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-400">MESAJ İÇERİĞİ:</label>
              <div className="p-5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm font-sans text-slate-200 leading-relaxed whitespace-pre-wrap selection:bg-cyan-500 selection:text-black">
                {selectedMessage.message}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => handleDelete(selectedMessage.id)}
                className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-red-950/60 hover:bg-red-900/80 text-red-300 text-xs font-mono font-bold rounded-xl border border-red-500/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>MESAJI SİL</span>
              </button>

              <a
                href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}&body=${encodeURIComponent(`Sayın ${selectedMessage.name},\n\n`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 py-2.5 px-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-extrabold rounded-xl transition-all shadow-lg shadow-cyan-500/20"
              >
                <Mail className="w-4 h-4" />
                <span>E-POSTA İLE YANITLA</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
