'use client';

import React, { useEffect, useState } from 'react';
import { VisitorSession } from '@/lib/types';
import {
  Activity,
  RefreshCw,
  Search,
  Download,
  Trash2,
  ChevronRight,
  Route,
  Compass,
  Zap,
  CheckSquare,
  Square,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const VisitorLogsManager: React.FC = () => {
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterType, setFilterType] = useState<'all' | 'mobile' | 'active' | 'desktop'>('all');
  const [selectedSession, setSelectedSession] = useState<VisitorSession | null>(null);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const adminHeaders = (json = false) => {
    const token = sessionStorage.getItem('admin_token') || '';
    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'X-Admin-Token': token } : {}),
    };
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/visitors?t=' + Date.now(), {
        headers: adminHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.sessions) {
          setSessions(data.sessions);
          setStats(data.stats);
        }
      }
    } catch (e) {
      toast.error('Ziyaretçi logları çekilemedi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 20000);
    return () => clearInterval(interval);
    // The polling function reads the current admin token on every request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteSession = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    setSessions((prev) => prev.filter((s) => s.id !== id && s.sessionId !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));

    if (selectedSession?.id === id || selectedSession?.sessionId === id) {
      setSelectedSession(null);
    }
    toast.success('Oturum silindi.');

    try {
      await fetch(`/api/visitors?id=${id}`, {
        method: 'DELETE',
        headers: adminHeaders(),
      });
    } catch (e) {}
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    const count = selectedIds.length;
    const deleteSet = new Set(selectedIds);

    setSessions((prev) => prev.filter((s) => !deleteSet.has(s.id)));
    setSelectedIds([]);

    if (selectedSession && deleteSet.has(selectedSession.id)) {
      setSelectedSession(null);
    }

    toast.success(`${count} adet oturum silindi.`);

    try {
      await fetch('/api/visitors', {
        method: 'DELETE',
        headers: adminHeaders(true),
        body: JSON.stringify({ ids: Array.from(deleteSet) }),
      });
    } catch (e) {}
  };

  const handleClearAll = async () => {
    setSessions([]);
    setStats(null);
    setSelectedSession(null);
    setSelectedIds([]);
    toast.success('Tüm loglar silindi.');

    try {
      await fetch('/api/visitors?clearAll=true', {
        method: 'DELETE',
        headers: adminHeaders(),
      });
    } catch (e) {}
  };

  const handleToggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredSessions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSessions.map((s) => s.id));
    }
  };

  const handleExportCSV = () => {
    if (sessions.length === 0) {
      toast.error('İndirilecek oturum verisi yok.');
      return;
    }

    const headers = [
      'Oturum ID',
      'Tarih',
      'Son Aktivite',
      'IP Adresi',
      'Ülke',
      'Şehir',
      'Servis Sağlayıcı (ISP)',
      'Mobil Ağ',
      'Cihaz Tipi',
      'Cihaz Markası',
      'Cihaz Modeli',
      'İşletim Sistemi',
      'Tarayıcı',
      'Gezilen Sayfa Sayısı',
      'Gezinti Yolu',
    ];

    const rows = sessions.map((s) => {
      const journeyStr = (s.pages || []).map((p) => `${p.path} (${new Date(p.timestamp).toLocaleTimeString()})`).join(' -> ');
      return [
        s.id,
        new Date(s.createdAt).toLocaleString('tr-TR'),
        new Date(s.updatedAt).toLocaleString('tr-TR'),
        s.ip,
        `"${s.country}"`,
        `"${s.city}"`,
        `"${s.isp.replace(/"/g, '""')}"`,
        s.isMobileNetwork ? 'Evet' : 'Hayır',
        s.deviceType,
        `"${s.deviceBrand}"`,
        `"${s.deviceModel}"`,
        `"${s.osName} ${s.osVersion}"`,
        `"${s.browserName} ${s.browserVersion}"`,
        (s.pages || []).length,
        `"${journeyStr.replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ziyaretci_oturum_loglari_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('Oturum logları CSV olarak indirildi.');
  };

  const fifteenMinsAgo = Date.now() - 15 * 60 * 1000;
  const filteredSessions = sessions.filter((s) => {
    if (filterType === 'mobile') {
      const isMob = s.deviceType === 'Mobile' || s.deviceType === 'Tablet' || s.isMobileNetwork;
      if (!isMob) return false;
    }
    if (filterType === 'desktop') {
      if (s.deviceType !== 'Desktop' && s.deviceType !== 'Tablet') return false;
    }
    if (filterType === 'active') {
      const updated = new Date(s.updatedAt || s.createdAt).getTime();
      if (updated < fifteenMinsAgo) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const journeyMatch = (s.pages || []).some((p) => p.path.toLowerCase().includes(q) || p.title.toLowerCase().includes(q));
      return (
        s.ip.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.country.toLowerCase().includes(q) ||
        s.isp.toLowerCase().includes(q) ||
        s.deviceBrand.toLowerCase().includes(q) ||
        s.deviceModel.toLowerCase().includes(q) ||
        s.osName.toLowerCase().includes(q) ||
        s.browserName.toLowerCase().includes(q) ||
        journeyMatch
      );
    }
    return true;
  });

  const isAllSelected = filteredSessions.length > 0 && selectedIds.length === filteredSessions.length;

  return (
    <div className="bg-white/90 dark:bg-stone-900/90 p-6 md:p-8 rounded-2xl border border-stone-200/80 dark:border-stone-800 shadow-md backdrop-blur-md space-y-6 transition-colors duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
              Ziyaretçi Takip & Cihaz Analitiği
            </h2>
            {stats?.activeNow > 0 && (
              <span className="px-2.5 py-0.5 bg-emerald-600 text-white text-xs font-bold rounded-full shadow-sm flex items-center gap-1">
                <Zap className="w-3 h-3 fill-white" />
                <span>{stats.activeNow} Canlı</span>
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Oturum bazlı ziyaretçi akışı, kronolojik sayfa gezinti haritası ve cihaz donanım analitiği.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
            >
              <Trash2 className="w-4 h-4" />
              <span>Seçilenleri Sil ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={fetchLogs}
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

      {/* Analytics Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 font-sans">
        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 rounded-xl space-y-1">
          <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold">Gezilen Sayfa</span>
          <div className="text-xl font-bold text-stone-900 dark:text-stone-100">{stats?.totalVisits || 0}</div>
        </div>

        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 rounded-xl space-y-1">
          <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold">Tekil Ziyaretçi</span>
          <div className="text-xl font-bold text-stone-900 dark:text-stone-100">{stats?.uniqueVisitors || 0}</div>
        </div>

        <div className="p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 rounded-xl space-y-1">
          <span className="text-[10px] text-emerald-800 dark:text-emerald-400 uppercase font-bold">Şu An Canlı</span>
          <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{stats?.activeNow || 0}</span>
          </div>
        </div>

        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 rounded-xl space-y-1">
          <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold">En Çok Şehir</span>
          <div className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
            {stats?.topCities?.[0]?.name || 'Eskişehir'}
          </div>
        </div>

        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 rounded-xl space-y-1">
          <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold">Top Cihaz</span>
          <div className="text-xs font-bold text-amber-700 dark:text-amber-400 truncate">
            {stats?.topDevices?.[0]?.name || 'iPhone'}
          </div>
        </div>

        <div className="p-3.5 bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 rounded-xl space-y-1">
          <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase font-bold">Top Operatör</span>
          <div className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate">
            {stats?.topISPs?.[0]?.name || 'Turkcell'}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 font-sans">
        <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 p-1 rounded-xl border border-stone-200 dark:border-stone-700 shrink-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterType === 'all' ? 'bg-stone-900 dark:bg-amber-600 text-stone-50 dark:text-stone-950' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            Tümü ({sessions.length})
          </button>
          <button
            onClick={() => setFilterType('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterType === 'active' ? 'bg-emerald-600 text-white' : 'text-stone-600 dark:text-stone-400 hover:text-emerald-600'
            }`}
          >
            Canlı Aktif ({stats?.activeNow || 0})
          </button>
          <button
            onClick={() => setFilterType('mobile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterType === 'mobile' ? 'bg-stone-900 dark:bg-amber-600 text-stone-50 dark:text-stone-950' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Mobil / GSM
          </button>
          <button
            onClick={() => setFilterType('desktop')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterType === 'desktop' ? 'bg-stone-900 dark:bg-amber-600 text-stone-50 dark:text-stone-950' : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
            }`}
          >
            Masaüstü
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="IP, şehir, operatör veya cihazda ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-stone-100 focus:border-stone-900 dark:focus:border-amber-400 outline-none"
          />
        </div>
      </div>

      {/* Selection Control Bar */}
      {filteredSessions.length > 0 && (
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-stone-400 pt-1 border-t border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="inline-flex items-center gap-1.5 text-stone-800 dark:text-stone-200 hover:text-stone-950 font-bold transition-colors"
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Tüm Seçimleri Kaldır</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-stone-400" />
                  <span>Tümünü Seç ({filteredSessions.length})</span>
                </>
              )}
            </button>
            {selectedIds.length > 0 && (
              <span className="text-stone-700 dark:text-stone-300 font-bold">
                ({selectedIds.length} oturum seçildi)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span>Gösterilen: <strong className="text-stone-800 dark:text-stone-200">{filteredSessions.length}</strong> / {sessions.length}</span>
            <button
              onClick={handleClearAll}
              className="hover:text-rose-600 inline-flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Tüm Logları Temizle</span>
            </button>
          </div>
        </div>
      )}

      {/* Sessions List Cards */}
      <div className="space-y-3 font-sans">
        {loading ? (
          <div className="p-12 text-center text-stone-400 text-xs flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-600 dark:text-amber-400" />
            <span>Oturum logları yükleniyor...</span>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 text-center bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-500 text-xs">
            {searchQuery ? 'Aramanıza uygun ziyaretçi oturumu bulunamadı.' : 'Henüz kaydedilmiş ziyaretçi oturumu bulunmuyor.'}
          </div>
        ) : (
          filteredSessions.map((sess) => {
            const pageSteps = Array.isArray(sess.pages) ? sess.pages : [];
            const isLive = new Date(sess.updatedAt || sess.createdAt).getTime() >= fifteenMinsAgo;
            const isSelected = selectedIds.includes(sess.id);

            return (
              <div
                key={sess.id}
                onClick={() => setSelectedSession(sess)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isSelected
                    ? 'bg-amber-50/80 dark:bg-stone-800 border-amber-500 shadow-md'
                    : isLive
                    ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 hover:border-emerald-400'
                    : 'bg-stone-50/60 dark:bg-stone-800/40 border-stone-200/80 dark:border-stone-700/60 hover:border-stone-400'
                }`}
              >
                {/* Left Selection Checkbox & Info Column */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    onClick={(e) => handleToggleSelect(sess.id, e)}
                    className="pt-0.5 text-stone-400 hover:text-amber-600 transition-colors shrink-0"
                    title="Seç"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Square className="w-5 h-5 text-stone-400" />
                    )}
                  </button>

                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-stone-900 dark:text-stone-100 text-sm font-mono">{sess.ip}</span>
                      {isLive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          CANLI AKTİF
                        </span>
                      )}
                      <span className="text-[10px] font-bold bg-stone-200 dark:bg-stone-800 text-stone-800 dark:text-stone-200 px-2 py-0.5 rounded">
                        📍 {sess.city}, {sess.countryCode}
                      </span>
                      <span className="text-[10px] font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-2 py-0.5 rounded border border-stone-200 dark:border-stone-700">
                        ⚡ {sess.isp}
                      </span>
                    </div>

                    {/* Device & OS */}
                    <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400 flex-wrap">
                      <span className="text-amber-700 dark:text-amber-400 font-semibold">📱 {sess.deviceBrand} ({sess.deviceModel})</span>
                      <span>•</span>
                      <span className="text-stone-700 dark:text-stone-300 font-semibold">💻 {sess.osName} {sess.osVersion} / {sess.browserName}</span>
                    </div>

                    {/* Navigation Steps Preview */}
                    <div className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300 pt-1">
                      <Route className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span className="font-bold">{pageSteps.length} Sayfa Gezindi:</span>
                      <div className="flex items-center gap-1.5 overflow-hidden text-[11px]">
                        {pageSteps.slice(0, 3).map((step, idx) => (
                          <span key={idx} className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 px-2 py-0.5 rounded text-stone-700 dark:text-stone-300 font-mono">
                            {step.path}
                          </span>
                        ))}
                        {pageSteps.length > 3 && (
                          <span className="text-amber-700 dark:text-amber-400 font-bold">+{pageSteps.length - 3} daha</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Action Column */}
                <div className="flex items-center gap-3 shrink-0 justify-between md:justify-end border-t md:border-t-0 border-stone-200 dark:border-stone-800 pt-2 md:pt-0">
                  <div className="text-right text-[11px] text-stone-500 dark:text-stone-400 space-y-0.5">
                    <div>{new Date(sess.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="text-[10px] text-stone-400">Giriş Yapıldı</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSession(sess)}
                      className="inline-flex items-center gap-1 py-1.5 px-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-bold rounded-lg border border-stone-200 dark:border-stone-700"
                    >
                      <span>Gezinti Akışı</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleDeleteSession(sess.id, e)}
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Session Journey Drawer Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl font-sans text-stone-900 dark:text-stone-100 max-h-[90vh] overflow-y-auto relative">
            <div className="flex items-start justify-between gap-4 border-b border-stone-100 dark:border-stone-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Oturum Gezinti Akışı</span>
                </div>
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 mt-1 flex items-center gap-2 font-mono">
                  <span>{selectedSession.ip}</span>
                  <span className="text-xs font-sans text-stone-500 font-normal">({selectedSession.city}, {selectedSession.country})</span>
                </h3>
              </div>

              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-bold"
              >
                ✕ Kapat
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-4 bg-stone-50 dark:bg-stone-800/80 border border-stone-200/80 dark:border-stone-700/80 rounded-xl">
              <div>
                <span className="text-stone-400 text-[10px] uppercase font-bold block">SERVİS SAĞLAYICI</span>
                <span className="text-stone-800 dark:text-stone-200 font-bold">{selectedSession.isp}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] uppercase font-bold block">CİHAZ MARKA / MODEL</span>
                <span className="text-amber-700 dark:text-amber-400 font-bold">{selectedSession.deviceBrand} ({selectedSession.deviceModel})</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] uppercase font-bold block">İŞLETİM SİSTEMİ</span>
                <span className="text-stone-800 dark:text-stone-200 font-bold">{selectedSession.osName} {selectedSession.osVersion}</span>
              </div>
              <div>
                <span className="text-stone-400 text-[10px] uppercase font-bold block">TARAYICI</span>
                <span className="text-stone-800 dark:text-stone-200 font-bold">{selectedSession.browserName} {selectedSession.browserVersion}</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4" />
                <span>Kronolojik Sayfa Gezinti Yolu</span>
              </h4>

              <div className="relative pl-6 border-l-2 border-amber-300 dark:border-amber-700 space-y-4 pt-2">
                {(selectedSession.pages || []).map((step, idx) => {
                  const stepTime = new Date(step.timestamp);
                  const isFirst = idx === 0;
                  const isLast = idx === (selectedSession.pages || []).length - 1;

                  return (
                    <div key={idx} className="relative group">
                      <span className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isFirst
                          ? 'bg-emerald-500 border-emerald-400'
                          : isLast
                          ? 'bg-amber-500 border-amber-400'
                          : 'bg-stone-300 dark:bg-stone-700 border-stone-400'
                      }`} />

                      <div className="p-3.5 bg-stone-50 dark:bg-stone-800/90 border border-stone-200 dark:border-stone-700 rounded-xl space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-stone-900 dark:text-stone-100">{step.path}</span>
                            <span className="text-[10px] text-stone-400">({step.title})</span>
                          </div>
                          <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold font-mono">
                            {stepTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>

                        {isFirst && (
                          <span className="inline-block text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 mt-1">
                            🏁 Siteye Giriş Adımı
                          </span>
                        )}
                        {isLast && (
                          <span className="inline-block text-[10px] text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 mt-1">
                            📍 Son Görüntülenen Adım
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center">
              <button
                onClick={() => handleDeleteSession(selectedSession.id)}
                className="py-2 px-4 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-900/50"
              >
                Sil
              </button>

              <button
                onClick={() => setSelectedSession(null)}
                className="py-2 px-5 bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-stone-50 dark:text-stone-950 text-xs font-bold rounded-xl shadow-md"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
