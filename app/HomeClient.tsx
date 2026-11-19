'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { shareExperience } from '@/lib/api';
import { visibleProducts as P, categories, brands, reviews, REVIEW_TOPICS, spotlightCategories, homeRails, seoText, type Category } from '@/lib/data';
import { boldParts, linkParts, homeLabel, type HomeId } from '@/lib/home';
import { safeHtml, inlineHtml, isHtml } from '@/lib/html';
import EmbedLiveEditSection, { LiveEditChrome } from '@/components/live-edit/LiveEditSection';
import { useLiveEdit, useHomeCfg } from '@/components/live-edit/EmbedLiveEdit';
import { initials, catUrl } from '@/lib/format';
import { Icon, PImg, ProductImg, Art, Stars, Modal, StarInput } from '@/components/ui';
import { useStore } from '@/components/store';
import FeaturedCats from '@/components/FeaturedCats';
import HeroBanners, { SideBanners } from '@/components/HeroBanners';
import FlashSale from '@/components/FlashSale';
import { BrandStrip } from '@/components/BrandStrip';
import { ProductRow, ShopByCategory } from '@/components/HomeRails';

/* The Offer strip follows its offer: shown from the offer's start to its end (the API also hides it when the offer is off or deleted).
   Checked again here with the visitor's clock, so it disappears the minute the offer ends without a reload. */
function TimedStrip({ hidden, from, until, always, children }: { hidden: boolean; from: string; until: string; always: boolean; children: ReactNode }) {
  const [on, setOn] = useState(!hidden);
  useEffect(() => {
    const f = from ? Date.parse(from) : NaN, u = until ? Date.parse(until) : NaN;
    const check = () => { const now = Date.now(); setOn(!hidden && !(f > now) && !(u < now)); };
    check();
    const next = [f, u].filter(t => t > Date.now()).sort((a, b) => a - b)[0];
    if (!next || next - Date.now() > 2147000000) return;
    const t = setTimeout(check, next - Date.now() + 500);
    return () => clearTimeout(t);
  }, [hidden, from, until]);
  return <>{always || on ? children : null}</>;
}

/* StarTech-style centred section heading */
function CenterHead({ title, sub, link }: { title: string; sub: string; link?: string }) {
  return (
    <div className="ch">
      <h2>{title}</h2>
      <p>{sub}</p>
      {link && <Link prefetch={false} className="ch-link" href={link}>View All <Icon name="arrow" size={14} /></Link>}
    </div>
  );
}

