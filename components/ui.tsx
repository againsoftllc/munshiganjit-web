'use client';
/* Shared UI primitives — ported 1:1 from the HTML prototype (ui/assets/js/app.js). */
import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ICONS, artSvg } from '@/lib/svg';
import { byId, detailsOf, type Product } from '@/lib/data';
import { money, fmtSold, STOCK, productUrl } from '@/lib/format';
import { useStore } from './store';
import { usePartner } from './partner';
import { cardPrice, partnerEntry, TIER_LABEL } from '@/lib/b2b';
import { fixedImg } from '@/lib/img';

/* ---------- Icon (20×20 stroke set) ---------- */
export function Icon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  return (
    <svg className={'ico' + (className ? ' ' + className : '')} width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor"
      strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[name] || ICONS.info }} />
  );
}

/* ---------- Product image. Placeholder art today → swap for next/image when photos exist ---------- */
export function Art({ kind, hue, size = 120 }: { kind: string; hue: string; size?: number }) {
  return <span style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: artSvg(kind, hue, size) }} />;
}
/* Real product photo when available (falls back to placeholder art) */
export function ProductImg({ p, size = 150, eager = false }: { p: Product; size?: number; eager?: boolean }) {
  if (!p.image) return <Art kind={p.art} hue={p.hue} size={size} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="art-svg pimg" {...fixedImg(p.image, size)} alt={p.name} width={size} height={size} loading={eager ? 'eager' : 'lazy'} decoding="async" />;
}
/* Product photo by id — for banners and promos */
export function PImg({ id, size = 150, eager = false }: { id: string; size?: number; eager?: boolean }) {
  const p = byId(id);
  return p ? <ProductImg p={p} size={size} eager={eager} /> : null;
}

export function Stars({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <span className="stars">
      {[1, 2, 3, 4, 5].map(i => <span key={i} className={rating >= i - 0.25 ? 'on' : rating >= i - 0.75 ? 'half' : ''}><Icon name="star" size={size} /></span>)}
    </span>
  );
}

export function StockTag({ p }: { p: Product }) {
  const s = STOCK[p.stock];
  return <span className={'stock ' + s[1]}>{p.stock === 'in' && p.qty <= 6 ? 'Only ' + p.qty + ' left' : s[0]}</span>;
}

/* Buy Now / Add to Cart / Pre Order / Notify Me — depends on inventory state.
   Both Buy Now and Add to Cart open the right-side cart drawer (no page change); Buy Now highlights Checkout. */
export function BuyButton({ p, className = '', qty = 1, color = null, mode = 'buy' }: { p: Product; className?: string; qty?: number; color?: string | null; mode?: 'buy' | 'add' }) {
  const { addAndOpen, toast } = useStore();
  // price 0 = "Call for Price": no cart, a call button instead
  if (!(p.price > 0)) {
    return <a className={'btn-buy call ' + className} href="tel:01979490143"><Icon name="phone" size={16} />Call for Price</a>;
  }
  if (p.stock === 'in') {
    const add = mode === 'add';
    return (
      <button className={'btn-buy ' + (add ? 'add ' : 'solid ') + className} onClick={() => addAndOpen(p.id, mode, qty, color)}>
        <Icon name={add ? 'cart' : 'bolt'} size={16} />{add ? 'Add to Cart' : 'Buy Now'}
      </button>
    );
  }
  if (p.stock === 'preorder') {
    return (
      <button className={'btn-buy pre ' + className} onClick={() => addAndOpen(p.id, mode, qty, color)}>
        <Icon name="calendar" size={16} />Pre Order
      </button>
    );
  }
  if (p.stock === 'upcoming') {
    return (
      <button className={'btn-buy upc ' + className} onClick={() => toast('We will SMS you when it arrives', 'bell')}>
        <Icon name="bell" size={16} />Notify Me
      </button>
    );
  }
  return (
    <button className={'btn-buy notify ' + className} onClick={() => toast('We will SMS you when it is available', 'bell')}>
      <Icon name="bell" size={16} />Out of Stock
    </button>
  );
}

/* card buttons (Q1): home page → Add to Cart only; everywhere else → Buy Now with Add to Cart under it */
export function CartButtons({ p, home = false }: { p: Product; home?: boolean }) {
  if (home || !(p.price > 0) || p.stock !== 'in') return <BuyButton p={p} mode={home ? 'add' : 'buy'} />;
  return <div className="cart-btns"><BuyButton p={p} /><BuyButton p={p} mode="add" /></div>;
}

