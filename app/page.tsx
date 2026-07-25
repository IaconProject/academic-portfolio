import { getPortfolioDataServer } from '@/lib/server-cms';
import { PortfolioClientView } from '@/components/public/PortfolioClientView';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function PublicPortfolioPage() {
  const data = await getPortfolioDataServer();

  return <PortfolioClientView initialData={data} />;
}
