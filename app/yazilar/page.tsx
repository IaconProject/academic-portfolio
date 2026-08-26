import { permanentRedirect } from 'next/navigation';

export default function LegacyArticlesPage() {
  permanentRedirect('/blog/arsiv');
}
