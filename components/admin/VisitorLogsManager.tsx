'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { VisitorLog } from '@/lib/types';
import {
  Activity,
  Globe,
  Smartphone,
  Laptop,
  Wifi,
  Search,
  RefreshCw,
  Trash2,
  Download,
  Info,
  Calendar,
  X,
  Filter,
  Eye,
  ShieldAlert,
  Server,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

export const VisitorLogsManager: React.FC = () => {
  const [logs, setLogs] = useState<VisitorLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [deviceFilter, setDeviceFilter] = useState<'All' | 'Mobile' | 'Desktop' | 'Tablet'>('All');
  const [selectedLog, setSelectedLog] = useState<VisitorLog | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/visitors', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      } else {
        toast.error('Loglar alınamadı.');
      }
    } catch (e) {
      console.error('Error fetching logs:', e);
      toast.error('Bağlantı hatası.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleDeleteLog = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bu log kaydını silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch(`/api/visitors?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setLogs((prev) => prev.filter((l) => l.id !== id));
        toast.success('Log kaydı silindi.');
        if (selectedLog?.id === id) setSelectedLog(null);
      }
    } catch (err) {
      toast.error('Silme hatası.');
    }
  };

  const handleClearAllLogs = async () => {
    if (!confirm('TÜM ziyaretçi log verilerini kalıcı olarak silmek istediğinize emin misiniz?')) return;

    try {
      const res = await fetch('/api/visitors?clearAll=true', { method: 'DELETE' });
      if (res.ok) {
        setLogs([]);
        setSelectedLog(null);
        toast.success('Tüm loglar temizlendi.');
      }
    } catch (err) {
      toast.error('Temizleme hatası.');
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.error('Dışa aktarılacak log bulunamadı.');
      return;
    }

    const headers = [
      'Tarih/Saat',
      'IP Adresi',
      'Ülke',
      'Şehir',
      'Operatör/ISP',
      'Mobil Ağ mı?',
      'Cihaz Türü',
      'Marka',
      'Model',
      'İşletim Sistemi',
      'Tarayıcı',
      'Ekran',
      'Dil',
      'Sayfa',
      'Referrer',
    ];

    const rows = logs.map((l) => [
      new Date(l.timestamp).toLocaleString('tr-TR'),
      l.ipAddress,
      l.country,
      l.city,
      `"${l.isp}"`,
      l.isMobileNetwork ? 'Evet' : 'Hayır',
      l.deviceType,
      `"${l.deviceBrand}"`,
      `"${l.deviceModel}"`,
      `"${l.osName} ${l.osVersion}"`,
      `"${l.browserName} ${l.browserVersion}"`,
      l.screenResolution,
      l.language,
      l.pagePath,
      `"${l.referrer}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ziyaretci_loglari_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV log raporu indirildi.');
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesDevice = deviceFilter === 'All' || log.deviceType === deviceFilter;

      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        log.ipAddress.toLowerCase().includes(term) ||
        log.city.toLowerCase().includes(term) ||
        log.country.toLowerCase().includes(term) ||
        log.isp.toLowerCase().includes(term) ||
        log.deviceBrand.toLowerCase().includes(term) ||
        log.deviceModel.toLowerCase().includes(term) ||
        log.browserName.toLowerCase().includes(term) ||
        log.osName.toLowerCase().includes(term) ||
        log.pagePath.toLowerCase().includes(term);

      return matchesDevice && matchesSearch;
    });
  }, [logs, searchTerm, deviceFilter]);

  // Aggregate Analytics Metrics
  const stats = useMemo(() => {
    const totalVisits = logs.length;
    const uniqueIPs = new Set(logs.map((l) => l.ipAddress)).size;

    // Top Operator / ISP
    const ispCounts: Record<string, number> = {};
    const brandCounts: Record<string, number> = {};
    const cityCounts: Record<string, number> = {};

    logs.forEach((l) => {
      if (l.isp) ispCounts[l.isp] = (ispCounts[l.isp] || 0) + 1;
      if (l.deviceBrand) brandCounts[l.deviceBrand] = (brandCounts[l.deviceBrand] || 0) + 1;
      if (l.city) cityCounts[l.city] = (cityCounts[l.city] || 0) + 1;
    });

    const topIsp = Object.entries(ispCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Bilinmiyor';
    const topBrand = Object.entries(brandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Bilinmiyor';
    const topCity = Object.entries(cityCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Bilinmiyor';
    const mobileRatio = totalVisits > 0 ? Math.round((logs.filter((l) => l.deviceType === 'Mobile').length / totalVisits) * 100) : 0;

    return { totalVisits, uniqueIPs, topIsp, topBrand, topCity, mobileRatio };
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900/90 border border-cyan-500/30 p-6 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-cyan-400 font-mono text-xs uppercase tracking-widest font-bold mb-1">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span>ZİYARETÇİ LOGLARI & ANALİTİK MERKEZİ // AUDIT_TRAIL_NODE</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black font-sans text-white tracking-tight">
            Canlı Ziyaretçi Trafigi ve Cihaz Detayları
          </h2>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Sitenizi ziyaret eden kullanıcıların konum, IP, telefon markası/modeli, operatör ve tarayıcı verilerini anlık izleyin ve yönetin.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto">
          <button
            type="button"
            onClick={fetchLogs}
            disabled={isLoading}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-xs font-bold rounded-xl border border-cyan-500/30 transition-all shadow-md disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Yenile</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 font-mono text-xs font-bold rounded-xl border border-cyan-500/40 transition-all shadow-md"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV İndir</span>
          </button>

          <button
            type="button"
            onClick={handleClearAllLogs}
            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 px-3.5 py-2.5 bg-red-950/40 hover:bg-red-900/60 text-red-300 font-mono text-xs font-bold rounded-xl border border-red-500/30 transition-all shadow-md"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Temizle</span>
          </button>
        </div>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Visits */}
        <div className="bg-slate-950/80 border border-cyan-500/20 p-4 rounded-2xl shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Toplam Ziyaret</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white">{stats.totalVisits}</div>
          <div className="text-[10px] font-mono text-cyan-400/80 mt-1">Kayıtlı Oturum</div>
        </div>

        {/* Card 2: Unique IPs */}
        <div className="bg-slate-950/80 border border-emerald-500/20 p-4 rounded-2xl shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Tekil IP Sayısı</span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">{stats.uniqueIPs}</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">Farklı Bağlantı</div>
        </div>

        {/* Card 3: Top ISP / Mobile Carrier */}
        <div className="bg-slate-950/80 border border-amber-500/20 p-4 rounded-2xl shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Popüler Operatör</span>
            <Wifi className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-bold font-mono text-amber-300 truncate" title={stats.topIsp}>
            {stats.topIsp}
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">En Çok Kullanılan Ağ</div>
        </div>

        {/* Card 4: Top Device & Brand */}
        <div className="bg-slate-950/80 border border-purple-500/20 p-4 rounded-2xl shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Lider Marka</span>
            <Smartphone className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-sm font-bold font-mono text-purple-300 truncate">
            {stats.topBrand} (%{stats.mobileRatio} Mobil)
          </div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">Donanım Oranı</div>
        </div>

        {/* Card 5: Top City */}
        <div className="bg-slate-950/80 border border-cyan-500/20 p-4 rounded-2xl shadow-xl backdrop-blur-sm col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider">Yoğun Konum</span>
            <Globe className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-sm font-bold font-mono text-cyan-300 truncate">{stats.topCity}</div>
          <div className="text-[10px] font-mono text-slate-400 mt-1">Lider Şehir</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-cyan-500/30 p-4 rounded-2xl backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="IP, Şehir, Operatör, Marka, Model veya Tarayıcı ara..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Device Filter Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto overflow-x-auto">
          {(['All', 'Mobile', 'Desktop', 'Tablet'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setDeviceFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all shrink-0 ${
                deviceFilter === tab
                  ? 'bg-cyan-500 text-slate-950 font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'All' ? 'Tümü' : tab === 'Mobile' ? '📱 Mobil' : tab === 'Desktop' ? '💻 Masaüstü' : 'Tablet'}
            </button>
          ))}
        </div>
      </div>

      {/* Log Table / List */}
      <div className="bg-slate-950/90 border border-cyan-500/30 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
        {isLoading ? (
          <div className="p-12 text-center font-mono text-xs text-cyan-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            <span>ZİYARETÇİ LOGLARI YÜKLENİYOR...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center font-mono text-xs text-slate-400 flex flex-col items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-slate-600" />
            <span>Henüz bir ziyaretçi log kaydı bulunamadı.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="bg-slate-900/90 border-b border-cyan-500/20 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4">Tarih / Saat</th>
                  <th className="py-3.5 px-4">IP & Operatör (ISP)</th>
                  <th className="py-3.5 px-4">Konum</th>
                  <th className="py-3.5 px-4">Cihaz & Telefon Model</th>
                  <th className="py-3.5 px-4">Tarayıcı & OS</th>
                  <th className="py-3.5 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredLogs.map((log) => {
                  const isMobile = log.deviceType === 'Mobile';
                  const dateStr = new Date(log.timestamp).toLocaleString('tr-TR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-cyan-950/20 transition-colors cursor-pointer group"
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-cyan-400/70" />
                          <span>{dateStr}</span>
                        </div>
                      </td>

                      {/* IP & Carrier */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-cyan-300">{log.ipAddress}</div>
                        <div className="text-[11px] text-amber-400/90 flex items-center gap-1 mt-0.5">
                          <Wifi className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{log.isp || 'Bilinmiyor'}</span>
                          {log.isMobileNetwork && (
                            <span className="ml-1 bg-amber-950 border border-amber-500/40 text-amber-300 px-1 py-0.2 rounded text-[9px] font-bold">
                              4G/5G
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-slate-200 font-semibold flex items-center gap-1.5">
                          <span className="text-base">🇹🇷</span>
                          <span>{log.city || 'Bilinmiyor'}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">{log.country}</div>
                      </td>

                      {/* Device & Phone Model */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-slate-200 font-bold">
                          {isMobile ? (
                            <Smartphone className="w-3.5 h-3.5 text-purple-400" />
                          ) : (
                            <Laptop className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                          <span>{log.deviceBrand}</span>
                          <span className="text-purple-300 font-normal">({log.deviceModel})</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {log.deviceType} • {log.screenResolution || 'Çözünürlük Belli Değil'}
                        </div>
                      </td>

                      {/* Browser & OS */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-slate-300 font-medium">
                          {log.browserName} <span className="text-slate-500 text-[10px]">{log.browserVersion}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {log.osName} {log.osVersion}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLog(log);
                            }}
                            className="p-1.5 bg-cyan-950/60 hover:bg-cyan-900 text-cyan-300 rounded-lg border border-cyan-500/30 transition-colors"
                            title="Detayları İncele"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteLog(log.id, e)}
                            className="p-1.5 bg-red-950/40 hover:bg-red-900 text-red-300 rounded-lg border border-red-500/30 transition-colors"
                            title="Logu Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Log Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-cyan-500/40 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-6 text-slate-200 font-mono">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
              <div className="flex items-center gap-2.5 text-cyan-400">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold uppercase tracking-wider">
                  ZİYARETÇİ LOG DETAY RAPORU // {selectedLog.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold">IP Adresi & Zaman</span>
                <div className="text-sm font-bold text-cyan-300">{selectedLog.ipAddress}</div>
                <div className="text-slate-400 text-[11px]">
                  {new Date(selectedLog.timestamp).toLocaleString('tr-TR')}
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Operatör / ISP</span>
                <div className="text-sm font-bold text-amber-300">{selectedLog.isp}</div>
                <div className="text-slate-400 text-[11px]">
                  Ağ Türü: {selectedLog.isMobileNetwork ? 'Mobil Hücresel Ağ (4G/5G)' : 'Sabit Geniş Bant / Wi-Fi'}
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Cihaz & Telefon Model</span>
                <div className="text-sm font-bold text-purple-300">
                  {selectedLog.deviceBrand} - {selectedLog.deviceModel}
                </div>
                <div className="text-slate-400 text-[11px]">
                  Kategori: {selectedLog.deviceType} | Ekran: {selectedLog.screenResolution || 'Bilinmiyor'}
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Tarayıcı & İşletim Sistemi</span>
                <div className="text-sm font-bold text-slate-200">
                  {selectedLog.browserName} {selectedLog.browserVersion}
                </div>
                <div className="text-slate-400 text-[11px]">
                  OS: {selectedLog.osName} {selectedLog.osVersion} | Dil: {selectedLog.language}
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1 sm:col-span-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Ziyaret Edilen Sayfa & Referrer</span>
                <div className="text-cyan-300 font-bold">{selectedLog.pagePath}</div>
                <div className="text-slate-400 text-[11px] truncate">
                  Yönlendiren: {selectedLog.referrer}
                </div>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-1 sm:col-span-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Ham User-Agent İmzası</span>
                <div className="text-[11px] font-mono text-slate-400 break-all bg-slate-900 p-2 rounded border border-slate-800/80">
                  {selectedLog.userAgent}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold rounded-xl"
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
