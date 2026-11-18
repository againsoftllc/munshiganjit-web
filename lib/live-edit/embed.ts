/* Storefront <-> admin protocol for Live Edit. The admin's full-screen Live Edit (Website > Live Edit)
   opens this site in an iframe with ?liveEdit=1; both windows talk through these postMessage types.
   The admin holds the draft, this page only renders it and reports clicks / toolbar actions. */
export const LIVE_EDIT_MSG = {
  /** page -> admin: loaded, send me the draft */
  ready: 'live-edit:ready',
  /** page -> admin: a section was clicked / its pencil used */
  select: 'live-edit:select',
  /** page -> admin: hover toolbar (moveUp, moveDown, toggleHidden, delete, add, edit) */
  layoutAction: 'layout:action',
  /** admin -> page: highlight this section (or none) */
  highlight: 'live-edit:highlight',
  /** admin -> page: the unsaved homepage content, shown as a live preview */
  preview: 'homepage:preview',
  /** admin -> page: saved, re-render the server parts */
  reload: 'homepage:reload',
  /** admin -> page: browse like the live site (no outlines / toolbars) */
  lock: 'live-edit:lock',
  /** admin -> page: editor closed */
  close: 'live-edit:close',
} as const;

export type LayoutActionName = 'moveUp' | 'moveDown' | 'toggleHidden' | 'delete' | 'add' | 'edit';

/** Origins of the admin: NEXT_PUBLIC_ADMIN_ORIGIN first, plus the local admin ports (localhost / 127.0.0.1). */
export function adminOrigins(): string[] {
  const out = new Set<string>();
  const add = (url: string) => {
    try {
      const u = new URL(url);
      out.add(u.origin);
      const alt = u.hostname === 'localhost' ? '127.0.0.1' : u.hostname === '127.0.0.1' ? 'localhost' : '';
      if (alt) out.add(`${u.protocol}//${alt}${u.port ? ':' + u.port : ''}`);
    } catch { /* ignore */ }
  };
  const env = process.env.NEXT_PUBLIC_ADMIN_ORIGIN?.trim().replace(/\/$/, '');
  if (env) add(env);
  for (const p of ['3228', '3210', '3200']) add(`http://localhost:${p}`);
  return [...out];
}
