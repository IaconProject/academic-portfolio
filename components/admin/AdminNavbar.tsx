'use client';

import React from 'react';
import { ShieldCheck, Eye, LogOut, Database } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';

interface AdminNavbarProps {
  onLogout: () => void;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({ onLogout }) => {
  return (
    <header className="bg-academic-navy text-white px-6 py-4 border-b border-white/10 shadow-md flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-white/10 rounded-lg text-amber-400">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-serif font-bold text-lg leading-none">
            Yönetim Paneli (CMS)
          </h1>
          <p className="text-[11px] text-slate-300 mt-1 flex items-center gap-1.5 font-mono">
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseConfigured ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span>
              {isSupabaseConfigured
                ? 'Supabase Veritabanı Aktif'
                : 'Yerel Depolama (Demo Modu)'}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white/10 hover:bg-white/20 text-xs font-semibold rounded-lg transition-colors border border-white/10"
        >
          <Eye className="w-4 h-4 text-slate-300" />
          <span className="hidden sm:inline">Canlı Siteyi Gör</span>
        </a>

        <button
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-semibold rounded-lg transition-colors border border-red-500/30"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Çıkış Yap</span>
        </button>
      </div>
    </header>
  );
};
