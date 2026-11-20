'use client';
/* =====================================================================
   Listing engine (Category + Search + All/Offers) — StarTech layout.
   Port of ui/assets/js/listing.js. Sidebar filters with live counts,
   sort/show, grid/list, pagination. Swap `products` for an API call later.
   ===================================================================== */
import Link from 'next/link';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { products, categories, catBySlug, site, type Product, type Stock } from '@/lib/data';
import { money, STOCK, catUrl, productUrl } from '@/lib/format';
import { Icon, Stars, ProductCard, Crumb } from './ui';
import { useStore } from './store';

export interface ListingInitial { q?: string; sub?: string; sub2?: string; brand?: string; stock?: string; deals?: boolean; sort?: string }
export interface ListingProps { mode: 'category' | 'search' | 'all' | 'brand'; catSlug?: string; initial: ListingInitial; hideCrumb?: boolean; /** the description the admin wrote for this category (HTML), shown under the products */ about?: string }

type SetKey = 'stock' | 'brands' | 'subs' | 'cats';
interface Filters { stock: string[]; brands: string[]; subs: string[]; cats: string[]; min: number; max: number; rating: number; sale: boolean; emi: boolean; attrs: Record<string, string[]> }

const SORTS: [string, string][] = [['default', 'Default'], ['price-asc', 'Price (Low > High)'], ['price-desc', 'Price (High > Low)'], ['sold', 'Best Selling'], ['rating', 'Top Rated'], ['discount', 'Biggest Saving']];
const STOCKS: [string, string][] = [['in', 'In Stock'], ['preorder', 'Pre Order'], ['call', 'Call for Price'], ['upcoming', 'Up Coming'], ['out', 'Out of Stock']];
/** the availability group of a product: a product with no price is "Call for Price", whatever its stock */
const skey = (p: Product): string => (p.price > 0 ? p.stock : 'call');
const AVAIL_ORDER: Record<string, number> = { in: 0, preorder: 1, call: 2, upcoming: 3, out: 4 };
const uniq = <T,>(a: T[]) => Array.from(new Set(a));
const ALWAYS = ['stock', 'price'];
const fmtNum = (s: string) => (s === '' ? '' : Number(s).toLocaleString('en-US')); // 185000 -> 185,000 // filter groups that are always open (no arrow)
/** page numbers to show: the first, the last and a window around the current page; 0 stands for "…" */
const pageList = (cur: number, total: number): number[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const s = new Set([1, 2, total - 1, total, cur - 1, cur, cur + 1]);
  const out: number[] = [];
  for (let n = 1; n <= total; n++) { if (s.has(n)) { if (out.length && n - out[out.length - 1] > 1) out.push(0); out.push(n); } }
  return out;
};
const catName = (slug: string) => catBySlug(slug)?.name ?? slug;

