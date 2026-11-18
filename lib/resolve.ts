/* What a one-segment address (/xiaomi-power-bank) is: a category, a sub-category, a product or a brand, tried in that order, so a category
   or product with the same slug as a brand always wins. Used by app/[slug]/page.tsx (one flat address scheme, like excellent-web). */
import { brands, categories, byId } from './data';
import { slugify } from './format';

export type Resolved =
  | { type: 'category'; cat: (typeof categories)[number]; sub?: string; sub2?: string }
  | { type: 'product'; id: string }
  | { type: 'brand'; name: string };

export const brandBySlug = (slug: string): string | undefined => brands.map(b => b[0]).find(n => slugify(n) === slug);

export function resolveSlug(slug: string): Resolved | null {
  const top = categories.find(c => c.slug === slug);
  if (top) return { type: 'category', cat: top };
  for (const c of categories) {
    // a sub-category's own slug; a sub-category the API sent without one is found by its name's slug
    const s = c.subs.find(x => (x[2] || slugify(x[0])) === slug);
    if (s) return { type: 'category', cat: c, sub: s[0] };
    for (const x of c.subs) {
      const k = (x[3] || []).find(y => (y[2] || slugify(y[0])) === slug);
      if (k) return { type: 'category', cat: c, sub: x[0], sub2: k[0] };
    }
  }
  if (byId(slug)) return { type: 'product', id: slug };
  const brand = brandBySlug(slug);
  if (brand) return { type: 'brand', name: brand };
  return null;
}
