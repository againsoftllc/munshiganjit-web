/* The main menu bar as the admin's Live Edit → Main menu makes it (GET /storefront/menus/munshiganjit.main).
   Nothing saved there = an empty list = the site keeps its built-in menu (the catalog's categories). */
import { categories, mainMenu } from './data';
import { catUrl, slugify, brandUrl } from './format';

export interface MenuItem {
  id: string; label: string; link_type: 'page' | 'category' | 'brand' | 'custom'; href: string;
  /** the catalog's own name / slug of the linked category or brand (the label may have been renamed) */
  ref_name?: string; ref_slug?: string; children: MenuItem[];
}

type Cat = (typeof categories)[number];

/** the top-level category a menu item stands for (null for a brand / page / custom link, or a sub-category) */
export const menuCategory = (it: MenuItem): Cat | null => (it.link_type === 'category' ? categories.find(c => c.slug === it.ref_slug) ?? null : null);

/** a storefront link for a category the admin put in the menu: a main category, or a sub-category (its sub-type page) */
function categoryLink(slug: string, name: string): string {
  if (categories.some(c => c.slug === slug)) return catUrl(slug);
  for (const c of categories) {
    const sub = c.subs.find(s => slugify(s[0]) === slugify(name) || slugify(s[0]) === slugify(slug));
    if (sub) return catUrl(c.slug, { sub: sub[0] });
  }
  return catUrl(slug);
}

/** where a menu item goes on THIS site (the API only knows the category slug, not this site's URL scheme) */
export function menuLink(it: MenuItem, parent?: MenuItem | null): string {
  if (it.link_type === 'category' && it.ref_slug) {
    // a sub-category under its category: that category's sub-type page
    const p = parent ? menuCategory(parent) : null;
    if (p) {
      const sub = p.subs.find(s => slugify(s[0]) === slugify(it.ref_name || it.label) || slugify(s[0]) === slugify(it.ref_slug || ''));
      if (sub) return catUrl(p.slug, { sub: sub[0] });
    }
    return categoryLink(it.ref_slug, it.ref_name || it.label);
  }
  if (it.link_type === 'brand') return brandUrl(it.ref_name || it.label);
  return it.href && it.href !== '#' ? it.href : '#';
}

/** the sub-types of a category in the menu's order: the menu item's own children when it has any (the admin hid or reordered
 *  some), else all of them */
export function menuSubs(c: Cat, it: MenuItem): Cat['subs'] {
  if (!it.children.length) return c.subs;
  const out: Cat['subs'] = [];
  for (const ch of it.children) {
    const key = slugify(ch.ref_name || ch.label);
    const sub = c.subs.find(s => slugify(s[0]) === key || slugify(s[0]) === slugify(ch.ref_slug || ''));
    if (sub && !out.includes(sub)) out.push(sub);
  }
  return out;
}

/** a category the storefront shows nothing for (it has no published product, e.g. the one holding draft gadget devices) stays out of the menu */
const usable = (it: MenuItem): boolean => {
  if (it.link_type !== 'category' || !it.ref_slug) return true;
  if (categories.some(c => c.slug === it.ref_slug)) return true;
  return categories.some(c => c.subs.some(s => slugify(s[0]) === slugify(it.ref_name || it.label) || slugify(s[0]) === slugify(it.ref_slug || '')));
};

/** the menu to show: the one made in Live Edit without its empty categories; [] = use the built-in menu */
export const activeMenu = (): MenuItem[] => mainMenu.filter(usable).map(it => ({ ...it, children: it.children.filter(usable) }));
