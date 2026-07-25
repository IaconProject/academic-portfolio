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

  // Multi-select batch deletion state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/visitors?t=' + Date.now());
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
    const interval = setInterval(fetchLogs, 20000); // Auto-refresh every 20s
    return () => clearInterval(interval);
  }, []);

  // Instant Single Delete (No confirmation alert!)
  const handleDeleteSession = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    setSessions((prev) => prev.filter((s) => s.id !== id && s.sessionId !== id));
    setSelectedIds((prev) => prev.filter((item) => item !== id));

    if (selectedSession?.id === id || selectedSession?.sessionId === id) {
      setSelectedSession(null);
    }
    toast.success('Oturum silindi.');

    try {
      await fetch(`/api/visitors?id=${id}`, { method: 'DELETE' });
    } catch (e) {}
  };

  // Instant Batch Delete for selected checkboxes (No confirmation alert!)
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
        headers: { 'Content-Type': 'application/json' },
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
      await fetch('/api/visitors?clearAll=true', { method: 'DELETE' });
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

  // Filtered list
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
    <div className="bg-slate-950/80 p-6 md:p-8 rounded-2xl border border-cyan-500/20 shadow-2xl backdrop-blur-md space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-cyan-400" />
            <h2 className="text-xl font-mono font-bold text-slate-100 uppercase tracking-wider">
              Ziyaretçi Takip & Cihaz Analitiği
            </h2>
            {stats?.activeNow > 0 && (
              <span className="px-2.5 py-0.5 bg-emerald-500 text-slate-950 text-xs font-mono font-extrabold rounded-full animate-pulse shadow-lg shadow-emerald-500/20 flex items-center gap-1">
                <Zap className="w-3 h-3 fill-slate-950" />
                <span>{stats.activeNow} CANLI</span>
              </span>
            )}
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Oturum bazlı ziyaretçi akışı, kronolojik sayfa gezinti haritası ve cihaz donanım analitiği.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Batch Delete Action Button */}
          {selectedIds.length > 0 && (
            <button
              onClick={handleBatchDelete}
              className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-extrabold rounded-xl transition-all shadow-lg shadow-red-600/30 animate-pulse"
            >
              <Trash2 className="w-4 h-4" />
              <span>SEÇİLENLERİ SİL ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition-colors"
            title="Yenile"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs font-mono font-bold rounded-xl border border-slate-800 transition-colors"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>CSV İNDİR</span>
          </button>
        </div>
      </div>

      {/* Analytics Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 font-mono">
        <div className="p-3.5 bg-slate-900/80 border border-cyan-500/30 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold">GEZİLEN SAYFA</span>
          <div className="text-xl font-bold text-cyan-400">{stats?.totalVisits || 0}</div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold">TEKİL ZİYARETÇİ</span>
          <div className="text-xl font-bold text-slate-100">{stats?.uniqueVisitors || 0}</div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-emerald-500/30 rounded-xl space-y-1">
          <span className="text-[10px] text-emerald-400 uppercase font-bold">ŞU AN CANLI</span>
          <div className="text-xl font-bold text-emerald-400 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{stats?.activeNow || 0}</span>
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold">EN ÇOK ŞEHİR</span>
          <div className="text-xs font-bold text-slate-200 truncate">
            {stats?.topCities?.[0]?.name || 'Eskişehir'}
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold">TOP CİHAZ</span>
          <div className="text-xs font-bold text-amber-400 truncate">
            {stats?.topDevices?.[0]?.name || 'iPhone'}
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-xl space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-bold">TOP OPERATÖR</span>
          <div className="text-xs font-bold text-purple-400 truncate">
            {stats?.topISPs?.[0]?.name || 'Turkcell'}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterType === 'all' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            TÜMÜ ({sessions.length})
          </button>
          <button
            onClick={() => setFilterType('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterType === 'active' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400 hover:text-emerald-400'
            }`}
          >
            CANLI AKTİF ({stats?.activeNow || 0})
          </button>
          <button
            onClick={() => setFilterType('mobile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterType === 'mobile' ? 'bg-purple-500 text-slate-950' : 'text-slate-400 hover:text-purple-400'
            }`}
          >
            MOBİL / GSM
          </button>
          <button
            onClick={() => setFilterType('desktop')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterType === 'desktop' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-amber-400'
            }`}
          >
            MASAÜSTÜ
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="IP, şehir, operatör, cihaz veya sayfada ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs font-mono text-slate-100 focus:border-cyan-400 outline-none"
          />
        </div>
      </div>

      {/* Selection Control Bar */}
      {filteredSessions.length > 0 && (
        <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-1 border-t border-slate-800/60">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="w-4 h-4 text-cyan-400" />
                  <span>TÜM SEÇİMLERİ KALDIR</span>
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 text-slate-500" />
                  <span>TÜMÜNÜ SEÇ ({filteredSessions.length})</span>
                </>
              )}
            </button>
            {selectedIds.length > 0 && (
              <span className="text-slate-300 font-bold">
                ({selectedIds.length} oturum seçildi)
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span>Gösterilen: <strong className="text-slate-200">{filteredSessions.length}</strong> / {sessions.length}</span>
            <button
              onClick={handleClearAll}
              className="hover:text-red-400 inline-flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Tüm Logları Temizle</span>
            </button>
          </div>
        </div>
      )}

      {/* Sessions List Cards */}
      <div className="space-y-3 font-mono">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
            <span>OTURUM LOGLARI YÜKLENİYOR...</span>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-500 text-xs">
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
                    ? 'bg-slate-900 border-cyan-400 ring-1 ring-cyan-400/50 shadow-lg shadow-cyan-500/10'
                    : isLive
                    ? 'bg-slate-900/90 border-emerald-500/40 shadow-lg shadow-emerald-500/5 hover:border-emerald-400'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-cyan-500/30'
                }`}
              >
                {/* Left Selection Checkbox & Info Column */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {/* Checkbox */}
                  <button
                    onClick={(e) => handleToggleSelect(sess.id, e)}
                    className="pt-0.5 text-slate-500 hover:text-cyan-400 transition-colors shrink-0"
                    title="Seç"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-cyan-400 fill-cyan-950" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-600 hover:text-slate-400" />
                    )}
                  </button>

                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-100 text-sm">{sess.ip}</span>
                      {isLive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-950 text-emerald-400 px-2 py-0.5 border border-emerald-500/30 rounded">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          CANLI AKTİF
                        </span>
                      )}
                      <span className="text-[10px] font-bold bg-cyan-950 text-cyan-300 px-2 py-0.5 border border-cyan-500/30 rounded">
                        📍 {sess.city}, {sess.countryCode}
                      </span>
                      <span className="text-[10px] font-bold bg-slate-900 text-slate-300 px-2 py-0.5 border border-slate-800 rounded">
                        ⚡ {sess.isp}
                      </span>
                    </div>

                    {/* Device & OS */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span className="text-amber-400 font-semibold">📱 {sess.deviceBrand} ({sess.deviceModel})</span>
                      <span>•</span>
                      <span className="text-cyan-300 font-semibold">💻 {sess.osName} {sess.osVersion} / {sess.browserName}</span>
                    </div>

                    {/* Navigation Steps Preview */}
                    <div className="flex items-center gap-2 text-xs text-slate-300 pt-1">
                      <Route className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="font-bold text-cyan-400">{pageSteps.length} Sayfa Gezindi:</span>
                      <div className="flex items-center gap-1.5 overflow-hidden text-[11px] text-slate-400">
                        {pageSteps.slice(0, 3).map((step, idx) => (
                          <span key={idx} className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                            {step.path}
                          </span>
                        ))}
                        {pageSteps.length > 3 && (
                          <span className="text-cyan-400 font-bold">+{pageSteps.length - 3} daha</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Action Column */}
                <div className="flex items-center gap-3 shrink-0 justify-between md:justify-end border-t md:border-t-0 border-slate-800 pt-2 md:pt-0">
                  <div className="text-right text-[11px] text-slate-400 space-y-0.5">
                    <div>{new Date(sess.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div className="text-[10px] text-slate-500">Giriş Yapıldı</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedSession(sess)}
                      className="inline-flex items-center gap-1 py-1.5 px-3 bg-cyan-950/80 hover:bg-cyan-950 text-cyan-400 text-xs font-bold rounded-lg border border-cyan-500/30"
                    >
                      <span>Gezinti Akışı</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Instant Delete Button (No confirmation prompt!) */}
                    <button
                      onClick={(e) => handleDeleteSession(sess.id, e)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
                      title="Anında Sil"
                    >
                      <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-400" />
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-slate-950 border border-cyan-500/40 rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl font-mono text-slate-100 max-h-[90vh] overflow-y-auto relative">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest">// OTURUM GEZİNTİ AKIŞI</span>
                  <span className="text-[10px] bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30">
                    ID: {selectedSession.id}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-100 mt-1 flex items-center gap-2">
                  <span>{selectedSession.ip}</span>
                  <span className="text-xs text-slate-400">({selectedSession.city}, {selectedSession.country})</span>
                </h3>
              </div>

              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 text-slate-400 hover:text-slate-100 bg-slate-900 rounded-xl border border-slate-800 text-xs font-bold"
              >
                ✕ KAPAT
              </button>
            </div>

            {/* Hardware & Location Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">SERVİS SAĞLAYICI</span>
                <span className="text-slate-200 font-bold">{selectedSession.isp}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">CİHAZ MARKA / MODEL</span>
                <span className="text-amber-400 font-bold">{selectedSession.deviceBrand} ({selectedSession.deviceModel})</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">İŞLETİM SİSTEMİ</span>
                <span className="text-cyan-300 font-bold">{selectedSession.osName} {selectedSession.osVersion}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">TARAYICI</span>
                <span className="text-slate-200 font-bold">{selectedSession.browserName} {selectedSession.browserVersion}</span>
              </div>
            </div>

            {/* Chronological Navigation Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4" />
                <span>KRONOLOJİK SAYFA GEZİNTİ YOLU (TIMELINE)</span>
              </h4>

              <div className="relative pl-6 border-l-2 border-cyan-500/30 space-y-4 pt-2">
                {(selectedSession.pages || []).map((step, idx) => {
                  const stepTime = new Date(step.timestamp);
                  const isFirst = idx === 0;
                  const isLast = idx === (selectedSession.pages || []).length - 1;

                  return (
                    <div key={idx} className="relative group">
                      {/* Timeline Node Icon */}
                      <span className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isFirst
                          ? 'bg-emerald-500 border-emerald-400 ring-4 ring-emerald-500/20'
                          : isLast
                          ? 'bg-cyan-500 border-cyan-400 ring-4 ring-cyan-500/20'
                          : 'bg-slate-900 border-slate-700'
                      }`} />

                      <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1 hover:border-cyan-500/40 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-100">{step.path}</span>
                            <span className="text-[10px] text-slate-400">({step.title})</span>
                          </div>
                          <span className="text-[11px] text-cyan-400 font-bold">
                            {stepTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </span>
                        </div>

                        {isFirst && (
                          <span className="inline-block text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 mt-1">
                            🏁 SİTEYE GİRİŞ ADIMI
                          </span>
                        )}
                        {isLast && (
                          <span className="inline-block text-[10px] text-cyan-300 font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30 mt-1">
                            📍 SON GÖRÜNTÜLENEN ADIM
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Action */}
            <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
              <button
                onClick={() => handleDeleteSession(selectedSession.id)}
                className="py-2 px-4 bg-red-950/60 hover:bg-red-900 text-red-300 text-xs font-bold rounded-xl border border-red-500/30"
              >
                Anında Sil
              </button>

              <button
                onClick={() => setSelectedSession(null)}
                className="py-2 px-5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold rounded-xl shadow-lg shadow-cyan-500/20"
              >
                KAPAT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
