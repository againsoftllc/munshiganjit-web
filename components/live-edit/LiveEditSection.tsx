'use client';
/* A home section with the Live Edit hover outline + toolbar (move, hide, edit, add below, remove).
   On the public site there is no Live Edit context, so this renders its children with no extra markup. */
import type { MouseEvent, ReactNode } from 'react';
import { Icon } from '@/components/ui';
import { useLiveEdit } from './EmbedLiveEdit';

/* inside the admin's editor a click anywhere on a section selects it instead of following links */
function selectOnClick(select: () => void) {
  return (e: MouseEvent) => {
    const t = e.target as HTMLElement | null;
    if (t?.closest('.le-bar')) return;
    // a block nested inside this one (the hero side banners) handles its own clicks
    const owner = t?.closest('[data-live-section]');
    if (owner && owner !== e.currentTarget) return;
    e.preventDefault();
    e.stopPropagation();
    select();
  };
}

export default function LiveEditSection({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const le = useLiveEdit();
  if (!le || le.locked) return <>{children}</>;
  const i = le.cfg.layout.findIndex(b => b.id === id);
  const hidden = le.cfg.layout[i]?.hidden ?? false;
  return (
    <div className={'le-section' + (le.editing === id ? ' selected' : '') + (hidden ? ' is-hidden' : '')} data-live-section={id} onClickCapture={selectOnClick(() => le.select(id))}>
      {children}
      <div className="le-bar" title={label}>
        {i > 0 && <button type="button" title="Move up" onClick={() => le.action('moveUp', id)}><Icon name="up" size={16} /></button>}
        {i >= 0 && i < le.cfg.layout.length - 1 && <button type="button" title="Move down" onClick={() => le.action('moveDown', id)}><Icon name="down" size={16} /></button>}
        <button type="button" title={hidden ? 'Show section' : 'Hide section'} onClick={() => le.action('toggleHidden', id)}><Icon name="eye" size={16} /></button>
        <button type="button" title={'Edit ' + label} onClick={() => le.select(id)}><Icon name="edit" size={16} /></button>
        <button type="button" title="Add section below" onClick={() => le.action('add', id)}><Icon name="plus" size={16} /></button>
        <button type="button" title="Remove section" onClick={() => le.action('delete', id)}><Icon name="trash" size={16} /></button>
      </div>
    </div>
  );
}

/** Site chrome (header parts, menu, footer): hover outline + a single edit button; plain children on the public site. */
export function LiveEditChrome({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  const le = useLiveEdit();
  if (!le || le.locked) return <>{children}</>;
  return (
    <div className={'le-section le-chrome' + (le.editing === id ? ' selected' : '')} data-live-section={id} onClickCapture={selectOnClick(() => le.select(id))}>
      {children}
      <div className="le-bar" title={label}>
        <button type="button" title={'Edit ' + label} onClick={() => le.select(id)}><Icon name="edit" size={16} /></button>
      </div>
    </div>
  );
}
