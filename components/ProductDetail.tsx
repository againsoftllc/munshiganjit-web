'use client';
/* Product detail page — port of ui/product.html (inline script). */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type FormEvent, type MouseEvent, type ReactNode } from 'react';
import { visibleProducts as products, productBanners, byId, catBySlug, detailsOf, site, type Hue, type Product, type ProductBanner } from '@/lib/data';
import { money, STOCK, productUrl, catUrl } from '@/lib/format';
import { Icon, Art, ProductImg, Stars, Crumb, Modal, useCompareToggle } from './ui';
import { useStore } from './store';
import { ApiError, askQuestion, getToken, writeReview } from '@/lib/api';
import PartnerPrice from './PartnerPrice';
import OfferCountdown from './OfferCountdown';
import { applySelection, defaultSelection, matchCombo, optionState, resolveMedia, variantsOf, videoOf, type Selection } from '@/lib/variants';

const HUE_ORDER: Hue[] = ['blue', 'orange', 'navy', 'slate'];
/* "2 weeks ago" style age of a review */
const ago = (iso: string) => {
  const days = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86400000));
  if (days < 1) return 'today';
  if (days < 14) return days + (days === 1 ? ' day ago' : ' days ago');
  if (days < 60) return Math.floor(days / 7) + ' weeks ago';
  if (days < 365) return Math.floor(days / 30) + ' months ago';
  const y = Math.floor(days / 365); return y + (y === 1 ? ' year ago' : ' years ago');
};
type Tab = 'spec' | 'desc' | 'qa' | 'rv';

