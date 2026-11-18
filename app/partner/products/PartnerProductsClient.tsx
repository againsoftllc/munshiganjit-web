'use client';
/* /partner/products — the products the admin switched on for partners, with the quantity-slab prices */
import Link from 'next/link';
import { useState } from 'react';
import { Crumb, Icon, ProductImg } from '@/components/ui';
import { usePartner } from '@/components/partner';
import { useStore } from '@/components/store';
import { b2bList, minQty, slabLabel, variantNames, TIER_LABEL } from '@/lib/b2b';
import { byId, catBySlug, type Product } from '@/lib/data';
import { money, productUrl } from '@/lib/format';

export default function PartnerProductsClient() {
  const { ready, me, tier } = usePartner();
  const { addAndOpen } = useStore();
  const [cat, setCat] = useState('');
  if (!ready) return null;
  if (!tier || !me) return (
    <>
      <Crumb items={[['Partner Prices']]} />
      <div className="wrap pt-wrap"><section className="box pt-login">
        <h1><Icon name="lock" size={22} />Partner prices are for approved partners</h1>
        <p className="muted">{me ? 'Your application is pending approval.' : 'Please sign in to your account.'}</p>
        <div className="pt-apply"><Link className="btn btn-brand" href="/partner">Partner Account</Link><Link className="btn btn-accent" href="/reseller">Become a Reseller</Link></div>
      </section></div>
    </>
  );

  const list = Object.keys(b2bList).map(byId).filter((p): p is Product => !!p);
  const cats = [...new Set(list.map(p => p.cat))];
  const shown = list.filter(p => !cat || p.cat === cat);

  return (
    <>
      <Crumb items={[['Partner Account', '/partner'], [TIER_LABEL[tier] + ' Prices']]} />
      <div className="wrap pt-wrap">
        <div className="pt-head">
          <div><h1>{TIER_LABEL[tier]} Prices</h1><p className="muted">{me.business} · {list.length} products available to partners</p></div>
          <span className="pp-status approved"><Icon name="checkCircle" size={18} />Approved {TIER_LABEL[tier]}</span>
        </div>
        <div className="brand-pills" style={{ marginBottom: 14 }}>
          <button className={'pill' + (cat ? '' : ' on')} onClick={() => setCat('')}>All <em>({list.length})</em></button>
          {cats.map(c => <button key={c} className={'pill' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{catBySlug(c)?.name} <em>({list.filter(p => p.cat === c).length})</em></button>)}
        </div>
        <div className="pt-table-wrap">
          <table className="pt-table">
            <thead><tr><th>Product</th><th>Retail</th><th>Quantity prices (with / without warranty)</th><th>Min order</th><th /></tr></thead>
            <tbody>
              {shown.map(p => {
                const e = b2bList[p.id];
                const colors = variantNames(e);
                return (
                  <tr key={p.id}>
                    <td><Link href={productUrl(p.id)} className="pt-prod"><ProductImg p={p} size={44} /><span className="notranslate" translate="no">{p.name}</span></Link></td>
                    <td className="pt-retail">{money(p.regular ?? p.price)}</td>
                    <td>
                      {e.slabs.map((s, i) => {
                        return <div key={s.min}><small>{slabLabel(e.slabs, i)} pcs:</small> <b>{s.warranty > 0 ? money(s.warranty) : '—'}</b>{s.noWarranty ? <small> / {money(s.noWarranty)} without</small> : null}</div>;
                      })}
                      {colors.length > 0 && <small>Own prices for: {colors.join(', ')}</small>}
                    </td>
                    <td>{minQty(e)}</td>
                    <td><button className="btn btn-accent btn-sm" onClick={() => addAndOpen(p.id, 'add', minQty(e), colors[0] ?? null, true)}><Icon name="cart" size={14} />Add</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
