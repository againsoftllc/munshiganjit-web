'use client';
/* Floating layer: Gadget Peaky compare/cart rail · cart drawer · mobile menu ·
   recently-bought popup · live chat · back-to-top · bottom nav · toasts */
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { byId, categories } from '@/lib/data';
import { API } from '@/lib/api';
import { useHomeCfg } from './live-edit/EmbedLiveEdit';
import { activeMenu, menuCategory, menuLink, menuSubs, type MenuItem } from '@/lib/menu';
import { money, catUrl, productUrl } from '@/lib/format';
import { Icon, ProductImg } from './ui';
import { useStore } from './store';
import { LangSwitch } from './Header';
import dynamic from 'next/dynamic';

// the chat is loaded after the page is interactive (its own script chunk), not with the first paint
const LiveChat = dynamic(() => import('./LiveChat'), { ssr: false });

/** true once the browser is idle (or after `max` ms): used to mount widgets that are not needed for the first screen */
function useIdle(max = 2500): boolean {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) { const id = w.requestIdleCallback(() => setIdle(true), { timeout: max }); return () => w.cancelIdleCallback?.(id); }
    const t = setTimeout(() => setIdle(true), 1200); return () => clearTimeout(t);
  }, [max]);
  return idle;
}
import { fixedImg } from '@/lib/img';

