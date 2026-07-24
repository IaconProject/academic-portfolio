import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const TMP_LOGS_PATH = path.join('/tmp', 'academic_portfolio_visitor_logs_v1.json');
let inMemoryVisitorLogs: any[] = [];

function getStoredLogs(): any[] {
  if (inMemoryVisitorLogs.length > 0) return inMemoryVisitorLogs;
  try {
    if (fs.existsSync(TMP_LOGS_PATH)) {
      const content = fs.readFileSync(TMP_LOGS_PATH, 'utf-8');
      if (content) {
        inMemoryVisitorLogs = JSON.parse(content);
        return inMemoryVisitorLogs;
      }
    }
  } catch (e) {
    console.error('Failed to read tmp visitor logs:', e);
  }
  return [];
}

function saveLogs(logs: any[]): void {
  inMemoryVisitorLogs = logs;
  try {
    fs.writeFileSync(TMP_LOGS_PATH, JSON.stringify(inMemoryVisitorLogs), 'utf-8');
  } catch (e) {
    console.error('Failed to write tmp visitor logs:', e);
  }
}

export async function GET() {
  let logs: any[] = [];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('visitor_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (!error && data && data.length > 0) {
        logs = data.map((item: any) => ({
          id: item.id,
          ipAddress: item.ip_address,
          country: item.country || 'Türkiye',
          countryCode: item.country_code || 'TR',
          city: item.city || 'Bilinmiyor',
          region: item.region || 'Bilinmiyor',
          isp: item.isp || 'Bilinmiyor',
          isMobileNetwork: item.is_mobile_network ?? false,
          deviceType: item.device_type || 'Desktop',
          deviceBrand: item.device_brand || 'Bilinmiyor',
          deviceModel: item.device_model || 'Bilinmiyor',
          osName: item.os_name || 'Bilinmiyor',
          osVersion: item.os_version || '',
          browserName: item.browser_name || 'Bilinmiyor',
          browserVersion: item.browser_version || '',
          screenResolution: item.screen_resolution || '',
          language: item.language || '',
          pagePath: item.page_path || '/',
          referrer: item.referrer || 'Direkt Giriş',
          userAgent: item.user_agent || '',
          timestamp: item.created_at,
        }));
      }
    } catch (e) {
      console.warn('Supabase visitor logs fetch warning:', e);
    }
  }

  // Fallback to local logs if Supabase has no logs or fails
  if (logs.length === 0) {
    logs = getStoredLogs();
  }

  return NextResponse.json({ logs }, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
  });
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clearAll = searchParams.get('clearAll') === 'true';

    if (clearAll) {
      saveLogs([]);
      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('visitor_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        } catch (e) {
          console.warn('Failed to clear Supabase logs:', e);
        }
      }
      return NextResponse.json({ success: true, message: 'Tüm loglar temizlendi.' });
    }

    if (id) {
      const current = getStoredLogs();
      const updated = current.filter((l) => l.id !== id);
      saveLogs(updated);

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('visitor_logs').delete().eq('id', id);
        } catch (e) {
          console.warn('Failed to delete log from Supabase:', e);
        }
      }
      return NextResponse.json({ success: true, message: 'Log kaydı silindi.' });
    }

    return NextResponse.json({ success: false, error: 'Geçersiz parametre' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
