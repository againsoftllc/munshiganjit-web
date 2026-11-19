'use client';
/* Swipe progress for a horizontally scrolling rail: a thin track whose thumb shows how much of the rail is visible and where you are.
   Returns a ref for the thumb element and an onScroll handler for the rail. Touches the DOM directly, so scrolling never re-renders React. */
import { useCallback, useEffect, useRef, type RefObject } from 'react';

export function useRailBar(rail: RefObject<HTMLDivElement | null>, dep: unknown = null) {
  const thumb = useRef<HTMLSpanElement>(null);
  const update = useCallback(() => {
    const r = rail.current, t = thumb.current;
    if (!r || !t) return;
    const max = r.scrollWidth - r.clientWidth;
    const w = r.scrollWidth ? Math.min(100, (r.clientWidth / r.scrollWidth) * 100) : 100;
    const p = max > 0 ? r.scrollLeft / max : 0;
    t.style.width = w + '%';
    t.style.left = (100 - w) * p + '%';
    (t.parentElement as HTMLElement).style.visibility = max > 4 ? 'visible' : 'hidden';
  }, [rail]);
  useEffect(() => {
    update();
    window.addEventListener('resize', update);
    const id = setTimeout(update, 300); // images / fonts may change the rail's width after mount
    return () => { window.removeEventListener('resize', update); clearTimeout(id); };
  }, [update, dep]);
  return { thumb, onScroll: update };
}
