'use client';
/* The products of a deal / an offer with their filters: Shop by Category and Discount Amount on the left, the product cards on the
   right. One component for the Deals page and for an offer's own (Auto) page, so both look and work the same. */
import { useEffect, useState, type ReactNode } from 'react';
import { categories, type Product } from '@/lib/data';
import { money } from '@/lib/format';
import { Icon, ProductCard } from '@/components/ui';

const save = (p: Product) => (p.old ?? p.price) - p.price;
const STEP = 50;

export default function ProductShelf({ items, initCat, syncUrl, sortBySaving = false, heading, blurb, allLabel, noneTitle, noneHint, noneButton }: {
  items: Product[];
  initCat?: string;
  /** keep the chosen category in this address (?cat=...) so the page can be shared */
  syncUrl?: string;
  sortBySaving?: boolean;
  heading: string;
  blurb: (count: number) => ReactNode;
  allLabel: string;
  noneTitle: string;
  noneHint: string;
  noneButton: string;
}) {
  const maxSave = Math.max(STEP, Math.ceil(Math.max(0, ...items.map(save)) / STEP) * STEP);
  const [cat, setCat] = useState(initCat || '');
  const [rng, setRng] = useState<[number, number]>([0, Infinity]);
  const lo = Math.min(rng[0], maxSave), hi = Math.min(rng[1], maxSave);

  useEffect(() => {
    if (!syncUrl) return;
    const q = new URLSearchParams();
    if (cat) q.set('cat', cat);
    history.replaceState(null, '', syncUrl + (q.toString() ? '?' + q : ''));
  }, [cat, syncUrl]);

  const inRange = (p: Product) => save(p) >= lo && save(p) <= hi;
  const filtered = items.filter(p => (!cat || p.cat === cat) && inRange(p));
  const shown = sortBySaving ? filtered.slice().sort((a, b) => save(b) - save(a)) : filtered;
  // counts follow the discount range (the list reflects what is in the deal)
  const catCounts = categories.map(c => [c, items.filter(p => p.cat === c.slug && inRange(p)).length] as const).filter(x => items.some(p => p.cat === x[0].slug));
  const catName = categories.find(c => c.slug === cat)?.name;
  const clear = () => { setCat(''); setRng([0, Infinity]); };

  return (
    <div className="dl-wrap">
      <aside className="dl-side" aria-label="Filters">
        <div className="fbox dl-box">
          <h4>Shop by Category</h4>
          <ul className="dl-list">
            <li><button className={!cat ? 'on' : ''} onClick={() => setCat('')}>{allLabel} <em>{items.filter(inRange).length}</em></button></li>
            {catCounts.map(([c, n]) => <li key={c.slug}><button className={cat === c.slug ? 'on' : ''} onClick={() => setCat(cat === c.slug ? '' : c.slug)}>{c.name} <em>{n}</em></button></li>)}
          </ul>
        </div>
        <div className="fbox dl-box">
          <h4>Discount Amount</h4>
          <div className="fbody dl-rng">
            <div className="range">
              <div className="track" />
              <div className="fill" style={{ left: (lo / maxSave) * 100 + '%', right: 100 - (hi / maxSave) * 100 + '%' }} />
              <input type="range" min={0} max={maxSave} step={STEP} value={lo} aria-label="Minimum discount" onChange={e => setRng([Math.min(+e.target.value, hi), hi])} />
              <input type="range" min={0} max={maxSave} step={STEP} value={hi} aria-label="Maximum discount" onChange={e => setRng([lo, Math.max(+e.target.value, lo)])} />
            </div>
            <div className="dl-rng-v"><span>Save {money(lo)}</span><span>{money(hi)}</span></div>
          </div>
        </div>
      </aside>

      <div className="dl-main">
        <div className="dl-main-h">
          <h2>{catName || heading}</h2>
          <p>{blurb(shown.length)}</p>
          {(cat || lo > 0 || hi < maxSave) && <button className="chip-clear" onClick={clear}>Clear filters</button>}
        </div>
        <div className="grid g4 dl-grid">
          {shown.length
            ? shown.map(p => <ProductCard key={p.id} p={p} />)
            : <div className="card oops" style={{ gridColumn: '1/-1' }}>
                <div className="oops-art"><div className="inner"><Icon name="tag" size={64} /></div></div>
                <h3>{noneTitle}</h3><p>{noneHint}</p>
                <button className="btn btn-brand" onClick={clear}>{noneButton}</button>
              </div>}
        </div>
      </div>
    </div>
  );
}
