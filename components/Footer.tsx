'use client';
/* Footer — TV Hut layout: about/contact · Shop With Us · Experience Zone, then
   "Proud Member OF" (blank until memberships are added) + "We Accept", then copyright + socials. */
import Link from 'next/link';
import { site, trustItems } from '@/lib/data';
import { DEFAULT_PAY } from '@/lib/home';
import { Icon } from './ui';
import { safeHtml, isHtml } from '@/lib/html';
import { useHomeCfg } from './live-edit/EmbedLiveEdit';
import { LiveEditChrome } from './live-edit/LiveEditSection';
import { fixedImg } from '@/lib/img';

/* Social icons in the client's order, shown in each network's own brand colours (see .brand-social).
   Page URLs are '#' until the client sends them; WhatsApp uses site.whatsapp. */
const SOCIAL: [string, string, string][] = [
  ['facebook', 'Facebook', '#'], ['whatsapp', 'WhatsApp', ''], ['youtube', 'YouTube', '#'],
  ['tiktok', 'TikTok', '#'], ['instagram', 'Instagram', '#'], ['linkedin', 'LinkedIn', '#'],
];


export default function Footer() {
  const { footer: ft } = useHomeCfg();
  const wa = 'https://wa.me/' + (ft.whatsapp.replace(/[^\d]/g, '') || site.whatsapp);
  const trust = ft.trust ? ft.trust.filter(t => !t.hidden) : trustItems.map(t => ({ icon: t.icon, title: t.title, text: t.points.join(' · ') }));
  const phones = ft.phones.length ? ft.phones : site.phones?.length ? site.phones : [site.hotline];
  const email = ft.email || site.email;
  const mapEmbed = ft.mapEmbed || site.map.embed;
  return (
    <LiveEditChrome id="footer" label="footer">
      {false && !ft.hideTrust && trust.length > 0 && <section className="trust-strip trust4"><div className="wrap trust-in">
        {trust.map(t => (
          <div className="trust" key={t.title}>
            <span className="ti"><Icon name={t.icon} size={28} /></span>
            <div><b>{t.title}</b><span>{t.text}</span></div>
          </div>
        ))}
      </div></section>}
      <footer className="ftr">
        <div className="wrap ftr-top">
          <div className="ftr-about">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img {...fixedImg(ft.logo, 181)} alt="Munshiganj IT" width={181} height={40} loading="lazy" decoding="async" />
            {isHtml(ft.about) ? <div className="rich" dangerouslySetInnerHTML={{ __html: safeHtml(ft.about) }} /> : <p>{ft.about}</p>}
            <ul className="ftr-contact">
              {phones.map(n => <li key={n}><Icon name="phone" size={16} /><a href={'tel:' + n.replace(/-/g, '')}>{n}</a></li>)}
              <li><Icon name="chat" size={16} /><a href={wa} target="_blank" rel="noopener">{ft.whatsappLabel}</a></li>
              <li><Icon name="mail" size={16} /><a href={'mailto:' + email}>{email}</a></li>
            </ul>
          </div>
          <div>
            <h3><Icon name="store" size={18} />{ft.linksTitle}</h3>
            <div className="ftr-links">{ft.links.filter(l => !l.hidden).map(l => <Link prefetch={false} key={l.href + l.label} href={l.href}><Icon name="right" size={12} />{l.label}</Link>)}</div>
          </div>
          <div className="ftr-zone">
            <h3><Icon name="pin" size={18} />{ft.zoneTitle}</h3>
            <p><Icon name="pin" size={15} />{ft.address || site.address}</p>
            <div className="ftr-map">
              <iframe src={mapEmbed} title="Munshiganj IT Experience Zone on Google Maps"
                loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
            </div>
            <a className="ftr-dir" href={ft.mapDirections || site.map.directions} target="_blank" rel="noopener">
              <Icon name="pin" size={13} />{ft.directions}</a>
          </div>
        </div>
        <div className="wrap ftr-badges">
          {!ft.hideMembers && <div className="ftr-member"><b>{ft.memberTitle}</b>
            <span className={'ftr-member-box' + (ft.members.some(m => !m.hidden) ? ' has-logos' : '')} role="group" aria-label={ft.members.length ? 'Memberships' : 'Memberships (coming soon)'}>
              {ft.members.filter(m => !m.hidden).map((m, i) => {
                // eslint-disable-next-line @next/next/no-img-element
                const img = <img src={m.image} alt={m.alt} height={40} loading="lazy" />;
                return m.href ? <a key={i} href={m.href} target="_blank" rel="noopener">{img}</a> : <span key={i}>{img}</span>;
              })}
            </span></div>}
          {!ft.hideAccept && <div className="ftr-accept"><b>{ft.acceptTitle}</b>
            {ft.acceptImage === DEFAULT_PAY
              /* SSLCommerz merchant banner, cropped to just the payment logos */
              ? <span className="pay-crop">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={ft.acceptImage} width={2400} height={269} loading="lazy" alt={ft.acceptAlt} />
              </span>
              // a picture uploaded in Live Edit is shown as it is
              // eslint-disable-next-line @next/next/no-img-element
              : <img className="pay-custom" src={ft.acceptImage} alt={ft.acceptAlt} loading="lazy" />}
          </div>}
        </div>
        <div className="ftr-bottom"><div className="wrap ftr-bottom-in">
          <span>{ft.copyright}{!ft.hideEmail && <> · {email}</>}{!ft.hideCredit && <> · {ft.creditText} <a className="credit" href={ft.creditHref} target="_blank" rel="noopener">{ft.creditName}</a></>}</span>
          <div className="social brand-social">
            {SOCIAL.map(([icon, label, dflt]) => [icon, label, icon === 'whatsapp' ? (ft.social.whatsapp || wa) : (ft.social[icon] ?? dflt)] as const).filter(([icon, , href]) => href).map(([icon, label, href]) => (
              <a key={icon} className={'soc-' + icon} href={href} target="_blank" rel="noopener" aria-label={label} title={label}>
                <Icon name={icon} size={19} />
              </a>
            ))}
          </div>
        </div></div>
      </footer>
    </LiveEditChrome>
  );
}
