'use client';
/* Header — TV Hut layout: top bar · logo / search / actions / My Cart · category bar */
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { categories, visibleProducts as products, site, headerLogoAnim, byId } from '@/lib/data';
import { activeMenu, menuCategory, menuLink, menuSubs, type MenuItem } from '@/lib/menu';
import { money, catUrl, productUrl } from '@/lib/format';
import { Icon, ProductImg } from './ui';
import { useStore } from './store';
import { setSiteLang, siteLangIsBn } from './Translate';
import { useHomeCfg } from './live-edit/EmbedLiveEdit';
import { LiveEditChrome } from './live-edit/LiveEditSection';
import { boldParts } from '@/lib/home';
import { fixedImg } from '@/lib/img';

/* Motion View-style logo: logo → admin-set images (headerLogoAnim) → logo (CSS keyframes in globals.css).
   A normal client-side link (no full page reload, so no white flash); already on the home page, the click scrolls to the top and refreshes the data. */
function LogoAnim({ logo, anim }: { logo: string; anim: { off: boolean; items: string[] | null } }) {
  // the pictures: the products picked in Live Edit, else the built-in four; none (or switched off) = the logo stays alone
  // logo animation is permanently off for Munshiganj IT: the logo stays alone
  const pics: string[] = [];
  void anim; void byId; void headerLogoAnim;
  const path = usePathname();
  const router = useRouter();
  return (
    <Link prefetch={false} className={'logo-anim' + (pics.length ? '' : ' la-static')} href="/" aria-label="Munshiganj IT home"
      onClick={e => { if (path === '/') { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); router.refresh(); } }}>
      <span className="la-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img {...fixedImg(logo, 199)} alt="Munshiganj IT — Enter the New Era of Tech" width={199} height={44} fetchPriority="high" />
      </span>
      {pics.length > 0 && <span className="la-prods" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {pics.map(src => <span key={src}><img {...fixedImg(src, 42)} alt="" width={42} height={42} /></span>)}
      </span>}
    </Link>
  );
}

function SearchBox({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const path = usePathname();
  const [q, setQ] = useState(path === '/search' ? sp.get('q') || '' : '');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { const c = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('click', c); return () => document.removeEventListener('click', c); }, []);
  const t = q.trim().toLowerCase();
  const cats = t.length < 2 ? [] : categories.filter(c => c.name.toLowerCase().includes(t) || c.subs.some(s => s[0].toLowerCase().includes(t))).slice(0, 3);
  const prods = t.length < 2 ? [] : products.filter(p => (p.name + ' ' + p.brand + ' ' + p.sub).toLowerCase().includes(t)).slice(0, 6);
  return (
    <form ref={ref} className="hsearch" role="search" autoComplete="off" onSubmit={e => { e.preventDefault(); setOpen(false); router.push('/search?q=' + encodeURIComponent(q)); }}>
      <input type="search" value={q} placeholder={placeholder} aria-label="Search" onChange={e => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} />
      <button type="submit" aria-label="Search"><Icon name="search" size={19} /></button>
      <div className={'suggest' + (open && t.length >= 2 ? ' open' : '')} onClick={() => setOpen(false)}>
        {!cats.length && !prods.length && <div className="sg-row">No matches. Press Enter to search all products.</div>}
        {cats.length > 0 && <div className="sg-h">Categories</div>}
        {cats.map(c => <Link prefetch={false} key={c.slug} className="sg-row" href={catUrl(c.slug)}><Icon name={c.icon} size={16} />{c.name}<em>{c.count} products</em></Link>)}
        {prods.length > 0 && <div className="sg-h">Products</div>}
        {prods.map(p => <Link prefetch={false} key={p.id} className="sg-row" href={productUrl(p.id)}><span className="sg-img"><ProductImg p={p} size={36} /></span><span>{p.name}</span><b>{money(p.price)}</b></Link>)}
        <Link prefetch={false} className="sg-all" href={'/search?q=' + encodeURIComponent(q)}>See all results for “{q}”</Link>
      </div>
    </form>
  );
}

export function LangSwitch() {
  const { lang, setLang } = useStore();
  // the googtrans cookie is the source of truth; keep the stored choice in step with it
  useEffect(() => { const bn = siteLangIsBn(); if ((lang === 'bn') !== bn) setLang(bn ? 'bn' : 'en'); }, [lang, setLang]);
  const pick = (l: 'en' | 'bn') => { if (l === lang) return; setLang(l); setSiteLang(l); };
  return (
    <span className="lang notranslate" translate="no" role="group" aria-label="Language">
      <button className={lang === 'en' ? 'on' : ''} onClick={() => pick('en')}>EN</button>
      <button className={lang === 'bn' ? 'on' : ''} onClick={() => pick('bn')}>বাংলা</button>
    </span>
  );
}

