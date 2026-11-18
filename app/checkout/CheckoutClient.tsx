'use client';
/* Checkout — Motion View guest-checkout layout (client feedback round 2, point 14b).
   Left: Shopping Cart (select items) + Delivery Address (Division → District → Sub District).
   Right: Payment Method · Delivery Method · Checkout Summary. Only the selected items are ordered. */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Crumb, Icon, ProductImg } from '@/components/ui';
import { useStore } from '@/components/store';
import { money, productUrl } from '@/lib/format';
import { ApiError, getToken, placeOrder, previewCoupon } from '@/lib/api';
import Turnstile, { TURNSTILE_SITE_KEY } from '@/components/Turnstile';
import { GEO, divisionsOf, districtsOf, subDistrictsOf, PICKUP_POINTS } from '@/lib/geo';
import { chargeFor } from '@/lib/delivery';
import { useDelivery } from '@/lib/useDelivery';

const MOBILE_RE = /^01[3-9]\d{8}$/;
type Pay = 'cod' | 'bkash' | 'card';
const key = (id: string, color: string | null) => id + '|' + (color ?? '');

/* the look-alike check shown only while no Turnstile site key is set (it checks nothing) */
function HumanCheck({ ok, onOk }: { ok: boolean; onOk: () => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" className={'hc' + (ok ? ' ok' : '')} disabled={ok || busy} onClick={() => { setBusy(true); setTimeout(() => { setBusy(false); onOk(); }, 900); }}>
      <span className="hc-box">{ok ? <Icon name="check" size={16} /> : busy ? <i className="hc-spin" /> : null}</span>
      <span>{ok ? 'Success!' : busy ? 'Verifying…' : 'Verify you are human'}</span>
      <span className="hc-cf"><b>CLOUDFLARE</b><small>Privacy · Help</small></span>
    </button>
  );
}

