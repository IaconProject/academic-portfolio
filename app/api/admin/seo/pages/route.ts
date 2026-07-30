import { getSeoExperienceData } from '@/lib/seo-repository';
import { apiSuccess, rejectUnauthorized } from '@/lib/admin-api';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const unauthorized = rejectUnauthorized(request);
  if (unauthorized) return unauthorized;
  const data = await getSeoExperienceData();
  return apiSuccess(data.seoPages || []);
}
