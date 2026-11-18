'use client';
/* =====================================================================
   Listing engine (Category + Search + All/Offers) — StarTech layout.
   Port of ui/assets/js/listing.js. Sidebar filters with live counts,
   sort/show, grid/list, pagination. Swap `products` for an API call later.
   ===================================================================== */
import Link from 'next/link';
import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from 'react';
import { products, categories, catBySlug, site, type Product, type Stock } from '@/lib/data';
import { money, STOCK, catUrl } from '@/lib/format';
import { Icon, Stars, ProductCard, Crumb } from './ui';
import { useStore } from './store';

export interface ListingInitial { q?: string; sub?: string; sub2?: string; brand?: string; stock?: string; deals?: boolean; sort?: string }
export interface ListingProps { mode: 'category' | 'search' | 'all' | 'brand'; catSlug?: string; initial: ListingInitial; hideCrumb?: boolean; /** the description the admin wrote for this category (HTML), shown under the products */ about?: string }

type SetKey = 'stock' | 'brands' | 'subs' | 'cats';
interface Filters { stock: string[]; brands: string[]; subs: string[]; cats: string[]; min: number; max: number; rating: number; sale: boolean; emi: boolean; attrs: Record<string, string[]> }

const SORTS: [string, string][] = [['default', 'Default'], ['price-asc', 'Price (Low > High)'], ['price-desc', 'Price (High > Low)'], ['sold', 'Best Selling'], ['rating', 'Top Rated'], ['discount', 'Biggest Saving']];
const STOCKS: [Stock, string][] = [['in', 'In Stock'], ['preorder', 'Pre Order'], ['upcoming', 'Up Coming'], ['out', 'Out of Stock']];
const uniq = <T,>(a: T[]) => Array.from(new Set(a));
const catName = (slug: string) => catBySlug(slug)?.name ?? slug;

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
  const [per, setPer] = useState('20');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [closed, setClosed] = useState<string[]>([]);
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
  const pass = (p: Product, skip?: string) => (skip === 'stock' || !f.stock.length || f.stock.includes(p.stock)) && (skip === 'brands' || !f.brands.length || f.brands.includes(p.brand)) &&
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
    const r = base.filter(p => pass(p));
    const S: Record<string, (a: Product, b: Product) => number> = {
      'price-asc': (a, b) => a.price - b.price, 'price-desc': (a, b) => b.price - a.price, sold: (a, b) => b.sold - a.sold, rating: (a, b) => b.rating - a.rating,
      discount: (a, b) => (b.old ? b.old - b.price : 0) - (a.old ? a.old - a.price : 0),
    };
    return r.sort(S[sort] || ((a, b) => Number(a.stock === 'out') - Number(b.stock === 'out')));
  }, [base, f, sort]);

  useEffect(() => { setPage(1); }, [f, sort, per]);
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
  const box = (k: string, t: string, body: ReactNode) => (
    <div key={k} className={'fbox' + (closed.includes(k) ? ' closed' : '')} data-f={k}>
      <h4 onClick={() => setClosed(c => (c.includes(k) ? c.filter(x => x !== k) : [...c, k]))}>{t}<Icon name="up" size={16} /></h4>
      <div className="fbody">{body}</div>
    </div>
  );
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
  f.stock.forEach(v => chips.push(['stock', v, STOCK[v as Stock]?.[0] ?? v]));
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
        <h2>{isBrand ? `${seoName} Products Price in Bangladesh` : `${seoName} Price in Bangladesh`}</h2>
        <p>{seoIntro}</p>
      </div></section>}
      {(showTop || kids.length > 0) && <div className="lst-head"><div className="wrap">{showTop && <div className="subcats">
        {isSearch || isBrand
          ? cats.map(c => <button key={c} className={'pill' + (f.cats.includes(c) ? ' on' : '')} onClick={() => toggle('cats', c)}>{catName(c)} <em>({cnt(p => p.cat === c, 'cats')})</em></button>)
          : cat
            ? <>
                <Link prefetch={false} className={'pill' + (sub || initial.brand ? '' : ' on')} href={catUrl(cat.slug)}>All {cat.name} <em>({cat.count})</em></Link>
                {cat.subs.map(s => <Link prefetch={false} key={s[0]} className={'pill' + (sub === s[0] && !initial.sub2 ? ' on' : '')} href={catUrl(cat.slug, { sub: s[0] })}>{s[0]} <em>({s[1]})</em></Link>)}
              </>
            : categories.map(c => <Link prefetch={false} key={c.slug} className="pill" href={catUrl(c.slug)}>{c.name} <em>({c.count})</em></Link>)}
      </div>}{kids.length > 0 && <div className="subcats sub2-row">
        <Link prefetch={false} className={'pill' + (initial.sub2 ? '' : ' on')} href={catUrl(cat!.slug, { sub })}>All {sub} <em>({cat!.subs.find(s => s[0] === sub)?.[1]})</em></Link>
        {kids.map(k => <Link prefetch={false} key={k[0]} className={'pill' + (initial.sub2 === k[0] ? ' on' : '')} href={catUrl(cat!.slug, { sub, sub2: k[0] })}>{k[0]} <em>({k[1]})</em></Link>)}
      </div>}</div></div>}

      <div className="wrap listing">
        <aside className={'filters' + (drawer === 'filters' ? ' open' : '')} aria-label="Filters">
          <div className="row-between f-close" style={{ display: 'none', marginBottom: 6 }}><b>Filters</b><button onClick={closeDrawer} aria-label="Close"><Icon name="close" size={20} /></button></div>
          {box('price', 'Price Range', <>
            <div className="range">
              <div className="track" />
              <div className="fill" style={{ left: (f.min / PMAX) * 100 + '%', right: 100 - (f.max / PMAX) * 100 + '%' }} />
              <input type="range" min={0} max={PMAX} step={500} value={f.min} aria-label="Min price" onChange={e => onRange('min', +e.target.value)} />
              <input type="range" min={0} max={PMAX} step={500} value={f.max} aria-label="Max price" onChange={e => onRange('max', +e.target.value)} />
            </div>
            <div className="price-in">
              <input className="input" value={minTxt} inputMode="numeric" aria-label="Min" onChange={e => setMinTxt(e.target.value)} onBlur={commitPrice} onKeyDown={e => { if (e.key === 'Enter') commitPrice(); }} />
              <input className="input" value={maxTxt} inputMode="numeric" aria-label="Max" onChange={e => setMaxTxt(e.target.value)} onBlur={commitPrice} onKeyDown={e => { if (e.key === 'Enter') commitPrice(); }} />
            </div>
          </>)}
          {box('stock', 'Availability', STOCKS.map(s => ck('stock', s[0], s[1], cnt(p => p.stock === s[0], 'stock'))))}
          {(isSearch || isBrand) && cats.length > 1 && box('cats', 'Category', cats.map(c => ck('cats', c, catName(c), cnt(p => p.cat === c, 'cats'))))}
          {subs.length > 1 && box('subs', cat ? 'Type' : 'Sub Category', subs.map(s => ck('subs', s, s, cnt(p => p.sub === s, 'subs'))))}
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
        </aside>

        <section aria-label="Products">
          <div className="lst-bar">
            <button className="btn btn-line btn-sm fbtn" onClick={() => openDrawer('filters')}><Icon name="filter" size={15} />Filter</button>
            <h1>{isSearch ? (q ? <>Search: “{q}”</> : 'All Products') : title}</h1>
            <span className="count">(Showing {results.length ? (page - 1) * perN + 1 : 0}–{Math.min(page * perN, results.length)} of {results.length} products)</span>
            <div className="tools">
              <label htmlFor="per">Show:</label>
              <select className="select" id="per" value={per} onChange={e => setPer(e.target.value)}>{['4', '8', '20', '40'].map(n => <option key={n}>{n}</option>)}</select>
              <label htmlFor="sort">Sort By:</label>
              <select className="select" id="sort" value={sort} onChange={e => setSort(e.target.value)}>{SORTS.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>
              <div className="vt">
                <button className={view === 'grid' ? 'on' : ''} onClick={() => changeView('grid')} aria-label="Grid view"><Icon name="grid" size={16} /></button>
                <button className={view === 'list' ? 'on' : ''} onClick={() => changeView('list')} aria-label="List view"><Icon name="list" size={16} /></button>
              </div>
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

          <nav className="pagination" aria-label="Pagination">
            {pageCount > 1 && <>
              <button className={page === 1 ? 'faint' : ''} disabled={page === 1} onClick={() => goPage(page - 1)} aria-label="Previous"><Icon name="left" size={14} /></button>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map(n => <button key={n} className={n === page ? 'on' : ''} onClick={() => goPage(n)}>{n}</button>)}
              <button className={page === pageCount ? 'faint' : ''} disabled={page === pageCount} onClick={() => goPage(page + 1)} aria-label="Next"><Icon name="right" size={14} /></button>
            </>}
            {pageCount > 1 && <span className="pg-info">Page {page} of {pageCount}</span>}
          </nav>

          {about && <section className="cat-about" aria-label={'About ' + seoName}>
            <h2>About {seoName}</h2>
            <div className="cat-about-body" dangerouslySetInnerHTML={{ __html: about }} />
          </section>}
        </section>
      </div>
    </>
  );
}
