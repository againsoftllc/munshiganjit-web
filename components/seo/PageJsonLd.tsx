import JsonLd from './JsonLd';
import { getSeoConfig, webPageSchema } from '@/lib/seo';

/** The WebPage schema of an information page (about, contact, help, policies ...), unless the admin switched schema off for them. */
export default async function PageJsonLd({ name, path, description }: { name: string; path: string; description?: string }) {
  const seo = await getSeoConfig();
  if (!seo.enabled || !seo.pages.info) return null;
  return <JsonLd data={webPageSchema({ name, path, description })} />;
}
