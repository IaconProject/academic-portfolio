'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PortfolioData } from '@/lib/types';
import { getPortfolioData, savePortfolioDataLocally, fetchPortfolioFromSupabase } from '@/lib/cms-store';
import { AdminNavbar } from '@/components/admin/AdminNavbar';
import { ProfileForm } from '@/components/admin/ProfileForm';
import { EducationEditor } from '@/components/admin/EducationEditor';
import { PublicationsEditor } from '@/components/admin/PublicationsEditor';
import { ProjectsEditor } from '@/components/admin/ProjectsEditor';
import { ConferencesEditor } from '@/components/admin/ConferencesEditor';
import { ActivitiesEditor } from '@/components/admin/ActivitiesEditor';
import { ReferencesEditor } from '@/components/admin/ReferencesEditor';
import { SeoEditor } from '@/components/admin/SeoEditor';
import { CredentialsEditor } from '@/components/admin/CredentialsEditor';
import { MessagesManager } from '@/components/admin/MessagesManager';
import { VisitorLogsManager } from '@/components/admin/VisitorLogsManager';
import { SocialLinksEditor } from '@/components/admin/SocialLinksEditor';
import { BlockchainCanvasAnimation } from '@/components/admin/BlockchainCanvasAnimation';
import { User, School, BookOpen, Search, ShieldCheck, RefreshCw, KeyRound, Terminal, Activity, Share2, GitBranch, Mic, ListOrdered, Users, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';

type AdminTab =
  | 'profile'
  | 'messages'
  | 'education'
  | 'publications'
  | 'projects'
  | 'conferences'
  | 'activities'
  | 'references'
  | 'social'
  | 'seo'
  | 'security'
  | 'visitors';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<PortfolioData | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('profile');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState<number>(0);

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

    // Check unread messages count
    fetch('/api/messages?t=' + Date.now())
      .then((res) => res.json())
      .then((resData) => {
        if (typeof resData?.unreadCount === 'number') {
          setUnreadMsgCount(resData.unreadCount);
        }
      })
      .catch(() => {});
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
      toast.success('Değişiklikler sunucuya ve veritabanına kaydedildi!');
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
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-cyan-400 relative">
        <BlockchainCanvasAnimation />
        <div className="flex flex-col items-center gap-3 relative z-10">
          <RefreshCw className="w-10 h-10 animate-spin text-cyan-400" />
          <span className="font-mono text-xs text-slate-400 tracking-widest uppercase animate-pulse">
            INITIALIZING_BLOCKCHAIN_NODE...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-200 font-sans selection:bg-cyan-500 selection:text-black relative">
      {/* Interactive Node Line Canvas Background */}
      <BlockchainCanvasAnimation />

      <div className="relative z-10">
        <AdminNavbar onLogout={handleLogout} />

        <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Terminal Quick Metrics Bar */}
          <div className="bg-slate-950/85 border border-cyan-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 font-mono text-xs backdrop-blur-md shadow-xl">
            <div className="flex items-center gap-2 text-slate-400">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span>NODE_STATUS:</span>
              <span className="text-emerald-400 font-bold">ONLINE</span>
            </div>

            <div className="flex items-center gap-4 text-slate-400 text-[11px]">
              <span>LAST_SYNC: <strong className="text-slate-200">{new Date().toLocaleTimeString()}</strong></span>
              <span className="hidden sm:inline">DATA_HASH: <strong className="text-cyan-400">0x8F9...A3C</strong></span>
            </div>
          </div>

          {/* Cyber Navigation Tabs */}
          <div className="flex overflow-x-auto gap-2 bg-slate-950/90 p-2 rounded-2xl border border-cyan-500/30 shadow-2xl backdrop-blur-md">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs md:text-sm font-mono font-bold transition-all shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span>PROFİL</span>
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs md:text-sm font-mono font-bold transition-all shrink-0 relative ${
                activeTab === 'messages'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-cyan-400'
              }`}
            >
              <Inbox className="w-4 h-4 text-cyan-400" />
              <span>GELEN MESAJLAR</span>
              {unreadMsgCount > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-emerald-500 text-slate-950 text-[10px] font-mono font-extrabold rounded-full animate-pulse shadow-md">
                  {unreadMsgCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('social')}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs md:text-sm font-mono font-bold transition-all shrink-0 ${
                activeTab === 'social'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-cyan-400'
              }`}
            >
              <Share2 className="w-4 h-4 text-pink-400" />
              <span>SOSYAL MEDYA</span>
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
              <span>EĞİTİM</span>
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
              <span>YAYINLAR</span>
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs md:text-sm font-mono font-bold transition-all shrink-0 ${
                activeTab === 'projects'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-cyan-400'
              }`}
            >
              <GitBranch className="w-4 h-4 text-purple-400" />
              <span>PROJELER</span>
            </button>

            <button
              onClick={() => setActiveTab('conferences')}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs md:text-sm font-mono font-bold transition-all shrink-0 ${
                activeTab === 'conferences'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-amber-400'
              }`}
            >
              <Mic className="w-4 h-4 text-amber-400" />
              <span>SEMPOZYUM</span>
            </button>

            <button
              onClick={() => setActiveTab('activities')}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs md:text-sm font-mono font-bold transition-all shrink-0 ${
                activeTab === 'activities'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
              }`}
            >
              <ListOrdered className="w-4 h-4 text-blue-400" />
              <span>FAALİYETLER</span>
            </button>

            <button
              onClick={() => setActiveTab('references')}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs md:text-sm font-mono font-bold transition-all shrink-0 ${
                activeTab === 'references'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-emerald-400'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>REFERANSLAR</span>
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
              <span>SEO</span>
            </button>

            <button
              onClick={() => setActiveTab('visitors')}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-xs md:text-sm font-mono font-bold transition-all shrink-0 ${
                activeTab === 'visitors'
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 font-extrabold'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-cyan-400'
              }`}
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>ZİYARETÇİ LOGLARI</span>
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

          {activeTab === 'messages' && <MessagesManager />}

          {activeTab === 'social' && (
            <SocialLinksEditor
              socialLinks={data.socialLinks || []}
              onSave={(updatedSocial) => handleSaveData({ ...data, socialLinks: updatedSocial })}
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

          {activeTab === 'projects' && (
            <ProjectsEditor
              projects={data.projects || []}
              onSave={(updatedProjects) => handleSaveData({ ...data, projects: updatedProjects })}
            />
          )}

          {activeTab === 'conferences' && (
            <ConferencesEditor
              conferences={data.conferences || []}
              onSave={(updatedConfs) => handleSaveData({ ...data, conferences: updatedConfs })}
            />
          )}

          {activeTab === 'activities' && (
            <ActivitiesEditor
              activities={data.activities || []}
              onSave={(updatedActivities) => handleSaveData({ ...data, activities: updatedActivities })}
            />
          )}

          {activeTab === 'references' && (
            <ReferencesEditor
              references={data.references || []}
              onSave={(updatedRefs) => handleSaveData({ ...data, references: updatedRefs })}
            />
          )}

          {activeTab === 'seo' && (
            <SeoEditor
              seoSettings={data.seoSettings}
              onSave={(updatedSeo) => handleSaveData({ ...data, seoSettings: updatedSeo })}
            />
          )}

          {activeTab === 'visitors' && <VisitorLogsManager />}

          {activeTab === 'security' && <CredentialsEditor />}
        </main>
      </div>
    </div>
  );
}