/* The category bar's drop-downs open on hover (CSS). A click on a link inside an item shuts that item's drop-down at once (class "shut"), so it
   does not hang open over the next page; it opens again after the mouse has left the item and come back. */
const shutOnClick = (e: React.MouseEvent<HTMLElement>) => {
  const t = e.target as HTMLElement;
  if (t.closest('a')) t.closest('.cb-item')?.classList.add('shut');
};
const reopenOnLeave = (e: React.MouseEvent<HTMLElement>) => {
  const item = (e.target as HTMLElement).closest('.cb-item');
  if (item && !item.contains(e.relatedTarget as Node | null)) item.classList.remove('shut');
};
/* Width follows the content (CSS). On hover the panel is nudged left only as far as needed to stay on screen; a brand flyout opens to the
   right when it fits, else to the left, and slides up when it would cross the bottom edge. */
const EDGE = 8;
const placeOnEnter = (e: React.MouseEvent<HTMLElement>) => {
  const t = e.target as HTMLElement, from = e.relatedTarget as Node | null;
  const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
  const item = t.closest('.cb-item') as HTMLElement | null;
  if (item && !(from && item.contains(from))) {
    const panel = item.querySelector(':scope > .cb-drop') as HTMLElement | null;
    if (panel) {
      panel.style.left = ''; panel.style.maxHeight = ''; panel.style.overflowY = '';
      const ir = item.getBoundingClientRect(), pr = panel.getBoundingClientRect();
      if (ir.left + pr.width > vw - EDGE) panel.style.left = Math.max((vw - EDGE) - (ir.left + pr.width), EDGE - ir.left) + 'px';
      if (pr.height > vh - ir.bottom - EDGE) { panel.style.maxHeight = (vh - ir.bottom - EDGE) + 'px'; panel.style.overflowY = 'auto'; }
    }
  }
  const li = t.closest('li.has-fly') as HTMLElement | null;
  if (li && !(from && li.contains(from))) {
    const fly = li.querySelector(':scope > .cb-fly') as HTMLElement | null;
    if (fly) {
      fly.classList.remove('flip'); fly.style.left = ''; fly.style.top = '';
      const lr = li.getBoundingClientRect(), fr = fly.getBoundingClientRect();
      const fitsRight = lr.right - 2 + fr.width <= vw - EDGE, fitsLeft = lr.left + 2 - fr.width >= EDGE;
      if (!fitsRight && fitsLeft) fly.classList.add('flip');
      else if (!fitsRight) fly.style.left = ((vw - EDGE - fr.width) - lr.left) + 'px';
      const over = lr.top + fr.height - (vh - EDGE);
      if (over > 0) fly.style.top = -Math.min(over, Math.max(lr.top - EDGE, 0)) + 'px';
    }
  }
};
const catbarEvents = { onClick: shutOnClick, onMouseOut: reopenOnLeave, onMouseOver: placeOnEnter };

/* Category dropdown: single column, count after the name — the category's sub-categories (a brand is a sub-category named after it,
   e.g. Power Bank > Baseus), "View All <category> (total)" at the bottom. No brand list or brand flyout of its own. */
/* Techland-style mega dropdown: sub-categories in up to 3 columns (8 per column); a sub-category with brands opens a 2-column brand panel beside it */
const rowsOf = (n: number, base: number) => Math.max(1, Math.max(Math.min(n, base), Math.ceil(n / 4)));
const dropStyle = (n: number) => ({ '--rows': rowsOf(n, 9) } as React.CSSProperties);
const flyStyle = (n: number) => ({ '--frows': rowsOf(n, 10) } as React.CSSProperties);
const liCls = (_i: number, _n: number, fly: boolean) => (fly ? 'has-fly' : '');

