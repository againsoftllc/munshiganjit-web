'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Crumb, Icon, Modal, ProductCard, ProductImg } from '@/components/ui';
import { useStore } from '@/components/store';
import { usePartner } from '@/components/partner';
import { TIER_LABEL } from '@/lib/b2b';
import { products, byId, type Product } from '@/lib/data';
import { money } from '@/lib/format';
import {
  ApiError, accountOrders, changePassword, fetchProfile, getToken, myReturns, patchProfile, requestReturn, returnableOrders,
  type AccountOrder, type Profile, type ReturnRow, type ReturnableOrder,
} from '@/lib/api';

type Status = 'delivered' | 'shipped' | 'processing' | 'pending' | 'cancelled' | 'returned';
/* [order number, date, products, total, status, order id] — built from GET /storefront/account/orders */
type Order = [id: string, date: string, items: Product[], total: number, status: Status, orderId: string];

const ST: Record<Status, string> = { delivered: 'Delivered', shipped: 'Shipped', processing: 'Processing', pending: 'Pending', cancelled: 'Cancelled', returned: 'Returned' };
const F: ('all' | Status)[] = ['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
const RET_STATUS: Record<string, string> = { requested: 'Under review', approved: 'Approved — send it back', received: 'Product received', refunded: 'Refunded', rejected: 'Not accepted' };
const SECTIONS = ['dashboard', 'orders', 'returns', 'reviews', 'wishlist', 'address', 'profile', 'password'];

const statusOf = (s: string): Status => {
  const v = s.toLowerCase();
  if (v === 'completed' || v === 'delivered') return 'delivered';
  if (v === 'shipped' || v === 'fulfilled' || v === 'in_transit' || v === 'out_for_delivery') return 'shipped';
  if (v === 'processing' || v === 'confirmed' || v === 'packed') return 'processing';
  if (v === 'cancelled' || v === 'canceled') return 'cancelled';
  if (v === 'returned' || v === 'refunded') return 'returned';
  return 'pending';
};
const dateText = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
/* "Product A, Product B" label → the storefront products it names (for the thumbnails) */
const itemsOf = (label: string) => products.filter(p => label.includes(p.name));
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || 'U';

function Sec({ id, sec, children }: { id: string; sec: string; children: ReactNode }) {
  return <section className={'acc-sec' + (sec === id ? ' on' : '')} id={'s-' + id}>{children}</section>;
}

export default function AccountClient() {
  const { ready, wish, toast, customer, signOut } = useStore();
  const { me: partner } = usePartner();
  const router = useRouter();
  const [sec, setSec] = useState('dashboard');
  const [filter, setFilter] = useState<'all' | Status>('all');
  const [tab, setTab] = useState<'c' | 'r' | 'q'>('c');
  const [elig, setElig] = useState<ReturnableOrder[] | null>(null);   // delivered orders still inside the return period
  const [retWin, setRetWin] = useState(7);
  const [retOrder, setRetOrder] = useState('');
  const [retQty, setRetQty] = useState<Record<string, number>>({});
  const [myRet, setMyRet] = useState<ReturnRow[] | null>(null);
  const [modal, setModal] = useState<'ret' | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [busy, setBusy] = useState(false);
  const close = useCallback(() => setModal(null), []);

  useEffect(() => {
    const go = () => { const s = location.hash.slice(1); setSec(SECTIONS.includes(s) ? s : 'dashboard'); };
    go(); addEventListener('hashchange', go);
    const onClick = (e: MouseEvent) => { if ((e.target as Element).closest?.('a[href*="#"]')) setTimeout(go, 0); };
    document.addEventListener('click', onClick);
    return () => { removeEventListener('hashchange', go); document.removeEventListener('click', onClick); };
  }, []);

  // the account needs a signed-in customer
  useEffect(() => { if (ready && !customer) router.replace('/login'); }, [ready, customer, router]);

  const load = useCallback(async () => {
    const t = getToken(); if (!t) return;
    try {
      const [o, p, mr] = await Promise.all([accountOrders(t), fetchProfile(t), myReturns(t).catch(() => [] as ReturnRow[])]);
      setMyRet(mr);
      setOrders(o.map((x: AccountOrder): Order => [x.order_number, dateText(x.date), itemsOf(x.product_label), Number(x.total), statusOf(x.status), x.id]));
      setProfile(p);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) { signOut(); router.replace('/login'); return; }
      setOrders([]);
      toast(e instanceof ApiError ? e.message : 'Could not load your account', 'alert');
    }
  }, [router, signOut, toast]);
  useEffect(() => { if (customer) void load(); }, [customer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const list = orders ?? [];
  const count = (s: Status) => list.filter(o => o[4] === s).length;
  const wishCount = ready ? wish.length : '';
  const wl = useMemo(() => wish.map(byId).filter((p): p is Product => !!p), [wish]);
  const name = profile?.name || customer?.name || '';
  const phone = profile?.phone || customer?.phone || '';
  const stats: [icon: string, cls: string, n: number, label: string, href: string][] = [
    ['box', 'c-blue', list.length, 'Total Orders', 'orders'], ['checkCircle', 'c-green', count('delivered'), 'Successful', 'orders'],
    ['truck', 'c-orange', count('pending') + count('processing') + count('shipped'), 'In Progress', 'orders'],
    ['xCircle', 'c-red', count('cancelled'), 'Cancelled', 'returns'], ['returns', 'c-violet', count('returned'), 'Returned', 'returns'],
  ];

  const head = <thead><tr><th>Order ID</th><th>Date</th><th>Products</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>;
  const row = (o: Order) => (
    <tr key={o[0]}>
      <td><b>#{o[0]}</b></td>
      <td className="muted">{o[1]}</td>
      <td><span className="thumbs">{o[2].map(p => <span key={p.id} title={p.name}><ProductImg p={p} size={28} /></span>)}</span></td>
      <td><b>{money(o[3])}</b></td>
      <td><span className={'st st-' + o[4]}>{ST[o[4]]}</span></td>
      <td><Link className="btn btn-soft btn-sm" href={'/track-order?id=' + o[0] + '&phone=' + encodeURIComponent(phone)}>Track</Link></td>
    </tr>
  );
  const empty = (msg: string) => <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 24 }}>{orders === null ? 'Loading…' : msg}</td></tr>;

  const nav: [string, string, string, ReactNode?][] = [
    ['dashboard', 'grid', 'Dashboard'], ['orders', 'box', 'Order History', list.length], ['returns', 'returns', 'Cancel & Return', count('cancelled') + count('returned')],
    ['reviews', 'starO', 'My Reviews'], ['wishlist', 'heart', 'Wishlist', wishCount], ['address', 'pin', 'Address Book'], ['profile', 'user', 'Profile Info'], ['password', 'lock', 'Change Password'],
  ];

  const onProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const t = getToken(); if (!t) return;
    const v = (id: string) => ((e.currentTarget.elements.namedItem(id) as HTMLInputElement | null)?.value || '').trim();
    setBusy(true);
    try { setProfile(await patchProfile(t, { name: v('pf-name'), email: v('pf-email'), city: v('pf-city'), region: v('pf-region'), address: v('pf-address') })); toast('Profile updated'); }
    catch (er) { toast(er instanceof ApiError ? er.message : 'Could not save', 'alert'); } finally { setBusy(false); }
  };
  const onPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const t = getToken(); if (!t) return;
    const el = e.currentTarget.elements, v = (id: string) => (el.namedItem(id) as HTMLInputElement).value;
    if (v('pw-new') !== v('pw-cf')) return toast('The new passwords do not match', 'alert');
    setBusy(true);
    try { await changePassword(t, v('pw-cur'), v('pw-new')); toast('Password changed'); e.currentTarget.reset(); }
    catch (er) { toast(er instanceof ApiError ? er.message : 'Could not change the password', 'alert'); } finally { setBusy(false); }
  };
  const openReturn = async () => {
    setModal('ret'); setElig(null); setRetQty({});
    const t = getToken(); if (!t) return;
    try { const r = await returnableOrders(t); setElig(r.data); setRetWin(r.meta.window_days); setRetOrder(r.data[0]?.id ?? ''); }
    catch (er) { setElig([]); toast(er instanceof ApiError ? er.message : 'Could not load your orders', 'alert'); }
  };
  const onReturn = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const t = getToken(); if (!t) return;
    const el = e.currentTarget.elements, v = (id: string) => (el.namedItem(id) as HTMLInputElement).value;
    const items = Object.entries(retQty).filter(([, q]) => q > 0).map(([item_id, quantity]) => ({ item_id, quantity }));
    if (!items.length) return toast('Tick the product you want to return', 'alert');
    setBusy(true);
    try {
      const r = await requestReturn(t, { order_id: retOrder, reason: v('rt-reason'), details: v('rt-details'), items });
      setModal(null); setTab('q');
      toast('Return request sent' + (r.data[0] ? ' (' + r.data.map(x => x.return_number).join(', ') + ')' : '') + '. We will review it soon.');
      void load();
    } catch (er) { toast(er instanceof ApiError ? er.message : 'Could not submit the request', 'alert'); } finally { setBusy(false); }
  };

  if (!ready || !customer) return <div className="wrap" style={{ minHeight: 360 }} />;

  const addrs = profile?.addresses ?? [];
  const closed = list.filter(o => o[4] === 'cancelled' || o[4] === 'returned');

  return (
    <>
      <Crumb items={[['Account']]} />
      <div className="wrap acc">
        <aside className="acc-side">
          <div className="acc-user"><span className="av">{initials(name)}</span><div><b>{name}</b><span>{phone}</span><div className="tier"><Icon name="award" size={12} />{(profile?.reward_points ?? customer.reward_points).toLocaleString('en-US')} Reward Points</div></div></div>
          <nav className="acc-nav">
            {nav.map(n => (
              <a key={n[0]} href={'#' + n[0]} data-s={n[0]} className={sec === n[0] ? 'on' : undefined}><Icon name={n[1]} size={17} />{n[2]}{n.length > 3 && <em>{n[3]}</em>}</a>
            ))}
            <a href="/login" className="out" onClick={e => { e.preventDefault(); signOut(); router.push('/login'); }}><Icon name="logout" size={17} />Logout</a>
          </nav>
        </aside>

        <div>
          <Sec id="dashboard" sec={sec}>
            <div className="row-between" style={{ marginBottom: 16 }}><div><h1 style={{ fontSize: 22 }}>Hello, {name.split(' ')[0]}!</h1><p className="muted">Here is a summary of your account.</p></div><Link className="btn btn-line btn-sm" href="/track-order"><Icon name="truck" size={15} />Track Your Order</Link></div>
            <div className="stats">
              {stats.map(s => <a key={s[3]} className="stat" href={'#' + s[4]}><span className={'si ' + s[1]}><Icon name={s[0]} size={19} /></span><b>{s[2]}</b><span>{s[3]}</span></a>)}
            </div>
            {partner && (
              <div className={'pp-status ' + partner.status} style={{ marginTop: 18 }}>
                <Icon name={partner.status === 'approved' ? 'checkCircle' : partner.status === 'rejected' ? 'xCircle' : 'clock'} size={18} />
                <span>
                  {partner.status === 'pending' && <><b>{TIER_LABEL[partner.type]} request pending</b> for {partner.business}. Our team will call you within 1 working day. Partner prices unlock after approval.</>}
                  {partner.status === 'approved' && <><b>You are a {TIER_LABEL[partner.type]} customer</b> ({partner.business}). <Link href="/partner/products">See your partner prices →</Link></>}
                  {partner.status === 'rejected' && <><b>{TIER_LABEL[partner.type]} request not approved.</b> Please call us for details.</>}
                </span>
              </div>
            )}
            <div className="box" style={{ marginTop: 18, padding: 0 }}>
              <div className="row-between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-2)' }}><h3 style={{ fontSize: 16 }}>Recent Orders</h3><a href="#orders" className="sm"><b>View all</b></a></div>
              <div className="table-wrap"><table className="table">{head}<tbody>{list.length ? list.slice(0, 4).map(row) : empty('You have not placed any orders yet.')}</tbody></table></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, marginTop: 18 }}>
              <div className="box"><h3>Default Address</h3>
                {addrs.length
                  ? <p className="muted" style={{ lineHeight: 1.7, marginTop: 8 }}><b style={{ color: 'var(--ink)' }}>{name}</b> · {phone}<br />{[addrs[0].line1, addrs[0].city, addrs[0].region].filter(Boolean).join(', ')}</p>
                  : <p className="muted" style={{ marginTop: 8 }}>No address saved yet. It is saved when you place an order.</p>}
                <a href="#address" className="link-more" style={{ marginTop: 8 }}>Manage addresses</a></div>
              <div className="box"><h3>Wishlist</h3><p className="muted" style={{ marginTop: 8 }}><b style={{ color: 'var(--ink)' }}>{wishCount}</b> saved products.</p><a href="#wishlist" className="link-more" style={{ marginTop: 8 }}>View wishlist</a></div>
            </div>
          </Sec>

          <Sec id="orders" sec={sec}>
            <div className="box" style={{ padding: 0 }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line-2)' }}>
                <h3 style={{ fontSize: 16, marginBottom: 12 }}>Order History</h3>
                <div className="brand-pills" style={{ margin: 0 }}>
                  {F.map(f => (
                    <button key={f} className={'pill' + (filter === f ? ' on' : '')} onClick={() => setFilter(f)}>
                      {f === 'all' ? 'All' : ST[f]} <em>({f === 'all' ? list.length : count(f)})</em>
                    </button>
                  ))}
                </div>
              </div>
              <div className="table-wrap"><table className="table">{head}<tbody>{(() => { const rows = list.filter(o => filter === 'all' || o[4] === filter); return rows.length ? rows.map(row) : empty('No orders here.'); })()}</tbody></table></div>
            </div>
          </Sec>

          <Sec id="returns" sec={sec}>
            <div className="stats" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: 16 }}>
              <div className="stat"><span className="si c-red"><Icon name="xCircle" size={19} /></span><b>{count('cancelled')}</b><span>Cancelled Orders</span></div>
              <div className="stat"><span className="si c-violet"><Icon name="returns" size={19} /></span><b>{count('returned')}</b><span>Returned Orders</span></div>
            </div>
            <div className="box" style={{ padding: 0 }} data-tabs>
              <div className="tabs-nav" style={{ padding: '14px 20px', borderBottom: '1px solid var(--line-2)' }}>
                <button className={tab === 'c' ? 'on' : ''} data-tab="c" onClick={() => setTab('c')}>Cancelled</button>
                <button className={tab === 'r' ? 'on' : ''} data-tab="r" onClick={() => setTab('r')}>Returned</button>
                <button className={tab === 'q' ? 'on' : ''} data-tab="q" onClick={() => setTab('q')}>My Return Requests{myRet && myRet.length ? ' (' + myRet.length + ')' : ''}</button>
              </div>
              {(['c', 'r'] as const).map(k => (
                <div key={k} className={tab === k ? 'on' : ''} data-pane={k}><div className="table-wrap"><table className="table">
                  <thead><tr><th>Order</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
                  <tbody>{(() => { const rows = closed.filter(o => o[4] === (k === 'c' ? 'cancelled' : 'returned')); return rows.length
                    ? rows.map(o => <tr key={o[0]}><td><b>#{o[0]}</b></td><td className="muted">{o[1]}</td><td>{money(o[3])}</td><td><span className={'st st-' + o[4]}>{ST[o[4]]}</span></td></tr>)
                    : <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 24 }}>{orders === null ? 'Loading…' : 'Nothing here.'}</td></tr>; })()}</tbody>
                </table></div></div>
              ))}
              <div className={tab === 'q' ? 'on' : ''} data-pane="q"><div className="table-wrap"><table className="table">
                <thead><tr><th>Request</th><th>Order</th><th>Product</th><th>Qty</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>{myRet && myRet.length
                  ? myRet.map(q => <tr key={q.id}><td><b>{q.refund_number}</b></td><td>#{q.order_number}</td><td>{q.product_name}</td><td>{q.quantity}</td><td className="muted">{dateText(q.date)}</td><td><span className={'st st-' + (q.status === 'rejected' ? 'cancelled' : q.status === 'requested' ? 'pending' : q.status === 'approved' || q.status === 'received' ? 'processing' : 'delivered')}>{RET_STATUS[q.status] ?? q.status}</span></td></tr>)
                  : <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 24 }}>{myRet === null ? 'Loading…' : 'You have not asked to return anything.'}</td></tr>}</tbody>
              </table></div></div>
              <div className="row-between" style={{ padding: '16px 20px', borderTop: '1px solid var(--line-2)' }}><span className="muted sm">A delivered product can be returned within 7 days of delivery (defective, wrong or damaged item).</span><button className="btn btn-brand btn-sm" onClick={() => void openReturn()} disabled={!list.length}>Request a Return</button></div>
            </div>
          </Sec>

          <Sec id="reviews" sec={sec}>
            <div className="box"><h3>My Reviews</h3>
              <p className="muted" style={{ marginTop: 10 }}>You have not reviewed any products yet. After your order is delivered you can review it from the product page.</p>
            </div>
          </Sec>

          <Sec id="wishlist" sec={sec}>
            <div className="row-between" style={{ marginBottom: 14 }}><h2 style={{ fontSize: 20 }}>My Wishlist</h2><Link className="btn btn-line btn-sm" href="/wishlist">Open Wishlist Page</Link></div>
            <div className="grid g4">
              {!ready ? null : wl.length ? wl.map(p => <ProductCard key={p.id} p={p} />) : <p className="muted">No saved products yet.</p>}
            </div>
          </Sec>

          <Sec id="address" sec={sec}>
            <h2 style={{ fontSize: 20, marginBottom: 14 }}>Address Book</h2>
            <div className="addr-grid">
              {addrs.length ? addrs.map((a, i) => (
                <div key={i} className={'addr' + (i === 0 ? ' def' : '')}><h5><Icon name="home" size={16} />{a.label || 'Address'}{i === 0 && <> <span className="tag">Default</span></>}</h5>
                  <p>{name} · {phone}<br />{[a.line1, a.city, a.region].filter(Boolean).join(', ')}</p></div>
              )) : <p className="muted">No address saved yet. Your delivery address is saved here when you place an order. You can also edit it under Profile Info.</p>}
            </div>
          </Sec>

          <Sec id="profile" sec={sec}>
            <div className="box"><h3>Profile Information</h3>
              <form className="form-grid" style={{ marginTop: 14 }} onSubmit={onProfile} key={profile?.id || 'p'}>
                <div className="field"><label htmlFor="pf-name">Full Name</label><input className="input" id="pf-name" defaultValue={name} required /></div>
                <div className="field"><label htmlFor="pf-phone">Phone</label><input className="input" id="pf-phone" value={phone} disabled readOnly style={{ background: 'var(--bg)' }} /></div>
                <div className="field"><label htmlFor="pf-email">E-Mail</label><input className="input" id="pf-email" type="email" defaultValue={profile?.email || ''} /></div>
                <div className="field"><label htmlFor="pf-city">City</label><input className="input" id="pf-city" defaultValue={profile?.city || ''} /></div>
                <div className="field"><label htmlFor="pf-region">Division</label><input className="input" id="pf-region" defaultValue={profile?.region || ''} /></div>
                <div className="field full"><label htmlFor="pf-address">Address</label><input className="input" id="pf-address" defaultValue={profile?.address || ''} /></div>
                <div className="full"><button className="btn btn-brand" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save Changes'}</button></div>
              </form>
            </div>
          </Sec>

          <Sec id="password" sec={sec}>
            <div className="box" style={{ maxWidth: 520 }}><h3>Change Password</h3>
              <form style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 14 }} onSubmit={onPassword}>
                <div className="field"><label htmlFor="pw-cur">Current Password</label><input className="input" id="pw-cur" type="password" required /></div>
                <div className="field"><label htmlFor="pw-new">New Password</label><input className="input" id="pw-new" type="password" required minLength={8} /></div>
                <div className="field"><label htmlFor="pw-cf">Confirm Password</label><input className="input" id="pw-cf" type="password" required minLength={8} /></div>
                <button className="btn btn-brand" type="submit" style={{ alignSelf: 'flex-start' }} disabled={busy}>{busy ? 'Updating…' : 'Update Password'}</button>
              </form>
            </div>
          </Sec>
        </div>
      </div>

      <Modal open={modal === 'ret'} onClose={close} title="Request a Return">
        <form className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }} onSubmit={onReturn}>
          {elig === null ? <p className="muted">Loading your delivered orders…</p> : !elig.length ? (
            <p className="muted">Nothing can be returned right now. A product can be returned within {retWin} days after it is delivered, and only if it has not already been sent back.</p>
          ) : (<>
            <div className="field"><label htmlFor="rt-order">Order</label>
              <select className="select" id="rt-order" value={retOrder} onChange={e => { setRetOrder(e.target.value); setRetQty({}); }}>
                {elig.map(o => <option key={o.id} value={o.id}>#{o.order_number} · delivered {dateText(o.delivered_on)} · {o.days_left} day{o.days_left === 1 ? '' : 's'} left</option>)}
              </select></div>
            <div className="field"><label>Products to return</label>
              {(elig.find(o => o.id === retOrder)?.items ?? []).map(it => (
                <div key={it.item_id} className="row-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--line-2)', gap: 10 }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'center', flex: 1, margin: 0 }}>
                    <input type="checkbox" checked={(retQty[it.item_id] ?? 0) > 0} onChange={e => setRetQty(q => ({ ...q, [it.item_id]: e.target.checked ? 1 : 0 }))} />
                    <span>{it.name}{it.variant_label ? ' — ' + it.variant_label : ''}</span>
                  </label>
                  {(retQty[it.item_id] ?? 0) > 0 && it.returnable > 1 && (
                    <select className="select" style={{ width: 76 }} value={retQty[it.item_id]} onChange={e => setRetQty(q => ({ ...q, [it.item_id]: Number(e.target.value) }))} aria-label="Quantity">
                      {Array.from({ length: it.returnable }, (_, n) => n + 1).map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
            <div className="field"><label htmlFor="rt-reason">Reason</label>
              <select className="select" id="rt-reason" defaultValue="defective"><option value="defective">Defective product</option><option value="wrong_item">Wrong product delivered</option><option value="damaged">Damaged in delivery</option><option value="other">Other</option></select></div>
            <div className="field"><label htmlFor="rt-details">Tell us what is wrong</label><textarea className="textarea" id="rt-details" required minLength={5} placeholder="e.g. The power bank does not charge any phone." /></div>
            <button className="btn btn-brand btn-block" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Send return request'}</button>
          </>)}
        </form>
      </Modal>
    </>
  );
}
