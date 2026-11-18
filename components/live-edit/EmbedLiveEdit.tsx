'use client';
/* Live Edit on the storefront. Normally this renders `children` untouched (no context = the public site).
   Opened inside the admin's full-screen Live Edit (this site is its iframe, URL has ?liveEdit=1) it asks the
   admin for the unsaved draft, feeds it to the home page, shows each section's hover toolbar and reports
   clicks back. Opened on its own (not framed) `?liveEdit=1` sends the visitor to the admin's Live Edit. */
import { useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { adminOrigins, LIVE_EDIT_MSG, type LayoutActionName } from '@/lib/live-edit/embed';
import { toHome, type HomeCfg } from '@/lib/home';
import { homeRaw } from '@/lib/data';
import { liveEditHref } from './EditPageButton';

export interface LiveEditValue {
  /** the admin's unsaved draft, resolved */
  cfg: HomeCfg;
  locked: boolean;
  /** id of the section the admin has open */
  editing: string | null;
  select: (id: string) => void;
  action: (name: LayoutActionName, id: string) => void;
}

const Ctx = createContext<LiveEditValue | null>(null);
/** the editor state while the page is framed by the admin's Live Edit and the draft has arrived, else null (public site) */
export const useLiveEdit = () => useContext(Ctx);

const isTopLevel = () => { try { return window.self === window.top; } catch { return false; } };

export default function EmbedLiveEdit({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);
  const [locked, setLocked] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const parent = useRef<Window | null>(null);

  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get('liveEdit') === '1';
    if (!asked) return;
    if (isTopLevel()) {
      // no editor on the page itself: go to the admin's Live Edit for the home page
      const to = liveEditHref(window.location.pathname.replace(/\/+$/, '') || '/');
      if (to) window.location.replace(to);
      return;
    }
    parent.current = window.parent;
    setActive(true);
  }, []);

  const toAdmin = useCallback((msg: Record<string, unknown>) => {
    const win = parent.current;
    if (!win) return;
    for (const origin of adminOrigins()) { try { win.postMessage(msg, origin); } catch { /* ignore */ } }
  }, []);

  // ask the admin for the draft until it answers
  useEffect(() => {
    if (!active || draft) return;
    const ping = () => toAdmin({ type: LIVE_EDIT_MSG.ready });
    ping();
    const t = window.setInterval(ping, 400);
    return () => window.clearInterval(t);
  }, [active, draft, toAdmin]);

  useEffect(() => {
    if (!active) return;
    const origins = adminOrigins();
    const onMessage = (e: MessageEvent) => {
      if (!origins.includes(e.origin)) return;
      const d = e.data as { type?: string; [k: string]: unknown } | null;
      if (!d || typeof d !== 'object') return;
      switch (d.type) {
        case LIVE_EDIT_MSG.preview:
          if (d.content && typeof d.content === 'object') setDraft(d.content as Record<string, unknown>);
          break;
        case LIVE_EDIT_MSG.highlight:
          setEditing(typeof d.sectionId === 'string' ? d.sectionId : null);
          break;
        case LIVE_EDIT_MSG.lock:
          setLocked(!!d.locked);
          break;
        case LIVE_EDIT_MSG.reload:
          // saved: fetch the data again now, then re-render
          void fetch('/api/live-edit/revalidate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-live-edit': '1' }, body: '{}' })
            .catch(() => undefined).then(() => router.refresh());
          break;
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [active, router]);

  useEffect(() => {
    document.body.classList.toggle('le-embed-on', active && !locked);
    return () => document.body.classList.remove('le-embed-on');
  }, [active, locked]);

  const value = useMemo<LiveEditValue | null>(() => {
    if (!active || !draft) return null;
    const blocks = (draft.blocks && typeof draft.blocks === 'object' ? draft.blocks : {}) as Record<string, unknown>;
    return {
      cfg: toHome(blocks.munshiganjit),
      locked, editing,
      select: id => toAdmin({ type: LIVE_EDIT_MSG.select, sectionId: id }),
      action: (name, id) => toAdmin({ type: LIVE_EDIT_MSG.layoutAction, action: name, instanceId: id }),
    };
  }, [active, draft, locked, editing, toAdmin]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** the home / chrome content to render: the admin's unsaved draft inside Live Edit, else what the site saved */
export function useHomeCfg(): HomeCfg {
  const le = useLiveEdit();
  return le ? le.cfg : toHome(homeRaw);
}
