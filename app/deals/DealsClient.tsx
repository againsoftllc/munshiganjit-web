'use client';
/* Special Deals — StarTech "10.10 Deal" layout: deal header + ENDING IN countdown · left: Shop by Category and Discount Amount ·
   right: deal products · the terms at the bottom.
   The deal is an offer of the admin (Promotions > Offers) marked "Use as the Deals page": its title is the big heading, its subtitle
   the red line, its details the text. The page closes the deal by itself when the countdown ends. */
import Link from 'next/link';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { activeDeal, byId, type Deal, type Product } from '@/lib/data';
import { Crumb } from '@/components/ui';
import { hasEnd } from '@/lib/format';
import EndsIn from '@/components/EndsIn';
import ProductShelf from '@/components/ProductShelf';

const rich = (s: string) => s.split(/\*\*(.+?)\*\*/g).map((t, i) => (i % 2 ? <b key={i}>{t}</b> : <Fragment key={i}>{t}</Fragment>));

export default function DealsClient({ initCat }: { initCat?: string }) {
  // decided after mount so a cached page never shows a deal that has already ended
  const [deal, setDeal] = useState<Deal | null | undefined>(undefined);
  useEffect(() => { setDeal(activeDeal()); }, []);

  const items = useMemo(() => (deal?.items ?? []).map(byId).filter((p): p is Product => !!p), [deal]);

  if (deal === undefined) return <><Crumb items={[['Special Deals']]} /><section className="band"><div className="wrap"><div className="dl-head dl-skel" /></div></section></>;

  if (!deal) return (
    <>
      <Crumb items={[['Special Deals']]} />
      <section className="band"><div className="wrap">
        <div className="dl-head"><h1>No deal is running right now</h1><p className="dl-tag">New deals are coming soon — meanwhile see our latest offers.</p>
          <Link className="btn btn-brand" href="/offers">See Offers</Link></div>
      </div></section>
    </>
  );

  return (
    <>
      <Crumb items={[['Special Deals']]} />
      <section className="band">
        <div className="wrap">
          <div className="dl-head">
            <h1>{deal.head}</h1>
            {deal.tagline && <p className="dl-tag">{deal.tagline}</p>}
            {deal.bodyHtml !== undefined ? <div className="dl-body" dangerouslySetInnerHTML={{ __html: deal.bodyHtml }} /> : <p className="dl-body">{rich(deal.body)}</p>}
            {hasEnd(deal.endAt) && <EndsIn className="dl-ends" label="ENDING IN" end={Date.parse(deal.endAt)} onEnd={() => setDeal(null)} />}
          </div>

          <ProductShelf
            key={initCat || ''}
            items={items}
            initCat={initCat}
            syncUrl="/deals"
            sortBySaving
            heading="Featured Products"
            blurb={n => <>Enjoy exciting discounts on selected products! <b>{n}</b> deal{n === 1 ? '' : 's'}</>}
            allLabel="All Deals"
            noneTitle="No deals here"
            noneHint="Try another category or discount range."
            noneButton="Show all deals"
          />

          {deal.termsHtml && (
            <div className="dl-head od-terms-box">
              <div className="od-terms"><b>শর্তাবলিঃ</b><div dangerouslySetInnerHTML={{ __html: deal.termsHtml }} /></div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
