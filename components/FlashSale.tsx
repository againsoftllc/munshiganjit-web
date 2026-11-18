'use client';
/* Flash Sale — compact, colourful, time-bound (client feedback round 2, point 7).
   Renders only while a sale is live (startAt <= now < endAt) and unmounts itself when the countdown hits 0.
   Decided on the client after mount, so the server HTML never shows an expired sale. */
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { activeFlashSale, byId, type FlashSale as Sale } from '@/lib/data';
import { money, productUrl } from '@/lib/format';
import { Icon, ProductImg, Countdown } from './ui';
import { useStore } from './store';

export default function FlashSale() {
  const [sale, setSale] = useState<Sale | null>(null);
  const rail = useRef<HTMLDivElement>(null);
  const { addAndOpen } = useStore();
  useEffect(() => { setSale(activeFlashSale()); }, []);
  if (!sale) return null;

  const items = sale.items.map(i => ({ ...i, p: byId(i.id)! })).filter(i => i.p && i.p.stock === 'in');
  const scroll = (dir: number) => rail.current?.scrollBy({ left: dir * rail.current.clientWidth * 0.8 });

  return (
    <section className="band">
      <div className="wrap">
        <div className="fs-box">
          <div className="fs-bar">
            <span className="fs-title"><Icon name="bolt" size={20} />Flash Sale<span className="fs-live">LIVE</span></span>
            <span className="fs-ends">Ends in</span>
            <Countdown to={Date.parse(sale.endAt)} onEnd={() => setSale(null)} labels={['D', 'H', 'M', 'S']} />
            <span className="fs-nav">
              <button aria-label="Previous" onClick={() => scroll(-1)}><Icon name="left" size={15} /></button>
              <button aria-label="Next" onClick={() => scroll(1)}><Icon name="right" size={15} /></button>
            </span>
          </div>
          <div className="fs-rail" ref={rail}>
            {items.map(({ p, limit, sold }) => {
              const base = p.old ?? p.price, off = Math.round((1 - p.price / base) * 100), pct = Math.min(100, Math.round(sold / limit * 100));
              return (
                <article key={p.id} className="fs-card">
                  <Link prefetch={false} href={productUrl(p.id)} className="fs-img">
                    {off > 0 && <span className="fs-off">-{off}%</span>}
                    <ProductImg p={p} size={110} />
                  </Link>
                  <Link prefetch={false} href={productUrl(p.id)} className="fs-name">{p.name}</Link>
                  <div className="fs-price"><b>{money(p.price)}</b>{p.old && <s>{money(p.old)}</s>}</div>
                  <div className="fs-prog" aria-label={sold + ' of ' + limit + ' sold'}><i style={{ width: pct + '%' }} /></div>
                  <div className="fs-left">{pct >= 70 ? <b>Almost gone!</b> : <span>{sold} sold</span>}<span>{limit - sold} left</span></div>
                  <button className="fs-add" onClick={() => addAndOpen(p.id, 'add')}>
                    <Icon name="cart" size={14} />Add to Cart
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
