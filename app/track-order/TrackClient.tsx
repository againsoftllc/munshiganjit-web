'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { Crumb, Icon } from '@/components/ui';
import { ApiError, trackOrder, type TrackResult } from '@/lib/api';
import { money } from '@/lib/format';
import { useStore } from '@/components/store';

const STEP_ICON = ['invoice', 'box', 'truck', 'truck', 'home'];
const STATUS_LABEL: Record<string, string> = { pending: 'Order Placed', processing: 'Processing', shipped: 'Shipped', delivered: 'Delivered', completed: 'Delivered', cancelled: 'Cancelled', returned: 'Returned' };

/* Live order status from the AgainERP API (POST /storefront/orders/track). */
export default function TrackClient({ id, phone }: { id: string; phone: string }) {
  const router = useRouter();
  const { customer } = useStore();
  const [tid, setTid] = useState(id);
  const [ph, setPh] = useState(phone);
  const [res, setRes] = useState<TrackResult | null>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!ph && customer?.phone) setPh(customer.phone); }, [customer]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!id || !phone) return;
    let live = true;
    setLoading(true); setErr(''); setRes(null);
    trackOrder(id, phone)
      .then(r => { if (live) setRes(r); })
      .catch(e => { if (live) setErr(e instanceof ApiError ? e.message : 'Could not load the order. Please try again.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [id, phone]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    router.push('/track-order?id=' + encodeURIComponent(tid.trim().replace(/^#/, '').toUpperCase()) + '&phone=' + encodeURIComponent(ph.trim()));
  };

  const stage = res ? Math.max(0, res.steps.indexOf(res.current_step)) : 0;
  const delivered = !!res && stage >= res.steps.length - 1;
  // the API sends a UTC timestamp without a zone suffix
  const placed = res
    ? new Date(res.placed_at.endsWith('Z') ? res.placed_at : res.placed_at + 'Z').toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <>
      <Crumb items={[['Track Your Order']]} />
      <div className="wrap">
        <section className="trk-search">
          <h1>Track Your Order</h1>
          <p>Enter your Order ID and phone number to see live delivery status</p>
          <form className="trk-form" onSubmit={submit}>
            <div className="ig"><Icon name="box" size={17} /><input className="input" placeholder="Order ID (e.g. ORD-XXXXXXXX)" required value={tid} onChange={e => setTid(e.target.value)} /></div>
            <div className="ig"><Icon name="phone" size={17} /><input className="input" placeholder="Phone number" required value={ph} onChange={e => setPh(e.target.value)} inputMode="tel" /></div>
            <button className="btn btn-brand" type="submit"><Icon name="search" size={17} />Track</button>
          </form>
        </section>

        {loading && <p className="muted" style={{ textAlign: 'center', padding: 30 }}>Loading your order…</p>}
        {err && <p className="muted" style={{ textAlign: 'center', padding: 30 }}><Icon name="alert" size={16} /> {err}</p>}

        {res && (
          <section className="box trk-card" style={{ padding: 0 }}>
            <div className="trk-top">
              <div><span className="muted sm">Order ID</span><div className="oid">#{res.order_number}</div><span className="muted sm">Placed: {placed} · {res.payment_method}</span></div>
              <span className={'st ' + (delivered ? 'st-delivered' : stage > 0 ? 'st-shipped' : 'st-placed')}><Icon name={delivered ? 'check' : stage > 0 ? 'truck' : 'invoice'} size={14} />{STATUS_LABEL[res.status] || res.current_step}</span>
              <div className="eta"><span className="muted sm">Total</span><b>{money(Number(res.grand_total))}</b></div>
            </div>
            <div className="stepper" style={{ ['--steps' as string]: res.steps.length }}>
              {res.steps.map((s, i) => {
                const done = i < stage || delivered;
                return (
                  <div key={s} className={'stp ' + (done ? 'done' : i === stage ? 'on' : '')}>
                    <span className="dot"><Icon name={done ? 'check' : STEP_ICON[i] || 'box'} size={20} /></span>
                    <div><b>{s}</b></div>
                  </div>
                );
              })}
            </div>
            <div className="trk-body">
              <div><h3 style={{ fontSize: 16, marginBottom: 16 }}>Order Activity</h3>
                <div className="tl">
                  {[...res.updates].reverse().map((u, i) => (
                    <div key={i} className={'tl-i ' + (i === 0 ? 'on' : 'done')}>
                      <div className="t"><b>{u.time.split(' ').slice(0, 2).join(' ')}</b>{u.time.split(' ').slice(2).join(' ')}</div><span className="d" />
                      <div className="e"><b>{u.text}</b></div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 style={{ fontSize: 16, marginBottom: 12 }}>Delivery Partner</h3>
                <p className="muted" style={{ padding: 14, borderRadius: 10, background: 'var(--bg)', marginBottom: 16 }}>
                  {res.courier ? <>{res.courier}{res.tracking_url && <> · <a href={res.tracking_url} target="_blank" rel="noreferrer">Courier tracking</a></>}</> : 'A rider will be assigned once your order is shipped.'}
                </p>
                <h3 style={{ fontSize: 16, marginBottom: 10 }}>Delivery Address</h3>
                <p className="muted" style={{ lineHeight: 1.7, marginBottom: 16 }}><b style={{ color: 'var(--ink)' }}>{res.customer_name}</b> · {res.customer_phone}<br />{res.shipping_address}</p>
                <h3 style={{ fontSize: 16, marginBottom: 6 }}>Payment</h3>
                <div className="po-row"><span>{res.payment_method}</span><b style={{ textTransform: 'capitalize' }}>{res.payment_status.replace(/_/g, ' ')}</b></div>
                <div className="po-row"><span><b>Total</b></span><b>{money(Number(res.grand_total))}</b></div>
              </div>
            </div>
          </section>
        )}
      </div>
    </>
  );
}
