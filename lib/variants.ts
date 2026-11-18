/* Variants (colour / storage ...) of a product, the way excellent-web does it. The catalog feed sends one row per variant (price with the live offer
   worked in, stock, SKU, its own photos and video, its options); they are folded into option groups (one button row per option name) and
   "combos" (one per variant, with its price, stock, SKU and gallery). Picking an option swaps the gallery (and the video), the price, the stock
   and the SKU for that variant's. Pure functions, no React. */
import { detailsOf, type VariantRow } from './data';

export type VariantMedia = { images: string[]; videoId?: string; videoUrl?: string; /** the video comes before the photos */ videoFirst?: boolean };
export type VariantOption = { id: string; label: string; /** a small picture shown on the button (the option's first photo) */ swatch?: string; media?: VariantMedia };
export type VariantGroup = { key: string; label: string; options: VariantOption[] };
export type VariantCombo = {
  /** one entry per group key: { color: "red", storage: "256gb" } */
  selection: Record<string, string>;
  /** the catalog variant id: what the cart is told so the server prices and labels the right variant */
  variantId: string;
  label: string; sku: string; price: number; stock: number; inStock: boolean; isDefault: boolean; media?: VariantMedia;
};
export type Selection = Record<string, string>;
export type OptionState = 'selected' | 'available' | 'disabled';

const slugOf = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'option';

/** A YouTube link or a video file URL as something the page can play */
export function videoOf(urls?: string[]): { id?: string; url?: string } {
  for (const raw of urls ?? []) {
    const u = (raw || '').trim();
    if (!u) continue;
    const yt = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{6,})/i);
    if (yt) return { id: yt[1] };
    if (/\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(u)) return { url: u };
  }
  return {};
}

/** option rows and combos from the feed's variants; none when there is nothing to pick */
export function toVariants(rows: VariantRow[] | undefined): { groups: VariantGroup[]; combos: VariantCombo[] } {
  const groups = new Map<string, VariantGroup>();
  const combos: VariantCombo[] = [];
  for (const row of rows ?? []) {
    const selection: Record<string, string> = {};
    const images = (row.gallery ?? []).filter(Boolean);
    if (!images.length && row.image) images.push(row.image);
    const video = videoOf(row.videos);
    const media: VariantMedia | undefined = images.length || video.id || video.url ? { images, videoId: video.id, videoUrl: video.url, videoFirst: row.videoFirst === true } : undefined;
    for (const opt of row.options ?? []) {
      const name = (opt.name ?? '').trim(), value = (opt.value ?? '').trim();
      if (!name || !value) continue;
      const key = slugOf(name), id = slugOf(value);
      if (!groups.has(key)) groups.set(key, { key, label: name, options: [] });
      const group = groups.get(key)!;
      const owner = key === [...groups.keys()][0]; // only the first group carries the photos (the admin's convention)
      const existing = group.options.find(o => o.id === id);
      if (!existing) group.options.push({ id, label: value, swatch: owner ? media?.images[0] : undefined, media: owner ? media : undefined });
      else if (owner && !existing.media && media) { existing.media = media; existing.swatch = media.images[0]; }
      selection[key] = id;
    }
    if (!Object.keys(selection).length) continue;
    const stock = Math.max(0, Number(row.stock) || 0);
    combos.push({ selection, variantId: row.id, label: (row.name ?? '').trim(), sku: (row.sku ?? '').trim(), price: Number(row.price) || 0, stock, inStock: row.inStock ?? stock > 0, isDefault: row.isDefault === true, media });
  }
  if (!groups.size || combos.length < 2) return { groups: [], combos: [] };
  return { groups: [...groups.values()], combos };
}

const memo = new Map<string, { rows: VariantRow[] | undefined; out: ReturnType<typeof toVariants> }>();
/** the variants of a product by its id (memoised on the data that was sent) */
export function variantsOf(id: string) {
  const rows = detailsOf(id).variants;
  const hit = memo.get(id);
  if (hit && hit.rows === rows) return hit.out;
  const out = toVariants(rows);
  memo.set(id, { rows, out });
  return out;
}
export const hasVariants = (id: string) => variantsOf(id).combos.length > 0;

/** whether at least one in-stock combo agrees with `selection` plus `groupKey: optionId` */
function isReachable(combos: VariantCombo[], selection: Selection, groupKey: string, optionId: string): boolean {
  const trial: Selection = { ...selection, [groupKey]: optionId };
  return combos.some(c => c.inStock && Object.entries(trial).every(([k, v]) => c.selection[k] === v));
}
export function optionState(combos: VariantCombo[], selection: Selection, groupKey: string, optionId: string): OptionState {
  if (selection[groupKey] === optionId) return 'selected';
  return isReachable(combos, selection, groupKey, optionId) ? 'available' : 'disabled';
}
/** the variant a complete selection points at (in stock or not: its price and photos still show) */
export function matchCombo(combos: VariantCombo[], selection: Selection): VariantCombo | undefined {
  return combos.find(c => Object.keys(c.selection).every(k => c.selection[k] === selection[k]) && Object.keys(selection).every(k => selection[k] === c.selection[k]));
}
/** applies a pick, then walks the other groups so the result lands on a valid in-stock combination when one exists */
export function applySelection(groups: VariantGroup[], combos: VariantCombo[], selection: Selection, groupKey: string, optionId: string): Selection {
  const next: Selection = { ...selection, [groupKey]: optionId };
  for (const group of groups) {
    if (group.key === groupKey) continue;
    const current = next[group.key];
    if (current != null && isReachable(combos, next, group.key, current)) continue;
    const fallback = group.options.find(o => isReachable(combos, next, group.key, o.id));
    if (fallback) next[group.key] = fallback.id; else delete next[group.key];
  }
  return next;
}
/** what is picked when the page opens: the variant starred as Default (even if out of stock), else nothing */
export function defaultSelection(combos: VariantCombo[]): Selection {
  const starred = combos.find(c => c.isDefault);
  return starred ? { ...starred.selection } : {};
}
/** the variant a quick "add to cart" (no choice made) takes: the default, else the first one in stock */
export const defaultCombo = (combos: VariantCombo[]) => combos.find(c => c.isDefault) ?? combos.find(c => c.inStock) ?? combos[0];

const unique = (urls: string[]) => [...new Set(urls.filter(Boolean))];
/** The photos and video to show for the current pick: the picked variant's own gallery wins (more than one photo: they replace the product's;
 *  one photo: it goes first, the product's follow); a variant that has a gallery owns the video too. */
export function resolveMedia(groups: VariantGroup[], combos: VariantCombo[], selection: Selection, fallback: VariantMedia): VariantMedia {
  let media = matchCombo(combos, selection)?.media;
  if (!media) {
    for (const group of groups) {
      const picked = group.options.find(o => o.id === selection[group.key]);
      if (picked?.media) { media = picked.media; break; }
    }
  }
  if (!media) return fallback;
  const images = media.images.length > 1 ? unique(media.images) : media.images.length === 1 ? unique([...media.images, ...fallback.images]) : fallback.images;
  return { images: images.length ? images : fallback.images, videoId: media.videoId, videoUrl: media.videoUrl, videoFirst: media.videoFirst };
}
