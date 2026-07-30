import { getSeoExperienceData } from '@/lib/seo-repository';
import { serverSupabase } from '@/lib/supabase/server';
import { apiSuccess, rejectUnauthorized } from '@/lib/admin-api';
import { runDataSeoAudit } from '@/lib/seo';
import { runLiveSeoAudit } from '@/lib/seo-crawler';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  const data = await getSeoExperienceData();
  const baseline = runDataSeoAudit(data);
  const result =
    process.env.NODE_ENV === 'production'
      ? await runLiveSeoAudit(data, baseline)
      : baseline;
  if (serverSupabase) {
    const saved = await serverSupabase
      .from('seo_audit_runs')
      .insert({
        score: result.score,
        category_scores: result.categoryScores,
        issues: result.issues,
        checked_urls: [
          '/',
          '/yayinlar',
          '/projeler',
          '/yazilar',
          '/sitemap.xml',
          '/robots.txt',
        ],
        created_at: result.checkedAt,
      })
      .select('id')
      .single();
    if (saved.data?.id) result.id = saved.data.id;
  }
  return apiSuccess(result);
}

export async function GET(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  if (serverSupabase) {
    const { data } = await serverSupabase
      .from('seo_audit_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      return apiSuccess({
        id: data.id,
        score: data.score,
        issues: data.issues,
        categoryScores: data.category_scores || undefined,
        checkedAt: data.created_at,
      });
    }
  }
  const portfolio = await getSeoExperienceData();
  return apiSuccess(runDataSeoAudit(portfolio));
}
