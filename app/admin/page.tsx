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
import { User, School, BookOpen, Search, ShieldCheck, RefreshCw, KeyRound } from 'lucide-react';
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
      toast.success('Değişiklikler başarıyla kaydedildi!');
    } catch (e) {
      toast.success('Yerel hafızaya kaydedildi.');
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
      <div className="min-h-screen bg-academic-bg flex items-center justify-center text-academic-navy">
        <RefreshCw className="w-8 h-8 animate-spin text-academic-navy" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-academic-bg text-slate-800 font-sans">
      <AdminNavbar onLogout={handleLogout} />

      <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto gap-2 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'profile'
                ? 'bg-academic-navy text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profil & Biyografi</span>
          </button>

          <button
            onClick={() => setActiveTab('education')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'education'
                ? 'bg-academic-navy text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <School className="w-4 h-4" />
            <span>Eğitim Geçmişi</span>
          </button>

          <button
            onClick={() => setActiveTab('publications')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'publications'
                ? 'bg-academic-navy text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Yayınlar & Makaleler</span>
          </button>

          <button
            onClick={() => setActiveTab('seo')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'seo'
                ? 'bg-academic-navy text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>SEO & Sosyal Medya</span>
          </button>

          <button
            onClick={() => setActiveTab('security')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs md:text-sm font-bold transition-all shrink-0 ${
              activeTab === 'security'
                ? 'bg-academic-navy text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <KeyRound className="w-4 h-4 text-amber-500" />
            <span>Güvenlik & Giriş</span>
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
