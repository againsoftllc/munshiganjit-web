/* =====================================================================
   B2B pricing — Reseller and Corporate buyers (client requirement).
   Reseller and corporate partners share ONE price list. Every product has quantity slabs
   ("from 10 pcs: 2,400 with warranty / 2,200 without"), an optional price list of its own for a
   colour, and the admin can switch a product off for partners. The slab is chosen by the TOTAL
   quantity of the product in the cart (all its colours together); the first slab's quantity is
   the minimum order. A partner order is warranted and invoiced by the sister concern (seller).
   Prices come from the Partner Program plugin in AgainERP (POST /storefront/munshiganjit/partners/session)
   and are checked again by the server when the order is placed.
   ===================================================================== */

export type Tier = 'reseller' | 'corporate';
export const TIER_LABEL: Record<Tier, string> = { reseller: 'Reseller', corporate: 'Corporate' };

/* a slab is a range (min to max; no max = up to the next slab) or, in a "fixed" product, exactly `min` pieces */
export interface Slab { min: number; max?: number | null; warranty: number; noWarranty: number | null }
/** offerLeft: pieces still on offer at partner prices (the server hides a product whose offer is used up) */
export interface PriceEntry { visible?: boolean; mode?: 'range' | 'fixed'; offerLeft?: number; slabs: Slab[]; variants?: { name: string; slabs: Slab[] }[] }
export interface Seller { name: string; logoUrl?: string; warrantyText?: string }

/* The signed-in, approved partner's price list. It arrives with the partner session and is never part of the public pages. */
export const b2bList: Record<string, PriceEntry> = {};
export let b2bSeller: Seller = { name: 'Munshiganj IT Global' };

/* the older API answered with per-tier prices (warranty, noWarranty, colors, qty breaks, moq): the same list as slabs */
interface LegacyPrice { warranty: number; noWarranty?: number; colors?: Record<string, number>; qty?: [number, number][]; moq?: number }
const r10 = (n: number) => Math.max(10, Math.round(n / 10) * 10);
export function fromLegacy(prices: Record<string, LegacyPrice>): Record<string, PriceEntry> {
  const out: Record<string, PriceEntry> = {};
  for (const [id, tp] of Object.entries(prices)) {
    if (!tp || !(tp.warranty > 0)) continue;
    const moq = tp.moq || 1;
    const slabsFor = (base: number): Slab[] => [
      { min: moq, warranty: base, noWarranty: tp.noWarranty || null },
      ...(tp.qty || []).filter(([m]) => m > moq).map(([m, u]) => ({ min: m, warranty: r10(base * (u / tp.warranty)), noWarranty: tp.noWarranty ? r10(tp.noWarranty * (u / tp.warranty)) : null })),
    ];
    out[id] = { visible: true, slabs: slabsFor(tp.warranty), variants: Object.entries(tp.colors || {}).filter(([, v]) => v !== tp.warranty).map(([name, v]) => ({ name, slabs: slabsFor(v) })) };
  }
  return out;
}

export function setPartnerList(list: Record<string, PriceEntry>, seller?: Seller | null) {
  for (const id of Object.keys(b2bList)) delete b2bList[id];
  for (const [id, e] of Object.entries(list)) if (e && e.visible !== false) b2bList[id] = e;
  if (seller?.name) b2bSeller = seller;
}
export const clearPartnerList = () => { for (const id of Object.keys(b2bList)) delete b2bList[id]; };
export const partnerEntry = (isPartner: boolean, id: string): PriceEntry | undefined => (isPartner ? b2bList[id] : undefined);

const priced = (s: Slab[]) => s.some(x => x.warranty > 0 || (x.noWarranty ?? 0) > 0);

/* the slabs that apply to a colour: its own when it has prices, else the product's */
export function slabsOf(e: PriceEntry, color?: string | null): Slab[] {
  const v = color ? e.variants?.find(x => x.name.toLowerCase() === color.toLowerCase()) : undefined;
  return v && priced(v.slabs) ? v.slabs : e.slabs;
}
/** names of the colours that have a price of their own */
export const variantNames = (e: PriceEntry) => (e.variants || []).filter(v => priced(v.slabs)).map(v => v.name);
/** "3 – 9", "3", "10+": the quantities a slab covers (the next slab's start closes an open range) */
export function slabLabel(slabs: Slab[], i: number): string {
  const s = slabs[i], next = slabs[i + 1];
  if (s.max != null) return s.max === s.min ? String(s.min) : `${s.min}–${s.max}`;
  return next ? `${s.min}–${next.min - 1}` : `${s.min}+`;
}
/** the exact quantities a "fixed" product can be bought in (empty for a range product) */
export const fixedQuantities = (e: PriceEntry): number[] => (e.mode === 'fixed' ? e.slabs.map(s => s.min) : []);
/** the minimum order: the first slab's quantity */
export const minQty = (e: PriceEntry) => e.slabs[0]?.min ?? 1;
/** the price shown on product cards: the first slab that has a with-warranty price */
export const cardPrice = (e: PriceEntry) => e.slabs.find(s => s.warranty > 0)?.warranty ?? 0;
/** true when some slab has a without-warranty price */
export const offersNoWarranty = (e: PriceEntry) => [...e.slabs, ...(e.variants || []).flatMap(v => v.slabs)].some(s => (s.noWarranty ?? 0) > 0);

/** unit price at this TOTAL quantity of the product, or null when the quantity is below the minimum / the price is not offered */
export function unitPrice(e: PriceEntry, o: { warranty: boolean; color?: string | null; qty: number }): number | null {
  const slabs = slabsOf(e, o.color);
  let hit: Slab | undefined;
  for (const s of slabs) if (s.min <= o.qty && (s.max == null || o.qty <= s.max)) hit = s;
  if (!hit) return null;
  const v = o.warranty ? hit.warranty : hit.noWarranty;
  return v && v > 0 ? v : null;
}

/* ---------- partner accounts (applications and approval live in AgainERP) ---------- */
export type PartnerStatus = 'pending' | 'approved' | 'rejected';
export interface Partner {
  id: string; type: Tier; business: string; person: string; phone: string; district: string;
  status: PartnerStatus; at: string; /** an approved partner has asked to become this type; the admin decides */ requestedTier?: Tier | null; volume?: string; tradeLicense?: string; note?: string;
}
export const normPhone = (s: string) => s.replace(/\D/g, '').replace(/^880/, '0');
