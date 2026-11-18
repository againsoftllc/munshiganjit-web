/* Delta between the data the site was BUILT with (the baseline) and the data the API has NOW.

   The browser bundle only holds the baseline. The server sends a small patch (what changed since the
   build) with every page, the browser applies it before it renders, so the server and the browser
   render from exactly the same data. After a rebuild the baseline is current again and patches are
   empty. Pure functions, no React, no Next. */

export type Store = Record<string, unknown>;
type Keyed = { id: string };

export interface Patch {
  /** products changed / added since the build, ids removed, and the full id order when it differs */
  products?: { ch: Keyed[]; rm: string[]; order?: string[] };
  /** per-product page text (description, meta, specs, reviews, questions) changed / removed */
  details?: { ch: Record<string, unknown>; rm: string[] };
  /** every other top-level key whose value changed, replaced whole */
  set?: Record<string, unknown>;
}

const IGNORED = new Set(['syncedAt']);
const j = (v: unknown) => JSON.stringify(v);

const baseStrings = new WeakMap<object, { products: Map<string, string>; details: Map<string, string>; rest: Map<string, string>; order: string }>();
function strings(base: Store) {
  let c = baseStrings.get(base);
  if (!c) {
    const products = new Map<string, string>();
    for (const p of (base.products as Keyed[]) || []) products.set(p.id, j(p));
    const details = new Map<string, string>();
    for (const [k, v] of Object.entries((base.details as Record<string, unknown>) || {})) details.set(k, j(v));
    const rest = new Map<string, string>();
    for (const [k, v] of Object.entries(base)) if (k !== 'products' && k !== 'details' && !IGNORED.has(k)) rest.set(k, j(v));
    c = { products, details, rest, order: j(((base.products as Keyed[]) || []).map(p => p.id)) };
    baseStrings.set(base, c);
  }
  return c;
}

export function diff(base: Store, fresh: Store): Patch {
  const b = strings(base);
  const patch: Patch = {};

  const fp = (fresh.products as Keyed[]) || [];
  const ch = fp.filter(p => b.products.get(p.id) !== j(p));
  const ids = new Set(fp.map(p => p.id));
  const rm = [...b.products.keys()].filter(id => !ids.has(id));
  const order = j(fp.map(p => p.id));
  if (ch.length || rm.length || order !== b.order) patch.products = { ch, rm, ...(order !== b.order ? { order: fp.map(p => p.id) } : {}) };

  const fd = (fresh.details as Record<string, unknown>) || {};
  const dch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fd)) if (b.details.get(k) !== j(v)) dch[k] = v;
  const drm = [...b.details.keys()].filter(k => !(k in fd));
  if (Object.keys(dch).length || drm.length) patch.details = { ch: dch, rm: drm };

  const set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fresh)) if (k !== 'products' && k !== 'details' && !IGNORED.has(k) && b.rest.get(k) !== j(v)) set[k] = v;
  if (Object.keys(set).length) patch.set = set;
  return patch;
}

export const isEmpty = (p: Patch) => !p.products && !p.details && !p.set;

/** baseline + patch = the fresh store (a new object; the baseline is not touched) */
export function apply(base: Store, patch: Patch | null | undefined): Store {
  if (!patch || isEmpty(patch)) return base;
  const out: Store = { ...base, ...(patch.set || {}) };
  if (patch.products) {
    const byId = new Map<string, Keyed>(((base.products as Keyed[]) || []).map(p => [p.id, p]));
    for (const id of patch.products.rm) byId.delete(id);
    for (const p of patch.products.ch) byId.set(p.id, p);
    out.products = patch.products.order
      ? patch.products.order.map(id => byId.get(id)).filter((p): p is Keyed => !!p)
      : ((base.products as Keyed[]) || []).filter(p => byId.has(p.id)).map(p => byId.get(p.id) as Keyed);
  }
  if (patch.details) {
    const d = { ...((base.details as Record<string, unknown>) || {}), ...patch.details.ch };
    for (const k of patch.details.rm) delete d[k];
    out.details = d;
  }
  return out;
}