export default function ProductDetail({ id }: { id: string }) {
  const p = byId(id) as Product;
  const cat = catBySlug(p.cat);
  const det = detailsOf(p.id);
  const catName = cat?.name ?? p.cat;
  const { addAndOpen, toast, wish, toggleWish, compare, customer } = useStore();
  const router = useRouter();
  // the promo banner under the gallery: the one for this very product, else its brand, else its category, else the general one; only inside its dates
  const pickBanner = (): ProductBanner | null => {
    const now = Date.now();
    const rank = { product: 0, brand: 1, category: 2, all: 3 } as const;
    const hit = productBanners.filter(b => (!b.startsAt || Date.parse(b.startsAt) <= now) && (!b.endsAt || Date.parse(b.endsAt) >= now)
      && (b.scope === 'all'
        || (b.scope === 'product' && !!p.uid && !!b.products?.includes(p.uid))
        || (b.scope === 'brand' && !!b.brands?.some(x => x.toLowerCase() === p.brand.toLowerCase()))
        || (b.scope === 'category' && !!b.cats?.some(c => c.cat === p.cat && (!c.sub || c.sub === p.sub) && (!c.sub2 || c.sub2 === p.sub2)))));
    return hit.sort((a, b) => rank[a.scope] - rank[b.scope])[0] ?? null;
  };
  const [banner, setBanner] = useState<ProductBanner | null>(pickBanner);
  useEffect(() => { const t = setInterval(() => setBanner(pickBanner()), 30000); setBanner(pickBanner()); return () => clearInterval(t); }, [p.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const cmp = useCompareToggle();

  const hues = [p.hue, ...HUE_ORDER.filter(h => h !== p.hue)].slice(0, 4);
  const [hue, setHue] = useState<Hue>(hues[0]);
  const [color, setColor] = useState(p.colors ? p.colors[0] : null);
  const [pay, setPay] = useState<'cash' | 'emi'>('cash');
  // Variants (colour / size / storage ...), like excellent-web: picking an option swaps the gallery and video, the price, the stock and the code for
  // that variant's. A product without variants passes straight through.
  const { groups, combos } = variantsOf(p.id);
  const hasVar = combos.length > 0;
  const [sel, setSel] = useState<Selection>(() => (hasVar ? defaultSelection(combos) : {}));
  const [touched, setTouched] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const active = hasVar ? matchCombo(combos, sel) : undefined;
  // the gallery: the photos the admin set (else the thumbnail) and, when there is one, the video (a YouTube link or a file), in front of the
  // photos when the admin put it first. The page opens on the video when it comes first (muted, as browsers require); a video the visitor
  // picks plays with sound.
  const gd = detailsOf(p.id);
  const own = { images: p.image ? (gd.gallery?.length ? gd.gallery : [p.image]) : [], ...(() => { const v = videoOf(gd.videos); return { videoId: v.id, videoUrl: v.url }; })(), videoFirst: gd.videoFirst };
  const media = hasVar ? resolveMedia(groups, combos, sel, own) : own;
  const photos = p.image ? (media.images.length ? media.images : [p.image]) : [];
  const video = { id: media.videoId, url: media.videoUrl };
  const hasVideo = Boolean(video.id || video.url);
  const slots: ({ kind: 'img'; src: string } | { kind: 'video' })[] = photos.map(src => ({ kind: 'img' as const, src }));
  if (hasVideo) slots.splice(media.videoFirst ? 0 : slots.length, 0, { kind: 'video' });
  const [slotAt, setActive] = useState(0);
  const [chosen, setChosen] = useState(false);
  // a new set of photos starts again at the first one (after a pick: at the first photo even when a video comes first)
  const mediaKey = photos.join('|') + '#' + (video.id ?? video.url ?? '') + '#' + (media.videoFirst ? 1 : 0);
  const [seenKey, setSeenKey] = useState(mediaKey);
  if (seenKey !== mediaKey) { setSeenKey(mediaKey); setActive(touched ? Math.max(0, slots.findIndex(x => x.kind === 'img')) : 0); setChosen(false); }
  const active_ = Math.min(slotAt, Math.max(0, slots.length - 1));
  const slot = slots[active_] ?? slots[0];
  const onVideo = slot?.kind === 'video';
  const pick = (groupKey: string, optionId: string) => { setTouched(true); setSel(prev => applySelection(groups, combos, prev, groupKey, optionId)); };
  const [qty, setQty] = useState('1');
  const [tab, setTab] = useState<Tab>('spec');
  const [modal, setModal] = useState<'ask' | 'rv' | null>(null);
  const specTabRef = useRef<HTMLButtonElement>(null);
  const closeModal = useCallback(() => setModal(null), []);

  const cash = active ? active.price : color ? color[2] : p.price;
  // what the page says about the stock: the picked variant's when it has options
  const stockNow = active && (p.stock === 'in' || p.stock === 'out') ? (active.inStock ? 'in' : 'out') : p.stock;
  // card/EMI price (StarTech model): worked from the regular cash price, so a live offer lowers the cash price but never the EMI price
  const base = p.regular ?? p.price;
  const regular = Math.round(((cash + (base - p.price)) * 1.05) / 50) * 50;
  const oldP = p.old ? p.old + (cash - p.price) : null;
  const q = Math.max(1, Math.min(10, +qty || 1));

  const STOCKLINE = p.discontinued ? ['out', 'xCircle', <><b>Discontinued</b> — this product is no longer available</>] as [string, string, ReactNode] : {
    in: ['in', 'checkCircle', <><b>In Stock</b> — {active && active.stock > 0 ? active.stock : p.qty} units available now</>],
    preorder: ['pre', 'calendar', <><b>Pre Order</b> — pay ৳5,000 advance, ships in 7–10 days</>],
    upcoming: ['up', 'bell', <><b>Up Coming</b> — arriving soon. Tap Notify Me to get an SMS.</>],
    out: ['out', 'xCircle', <><b>Out of Stock</b> — restock expected in 2–3 weeks</>],
  }[stockNow] as [string, string, ReactNode];

  const sim = products.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 4);

  const add = (mode: 'add' | 'buy') => {
    if (hasVar) {
      if (!active) { toast('Please choose an option', 'info'); pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
      addAndOpen(p.id, mode, q, active.label, true, active.variantId);
      return;
    }
    addAndOpen(p.id, mode, q, color ? color[0] : null);
  };
  // scroll to a section so that its top sits just under the sticky header (the header stays on screen, so it must not cover the section)
  // Write a Review needs an account: a visitor goes to the sign-in page and comes back to this product with the review form open
  const openReview = () => {
    if (!customer) {
      toast('Please sign in to write a review', 'info');
      router.push('/login?next=' + encodeURIComponent(productUrl(p.id) + '?review=1'));
      return;
    }
    setModal('rv');
  };
  const openAsk = () => {
    if (!customer) {
      toast('Please sign in to ask a question', 'info');
      router.push('/login?next=' + encodeURIComponent(productUrl(p.id) + '?ask=1'));
      return;
    }
    setModal('ask');
  };
  // back from the sign-in page (?review=1 / ?ask=1): the form is open
  useEffect(() => {
    if (!customer || typeof location === 'undefined') return;
    const q = new URLSearchParams(location.search);
    const want = q.get('review') === '1' ? 'rv' : q.get('ask') === '1' ? 'ask' : null;
    if (!want) return;
    q.delete('review'); q.delete('ask');
    history.replaceState(null, '', location.pathname + (q.toString() ? '?' + q : '') + location.hash);
    setModal(want);
    document.getElementById(want === 'rv' ? 'pd-rv' : 'pd-qa')?.scrollIntoView({ block: 'center' });
  }, [customer, p.id]);
  const goTab = (t: Tab) => {
    setTab(t);
    const el = document.getElementById('pd-' + t); if (!el) return;
    const hdr = document.querySelector('header.hdr') as HTMLElement | null;
    const covered = hdr ? Math.max(0, hdr.offsetHeight + (parseFloat(getComputedStyle(hdr).top) || 0)) : 0;
    window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - covered - 14), behavior: 'smooth' });
  };
  const gotoSpec = (e: MouseEvent) => { e.preventDefault(); goTab('spec'); };
  // the tab of the section being read is the active one
  useEffect(() => {
    const ids: Tab[] = ['spec', 'desc', 'qa', 'rv'];
    const els = ids.map(t => document.getElementById('pd-' + t)).filter((e): e is HTMLElement => !!e);
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(es => {
      const vis = es.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setTab(vis.target.id.slice(3) as Tab);
    }, { rootMargin: '-20% 0px -70% 0px' });
    els.forEach(e => io.observe(e));
    return () => io.disconnect();
  }, [p.id]);
  const [sending, setSending] = useState(false);
  const field = (e: FormEvent<HTMLFormElement>, id: string) => ((e.currentTarget.elements.namedItem(id) as HTMLInputElement | null)?.value || '').trim();
  const sendQuestion = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget, name = customer?.name || field(e, 'an') || 'Customer';
    setSending(true);
    try { await askQuestion(p.id, name, field(e, 'aq'), getToken()); setModal(null); toast('Question sent. We will answer it here soon.'); form.reset(); }
    catch (er) { toast(er instanceof ApiError ? er.message : 'Could not send your question', 'alert'); } finally { setSending(false); }
  };
  const sendReview = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget, name = customer?.name || field(e, 'rn') || 'Customer';
    setSending(true);
    try { await writeReview(p.id, name, Number(field(e, 'rr')) || 5, field(e, 'rvb'), getToken()); setModal(null); toast('Thanks! Your review is pending approval.'); form.reset(); }
    catch (er) { toast(er instanceof ApiError ? er.message : 'Could not send your review', 'alert'); } finally { setSending(false); }
  };
  const copy = () => { try { void navigator.clipboard.writeText(location.href); } catch { /* ignore */ } toast('Link copied', 'copy'); };
  const shareUrl = () => (typeof window === 'undefined' ? '' : location.href);

  return (
    <>
      <div className="pd-white">
      <Crumb items={[[catName, catUrl(p.cat)] as [string, string?]].concat(p.sub === catName ? [[p.brand, catUrl(p.cat, { brand: p.brand })]] : [[p.sub, catUrl(p.cat, { sub: p.sub })]]).concat(p.sub2 ? [[p.sub2, catUrl(p.cat, { sub: p.sub, sub2: p.sub2 })]] : []).concat([[p.name.split(' ').slice(0, 6).join(' ')]])} />
      {/* the top part (share bar, pictures, price, buy) is on white; the sections below are on the page background */}
      <div className="wrap pdp">
        {/* share / save / compare bar */}
        <div className="pd-bar">
          <div className="share">Share:{' '}
            <a href="#" aria-label="Facebook" onClick={e => { e.preventDefault(); window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(shareUrl()), '_blank', 'noopener'); }}><Icon name="facebook" size={18} /></a>
            <a href="#" aria-label="WhatsApp" onClick={e => { e.preventDefault(); window.open('https://wa.me/?text=' + encodeURIComponent(p.name + ' ' + shareUrl()), '_blank', 'noopener'); }}><Icon name="whatsapp" size={18} /></a>
            <button onClick={copy} aria-label="Copy link"><Icon name="copy" size={17} /></button>
          </div>
          <div className="acts">
            <button className={wish.includes(p.id) ? 'on' : ''} onClick={() => toast(toggleWish(p.id) ? 'Saved to wishlist' : 'Removed from wishlist', 'heart')}><Icon name="heart" size={18} />Save</button>
            <button className={compare.includes(p.id) ? 'on' : ''} onClick={() => cmp(p.id)}><Icon name="compare" size={18} />Add to Compare</button>
          </div>
        </div>

        <section className="pd-top">
          <div>
            <div className={'gal-main' + (onVideo ? ' is-video' : '')}>
              <span className="pc-flags">
                {p.emi && <span className="flag emi">0% EMI</span>}
              </span>
              {onVideo
                ? (video.id
                  ? <iframe className="gal-video" src={`https://www.youtube-nocookie.com/embed/${video.id}?rel=0&autoplay=1&playsinline=1${chosen ? '' : '&mute=1'}`} title={p.name + ' video'} allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen />
                  : <video className="gal-video" src={video.url} controls autoPlay muted={!chosen} playsInline preload="auto" />)
                : p.image
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img className="art-svg pimg" src={slot?.kind === 'img' ? slot.src : p.image} alt={p.name} width={420} height={420} loading="eager" decoding="async" />
                  : <Art kind={p.art} hue={hue} size={380} />}
            </div>
            {/* a product with a single picture (and no video) shows no thumbnail strip */}
            {(p.image ? slots.length > 1 : hues.length + (hasVideo ? 1 : 0) > 1) && <div className="gal-thumbs">
              {p.image
                ? slots.map((s, i) => s.kind === 'img'
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <button key={s.src} className={i === active_ ? 'on' : ''} aria-label={'Image ' + (i + 1)} onClick={() => setActive(i)} onMouseEnter={() => setActive(i)}><img className="art-svg pimg" src={s.src} alt="" width={56} height={56} loading="eager" decoding="async" /></button>
                  : <button key="video" className={'vid' + (i === active_ ? ' on' : '')} aria-label="Play video" onClick={() => { setChosen(true); setActive(i); }}><Icon name="play" size={22} />Video</button>)
                : <>
                    {hues.map((h, i) => <button key={h} className={h === hue ? 'on' : ''} aria-label={'Image ' + (i + 1)} onClick={() => setHue(h)}><Art kind={p.art} hue={h} size={50} /></button>)}
                    {hasVideo && <button className={'vid' + (onVideo ? ' on' : '')} aria-label="Play video" onClick={() => { setChosen(true); setActive(slots.findIndex(s => s.kind === 'video')); }}><Icon name="play" size={22} />Video</button>}
                  </>}
            </div>}
            {banner && (/^https?:\/\//.test(banner.href)
              // eslint-disable-next-line @next/next/no-img-element
              ? <a className="pd-promo" href={banner.href} target="_blank" rel="noopener"><img src={banner.image} alt={banner.alt} loading="lazy" /></a>
              : banner.href
                // eslint-disable-next-line @next/next/no-img-element
                ? <Link prefetch={false} className="pd-promo" href={banner.href}><img src={banner.image} alt={banner.alt} loading="lazy" /></Link>
                // eslint-disable-next-line @next/next/no-img-element
                : <div className="pd-promo"><img src={banner.image} alt={banner.alt} loading="lazy" /></div>)}
          </div>

          <div>
            <h1 className="pd-title notranslate" translate="no">{p.name}</h1>
            <div className="info-pills">
              <span>Price: <b>{money(cash)}</b>{oldP && <s>{money(oldP)}</s>}</span>
              <span>Regular Price: <b>{money(regular)}</b></span>
              <span>Status: <b>{p.discontinued ? 'Discontinued' : STOCK[stockNow][0]}</b></span>
              <span>Product Code: <b>{10000 + (base % 89999)}</b></span>
              <span>Brand: <b>{p.brand}</b></span>
            </div>
            <h3 className="pd-h">Key Features</h3>
            <ul className="keyf"><li>Model: {p.model}</li>{p.specs.map(s => <li key={s}>{s}</li>)}</ul>
            <a className="view-more" href="#spec" onClick={gotoSpec}>View More Info</a>

            {hasVar && <div ref={pickerRef}>{groups.map(g => {
              const picked = g.options.find(o => o.id === sel[g.key]);
              return (
                <div key={g.key}>
                  <h3 className="pd-h">{g.label}: <span className="muted" style={{ fontSize: 14, fontFamily: 'Inter' }}>{picked ? picked.label : 'choose one'}</span></h3>
                  <div className="color-btns">
                    {g.options.map(o => {
                      const st = optionState(combos, sel, g.key, o.id);
                      return (
                        <button key={o.id} className={st === 'selected' ? 'on' : ''} disabled={st === 'disabled'} title={o.label} aria-pressed={st === 'selected'} onClick={() => pick(g.key, o.id)}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {o.swatch && <img className="vswatch" src={o.swatch} alt="" width={24} height={24} loading="lazy" decoding="async" />}{o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}</div>}

            {p.colors && color && <>
              <h3 className="pd-h">Color: <span className="muted" style={{ fontSize: 14, fontFamily: 'Inter' }}>{color[0]} — price varies by color</span></h3>
              <div className="color-btns">
                {p.colors.map(c => <button key={c[0]} className={c === color ? 'on' : ''} onClick={() => { setColor(c); setHue(hues[0]); }}><i style={{ background: c[1] }} />{c[0]}</button>)}
              </div>
            </>}

            {p.offerEnds && <OfferCountdown end={p.offerEnds} label="Discount Offer Ends in" />}
            <h3 className="pd-h">Payment Options</h3>
            <div className="pay-opts">
              <label className="pay-opt">
                <input type="radio" name="pay" value="cash" checked={pay === 'cash'} onChange={() => setPay('cash')} />
                <span><b>{money(cash)}{oldP && <s>{money(oldP)}</s>}</b><small>Cash Discount Price</small><small>Online / Cash Payment</small></span>
              </label>
              <label className="pay-opt">
                <input type="radio" name="pay" value="emi" checked={pay === 'emi'} onChange={() => setPay('emi')} />
                <span><b>{money(Math.round(regular / 12))}/month</b><small>Regular Price: {money(regular)}</small><small>{p.emi ? '0% EMI for up to 12 Months' : 'Card payment'}</small></span>
              </label>
            </div>

            <PartnerPrice key={p.id} p={p} />

            <div className={'stock-line ' + STOCKLINE[0]}><Icon name={STOCKLINE[1]} size={18} /><span>{STOCKLINE[2]}</span></div>

            <div className="buy-row">
              {p.discontinued ? <button className="btn btn-line" disabled><Icon name="xCircle" size={17} />Discontinued</button>
              : stockNow === 'in' || stockNow === 'preorder' ? <>
                <div className="qty">
                  <button aria-label="Less" onClick={() => setQty(String(Math.max(1, q - 1)))}><Icon name="minus" size={16} /></button>
                  <input value={qty} inputMode="numeric" aria-label="Quantity" onChange={e => setQty(e.target.value)} onBlur={() => setQty(String(q))} />
                  <button aria-label="More" onClick={() => setQty(String(Math.min(10, q + 1)))}><Icon name="plus" size={16} /></button>
                </div>
                <button className="btn pd-buy" onClick={() => add('buy')}><Icon name="bolt" size={17} />{p.stock === 'preorder' ? 'Pre Order Now' : 'Buy Now'}</button>
                <button className="btn pd-add" onClick={() => add('add')}><Icon name="cart" size={17} />Add to Cart</button>
              </> : <>
                <button className="btn btn-line" onClick={() => toast('We will SMS you when it is available', 'bell')}><Icon name="bell" size={17} />Notify Me</button>
                <a className="btn btn-wa" target="_blank" rel="noopener" href={'https://wa.me/' + site.whatsapp + '?text=' + encodeURIComponent('When will ' + p.name + ' be available?')}><Icon name="whatsapp" size={17} />Ask on WhatsApp</a>
              </>}
            </div>
          </div>
        </section>
      </div></div>

      <div className="wrap pdp">
        <div className="pd-low">
          <div data-tabs="">
            <div className="tabs-nav">
              <button ref={specTabRef} className={tab === 'spec' ? 'on' : ''} data-tab="spec" onClick={() => goTab('spec')}>Specification</button>
              <button className={tab === 'desc' ? 'on' : ''} data-tab="desc" onClick={() => goTab('desc')}>Description</button>
              <button className={tab === 'qa' ? 'on' : ''} data-tab="qa" onClick={() => goTab('qa')}>Questions ({det.qa.length})</button>
              <button className={tab === 'rv' ? 'on' : ''} data-tab="rv" onClick={() => goTab('rv')}>Reviews ({p.reviews})</button>
            </div>

            <div className={'pd-panel' + (tab === 'spec' ? ' on' : '')} data-pane="spec" id="pd-spec">
              <h3>Specification</h3>
              <table className="spec"><tbody>
                <tr className="g"><td colSpan={2}>Basic Information</td></tr>
                <tr><td>Brand</td><td>{p.brand}</td></tr>
                <tr><td>Model</td><td>{p.model}</td></tr>
                {p.colors && <tr><td>Color</td><td>{p.colors.map(c => c[0] + ' (' + money(c[2]) + ')').join(', ')}</td></tr>}
                {det.specs.map(g => [
                  <tr key={g.g + '-gap'} className="gap"><td colSpan={2} /></tr>,
                  <tr key={g.g + '-h'} className="g"><td colSpan={2}>{g.g}</td></tr>,
                  ...g.r.map((r, i) => <tr key={g.g + i}><td>{r[0]}</td><td>{r[1]}</td></tr>),
                ])}
                <tr className="gap"><td colSpan={2} /></tr>
                <tr className="g"><td colSpan={2}>Warranty</td></tr>
                <tr><td>Warranty Details</td><td>{det.warranty}</td></tr>
              </tbody></table>
            </div>

            <div className={'pd-panel' + (tab === 'desc' ? ' on' : '')} data-pane="desc" id="pd-desc">
              <h3>Description</h3>
              <div className="prose" dangerouslySetInnerHTML={{ __html: det.desc }} />
            </div>

            {cash > 0 && <div className="pd-panel pd-faq" data-pane="faq">
              <h3>What is the price of {p.name} in Bangladesh?</h3>
              <p>The latest price of {p.name} in Bangladesh is <b>{money(cash)}</b>. You can buy the {p.name} at best price from our website or visit any of our showrooms.</p>
            </div>}

            <div className={'pd-panel' + (tab === 'qa' ? ' on' : '')} data-pane="qa" id="pd-qa">
              <div className="row-between" style={{ marginBottom: 6 }}>
                <div><h3 style={{ fontSize: 20, fontWeight: 500 }}>Questions ({det.qa.length})</h3><p className="muted sm">Have question about this product? Get specific details about this product from expert.</p></div>
                <button className="btn btn-line-brand btn-sm" onClick={openAsk}>Ask Question</button>
              </div>
              {det.qa.length ? det.qa.map((x, i) => <div className="qa" key={i}><p><i>Q</i>{x[0]}</p><p><i>A</i>{x[1]}</p></div>)
                : <div className="pd-empty"><span><Icon name="chat" size={30} /></span><p>There are no questions asked yet. Be the first one to ask a question.</p></div>}
            </div>

            <div className={'pd-panel' + (tab === 'rv' ? ' on' : '')} data-pane="rv" id="pd-rv">
              <div className="row-between" style={{ marginBottom: 16 }}>
                <div><h3 style={{ fontSize: 20, fontWeight: 500 }}>Reviews ({p.reviews})</h3><p className="muted sm">Get specific details about this product from customers who own it.</p></div>
                <button className="btn btn-line-brand btn-sm" onClick={openReview}>Write a Review</button>
              </div>
              {p.reviews ? <>
                <div className="rv-sum">
                  <div className="big"><b>{p.rating}</b><Stars rating={p.rating} size={16} /><span>{p.reviews} reviews</span></div>
                  <div className="bars">
                    {[5, 4, 3, 2, 1].map(star => { const n = det.rv.filter(r => r.r === star).length; return <div key={star}><span>{star} ★</span><i style={{ '--w': (det.rv.length ? Math.round((n / det.rv.length) * 100) : 0) + '%' } as CSSProperties} /><span>{n}</span></div>; })}
                  </div>
                  <div />
                </div>
                {det.rv.map((r, i) => (
                  <div className="review" key={i}>
                    <div className="rt">
                      <span className="av">{r.n[0]}</span>
                      <div><b>{r.n}</b><div><Stars rating={r.r} size={13} />{r.v && <> <span className="verified"><Icon name="checkCircle" size={12} />Verified</span></>}</div></div>
                      <span className="d">{ago(r.d)}</span>
                    </div>
                    <p>{r.t}</p>
                  </div>
                ))}
              </> : <div className="pd-empty"><span><Icon name="star" size={30} /></span><p>This product has no reviews yet. Be the first one to write a review.</p></div>}
            </div>
          </div>

          <aside className="similar">
            <h3>Similar Product</h3>
            <div>
              {sim.map(s => (
                <div className="sim" key={s.id}>
                  <Link prefetch={false} className="si" href={productUrl(s.id)}><ProductImg p={s} size={64} /></Link>
                  <div>
                    <Link prefetch={false} className="n" href={productUrl(s.id)}>{s.name}</Link>
                    <b>{money(s.price)}{s.old ? <s>{money(s.old)}</s> : null}</b>
                    <button onClick={() => cmp(s.id)}><Icon name="compare" size={13} />Add to Compare</button>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      <Modal open={modal === 'ask'} onClose={closeModal} title="Ask Question">
        <form className="modal-body rq-form" onSubmit={sendQuestion}>
          <div className="field"><label>Product</label><input className="input" value={p.name} readOnly aria-readonly="true" /></div>
          {customer?.email ? <div className="field"><label>Your E-Mail</label><input className="input" value={customer.email} readOnly aria-readonly="true" /></div> : null}
          <div className="field"><label htmlFor="aq">Your Question <span className="req">*</span></label><textarea className="textarea" id="aq" required minLength={10} placeholder="Your Question" /></div>
          <button className="btn btn-brand btn-block btn-lg" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Submit'}</button>
        </form>
      </Modal>
      <Modal open={modal === 'rv'} onClose={closeModal} title="Write Review">
        <form className="modal-body rq-form" onSubmit={sendReview}>
          <div className="field"><label>Product</label><input className="input" value={p.name} readOnly aria-readonly="true" /></div>
          <div className="field"><label>Rating <span className="req">*</span></label>
            <div className="rq-rate"><span>Bad</span>{[1, 2, 3, 4, 5].map(n => <input key={n} type="radio" name="rr" value={n} defaultChecked={n === 5} required aria-label={n + ' out of 5'} />)}<span>Good</span></div>
          </div>
          <div className="field"><label htmlFor="rvb">Your Review <span className="req">*</span></label><textarea className="textarea" id="rvb" required minLength={5} placeholder="Your Review" /></div>
          <button className="btn btn-brand btn-block btn-lg" type="submit" disabled={sending}>{sending ? 'Sending…' : 'Submit'}</button>
        </form>
      </Modal>
    </>
  );
}
