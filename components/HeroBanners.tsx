'use client';
/* =====================================================================
   Home hero — client-supplied banner artwork (public/img/banners).
   Slider: 976×380 creatives, first one is "My Gadget Setup".
   Side column: two 580×354 creatives stacked (Reseller, 100% Genuine) —
   together they are exactly as tall as one slide.
   Later the admin panel supplies these lists (image + link).
   ===================================================================== */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { Banner, SideCard } from '@/lib/home';
import { Icon } from './ui';
import { fluidImg } from '@/lib/img';


export default function HeroBanners({ slides: SLIDES, autoplayMs = 5500 }: { slides: Banner[]; autoplayMs?: number }) {
  const [cur, setCur] = useState(0);
  const sx = useRef(0);
  const n = Math.max(SLIDES.length, 1);
  const at = cur % n;
  const go = (i: number) => setCur((i + n) % n);
  useEffect(() => { if (!autoplayMs) return; const t = setTimeout(() => setCur(c => (c + 1) % n), autoplayMs); return () => clearTimeout(t); }, [cur, n, autoplayMs]);
  return (
    <div className="slider bn-slider bn-img-slider" aria-roledescription="carousel"
      onTouchStart={e => { sx.current = e.touches[0].clientX; }}
      onTouchEnd={e => { const dx = e.changedTouches[0].clientX - sx.current; if (Math.abs(dx) > 40) go(at + (dx < 0 ? 1 : -1)); }}>
      {SLIDES.map((s, i) => (
        <div key={s.src} className={'bn-slide' + (i === at ? ' on' : '')} aria-hidden={i !== cur}>
          <Link prefetch={false} className="bn-img" href={s.href} tabIndex={i === at ? 0 : -1}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img {...fluidImg(s.src, '(max-width: 1200px) 100vw, 976px')} alt={s.alt} width={976} height={380} style={s.fit === 'fit' ? { objectFit: 'contain' } : undefined} loading={i === 0 ? 'eager' : 'lazy'} fetchPriority={i === 0 ? 'high' : 'auto'} />
          </Link>
        </div>
      ))}
      <button className="sl-arrow prev" aria-label="Previous slide" onClick={() => go(at - 1)}><Icon name="left" size={18} /></button>
      <button className="sl-arrow next" aria-label="Next slide" onClick={() => go(at + 1)}><Icon name="right" size={18} /></button>
      <div className="sl-dots bn-dots">{SLIDES.map((_, i) => <button key={i} className={i === at ? 'on' : ''} aria-label={'Slide ' + (i + 1)} onClick={() => go(i)} />)}</div>
    </div>
  );
}

/* Side column (StarTech right column style): Reseller on top, 100% Genuine Products below */

export function SideBanners({ banners: SIDE }: { banners: SideCard[] }) {
  return (
    <aside className="side-box bn-side bn-img-side">
      {SIDE.map((s, i) => s.kind === 'card' ? (
        <Link prefetch={false} key={i + s.title} className="sb-img sb-card" href={s.href}>
          <span className="sb-card-ic"><Icon name={s.icon || 'bolt'} size={26} /></span>
          <b>{s.title}</b>
          {s.text && <span>{s.text}</span>}
          {s.button && <em>{s.button}</em>}
        </Link>
      ) : (
        <Link prefetch={false} key={i + s.src} className="sb-img" href={s.href}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img {...fluidImg(s.src, '(max-width: 760px) 50vw, 330px', [384, 640, 750])} alt={s.alt} width={580} height={354} loading="lazy" decoding="async" />
        </Link>
      ))}
    </aside>
  );
}
