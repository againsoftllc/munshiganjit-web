'use client';
/* Partner (Reseller / Corporate) accounts. There is ONE account: the customer account. A customer registers / signs in, then
   applies for a reseller or corporate account from /reseller or /corporate; the admin approves it in AgainERP
   (Workspace → Plugins → Partner Program), and from then on the partner price list arrives with that same signed-in account
   (GET /partners/me). No separate partner login, nothing partner-related is kept in the browser. */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { clearPartnerList, fromLegacy, normPhone, setPartnerList, type Partner, type PriceEntry, type Seller, type Tier } from '@/lib/b2b';
import { AGAINERP_API, erp } from '@/lib/againerp';
import { SESSION_EVENT, getCustomer, getToken, type Customer, type Session as CustomerSession } from '@/lib/api';

interface PartnerCtx {
  ready: boolean;
  /** the visitor is signed in to a customer account (a partner application needs it) */
  signedIn: boolean;
  /** the signed-in account, for prefilling the application */
  account: Customer | null;
  me: Partner | null;
  /** tier whose prices this visitor sees: only for an approved, signed-in partner */
  tier: Tier | null;
  /** sends the application from the signed-in account; null = not signed in, or the server could not be reached */
  register: (p: Omit<Partner, 'id' | 'status' | 'at'>) => Promise<Partner | null>;
  /** a visitor with no account: makes the customer account (phone + password), signs it in and sends the application in one step.
   *  Returns the sign-in session (the caller hands it to the store) or the reason it failed (a phone that already has an account, ...) */
  registerNew: (p: Omit<Partner, 'id' | 'status' | 'at'>, password: string, email: string) => Promise<{ session: CustomerSession } | { error: string }>;
  /** asks the server again (after the admin approved, for instance) */
  refresh: () => Promise<void>;
  /** an approved partner asks to become the other type (the application's details stay); null cancels a waiting request. Returns an error text or null */
  switchTo: (tier: Tier | null) => Promise<string | null>;
}
const Ctx = createContext<PartnerCtx | null>(null);
export const usePartner = () => { const c = useContext(Ctx); if (!c) throw new Error('usePartner outside PartnerProvider'); return c; };

/* `list`: the slabs (new API); `prices`: the same prices in the older per-tier shape */
type Session = { partner: Partner | null; list?: Record<string, PriceEntry> | null; prices?: Parameters<typeof fromLegacy>[0] | null; seller?: Seller | null };

export function PartnerProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Partner | null>(null);
  const [account, setAccount] = useState<Customer | null>(null);
  const [signedIn, setSignedIn] = useState(false);

  /* the partner status (and prices once approved) of the signed-in account */
  const load = async () => {
    const token = getToken();
    setSignedIn(!!token);
    setAccount(token ? getCustomer() : null);
    if (!token) { setMe(null); clearPartnerList(); return; }
    const s = await erp<Session>('/partners/me', undefined, token);
    setMe(s?.partner ?? null);
    const list = s?.list ?? (s?.prices ? fromLegacy(s.prices) : null);
    if (list && Object.keys(list).length) setPartnerList(list, s?.seller); else clearPartnerList();
  };

  useEffect(() => {
    void load().finally(() => setReady(true));
    // signing in / out (this tab or another) changes who the partner is
    const again = () => { void load(); };
    addEventListener(SESSION_EVENT, again);
    addEventListener('storage', again);
    return () => { removeEventListener(SESSION_EVENT, again); removeEventListener('storage', again); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value: PartnerCtx = {
    ready, signedIn, account, me,
    tier: me && me.status === 'approved' ? me.type : null,
    register: async data => {
      const token = getToken();
      if (!token) return null;
      const r = await erp<{ partner: Partner }>('/partners/apply', {
        tier: data.type, business: data.business, person: data.person, phone: normPhone(data.phone), district: data.district,
        trade_license: data.tradeLicense || null, volume: data.volume || null, note: data.note || null,
      }, token);
      if (!r?.partner) return null;
      setMe(r.partner);
      return r.partner;
    },
    registerNew: async (data, password, email) => {
      if (!AGAINERP_API) return { error: 'The server is not reachable. Please try again.' };
      try {
        const r = await fetch(AGAINERP_API + '/api/v1/storefront/munshiganjit/partners/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            tier: data.type, business: data.business, person: data.person, phone: normPhone(data.phone), email: email.trim() || null, password,
            district: data.district, trade_license: data.tradeLicense || null, volume: data.volume || null, note: data.note || null,
          }),
        });
        const j = await r.json().catch(() => null) as { token?: string; customer?: Customer; partner?: Partner; detail?: unknown } | null;
        if (!r.ok || !j?.token || !j.customer) {
          const d = j?.detail;
          return { error: typeof d === 'string' ? d : Array.isArray(d) ? d.map(x => (x as { msg?: string }).msg).filter(Boolean).join(', ') : 'Could not send your application. Please try again.' };
        }
        setMe(j.partner ?? null);
        return { session: { token: j.token, customer: j.customer } };
      } catch {
        return { error: 'Cannot reach the server. Please check your connection and try again.' };
      }
    },
    refresh: load,
    switchTo: async tier => {
      const token = getToken();
      if (!token || !AGAINERP_API) return 'Please sign in first.';
      try {
        const res = await fetch(AGAINERP_API + '/api/v1/storefront/munshiganjit/partners/switch', {
          method: tier ? 'POST' : 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(10000),
          body: tier ? JSON.stringify({ tier }) : undefined,
        });
        const j = await res.json().catch(() => null) as { partner?: Partner; detail?: unknown } | null;
        if (!res.ok) return typeof j?.detail === 'string' ? j.detail : 'Could not send the request. Please try again.';
        if (j?.partner) setMe(j.partner);
        return null;
      } catch { return 'Cannot reach the server. Please check your connection and try again.'; }
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
