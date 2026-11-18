'use client';
/* Home product rows sized like Flash Sale (client doc):
   <ProductRow/>     New Arrival / Top Sales / any admin-added row — 6 cards, View All, auto-scroll
   <ShopByCategory/> Category Spotlight list + products of the picked category in the same row
   (no page change); only "View All" opens the category page. */
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { visibleProducts, catBySlug, offers, offerLive, activeFlashSale, type Product } from '@/lib/data';
import { money, productUrl, catUrl, brandUrl } from '@/lib/format';
import { Icon, ProductImg, Stars } from './ui';
import { useStore } from './store';
import { usePartner } from './partner';
import type { SpotlightTab } from '@/lib/home';
import { cardPrice, partnerEntry, TIER_LABEL } from '@/lib/b2b';

/* products in a live offer or flash sale get the animated OFFER badge */
function useOfferIds() {
  const [ids, setIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    const s = new Set<string>();
    offers.filter(o => offerLive(o)).forEach(o => o.banner.products.forEach(id => s.add(id)));
    activeFlashSale()?.items.forEach(i => s.add(i.id));
    setIds(s);
  }, []);
  return ids;
}

function RailCard({ p, offer }: { p: Product; offer: boolean }) {
  const { addAndOpen } = useStore();
  const { tier } = usePartner();
  const tp = partnerEntry(!!tier, p.id);
  const save = p.old ? p.old - p.price : 0;
  const off = p.old ? Math.round((save / p.old) * 100) : 0;
  return (
    <article className="hr-card">
      <Link prefetch={false} href={productUrl(p.id)} className="hr-img">
        {off > 0 && <span className="hr-off">-{off}%</span>}
        {offer && <span className="hr-offer">OFFER</span>}
        <ProductImg p={p} size={110} />
      </Link>
      <span className="hr-brand">{p.brand}</span>
      <Link prefetch={false} href={productUrl(p.id)} className="hr-name notranslate" translate="no">{p.name}</Link>
      <span className="hr-rate"><Stars rating={p.rating} size={11} /><em>({p.reviews})</em></span>
      <div className="hr-price"><b>{money(p.price)}</b>{p.old && <s>{money(p.old)}</s>}</div>
      {tp && tier && <span className="pc-b2b"><Icon name="briefcase" size={12} />{TIER_LABEL[tier]}: <b>{money(cardPrice(tp))}</b></span>}
      {save > 0 ? <span className="hr-save">Save {money(save)}</span> : <span className="hr-save none">Best Price</span>}
      <button className="hr-add" onClick={() => addAndOpen(p.id, 'add')} disabled={p.stock === 'out'}>
        <Icon name="cart" size={14} />{p.stock === 'out' ? 'Out of Stock' : p.stock === 'preorder' ? 'Pre Order' : 'Add to Cart'}
      </button>
    </article>
  );
}

/* auto-scroll right→left one card at a time, looping; pauses on hover */
function useAutoScroll(ref: React.RefObject<HTMLDivElement | null>, key: string) {
  const paused = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.scrollLeft = 0;
    const t = setInterval(() => {
      if (paused.current || !el.firstElementChild) return;
      const step = (el.firstElementChild as HTMLElement).offsetWidth + 10;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: step, behavior: 'smooth' });
    }, 3200);
    return () => clearInterval(t);
  }, [ref, key]);
  return { onMouseEnter: () => { paused.current = true; }, onMouseLeave: () => { paused.current = false; } };
}

