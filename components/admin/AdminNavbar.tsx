'use client';

import React from 'react';
import { ShieldCheck, Eye, LogOut, Cpu, Activity } from 'lucide-react';
import { isSupabaseConfigured } from '@/lib/supabase/client';

interface AdminNavbarProps {
  onLogout: () => void;
}

export const AdminNavbar: React.FC<AdminNavbarProps> = ({ onLogout }) => {
  return (
    <header className="bg-slate-950 text-white px-6 py-4 border-b border-cyan-500/20 shadow-xl flex items-center justify-between backdrop-blur-md bg-opacity-90 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-cyan-950/60 border border-cyan-500/40 rounded-xl text-cyan-400 shadow-md shadow-cyan-500/10">
          <Cpu className="w-5 h-5 animate-pulse text-cyan-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-mono font-bold text-base md:text-lg tracking-wider text-slate-100 uppercase">
              CMS // CYBER_PANEL
            </h1>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/30">
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
            <span className="text-slate-600">|</span>
            <span className="text-slate-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-cyan-400" /> SYS_ENCRYPTION: SECURE
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 text-xs font-mono font-semibold rounded-xl transition-all border border-cyan-500/30 hover:border-cyan-400 shadow-sm"
        >
          <Eye className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Portfolyo Önizle</span>
        </a>

        <button
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-950/40 hover:bg-red-900/60 text-red-300 text-xs font-mono font-semibold rounded-xl transition-all border border-red-500/30 shadow-sm"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span className="hidden sm:inline">Oturumu Kapat</span>
        </button>
      </div>
    </header>
  );
};
