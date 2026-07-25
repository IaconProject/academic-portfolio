'use client';

import React, { useEffect, useState } from 'react';
import { ShieldCheck, Eye, LogOut, Cpu, Activity, Bell, Mail, ChevronRight, X } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { ContactMessage } from '@/lib/types';

interface AdminNavbarProps {
  onLogout: () => void;
  onSelectTab?: (tab: string) => void;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({ onLogout, onSelectTab }) => {
  const [unreadMessages, setUnreadMessages] = useState<ContactMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);

  const fetchUnreadMessages = async () => {
    try {
      const res = await fetch('/api/messages?t=' + Date.now());
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
    const interval = setInterval(fetchUnreadMessages, 15000); // Auto refresh every 15s
    return () => clearInterval(interval);
  }, []);

  const handleOpenMessages = () => {
    setShowDropdown(false);
    if (onSelectTab) {
      onSelectTab('messages');
    }
  };

  return (
    <header className="bg-slate-950 text-white px-4 sm:px-6 py-4 border-b border-cyan-500/20 shadow-xl flex items-center justify-between backdrop-blur-md bg-opacity-90 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-cyan-950/60 border border-cyan-500/40 rounded-xl text-cyan-400 shadow-md shadow-cyan-500/10 shrink-0">
          <Cpu className="w-5 h-5 animate-pulse text-cyan-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono font-bold text-sm sm:text-base md:text-lg tracking-wider text-slate-100 uppercase">
              CMS // CYBER_PANEL
            </h1>
            <span className="hidden sm:inline-block text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
              v2.5_BLOCKCHAIN
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2 font-mono">
            <span className="flex items-center gap-1">
              <span
                className={`w-2 h-2 rounded-full animate-ping ${
                  isSupabaseConfigured ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className={isSupabaseConfigured ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                {isSupabaseConfigured ? 'SUPABASE_SYNC: ACTIVE' : 'LOCAL_STORE: DEMO_MODE'}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`relative p-2.5 rounded-xl border transition-all ${
              unreadCount > 0
                ? 'bg-slate-900 border-cyan-500/40 text-cyan-400 hover:border-cyan-400 shadow-lg shadow-cyan-500/10'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Gelen Mesaj Bildirimleri"
          >
            <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'animate-bounce text-cyan-400' : ''}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-slate-950 text-[10px] font-mono font-extrabold px-1.5 py-0.5 rounded-full animate-pulse shadow-md">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Dropdown Panel */}
          {showDropdown && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-slate-950 border border-cyan-500/40 rounded-2xl shadow-2xl p-4 space-y-3 font-mono text-slate-100 z-50 backdrop-blur-xl animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
                    BİLDİRİMLER ({unreadCount})
                  </span>
                </div>
                <button
                  onClick={() => setShowDropdown(false)}
                  className="text-slate-400 hover:text-slate-100 text-xs p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Unread List */}
              <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
                {unreadCount === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    Okunmamış yeni mesajınız bulunmuyor.
                  </div>
                ) : (
                  unreadMessages.slice(0, 5).map((msg) => (
                    <div
                      key={msg.id}
                      onClick={handleOpenMessages}
                      className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl hover:border-cyan-400 cursor-pointer transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200 truncate">{msg.name}</span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="text-[11px] text-cyan-400 font-semibold truncate">{msg.subject}</div>
                      <p className="text-[11px] text-slate-400 truncate font-sans">{msg.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-2 border-t border-slate-800 text-center">
                <button
                  onClick={handleOpenMessages}
                  className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                >
                  <span>TÜM MESAJLARI İNCELE ({unreadCount})</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-mono font-semibold rounded-xl transition-all border border-cyan-500/30 hover:border-cyan-400 shadow-sm"
        >
          <Eye className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Portfolyo Önizle</span>
        </a>

        <button
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-mono font-semibold rounded-xl transition-all border border-red-500/30 shadow-sm"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span className="hidden sm:inline">Çıkış Yap</span>
        </button>
      </div>
    </header>
  );
};
