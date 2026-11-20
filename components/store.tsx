'use client';
/* =====================================================================
   Client store: cart, wishlist, compare, coupon, toasts, drawers.
   Persisted to localStorage now; swap the load/save calls for the
   againERP cart & wishlist APIs later — the component API stays the same.
   ===================================================================== */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { byId, type Product } from '@/lib/data';
import { productUrl } from '@/lib/format';
import { defaultCombo, variantsOf } from '@/lib/variants';
import { fixedQuantities, minQty, partnerEntry, unitPrice } from '@/lib/b2b';
import { usePartner } from './partner';
import { ApiError, clearSession, couponDiscount, findCoupon, previewCoupon, getCustomer, getToken, logout as apiLogout, saveSession, type CouponRule, type Customer, type Session } from '@/lib/api';

/** warranty: false = partner bought the no-warranty price (only for approved partners) */
/** vid: the catalog variant id of a product with options (colour / size ...); `color` then holds the variant's label ("Black / 128GB") */
export interface CartItem { id: string; qty: number; color: string | null; warranty?: boolean; vid?: string }
/** b2b: unit is the approved partner's price (tier, warranty, colour, quantity break) */
/* partnerNote: a partner has a price for this product but this line does not get it (below the minimum, or not an offered quantity) */
export interface CartLine extends CartItem { p: Product; unit: number; b2b: boolean; partnerNote?: string }
export interface Toast { id: number; msg: ReactNode; icon: string }
type Drawer = 'cart' | 'nav' | 'filters' | null;
/* what the cart drawer highlights after Buy Now / Add to Cart (client point 12) */
export interface LastAdded { id: string; color: string | null; mode: 'add' | 'buy'; n: number }

export const COMPARE_MAX = 4;

/* the colour a cart line really has: null for products without colour options, first option when unknown */
const colorOf = (p: Product, c: string | null) => (p.colors ? (p.colors.find(x => x[0] === c) || p.colors[0])[0] : c ?? null);

