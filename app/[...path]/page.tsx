import { notFound, permanentRedirect } from 'next/navigation';
import { resolveRedirectPath } from '@/lib/seo-repository';
import { normalizePath } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function RedirectResolverPage(
  props: {
    params: Promise<{ path: string[] }>;
  }
) {
  const params = await props.params;
  const fromPath = normalizePath(`/${params.path.join('/')}`);
  const target = await resolveRedirectPath(fromPath);
  if (target && target !== fromPath) permanentRedirect(target);
  notFound();
}
