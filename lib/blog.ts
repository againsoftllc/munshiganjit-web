/* An article of the blog as the admin's Blog module stores it (Website > Blog): its body (HTML), the products picked for it and its
   SEO words. Server side only. The body may carry a line `[product:the-product-slug]` anywhere: it is shown as the product box
   (picture, price, Buy button) at that place, like the ones the first article always had. */
import { cleanHtml } from './pages';

const API = (process.env.NEXT_PUBLIC_AGAINERP_API || '').replace(/\/$/, '');

export interface Share { facebook: boolean; whatsapp: boolean; copy: boolean }
export interface Post {
  content: string; products: string[]; seoTitle: string; seoDescription: string;
  /** Blog > Settings: the share buttons, the products list, the author of an article that has none */
  share: Share; showProducts: boolean; defaultAuthor: string;
}
export type ArticlePart = { html: string } | { product: string };
export interface Article { parts: ArticlePart[]; toc: [id: string, text: string][] }

export async function getPost(slug: string): Promise<Post | null> {
  if (!API) return null;
  try {
    const r = await fetch(`${API}/api/v1/storefront/blog/posts/${encodeURIComponent(slug)}`, { next: { tags: ['storefront-data'], revalidate: 10 }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const d = (await r.json())?.data;
    if (!d) return null;
    return {
      content: typeof d.content === 'string' ? d.content : '',
      products: Array.isArray(d.products) ? d.products.filter((x: unknown): x is string => typeof x === 'string') : [],
      seoTitle: typeof d.seo_title === 'string' ? d.seo_title : '',
      seoDescription: typeof d.seo_description === 'string' ? d.seo_description : '',
      share: { facebook: d.share_facebook !== false, whatsapp: d.share_whatsapp !== false, copy: d.share_copy !== false },
      showProducts: d.show_related_products !== false,
      defaultAuthor: typeof d.default_author === 'string' ? d.default_author.trim() : '',
    };
  } catch {
    return null;
  }
}

const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** the body -> the pieces to draw (html, product boxes) and the table of contents (every <h2>, given an id when it has none) */
export function prepareArticle(raw: string): Article {
  let n = 0;
  const toc: [string, string][] = [];
  const html = cleanHtml(raw).replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (_m, attrs: string, inner: string) => {
    n++;
    const have = /\sid\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const id = have ? have[1] : 'h' + n;
    toc.push([id, strip(inner)]);
    return have ? `<h2${attrs}>${inner}</h2>` : `<h2${attrs} id="${id}">${inner}</h2>`;
  });
  const parts: ArticlePart[] = [];
  const re = /(?:<p[^>]*>\s*)?\[product:([a-z0-9][a-z0-9-]*)\](?:\s*<\/p>)?/gi;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (m.index > last) parts.push({ html: html.slice(last, m.index) });
    parts.push({ product: m[1].toLowerCase() });
    last = m.index + m[0].length;
  }
  if (last < html.length) parts.push({ html: html.slice(last) });
  return { parts, toc };
}
