'use client';
/* The small "Live Edit" button, home page and product pages, for a signed-in editor only. A visitor never sees it:
   it exists only while the browser holds the harmless marker cookie set at /live-edit sign-in. It opens the admin's
   full-screen Live Edit for this page (the home page, or this product with its editor already open). */
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { byId } from '@/lib/data';
import { LIVE_EDIT_MARKER_COOKIE } from '@/lib/live-edit/cookie';
import { adminOrigins } from '@/lib/live-edit/embed';
import { useLiveEdit } from './EmbedLiveEdit';

export const liveEditHref = (path: string): string | null => {
  const admin = adminOrigins()[0];
  if (path === '/') return `${admin}/website/live-edit/home`;
  if (path === '/about-us') return `${admin}/website/live-edit/about`;
  if (path === '/contact') return `${admin}/website/live-edit/contact`;
  if (path === '/help-support') return `${admin}/website/live-edit/help`;
  if (path === '/reseller') return `${admin}/website/live-edit/reseller`;
  if (path === '/corporate') return `${admin}/website/live-edit/corporate`;
  if (path === '/service-center') return `${admin}/website/live-edit/service`;
  const m = /^\/(?:product\/)?([^/]+)\/?$/.exec(path);
  const p = m ? byId(decodeURIComponent(m[1])) : null;
  return p?.uid ? `${admin}/website/live-edit/product?slug=${encodeURIComponent(p.id)}&id=${encodeURIComponent(p.uid)}` : null;
};

export default function EditPageButton() {
  const le = useLiveEdit();
  const path = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => { setSignedIn(document.cookie.split(';').some(c => c.trim() === `${LIVE_EDIT_MARKER_COOKIE}=1`)); }, []);
  const href = liveEditHref(path);
  if (!signedIn || le || !href) return null;
  return (
    <a className="le-edit-fab" href={href} title={path === '/' ? 'Edit the home page in Live Edit' : path === '/about-us' ? 'Edit the About page in Live Edit' : path === '/contact' ? 'Edit the Contact page in Live Edit' : path === '/help-support' ? 'Edit the Help & Support page in Live Edit' : path === '/service-center' ? 'Edit the Service Center page in Live Edit' : path === '/reseller' || path === '/corporate' ? 'Edit this page in Live Edit' : 'Edit this product in Live Edit'}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 4.1 12 6" /><path d="m5.1 8-2.9-.8" /><path d="m6 12-1.9 2" /><path d="M7.2 2.2 8 5.1" />
        <path d="M9.037 9.69a.498.498 0 0 1 .653-.653l11 4.5a.5.5 0 0 1-.074.949l-4.349 1.041a1 1 0 0 0-.74.739l-1.04 4.35a.5.5 0 0 1-.95.074z" />
      </svg>
      Live Edit
    </a>
  );
}