function CartDrawer() {
  const { drawer, closeDrawer, cart, cartCount, cartTotal, setQty, removeLine, toast, lastAdded, coupon, applyCoupon, clearCoupon, discount, couponNote } = useStore();
  const [promo, setPromo] = useState('');
  const dscnt = coupon ? discount(cartTotal) : 0;
  const k0 = lastAdded ? cart.findIndex(i => i.id === lastAdded.id && i.color === lastAdded.color) : -1;
  const hit = k0 >= 0 ? cart[k0] : null;
  const buy = lastAdded?.mode === 'buy';
  return (
    <aside className={'drawer right cart-dr' + (drawer === 'cart' ? ' open' : '')} aria-label="Cart">
      <div className="dr-head cart-h"><h3><Icon name="cart" size={20} />Your Cart <em>{cartCount}</em></h3><button onClick={closeDrawer} aria-label="Close"><Icon name="close" size={20} /></button></div>
      <div className="dr-body">
        {/* "Added to cart" panel — the product the customer just picked (client point 12) */}
        {hit && (
          <div className="dr-added" key={lastAdded!.n}>
            <div className="dr-added-h"><span className="dr-tick"><Icon name="check" size={14} /></span>{buy ? 'Added — ready to checkout' : 'Added to cart'}</div>
            <div className="dr-added-in">
              <Link prefetch={false} className="dr-added-img" href={productUrl(hit.id)} onClick={closeDrawer}><ProductImg p={hit.p} size={78} /></Link>
              <div className="dr-added-info">
                <Link prefetch={false} href={productUrl(hit.id)} onClick={closeDrawer}>{hit.p.name}</Link>
                {hit.color && <span className="sm muted">{hit.vid ? 'Option' : 'Color'}: {hit.color}</span>}
                <div className="dr-added-row">
                  <b>{money(hit.unit)}</b>
                  <span className="qty sm"><button onClick={() => setQty(k0, hit.qty - 1)} aria-label="Less"><Icon name="minus" size={13} /></button><span>{hit.qty}</span><button onClick={() => setQty(k0, hit.qty + 1)} aria-label="More"><Icon name="plus" size={13} /></button></span>
                </div>
              </div>
            </div>
          </div>
        )}
        {cart.length === 0 && <div className="dr-empty"><Icon name="cart" size={44} /><p>Your cart is empty</p><Link prefetch={false} className="btn btn-brand btn-sm" href="/deals" onClick={closeDrawer}>Continue Shopping</Link></div>}
        {cart.length > 0 && hit && <div className="dr-sub-h"><span className="dr-sub-ic"><Icon name="list" size={13} /></span>Items in Your Cart</div>}
        {cart.map((i, k) => (
          <div className={'dr-item' + (k === k0 ? ' hit' : '')} key={i.id + i.color}>
            <Link prefetch={false} className="dr-img" href={productUrl(i.id)} onClick={closeDrawer}><ProductImg p={i.p} size={50} /></Link>
            <div className="dr-info">
              <Link prefetch={false} href={productUrl(i.id)} onClick={closeDrawer}>{i.p.name}</Link>
              {i.color && <span className="sm muted">{i.vid ? 'Option' : 'Color'}: {i.color}</span>}
              {i.b2b && <span className="b2b-tag"><Icon name="briefcase" size={11} />Partner price · {i.warranty === false ? 'No Warranty' : 'With Warranty'}</span>}
              {i.partnerNote && <div className="b2b-warn" role="alert"><Icon name="alert" size={12} />{i.partnerNote}</div>}
              <div className="dr-price">
                <span><b>{money(i.unit)}</b> × {i.qty} = <b>{money(i.unit * i.qty)}</b></span>
                <span className="qty sm"><button onClick={() => setQty(k, i.qty - 1)} aria-label="Less"><Icon name="minus" size={13} /></button><span>{i.qty}</span><button onClick={() => setQty(k, i.qty + 1)} aria-label="More"><Icon name="plus" size={13} /></button></span>
              </div>
            </div>
            <button className="dr-rm" onClick={() => removeLine(k)} aria-label="Remove"><Icon name="trash" size={16} /></button>
          </div>
        ))}
      </div>
      <div className="dr-foot">
        <form className="dr-promo" onSubmit={async e => { e.preventDefault(); const c = promo.trim().toUpperCase(); if (!c) return; const res = await applyCoupon(c); if (res.ok) { toast('Coupon applied', 'tag'); setPromo(''); } else toast(res.message || 'Invalid or expired code', 'alert'); }}><input className="input" placeholder="Promo Code" aria-label="Promo code" value={promo} onChange={e => setPromo(e.target.value)} style={{ textTransform: 'uppercase' }} /><button className="btn btn-brand" type="submit">Apply</button></form>
        <div className="dr-row sub"><span>Sub-Total</span><b>{money(cartTotal)}</b></div>
        {coupon && dscnt > 0 && <div className="dr-row"><span>Discount ({coupon}) <a href="#" onClick={e => { e.preventDefault(); clearCoupon(); }}>Remove</a></span><b style={{ color: 'var(--green)' }}>−{money(dscnt)}</b></div>}
        {coupon && couponNote && <p className="sm" style={{ color: 'var(--red, #dc2626)', margin: '4px 0' }}>{coupon} is not applied: {couponNote}</p>}
        <div className="dr-row total"><span>Total</span><b>{money(cartTotal - dscnt)}</b></div>
        <div className="dr-btns">
          <Link prefetch={false} className="dr-viewcart" href="/cart" onClick={closeDrawer}><Icon name="cart" size={16} />View Cart</Link>
          <Link prefetch={false} className={'dr-checkout' + (buy ? ' hl' : '')} href="/checkout" onClick={closeDrawer}>Checkout <Icon name="arrow" size={16} /></Link>
        </div>
      </div>
    </aside>
  );
}

/** the sub-categories of a menu category as a tree: second level (Router) and third level (TP-Link under Router) */
type SubNode = { key: string; label: string; count: number; href: string; kids: SubNode[] };
const subNodes = (slug: string, subs: (typeof categories)[number]['subs']): SubNode[] =>
  subs.map(s => ({
    key: catUrl(slug, { sub: s[0] }), label: s[0], count: s[1], href: catUrl(slug, { sub: s[0] }),
    kids: (s[3] || []).map(k => ({ key: catUrl(slug, { sub: s[0], sub2: k[0] }), label: k[0], count: k[1], href: catUrl(slug, { sub: s[0], sub2: k[0] }), kids: [] })),
  }));

/** Phone menu, like excellent-web: at every level the first tap on a name that has sub-categories opens them (one open per level), a second
 *  tap goes to that page, and the arrow only opens / closes. */
