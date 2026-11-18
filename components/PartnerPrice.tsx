'use client';
/* Product page: a "Reseller price available" line under the payment options. Clicking it opens the partner price list in a
   popup: an approved partner sees the quantity-slab table (with / without warranty, per colour) and can add to the cart;
   anyone else sees how to get partner prices (sign in / apply). */
import Link from 'next/link';
import { useState } from 'react';
import type { Product } from '@/lib/data';
import { b2bSeller, fixedQuantities, minQty, offersNoWarranty, partnerEntry, slabLabel, slabsOf, unitPrice, variantNames, TIER_LABEL } from '@/lib/b2b';
import { partnerProductIds } from '@/lib/data';
import { money } from '@/lib/format';
import { Icon, Modal } from './ui';
import { useStore } from './store';
import { usePartner } from './partner';

export default function PartnerPrice({ p }: { p: Product }) {
  const { ready, me, tier, signedIn } = usePartner();
  const { addAndOpen, toast } = useStore();
  const e = partnerEntry(!!tier, p.id);
  const colors = e ? variantNames(e) : [];
  const [open, setOpen] = useState(false);
  const [warranty, setWarranty] = useState(true);
  // the partner prices arrive after the page loads: until the visitor chooses, the first colour and the minimum order apply
  const [colorSel, setColor] = useState<string | null>(null);
  const [qtySel, setQty] = useState<string | null>(null);
  const color = colorSel ?? colors[0] ?? null;
  const forReseller = partnerProductIds.reseller.has(p.id), forCorporate = partnerProductIds.corporate.has(p.id);
  if (!ready || (!e && !forReseller && !forCorporate)) return null;

  const label = (tier ? TIER_LABEL[tier] : 'Reseller / Corporate') + ' price available';

  let body: React.ReactNode;
  if (!e) {
    body = me && me.status === 'pending'
      ? <p className="pp-modal-note"><Icon name="clock" size={18} />Your {TIER_LABEL[me.type].toLowerCase()} application is <b>pending approval</b>. The partner price list opens here once it is approved.</p>
      : <>
        <p className="pp-modal-note"><Icon name="briefcase" size={18} />Buying for your shop or company? Reseller and corporate customers get quantity-based prices on this product, with or without warranty.</p>
        <div className="pt-apply">
          {signedIn
            ? <>{forReseller && <Link className="btn btn-accent" href="/reseller">Become a Reseller</Link>}{forCorporate && <Link className="btn btn-line-brand" href="/corporate">Corporate Buyer</Link>}</>
            : <><Link className="btn btn-brand" href="/login?next=/partner">Sign in</Link>{forReseller && <Link className="btn btn-accent" href="/reseller">Become a Reseller</Link>}{forCorporate && <Link className="btn btn-line-brand" href="/corporate">Corporate Buyer</Link>}</>}
        </div>
        <p className="pp-foot">Already a partner? Sign in to your account to see the price list.</p>
      </>;
  } else {
    const fixed = fixedQuantities(e);
    // no more than what is left of the offer
    const cap = Math.max(1, Math.min(999, e.offerLeft ?? 999));
    const raw = Math.max(1, Math.floor(+(qtySel ?? String(minQty(e))) || 0));
    const n = fixed.length ? (fixed.includes(raw) ? raw : fixed[0]) : Math.min(raw, cap);
    const moq = minQty(e);
    const noW = offersNoWarranty(e);
    const slabs = slabsOf(e, color);
    const unit = unitPrice(e, { warranty, color, qty: n });
    // - / + : a fixed-quantity product steps through its offered quantities, any other product by 1 from the minimum order
    const step = (dir: 1 | -1) => {
      if (fixed.length) {
        const i = Math.max(0, fixed.indexOf(n));
        setQty(String(fixed[Math.min(fixed.length - 1, Math.max(0, i + dir))]));
      } else setQty(String(Math.min(cap, Math.max(moq, n + dir))));
    };
    const atMin = fixed.length ? fixed.indexOf(n) <= 0 : n <= moq;
    const atMax = fixed.length ? fixed.indexOf(n) >= fixed.length - 1 : n >= cap;
    const active = [...slabs].reverse().find(s => s.min <= n && (s.max == null || n <= s.max))?.min;
    const add = () => {
      if (n < moq) return toast(`Minimum order is ${moq} units`, 'alert');
      if (unit == null) return toast(fixed.length ? `Partner prices are for these quantities only: ${fixed.join(', ')}` : 'This price is not available at this quantity', 'alert');
      setOpen(false);
      addAndOpen(p.id, 'add', n, color, warranty);
    };
    body = (
      <div className="pp in-modal">
        <div className="pp-head"><span className="pp-badge"><Icon name="checkCircle" size={14} />{TIER_LABEL[tier!]} Price</span><span className="muted sm">Retail {money(p.regular ?? p.price)}</span></div>
        <div className="pp-opts">
          <div className="pp-seg" role="radiogroup" aria-label="Warranty">
            <button className={warranty ? 'on' : ''} onClick={() => setWarranty(true)}><Icon name="shield" size={14} />With Warranty</button>
            {noW && <button className={!warranty ? 'on' : ''} onClick={() => setWarranty(false)}>Without Warranty</button>}
          </div>
          {colors.length > 0 && (
            <div className="pp-seg" role="radiogroup" aria-label="Colour">
              {colors.map(c => <button key={c} className={color === c ? 'on' : ''} onClick={() => setColor(c)}>{c}</button>)}
            </div>
          )}
        </div>
        <table className="pp-table">
          <thead><tr><td>Quantity</td><td>With warranty</td>{noW && <td>Without warranty</td>}</tr></thead>
          <tbody>{slabs.map((s, i) => (
            <tr key={s.min} className={active === s.min ? 'on' : ''}>
              <td>{slabLabel(slabs, i)} units</td>
              <td>{s.warranty > 0 ? money(s.warranty) + ' / unit' : '—'}</td>
              {noW && <td>{s.noWarranty ? money(s.noWarranty) + ' / unit' : '—'}</td>}
            </tr>
          ))}</tbody>
        </table>
        <div className="pp-buy">
          <div className="pp-qtybox">
            <div className="qty">
              <button type="button" aria-label="Less" disabled={atMin} onClick={() => step(-1)}><Icon name="minus" size={16} /></button>
              {fixed.length > 0
                ? <span aria-live="polite">{n}</span>
                : <input value={qtySel ?? String(minQty(e))} inputMode="numeric" aria-label="Quantity" onChange={ev => setQty(ev.target.value.replace(/\D/g, ''))} onBlur={() => setQty(String(Math.min(cap, Math.max(moq, raw))))} />}
              <button type="button" aria-label="More" disabled={atMax} onClick={() => step(1)}><Icon name="plus" size={16} /></button>
            </div>
            <small className="pp-qtyhint">{fixed.length ? `Available: ${fixed.join(' · ')}` : `Min ${moq}`}{e.offerLeft != null ? ` · ${e.offerLeft} pcs left at this price` : ''}</small>
          </div>
          <div className="pp-total"><small>{unit != null ? `${money(unit)} × ${n}` : `Minimum order ${moq}`}</small><b>{unit != null ? money(unit * n) : '—'}</b></div>
          <button className="btn btn-accent" onClick={add}><Icon name="cart" size={16} />Add to Cart</button>
        </div>
        <p className="pp-foot">{fixed.length ? `Available in ${fixed.join(', ')} units` : `Minimum order ${moq} units`} · the price is set by the total quantity of this product in your cart · {warranty ? 'Official warranty included' : `No warranty · invoiced by ${b2bSeller.name}`}</p>
      </div>
    );
  }

  return (
    <>
      <button type="button" className="pp-link" onClick={() => setOpen(true)}>
        <Icon name="briefcase" size={16} /><span>{label}</span><small>View price list<Icon name="arrow" size={13} /></small>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={(tier ? TIER_LABEL[tier] : 'Reseller / Corporate') + ' price list'}>
        <div className="pp-modal">
          <p className="pp-modal-prod">{p.name}</p>
          {body}
        </div>
      </Modal>
    </>
  );
}
