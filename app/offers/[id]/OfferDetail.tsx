'use client';
/* Offer Details, the Auto kind — laid out like the Deals page: an info box on top (title, subtitle, details, OFFER ENDS IN countdown;
   no banner picture), then the offer's products with their filters (the same shelf as the Deals page), and the terms (শর্তাবলি) at
   the very bottom, above the footer.
   The products of an offer: its own list (`items`, from the admin's sections), else the products shown on its banner followed by the
   products of the categories its links point to (/category/<slug>). */
import { Fragment, useEffect, useMemo, useState } from 'react';
import { offers, byId, visibleProducts, offerLive, type Offer, type Product } from '@/lib/data';
import { Crumb } from '@/components/ui';
import { hasEnd } from '@/lib/format';
import EndsIn from '@/components/EndsIn';
import ProductShelf from '@/components/ProductShelf';

/* "**bold**" → <b> (offer copy of the old list comes as plain text) */
const rich = (s: string) => s.split(/\*\*(.+?)\*\*/g).map((t, i) => (i % 2 ? <b key={i}>{t}</b> : <Fragment key={i}>{t}</Fragment>));
const save = (p: Product) => (p.old ?? p.price) - p.price;

function offerItems(o: Offer): Product[] {
  const listed = (o as Offer & { items?: string[] }).items;
  if (Array.isArray(listed) && listed.length) return listed.map(byId).filter((p): p is Product => !!p);
  const slugs = o.links.map(l => /^\/(?:category\/)?([a-z0-9-]+)\/?(?:[?#]|$)/i.exec(l[1])?.[1]).filter((s): s is string => !!s);
  const first = o.banner.products.map(byId).filter((p): p is Product => !!p);
  const seen = new Set(first.map(p => p.id));
  const more = visibleProducts.filter(p => slugs.includes(p.cat) && !seen.has(p.id)).sort((a, b) => save(b) - save(a));
  return [...first, ...more];
}

export default function OfferDetail({ id }: { id: string }) {
  const o = offers.find(x => x.id === id)!;
  const [ended, setEnded] = useState(false);
  const sub = o.subtitle !== undefined ? o.subtitle : o.intro; // admin: Subtitle (an offer of the old list: its intro)
  useEffect(() => { setEnded(!offerLive(o)); }, [o]);
  const items = useMemo(() => offerItems(o), [o]);

  return (
    <>
      <Crumb items={[['Offer', '/offers'], [o.title]]} />
      <section className="band">
        <div className="wrap">
          <div className="dl-head">
            <h1>{o.title}</h1>
            {sub && <p className="dl-tag">{sub}</p>}
            {o.descHtml !== undefined ? <div className="dl-body" dangerouslySetInnerHTML={{ __html: o.descHtml }} /> : <p className="dl-body">{rich(o.body || o.desc)}</p>}
            {!ended ? (hasEnd(o.endAt) ? <EndsIn className="dl-ends" label="OFFER ENDS IN" end={Date.parse(o.endAt)} onEnd={() => setEnded(true)} /> : null) : <span className="od-over">This offer has ended</span>}
          </div>

          {items.length > 0 && (
            <ProductShelf
              items={items}
              heading="Products in this offer"
              blurb={n => <>Products of the {o.title}. <b>{n}</b> product{n === 1 ? '' : 's'}</>}
              allLabel="All Products"
              noneTitle="No products here"
              noneHint="Try another category or discount range."
              noneButton="Show all products"
            />
          )}

          {(o.termsHtml || (o.termsHtml === undefined && o.terms.length > 0)) && (
            <div className="dl-head od-terms-box">
              <div className="od-terms"><b>শর্তাবলিঃ</b>{o.termsHtml ? <div dangerouslySetInnerHTML={{ __html: o.termsHtml }} /> : <ul>{o.terms.map(t => <li key={t}>{t}</li>)}</ul>}</div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