function SubTree({ nodes, depth, open, setOpen, go }: { nodes: SubNode[]; depth: number; open: string[]; setOpen: (p: string[]) => void; go: () => void }) {
  return (
    <>
      {nodes.map(n => {
        const expandable = n.kids.length > 0;
        const isOpen = open[depth] === n.key;
        const toggle = () => setOpen(isOpen ? open.slice(0, depth) : [...open.slice(0, depth), n.key]);
        return (
          <div className={'nav-sub' + (isOpen ? ' open' : '')} key={n.key}>
            <div className="nav-sub-row">
              <Link prefetch={false} className="nav-sub-link" href={n.href} aria-expanded={expandable ? isOpen : undefined}
                onClick={e => { if (expandable && !isOpen) { e.preventDefault(); toggle(); } else go(); }}>{n.label}<em>({n.count})</em></Link>
              {expandable && <button type="button" className="nav-sub-chev" onClick={toggle} aria-label={(isOpen ? 'Close ' : 'Open ') + n.label} aria-expanded={isOpen}><Icon name="down" size={13} className="chev" /></button>}
            </div>
            {expandable && isOpen && <div className="nav-sub-kids"><SubTree nodes={n.kids} depth={depth + 1} open={open} setOpen={setOpen} go={go} /></div>}
          </div>
        );
      })}
    </>
  );
}

function NavDrawer() {
  const { drawer, closeDrawer } = useStore();
  const [openCat, setOpenCat] = useState<string | null>(null);
  /** the open sub-category at each level below the category (the key of each) */
  const [openSub, setOpenSub] = useState<string[]>([]);
  // whatever way the visitor went to another page (a link, the back button), the menu shuts and folds back, like excellent-web
  const path = usePathname();
  const lastPath = useRef(path);
  useEffect(() => {
    if (path === lastPath.current) return;
    lastPath.current = path;
    closeDrawer();
    setOpenCat(null);
    setOpenSub([]);
  }, [path, closeDrawer]);
  // the menu made in Live Edit (empty = every category, as before): a category keeps its sub-types, any other item is a plain link
  const menu = activeMenu();
  const entries = menu.length ? menu.map(it => ({ it, c: menuCategory(it) })) : categories.map(c => ({ it: null as MenuItem | null, c: c as (typeof categories)[number] | null }));
  return (
    <aside className={'drawer left' + (drawer === 'nav' ? ' open' : '')} aria-label="Menu">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div className="dr-head"><img {...fixedImg('/img/mit-logo.png', 145)} alt="Munshiganj IT" width={145} height={32} style={{ height: 32, width: 'auto' }} /><button onClick={closeDrawer} aria-label="Close"><Icon name="close" size={20} /></button></div>
      <div className="dr-body">
        {entries.map(({ it, c }) => {
          if (!c) return it ? (
            <div className="nav-extra" key={it.id} onClick={closeDrawer}><Link prefetch={false} href={menuLink(it)}><Icon name="tag" size={16} />{it.label}</Link></div>
          ) : null;
          const label = it?.label || c.name;
          const subs = it ? menuSubs(c, it) : c.subs;
          const href = it ? menuLink(it) : catUrl(c.slug);
          const open = openCat === c.slug;
          const toggle = () => { setOpenCat(open ? null : c.slug); setOpenSub([]); };
          // no sub-types: the name is just a link. With sub-types: the first tap opens them, a second tap on the name goes to the
          // category, and the arrow only opens / closes the list.
          if (!subs.length) return (
            <div className="nav-cat" key={c.slug}>
              <div className="nav-cat-row"><Link prefetch={false} className="nav-cat-h" href={href} onClick={closeDrawer}><Icon name={c.icon} size={18} /><span>{label} <em>({c.count})</em></span></Link></div>
            </div>
          );
          return (
            <div className={'nav-cat' + (open ? ' open' : '')} key={c.slug}>
              <div className="nav-cat-row">
                {open
                  ? <Link prefetch={false} className="nav-cat-h" href={href} onClick={closeDrawer}><Icon name={c.icon} size={18} /><span>{label} <em>({c.count})</em></span></Link>
                  : <button className="nav-cat-h" onClick={toggle}><Icon name={c.icon} size={18} /><span>{label} <em>({c.count})</em></span></button>}
                <button className="nav-chev" onClick={toggle} aria-label={(open ? 'Close ' : 'Open ') + label} aria-expanded={open}><Icon name="down" size={14} className="chev" /></button>
              </div>
              <div className="nav-subs">
                <SubTree nodes={subNodes(c.slug, subs)} depth={0} open={openSub} setOpen={setOpenSub} go={closeDrawer} />
                <Link prefetch={false} className="nav-all" href={href} onClick={closeDrawer}>View All {label} <em>({c.count})</em></Link>
              </div>
            </div>
          );
        })}
        <div className="nav-extra" onClick={closeDrawer}>
          <Link prefetch={false} href="/offers"><Icon name="tag" size={16} />Offers</Link><Link prefetch={false} href="/my-gadget-setup"><Icon name="setup" size={16} />My Gadget Setup</Link>
          <Link prefetch={false} href="/compare"><Icon name="compare" size={16} />Compare</Link><Link prefetch={false} href="/wishlist"><Icon name="heart" size={16} />Wishlist</Link>
          <Link prefetch={false} href="/blog"><Icon name="invoice" size={16} />Blog</Link><Link prefetch={false} href="/contact"><Icon name="phone" size={16} />Contact</Link>
          <Link prefetch={false} href="/track-order"><Icon name="truck" size={16} />Track Your Order</Link><Link prefetch={false} href="/help-support"><Icon name="help" size={16} />Help &amp; Support</Link>
        </div>
        <div style={{ padding: '4px 18px 18px' }}><LangSwitch /></div>
      </div>
    </aside>
  );
}

