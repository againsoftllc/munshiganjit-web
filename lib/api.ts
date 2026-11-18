/* AgainERP storefront API client — customer session, orders, coupons.
   Base URL: NEXT_PUBLIC_AGAINERP_API. The session is a bearer token kept in localStorage;
   a checkout builds a short-lived server cart (X-Cart-Token) from the browser cart. */
import type { Product } from './data';

export const API = (process.env.NEXT_PUBLIC_AGAINERP_API || '').replace(/\/$/, '');
const S = API + '/api/v1/storefront';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export interface Customer {
  id: string; customer_code: string; name: string; phone: string; email: string; city: string; region: string;
  reward_points: number; total_orders: number; wallet_balance: string; has_password: boolean; profile_image: string | null;
}
export interface Session { token: string; customer: Customer }

/* ---------- session storage ---------- */
const TOKEN = 'nt3_token', CUST = 'nt3_customer';
export const getToken = (): string | null => { try { return localStorage.getItem(TOKEN); } catch { return null; } };
export const getCustomer = (): Customer | null => { try { const v = localStorage.getItem(CUST); return v ? (JSON.parse(v) as Customer) : null; } catch { return null; } };
/** fired (same tab) when the customer signs in or out, so what depends on the account (the partner prices) asks again */
export const SESSION_EVENT = 'nt3-session';
const announce = () => { try { dispatchEvent(new Event(SESSION_EVENT)); } catch { /* no window */ } };
export const saveSession = (s: Session) => { try { localStorage.setItem(TOKEN, s.token); localStorage.setItem(CUST, JSON.stringify(s.customer)); } catch { /* private mode */ } announce(); };
export const clearSession = () => { try { localStorage.removeItem(TOKEN); localStorage.removeItem(CUST); } catch { /* private mode */ } announce(); };

/* ---------- transport ---------- */
interface Opts { method?: string; body?: unknown; token?: string | null; cart?: string | null }
async function call<T>(path: string, o: Opts = {}): Promise<T> {
  if (!API) throw new ApiError('The shop server is not configured (NEXT_PUBLIC_AGAINERP_API).', 0);
  const headers: Record<string, string> = {};
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';
  if (o.token) headers.Authorization = 'Bearer ' + o.token;
  if (o.cart) headers['X-Cart-Token'] = o.cart;
  let r: Response;
  try {
    r = await fetch(S + path, { method: o.method || (o.body !== undefined ? 'POST' : 'GET'), headers, body: o.body !== undefined ? JSON.stringify(o.body) : undefined });
  } catch {
    throw new ApiError('Cannot reach the shop server. Please try again.', 0);
  }
  const text = await r.text();
  let json: unknown = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  if (!r.ok) {
    const d = (json as { detail?: unknown } | null)?.detail;
    const msg = typeof d === 'string' ? d : Array.isArray(d) ? d.map(x => (x as { msg?: string }).msg).filter(Boolean).join(', ') : 'Request failed (' + r.status + ')';
    throw new ApiError(msg, r.status);
  }
  return json as T;
}

/* ---------- auth ---------- */
export const login = (identifier: string, password: string) => call<Session>('/auth/login', { body: { identifier, password } });
export const register = (name: string, phone: string, email: string | null, password: string) => call<Session>('/auth/register', { body: { name, phone, email, password } });
export const requestOtp = (identifier: string) => call<{ ok: boolean; expires_in: number; masked: string; development_otp?: string }>('/auth/request-otp', { body: { identifier } });
export const verifyOtp = (identifier: string, otp: string, name?: string) => call<Session>('/auth/verify-otp', { body: { identifier, otp, name: name || null } });
export const logout = (token: string) => call('/auth/logout', { method: 'POST', token, body: {} }).catch(() => null);
export const fetchMe = (token: string) => call<{ data?: Customer } & Partial<Customer>>('/auth/me', { token });

/* ---------- coupons (validated against the live list; the server re-checks at checkout) ---------- */
export interface CouponRule { code: string; type: 'percent' | 'flat'; value: number; max: number | null; min: number | null }
export async function findCoupon(code: string): Promise<CouponRule | null> {
  const r = await call<{ data: { coupons: Record<string, { code: string; type: string; value: number; maxDiscount: number | null; minOrder: number | null; startsAt?: string; endsAt?: string; usageLimit?: number | null; used?: number; active: boolean }> } }>('/coupons');
  const today = new Date().toISOString().slice(0, 10);
  const c = Object.values(r.data.coupons).find(x => x.code.toUpperCase() === code.toUpperCase());
  if (!c || !c.active || (c.startsAt && today < c.startsAt) || (c.endsAt && today > c.endsAt)) return null;
  if (c.usageLimit && (c.used ?? 0) >= c.usageLimit) return null;
  return { code: c.code, type: c.type === 'percent' ? 'percent' : 'flat', value: c.value, max: c.maxDiscount, min: c.minOrder };
}
export const couponDiscount = (rule: CouponRule | null, subtotal: number) => {
  if (!rule || subtotal <= 0 || (rule.min && subtotal < rule.min)) return 0;
  const raw = rule.type === 'percent' ? Math.round(subtotal * rule.value) / 100 : rule.value; // to the paisa, like the server
  return Math.min(subtotal, rule.max ? Math.min(raw, rule.max) : raw);
};

