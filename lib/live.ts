/* Server side of the live data: asks the AgainERP API for the current catalog + content on every
   request (served from Next's data cache for up to 10 s, and purged at once by POST /api/revalidate
   when the admin saves something), applies it to the server's copy of the data, and returns the small
   patch the browser needs. Never import this from a client component. */
import { cache } from 'react';
import { applyStore, baselineStore, categoryText, type CategoryText } from './data';
import { diff, type Patch, type Store } from './patch';

export const DATA_TAG = 'storefront-data';
const API = (process.env.NEXT_PUBLIC_AGAINERP_API || '').replace(/\/$/, '');

async function get(path: string, root = '/munshiganjit'): Promise<string | null> {
  try {
    const r = await fetch(`${API}/api/v1/storefront${root}${path}`, { next: { tags: [DATA_TAG], revalidate: 10 }, signal: AbortSignal.timeout(15000) });
    return r.ok ? await r.text() : null;
  } catch {
    return null;
  }
}

/** "/uploads/x.webp" -> "<api>/uploads/x.webp" (the photos are served by the API) */
const abs = (node: unknown): unknown => {
  if (typeof node === 'string') return node.startsWith('/uploads/') ? API + node : node;
  if (Array.isArray(node)) return node.map(abs);
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, abs(v)]));
  return node;
};
const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };

/** the home page's Live Edit content: `blocks.munshiganjit` of GET /storefront/homepage */
function homeOf(body: string | null): Record<string, unknown> {
  try {
    const b = body ? JSON.parse(body)?.data?.blocks?.munshiganjit : null;
    return b && typeof b === 'object' ? b : {};
  } catch { return {}; }
}

/** the promo banners of the product pages (GET /storefront/munshiganjit/product-banners) */
function bannersOf(body: string | null): unknown[] {
  try { const d = body ? JSON.parse(body)?.data : null; return Array.isArray(d) ? d : []; } catch { return []; }
}

/** the main menu bar made in Live Edit (GET /storefront/menus/munshiganjit.main): its visible items; [] = the built-in menu */
function menuOf(body: string | null): unknown[] {
  try {
    const items = body ? JSON.parse(body)?.data?.items : null;
    return Array.isArray(items) ? items : [];
  } catch { return []; }
}

export interface Fresh { patch: Patch | null; key: string }
let last: { sig: string; out: Fresh } | null = null;

/** current data -> applied here, and the patch for the browser. On any API failure the build's data is used. */
export const loadFresh = cache(async (): Promise<Fresh> => {
  // The Munshiganj IT backend has no /munshiganjit/catalog|content plugin feed, so there is nothing to patch in live.
  // The baseline (built by scripts/sync-data.mjs from the backend + mock data) is served. Set NEXT_PUBLIC_LIVE_FEED=1 to re-enable.
  if (!API || process.env.NEXT_PUBLIC_LIVE_FEED !== '1') return { patch: null, key: 'base' };
  const [catalog, content, gadget, partners, homepage, menu, banners] = await Promise.all([get('/catalog'), get('/content'), get('/gadget-setup'), get('/partners/products'), get('/homepage', ''), get('/menus/munshiganjit.main', ''), get('/product-banners')]);
  if (!catalog || !content) {
    // API unreachable: serve the data the site was built with
    if (last) { applyStore(baselineStore as never); last = null; }
    return { patch: null, key: 'base' };
  }
  const sig = catalog + content + (gadget || '') + (partners || '') + (homepage || '') + (menu || '') + (banners || '');
  if (last && last.sig === sig) return last.out;
  // the category pages' own SEO text stays on the server (it is read while a page renders), so it is kept out of the data the browser gets
  const { categoryText: ctext, ...catalogData } = JSON.parse(catalog) as { categoryText?: Record<string, CategoryText> } & Record<string, unknown>;
  const fresh = abs({
    ...catalogData, ...JSON.parse(content),
    gadget: gadget ? JSON.parse(gadget) : null,
    partnerProducts: partners ? JSON.parse(partners) : { reseller: [], corporate: [] },
    home: homeOf(homepage),
    mainMenu: menuOf(menu),
    productBanners: bannersOf(banners),
  }) as Store;
  const patch = diff(baselineStore, fresh);
  applyStore(fresh as never);
  for (const k of Object.keys(categoryText)) delete categoryText[k];
  Object.assign(categoryText, ctext || {});
  const out: Fresh = { patch, key: hash(JSON.stringify(patch)) };
  last = { sig, out };
  return out;
});