/** A dropdown with our own look: a button showing the chosen option, and a rounded list under (or over) it. */
function Pick({ value, options, onChange, label, className = '', up = false }: { value: string; options: [string, string][]; onChange: (v: string) => void; label: string; className?: string; up?: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const away = (e: Event) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc); };
  }, [open]);
  const cur = options.find(o => o[0] === value) || options[0];
  return (
    <div ref={box} className={'pick ' + className + (open ? ' open' : '') + (up ? ' up' : '')}>
      <button type="button" className="pick-btn" aria-haspopup="listbox" aria-expanded={open} aria-label={label} onClick={() => setOpen(o => !o)}>
        <span>{cur[1]}</span><Icon name="down" size={15} />
      </button>
      <ul className="pick-menu" role="listbox" aria-label={label}>
        {options.map(o => (
          <li key={o[0]} role="option" aria-selected={o[0] === value} className={o[0] === value ? 'on' : ''} onClick={() => { onChange(o[0]); setOpen(false); }}>
            <span>{o[1]}</span>{o[0] === value && <Icon name="check" size={15} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Listing({ mode, catSlug, initial, hideCrumb = false, about }: ListingProps) {
  const isBrand = mode === 'brand';
  const { drawer, openDrawer, closeDrawer } = useStore();
  const isSearch = mode === 'search';
  const q = (initial.q || '').trim();
  const cat = mode === 'category' ? catBySlug(catSlug) : undefined;

  const base = useMemo(() => {
    let b = products.filter(p => !p.discontinued);
    if (isSearch && q) {
      const t = q.toLowerCase().split(/\s+/);
      b = b.filter(p => { const h = (p.name + ' ' + p.brand + ' ' + p.sub + ' ' + catName(p.cat) + ' ' + p.specs.join(' ')).toLowerCase(); return t.every(x => h.includes(x)); });
    }
    if (cat) b = b.filter(p => p.cat === cat.slug && (!initial.sub || p.sub === initial.sub) && (!initial.sub2 || p.sub2 === initial.sub2));
    if (initial.deals) b = b.filter(p => p.old);
    if (isBrand && initial.brand) b = b.filter(p => p.brand === initial.brand);
    return b;
  }, [isSearch, q, cat, initial.sub, initial.sub2, initial.deals, isBrand, initial.brand]);

  const PMAX = Math.max(10000, Math.ceil(Math.max(0, ...base.map(p => p.price)) / 1000) * 1000);
  const fresh = (): Filters => ({ stock: [], brands: [], subs: [], cats: [], min: 0, max: PMAX, rating: 0, sale: false, emi: false, attrs: {} });
  const [f, setF] = useState<Filters>(() => ({
    ...fresh(),
    stock: initial.stock ? [initial.stock] : [], brands: initial.brand && !isBrand ? [initial.brand] : [], subs: initial.sub && !cat ? [initial.sub] : [],
  }));
  const [sort, setSort] = useState(initial.sort || 'default');
  const [nameQ, setNameQ] = useState('');
  /* filter card scrollbar: the thumb keeps one small fixed size (native thumbs shrink as groups open) */
  const fBody = useRef<HTMLDivElement>(null);
  const fThumb = useRef<HTMLSpanElement>(null);
  const fTrack = useRef<HTMLDivElement>(null);
  const THUMB = 44;
  const fSync = () => {
    const b = fBody.current, th = fThumb.current, tr = fTrack.current;
    if (!b || !th || !tr) return;
    const max = b.scrollHeight - b.clientHeight;
    tr.style.visibility = max > 2 ? 'visible' : 'hidden';
    th.style.height = THUMB + 'px';
    th.style.transform = 'translateY(' + (max > 0 ? (b.clientHeight - THUMB) * (b.scrollTop / max) : 0) + 'px)';
  };
  const fBurst = () => { const t0 = performance.now(); const tick = () => { fSync(); if (performance.now() - t0 < 520) requestAnimationFrame(tick); }; requestAnimationFrame(tick); };
  useEffect(() => { fSync(); addEventListener('resize', fSync); return () => removeEventListener('resize', fSync); });
  const fDrag = (e: React.PointerEvent<HTMLSpanElement>) => {
    const b = fBody.current; if (!b) return;
    e.preventDefault();
    const startY = e.clientY, startTop = b.scrollTop;
    const ratio = (b.scrollHeight - b.clientHeight) / Math.max(1, b.clientHeight - THUMB);
    const move = (ev: PointerEvent) => { b.scrollTop = startTop + (ev.clientY - startY) * ratio; };
    const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); };
    addEventListener('pointermove', move); addEventListener('pointerup', up);
  };
  const [subOpen, setSubOpen] = useState(false);   // sub-category links: one line, or all lines
  const [subMore, setSubMore] = useState(false);   // true when the links need more than one line
  const [subH, setSubH] = useState<[number, number]>([0, 0]); // [one row, all rows] heights in px, for the smooth open / close
  const subRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = subRef.current;
    if (!el) { setSubMore(false); return; }
    const measure = () => {
      const kids = Array.from(el.children) as HTMLElement[];
      if (kids.length < 2) { setSubMore(false); return; }
      const more = kids[kids.length - 1].offsetTop > kids[0].offsetTop + 4;
      setSubMore(more);
      if (more) setSubH([kids[0].offsetTop + kids[0].offsetHeight + 2, Math.max(...kids.map(k => k.offsetTop + k.offsetHeight)) + 2]);
    };
    measure();
    addEventListener('resize', measure);
    return () => removeEventListener('resize', measure);
  }, [catSlug, initial.sub, initial.sub2]);
  const [per, setPer] = useState('20');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [openKeys, setOpenKeys] = useState<string[]>([]); // open filter groups; Availability and Price Range are always open
  const [allOpen, setAllOpen] = useState(false);          // 'show all' mode: groups open and close one by one; otherwise opening one closes the others
  const groupKeys: string[] = [];                          // filled while the groups render, used by the expand-all button
  const [minTxt, setMinTxt] = useState(String(f.min));
  const [maxTxt, setMaxTxt] = useState(String(f.max));

  /* persisted grid/list view (prototype key nt2_view) */
  useEffect(() => {
    try { const v = localStorage.getItem('nt2_view'); if (v && JSON.parse(v) === 'list') setView('list'); } catch { /* ignore */ }
  }, []);
  const changeView = (v: 'grid' | 'list') => { setView(v); try { localStorage.setItem('nt2_view', JSON.stringify(v)); } catch { /* private mode */ } };

  /* keep the price text boxes in sync with the committed range */
  useEffect(() => { setMinTxt(String(f.min)); setMaxTxt(String(f.max)); }, [f.min, f.max]);

  /* does p pass every active filter except the `skip` group? (faceted counts) */
  const pass = (p: Product, skip?: string) => (skip === 'stock' || !f.stock.length || f.stock.includes(skey(p))) && (skip === 'brands' || !f.brands.length || f.brands.includes(p.brand)) &&
    (skip === 'subs' || !f.subs.length || f.subs.includes(p.sub)) && (skip === 'cats' || !f.cats.length || f.cats.includes(p.cat)) && (skip === 'price' || (p.price >= f.min && p.price <= f.max)) &&
    (skip === 'rating' || !f.rating || p.rating >= f.rating) && (!f.sale || !!p.old) && (!f.emi || p.emi) &&
    Object.entries(f.attrs).every(([k, vs]) => skip === 'attr:' + k || !vs.length || vs.includes(p.attrs?.[k] ?? ''));
  const cnt = (fn: (p: Product) => unknown, skip?: string) => base.filter(p => fn(p) && pass(p, skip)).length;
  const sub = initial.sub;
  const title = isSearch ? 'Search' : cat ? (initial.sub2 || sub || cat.name) : initial.deals ? 'Offers & Deals' : initial.stock === 'preorder' ? 'Pre Order' : initial.brand ? initial.brand : 'All Products';

  const toggle = (k: SetKey, v: string, on?: boolean) => setF(s => {
    const has = s[k].includes(v); const want = on === undefined ? !has : on;
    return { ...s, [k]: want ? (has ? s[k] : [...s[k], v]) : s[k].filter(x => x !== v) };
  });
  const toggleAttr = (k: string, v: string, on?: boolean) => setF(s => {
    const cur = s.attrs[k] || []; const has = cur.includes(v); const want = on === undefined ? !has : on;
    return { ...s, attrs: { ...s.attrs, [k]: want ? (has ? cur : [...cur, v]) : cur.filter(x => x !== v) } };
  });
  const clearAll = () => setF(fresh());

  const results = useMemo(() => {
    const nq = nameQ.trim().toLowerCase();
    const r = base.filter(p => pass(p) && (!nq || p.name.toLowerCase().includes(nq)));
    const S: Record<string, (a: Product, b: Product) => number> = {
      'price-asc': (a, b) => a.price - b.price, 'price-desc': (a, b) => b.price - a.price, sold: (a, b) => b.sold - a.sold, rating: (a, b) => b.rating - a.rating,
      discount: (a, b) => (b.old ? b.old - b.price : 0) - (a.old ? a.old - a.price : 0),
    };
    return r.sort(S[sort] || ((a, b) => AVAIL_ORDER[skey(a)] - AVAIL_ORDER[skey(b)])); // default: In Stock, Pre Order, Call for Price, Up Coming, Out of Stock (the catalog order is kept inside each group)
  }, [base, f, sort, nameQ]);

  useEffect(() => { setPage(1); }, [f, sort, per, nameQ]);
  /* when a filter / sort / page size changes, bring the search + sort bar to the top of the screen (just under the sticky header) */
  const barRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    const id = setTimeout(() => {
      const el = barRef.current; if (!el) return;
      const hdr = window.innerWidth <= 900 ? 72 : 146;
      const top = el.getBoundingClientRect().top + window.scrollY - hdr;
      if (Math.abs(window.scrollY - top) > 8) window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }, 350);
    return () => clearTimeout(id);
  }, [f, sort, per]);
  const perN = +per || 20;
  const pageCount = Math.max(1, Math.ceil(results.length / perN));
  const shown = results.slice((page - 1) * perN, page * perN);
  const goPage = (n: number) => { setPage(Math.min(pageCount, Math.max(1, n))); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  /* price range */
  const onRange = (which: 'min' | 'max', val: number) => setF(s => {
    let a = which === 'min' ? val : s.min, b = which === 'max' ? val : s.max;
    if (a > b - 500) { if (which === 'min') a = b - 500; else b = a + 500; }
    return { ...s, min: a, max: b };
  });
  const commitPrice = () => setF(s => ({ ...s, min: Math.max(0, +minTxt || 0), max: Math.min(PMAX, +maxTxt || PMAX) }));

  /* sidebar pieces */
  const box = (k: string, t: string, body: ReactNode) => { if (!ALWAYS.includes(k)) groupKeys.push(k); return (
    <div key={k} className={'fbox' + (ALWAYS.includes(k) ? ' fixed' : openKeys.includes(k) ? '' : ' closed')} data-f={k}>
      <h4 onClick={ALWAYS.includes(k) ? undefined : () => setOpenKeys(o => (o.includes(k) ? o.filter(x => x !== k) : allOpen ? [...o, k] : [k]))}>{t}{!ALWAYS.includes(k) && <Icon name="right" size={16} />}</h4>
      <div className="fbody"><div className="fbody-in">{body}</div></div>
    </div>
  ); };
  const ck = (g: SetKey, v: string, l: ReactNode, n: number) => (
    <label className="check" key={g + v}>
      <input type="checkbox" data-g={g} value={v} checked={f[g].includes(v)} onChange={e => toggle(g, v, e.target.checked)} />
      <span>{l}</span><em>({n})</em>
    </label>
  );
  const brandList = uniq(base.map(p => p.brand)).sort((a, b) => base.filter(p => p.brand === b).length - base.filter(p => p.brand === a).length);
  const subs = uniq(base.map(p => p.sub)), cats = uniq(base.map(p => p.cat));

  /* active filter chips */
  const chips: [string, string, string][] = [];
  f.stock.forEach(v => chips.push(['stock', v, v === 'call' ? 'Call for Price' : STOCK[v as Stock]?.[0] ?? v]));
  f.brands.forEach(v => chips.push(['brands', v, v]));
  f.subs.forEach(v => chips.push(['subs', v, v]));
  f.cats.forEach(v => chips.push(['cats', v, catName(v)]));
  if (f.min > 0 || f.max < PMAX) chips.push(['price', '', money(f.min) + ' – ' + money(f.max)]);
  if (f.rating) chips.push(['rating', '', f.rating + '★ & up']);
  if (f.sale) chips.push(['sale', '', 'Discounted']);
  if (f.emi) chips.push(['emi', '', 'EMI']);
  Object.entries(f.attrs).forEach(([k, vs]) => vs.forEach(v => chips.push(['attr:' + k, v, k + ': ' + v])));
  const removeChip = (k: string, v: string) => {
    if (k === 'stock' || k === 'brands' || k === 'subs' || k === 'cats') toggle(k, v, false);
    else if (k === 'price') setF(s => ({ ...s, min: 0, max: PMAX }));
    else if (k === 'rating') setF(s => ({ ...s, rating: 0 }));
    else if (k === 'sale' || k === 'emi') setF(s => ({ ...s, [k]: false }));
    else if (k.startsWith('attr:')) toggleAttr(k.slice(5), v, false);
  };


  // the sub-categories of the chosen sub-category (brands under Router), shown as a second row of pills
  const kids = (cat && sub ? cat.subs.find(s => s[0] === sub)?.[3] : undefined) || [];
  // inside a sub-category (e.g. Networking > Router) the parent category's own pills (All Networking / Hotspot Router / Router / Wifi Adapter) are not repeated; only that sub-category's children (All Router / TP-Link) show
  const showTop = !(cat && sub && !isSearch && !isBrand);
  // "<name> Price in Bangladesh": worked out from the prices of the products listed here (before any filter), so it follows the catalog
  const shopName = site.name || 'Munshiganj IT';
  const seoName = isBrand ? initial.brand || '' : initial.sub2 ? `${initial.sub2} ${sub}` : sub || cat?.name || '';
  const seoIntro = (() => {
    if (isBrand ? !initial.brand : mode !== 'category' || !cat) return '';
    const prices = base.map(p => p.price).filter(n => n > 0);
    if (!prices.length) return '';
    const lo = Math.min(...prices), hi = Math.max(...prices), bdt = (n: number) => 'BDT ' + n.toLocaleString('en-IN');
    const shop = site.name || 'Munshiganj IT';
    const top = brandList.slice(0, 5);
    if (isBrand) {
      // a brand page: its price range and the categories it sells in
      const kinds = cats.slice(0, 5).map(c => catName(c));
      return (lo === hi ? `${seoName} products in Bangladesh cost ${bdt(lo)}.` : `${seoName} products in Bangladesh start from ${bdt(lo)} and, depending on the model and features, go up to ${bdt(hi)}.`)
        + ` Buy original ${seoName} products from ${shop} with official warranty and delivery all over BD.`
        + (kinds.length ? ` Shop ${seoName} ${kinds.join(', ')} and more.` : '')
        + ' Browse below and order yours now!';
    }
    return (lo === hi
      ? `${seoName} Price in Bangladesh is ${bdt(lo)}.`
      : `${seoName} Price in Bangladesh starts from ${bdt(lo)} and, depending on brand and features, the price may go up to ${bdt(hi)}.`)
      + ` Buy the latest original ${seoName} from ${shop} ${seoName} shop in BD.`
      + (top.length > 1 ? ` Choose from top brands like ${top.join(', ')}.` : '')
      + ' Browse below and order yours now!';
  })();
  const crumb: [string, string?][] = isSearch ? [['Search'], [q || 'All']] : cat ? [[cat.name, catUrl(cat.slug)] as [string, string?]].concat(sub ? [[sub, catUrl(cat.slug, { sub })]] : []).concat(initial.sub2 ? [[initial.sub2, catUrl(cat.slug, { sub, sub2: initial.sub2 })]] : []) : [[title]];

  return (
    <>
      {!hideCrumb && <Crumb items={crumb} />}
      {seoIntro && <section className="cat-seo" aria-label={seoName + ' price in Bangladesh'}><div className="wrap">
        <h1>{isBrand ? `${seoName} Products Price in Bangladesh` : `${seoName} Price in Bangladesh`}</h1>
        <p>{seoIntro}</p>
      </div></section>}
      {(showTop || kids.length > 0) && <div className="lst-head"><div className="wrap">{showTop && <div ref={subRef} className={'subcats' + (subMore ? ' fold' : '')} style={subMore && subH[0] ? { maxHeight: subOpen ? subH[1] : subH[0] } : undefined}>
        {isSearch || isBrand
          ? cats.map(c => <button key={c} className={'pill' + (f.cats.includes(c) ? ' on' : '')} onClick={() => toggle('cats', c)}>{catName(c)} <em>({cnt(p => p.cat === c, 'cats')})</em></button>)
          : cat
            ? <>
                {(sub || initial.brand) && <Link prefetch={false} className="pill" href={catUrl(cat.slug)}>All {cat.name}</Link>}
                {cat.subs.filter(s => s[0] !== 'All ' + cat.name).map(s => <Link prefetch={false} key={s[0]} className={'pill' + (sub === s[0] && !initial.sub2 ? ' on' : '')} href={catUrl(cat.slug, { sub: s[0] })}>{s[0]} <em>({s[1]})</em></Link>)}
              </>
            : categories.map(c => <Link prefetch={false} key={c.slug} className="pill" href={catUrl(c.slug)}>{c.name} <em>({c.count})</em></Link>)}
      </div>}{showTop && subMore && <button type="button" className={'subcat-toggle' + (subOpen ? ' open' : '')} aria-expanded={subOpen} aria-label={subOpen ? 'Show fewer categories' : 'Show all categories'} onClick={() => setSubOpen(o => !o)}><Icon name="down" size={14} /></button>}{kids.length > 0 && <div className="subcats sub2-row">
        <Link prefetch={false} className={'pill' + (initial.sub2 ? '' : ' on')} href={catUrl(cat!.slug, { sub })}>All {sub} <em>({cat!.subs.find(s => s[0] === sub)?.[1]})</em></Link>
        {kids.map(k => <Link prefetch={false} key={k[0]} className={'pill' + (initial.sub2 === k[0] ? ' on' : '')} href={catUrl(cat!.slug, { sub, sub2: k[0] })}>{k[0]} <em>({k[1]})</em></Link>)}
      </div>}</div></div>}

      <div className="wrap listing">
        <aside className={'filters' + (drawer === 'filters' ? ' open' : '')} aria-label="Filters">
          <div className="row-between f-close" style={{ display: 'none', marginBottom: 6 }}><b>Filters</b><button onClick={closeDrawer} aria-label="Close"><Icon name="close" size={20} /></button></div>
          <div className="f-top"><h3>Filters</h3><div className="f-actions"><button type="button" className="f-ico f-x" aria-label="Close filters" onClick={closeDrawer}><Icon name="close" size={18} /></button><button type="button" className="f-ico f-clear-ico" aria-label="Clear all filters" title="Clear all filters" onClick={clearAll}>
              <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-15.4-6.3L3 8.2" /><path d="M3 3.5v4.7h4.7" /><path d="M3 12a9 9 0 0 0 15.4 6.3l2.6-2.5" /><path d="M21 20.5v-4.7h-4.7" /></svg>
            </button><button type="button" className={'f-ico f-expand' + (allOpen ? ' on' : '')} aria-pressed={allOpen} aria-label={allOpen ? 'Collapse all filters' : 'Show all filters'} title={allOpen ? 'Collapse all filters' : 'Show all filters'} onClick={() => { if (allOpen) { setAllOpen(false); setOpenKeys([]); } else { setAllOpen(true); setOpenKeys([...groupKeys]); } }}>
            <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{allOpen ? <><path d="M5.5 9L10 4.5 14.5 9" /><path d="M5.5 15L10 10.5 14.5 15" /></> : <><path d="M5.5 5L10 9.5 14.5 5" /><path d="M5.5 11L10 15.5 14.5 11" /></>}</svg>
          </button></div></div>
          <div className="f-wrap"><div className="f-body" ref={fBody} onScroll={fSync} onClick={fBurst}>
          {box('stock', 'Availability', STOCKS.map(s => ck('stock', s[0], s[1], cnt(p => skey(p) === s[0], 'stock'))))}
          {box('price', 'Price Range', <>
            <div className="range">
              <div className="track" />
              <div className="fill" style={{ left: (f.min / PMAX) * 100 + '%', right: 100 - (f.max / PMAX) * 100 + '%' }} />
              <input type="range" min={0} max={PMAX} step={500} value={f.min} aria-label="Min price" onChange={e => onRange('min', +e.target.value)} />
              <input type="range" min={0} max={PMAX} step={500} value={f.max} aria-label="Max price" onChange={e => onRange('max', +e.target.value)} />
            </div>
            <div className="price-in">
              <label className="pin"><span aria-hidden="true">৳</span><input className="input" value={fmtNum(minTxt)} inputMode="numeric" aria-label="Min" onChange={e => setMinTxt(e.target.value.replace(/\D/g, ''))} onBlur={commitPrice} onKeyDown={e => { if (e.key === 'Enter') commitPrice(); }} /></label>
              <label className="pin"><span aria-hidden="true">৳</span><input className="input" value={fmtNum(maxTxt)} inputMode="numeric" aria-label="Max" onChange={e => setMaxTxt(e.target.value.replace(/\D/g, ''))} onBlur={commitPrice} onKeyDown={e => { if (e.key === 'Enter') commitPrice(); }} /></label>
            </div>
          </>)}
          {(isSearch || isBrand) && cats.length > 1 && box('cats', 'Category', cats.map(c => ck('cats', c, catName(c), cnt(p => p.cat === c, 'cats'))))}
          {subs.length > 1 && box('subs', 'Sub Category', subs.map(s => ck('subs', s, s, cnt(p => p.sub === s, 'subs'))))}
          {!isBrand && brandList.length > 0 && box('brands', 'Brand', <div className="f-scroll">{brandList.map(b => ck('brands', b, b, cnt(p => p.brand === b, 'brands')))}</div>)}
          {cat?.filters?.map(([k, vs]) => box('attr:' + k, k, uniq([...vs, ...base.map(p => p.attrs?.[k]).filter((x): x is string => !!x)]).map(v => (
            <label className="check" key={k + v}>
              <input type="checkbox" checked={(f.attrs[k] || []).includes(v)} onChange={e => toggleAttr(k, v, e.target.checked)} />
              <span>{v}</span><em>({cnt(p => p.attrs?.[k] === v, 'attr:' + k)})</em>
            </label>
          ))))}
          {box('rating', 'Rating', <>
            {[4, 3].map(r => (
              <label className="check" key={r}>
                <input type="radio" name="rt" data-g="rating" value={r} checked={f.rating === r} onChange={() => setF(s => ({ ...s, rating: r }))} />
                <span><Stars rating={r} size={13} /> &amp; Up</span><em>({cnt(p => p.rating >= r, 'rating')})</em>
              </label>
            ))}
            <label className="check"><input type="radio" name="rt" data-g="rating" value={0} checked={!f.rating} onChange={() => setF(s => ({ ...s, rating: 0 }))} /><span>All ratings</span></label>
          </>)}
          {box('offer', 'Offers', <>
            <label className="check"><input type="checkbox" data-g="sale" value="1" checked={f.sale} onChange={e => setF(s => ({ ...s, sale: e.target.checked }))} /><span>Discounted</span><em>({cnt(p => p.old)})</em></label>
            <label className="check"><input type="checkbox" data-g="emi" value="1" checked={f.emi} onChange={e => setF(s => ({ ...s, emi: e.target.checked }))} /><span>EMI Available</span><em>({cnt(p => p.emi)})</em></label>
          </>)}
          </div>
          <div className="f-track" ref={fTrack} aria-hidden="true"><span ref={fThumb} onPointerDown={fDrag} /></div>
          </div>
          
        </aside>

        <section aria-label="Products">
          <div ref={barRef} className="lst-bar lst-bar2">
            <button className="btn btn-line btn-sm fbtn" onClick={() => openDrawer('filters')}><Icon name="filter" size={15} />Filter</button>
            {!seoIntro && <h1>{isSearch ? (q ? <>Search: &ldquo;{q}&rdquo;</> : 'All Products') : title}</h1>}
            <label className="lst-search"><Icon name="search" size={17} /><input type="search" value={nameQ} onChange={e => setNameQ(e.target.value)} placeholder="Search by product name..." aria-label="Search by product name" /></label>
            <Pick className="lst-sort" label="Sort by" value={sort} options={SORTS} onChange={setSort} />
            <div className="vt">
              <button className={view === 'grid' ? 'on' : ''} onClick={() => changeView('grid')} aria-label="Grid view"><Icon name="grid" size={16} /></button>
              <button className={view === 'list' ? 'on' : ''} onClick={() => changeView('list')} aria-label="List view"><Icon name="list" size={16} /></button>
            </div>
          </div>

          <div className="chips-on">
            {chips.map(c => <span className="chip-on" key={c[0] + c[1]}>{c[2]}<button onClick={() => removeChip(c[0], c[1])} aria-label="Remove"><Icon name="close" size={12} /></button></span>)}
            {chips.length > 0 && <button className="chip-clear" onClick={clearAll}>Clear all</button>}
          </div>

          <div className={'grid g4' + (view === 'list' ? ' list-view' : '')}>
            {results.length
              ? shown.map(p => <ProductCard key={p.id} p={p} detailed qtyNote />)
              : <div className="card oops" style={{ gridColumn: '1/-1' }}>
                  <div className="oops-art"><div className="inner"><Icon name="search" size={64} /></div></div>
                  {base.length
                    ? <><h3>Oops!</h3><p>No product matches these filters.</p><button className="btn btn-brand" onClick={clearAll}>Clear Filters</button></>
                    : <><h3>Coming soon</h3><p>No {title} products are available right now.</p>{cat && <Link prefetch={false} className="btn btn-brand" href={catUrl(cat.slug)}>View All {cat.name}</Link>}</>}
                </div>}
          </div>

          <div className="lst-foot">
            <div className="lst-per"><Pick className="lst-perpick" up label="Products per page" value={per} options={[['20', '20'], ['40', '40'], ['60', '60']]} onChange={setPer} /><span>Showing {results.length ? (page - 1) * perN + 1 : 0}&ndash;{Math.min(page * perN, results.length)} of {results.length} products</span></div>
            <nav className="pagination" aria-label="Pagination">
              {pageCount > 1 && <>
                <button className={page === 1 ? 'faint' : ''} disabled={page === 1} onClick={() => goPage(page - 1)} aria-label="Previous"><Icon name="left" size={14} /></button>
                {pageList(page, pageCount).map((n, i) => n === 0 ? <span key={'e' + i} className="pg-gap" aria-hidden="true">&hellip;</span> : <button key={n} className={n === page ? 'on' : ''} aria-current={n === page ? 'page' : undefined} onClick={() => goPage(n)}>{n}</button>)}
                <button className={page === pageCount ? 'faint' : ''} disabled={page === pageCount} onClick={() => goPage(page + 1)} aria-label="Next"><Icon name="right" size={14} /></button>
              </>}
            </nav>
          </div>

          {!about && cat && !isSearch && !isBrand && results.length > 0 && <section className="cat-guide" aria-label={'Buy ' + seoName}>
            <h2>Buy {seoName} at the Best Price in Bangladesh {new Date().getFullYear()}</h2>
            <p>{seoIntro} {shopName} sells original {seoName} with official warranty, EMI facility and fast delivery to all 64 districts of Bangladesh. Compare specifications, check the latest price and order online or visit our shop.</p>
            {cat.subs.length > 0 && <>
              <h3>{cat.name} Categories Available in Bangladesh</h3>
              <ul className="cg-links">{cat.subs.slice(0, 12).map(s => <li key={s[0]}><Link prefetch={false} href={catUrl(cat.slug, { sub: s[0] })}>{s[0]}</Link></li>)}</ul>
            </>}
            {brandList.length > 1 && <>
              <h3>Popular {seoName} Brands</h3>
              <p>Popular brands for {seoName} in BD include {brandList.slice(0, 8).join(', ')}. Every product comes with the official brand or importer warranty, and our team can help you pick the right model for your budget.</p>
            </>}
            <h3>Important Factors When Buying {seoName}</h3>
            <ul className="cg-points">
              <li><b>Performance</b> &ndash; check the main specification of the model against what you will use it for.</li>
              <li><b>Warranty</b> &ndash; buy only products that carry an official warranty and keep your invoice.</li>
              <li><b>Price</b> &ndash; prices change with the market; the list below shows today&rsquo;s price.</li>
              <li><b>After-sales support</b> &ndash; Munshiganj IT has a service center and hotline for every department.</li>
            </ul>
            <h3>Popular {seoName} Models and Price List</h3>
            <div className="cg-table"><table>
              <thead><tr><th>Product</th><th>Price</th></tr></thead>
              <tbody>{results.slice(0, 10).map(p => <tr key={p.id}><td><Link prefetch={false} href={productUrl(p.id)}>{p.name}</Link></td><td>{money(p.price)}</td></tr>)}</tbody>
            </table></div>
            <h3>{seoName} FAQs</h3>
            <div className="cg-faq">
              <details open><summary>What is the price of {seoName} in Bangladesh?</summary><p>{seoIntro.split(' Buy ')[0]}</p></details>
              <details><summary>Where can I buy original {seoName}?</summary><p>You can buy original {seoName} online from {shopName} or from our shop at Somobay New Market, Chasara, Narayanganj, with official warranty.</p></details>
              <details><summary>Do you deliver outside Narayanganj?</summary><p>Yes. We deliver all over Bangladesh and also offer cash on delivery and EMI on eligible products.</p></details>
            </div>
          </section>}

          {about && <section className="cat-about" aria-label={'About ' + seoName}>
            <h2>About {seoName}</h2>
            <div className="cat-about-body" dangerouslySetInnerHTML={{ __html: about }} />
          </section>}
        </section>
      </div>
    </>
  );
}
