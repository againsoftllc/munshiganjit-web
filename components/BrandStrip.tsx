'use client';
/* Shop by Brand — Motion View style 3D brand cards with original logos + product counts.
   <BrandStrip/>      auto-scrolling loop for the home page (pauses on hover, arrows to step)
   <BrandGrid/>       all brands as 3D cards for the /brands page (selected brand highlighted) */
import Link from 'next/link';
import { useRef } from 'react';
import { brands, brandLogos } from '@/lib/data';
import { Icon } from './ui';
import { brandUrl } from '@/lib/format';

export { brandUrl };

function BrandCard({ name, count, active = false }: { name: string; count: number; active?: boolean }) {
  const logo = brandLogos[name];
  return (
    <Link prefetch={false} className={'b3d' + (active ? ' on' : '')} href={brandUrl(name)} aria-label={name + ' — ' + count + ' products'} aria-current={active ? 'page' : undefined}>
      <span className="b3d-face">
        {logo
          // eslint-disable-next-line @next/next/no-img-element
          ? <img className="b3d-logo" src={logo} alt={name + ' logo'} width={130} height={44} loading="lazy" />
          : <b className="b3d-name">{name}</b>}
        <small>{count} products</small>
      </span>
    </Link>
  );
}

export function BrandStrip({ only }: { /** the brands to show, in this order (Live Edit's list); omitted = every brand */ only?: [string, number][] }) {
  const vp = useRef<HTMLDivElement>(null);
  const step = (dir: number) => {
    const el = vp.current; if (!el) return;
    // nudge the CSS marquee by shifting its current offset (pauses briefly, then resumes)
    const track = el.querySelector<HTMLElement>('.b3d-track'); if (!track) return;
    const anims = track.getAnimations();
    anims.forEach(a => { if (a.currentTime != null && a.effect) { const d = Number(a.effect.getComputedTiming().duration) || 40000; a.currentTime = (Number(a.currentTime) + dir * d / brands.length * 2 + d) % d; } });
  };
  const list = only ?? brands;
  return (
    <div className="b3d-strip">
      <button className="arrow-btn b3d-prev" aria-label="Previous brands" onClick={() => step(-1)}><Icon name="left" size={16} /></button>
      <div className="b3d-vp" ref={vp}>
        <div className="b3d-track" style={{ animationDuration: list.length * 3.2 + 's' }}>
          {list.map(b => <BrandCard key={'a' + b[0]} name={b[0]} count={b[1]} />)}
          {list.map(b => <BrandCard key={'b' + b[0]} name={b[0]} count={b[1]} />)}
        </div>
      </div>
      <button className="arrow-btn b3d-next" aria-label="Next brands" onClick={() => step(1)}><Icon name="right" size={16} /></button>
    </div>
  );
}

export function BrandGrid({ active }: { active?: string }) {
  return (
    <div className="b3d-grid">
      {brands.map(b => <BrandCard key={b[0]} name={b[0]} count={b[1]} active={b[0] === active} />)}
    </div>
  );
}
