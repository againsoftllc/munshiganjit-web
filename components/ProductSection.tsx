'use client';
/* Home product rows (Featured Products · Latest Products · Best Sellers) — same system as the Flash Sale row:
   arrows on the left, title + subtitle centered, "View All" on the right, then a rail of product cards
   (Save badge when there is a real discount, photo, name, price, View Details). */
import Link from 'next/link';
import { useRef } from 'react';
import { byId, visibleProducts, type Product } from '@/lib/data';
import { money, productUrl } from '@/lib/format';
import { useRailBar } from './useRailBar';
import { Icon, ProductImg } from './ui';

export type SectionKey = 'featured' | 'latest' | 'best';

const SECTIONS: Record<SectionKey, { title: string; sub: string; href: string; ids: string[] }> = {
  featured: {
    title: 'Featured Products', sub: 'Handpicked premium tech products', href: '/products',
    ids: ['amd-ryzen-7-7700-gaming-processor', 'gigabyte-b650-ud-ac-am5-atx-motherboard', 'msi-pro-mp251l-e2-24-5-120hz-1ms-fhd-ips-business-monitor', 'value-top-s24ifr100w-23-8-100hz-fhd-ips-led-frameless-monitor', 'dahua-dhi-lm55-f400-55-inch-4k-uhd-display-dual-hdmi-vga-usb-black-mon', 'mercusys-mr80x-ax3000-dual-band-gigabit-wifi-6-router'],
  },
  latest: {
    title: 'Latest Products', sub: 'Check out our newest arrivals', href: '/products',
    ids: ['fifine-k658-rgb-usb-dynamic-cardioid-gaming-microphone', 'ulanzi-a100-wireless-lavalier-microphone', 'boya-by-gm18cb-desktop-gooseneck-condenser-microphone', 'rapoo-m650-multi-mode-wireless-optical-mouse', 'printex-dl-5120h-drum-unit', 'wiwu-airbuds-pro-2-anc-true-wireless-earbuds-type-c'],
  },
  best: {
    title: 'Best Sellers', sub: 'Top-rated products loved by our customers', href: '/products?sort=sold',
    ids: ['rapoo-m650-multi-mode-wireless-optical-mouse', 'mercusys-mr80x-ax3000-dual-band-gigabit-wifi-6-router', 'fifine-k658-rgb-usb-dynamic-cardioid-gaming-microphone', 'havit-hakii-moon-true-bluetooth-dual-earbuds', 'dizo-wireless-active-bluetooth-neckband', 'boya-by-gm18cb-desktop-gooseneck-condenser-microphone'],
  },
};

/** the listed products; when the catalog (e.g. the live backend) has none of them, a sensible pick from whatever products exist */
function pick(key: SectionKey): Product[] {
  const listed = SECTIONS[key].ids.map(id => byId(id)).filter((p): p is Product => !!p && p.stock === 'in');
  if (listed.length >= 4) return listed;
  const all = visibleProducts.filter(p => p.stock === 'in');
  const sorted = key === 'best' ? [...all].sort((a, b) => b.sold - a.sold) : key === 'featured' ? [...all].sort((a, b) => b.price - a.price) : all;
  return sorted.slice(0, 12);
}

export default function ProductSection({ k }: { k: SectionKey }) {
  const rail = useRef<HTMLDivElement>(null);
  const bar = useRailBar(rail);
  const meta = SECTIONS[k];
  const items = pick(k);
  if (!items.length) return null;
  const scroll = (dir: number) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className="band">
      <div className="wrap">
        <div className="fsx-head">
          <div>
            <h2>{meta.title}</h2>
            <p>{meta.sub}</p>
          </div>
          <div className="fsx-ctl">
            <button className="fsx-arrow" aria-label="Previous" onClick={() => scroll(-1)}><Icon name="left" size={16} /></button>
            <button className="fsx-arrow" aria-label="Next" onClick={() => scroll(1)}><Icon name="right" size={16} /></button>
          </div>
          <Link prefetch={false} href={meta.href} className="fsx-all"><span className="fsx-all-t">View All</span><Icon name="arrow" size={14} /></Link>
        </div>
        <div className="fsx-rail" ref={rail} onScroll={bar.onScroll}>
          {items.map(p => {
            const save = p.old && p.old > p.price ? p.old - p.price : 0;
            return (
              <article key={p.id} className="fsx-card">
                <Link prefetch={false} href={productUrl(p.id)} className="fsx-img">
                  {save > 0 && <span className="fsx-save">Save: {money(save)}</span>}
                  <ProductImg p={p} size={150} />
                </Link>
                <Link prefetch={false} href={productUrl(p.id)} className="fsx-name">{p.name}</Link>
                <div className="fsx-price"><b>{money(p.price)}</b>{save > 0 && <s>{money(p.old!)}</s>}</div>
                <Link prefetch={false} href={productUrl(p.id)} className="fsx-btn dk">View Details</Link>
              </article>
            );
          })}
        </div>
        <div className="fsx-bar" aria-hidden="true"><span ref={bar.thumb} /></div>
      </div>
    </section>
  );
}