/* ---------- checkout ---------- */
export interface CheckoutForm {
  name: string; phone: string; address: string; district: string; division: string; subDistrict: string; notes?: string;
  pay: 'cod' | 'bkash' | 'card'; pickup: string | null; coupon: string | null; email?: string;
  /** the Cloudflare Turnstile answer (when the site has a key) */
  turnstile?: string;
}
export interface PlacedOrder { id: string; orderNumber: string; total: number; payMethod: string }
interface CartRead { data: { cart_token: string } }

/** Builds a fresh server cart from the browser cart lines and places the order. */
/** b2b: the line was priced as a partner line (warranty / colour as the partner chose); the server prices it again from the signed-in partner account */
export interface OrderLine { p: Product; qty: number; b2b?: boolean; warranty?: boolean; color?: string | null; /** the catalog variant id of a product with options */ vid?: string }
/** What the SERVER says the coupon takes off these lines (its own rules: products / categories / brands the coupon covers, price ranges,
 *  minimum order, usage limit). Throws an ApiError with the server's words when the coupon cannot be used (for example "Minimum order amount is ৳2000"). */
export async function previewCoupon(lines: OrderLine[], code: string, district: string, token: string | null): Promise<number> {
  let cart: string | null = null;
  for (const l of lines) {
    if (!l.p.uid) continue;
    const r: CartRead = await call<CartRead>('/cart/items', { token, cart, body: { product_id: l.p.uid, quantity: l.qty, ...(l.vid ? { variant_id: l.vid } : {}) } });
    cart = r.data.cart_token;
  }
  if (!cart) throw new ApiError('Your cart is empty.', 0);
  const r = await call<{ data: { discount: string } }>('/checkout/preview', { token, cart, body: { shipping_method: 'standard', coupon_code: code, district } });
  return Number(r.data.discount);
}

export async function placeOrder(lines: OrderLine[], f: CheckoutForm, token: string | null): Promise<PlacedOrder> {
  const missing = lines.filter(l => !l.p.uid);
  if (missing.length) throw new ApiError('Some products are not available for ordering right now. Please refresh the page.', 0);
  let cart: string | null = null;
  for (const l of lines) {
    const r: CartRead = await call<CartRead>('/cart/items', { token, cart, body: { product_id: l.p.uid, quantity: l.qty, ...(l.vid ? { variant_id: l.vid } : {}), ...(l.b2b ? { partner: true } : {}) } }); // a partner line: the offer quantity limits it, not the product's own stock
    cart = r.data.cart_token;
  }
  if (!cart) throw new ApiError('Your cart is empty.', 0);
  const parts = f.name.trim().split(/\s+/);
  const first = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
  const last = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const pickup = f.pickup !== null;
  // a pickup order still needs a city: the last part of the pickup point's name ("..., Dhaka")
  const pickupCity = f.pickup ? f.pickup.split(',').pop()!.trim() : '';
  // partner order: per product, the warranty choice and the colours with their quantities
  const options: Record<string, { warranty: boolean; parts: { variant: string | null; qty: number }[] }> = {};
  for (const l of lines) if (l.b2b) { const o = (options[l.p.id] ||= { warranty: l.warranty !== false, parts: [] }); o.parts.push({ variant: l.color ?? null, qty: l.qty }); }
  const partner = Object.keys(options).length > 0;
  const r = await call<{ data: { id: string; order_number: string; grand_total: string; payment_method: string } }>('/checkout', {
    token, cart,
    body: {
      first_name: first, last_name: last, phone: f.phone, email: f.email || '',
      address: pickup ? 'Store pickup: ' + f.pickup : f.address, district: pickup ? pickupCity : f.district,
      shipping_city: pickup ? pickupCity : f.subDistrict, shipping_region: pickup ? pickupCity : f.division,
      payment_method: f.pay, shipping_method: pickup ? 'pickup' : 'standard', pickup_point: f.pickup,
      notes: f.notes || null, coupon_code: f.coupon,
      ...(partner ? { partner: true, partner_options: options } : {}),
      ...(f.turnstile ? { turnstile_token: f.turnstile } : {}),
    },
  });
  return { id: r.data.id, orderNumber: r.data.order_number, total: Number(r.data.grand_total), payMethod: r.data.payment_method };
}

