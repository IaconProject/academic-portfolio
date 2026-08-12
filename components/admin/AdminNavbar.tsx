'use client';

import React, { useEffect, useState } from 'react';
import { Eye, LogOut, LayoutDashboard, Bell, Mail, ChevronRight, X, Sun, Moon } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { ContactMessage } from '@/lib/types';
import { readSessionItem } from '@/lib/admin-session-storage';

interface AdminNavbarProps {
  onLogout: () => void;
  onSelectTab?: (tab: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({
  onLogout,
  onSelectTab,
  theme,
  onToggleTheme,
}) => {
  const [unreadMessages, setUnreadMessages] = useState<ContactMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const fetchUnreadMessages = async () => {
    try {
      const token = readSessionItem('admin_token') || '';
      const res = await fetch('/api/messages?t=' + Date.now(), {
        headers: token ? { 'X-Admin-Token': token } : {},
      });
      if (res.ok) {
        const json = await res.json();
        if (json.messages && Array.isArray(json.messages)) {
          const unread = json.messages.filter((m: ContactMessage) => !m.isRead);
          setUnreadMessages(unread);
          setUnreadCount(unread.length);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchUnreadMessages();
    const interval = setInterval(fetchUnreadMessages, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenMessages = () => {
    setShowDropdown(false);
    if (onSelectTab) {
      onSelectTab('messages');
    }
  };

  return (
    <header className="sticky top-0 z-50 flex min-h-16 items-center justify-between gap-3 border-b border-stone-200/80 bg-[#fcfbf9]/95 px-3 py-3 text-stone-800 shadow-sm backdrop-blur-md transition-colors duration-300 dark:border-stone-800/80 dark:bg-[#181716]/95 dark:text-stone-100 sm:px-6 sm:py-3.5">
      {/* Left Logo / Branding */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="shrink-0 rounded-xl bg-stone-900 p-2 text-stone-50 shadow-sm dark:bg-amber-600 dark:text-stone-950">
          <LayoutDashboard className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="truncate font-sans text-sm font-bold tracking-tight text-stone-900 dark:text-stone-100 sm:text-base">
              Yönetim Paneli
            </h1>
            <span className="hidden sm:inline-block text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
              CMS
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-stone-500 dark:text-stone-400">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupabaseConfigured ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className={`hidden truncate font-medium sm:inline ${isSupabaseConfigured ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                {isSupabaseConfigured ? 'Supabase Canlı Veritabanı' : 'Yerel Depolama (Demo)'}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="min-h-10 min-w-10 rounded-xl border border-stone-200 bg-white p-2.5 text-stone-700 shadow-sm transition-colors hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
          title={theme === 'light' ? 'Koyu Temaya Geç' : 'Açık Bej Temaya Geç'}
          aria-label="Tema Değiştir"
        >
          {theme === 'light' ? (
            <Moon className="w-4 h-4 text-stone-700" />
          ) : (
            <Sun className="w-4 h-4 text-amber-400" />
          )}
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`relative min-h-10 min-w-10 rounded-xl border p-2.5 transition-all ${
              unreadCount > 0
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 shadow-sm'
                : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
            }`}
            title="Gelen Mesaj Bildirimleri"
          >
            <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-600 dark:text-amber-400' : ''}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Panel */}
          {showDropdown && (
            <div className="absolute right-0 mt-3 w-[calc(100vw-1.5rem)] max-w-96 space-y-3 rounded-2xl border border-stone-200 bg-white p-4 text-stone-900 shadow-xl animate-fadeIn dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
              <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-stone-800 dark:text-stone-200">
                    Bildirimler ({unreadCount})
                  </span>
                </div>
                <button
                  onClick={() => setShowDropdown(false)}
                  className="text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 text-xs p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Unread List */}
              <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
                {unreadCount === 0 ? (
                  <div className="py-6 text-center text-stone-400 text-xs font-sans">
                    Okunmamış yeni mesajınız bulunmuyor.
                  </div>
                ) : (
                  unreadMessages.slice(0, 5).map((msg) => (
                    <div
                      key={msg.id}
                      onClick={handleOpenMessages}
                      className="p-3 bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 rounded-xl hover:border-amber-500 cursor-pointer transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-stone-900 dark:text-stone-100 truncate">{msg.name}</span>
                        <span className="text-[10px] text-stone-400">
                          {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold truncate">{msg.subject}</div>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">{msg.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 text-center">
                <button
                  onClick={handleOpenMessages}
                  className="w-full py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Tüm Mesajları İncele ({unreadCount})</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Public Portfolio Preview */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-sm transition-all hover:bg-stone-100 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-800"
        >
          <Eye className="w-4 h-4 text-stone-500 dark:text-stone-400" />
          <span className="hidden sm:inline">Portfolyoyu Gör</span>
        </a>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 shadow-sm transition-all hover:bg-rose-100 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50"
        >
          <LogOut className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span className="hidden sm:inline">Çıkış Yap</span>
        </button>
      </div>
    </header>
  );
};
