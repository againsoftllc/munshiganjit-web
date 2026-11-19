'use client';
/* Flash Sale — Techland-style row: title + "Limited time deals" on the left, prev / next / View All on the right,
   then product cards (Save badge, photo, name, price, days-hrs-min-sec box, View Deal).
   Renders only while a sale is live (startAt <= now < endAt) and unmounts itself when the countdown hits 0.
   Decided on the client after mount, so the server HTML never shows an expired sale. */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { activeFlashSale, byId, type FlashSale as Sale } from '@/lib/data';
import { money, productUrl } from '@/lib/format';
import { useRailBar } from './useRailBar';
import { Icon, ProductImg, Countdown } from './ui';

export default function FlashSale() {
  const [sale, setSale] = useState<Sale | null>(null);
  const rail = useRef<HTMLDivElement>(null);
  const bar = useRailBar(rail, sale);
  useEffect(() => { setSale(activeFlashSale()); }, []);
  if (!sale) return null;

  const items = sale.items.map(i => ({ ...i, p: byId(i.id)! })).filter(i => i.p && i.p.stock === 'in');
  if (!items.length) return null;
  const scroll = (dir: number) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8, behavior: 'smooth' });
  const end = Date.parse(sale.endAt);

  return (
    <section className="band">
      <div className="wrap">
        <div className="fsx-head">
          <div>
            <h2>Flash Sale</h2>
            <p>Limited time deals</p>
          </div>
          <div className="fsx-ctl">
            <button className="fsx-arrow" aria-label="Previous" onClick={() => scroll(-1)}><Icon name="left" size={16} /></button>
            <button className="fsx-arrow" aria-label="Next" onClick={() => scroll(1)}><Icon name="right" size={16} /></button>
          </div>
          <Link prefetch={false} href="/deals" className="fsx-all"><span className="fsx-all-t">View All</span><Icon name="arrow" size={14} /></Link>
        </div>
        <div className="fsx-rail" ref={rail} onScroll={bar.onScroll}>
          {items.map(({ p }) => {
            const save = (p.old ?? p.price) - p.price;
            return (
              <article key={p.id} className="fsx-card">
                <Link prefetch={false} href={productUrl(p.id)} className="fsx-img">
                  {save > 0 && <span className="fsx-save">Save: {money(save)}</span>}
                  <ProductImg p={p} size={150} />
                </Link>
                <Link prefetch={false} href={productUrl(p.id)} className="fsx-name">{p.name}</Link>
                <div className="fsx-price"><b>{money(p.price)}</b>{p.old && p.old > p.price && <s>{money(p.old)}</s>}</div>
                <div className="fsx-cd"><Countdown to={end} onEnd={() => setSale(null)} labels={['DAYS', 'HRS', 'MIN', 'SEC']} /></div>
                <Link prefetch={false} href={productUrl(p.id)} className="fsx-btn"><Icon name="bolt" size={16} />View Deal</Link>
              </article>
            );
          })}
        </div>
        <div className="fsx-bar" aria-hidden="true"><span ref={bar.thumb} /></div>
      </div>
    </section>
  );
}