export function ProductRow({ title, icon, tone, source, link, category = '', brand = '', products: picked = [], limit = 0 }: { title: string; icon: string; tone: string; source: string; link: string; category?: string; brand?: string; products?: string[]; limit?: number }) {
  const rail = useRef<HTMLDivElement>(null);
  const offerIds = useOfferIds();
  const items = useMemo(() => {
    const live = visibleProducts.filter(p => p.stock !== 'out');
    const pct = (p: Product) => (p.old ? (p.old - p.price) / p.old : 0);
    let list: Product[];
    if (source === 'new') list = live.slice().reverse();                      // latest uploads first
    else if (source === 'top') list = live.slice().sort((a, b) => b.sold - a.sold);
    else if (source === 'discount') list = live.filter(p => pct(p) > 0).sort((a, b) => pct(b) - pct(a));
    else if (source === 'rated') list = live.filter(p => p.reviews > 0).sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    else if (source === 'emi') list = live.filter(p => p.emi);
    else if (source === 'offer') list = live.filter(p => offerIds.has(p.id));
    else if (source === 'brand') list = live.filter(p => p.brand === brand);
    else if (source === 'picked') list = picked.map(id => live.find(p => p.id === id)).filter((p): p is Product => !!p);
    else list = live.filter(p => p.cat === (source === 'category' ? category : source));   // a category (a bare address is the older way to say it)
    return list.slice(0, limit || (source === 'picked' ? list.length : 12));
  }, [source, category, brand, picked, limit, offerIds]);
  const to = link || (source === 'top' ? '/products?sort=sold' : source === 'discount' || source === 'offer' ? '/offers' : source === 'brand' ? brandUrl(brand) : source === 'category' ? catUrl(category) : source !== 'new' && !['rated', 'emi', 'picked'].includes(source) ? catUrl(source) : '/products');
  const hover = useAutoScroll(rail, source);
  const scroll = (dir: number) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8 });
  if (!items.length) return null;
  return (
    <section className="band hr-band">
      <div className="wrap">
        <div className={'hr-box hr-' + tone}>
          <div className="hr-bar">
            <span className="hr-title"><Icon name={icon} size={19} />{title}</span>
            <Link prefetch={false} className="hr-all" href={to}>View All <Icon name="arrow" size={14} /></Link>
            <span className="fs-nav">
              <button aria-label="Previous" onClick={() => scroll(-1)}><Icon name="left" size={15} /></button>
              <button aria-label="Next" onClick={() => scroll(1)}><Icon name="right" size={15} /></button>
            </span>
          </div>
          <div className="hr-rail" ref={rail} {...hover}>
            {items.map(p => <RailCard key={p.id} p={p} offer={offerIds.has(p.id)} />)}
          </div>
        </div>
      </div>
    </section>
  );
}

type SpotTab = { key: string; label: string; icon: string; link: string; items: Product[] };

export function ShopByCategory({ slugs, tabs: made, title = 'Shop by Category' }: { slugs: string[]; tabs?: SpotlightTab[] | null; title?: string }) {
  // tabs made in Live Edit (a category's products, or products picked one by one), else one tab per Category Spotlight category
  const tabs: SpotTab[] = made
    ? made.filter(t => !t.hidden && t.name.trim()).map((t, i) => {
      const cat = catBySlug(t.category);
      let list: Product[];
      if (t.mode === 'products') list = t.products.map(id => visibleProducts.find(p => p.id === id)).filter((p): p is Product => !!p);
      else list = visibleProducts.filter(p => p.cat === t.category);
      return { key: 'm' + i, label: t.name, icon: t.mode === 'category' && cat ? cat.icon : 'layers', link: t.link || (t.mode === 'category' && cat ? catUrl(cat.slug) : '/products'), items: t.limit ? list.slice(0, t.limit) : list };
    })
    : slugs.map(catBySlug).filter((c): c is NonNullable<typeof c> => !!c).map(c => ({ key: c.slug, label: c.name, icon: c.icon, link: catUrl(c.slug), items: visibleProducts.filter(p => p.cat === c.slug), count: c.count }));
  const [cur, setCur] = useState('');
  const rail = useRef<HTMLDivElement>(null);
  const offerIds = useOfferIds();
  const on = tabs.find(t => t.key === cur) ?? tabs[0];
  const hover = useAutoScroll(rail, on?.key ?? '');
  if (!on) return null;
  const items = on.items;
  return (
    <section className="band hr-band">
      <div className="wrap">
        <div className="hr-box hr-cat">
          <div className="hr-bar">
            <span className="hr-title"><Icon name="grid" size={19} />{title}</span>
            <span className="fs-nav">
              <button aria-label="Previous" onClick={() => rail.current?.scrollBy({ left: -rail.current.clientWidth * 0.8 })}><Icon name="left" size={15} /></button>
              <button aria-label="Next" onClick={() => rail.current?.scrollBy({ left: rail.current.clientWidth * 0.8 })}><Icon name="right" size={15} /></button>
            </span>
            <Link prefetch={false} className="hr-all" href={on.link}>View All<span className="hr-all-cat"> {on.label}</span> <Icon name="arrow" size={14} /></Link>
          </div>
          <div className="sbc">
            <nav className="sbc-list" aria-label="Category Spotlight">
              <small>Category Spotlight</small>
              {tabs.map(x => (
                <button key={x.key} className={x.key === on.key ? 'on' : ''} onClick={() => setCur(x.key)}>
                  <Icon name={x.icon} size={16} /><span>{x.label}</span><em>{(x as { count?: number }).count ?? x.items.length}</em>
                </button>
              ))}
            </nav>
            <div className="hr-rail sbc-rail" ref={rail} {...hover}>
              {items.length ? items.map(p => <RailCard key={p.id} p={p} offer={offerIds.has(p.id)} />)
                : <p className="muted sbc-empty">New {on.label} products are coming soon.</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