const read = <T,>(k: string, d: T): T => { try { const v = localStorage.getItem('nt3_' + k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } };
const write = (k: string, v: unknown) => { try { localStorage.setItem('nt3_' + k, JSON.stringify(v)); } catch { /* private mode */ } };

interface Store {
  ready: boolean;
  cart: CartLine[]; cartCount: number; cartTotal: number;
  addToCart: (id: string, qty?: number, color?: string | null, warranty?: boolean, vid?: string) => void;
  /** add, then slide the cart drawer in from the right with an "Added to cart" panel (mode 'buy' highlights Checkout) */
  addAndOpen: (id: string, mode: 'add' | 'buy', qty?: number, color?: string | null, warranty?: boolean, vid?: string) => void;
  /** add to the cart and keep the page as it is (the card flies to the header cart instead); false = the product needs an option first, the shopper was sent to its page */
  addQuiet: (id: string, qty?: number, color?: string | null, warranty?: boolean, vid?: string) => boolean;
  lastAdded: LastAdded | null;
  setQty: (index: number, qty: number) => void;
  removeLine: (index: number) => void;
  clearCart: () => void;
  wish: string[]; toggleWish: (id: string) => boolean; removeWish: (id: string) => void;
  compare: string[]; toggleCompare: (id: string) => boolean | null; removeCompare: (id: string) => void; clearCompare: () => void;
  /** applied coupon code (validated against the live coupon list; the server re-checks at checkout) */
  coupon: string | null; clearCoupon: () => void;
  /** checks the code against the live list AND the server's rules for this cart; message = the server's words when it cannot be used */
  applyCoupon: (code: string) => Promise<{ ok: boolean; message?: string }>;
  /** discount for a subtotal under the applied coupon: the server's own figure for the whole cart, the shop's estimate for anything else */
  discount: (subtotal: number) => number;
  /** why the applied coupon takes nothing off this cart right now (the server's words), or null */
  couponNote: string | null;
  /** signed-in customer (null = guest) */
  customer: Customer | null; signIn: (s: Session) => void; signOut: () => void;
  lang: 'en' | 'bn'; setLang: (l: 'en' | 'bn') => void;
  toasts: Toast[]; toast: (msg: ReactNode, icon?: string) => void;
  drawer: Drawer; openDrawer: (d: Drawer) => void; closeDrawer: () => void;
  bump: number;
}
const Ctx = createContext<Store | null>(null);
export const useStore = () => { const s = useContext(Ctx); if (!s) throw new Error('useStore outside StoreProvider'); return s; };


export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [wish, setWish] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);
  const [couponRule, setRule] = useState<CouponRule | null>(null);
  const [srvDisc, setSrvDisc] = useState<{ key: string; amount: number; error?: string } | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [lang, setLangS] = useState<'en' | 'bn'>('en');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [bump, setBump] = useState(0);
  const [lastAdded, setLastAdded] = useState<LastAdded | null>(null);
  const tid = useRef(0);
  const { tier } = usePartner();
  const router = useRouter();

  useEffect(() => {
    setItems(read<CartItem[]>('cart', []).reduce<CartItem[]>((l, i) => {
      const p = byId(i.id); if (!p) return l;
      const it = { ...i, color: colorOf(p, i.color) }, ex = l.find(x => x.id === it.id && x.color === it.color);
      return ex ? l.map(x => (x === ex ? { ...x, qty: Math.min(10, x.qty + it.qty) } : x)) : [...l, it];
    }, [])); setWish(read('wish', [])); setCompare(read('compare', []));
    setRule(read<CouponRule | null>('coupon', null)); setCustomer(getToken() ? getCustomer() : null); setLangS(read('lang', 'en')); setReady(true);
  }, []);
  useEffect(() => { if (ready) write('cart', items); }, [items, ready]);
  useEffect(() => { if (ready) write('wish', wish); }, [wish, ready]);
  useEffect(() => { if (ready) write('compare', compare); }, [compare, ready]);
  useEffect(() => { if (ready) write('coupon', couponRule); }, [couponRule, ready]);
  useEffect(() => { document.body.classList.toggle('lock', !!drawer); document.body.classList.toggle('dim', !!drawer); }, [drawer]);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawer(null); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);

  const toast = useCallback((msg: ReactNode, icon = 'checkCircle') => {
    const id = ++tid.current;
    setToasts(t => [...t, { id, msg, icon }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2800);
  }, []);

  const cart = useMemo<CartLine[]>(() => {
    // a partner's slab is chosen by the TOTAL quantity of the product (all its colours together)
    const total = new Map<string, number>();
    for (const i of items) total.set(i.id, (total.get(i.id) ?? 0) + i.qty);
    return items.map(i => {
      const p = byId(i.id); if (!p) return null;
      const c = p.colors && p.colors.find(x => x[0] === colorOf(p, i.color));
      const color = c ? c[0] : i.color ?? null;
      const e = partnerEntry(!!tier, p.id);
      // partner price only from the minimum order quantity; below it the line is charged at retail
      let partnerNote: string | undefined;
      if (e) {
        const n = total.get(i.id) ?? i.qty;
        if (n >= minQty(e)) {
          const unit = unitPrice(e, { warranty: i.warranty !== false, color: i.color, qty: n });
          if (unit != null) return { ...i, p, color, b2b: true, unit };
          const fixed = fixedQuantities(e);
          partnerNote = fixed.length ? `Partner prices are for ${fixed.join(', ')} pcs only (you have ${n}) — charged at the retail price` : 'The partner price is not available at this quantity — charged at the retail price';
        } else partnerNote = `Partner price needs ${minQty(e)}+ pcs of this product (you have ${n}) — charged at the retail price`;
      }
      // a variant line: the variant's own price (the live offer is worked into it) and picture
      const vc = i.vid ? variantsOf(p.id).combos.find(x => x.variantId === i.vid) : undefined;
      const shown = vc?.media?.images[0] ? { ...p, image: vc.media.images[0] } : p;
      return { ...i, p: shown, color, b2b: false, warranty: true, unit: vc ? vc.price : c ? c[2] : p.price, partnerNote };
    }).filter((x): x is CartLine => !!x);
  }, [items, tier]);

  /** a partner buying a product that has a partner price: its colours come from the partner list, not from the variants */
  const partnerOwn = (id: string) => !!tier && !!partnerEntry(true, id);

  /* returns the colour the line was stored with (undefined → unknown product) */
  const add = (id: string, qty: number, color: string | null, warranty = true, vid?: string) => {
    const p = byId(id); if (!p) return undefined;
    const col = colorOf(p, color);
    // a product has one warranty choice in the cart (the server prices it that way): the newest choice applies to all its lines
    setItems(l => { const ex = l.find(i => i.id === id && colorOf(p, i.color) === col); const next = ex ? l.map(i => (i === ex ? { ...i, qty: Math.min(tier ? 999 : 10, i.qty + qty) } : i)) : [...l, { id, qty, warranty, color: col, ...(vid ? { vid } : {}) }]; return next.map(i => (i.id === id ? { ...i, warranty } : i)); });
    setBump(b => b + 1);
    return col;
  };

  // The coupon's discount as the SERVER works it out for the whole cart (its rules: covered products / categories / brands, minimum
  // order, price ranges, usage limit). The cart page, the cart drawer and the checkout all read this one figure. A cart with a partner
  // line keeps the shop's estimate (partner pricing is the server's own rule).
  const cartSig = cart.map(i => i.id + ':' + (i.vid || '') + ':' + i.qty).join(',');
  const cartSub = cart.reduce((s, i) => s + i.qty * i.unit, 0);
  const hasPartnerLine = cart.some(i => i.b2b);
  const cartKey = couponRule && cart.length && !hasPartnerLine ? couponRule.code + '|' + cartSig : '';
  const srvNow = srvDisc && cartKey && srvDisc.key === cartKey ? srvDisc : null;
  useEffect(() => {
    if (!cartKey || !couponRule) return;
    let live = true;
    const t = setTimeout(() => {
      previewCoupon(cart.map(i => ({ p: i.p, qty: i.qty, vid: i.vid })), couponRule.code, '', getToken())
        .then(a => { if (live) setSrvDisc({ key: cartKey, amount: a }); })
        .catch(e => { if (live && e instanceof ApiError && e.status !== 0) setSrvDisc({ key: cartKey, amount: 0, error: e.message }); });
    }, 400);
    return () => { live = false; clearTimeout(t); };
  }, [cartKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const value: Store = {
    ready, cart,
    cartCount: cart.reduce((s, i) => s + i.qty, 0),
    cartTotal: cart.reduce((s, i) => s + i.qty * i.unit, 0),
    addToCart: (id, qty = 1, color = null, warranty = true, vid) => {
      // a product with options and no choice made (wishlist, a bundle): its default variant
      if (!vid && !partnerOwn(id)) { const c = defaultCombo(variantsOf(id).combos); if (c) return void add(id, qty, c.label, warranty, c.variantId); }
      add(id, qty, color, warranty, vid);
    },
    addAndOpen: (id, mode, qty = 1, color = null, warranty = true, vid) => {
      // a product card's quick button on a product with options: the shopper picks the option on the product page (like excellent-web)
      if (!vid && !partnerOwn(id) && variantsOf(id).combos.length) { toast('Please choose an option', 'info'); router.push(productUrl(id)); return; }
      const col = add(id, qty, color, warranty, vid); if (col === undefined) return;
      setLastAdded(x => ({ id, color: col, mode, n: (x?.n ?? 0) + 1 })); setDrawer('cart');
    },
    addQuiet: (id, qty = 1, color = null, warranty = true, vid) => {
      if (!vid && !partnerOwn(id) && variantsOf(id).combos.length) { toast('Please choose an option', 'info'); router.push(productUrl(id)); return false; }
      return add(id, qty, color, warranty, vid) !== undefined;
    },
    lastAdded,
    setQty: (index, qty) => setItems(l => l.map((i, k) => {
      if (k !== index) return i;
      let q = Math.max(1, Math.min(tier ? 999 : 10, qty));
      // a product sold to partners in fixed quantities: the +/- buttons step through the offered quantities
      const e = partnerEntry(!!tier, i.id), fixed = e ? fixedQuantities(e) : [];
      if (fixed.length && l.filter(x => x.id === i.id).length === 1) q = q > i.qty ? (fixed.find(f => f >= q) ?? i.qty) : ([...fixed].reverse().find(f => f <= q) ?? fixed[0]);
      return { ...i, qty: q };
    })),
    removeLine: index => setItems(l => l.filter((_, k) => k !== index)),
    clearCart: () => setItems([]),
    wish,
    toggleWish: id => { const on = !wish.includes(id); setWish(l => (on ? [...l, id] : l.filter(x => x !== id))); return on; },
    removeWish: id => setWish(l => l.filter(x => x !== id)),
    compare,
    toggleCompare: id => {
      if (compare.includes(id)) { setCompare(l => l.filter(x => x !== id)); return false; }
      if (compare.length >= COMPARE_MAX) { toast('You can compare up to ' + COMPARE_MAX + ' products', 'info'); return null; }
      setCompare(l => [...l, id]); return true;
    },
    removeCompare: id => setCompare(l => l.filter(x => x !== id)),
    clearCompare: () => setCompare([]),
    coupon: couponRule ? couponRule.code : null,
    applyCoupon: async code => {
      try {
        const r = await findCoupon(code);
        if (!r) return { ok: false };
        if (cart.length && !hasPartnerLine) {
          try {
            const a = await previewCoupon(cart.map(i => ({ p: i.p, qty: i.qty, vid: i.vid })), r.code, '', getToken());
            setSrvDisc({ key: r.code + '|' + cartSig, amount: a });
          } catch (e) { if (e instanceof ApiError && e.status !== 0) return { ok: false, message: e.message }; }
        }
        setRule(r);
        return { ok: true };
      } catch { return { ok: false }; }
    },
    clearCoupon: () => setRule(null),
    discount: sub => (srvNow && Math.abs(sub - cartSub) < 0.005 ? Math.min(srvNow.amount, sub) : couponDiscount(couponRule, sub)),
    couponNote: srvNow?.error ?? null,
    customer,
    signIn: x => { saveSession(x); setCustomer(x.customer); },
    signOut: () => { const t = getToken(); if (t) void apiLogout(t); clearSession(); setCustomer(null); },
    lang, setLang: l => { setLangS(l); write('lang', l); },
    toasts, toast,
    // opening the cart from the header / bottom nav shows the plain cart (no "Added" panel)
    drawer, openDrawer: d => { setLastAdded(null); setDrawer(d); }, closeDrawer: () => setDrawer(null),
    bump,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
