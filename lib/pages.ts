/* Text pages (About, the seven policies) written in the admin's Website > Pages. Server side only: asks the API for each page's
   body (served from Next's data cache for up to 10 s, like the rest of the live data). A page that has no body (or the API is down)
   returns null and the caller shows the text built into the storefront, so nothing ever goes blank. */
const API = (process.env.NEXT_PUBLIC_AGAINERP_API || '').replace(/\/$/, '');

export interface CmsPage { html: string; updated: string }

/** an admin can paste anything into a page body: drop scripts, frames, inline handlers and javascript: links */
export function cleanHtml(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form)\b[\s\S]*?(<\s*\/\s*\1\s*>|$)/gi, '')
    .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form)\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1=$2#$2');
}

export async function getPage(slug: string): Promise<CmsPage | null> {
  if (!API) return null;
  try {
    const r = await fetch(`${API}/api/v1/storefront/pages/${slug}`, { next: { tags: ['storefront-data'], revalidate: 10 }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const d = (await r.json())?.data;
    const html = cleanHtml(typeof d?.body_html === 'string' ? d.body_html : '').trim();
    return html ? { html, updated: typeof d?.updated_at === 'string' ? d.updated_at : '' } : null;
  } catch {
    return null;
  }
}

/** "2026-10-01T…" -> "Oct 01, 2026" */
export function pageDate(iso: string): string {
  const t = Date.parse(iso);
  if (!t) return '';
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'Asia/Dhaka' });
}
