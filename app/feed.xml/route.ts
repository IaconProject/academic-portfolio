import { GET as getBlogFeed } from '@/app/blog/feed.xml/route';

export const revalidate = 300;

export async function GET() {
  return getBlogFeed();
}