export function useCompareToggle() {
  const { toggleCompare, toast } = useStore();
  return (id: string) => {
    const r = toggleCompare(id);
    if (r !== null) toast(r ? <>Added to compare. <Link prefetch={false} href="/compare">Compare now</Link></> : 'Removed from compare', 'compare');
  };
}

/* ---------- Product card. detailed → StarTech listing card with spec bullets ---------- */
/** the badge on a product card: the warranty the admin wrote for the product (Website > Products > Warranty) as a short label, e.g. '1 Year Warranty'; no warranty text = no badge */
const warrantyBadge = (id: string): string => {
  const w = (detailsOf(id).warranty || '').trim();
  if (!w) return '';
  const m = w.match(/(\d+(?:\.\d+)?)\s*(year|yr|month|day)s?/i);
  if (!m) return 'Warranty';
  const unit = m[2].toLowerCase().startsWith('y') ? 'Year' : m[2][0].toUpperCase() + m[2].slice(1).toLowerCase();
  return m[1] + ' ' + unit + (Number(m[1]) === 1 ? '' : 's') + ' Warranty';
};

export function ProductCard({ p, detailed = false, qtyNote = false, home = false }: { p: Product; detailed?: boolean; qtyNote?: boolean; home?: boolean }) {
  const { wish, compare, toggleWish, toast } = useStore();
  const cmp = useCompareToggle();
  const url = productUrl(p.id);
  const inCmp = compare.includes(p.id);
  const { tier } = usePartner();
  const tp = partnerEntry(!!tier, p.id);
  const price = <><div className="pc-price">{p.price > 0 ? <b>{money(p.price)}</b> : <b className="pc-call">Call for Price</b>}{p.price > 0 && p.old && <s>{money(p.old)}</s>}</div>{tp && tier && <div className="pc-b2b"><Icon name="briefcase" size={12} />{TIER_LABEL[tier]}: <b>{money(cardPrice(tp))}</b></div>}</>;
  return (
    <article className={'pcard' + (detailed ? ' detailed' : '')}>
      <Link prefetch={false} className="pc-img" href={url}>
        <span className="pc-flags">
          {p.old && <span className="flag save">Save: {money(p.old - p.price)}</span>}
          {p.stock === 'preorder' && <span className="flag pre">Pre Order</span>}
          {p.stock === 'upcoming' && <span className="flag up">Up Coming</span>}
          {p.stock === 'out' && <span className="flag out">Out of Stock</span>}
        </span>
        {detailed && p.old && p.old > p.price && <span className="pc-pct">-{Math.round((1 - p.price / p.old) * 100)}%</span>}
        <ProductImg p={p} size={150} />
        {warrantyBadge(p.id) && <span className="pc-warranty"><Icon name="shield" size={11} />{warrantyBadge(p.id)}</span>}
      </Link>
      <div className="pc-quick">
        <button className={'qbtn' + (wish.includes(p.id) ? ' on' : '')} aria-label="Wishlist"
          onClick={() => toast(toggleWish(p.id) ? 'Saved to wishlist' : 'Removed from wishlist', 'heart')}><Icon name="heart" size={15} /></button>
      </div>
      <div className="pc-body">
        {detailed && <span className={'pc-ribbon' + (p.old && p.old > p.price ? '' : ' none')} aria-hidden={!(p.old && p.old > p.price)}><Icon name="bolt" size={14} />Special Offer Price</span>}
        <span className="pc-brand">{p.brand}</span>
        <Link prefetch={false} className="pc-name notranslate" translate="no" href={url}>{p.name}</Link>
        <ul className="pc-specs">{p.specs.slice(0, 4).map(s => <li key={s}>{s}</li>)}</ul>
        <div className="pc-rate"><Stars rating={p.reviews ? p.rating : 0} />({p.reviews}){p.sold > 0 && <span className="sold">{fmtSold(p.sold)} sold</span>}</div>
        {!detailed && price}
      </div>
      <div className="pc-foot">
        {detailed && price}
        <StockTag p={p} />
        {qtyNote && p.stock === 'in' && <span className="qty-note">{p.qty} units available</span>}
        <CartButtons p={p} home={home} />
        <button className={'pc-cmp' + (inCmp ? ' on' : '')} onClick={() => cmp(p.id)}><Icon name="compare" size={14} />{inCmp ? 'Added' : 'Compare'}</button>
      </div>
    </article>
  );
}

