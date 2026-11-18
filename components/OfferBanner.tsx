/* Square offer banner (1:1). The picture uploaded in the admin (Promotions > Offers > Image) when the offer has one; until then
   artwork drawn in HTML/CSS from `offer.banner`. */
import type { Offer } from '@/lib/data';
import { PImg } from './ui';

export default function OfferBanner({ o, large = false }: { o: Offer; large?: boolean }) {
  if (o.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="ob-img" src={o.image} alt={o.title} width={1200} height={1200} loading={large ? 'eager' : 'lazy'} decoding="async" />;
  }
  const b = o.banner;
  // a gradient made in the admin: custom:#rrggbb,#rrggbb[,#rrggbb] (the colours are checked, nothing else reaches the style)
  const custom = /^custom:(#[0-9a-f]{3,8}(?:,#[0-9a-f]{3,8}){1,2})$/i.exec(b.theme);
  return (
    <div className={'ob ' + (custom ? '' : b.theme) + (large ? ' ob-lg' : '')} style={custom ? { background: 'linear-gradient(160deg, ' + custom[1] + ')' } : undefined} role="img" aria-label={o.title + ' — ' + b.big + ' ' + b.bigSub}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="ob-logo" src="/img/mit-logo.png" alt="" width={90} height={20} />
      <span className="ob-kicker">{b.kicker}</span>
      <b className="ob-head">{b.head}</b>
      <span className="ob-big"><b>{b.big}</b><small>{b.bigSub}</small></span>
      <span className="ob-prods">{b.products.map(id => <span key={id}><PImg id={id} size={large ? 150 : 110} /></span>)}</span>
      <span className="ob-foot">{b.foot}</span>
      <small className="ob-note">*শর্ত প্রযোজ্য</small>
    </div>
  );
}
