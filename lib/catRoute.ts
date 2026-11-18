/* Resolve SEO category URL segments (/category/cameras/dslr/sony) back to real names. */
import { brands, catBySlug, products } from './data';
import { slugify } from './format';

export function resolveCategory(slug: string, subSlug?: string, brandSlug?: string) {
  const cat = catBySlug(slug);
  if (!cat) return null;
  let sub: string | undefined;
  if (subSlug) {
    // the sub-category's own slug (hoco-earbuds) first; the old name-based address (hoco) still finds it, and the page redirects to the new one
    sub = cat.subs.find(s => s[2] === subSlug)?.[0];
    if (!sub) {
      const names = [...cat.subs.map(s => s[0]), ...products.filter(p => p.cat === cat.slug).map(p => p.sub)];
      sub = names.find(n => slugify(n) === subSlug);
    }
    if (!sub) return null;
  }
  let brand: string | undefined;
  if (brandSlug) {
    // product spelling first (e.g. 'DAHUA'), so the brand filter matches the products exactly
    const names = [...products.map(p => p.brand), ...brands.map(b => b[0])];
    brand = names.find(n => slugify(n) === brandSlug);
    if (!brand) return null;
  }
  return { cat, sub, brand };
}

export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;
export type SP = Promise<Record<string, string | string[] | undefined>>;