/* Featured Category tile: a product photo of the category instead of an icon (client doc point 21) */
export function CatTile({ c, i, image, name }: { c: Category; i: number; /** a picture uploaded in Live Edit, instead of a product photo */ image?: string; name?: string }) {
  const inCat = P.filter(p => p.cat === c.slug);
  const pic = inCat.find(p => p.image) ?? inCat[0];
  return (
    <Link prefetch={false} className={'fcat-tile fc-c' + (i % 6)} href={catUrl(c.slug)}>
      <span className="fcat-ic fcat-pic">{image ? <img src={image} alt="" width={44} height={44} style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" /> : pic ? <ProductImg p={pic} size={44} /> : <Art kind={c.art || 'gadget'} hue="blue" size={44} />}</span>
      <b>{name || c.name}</b>{c.count > 0 && <span>{c.count} products</span>}
    </Link>
  );
}

/* "26 Oct 2026, 03:20 PM" in Dhaka time */
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' });

export function ReviewCard({ r }: { r: (typeof reviews)[number] }) {
  return (
    <div className="voice rv-card">
      <div className="row-between"><Stars rating={r.rating} size={14} /><span className="tag type">{r.topic}</span></div>
      <p>“{r.text}”</p>
      <div className="who"><span className="av">{initials(r.name)}</span><div><b>{r.name}</b><span>{r.area}</span></div></div>
      <time className="rv-time" dateTime={r.at}><Icon name="clock" size={12} />{when(r.at)}</time>
    </div>
  );
}

export default function HomeClient({ h1 }: { h1?: string }) {
  const { toast } = useStore();
  const [shareOpen, setShareOpen] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);
  const [seoOpen, setSeoOpen] = useState(false);
  const rvRail = useRef<HTMLDivElement>(null);
  const rvPaused = useRef(false);

  // latest reviews scroll on their own (pause on hover)
  useEffect(() => {
    const t = setInterval(() => {
      const el = rvRail.current; if (!el || rvPaused.current || !el.firstElementChild) return;
      const step = (el.firstElementChild as HTMLElement).offsetWidth + 16;
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: step, behavior: 'smooth' });
    }, 3500);
    return () => clearInterval(t);
  }, []);

  const closeShare = () => { setShareOpen(false); setTopic(null); };
  const [sharing, setSharing] = useState(false);
  const submitShare = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget, fd = new FormData(form);
    setSharing(true);
    try {
      await shareExperience({ name: String(fd.get('name') || ''), area: String(fd.get('area') || ''), topic: topic || '', rating: Number(fd.get('r') || 5), text: String(fd.get('text') || ''), website: String(fd.get('website') || '') });
      closeShare();
      toast('Thank you! Your experience will appear after review.', 'heart');
      form.reset();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not send your experience. Please try again.', 'info');
    } finally {
      setSharing(false);
    }
  };
  const latest = reviews.slice().sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

  const le = useLiveEdit();
  const cfg = useHomeCfg();
  const rails = cfg.rails ? cfg.rails.filter(r => !r.hidden) : homeRails;
  const seo = cfg.seo ?? { title: seoText.title, paragraphs: null as string[] | null, html: '' };
  const viewAll = /^(View All)(.*)$/.exec(cfg.cx.viewAll);
  // Shop by Brand: the brands picked in Live Edit (by name), else every brand
  const brandList = cfg.brands.items
    ? cfg.brands.items.filter(it => !it.hidden).map(it => brands.find(b => b[0] === it.name)).filter((b): b is [string, number] => !!b)
    : undefined;
  // Featured Category tiles: the ones picked in Live Edit, else every main-menu category
  const featured = cfg.featured.items
    ? cfg.featured.items.filter(it => !it.hidden).map(it => ({ c: categories.find(c => c.slug === it.slug), it })).filter((x): x is { c: Category; it: NonNullable<typeof x.it> } => !!x.c)
    : categories.map(c => ({ c, it: null }));

  /* every section of the home page; the order and which are hidden come from Live Edit (cfg.layout) */
  const sections: Record<HomeId, ReactNode> = {
    /* Hero band: Daraz slider + side banners */
    hero: (
      <section className="band tint">
        <div className="wrap">
          <section className="hero" style={{ paddingTop: 0 }}>
            <HeroBanners slides={cfg.slides.filter(s => !s.hidden)} autoplayMs={cfg.heroMs} />
            <LiveEditChrome id="hero-cards" label="hero side banners"><SideBanners banners={cfg.side.filter(s => !s.hidden)} /></LiveEditChrome>
          </section>
        </div>
      </section>
    ),
    // "10.10 Mega Sale" strip and News ticker removed from the home page
    strip: null,
    ticker: null,
    /* Featured Category — all main-menu categories, product photos instead of icons */
    featured: (
      <section className="band tint" id="featured">
        <div className="wrap">
          <FeaturedCats />
        </div>
      </section>
    ),
    // "Shop by Brand" section removed from the home page
    brands: null,
    /* only while a sale is live */
    flash: <FlashSale />,
    /* New Arrival, Top Sales (+ any admin-added rows) — same size as Flash Sale */
    rails: <>{rails.map(r => <ProductRow key={r.title} {...r} />)}</>,
    spotlight: <ShopByCategory slugs={cfg.spotlight.slugs ?? spotlightCategories} tabs={cfg.spotlight.tabs} title={cfg.spotlight.title} />,
    quick: (
      <section className="band">
        <div className="wrap">
          <div className="qs-grid qs6">
            {cfg.quick.filter(q => !q.hidden).map(q => <Link prefetch={false} key={q.title} className="qs-card" href={q.href}><span className="qs-ic"><Icon name={q.icon} size={22} /></span><span><b>{q.title}</b><span>{q.sub}</span></span></Link>)}
          </div>
        </div>
      </section>
    ),
    /* Customer Experience — share box + latest reviews scrolling with date & time */
    cx: (
      <section className="band hr-band" id="share">
        <div className="wrap">
          <div className="hr-box hr-cx">
          <div className="hr-bar">
            <span className="hr-title"><Icon name="chat" size={19} />{cfg.cx.title}</span>
            <Link prefetch={false} className="hr-all" href="/reviews">{viewAll ? <>{viewAll[1]}<span className="hr-all-cat">{viewAll[2]}</span></> : cfg.cx.viewAll} <Icon name="arrow" size={14} /></Link>
          </div>
          <div className="voices cx">
            <div className="share-box cx-share">
              <div className="score"><b>{cfg.cx.rating.toFixed(1)}</b><div><Stars rating={cfg.cx.rating} size={16} /><div className="sm">from {cfg.cx.countText}</div></div></div>
              <h3>{cfg.cx.shareTitle}</h3>
              {isHtml(cfg.cx.shareText) ? <div className="rich" dangerouslySetInnerHTML={{ __html: safeHtml(cfg.cx.shareText) }} /> : <p>{cfg.cx.shareText}</p>}
              <button className="btn btn-accent" onClick={() => setShareOpen(true)}><Icon name="chat" size={16} />{cfg.cx.button}</button>
            </div>
            <div className="cx-right">
              <div className="cx-rail" ref={rvRail} onMouseEnter={() => { rvPaused.current = true; }} onMouseLeave={() => { rvPaused.current = false; }}>
                {latest.map((r, i) => <ReviewCard key={i} r={r} />)}
              </div>
            </div>
          </div>
          </div>
        </div>
      </section>
    ),
    /* SEO text — TV Hut style, admin-editable */
    seo: (
      <section className="band tint">
        <div className="wrap">
          <div className={'seo-text seo-tv' + (seoOpen ? ' open' : '')}>
            <h2>{seo.title}</h2>
            <div className="more">
              {seo.html
                ? <div className="seo-rich" dangerouslySetInnerHTML={{ __html: safeHtml(seo.html) }} />
                : seo.paragraphs
                ? seo.paragraphs.map((para, i) => <p key={i}>{linkParts(para).map((x, j) => 'href' in x ? <Link prefetch={false} key={j} href={x.href}>{x.t}</Link> : x.t)}</p>)
                : seoText.paragraphs.map((para, i) => (
                  <p key={i}>{para.map((part, j) => typeof part === 'string' ? part : <Link prefetch={false} key={j} href={part[1]}>{part[0]}</Link>)}</p>
                ))}
            </div>
            <button className="seo-btn" onClick={() => setSeoOpen(o => !o)}>{seoOpen ? 'View Less' : 'View More'}<Icon name={seoOpen ? 'up' : 'down'} size={14} /></button>
          </div>
        </div>
      </section>
    ),
  };

  return (
    <>
      {/* the page's one H1 (the SEO title of the home page), read by search engines and screen readers, not drawn */}
      {h1 && <h1 className="sr-only">{h1}</h1>}
      {cfg.layout.map(b => (le || !b.hidden) && (
        <EmbedLiveEditSection key={b.id} id={b.id} label={homeLabel(b.id)}>{sections[b.id]}</EmbedLiveEditSection>
      ))}

      {/* Share experience: pick a topic first, then the short form */}
      <Modal open={shareOpen} onClose={closeShare} title="Share Your Experience">
        {!topic ? (
          <div className="modal-body cx-topics">
            <h4>What would you like to review?</h4>
            {REVIEW_TOPICS.map(([e, t]) => <button key={t} onClick={() => setTopic(t)}><span>{e}</span>{t}<Icon name="right" size={15} /></button>)}
          </div>
        ) : (
          <form className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 15 }} onSubmit={submitShare}>
            <button type="button" className="cx-topic-on" onClick={() => setTopic(null)}><Icon name="left" size={14} />{topic}</button>
            <div className="field"><span className="label">Your rating</span><StarInput name="r" size={28} /></div>
            <div className="form-grid">
              <div className="field"><label htmlFor="sx-n">Name <span className="req">*</span></label><input className="input" id="sx-n" name="name" required maxLength={120} /></div>
              <div className="field"><label htmlFor="sx-c">Location</label><input className="input" id="sx-c" name="area" maxLength={160} placeholder="e.g. Mirpur, Dhaka" /></div>
            </div>
            <div className="field"><label htmlFor="sx-m">Your experience <span className="req">*</span></label><textarea className="textarea" id="sx-m" name="text" required minLength={10} maxLength={2000} />
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: -9999, width: 1, height: 1, opacity: 0 }} /></div>
                        <button className="btn btn-accent btn-block" type="submit" disabled={sharing}>{sharing ? 'Sending…' : 'Submit Experience'}</button>
          </form>
        )}
      </Modal>
    </>
  );
}
