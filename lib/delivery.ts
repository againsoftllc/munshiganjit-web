/* The shop's delivery charge, kept in the admin (Business Settings > Shipping Methods: district rates, free-delivery amount, express rate)
   and read here from GET /storefront/checkout/options, the same settings the API charges the order with. Checkout, the Help FAQ, the
   Delivery Policy and the live-chat answers all use this one source. No hooks here: pages (server) and the checkout (client) both import it. */
const API = (process.env.NEXT_PUBLIC_AGAINERP_API || '').replace(/\/$/, '');

export interface Delivery {
  /** home delivery: the rate of each district, and the rate of every district not listed */
  rates: Record<string, number>;
  rateDefault: number;
  /** orders from this amount get free home delivery; 0 = never */
  freeFrom: number;
  /** express delivery rate, null when express is switched off */
  express: number | null;
  homeOn: boolean;
  pickupOn: boolean;
  /** the admin's Division > District > Sub district lists; null = use the built-in ones (lib/geo.ts) */
  geo: Record<string, Record<string, string[]>> | null;
}

/** What the shop charged before it was read from the admin; used only until the real values arrive (or when the API cannot be reached). */
export const DELIVERY_FALLBACK: Delivery = { rates: { Dhaka: 60 }, rateDefault: 120, freeFrom: 5000, express: 150, homeOn: true, pickupOn: true, geo: null };

const num = (v: unknown, d: number) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

export function parseDelivery(raw: unknown): Delivery {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const methods = (Array.isArray(o.shipping_methods) ? o.shipping_methods : []) as Record<string, unknown>[];
  const std = methods.find(m => m.id === 'standard');
  const exp = methods.find(m => m.id === 'express');
  const rates: Record<string, number> = {};
  for (const [k, v] of Object.entries((o.district_rates || {}) as Record<string, unknown>)) rates[k] = num(v, 0);
  return {
    rates: Object.keys(rates).length ? rates : DELIVERY_FALLBACK.rates,
    rateDefault: num(std?.rate_default, DELIVERY_FALLBACK.rateDefault),
    freeFrom: num(o.free_threshold, DELIVERY_FALLBACK.freeFrom),
    express: exp ? num(exp.base_price, 0) : null,
    homeOn: methods.length ? !!std : true,
    pickupOn: methods.length ? methods.some(m => m.id === 'pickup') : true,
    geo: o.geo && typeof o.geo === 'object' && Object.keys(o.geo as object).length ? (o.geo as Delivery['geo']) : null,
  };
}

/** one call, from the server (cached 30 s) or the browser */
export async function fetchDelivery(): Promise<Delivery> {
  if (!API) return DELIVERY_FALLBACK;
  try {
    const r = await fetch(`${API}/api/v1/storefront/checkout/options`, { next: { revalidate: 30 }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return DELIVERY_FALLBACK;
    const j = await r.json();
    return parseDelivery(j?.data ?? j);
  } catch {
    return DELIVERY_FALLBACK;
  }
}

/** the home-delivery charge for a district, the way the API works it out (district names match without case) */
export function chargeFor(d: Delivery, district: string): number {
  const name = (district || '').trim().toLowerCase();
  const key = Object.keys(d.rates).find(k => k.trim().toLowerCase() === (name || 'dhaka'));
  return key !== undefined ? d.rates[key] : d.rateDefault;
}

/** the shop's own district (inside Dhaka) and the rate everywhere else, for the sentences of the site */
export const insideRate = (d: Delivery) => chargeFor(d, 'Dhaka');
export const outsideRate = (d: Delivery) => d.rateDefault;

const taka = (n: number) => '৳' + n.toLocaleString('en-IN');

/** Words the admin can write in any text of the site (FAQ answers, the Delivery Policy page, the chat answers) instead of an amount:
 *  {delivery_inside} {delivery_outside} {delivery_express} {delivery_free_over}. They are replaced by the current numbers. */
export function fillDelivery(text: string, d: Delivery): string {
  if (!text || text.indexOf('{delivery_') < 0) return text;
  return text
    .replace(/\{delivery_inside\}/g, taka(insideRate(d)))
    .replace(/\{delivery_outside\}/g, taka(outsideRate(d)))
    .replace(/\{delivery_express\}/g, d.express === null ? 'not available' : taka(d.express))
    .replace(/\{delivery_free_over\}/g, d.freeFrom > 0 ? taka(d.freeFrom) : 'no minimum');
}