export default function CheckoutClient() {
  const { ready, cart, setQty, removeLine, coupon, applyCoupon, clearCoupon, discount, customer, toast } = useStore();
  const [off, setOff] = useState<Set<string>>(new Set());      // unticked cart lines
  const [formOpen, setFormOpen] = useState(true);
  const [f, setF] = useState({ nm: '', mb: '', ad: '', dv: '', ds: '', sd: '' });
  const [human, setHuman] = useState(false);
  const [tsToken, setTsToken] = useState('');   // the Cloudflare Turnstile answer
  const [tsReset, setTsReset] = useState(0);
  const [atype, setAtype] = useState<'home' | 'office'>('home');
  const [pay, setPay] = useState<Pay>('cod');
  const dlv = useDelivery(); // the admin's delivery charge
  const [ship, setShip] = useState<'home' | 'pickup'>('home');
  const [pickup, setPickup] = useState(PICKUP_POINTS[0]);
  const [code, setCode] = useState('');
  const [terms, setTerms] = useState(true);
  const [touched, setTouched] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (ready && coupon) setCode(coupon); }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (customer) setF(x => ({ ...x, nm: x.nm || customer.name, mb: x.mb || customer.phone })); }, [customer]);

  // success modal: lock scroll + Escape closes
  useEffect(() => {
    if (!orderId) return;
    document.body.classList.add('lock');
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setOrderId(null); };
    addEventListener('keydown', k);
    return () => { document.body.classList.remove('lock'); removeEventListener('keydown', k); };
  }, [orderId]);

  const picked = cart.filter(i => !off.has(key(i.id, i.color)));
  const allOn = cart.length > 0 && picked.length === cart.length;
  const sub = picked.reduce((s, i) => s + i.unit * i.qty, 0);
  // the coupon's discount as the SERVER works it out (it knows which products / categories the coupon covers); until it answers, the shop's own estimate
  const [srvDisc, setSrvDisc] = useState<{ key: string; amount: number } | null>(null);
  const discKey = coupon ? coupon + '|' + picked.map(i => i.id + ':' + (i.vid || '') + ':' + i.qty).join(',') : '';
  const hasPartner = picked.some(i => i.b2b);
  const disc = srvDisc && srvDisc.key === discKey ? Math.min(srvDisc.amount, sub) : discount(sub);
  const charge = ship === 'home' && f.ds ? chargeFor(dlv, f.ds) : 0;
  const chargeOff = ship === 'home' && dlv.freeFrom > 0 && sub >= dlv.freeFrom ? charge : 0;
  const total = Math.max(0, sub - disc + charge - chargeOff);
  useEffect(() => {
    if (!coupon || !picked.length || hasPartner) return;
    let live = true;
    const t = setTimeout(() => {
      previewCoupon(picked.map(i => ({ p: i.p, qty: i.qty, vid: i.vid })), coupon, f.ds, getToken())
        .then(a => { if (live) setSrvDisc({ key: discKey, amount: a }); })
        .catch(() => { /* keep the estimate; the server checks again when the order is placed */ });
    }, 500);
    return () => { live = false; clearTimeout(t); };
  }, [discKey, f.ds]); // eslint-disable-line react-hooks/exhaustive-deps

  const missing = [
    !f.nm.trim() && 'Full Name', !MOBILE_RE.test(f.mb.trim()) && 'Phone (01XXXXXXXXX)', (TURNSTILE_SITE_KEY ? !tsToken : !human) && 'Security check',
    !f.ad.trim() && 'Full Address', !f.dv && 'Division', !f.ds && 'District', !f.sd && 'Sub District',
    !picked.length && 'at least one product', !terms && 'Terms & Conditions',
  ].filter(Boolean) as string[];
  const bad = (k: keyof typeof f) => touched && (k === 'mb' ? !MOBILE_RE.test(f.mb.trim()) : !f[k].trim());

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF(s => ({ ...s, [k]: e.target.value }));
  const toggle = (k: string) => setOff(s => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  const apply = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return toast('Invalid voucher code', 'alert');
    const res = await applyCoupon(c); // the store asks the server (its rules) before keeping the coupon
    if (!res.ok) return toast(res.message || 'Invalid voucher code', 'alert');
    toast('Voucher applied', 'tag');
  };

  const confirm = async () => {
    setTouched(true);
    if (busy) return;
    if (missing.length) return toast('Please complete: ' + missing.join(', '), 'alert');
    setBusy(true);
    try {
      if (pay !== 'cod') toast(pay === 'bkash' ? 'Online payment is not connected yet — your order is placed as Cash on Delivery' : 'Card payment is not connected yet — your order is placed as Cash on Delivery', 'info');
      const placed = await placeOrder(picked.map(i => ({ p: i.p, qty: i.qty, b2b: i.b2b, warranty: i.warranty !== false, color: i.color, vid: i.vid })), {
        name: f.nm.trim(), phone: f.mb.trim(), address: f.ad.trim(), district: f.ds, division: f.dv, subDistrict: f.sd,
        pay: 'cod', pickup: ship === 'pickup' ? pickup : null, coupon, email: customer?.email || '', turnstile: tsToken,
      }, getToken());
      // remove only the ordered lines (highest index first so the others keep their positions)
      cart.map((i, k) => (off.has(key(i.id, i.color)) ? -1 : k)).filter(k => k >= 0).reverse().forEach(k => removeLine(k));
      clearCoupon(); setCode('');
      setOrderId(placed.orderNumber);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not place the order. Please try again.', 'alert');
      if (TURNSTILE_SITE_KEY) setTsReset(n => n + 1); // a token is single-use: ask again
    } finally { setBusy(false); }
  };

  return (
    <>
      <Crumb items={[['Shopping Cart', '/cart'], ['Checkout']]} />
      <div className="wrap co3">
        <div className="co3-left">
          {/* Shopping Cart */}
          <section className="co3-card">
            <div className="co3-h tint-violet">
              <h2>Shopping Cart</h2>
              {cart.length > 0 && <label className="co3-all"><input type="checkbox" checked={allOn} onChange={() => setOff(allOn ? new Set(cart.map(i => key(i.id, i.color))) : new Set())} />Select All</label>}
            </div>
            <div className="co3-b">
              {!ready ? null : !cart.length ? (
                <div className="co3-empty"><Icon name="cart" size={40} /><p>Your cart is empty.</p><Link className="btn btn-brand btn-sm" href="/deals">Continue Shopping</Link></div>
              ) : cart.map((i, k) => {
                const kk = key(i.id, i.color), on = !off.has(kk);
                return (
                  <div className={'co3-item' + (on ? '' : ' off')} key={kk}>
                    <input type="checkbox" checked={on} onChange={() => toggle(kk)} aria-label={'Select ' + i.p.name} />
                    <Link className="co3-img" href={productUrl(i.id)}><ProductImg p={i.p} size={74} /></Link>
                    <div className="co3-info">
                      <Link className="co3-name" href={productUrl(i.id)}>{i.p.name}{i.color ? ' - ' + i.color : ''}</Link>
                      <div className="co3-row">
                        <span className="co3-lbl">Price<b>{money(i.unit)}</b></span>
                        <span className="co3-qty">
                          <button type="button" onClick={() => setQty(k, i.qty - 1)} aria-label="Less"><Icon name="minus" size={14} /></button>
                          <span>{i.qty}</span>
                          <button type="button" onClick={() => setQty(k, i.qty + 1)} aria-label="More"><Icon name="plus" size={14} /></button>
                        </span>
                        <span className="co3-lbl r">Total<b className="co3-tot">{money(i.unit * i.qty)}</b></span>
                      </div>
                    </div>
                    <button type="button" className="co3-del" onClick={() => removeLine(k)} aria-label="Remove"><Icon name="trash" size={17} /></button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Delivery Address */}
          <section className="co3-card">
            <div className="co3-h tint-cyan"><h2>Delivery Address</h2><Link className="co3-login" href="/login">Have an account? <b>Login</b></Link></div>
            <button type="button" className={'co3-fold' + (formOpen ? ' open' : '')} onClick={() => setFormOpen(o => !o)}>Address Form<Icon name="down" size={16} /></button>
            {formOpen && (
              <div className="co3-form">
                <div className="field"><label htmlFor="nm">Full Name <span className="req">*</span></label><input id="nm" className={'input' + (bad('nm') ? ' err' : '')} placeholder="Full Name" value={f.nm} onChange={set('nm')} autoComplete="name" /></div>
                <div className="field"><label htmlFor="mb">Phone <span className="req">*</span></label><input id="mb" className={'input' + (bad('mb') ? ' err' : '')} placeholder="Ex:01xxxxxxxxx" inputMode="tel" maxLength={11} value={f.mb} onChange={set('mb')} autoComplete="tel" /></div>
                <div className="field full"><label>Please verify the security check<span className="req">*</span></label>{TURNSTILE_SITE_KEY ? <Turnstile onToken={setTsToken} resetKey={tsReset} /> : <HumanCheck ok={human} onOk={() => setHuman(true)} />}</div>
                <div className="field full"><label htmlFor="ad">Full Address <span className="req">*</span></label><textarea id="ad" className={'textarea' + (bad('ad') ? ' err' : '')} placeholder="House no. / Building / Street" value={f.ad} onChange={set('ad')} /></div>
                <div className="field"><label htmlFor="dv">Division <span className="req">*</span></label>
                  <select id="dv" className={'select' + (bad('dv') ? ' err' : '')} value={f.dv} onChange={e => setF(s => ({ ...s, dv: e.target.value, ds: '', sd: '' }))}>
                    <option value="">Select Division</option>{divisionsOf(dlv.geo ?? GEO).map(d => <option key={d}>{d}</option>)}
                  </select></div>
                <div className="field"><label htmlFor="ds">District <span className="req">*</span></label>
                  <select id="ds" className={'select' + (bad('ds') ? ' err' : '')} value={f.ds} disabled={!f.dv} onChange={e => setF(s => ({ ...s, ds: e.target.value, sd: '' }))}>
                    <option value="">Select District</option>{districtsOf(f.dv, dlv.geo ?? GEO).map(d => <option key={d}>{d}</option>)}
                  </select></div>
                <div className="field full"><label htmlFor="sd">Sub District <span className="req">*</span></label>
                  <select id="sd" className={'select' + (bad('sd') ? ' err' : '')} value={f.sd} disabled={!f.ds} onChange={set('sd')}>
                    <option value="">Select Sub District</option>{subDistrictsOf(f.dv, f.ds, dlv.geo ?? GEO).map(d => <option key={d}>{d}</option>)}
                  </select></div>
                <div className="field full"><label>Address Type</label>
                  <div className="co3-type">
                    <button type="button" className={atype === 'home' ? 'on' : ''} onClick={() => setAtype('home')}><Icon name="home" size={16} />Home</button>
                    <button type="button" className={atype === 'office' ? 'on' : ''} onClick={() => setAtype('office')}><Icon name="office" size={16} />Office</button>
                  </div></div>
              </div>
            )}
          </section>
        </div>

        <aside className="co3-right">
          {/* Payment */}
          <section className="co3-card">
            <div className="co3-h tint-violet"><h3>Select Payment Method</h3></div>
            <div className="co3-b co3-opts">
              {([['cod', 'Cash on Delivery'], ['bkash', 'Bkash'], ['card', 'Card & MFS']] as [Pay, string][]).map(([v, l]) => (
                <label key={v} className={'co3-opt' + (pay === v ? ' on' : '')}>
                  <input type="radio" name="pay" checked={pay === v} onChange={() => setPay(v)} /><span>{l}</span>
                  {v === 'cod' && <span className="co3-cash" aria-hidden="true"><Icon name="cash" size={26} /></span>}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {v === 'bkash' && <img className="co3-bk" src="/img/payments/bkash.webp" alt="bKash" width={147} height={64} />}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {v === 'card' && <img className="co3-ssl" src="/img/payments/sslcommerz.webp" alt="SSLCommerz" width={246} height={48} />}
                </label>
              ))}
            </div>
          </section>

          {/* Delivery method */}
          <section className="co3-card">
            <div className="co3-h tint-violet"><h3>Choose Delivery Method</h3></div>
            <div className="co3-b co3-opts">
              <button type="button" className={'co3-ship' + (ship === 'home' ? ' on' : '')} onClick={() => setShip('home')}>
                <span className="co3-ship-ic"><Icon name="truck" size={20} /></span>Home Delivery
                {ship === 'home' && f.ds && <small>{money(chargeFor(dlv, f.ds))}{chargeOff ? ' · Free over ' + money(dlv.freeFrom) : ''}</small>}
              </button>
              <button type="button" className={'co3-ship' + (ship === 'pickup' ? ' on' : '')} onClick={() => setShip('pickup')}>
                <span className="co3-ship-ic"><Icon name="store" size={20} /></span>Pickup Point
                <span className="co3-free"><Icon name="gift" size={12} />Enjoy Free Delivery</span>
              </button>
              {ship === 'pickup' && (
                <select className="select" aria-label="Pickup point" value={pickup} onChange={e => setPickup(e.target.value)}>
                  {PICKUP_POINTS.map(p => <option key={p}>{p}</option>)}
                </select>
              )}
            </div>
          </section>

          {/* Summary */}
          <section className="co3-card co3-sum">
            <div className="co3-h tint-green"><h3>Checkout Summary</h3></div>
            <div className="co3-b">
              <div className="co3-line"><span>Subtotal{picked.length !== cart.length && <em> ({picked.length} of {cart.length} items)</em>}</span><b>{money(ready ? sub : 0)}</b></div>
              <div className="co3-line"><span>Discount{coupon && disc > 0 ? ' (' + coupon + ')' : ''}</span><b className="neg">- {money(disc)}</b></div>
              <div className="co3-line"><span>Delivery Charge</span><b>{money(charge)}</b></div>
              <div className="co3-line"><span>Delivery Charge Discount</span><b className="neg">- {money(chargeOff)}</b></div>
              <div className="co3-voucher"><input className="input" placeholder="Have a voucher code?" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); apply(); } }} /><button type="button" className="btn" onClick={apply}>Apply</button></div>
              <div className="co3-total"><span>Total Payable</span><b>{money(ready ? total : 0)}</b></div>
              <label className="co3-terms"><input type="checkbox" checked={terms} onChange={e => setTerms(e.target.checked)} /><span><span className="req">*</span> I agree to the <Link href="/policy#terms">terms and conditions</Link></span></label>
              <button type="button" className="co3-confirm" aria-disabled={missing.length > 0} onClick={confirm}>{busy ? 'Placing order…' : 'Confirm Order'}</button>
              {touched && missing.length > 0 && <p className="co3-miss"><Icon name="alert" size={14} />Please complete: {missing.join(', ')}</p>}
            </div>
          </section>
        </aside>
      </div>

      <div className={'modal' + (orderId ? ' open' : '')} role="dialog" aria-modal="true" aria-labelledby="ok-t" onMouseDown={e => { if (e.target === e.currentTarget) setOrderId(null); }}>
        <div className="modal-box"><div className="success">
          <div className="tick"><Icon name="check" size={40} /></div><h3 id="ok-t">Order Placed Successfully!</h3>
          <p className="muted"><b>Confirmation SMS sent!</b><br />Our team will call you shortly to confirm your order.</p>
          <div className="oid">{orderId && 'Order ID: #' + orderId}</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn btn-line" href="/">Continue Shopping</Link>
            <Link className="btn btn-brand" href={orderId ? '/track-order?id=' + orderId + '&phone=' + encodeURIComponent(f.mb.trim()) : '/track-order'}>Track Your Order</Link>
          </div>
        </div></div>
      </div>
    </>
  );
}
