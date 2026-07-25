'use client';

import React, { useEffect, useState } from 'react';
import { ContactMessage } from '@/lib/types';
import {
  Inbox,
  Mail,
  Star,
  Trash2,
  RefreshCw,
  Search,
  Download,
  Calendar,
  Phone,
  ExternalLink,
  ShieldCheck,
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
    <div className="bg-white/90 dark:bg-stone-900/90 p-6 md:p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-md backdrop-blur-md space-y-6 transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <Inbox className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Gelen Mesajlar Yönetimi
            </h2>
            {unreadCount > 0 && (
              <span className="px-2.5 py-0.5 bg-amber-600 text-white text-xs font-bold rounded-full shadow-sm">
                {unreadCount} Yeni
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Ziyaretçilerin web siteniz üzerinden gönderdikleri mesajları takip edin ve yanıtlayın.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchMessages}
            disabled={loading}
            className="p-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200 rounded-xl border border-stone-200 dark:border-stone-700 transition-colors"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-600 dark:text-amber-400' : ''}`} />
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold rounded-xl border border-stone-200 dark:border-stone-700 transition-colors"
          >
            <Download className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>CSV İndir</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 rounded-xl space-y-1">
          <span className="text-[11px] text-stone-500 dark:text-stone-400 uppercase font-bold">Toplam Mesaj</span>
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">{totalMessages}</div>
        </div>

        <div className="p-4 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/50 rounded-xl space-y-1">
          <span className="text-[11px] text-amber-800 dark:text-amber-400 uppercase font-bold">Okunmamış</span>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{unreadCount}</div>
        </div>

        <div className="p-4 bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 rounded-xl space-y-1">
          <span className="text-[11px] text-stone-500 dark:text-stone-400 uppercase font-bold">Yıldızlı</span>
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">{starredCount}</div>
        </div>

        <div className="p-4 bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 rounded-xl space-y-1">
          <span className="text-[11px] text-stone-500 dark:text-stone-400 uppercase font-bold">Bugün Gelen</span>
          <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">{todayCount}</div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl border border-stone-200 dark:border-stone-700 shrink-0">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterTab === 'all' ? 'bg-stone-900 dark:bg-amber-600 text-stone-50 dark:text-stone-950' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            Tümü ({totalMessages})
          </button>
          <button
            onClick={() => setFilterTab('unread')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterTab === 'unread' ? 'bg-stone-900 dark:bg-amber-600 text-stone-50 dark:text-stone-950' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            Okunmamış ({unreadCount})
          </button>
          <button
            onClick={() => setFilterTab('starred')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterTab === 'starred' ? 'bg-stone-900 dark:bg-amber-600 text-stone-50 dark:text-stone-950' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            Yıldızlı ({starredCount})
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Mesajlarda veya kişide ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
          />
        </div>
      </div>

      {/* Quick Actions Bar */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-1">
          <span>Gösterilen: <strong className="text-stone-800 dark:text-stone-200">{filteredMessages.length}</strong> / {totalMessages}</span>

          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="hover:text-stone-900 dark:hover:text-stone-100 inline-flex items-center gap-1 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Tümünü Okundu İşaretle</span>
              </button>
            )}
            <button
              onClick={handleDeleteAllRead}
              className="hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Okunanları Temizle</span>
            </button>
          </div>
        </div>
      )}

      {/* Message List */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="p-12 text-center text-stone-400 text-xs flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-600 dark:text-amber-400" />
            <span>Mesajlar yükleniyor...</span>
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="p-12 text-center bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-500 text-xs">
            {searchQuery ? 'Aramanıza uygun mesaj bulunamadı.' : 'Gelen kutunuzda henüz mesaj bulunmuyor.'}
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <div
              key={msg.id}
              onClick={() => handleOpenDetail(msg)}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                !msg.isRead
                  ? 'bg-amber-50/50 dark:bg-stone-800/90 border-amber-200 dark:border-amber-700/60 shadow-sm'
                  : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200/80 dark:border-stone-700/60 hover:border-stone-300'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="flex items-center gap-2 pt-1 sm:pt-0 shrink-0">
                  <button
                    onClick={(e) => handleToggleStar(msg, e)}
                    className="text-stone-400 hover:text-amber-500 transition-colors"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        msg.isStarred ? 'fill-amber-400 text-amber-400' : ''
                      }`}
                    />
                  </button>
                  {!msg.isRead && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  )}
                </div>

                <div className="min-w-0 space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-stone-900 dark:text-stone-100 text-sm truncate">{msg.name}</span>
                    <span className="text-[11px] text-stone-400 truncate">&lt;{msg.email}&gt;</span>
                    <span className="text-[10px] bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-200 px-2 py-0.5 rounded font-bold">
                      {msg.subject}
                    </span>
                  </div>

                  <p className="text-xs text-stone-600 dark:text-stone-300 truncate max-w-2xl">
                    {msg.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 text-xs text-stone-400 sm:self-center justify-between sm:justify-end border-t sm:border-t-0 border-stone-200 dark:border-stone-700 pt-2 sm:pt-0">
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
                    className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg transition-colors"
                    title="E-posta ile Yanıtla"
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                  <button
                    onClick={(e) => handleDelete(msg.id, e)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl text-stone-900 dark:text-stone-100 max-h-[90vh] overflow-y-auto relative">
            <div className="flex items-start justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase">Mesaj Detayı</span>
                  <span className="text-[10px] bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-2 py-0.5 rounded font-bold">
                    {selectedMessage.subject}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">{selectedMessage.name}</h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggleStar(selectedMessage)}
                  className="p-2 text-stone-400 hover:text-amber-500 bg-stone-100 dark:bg-stone-800 rounded-xl"
                >
                  <Star className={`w-4 h-4 ${selectedMessage.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 bg-stone-100 dark:bg-stone-800 rounded-xl text-xs font-bold"
                >
                  ✕ Kapat
                </button>
              </div>
            </div>

            <div className="p-4 bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 rounded-xl space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>E-posta: <a href={`mailto:${selectedMessage.email}`} className="text-amber-700 dark:text-amber-400 underline font-bold">{selectedMessage.email}</a></span>
                </div>

                {selectedMessage.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-stone-500" />
                    <span>Telefon: <strong className="text-stone-800 dark:text-stone-200">{selectedMessage.phone}</strong></span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/60 dark:border-stone-700/60 text-stone-500 dark:text-stone-400 text-[11px]">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  <span>Gönderim Tarihi: {new Date(selectedMessage.createdAt).toLocaleString('tr-TR')}</span>
                </div>

                {selectedMessage.ipAddress && (
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-stone-400" />
                    <span>IP: {selectedMessage.ipAddress}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-stone-500 dark:text-stone-400">Mesaj İçeriği:</label>
              <div className="p-5 bg-stone-50 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700 rounded-xl text-sm text-stone-900 dark:text-stone-100 leading-relaxed whitespace-pre-wrap">
                {selectedMessage.message}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => handleDelete(selectedMessage.id)}
                className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900/50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Mesajı Sil</span>
              </button>

              <a
                href={`mailto:${selectedMessage.email}?subject=Re: ${encodeURIComponent(selectedMessage.subject)}&body=${encodeURIComponent(`Sayın ${selectedMessage.name},\n\n`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 py-2.5 px-5 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-stone-50 dark:text-stone-950 text-xs font-bold rounded-xl transition-all shadow-md"
              >
                <Mail className="w-4 h-4" />
                <span>E-posta ile Yanıtla</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
