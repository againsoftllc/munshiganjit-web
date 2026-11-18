/* Happy Hour campaigns (admin: Website > Promotions > Happy Hour) as the storefront shows them. Server side only: asks the API for the
   campaign on every request (never from Next's data cache: that keeps only successful answers, so a campaign the admin deleted or that
   has ended would stay on show) and matches each deal's product with the
   catalog product the site already has, so a deal looks like any other product card with the deal price on it. A campaign is public
   while it runs; outside tonight's window the page still shows (countdown to the opening) with the regular prices. */
import { cache } from 'react';
import { byId, type Product } from './data';
import { safeHtml } from './html';

const API = (process.env.NEXT_PUBLIC_AGAINERP_API || '').replace(/\/$/, '');

interface ApiDeal { slug: string; price: number; compare_at_price?: number | null; in_stock?: boolean; note?: string | null }
export interface HappyHour {
  slug: string; title: string; subtitle: string; /** HTML */ description: string;
  startDate: string; endDate: string; startISO: string; endISO: string;
  /** inside tonight's window: deal prices apply */
  live: boolean;
  /** when the window ENDS (live) or next OPENS (not live) */
  countdownISO: string;
  dailyStartHour: number; dailyEndHour: number; outletLabel: string; terms: string[];
  sections: { key: string; label: string; deals: ApiDeal[] }[];
}

async function load(slug?: string): Promise<HappyHour | null> {
  if (!API) return null;
  try {
    const path = slug ? `/happy-hours/${encodeURIComponent(slug)}` : '/happy-hour';
    const r = await fetch(`${API}/api/v1/storefront${path}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const d = (await r.json())?.data;
    if (!d || typeof d.slug !== 'string') return null;
    return {
      slug: d.slug, title: String(d.title || ''), subtitle: String(d.subtitle || '').trim(), description: safeHtml(d.description),
      startDate: String(d.startDate || ''), endDate: String(d.endDate || ''), startISO: String(d.startDateISO || ''), endISO: String(d.endDateISO || ''),
      live: d.live !== false, countdownISO: String(d.countdownISO || d.endDateISO || ''),
      dailyStartHour: Number(d.dailyStartHour ?? 22), dailyEndHour: Number(d.dailyEndHour ?? 24), outletLabel: String(d.outletLabel || 'Online Only'),
      terms: Array.isArray(d.terms) ? d.terms.filter((t: unknown): t is string => typeof t === 'string' && !!t.trim()) : [],
      sections: (Array.isArray(d.sections) ? d.sections : []).map((s: { key?: string; label?: string; products?: ApiDeal[] }) => ({
        key: String(s.key || ''), label: String(s.label || ''), deals: Array.isArray(s.products) ? s.products : [],
      })),
    };
  } catch {
    return null;
  }
}

/** a campaign by its address (/happy-hour, or any campaign's slug); with no slug: the campaign running now */
export const getHappyHour = cache(load);

/** The campaign's products as the site's own Product cards with the deal price on them (a deal whose product the site does not list is left out),
 *  and the sections as lists of product ids. */
export function happyHourItems(hh: HappyHour): { items: Product[]; sections: { key: string; label: string; ids: string[] }[] } {
  const items = new Map<string, Product>();
  const sections = hh.sections.map(s => {
    const ids: string[] = [];
    for (const d of s.deals) {
      const p = byId(d.slug);
      if (!p || p.discontinued) continue;
      // the price is the catalog's own (the winning offer by priority, regular outside the window): the same on every page and in the cart
      if (!items.has(p.id)) items.set(p.id, d.in_stock === false ? { ...p, stock: 'out' } : p);
      ids.push(p.id);
    }
    return { key: s.key || s.label, label: s.label, ids };
  }).filter(s => s.ids.length > 0);
  return { items: [...items.values()], sections };
}