/** a product page: /<product-slug> (or the older /product/<slug>) */
const isProductPath = (path: string) => /^\/product\//.test(path) || (/^\/[^/]+\/?$/.test(path) && !!byId(decodeURIComponent(path.replace(/^\/|\/$/g, ''))));

/* "Just purchased": real recent orders (first name + city + product), read from the API; the admin's Live Edit decides whether,
   how often and on which pages it shows. Nothing is invented: with fewer recent orders than the minimum it stays away. */
interface Bought { name: string; area: string; slug: string; at: string }
const ago = (iso: string) => {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
  const h = Math.round(m / 60);
  if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : d + ' days ago';
};
function RecentlyBought() {
  const path = usePathname();
  const cfg = useHomeCfg().proof;
  const [list, setList] = useState<Bought[]>([]);
  const [i, setI] = useState(-1);
  const [show, setShow] = useState(false);
  const [stopped, setStopped] = useState(false);
  const onPage = cfg.pages === 'all' ? !['/checkout', '/login', '/register'].includes(path) : cfg.pages === 'product' ? isProductPath(path) : path === '/' || isProductPath(path);
  const active = cfg.enabled && onPage && !stopped;
  useEffect(() => {
    if (!cfg.enabled || !API) return;
    let live = true;
    fetch(API + '/api/v1/storefront/munshiganjit/recent-orders?limit=15')
      .then(r => (r.ok ? r.json() : null))
      .then(j => { if (live && Array.isArray(j?.data?.items)) setList((j.data.items as Bought[]).filter(x => byId(x.slug))); })
      .catch(() => {});
    return () => { live = false; };
  }, [cfg.enabled]);
  const enough = list.length >= cfg.minOrders;
  useEffect(() => {
    if (!active || !enough) return;
    let hide: ReturnType<typeof setTimeout>;
    const next = () => { setI(x => x + 1); setShow(true); hide = setTimeout(() => setShow(false), cfg.showSec * 1000); };
    const first = setTimeout(next, 8000), loop = setInterval(next, cfg.everySec * 1000);
    return () => { clearTimeout(first); clearInterval(loop); clearTimeout(hide); };
  }, [active, enough, cfg.everySec, cfg.showSec]);
  if (!active || !enough || i < 0) return <div className="rb-pop" />;
  const r = list[i % list.length], p = byId(r.slug)!;
  return (
    <div className={'rb-pop' + (show ? ' show' : '')} role="status" aria-live="polite" style={{ ['--rb-dur' as string]: cfg.showSec + 's' }}>
      <div className="rb-in">
        <Link prefetch={false} className="rb-img" href={productUrl(p.id)}><ProductImg p={p} size={140} eager /><span className="rb-live" aria-hidden="true" /></Link>
        <div className="rb-txt"><span className="rb-tag"><Icon name="bolt" size={11} />Just Purchased</span><span className="rb-who"><b>{r.name}</b> from <b>{r.area}</b></span>
          <Link prefetch={false} className="rb-p" href={productUrl(p.id)}>{p.name}</Link>
          {p.model && <span className="rb-m">Model: {p.model}</span>}
          <span className="rb-t"><span className="rb-dot" aria-hidden="true" />{ago(r.at)}{!cfg.hideVerified && <em><Icon name="checkCircle" size={12} />Verified</em>}</span>
        </div>
      </div>
      <button className="rb-x" aria-label="Close" onClick={() => setStopped(true)}><Icon name="close" size={14} /></button>
      <div className="rb-bar"><i /></div>
    </div>
  );
}

