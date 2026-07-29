'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { NotificationSettingsEditor } from '@/components/admin/NotificationSettingsEditor';
import { MessagesManager } from '@/components/admin/MessagesManager';
import { VisitorLogsManager } from '@/components/admin/VisitorLogsManager';
import { SocialLinksEditor } from '@/components/admin/SocialLinksEditor';
import { BlockchainCanvasAnimation } from '@/components/admin/BlockchainCanvasAnimation';
import {
  User,
  School,
  BookOpen,
  Search,
  RefreshCw,
  KeyRound,
  Activity,
  Share2,
  GitBranch,
  Mic,
  ListOrdered,
  Users,
  Inbox,
} from 'lucide-react';
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

const VALID_TABS: AdminTab[] = [
  'profile',
  'messages',
  'social',
  'education',
  'publications',
  'projects',
  'conferences',
  'activities',
  'references',
  'seo',
  'visitors',
  'security',
];

function AdminDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = useState<PortfolioData | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('profile');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [unreadMsgCount, setUnreadMsgCount] = useState<number>(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Load theme preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = (localStorage.getItem('admin_theme') as 'light' | 'dark') || 'light';
      setTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_theme', nextTheme);
      if (nextTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  // Sync activeTab with URL search param
  useEffect(() => {
    const tabParam = searchParams?.get('tab') as AdminTab;
    if (tabParam && VALID_TABS.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleSelectTab = (tab: AdminTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  };

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
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') || '' : '';
      await fetch('/api/cms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Admin-Token': token } : {}),
        },
        body: JSON.stringify(updated),
      });
      toast.success('Değişiklikler kaydedildi!');
    } catch (e) {
      toast.success('Yerel depolamaya kaydedildi.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('academic_admin_auth');
      sessionStorage.removeItem('admin_token');
    }
    toast.success('Çıkış yapıldı.');
    router.push('/admin/login');
  };

  if (!data) {
    return (
      <div className="min-h-screen bg-[#f7f5f0] dark:bg-[#121110] flex items-center justify-center text-stone-700 dark:text-stone-300 relative font-sans">
        <BlockchainCanvasAnimation theme={theme} />
        <div className="flex flex-col items-center gap-3 relative z-10 p-8 rounded-2xl bg-white/80 dark:bg-stone-900/80 border border-stone-200 dark:border-stone-800 shadow-lg backdrop-blur-md">
          <RefreshCw className="w-8 h-8 animate-spin text-stone-800 dark:text-amber-500" />
          <span className="text-xs font-semibold text-stone-600 dark:text-stone-400 tracking-wider uppercase">
            Yönetim Paneli Yükleniyor...
          </span>
        </div>
      </div>
    );
  }

  const tabsConfig = [
    { id: 'profile' as AdminTab, label: 'Profil', icon: User },
    { id: 'messages' as AdminTab, label: 'Gelen Mesajlar', icon: Inbox, badge: unreadMsgCount },
    { id: 'social' as AdminTab, label: 'Sosyal Medya', icon: Share2 },
    { id: 'education' as AdminTab, label: 'Eğitim', icon: School },
    { id: 'publications' as AdminTab, label: 'Yayınlar', icon: BookOpen },
    { id: 'projects' as AdminTab, label: 'Projeler', icon: GitBranch },
    { id: 'conferences' as AdminTab, label: 'Sempozyum & Konferans', icon: Mic },
    { id: 'activities' as AdminTab, label: 'Faaliyetler', icon: ListOrdered },
    { id: 'references' as AdminTab, label: 'Referanslar', icon: Users },
    { id: 'seo' as AdminTab, label: 'SEO Ayarları', icon: Search },
    { id: 'visitors' as AdminTab, label: 'Ziyaretçi Analizi', icon: Activity },
    { id: 'security' as AdminTab, label: 'Güvenlik & Giriş', icon: KeyRound },
  ];

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="min-h-screen bg-[#f7f5f0] dark:bg-[#121110] text-stone-900 dark:text-stone-100 font-sans selection:bg-amber-200 dark:selection:bg-amber-900 relative transition-colors duration-300">
        {/* Interactive Mouse Particle Canvas */}
        <BlockchainCanvasAnimation theme={theme} />

        <div className="relative z-10">
          <AdminNavbar
            onLogout={handleLogout}
            onSelectTab={(t) => handleSelectTab(t as AdminTab)}
            theme={theme}
            onToggleTheme={toggleTheme}
          />

          <main className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Navigation Tabs Bar */}
            <div className="flex overflow-x-auto gap-1.5 bg-[#eae6dc] dark:bg-[#1a1917] p-1.5 rounded-2xl border border-stone-300/70 dark:border-stone-800 shadow-sm backdrop-blur-md">
              {tabsConfig.map((tabItem) => {
                const Icon = tabItem.icon;
                const isActive = activeTab === tabItem.id;
                return (
                  <button
                    key={tabItem.id}
                    onClick={() => handleSelectTab(tabItem.id)}
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 relative ${
                      isActive
                        ? 'bg-stone-900 dark:bg-amber-600 text-stone-50 dark:text-stone-950 shadow-md font-extrabold'
                        : 'text-stone-700 dark:text-stone-400 hover:bg-stone-200/80 dark:hover:bg-stone-800/80 hover:text-stone-950 dark:hover:text-stone-100'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tabItem.label}</span>
                    {Boolean(tabItem.badge && tabItem.badge > 0) && (
                      <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full shadow-sm animate-pulse">
                        {tabItem.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab Content Panels */}
            <div className="transition-all duration-200">
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

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <CredentialsEditor />
                  <NotificationSettingsEditor
                    portfolioData={data}
                    onUpdate={(updated) => handleSaveData(updated)}
                  />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f5f0] flex items-center justify-center text-stone-700">
          <RefreshCw className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
