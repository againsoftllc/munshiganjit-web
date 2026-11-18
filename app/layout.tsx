import type { Metadata, Viewport } from 'next';
import { Inter, Poppins, Hind_Siliguri } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/components/store';
import { PartnerProvider } from '@/components/partner';
import SiteChrome from '@/components/SiteChrome';
import DataSync from '@/components/DataSync';
import EmbedLiveEdit from '@/components/live-edit/EmbedLiveEdit';
import { loadFresh } from '@/lib/live';
import { getRobotsConfig } from '@/lib/seo';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--f-body', display: 'swap' });
const hind = Hind_Siliguri({ subsets: ['bengali'], weight: ['500', '600', '700'], variable: '--f-bn', display: 'swap', preload: false }); // Bangla text only; fetched when a page uses it
const poppins = Poppins({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--f-head', display: 'swap' });

/** The one public address of the shop; every canonical link resolves against it (set NEXT_PUBLIC_SITE_URL when the domain changes). */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://www.munshiganjit.com.bd';

const baseMetadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // "./" is each page's own address with the query string dropped (?sort=, ?brand= ... never become another page); a page that has a
  // specific canonical (a product, a category, a brand) overrides it.
  alternates: { canonical: './' },
  title: { default: 'Munshiganj IT — Power Bank, Earbuds, Charger & Gadgets Shop in Bangladesh', template: '%s | Munshiganj IT' },
  description: 'Buy genuine power banks, earbuds, headphones, chargers, cables and smart gadgets at wholesale prices with warranty support and nationwide delivery in Bangladesh.',
  // the default card for every page; a page with its own title / picture states its own (a page's openGraph replaces this whole block)
  openGraph: {
    type: 'website', siteName: 'Munshiganj IT', locale: 'en_BD',
    title: 'Munshiganj IT — Power Bank, Earbuds, Charger & Gadgets Shop in Bangladesh',
    description: 'Buy genuine power banks, earbuds, headphones, chargers, cables and smart gadgets at wholesale prices with warranty support and nationwide delivery in Bangladesh.',
    images: [{ url: '/img/mit-logo.png' }],
  },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/img/mit-favicon.png', apple: '/img/mit-favicon.png' },
};
/** While the admin's "Block all" is on, every page also carries noindex + nofollow (robots.txt alone cannot take a page out of Google). */
export async function generateMetadata(): Promise<Metadata> {
  // No request headers are read here, so a page can be built once and served from the cache. The Vercel address (a copy of the shop) is kept
  // out of Google by next.config.ts (X-Robots-Tag: noindex on *.vercel.app) and by its redirect to the real domain.
  const block_all = (await getRobotsConfig()).block_all;
  return block_all ? { ...baseMetadata, robots: { index: false, follow: false, nocache: true } } : baseMetadata;
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#1877F2' };

/* Pages are built from the API's current data and kept in Next's page cache; the data is refetched at most every 10 s (lib/live.ts) and is
   purged at once by POST /api/revalidate when the admin saves. A page that reads the query string (?sort=, ?brand= ...) is still built per request. */

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { patch, key } = await loadFresh();
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} ${hind.variable}`}>
      <body>
        <DataSync patch={patch} k={key} />
        <PartnerProvider><StoreProvider>
          <EmbedLiveEdit><SiteChrome>{children}</SiteChrome></EmbedLiveEdit>
        </StoreProvider></PartnerProvider>
      </body>
    </html>
  );
}
