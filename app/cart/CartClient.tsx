'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Crumb, Icon, ProductImg } from '@/components/ui';
import { useStore } from '@/components/store';
import { byId, type Product } from '@/lib/data';
import { money, productUrl } from '@/lib/format';

const YMAL = ['anker-zolo-10000mah', 'logitech-mk250-combo', 'acefast-c18-03-60w-type-c-to-type-c-cable', 'tp-link-archer-c64'];

export default function CartClient() {
  const { ready, cart, cartTotal, setQty, removeLine, addToCart, coupon, applyCoupon, clearCoupon, discount, couponNote, toast } = useStore();
  const [tab, setTab] = useState<'coupon' | 'voucher'>('coupon');
  const [input, setInput] = useState('');
  useEffect(() => { if (ready && coupon) setInput(coupon); }, [ready]);

  const add = (p: Product) => {
    addToCart(p.id, 1);
    toast(<><b>Added to cart:</b> {p.name.split(' ').slice(0, 5).join(' ')}… <Link href="/cart">View cart</Link></>, 'cart');
  };
  const apply = async (e: FormEvent) => {
    e.preventDefault();
    const c = input.trim().toUpperCase();
    const res = tab === 'coupon' && c ? await applyCoupon(c) : { ok: false, message: undefined as string | undefined };
    if (res.ok) { setInput(c); toast('Coupon applied', 'tag'); }
    else toast(res.message || 'Invalid or expired code', 'alert');
  };
  const switchTab = (t: 'coupon' | 'voucher') => { setTab(t); setInput(t === 'coupon' && coupon ? coupon : ''); };

  let body;
  if (!ready) body = <div style={{ minHeight: 320 }} />;
  else if (!cart.length) body = (
    <div className="oops">
      <div className="oops-art">
        <span className="dot" style={{ width: 18, height: 18, right: 20, top: 30 }} />
        <span className="dot" style={{ width: 10, height: 10, left: -20, top: 70, background: 'var(--brand)' }} />
        <div className="inner"><Icon name="box" size={70} /></div>
      </div>
      <h3>Oops!</h3><p>Your shopping cart is empty!</p>
      <Link className="btn btn-brand" href="/">Continue</Link>
    </div>
  );
  else {
    const sub = cartTotal, d = discount(sub);
    body = (
      <>
        <h1 className="page-h1">Shopping Cart</h1>
        <div className="cart-grid">
          <div>
            <div className="box"><h3>Your Products</h3>
              {cart.map((i, k) => (
                <div className="ci-row" key={i.id + (i.color || '') + k}>
                  <Link className="ci-img" href={productUrl(i.id)}><ProductImg p={i.p} size={70} /></Link>
                  <div>
                    <Link className="ci-name" href={productUrl(i.id)}>{i.p.name}</Link>
                    <div className="ci-meta">Model: <b>{i.p.model}</b>{i.color && <> · {i.vid ? 'Option' : 'Color'}: <b>{i.color}</b></>}</div>
                    {i.b2b && <span className="b2b-tag"><Icon name="briefcase" size={12} />Partner price · {i.warranty === false ? 'No Warranty' : 'With Warranty'}</span>}
                    {i.partnerNote && <div className="b2b-warn" role="alert"><Icon name="alert" size={13} />{i.partnerNote}</div>}
                  </div>
                  <div className="qty">
                    <button onClick={() => setQty(k, i.qty - 1)} aria-label="Less"><Icon name="minus" size={16} /></button>
                    <span>{i.qty}</span>
                    <button onClick={() => setQty(k, i.qty + 1)} aria-label="More"><Icon name="plus" size={16} /></button>
                  </div>
                  <div className="ci-price"><b>{money(i.unit * i.qty)}</b><small>{money(i.unit)}/unit</small></div>
                  <button className="ci-rm" onClick={() => removeLine(k)} aria-label="Remove"><Icon name="close" size={20} /></button>
                </div>
              ))}
            </div>
            <div className="ymal"><h3>You May Also Like</h3><p>People frequently buy these with the products in your cart</p>
              <div className="ymal-grid">
                {YMAL.map(byId).filter((p): p is Product => !!p).map(p => (
                  <div className="ymal-card" key={p.id}>
                    <Link className="yi" href={productUrl(p.id)}><ProductImg p={p} size={96} /></Link>
                    <div className="yb">
                      <Link href={productUrl(p.id)}>{p.name}</Link>
                      <div className="pc-price"><b>{money(p.price)}</b>{p.old && <s>{money(p.old)}</s>}</div>
                      <button className="btn-buy" onClick={() => add(p)}>Add to Cart</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <aside className="box zigzag"><h3>Order Summary</h3>
            <div className="sum-extra"><b>Get Some Extra</b><p>Use coupon / voucher / reward points</p>
              <div className="sum-tabs">
                <button className={tab === 'coupon' ? 'on' : ''} onClick={() => switchTab('coupon')}><Icon name="tag" size={14} />Coupon</button>
                <button className={tab === 'voucher' ? 'on' : ''} onClick={() => switchTab('voucher')}><Icon name="gift" size={14} />Gift Voucher</button>
              </div>
              <form className="coupon" onSubmit={apply}>
                <input className="input" placeholder={tab === 'coupon' ? 'Promo / Coupon Code' : 'Gift Voucher Code'} value={input}
                  onChange={e => setInput(e.target.value)} style={{ textTransform: 'uppercase' }} />
                <button className="btn btn-soft" type="submit">Apply</button>
              </form>
              {d ? (
                <p className="sm" style={{ color: 'var(--green)', margin: '10px 0 0' }}>{coupon} applied — you save {money(d)} · <a href="#" onClick={e => { e.preventDefault(); clearCoupon(); setInput(''); }}>Remove</a></p>
              ) : coupon && couponNote ? (
                <p className="sm" style={{ color: 'var(--red, #dc2626)', margin: '10px 0 0' }}>{coupon} is not applied: {couponNote} · <a href="#" onClick={e => { e.preventDefault(); clearCoupon(); setInput(''); }}>Remove</a></p>
              ) : null}
            </div>
            <div className="sum-row"><span>Sub-Total:</span><b>{money(sub)}</b></div>
            {d > 0 && <div className="sum-row"><span>Discount ({coupon}):</span><b className="green">−{money(d)}</b></div>}
            <div className="sum-row total"><span>Total:</span><b>{money(sub - d)}</b></div>
            <Link className="btn btn-brand btn-block btn-lg" href="/checkout" style={{ marginTop: 12 }}>Confirm Order</Link>
          </aside>
        </div>
      </>
    );
  }

  return (
    <>
      <Crumb items={[['Shopping Cart']]} />
      <div className="wrap">{body}</div>
    </>
  );
}
