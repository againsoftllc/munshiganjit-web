'use client';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Icon, ProductImg, Stars, StockTag, BuyButton, Crumb } from '@/components/ui';
import { useStore } from '@/components/store';
import { byId, visibleProducts as products, type Product } from '@/lib/data';
import { money, productUrl, warrantyFor } from '@/lib/format';

const LB = ['Processor / Core', 'Memory / Spec', 'Storage / Feature', 'Display / Feature', 'Other Features'];

export default function CompareClient() {
  const { compare, removeCompare, toggleCompare, toast } = useStore();
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const [diff, setDiff] = useState(false);
  const [qs, setQs] = useState<string[]>(['', '', '', '']);
  const [openSug, setOpenSug] = useState<number | null>(null);

  const l = compare.map(byId).filter((p): p is Product => !!p);
  const cols = [0, 1, 2, 3].map(i => l[i] || null);
  const minP = Math.min(...l.map(p => p.price));

  /* close suggestion boxes on outside click */
  useEffect(() => {
    const h = (e: MouseEvent) => { if (!(e.target as Element).closest?.('.cmp-sel')) setOpenSug(null); };
    document.addEventListener('click', h);
    return () => document.removeEventListener('click', h);
  }, []);

  const toggleGrp = (g: string) => setClosed(s => { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n; });

  /* key → comparable string, view → rendered cell (defaults to key) */
  const row = (lab: string, key: (p: Product) => string, g = '', view?: (p: Product) => ReactNode) => {
    const real = cols.filter((p): p is Product => !!p).map(key);
    const d = real.some(x => x !== real[0]);
    if (g && closed.has(g)) return null;
    return (
      <tr key={lab} data-g={g} className={d ? 'dr' + (diff ? ' diff' : '') : ''}>
        <th>{lab}</th>
        {cols.map((p, i) => <td key={i}>{p ? (view ? view(p) : key(p)) : ''}</td>)}
      </tr>
    );
  };
  const grp = (g: string) => (
    <tr key={'g-' + g} className={'grp' + (closed.has(g) ? ' closed' : '')} data-grp={g} onClick={() => toggleGrp(g)}>
      <th colSpan={5}>{g}<Icon name="down" size={16} /></th>
    </tr>
  );

  const pick = (id: string) => { toggleCompare(id); setQs(['', '', '', '']); setOpenSug(null); };
  const share = () => { try { void navigator.clipboard.writeText(location.href); } catch { /* ignore */ } toast('Comparison link copied', 'copy'); };

  return (
    <>
      <Crumb items={[['Product Comparison']]} />
      <div className="wrap">
        <div className="box" style={{ marginTop: 20 }}>
          <div className="cmp-head"><div><h1>Product Comparison</h1><p>Find and select products to see the differences and similarities between them</p></div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <label className="check"><input type="checkbox" id="diff" checked={diff} onChange={e => setDiff(e.target.checked)} />Highlight differences</label>
              <button className="btn btn-line btn-sm" onClick={() => window.print()}><Icon name="invoice" size={15} />Print</button>
              <button className="btn btn-brand btn-sm" id="share" onClick={share}><Icon name="share" size={15} />Share</button>
            </div></div>
          <div className="table-wrap"><table className="cmp" id="cmp"><tbody>
            <tr className="top">
              <th className="muted" style={{ verticalAlign: 'middle' }}>You can add Max 4 Products</th>
              {cols.map((p, i) => {
                const v = qs[i].toLowerCase();
                const res = v ? products.filter(x => !compare.includes(x.id) && (x.name + x.brand).toLowerCase().includes(v)).slice(0, 8) : [];
                return (
                  <td key={i}>
                    <div className="cmp-sel">
                      <input className="input" placeholder="Search and Select Product" data-sel={i}
                        value={p ? p.name.split(' ').slice(0, 4).join(' ') : qs[i]} readOnly={!!p}
                        onChange={e => { if (p) return; const val = e.target.value; setQs(q => q.map((x, k) => (k === i ? val : x))); setOpenSug(val.length > 0 ? i : null); }} />
                      {p ? <button className="x" aria-label="Remove" onClick={() => removeCompare(p.id)}><Icon name="close" size={16} /></button>
                        : <span className="x"><Icon name="search" size={16} /></span>}
                      <div className={'cmp-sug' + (openSug === i && v.length > 0 ? ' open' : '')} data-sug={i}>
                        {res.length ? res.map(x => <button key={x.id} onClick={() => pick(x.id)}><ProductImg p={x} size={28} />{x.name}</button>)
                          : <button disabled>No product found</button>}
                      </div>
                    </div>
                    {p ? (
                      <div className="cmp-p">
                        <Link className="ci" href={productUrl(p.id)}><ProductImg p={p} size={130} /></Link>
                        <Link href={productUrl(p.id)}>{p.name}</Link>
                        <div className="pc-price"><b className={p.price === minP && l.length > 1 ? 'best' : undefined}>{money(p.price)}</b>{p.old && <s>{money(p.old)}</s>}</div>
                      </div>
                    ) : <div className="cmp-empty">Find and select product to compare</div>}
                  </td>
                );
              })}
            </tr>
            {l.length > 0 && <>
              {row('Model', p => p.model)}
              {row('Brand', p => p.brand)}
              {row('Availability', p => p.stock + ':' + (p.stock === 'in' && p.qty <= 6 ? p.qty : ''), '', p => <StockTag p={p} />)}
              {row('Rating', p => p.rating + '/' + p.reviews, '', p => <><Stars rating={p.rating} size={13} /> {p.rating}/5 ({p.reviews} Reviews)</>)}
              {row('Units Sold', p => p.sold.toLocaleString('en-IN'))}
              {row('Summary', p => p.specs.slice(0, 3).join('|'), '', p => <ul style={{ listStyle: 'disc', paddingLeft: 16 }}>{p.specs.slice(0, 3).map(s => <li key={s}>{s}</li>)}</ul>)}
              {grp('Specification')}
              {LB.map((lb, i) => row(lb, p => p.specs[i] || '—', 'Specification'))}
              {grp('Price & Payment')}
              {row('Cash Price', p => money(p.price), 'Price & Payment')}
              {row('EMI', p => (p.emi ? 'From ' + money(Math.round(p.price / 12)) + '/month' : 'Not available'), 'Price & Payment')}
              {grp('Warranty')}
              {row('Warranty', p => warrantyFor(p.cat), 'Warranty')}
              <tr><th></th>{cols.map((p, i) => <td key={i}>{p ? <BuyButton p={p} /> : ''}</td>)}</tr>
            </>}
          </tbody></table></div>
        </div>
      </div>
    </>
  );
}
