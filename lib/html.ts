/* Rich text written in Live Edit's editor (the same editor as the product description) is HTML. It comes from the
   signed-in admin, but is still cleaned: no scripts, styles, frames, inline handlers or javascript: links. */
export function safeHtml(html: string | null | undefined): string {
  return (html ?? '')
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1>/gi, '')
    .replace(/<(script|style|iframe|object|embed)[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi, '$1="#"')
    .trim();
}

/** one line of rich text (inside a link or a line of the header): bold / italic / underline / line breaks only */
export function inlineHtml(html: string): string {
  return safeHtml(html)
    .replace(/<\/p>\s*<p[^>]*>/gi, ' ')
    .replace(/<\/?p[^>]*>/gi, '')
    .replace(/<(?!\/?(strong|b|em|i|u|br)\b)[^>]*>/gi, '');
}

export const isHtml = (s: string) => s.includes('<');
