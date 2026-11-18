/* My Gadget Setup engine: reads the generic (v2) description of gadget types, devices, groups and
   matching rules that the AgainERP plugin holds, and answers the page's questions:
   which products match this device, what to print in "Your Report", what the line under each list says.
   No data lives here and no gadget type is named here; see apps/api/app/services/gadget_config.py for the shape.
   Pure functions (no React, no Next) so they can be tested on their own. */
import type { Product } from './data';

export type FieldKind = 'number' | 'select' | 'text' | 'dims';
export interface Field { key: string; label: string; kind: FieldKind; unit?: string; options?: string[] }
export type Expr =
  | { attr: string; as?: 'num' | 'watts' | 'gb' | 'text' }
  | { dev: string; cap?: number }
  | { c: unknown }
  | { fn: 'connector' };
export interface Cond { l?: Expr; op: 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le' | 're' | 'fits'; r?: Expr }
export interface Rule { when?: Cond[]; all: Cond[] }
export interface ReportRow { label: string; value: string; if?: string; else?: string }
export interface GGroup {
  key: string; label: string; icon: string; cat: string; sub?: string; showAll?: boolean; enabled?: boolean;
  rules?: Rule[]; note?: { if?: string; text: string }[]; emptyNote?: { ifNot?: string; text: string }[];
}
export interface GType { key: string; name: string; icon: string; fields: Field[]; report: ReportRow[]; groups: GGroup[] }
export interface Device { type: string; brand: string; model: string; v: Record<string, unknown> }
export interface Gadget { types: GType[]; devices: Device[] }

/* ---------- reading a product's attributes ---------- */
const num = (v?: string) => parseFloat((v || '').replace(/[^\d.]/g, '')) || 0;
/* a "3A" cable rating carries about 15W at 5V */
const watts = (v?: string) => (v && /A$/.test(v) ? num(v) * 5 : num(v));
const gigabytes = (v?: string) => num(v) * (/TB/i.test(v || '') ? 1024 : 1);
/** the connector a cable / adapter has; read from its name until products carry a Connector attribute */
export const connectorOf = (p: Product) =>
  /aux|3\.5mm audio/i.test(p.name) ? 'Other' : /lightning/i.test(p.name) ? 'Lightning' : 'USB Type-C';
/** the product lists this device's model under "Compatible", or has it in its name */
export const fitsModel = (p: Product, model: string) =>
  (p.attrs?.Compatible || '').toLowerCase().split(/\s*,\s*/).includes(model.toLowerCase()) || p.name.toLowerCase().includes(model.toLowerCase());

export const gbText = (gb: number) => (gb >= 1024 ? gb / 1024 + 'TB' : gb + 'GB');

/* ---------- rules ---------- */
function value(e: Expr | undefined, p: Product, d: Device): unknown {
  if (!e) return undefined;
  if ('attr' in e) {
    const raw = p.attrs?.[e.attr];
    switch (e.as) {
      case 'num': return num(raw);
      case 'watts': return watts(raw);
      case 'gb': return gigabytes(raw);
      case 'text': return raw ?? '';
      default: return raw;
    }
  }
  if ('dev' in e) {
    const v = d.v[e.dev];
    return e.cap != null && typeof v === 'number' ? Math.min(v, e.cap) : v;
  }
  if ('c' in e) return e.c;
  return connectorOf(p);
}

function holds(c: Cond, p: Product, d: Device): boolean {
  if (c.op === 'fits') return fitsModel(p, d.model);
  const l = value(c.l, p, d) as never, r = value(c.r, p, d) as never;
  switch (c.op) {
    case 'eq': return l === r;
    case 'ne': return l !== r;
    case 'gt': return l > r;
    case 'ge': return l >= r;
    case 'lt': return l < r;
    case 'le': return l <= r;
    case 're': return new RegExp(String(r)).test(String(l ?? ''));
    default: return false;
  }
}

/** Best Matching: the first rule whose "when" holds decides; a group with no rule matches nothing */
export function isBestMatch(g: GGroup, p: Product, d: Device): boolean {
  for (const rule of g.rules || []) {
    if (rule.when && !rule.when.every(c => holds(c, p, d))) continue;
    return rule.all.every(c => holds(c, p, d));
  }
  return false;
}

/* ---------- text templates: {field}  {field|num}  {field|gb}  {field|join}; {model} and {brand} are always there ---------- */
export function fill(text: string, d: Device): string {
  return text.replace(/\{(\w+)(?:\|(\w+))?\}/g, (_, key: string, filter?: string) => {
    const raw = key === 'model' ? d.model : key === 'brand' ? d.brand : d.v[key];
    switch (filter) {
      case 'num': return Number(raw).toLocaleString('en-US');
      case 'gb': return gbText(Number(raw));
      case 'join': return (Array.isArray(raw) ? raw : []).join(' × ');
      default: return raw == null ? '' : String(raw);
    }
  });
}

/** the "Your Report" rows */
export const reportOf = (t: GType, d: Device): [string, string][] =>
  t.report.map(r => [r.label, r.if ? (d.v[r.if] ? fill(r.value, d) : r.else ?? '') : fill(r.value, d)]);

/** the line under "Best Matching" */
export function noteOf(g: GGroup, d: Device): string {
  for (const n of g.note || []) if (!n.if || d.v[n.if]) return fill(n.text, d);
  return `Same or higher capability than your ${d.model} needs.`;
}

/** the message shown when nothing matches */
export function emptyNoteOf(g: GGroup, d: Device): string {
  for (const n of g.emptyNote || []) if (!n.ifNot || !d.v[n.ifNot]) return fill(n.text, d);
  return 'No exact match in stock right now — see the options on the right.';
}
