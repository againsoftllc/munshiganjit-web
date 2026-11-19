'use client';
/* Footer — everything from the Munshiganj IT shop footer, redesigned:
   floating Join Now (subscribe) band + social · department hotlines · brand + membership · link groups · offices · payments · copyright + credit. */
import Link from 'next/link';
import { useState } from 'react';
import { DEFAULT_PAY } from '@/lib/home';
import { AGAINERP_API } from '@/lib/againerp';
import { Icon } from './ui';
import { LiveEditChrome } from './live-edit/LiveEditSection';

const SOCIAL: { label: string; href: string; icon: string }[] = [
  { label: 'Facebook', href: 'https://www.facebook.com/munshiganjitbd', icon: 'facebook' },
  { label: 'Twitter', href: 'https://x.com/md_moshiur62177', icon: 'x' },
  { label: 'Instagram', href: 'https://www.instagram.com/munshiganjit.com.bd/', icon: 'instagram' },
  { label: 'YouTube', href: 'https://www.youtube.com/@MunshiganjIT.Official', icon: 'youtube' },
];

const HOTLINES: [string, string][] = [
  ['PC Component', '01979490143'], ['Laptop', '01919490143'], ['Gadget', '01979490144'], ['MIT Care', '01979490145'],
  ['Warranty', '01979490146'], ['CCTV Service', '01979490147'], ['Accessories', '01979999711'], ['Corporate', '01979999722'],
];

const MEMBERS: [string, string][] = [
  ['/img/mit-membership1.jpg', 'Member of Bangladesh Computer Samity'],
  ['/img/mit-membership2.jpg', 'e-CAB'],
  ['/img/mit-membership3.jpg', 'NCCI'],
];

const GROUPS: { title: string; links: [string, string][] }[] = [
  { title: 'Company', links: [['Overview', '/about-us'], ['Our Branches', '/contact'], ['Our Team', '/about-us'], ['Brand', '/brands'], ['Blogs', '/blog'], ['Contact', '/contact']] },
  { title: 'Policies', links: [['Warranty Policy', '/policy#warranty'], ['Privacy Policy', '/policy#privacy'], ['Refund and Return', '/policy#returns'], ['Terms & Conditions', '/policy#terms'], ['Delivery Info', '/policy#delivery'], ['EMI Information', '/policy#emi'], ['Payment Methods', '/policy#payment'], ['Order Procedure', '/help-support']] },
  { title: 'Services', links: [['Pre-Order', '/help-support'], ['Price Quotation', '/contact'], ['Service Request', '/service-center'], ['Serial Enquiry', '/help-support'], ['Complain', '/complain'], ['Partner Registration', '/partner'], ['Happy Customer', '/reviews'], ['MIT Care', '/service-center'], ['MIT Dropshop', '/reseller']] },
  { title: 'Shop', links: [['Shop', '/products'], ['All Category', '/categories'], ['Offer', '/offers'], ['Happy Hour', '/happy-hour']] },
];

const OFFICES: [string, string][] = [
  ['Head Office', 'Shop No- 117, 118, 103 & 104, Level-2, Somobay New Market, Chasara, Narayanganj-1400, Bangladesh.'],
  ['Corporate Office', '193, President Road, Siraj Mansion (4th Floor), Chasara, Narayanganj-1400, Bangladesh.'],
  ['Service Center', '193, President Road, Siraj Mansion (4th Floor), Chasara, Narayanganj-1400, Bangladesh.'],
  ['Warehouse', '29 DIT Plot, Razzak Villa, Balur Mat, Chasara, Narayanganj-1400, Bangladesh.'],
];

const XGlyph = () => <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="currentColor"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z" /></svg>;

function JoinForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'err'>('idle');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || state === 'busy') return;
    setState('busy');
    try {
      const r = await fetch(AGAINERP_API + '/api/v1/storefront/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Newsletter subscriber', email: email.trim(), subject: 'Newsletter subscription', message: 'Please add this email address to the mailing list.' }),
      });
      setState(r.ok ? 'ok' : 'err');
      if (r.ok) setEmail('');
    } catch { setState('err'); }
  };
  return (
    <form className="mf-join-form" onSubmit={submit}>
      <input type="email" required placeholder="Your Email" value={email} onChange={e => { setEmail(e.target.value); if (state !== 'busy') setState('idle'); }} aria-label="Your email" />
      <button type="submit" disabled={state === 'busy'}>{state === 'busy' ? 'Sending…' : 'Subscribe'}</button>
      {state === 'ok' && <span className="mf-join-msg ok">Thank you! You are subscribed.</span>}
      {state === 'err' && <span className="mf-join-msg err">Could not subscribe right now. Please try again.</span>}
    </form>
  );
}

export default function Footer() {
  return (
    <LiveEditChrome id="footer" label="footer">
      <footer className="mf">
        <div className="wrap">
          <section className="mf-join" aria-label="Join Now">
            <div className="mf-join-txt">
              <h3>Join Now</h3>
              <p>Get offers, new arrivals and updates from Munshiganj IT.</p>
            </div>
            <JoinForm />
            <div className="mf-social">
              {SOCIAL.map(s => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}>
                  {s.icon === 'x' ? <XGlyph /> : <Icon name={s.icon} size={18} />}
                </a>
              ))}
            </div>
          </section>

          <ul className="mf-hot">
            {HOTLINES.map(([label, num]) => (
              <li key={label}>
                <a href={'tel:' + num}>
                  <span className="mf-hot-ic"><Icon name="phone" size={18} /></span>
                  <span><small>{label}</small><b>{num}</b></span>
                </a>
              </li>
            ))}
          </ul>

          <div className="mf-main">
            <div className="mf-brand">
              <h3>Our Business</h3>
              <span className="mf-logo">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/img/mit-logo.png" alt="Munshiganj IT" width={170} height={52} loading="lazy" /></span>
              <h4>Always Here for You.</h4>
              <p>We always strive to provide the best products. Your support is extremely important to us. Thank you for visiting our website.</p>
              <h3 className="mf-sub">Membership</h3>
              <div className="mf-members">
                {MEMBERS.map(([src, alt]) => <span key={src}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={src} alt={alt} loading="lazy" /></span>)}
              </div>
            </div>

            <div className="mf-links">
              {GROUPS.map(g => (
                <nav key={g.title} aria-label={g.title}>
                  <h3>{g.title}</h3>
                  <ul>{g.links.map(([label, href]) => <li key={label}><Link prefetch={false} href={href}>{label}</Link></li>)}</ul>
                </nav>
              ))}
            </div>

            <div className="mf-offices">
              <h3>Contact Us</h3>
              <ul>
                {OFFICES.map(([name, addr]) => (
                  <li key={name}><span className="mf-pin"><Icon name="pin" size={16} /></span><div><b>{name}</b><p>{addr}</p></div></li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="mf-bottom">
          <div className="wrap mf-bottom-in">
            <div className="mf-accept">
              <b>We Accept</b>
              <span className="pay-crop">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={DEFAULT_PAY} width={2400} height={269} loading="lazy" alt="Visa, Mastercard, bKash, Nagad, Rocket and more via SSLCommerz" /></span>
            </div>
            <p className="mf-copy">
              &copy; {new Date().getFullYear()} Munshiganj IT, All Rights Reserved. Developed By: <a href="https://www.xsellencebdltd.com/" target="_blank" rel="noopener noreferrer">Xsellence Bd Ltd</a>
            </p>
          </div>
        </div>
      </footer>
    </LiveEditChrome>
  );
}
