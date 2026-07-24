'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortfolioData } from '@/lib/types';
import { getPortfolioData, savePortfolioDataLocally, fetchPortfolioFromSupabase } from '@/lib/cms-store';
import { AdminNavbar } from '@/components/admin/AdminNavbar';
import { ProfileForm } from '@/components/admin/ProfileForm';
import { EducationEditor } from '@/components/admin/EducationEditor';
import { PublicationsEditor } from '@/components/admin/PublicationsEditor';
import { SeoEditor } from '@/components/admin/SeoEditor';
import { CredentialsEditor } from '@/components/admin/CredentialsEditor';
import { User, School, BookOpen, Search, ShieldCheck, RefreshCw, KeyRound, Terminal, Lock, Database } from 'lucide-react';
import toast from 'react-hot-toast';

type AdminTab = 'profile' | 'education' | 'publications' | 'seo' | 'security';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('profile');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    // Auth Check
    if (typeof window !== 'undefined') {
      const isAuth = sessionStorage.getItem('academic_admin_auth');
      if (!isAuth) {
        router.push('/admin/login');
        return;
      }
    }

    // Load initial CMS data
    const local = getPortfolioData();
    setData(local);

    // Sync from Supabase
    fetchPortfolioFromSupabase().then((remote) => {
      if (remote) setData(remote);
    });
  }, [router]);

  const handleSaveData = async (updated: PortfolioData) => {
    setIsSaving(true);
    setData(updated);
    savePortfolioDataLocally(updated);

    try {
      await fetch('/api/cms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      toast.success('Değişiklikler sunucuya ve Supabase veritabanına senkronize edildi!');
    } catch (e) {
      toast.success('Yerel depolamaya kaydedildi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('academic_admin_auth');
    }
    toast.success('Çıkış yapıldı.');
    router.push('/admin/login');
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-cyan-400">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-10 h-10 animate-spin text-cyan-400" />
          <span className="font-mono text-xs text-slate-400 tracking-widest uppercase animate-pulse">
            LOADING_CYBER_CMS_NODE...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-200 font-sans selection:bg-cyan-500 selection:text-black">
      <AdminNavbar onLogout={handleLogout} />

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Terminal Quick Metrics Bar */}
        <div className="bg-slate-950/80 border border-cyan-500/20 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 font-mono text-xs backdrop-blur-md">
          <div className="flex items-center gap-2 text-slate-400">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>NODE_STATUS:</span>
            <span className="text-emerald-400 font-semibold">ONLINE</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span>LAST_BUILD: <strong className="text-slate-200">{new Date().toLocaleTimeString()}</strong></span>
            <span className="hidden sm:inline">DATA_HASH: <strong className="text-cyan-400">0x8F9...A3C</strong></span>
          </div>
        </div>

        {/* Cyber Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 bg-slate-950/90 p-2 rounded-2xl border border-cyan-500/20 shadow-xl backdrop-blur-md">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs md:text-sm font-mono font-bold transition-all shrink-0 ${
              activeTab === 'profile'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" />
            <span>PROFİL & BİYOGRAFİ</span>
          </button>

          <button
            onClick={() => setActiveTab('education')}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs md:text-sm font-mono font-bold transition-all shrink-0 ${
              activeTab === 'education'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <School className="w-4 h-4" />
            <span>EĞİTİM GEÇMİŞİ</span>
          </button>

          <button
            onClick={() => setActiveTab('publications')}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs md:text-sm font-mono font-bold transition-all shrink-0 ${
              activeTab === 'publications'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>YAYINLAR & MAKALELER</span>
          </button>

          <button
            onClick={() => setActiveTab('seo')}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs md:text-sm font-mono font-bold transition-all shrink-0 ${
              activeTab === 'seo'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold'
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>SEO & SOSYAL MEDYA</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs md:text-sm font-mono font-bold transition-all shrink-0 ${
              activeTab === 'security'
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20 font-extrabold'
                : 'text-slate-400 hover:bg-slate-900 hover:text-emerald-400'
            }`}
          >
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <span>GÜVENLİK & GİRİŞ</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <ProfileForm
            profile={data.profile}
            onSave={(updatedProfile) => handleSaveData({ ...data, profile: updatedProfile })}
          />
        )}

        {activeTab === 'education' && (
          <EducationEditor
            education={data.education}
            onSave={(updatedEducation) => handleSaveData({ ...data, education: updatedEducation })}
          />
        )}

        {activeTab === 'publications' && (
          <PublicationsEditor
            publications={data.publications}
            onSave={(updatedPubs) => handleSaveData({ ...data, publications: updatedPubs })}
          />
        )}

        {activeTab === 'seo' && (
          <SeoEditor
            seoSettings={data.seoSettings}
            onSave={(updatedSeo) => handleSaveData({ ...data, seoSettings: updatedSeo })}
          />
        )}

        {activeTab === 'security' && <CredentialsEditor />}
      </main>
    </div>
  );
}
