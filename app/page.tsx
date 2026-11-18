import type { Metadata } from 'next';
import HomeClient from './HomeClient';
import JsonLd from '@/components/seo/JsonLd';
import { site } from '@/lib/data';
import { loadFresh } from '@/lib/live';
import { applyMetaTemplate, getSeoConfig, homeSchema, ogCard } from '@/lib/seo';

const TITLE = 'Munshiganj IT — Power Bank, Earbuds, Charger & Gadgets Shop in Bangladesh';
const DESCRIPTION = 'Buy genuine power banks, earbuds, headphones, chargers, cables and smart gadgets at wholesale prices with warranty support and nationwide delivery in Bangladesh.';

/** The home page's title (SEO settings, else the built-in one): also its H1 */
async function homeTitle() {
  await loadFresh();
  const seo = await getSeoConfig();
  const siteName = seo.business.name.trim() || site.name || 'Munshiganj IT';
  const title = applyMetaTemplate(seo.meta.home_title, { name: siteName, site: siteName }) || TITLE;
  return { seo, siteName, title };
}

export async function generateMetadata(): Promise<Metadata> {
  const { seo, siteName, title } = await homeTitle();
  const vars = { name: siteName, site: siteName };
  const description = applyMetaTemplate(seo.meta.home_description, vars) || DESCRIPTION;
  return { title: { absolute: title }, description, alternates: { canonical: '/' }, openGraph: ogCard({ title, description, path: '/' }, siteName), twitter: { card: 'summary_large_image' } };
}

export default async function Home() {
  const { seo, title } = await homeTitle();
  return (
    <>
      {seo.enabled && seo.pages.home && <JsonLd data={homeSchema(seo)} />}
      <HomeClient h1={title} />
    </>
  );
}