/* ---------- contact form: saved in the admin's Website > Messages ---------- */
export const sendContact = (body: { name: string; phone: string; email: string; subject: string; message: string; website?: string }) =>
  call<{ data: { id?: string; status: string } }>('/contact', { body });

/* ---------- orders ---------- */
export interface TrackResult {
  order_number: string; status: string; payment_status: string; shipment_status: string; payment_method: string; grand_total: string;
  customer_name: string; customer_phone: string; shipping_address: string; courier: string | null; tracking_url: string | null;
  placed_at: string; progress_pct: number; current_step: string; steps: string[]; updates: { time: string; text: string }[];
}
export const trackOrder = (query: string, phone: string) =>
  call<{ data: TrackResult }>('/orders/track', { body: { query, phone: phone || null } }).then(r => r.data);

export interface AccountOrder {
  id: string; order_number: string; date: string; product_label: string; total: string; status: string; payment_status: string; shipment_status: string;
}
export const accountOrders = (token: string) => call<{ data: AccountOrder[] }>('/account/orders', { token }).then(r => r.data);
export const accountSummary = (token: string) => call<{ data: { customer: Customer; total_orders: number; total_spend: string; status_stats: { key: string; label: string; count: number }[] } }>('/account/summary', { token }).then(r => r.data);

export interface Address { id: string | null; label: string; line1: string; city: string; region: string; postal_code: string; is_default: boolean }
export type Profile = Customer & { address: string; addresses: Address[]; customer_since?: string };
export const fetchProfile = (token: string) => call<{ data: Profile }>('/account/profile', { token }).then(r => r.data);
export const patchProfile = (token: string, body: { name?: string; email?: string; city?: string; region?: string; address?: string }) =>
  call<{ data: Profile }>('/account/profile', { method: 'PATCH', token, body }).then(r => r.data);
export const changePassword = (token: string, current: string, password: string) =>
  call('/auth/password', { method: 'PUT', token, body: { current_password: current, password, confirm_password: password } });
export const requestRefund = (token: string, order_id: string, reason: string) =>
  call('/account/refunds', { token, body: { order_id, reason } });

/* ---------- return requests: only a delivered order inside the return period; the shop approves in Website > Return Requests ---------- */
export interface ReturnableItem { item_id: string; name: string; variant_label: string | null; sku: string; quantity: number; returnable: number; unit_price: string }
export interface ReturnableOrder { id: string; order_number: string; delivered_on: string; days_left: number; items: ReturnableItem[] }
export const returnableOrders = (token: string) =>
  call<{ data: ReturnableOrder[]; meta: { window_days: number } }>('/account/returns/eligible', { token });
export const requestReturn = (token: string, body: { order_id: string; reason: string; details: string; items: { item_id: string; quantity: number }[] }) =>
  call<{ data: { return_number: string }[] }>('/account/returns', { token, body });
export interface ReturnRow { id: string; refund_number: string; date: string; order_number: string; status: string; reason: string; product_name: string; quantity: number; kind: string }
export const myReturns = (token: string) =>
  call<{ data: ReturnRow[] }>('/account/refunds', { token }).then(r => r.data.filter(x => x.kind === 'return'));

/* ---------- product questions and reviews (saved as pending; the admin approves / answers them) ---------- */
export const askQuestion = (slug: string, customer_name: string, question: string, token?: string | null) =>
  call('/products/by-slug/' + encodeURIComponent(slug) + '/qa', { token, body: { customer_name, question } });
export const writeReview = (slug: string, customer_name: string, rating: number, body: string, token?: string | null) =>
  call('/products/by-slug/' + encodeURIComponent(slug) + '/reviews', { token, body: { customer_name, rating, body } });

/* ---------- "Share Your Experience" on the home page (saved as pending; the admin approves it in Promotions > Experience) ---------- */
export const shareExperience = (body: { name: string; area: string; topic: string; rating: number; text: string; website?: string }) =>
  call<{ ok: boolean }>('/experience-reviews', { body });

/* ---------- blog comments: written by visitors, approved in the admin's Website > Blog > Comments ---------- */
export interface BlogComment { id: string; author_name: string; body: string; created_at: string; status: string; parent_id?: string | null; /** an answer written by the shop in the admin */ staff?: boolean }
export const blogComments = (slug: string) =>
  call<{ data: BlogComment[]; meta: { comments_enabled: boolean; moderate_comments: boolean } }>(`/blog/posts/${encodeURIComponent(slug)}/comments`);
export const postBlogComment = (slug: string, body: { author_name: string; author_email: string; body: string; website?: string }) =>
  call<{ data: BlogComment; meta: { awaiting_moderation: boolean } }>(`/blog/posts/${encodeURIComponent(slug)}/comments`, { body });