/* ---------- Breadcrumb (StarTech) ---------- */
export function Crumb({ items }: { items: [string, string?][] }) {
  return (
    <div className="crumb-bar">
      <nav className="wrap crumb" aria-label="Breadcrumb">
        <Link prefetch={false} href="/" aria-label="Home" className="crumb-home"><svg width={17} height={17} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" /></svg></Link>
        {items.map((it, i) => (
          <span key={i} style={{ display: 'contents' }}>
            <span className="sep">/</span>
            {it[1] && i < items.length - 1 ? <Link prefetch={false} href={it[1]}>{it[0]}</Link> : <span>{it[0]}</span>}
          </span>
        ))}
      </nav>
    </div>
  );
}

/* ---------- TV Hut section head (accent bar, two-tone title, view all, rail arrows) ---------- */
export function SecHead({ a, b, link, railId }: { a: ReactNode; b?: ReactNode; link?: string; railId?: string }) {
  const scroll = (dir: number) => { const r = railId && document.getElementById(railId); if (r) r.scrollBy({ left: dir * r.clientWidth * 0.8, behavior: 'smooth' }); };
  return (
    <div className="sec-head">
      <h2 className="sec-title">{a} {b && <b>{b}</b>}</h2>
      <div className="sec-tools">
        {link && <Link prefetch={false} className="view-all" href={link}>View All <Icon name="arrow" size={14} /></Link>}
        {railId && <>
          <button className="arrow-btn" aria-label="Previous" onClick={() => scroll(-1)}><Icon name="left" size={15} /></button>
          <button className="arrow-btn" aria-label="Next" onClick={() => scroll(1)}><Icon name="right" size={15} /></button>
        </>}
      </div>
    </div>
  );
}

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    document.body.classList.add('lock');
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    addEventListener('keydown', k);
    return () => { document.body.classList.remove('lock'); removeEventListener('keydown', k); };
  }, [open, onClose]);
  return (
    <div className={'modal' + (open ? ' open' : '')} role="dialog" aria-modal="true" aria-label={title} onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box">
        <div className="modal-head"><h3>{title}</h3><button onClick={onClose} aria-label="Close"><Icon name="close" size={20} /></button></div>
        {children}
      </div>
    </div>
  );
}

export function StarInput({ name, size = 28, defaultValue = 5 }: { name: string; size?: number; defaultValue?: number }) {
  return (
    <div className="star-in">
      {[5, 4, 3, 2, 1].map(v => (
        <span key={v} style={{ display: 'contents' }}>
          <input type="radio" name={name} id={name + v} value={v} defaultChecked={v === defaultValue} />
          <label htmlFor={name + v}><Icon name="star" size={size} /></label>
        </span>
      ))}
    </div>
  );
}

/* ---------- Countdown (days/hours/mins/secs) ---------- */
export function Countdown({ seconds = 0, to, onEnd, labels = ['Days', 'Hours', 'Mins', 'Secs'] }: { seconds?: number; to?: number; onEnd?: () => void; labels?: string[] }) {
  const calc = (end: number) => Math.max(0, Math.round((end - Date.now()) / 1000));
  const [left, setLeft] = useState(to ? calc(to) : seconds);
  const endRef = useRef(onEnd); endRef.current = onEnd;
  useEffect(() => {
    const end = to ?? Date.now() + seconds * 1000;
    const tick = () => { const l = calc(end); setLeft(l); if (l === 0) { clearInterval(t); endRef.current?.(); } };
    const t = setInterval(tick, 1000); tick();
    return () => clearInterval(t);
  }, [seconds, to]);
  const v = [Math.floor(left / 86400), Math.floor((left % 86400) / 3600), Math.floor((left % 3600) / 60), left % 60];
  const L = labels;
  return (
    <div className="cd">
      {v.map((n, i) => <span key={i} style={{ display: 'contents' }}>{i > 0 && <span className="sep">:</span>}<span className="box"><span>{String(n).padStart(2, '0')}</span><small>{L[i]}</small></span></span>)}
    </div>
  );
}

/* ---------- animated counter (starts when visible) ---------- */
export function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [v, setV] = useState(to);
  useEffect(() => {
    const el = ref.current; if (!el || !('IntersectionObserver' in window)) return;
    setV(0);
    const io = new IntersectionObserver(es => {
      if (!es[0].isIntersecting) return; io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => { const k = Math.min(1, (t - t0) / 1500); setV(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
    io.observe(el); return () => io.disconnect();
  }, [to]);
  return <span ref={ref}>{v.toLocaleString('en-US')}{suffix}</span>;
}

/* simple segmented buttons (seg) */
export function Seg({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return <div className="seg">{options.map(o => <button type="button" key={o} className={o === value ? 'on' : ''} onClick={() => onChange(o)}>{o}</button>)}</div>;
}