function CatDrop({ c, subs }: { c: (typeof categories)[number]; subs?: (typeof categories)[number]['subs'] }) {
  const list = subs ?? c.subs;
  return (
    <ul className="cb-drop" style={dropStyle(list.length)}>
      {list.map((s, i) => {
        const kids = s[3] || [];
        return (
          <li key={s[0]} className={liCls(i, list.length, kids.length > 0)}>
            <Link prefetch={false} href={catUrl(c.slug, { sub: s[0] })}><span>{s[0]}</span>{kids.length > 0 && <Icon name="right" size={13} />}</Link>
            {kids.length > 0 && (
              <ul className="cb-fly" style={flyStyle(kids.length)}>
                {kids.map(k => <li key={k[0]}><Link prefetch={false} href={catUrl(c.slug, { sub: s[0], sub2: k[0] })}>{k[0]}</Link></li>)}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* Main menu: up to 17 categories in one line, text only. The last item is "Others" (client: in place of "More"):
   its dropdown lists the Others sub-types, then the IN_OTHERS categories and any beyond 17, then "View All Others" */
const MENU_MAX = 17;
const IN_OTHERS = ['computer-accessories', 'car-accessories'];
/* The same bar built from the menu the admin made in Live Edit → Main menu. A category keeps its rich dropdown (sub-types with
   counts, brand flyouts), limited to the sub-types the menu kept; any other item gets a plain dropdown of its sub-items. */
function MenuBar() {
  const menu = activeMenu();
  const shown = menu.slice(0, MENU_MAX), rest = menu.slice(MENU_MAX);
  const plain = (it: MenuItem) => it.children.length > 0 && (
    <ul className="cb-drop" style={dropStyle(it.children.length)}>
      {it.children.map((ch, i) => (
        <li key={ch.id} className={liCls(i, it.children.length, ch.children.length > 0)}>
          <Link prefetch={false} href={menuLink(ch, it)}><span>{ch.label}</span>{ch.children.length > 0 && <Icon name="right" size={13} />}</Link>
          {ch.children.length > 0 && <ul className="cb-fly" style={flyStyle(ch.children.length)}>{ch.children.map(g => <li key={g.id}><Link prefetch={false} href={menuLink(g, ch)}>{g.label}</Link></li>)}</ul>}
        </li>
      ))}
    </ul>
  );
  return (
    <nav className="catbar" aria-label="Categories" {...catbarEvents}><div className="wrap catbar-in">
      {shown.map((it, i) => {
        const c = menuCategory(it);
        return (
          <div key={it.id} className={'cb-item' + (i >= shown.length - 4 ? ' right' : '')}>
            {/* the arrow marks a menu item that opens a list of its own, like "Others" in the built-in menu */}
            <Link prefetch={false} className="cb-link" href={menuLink(it)}>{it.label}{(c?.slug === 'others' || (!c && it.children.length > 0)) && <Icon name="down" size={13} />}</Link>
            {c ? <CatDrop c={c} subs={menuSubs(c, it)} /> : plain(it)}
          </div>
        );
      })}
      {rest.length > 0 && (
        <div className="cb-item right cb-more">
          <span className="cb-link" tabIndex={0}>More<Icon name="down" size={13} /></span>
          <ul className="cb-drop">{rest.map(it => <li key={it.id}><Link prefetch={false} href={menuLink(it)}><span>{it.label}</span></Link></li>)}</ul>
        </div>
      )}
    </div></nav>
  );
}

function CatBar() {
  if (activeMenu().length > 0) return <MenuBar />;
  const others = categories.find(c => c.slug === 'others');
  const main = categories.filter(c => c !== others && !IN_OTHERS.includes(c.slug));
  const shown = main.slice(0, MENU_MAX);
  const rest = [...categories.filter(c => IN_OTHERS.includes(c.slug)), ...main.slice(MENU_MAX)];
  return (
    <nav className="catbar" aria-label="Categories" {...catbarEvents}><div className="wrap catbar-in">
      {shown.map((c, i) => (
        <div key={c.slug} className={'cb-item' + (i >= shown.length - 4 ? ' right' : '')}>
          <Link prefetch={false} className="cb-link" href={catUrl(c.slug)}>{c.name}</Link>
          <CatDrop c={c} />
        </div>
      ))}
      {others && (
        <div className="cb-item right cb-more">
          <Link prefetch={false} className="cb-link" href={catUrl(others.slug)}>{others.name}<Icon name="down" size={13} /></Link>
          <ul className="cb-drop">
            {others.subs.map(s => <li key={s[0]}><Link prefetch={false} href={catUrl(others.slug, { sub: s[0] })}><span>{s[0]} <em>({s[1]})</em></span></Link></li>)}
            {rest.map(c => <li key={c.slug}><Link prefetch={false} href={catUrl(c.slug)}><span>{c.name} <em>({c.count})</em></span></Link></li>)}
            <li className="cb-all"><Link prefetch={false} href={catUrl(others.slug)}>View All {others.name} <em>({others.count})</em></Link></li>
          </ul>
        </div>
      )}
    </div></nav>
  );
}

export default function Header() {
  const { header: hd } = useHomeCfg();
  const { cartCount, cartTotal, openDrawer, ready, customer, signOut } = useStore();
  const [stuck, setStuck] = useState(false);
  const [sOpen, setSOpen] = useState(false); // phones: the search box opens from the search icon
  const routePath = usePathname(); // closeOnRoute: the search box closes when a page is opened
  useEffect(() => { setSOpen(false); }, [routePath]);
  useEffect(() => { if (!sOpen) return; const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setSOpen(false); }; addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, [sOpen]);
  const toggleSearch = () => { setSOpen(o => { if (!o) setTimeout(() => document.querySelector<HTMLInputElement>('.hsearch-wrap input')?.focus(), 60); return !o; }); };
  useEffect(() => { const on = () => setStuck(scrollY > 40); addEventListener('scroll', on, { passive: true }); on(); return () => removeEventListener('scroll', on); }, []);
  return (
    <header className={'hdr' + (stuck ? ' stuck' : '')}>
      <LiveEditChrome id="header-top" label="header top bar"><div className="topbar"><div className="wrap topbar-in">
        <span>{boldParts(hd.welcome).map((p, i) => p.b ? <b key={i} className="notranslate" translate="no">{p.t}</b> : p.t)}</span>
        <div className="tb-right">
          <a href={'tel:' + site.hotline}><Icon name="phone" size={13} />{hd.hotlineLabel}: <b>{site.hotline}</b></a>
          {hd.links.filter(l => !l.hidden).map(l => <Link prefetch={false} key={l.href + l.label} href={l.href}><Icon name={l.icon || 'right'} size={13} />{l.label}</Link>)}
          <LangSwitch />
        </div>
      </div></div></LiveEditChrome>

      <LiveEditChrome id="header" label="header"><div className="hdr-main"><div className="wrap hdr-main-in">
        <button className="hamb" aria-label="Menu" onClick={() => openDrawer('nav')}><Icon name="menu" size={24} /></button>
        <LogoAnim logo={hd.logo} anim={hd.anim} />
        <div className={'hsearch-wrap' + (sOpen ? ' open' : '')}><Suspense fallback={<form className="hsearch" />}><SearchBox placeholder={hd.searchPlaceholder} /></Suspense></div>
        <nav className="hactions">
          <button type="button" className="ha hsearch-btn" aria-label={sOpen ? 'Close search' : 'Search'} aria-expanded={sOpen} onClick={toggleSearch}><span className="ha-ic"><Icon name={sOpen ? 'close' : 'search'} size={20} /></span></button>
          <Link prefetch={false} className="ha hide-m hh" href="/happy-hour"><span className="ha-ic"><Icon name="bolt" size={20} /></span><span className="lbl">Happy Hour</span></Link>
          <Link prefetch={false} className="ha hide-m offer" href="/offers"><span className="ha-ic"><Icon name="tag" size={20} /></span><span className="lbl">Offers</span></Link>
          <div className="ha acct">
            <Link prefetch={false} href="/account" className="ha" aria-label="Account" style={{ color: 'inherit' }}><span className="ha-ic"><Icon name="user" size={20} /></span><span className="lbl">Account</span></Link>
            <div className="acct-menu">
              {ready && customer ? (
                <div className="am-head"><b>Hello, {customer.name.split(' ')[0]}</b><span>{customer.phone || customer.email}</span>
                  <div className="am-btns"><Link prefetch={false} className="btn btn-brand btn-sm" href="/account">My Account</Link><button type="button" className="btn btn-line btn-sm" onClick={signOut}>Logout</button></div></div>
              ) : (
                <div className="am-head"><b>Welcome to Munshiganj IT</b><span>Track orders, wishlist &amp; more</span>
                  <div className="am-btns"><Link prefetch={false} className="btn btn-brand btn-sm" href="/login">Login</Link><Link prefetch={false} className="btn btn-line btn-sm" href="/register">Register</Link></div></div>
              )}
              <Link prefetch={false} href="/account"><Icon name="user" size={16} />My Account</Link>
              <Link prefetch={false} href="/account#orders"><Icon name="box" size={16} />My Orders</Link>
              <Link prefetch={false} href="/wishlist"><Icon name="heart" size={16} />Wishlist</Link>
              <Link prefetch={false} href="/track-order"><Icon name="truck" size={16} />Track Your Order</Link>
              <Link prefetch={false} href="/partner"><Icon name="briefcase" size={16} />Partner Account</Link>
            </div>
          </div>
          <div className="ha acct bld hide-m">
            <span className="ha" tabIndex={0}><span className="ha-ic"><Icon name="setup" size={20} /></span><span className="lbl">Builder<Icon name="down" size={12} /></span></span>
            <div className="acct-menu">
              <Link prefetch={false} href="/pc-builder"><Icon name="desktop" size={16} />PC Builder</Link>
              <Link prefetch={false} href="/search?q=CCTV%20Camera"><Icon name="chip" size={16} />CC Builder</Link>
            </div>
          </div>
          <button className="cart-btn" aria-label="Cart" onClick={() => openDrawer('cart')}>
            <Icon name="cart" size={19} /><span className="ct">My Cart</span><span className="sep" /><span className="ct">{money(ready ? cartTotal : 0)}</span>
            {ready && cartCount > 0 && <span className="badge">{cartCount}</span>}
          </button>
        </nav>
      </div></div></LiveEditChrome>

      <LiveEditChrome id="menu" label="main menu"><CatBar /></LiveEditChrome>
    </header>
  );
}
