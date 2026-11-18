// Builds lib/generated/storefront.json (the baseline the storefront ships with).
//
//   1. Start from lib/mock/storefront.mock.json  -> mock data, used for anything the backend cannot supply.
//   2. Ask the AgainERP Munshiganj IT API (read-only, GET only) for real data and overlay each section
//      that comes back non-empty: site info, categories, products, blog posts.
//   3. Write the merged result. If the API is down, the mock alone is written, so dev/build never fails.
//
// The backend (againerp-munshiganjit) is never modified; this script only reads from it.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'lib', 'generated', 'storefront.json');
const mockFile = join(root, 'lib', 'mock', 'storefront.mock.json');

function envValue(name) {
  if (process.env[name]) return process.env[name];
  for (const f of ['.env.local', '.env']) {
    const p = join(root, f);
    if (!existsSync(p)) continue;
    const m = readFileSync(p, 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'));
    if (m) return m[1].trim();
  }
  return '';
}

const API = envValue('NEXT_PUBLIC_AGAINERP_API').replace(/\/$/, '');
const S = `${API}/api/v1/storefront`;
const abs = (u) => (typeof u === 'string' && u.startsWith('/') && !u.startsWith('//') ? API + u : u || undefined);

async function get(path, ms = 20000) {
  const r = await fetch(S + path, { signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`${path} -> HTTP ${r.status}`);
  return r.json();
}
const tryGet = (path, ms) => get(path, ms).catch((e) => { console.warn(`[sync-data] ${e.message}`); return null; });

if (!existsSync(mockFile)) {
  console.error(`[sync-data] missing mock baseline ${mockFile}`);
  process.exit(1);
}
const data = JSON.parse(readFileSync(mockFile, 'utf8'));
const used = [];

if (API) {
  const [settings, cats, brands, blog] = await Promise.all([
    tryGet('/settings', 60000), tryGet('/categories'), tryGet('/brands'), tryGet('/blog/posts?per_page=50'),
  ]);

  // site: only take the backend's contact details once it is actually set up as Munshiganj IT
  const s = settings?.data;
  if (s && /munshiganj/i.test(`${s.site_name} ${s.client_slug || ''}`)) {
    Object.assign(data.site, {
      name: s.site_name || data.site.name,
      hotline: s.contact_phone || data.site.hotline,
      phone: s.contact_phone || data.site.phone,
      whatsapp: (s.whatsapp_number || data.site.whatsapp || '').replace(/\D/g, ''),
      email: s.contact_email || data.site.email,
      address: s.address || data.site.address,
      hours: s.business_hours || data.site.hours,
    });
    used.push('site');
  }

  // categories (tree) + products -> the baseline shape. Both must be present, else keep mock.
  const tree = cats?.data || [];
  const fallbackArt = data.categories?.[0]?.art || 'powerbank';
  const products = [];
  if (tree.length) {
    for (let page = 1; page <= 40; page++) {
      const r = await tryGet(`/products?per_page=100&page=${page}`);
      const rows = r?.data || [];
      products.push(...rows);
      if (rows.length < 100) break;
    }
  }
  if (tree.length && products.length) {
    const where = new Map(); // category name -> [top slug, sub name]
    for (const top of tree) {
      where.set(top.name, [top.slug, top.name]);
      for (const sub of top.children || []) {
        where.set(sub.name, [top.slug, sub.name]);
        for (const leaf of sub.children || []) where.set(leaf.name, [top.slug, sub.name]);
      }
    }
    const count = {};
    for (const p of products) { const w = where.get(p.category); if (w) count[w[1]] = (count[w[1]] || 0) + 1; }
    const topCount = (top) => products.filter((p) => where.get(p.category)?.[0] === top.slug).length;
    data.categories = tree.map((top) => ({
      slug: top.slug, name: top.name, count: topCount(top), icon: fallbackArt, art: fallbackArt,
      subs: (top.children || []).map((c) => [c.name, count[c.name] || 0, c.slug]),
    }));
    data.products = products.map((p) => {
      const [cat, sub] = where.get(p.category) || [tree[0].slug, p.category];
      const price = Number(p.price) || 0;
      const old = p.compare_at_price && Number(p.compare_at_price) > price ? Number(p.compare_at_price) : null;
      return {
        id: p.slug, uid: p.id, name: p.name, brand: p.brand, cat, sub, price, old,
        rating: p.rating || 0, reviews: p.review_count || 0, sold: 0,
        stock: p.in_stock ? 'in' : 'out', qty: p.stock || 0, art: fallbackArt, hue: 'blue', emi: false, model: '',
        specs: Object.entries(p.filter_attributes || {}).map(([k, v]) => `${k}: ${v}`),
        attrs: p.filter_attributes || {}, image: abs(p.thumbnail),
      };
    });
    used.push(`${data.products.length} products`, `${data.categories.length} categories`);
  }

  if (brands?.data?.length && used.some((u) => u.endsWith('products'))) {
    const n = {};
    for (const p of data.products) n[p.brand] = (n[p.brand] || 0) + 1;
    data.brands = Object.entries(n);
  }

  if (blog?.data?.length) {
    data.blog = blog.data.map((b, i) => ({
      id: b.slug, title: b.title, cat: b.category_name || 'News', read: 5, author: b.author_name || 'Munshiganj IT',
      date: b.published_at ? new Date(b.published_at).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '',
      art: data.categories?.[0]?.art || 'powerbank', hue: 'blue', featured: i === 0, excerpt: b.excerpt || '', cover: abs(b.cover_image_url),
    }));
    used.push(`${data.blog.length} blog posts`);
  }
}

data.syncedAt = new Date().toISOString();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(data));
console.log(`[sync-data] backend: ${used.length ? used.join(', ') : 'nothing usable'} | rest from mock | API=${API || '(unset)'}`);
