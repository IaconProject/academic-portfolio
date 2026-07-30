import { getSeoExperienceData } from '@/lib/seo-repository';
import { PortfolioClientView } from '@/components/public/PortfolioClientView';

export const revalidate = 300;

export default async function PublicPortfolioPage() {
  const data = await getSeoExperienceData();

  return <PortfolioClientView initialData={data} />;
}