export default function Floating() {
  const [bld, setBld] = useState(false); // mobile bottom bar: Builder sheet
  const { compare, cartCount, openDrawer, closeDrawer, drawer, toasts, bump, ready } = useStore();
  const path = usePathname();
  const [top, setTop] = useState(false);
  const [bumping, setBumping] = useState(false);
  const idle = useIdle();
  useEffect(() => { const on = () => setTop(scrollY > 700); addEventListener('scroll', on, { passive: true }); return () => removeEventListener('scroll', on); }, []);
  useEffect(() => { if (!bump) return; setBumping(true); const t = setTimeout(() => setBumping(false), 500); return () => clearTimeout(t); }, [bump]);
  useEffect(() => { closeDrawer(); }, [path]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <div className="float-rail">
        <Link prefetch={false} className="fr-btn" href="/compare"><Icon name="compare" size={20} />COMPARE{ready && compare.length > 0 && <span className="badge">{compare.length}</span>}</Link>
        <button className={'fr-btn cart' + (bumping ? ' bump' : '')} onClick={() => openDrawer('cart')}><Icon name="cart" size={21} />CART{ready && cartCount > 0 && <span className="badge">{cartCount}</span>}</button>
      </div>
      <div className="overlay" onClick={closeDrawer} style={drawer === 'filters' ? { zIndex: 89 } : undefined} />
      <CartDrawer />
      <NavDrawer />
      {idle && <RecentlyBought />}
      <button className={'to-top' + (top ? ' show' : '')} aria-label="Back to top" onClick={() => scrollTo({ top: 0, behavior: 'smooth' })}><Icon name="up" size={18} /></button>
      {idle && <LiveChat />}
      <nav className="bnav" aria-label="Quick links">
        <Link prefetch={false} href="/happy-hour" className={path === '/happy-hour' ? 'on' : ''} onClick={() => setBld(false)}><span className="bn-ic"><Icon name="bolt" size={20} /></span><em>Happy Hour</em></Link>
        <Link prefetch={false} href="/offers" className={path === '/offers' ? 'on' : ''} onClick={() => setBld(false)}><span className="bn-ic"><Icon name="tag" size={20} /></span><em>Offers</em></Link>
        <div className={'bn-mid' + (bld ? ' open' : '')}>
          <div className="bn-sheet" role="menu" aria-hidden={!bld}>
            <Link prefetch={false} href="/pc-builder" role="menuitem" onClick={() => setBld(false)}><Icon name="desktop" size={18} />PC Builder</Link>
            <Link prefetch={false} href="/search?q=CCTV%20Camera" role="menuitem" onClick={() => setBld(false)}><Icon name="chip" size={18} />CC Builder</Link>
          </div>
          <button type="button" className="bn-fab" aria-label="Builder" aria-expanded={bld} onClick={() => setBld(o => !o)}><Icon name={bld ? 'close' : 'setup'} size={24} /></button>
          <em>Builder</em>
        </div>
        <Link prefetch={false} href="/compare" className={path === '/compare' ? 'on' : ''} onClick={() => setBld(false)}><span className="bn-ic"><Icon name="compare" size={20} />{ready && compare.length > 0 && <span className="badge">{compare.length}</span>}</span><em>Compare</em></Link>
        <Link prefetch={false} href="/account" className={path === '/account' ? 'on' : ''} onClick={() => setBld(false)}><span className="bn-ic"><Icon name="user" size={20} /></span><em>Account</em></Link>
      </nav>
      <div className="toasts">{toasts.map(t => <div className="toast in" key={t.id}><Icon name={t.icon} size={18} /><span>{t.msg}</span></div>)}</div>
    </>
  );
}
