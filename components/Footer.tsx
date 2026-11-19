'use client';
/* Footer â€” Munshiganj IT. Unique layout:
   big promise + Join Now Â· hotline board Â· link groups beside a numbered office timeline Â· trust strip (Membership + We Accept) Â· outline watermark. */
import Link from 'next/link';
import { useState } from 'react';
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
    <form className="mf-join" onSubmit={submit}>
      <input type="email" required placeholder="Your Email" value={email} onChange={e => { setEmail(e.target.value); if (state !== 'busy') setState('idle'); }} aria-label="Your email" />
      <button type="submit" disabled={state === 'busy'}>{state === 'busy' ? 'Sendingâ€¦' : <>Subscribe <Icon name="arrow" size={16} /></>}</button>
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
          {/* 1 Â· promise + Join Now + social */}
          <section className="mf-hero">
            <div className="mf-hero-txt">
              <span className="mf-eyebrow">Our Business</span>
              <h2>Always Here <em>for You.</em></h2>
              <p>&ldquo;We always strive to provide the best products. Your support is extremely important to us.&rdquo; Thank you for visiting our website.</p>
            </div>
            <div className="mf-hero-act">
              <span className="mf-label">Join Now</span>
              <JoinForm />
              <div className="mf-social">
                {SOCIAL.map(s => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}>
                    {s.icon === 'x' ? <XGlyph /> : <Icon name={s.icon} size={18} />}
                  </a>
                ))}
              </div>
            </div>
          </section>

          {/* 2 Â· hotline board */}
          <ul className="mf-board">
            {HOTLINES.map(([label, num], i) => (
              <li key={label} className={i % 2 ? 'mf-red' : ''}>
                <a href={'tel:' + num}>
                  <small>{label}</small>
                  <b>{num}</b>
                  <span className="mf-call"><Icon name="phone" size={16} /></span>
                </a>
              </li>
            ))}
          </ul>

          {/* 3 Â· links + offices */}
          <div className="mf-main">
            <div className="mf-groups">
              {GROUPS.map(g => (
                <nav key={g.title} aria-label={g.title}>
                  <h3>{g.title}</h3>
                  <ul>{g.links.map(([label, href]) => <li key={label}><Link prefetch={false} href={href}>{label}</Link></li>)}</ul>
                </nav>
              ))}
            </div>
            <div className="mf-offices">
              <h3>Contact Us</h3>
              <ol>
                {OFFICES.map(([name, addr], i) => (
                  <li key={name}>
                    <span className="mf-node">{String(i + 1).padStart(2, '0')}</span>
                    <div><b>{name}</b><p>{addr}</p></div>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* 4 Â· trust strip: membership + we accept */}
          <section className="mf-trust">
            <div className="mf-trust-blk">
              <span className="mf-trust-t">Membership</span>
              <div className="mf-members">
                {MEMBERS.map(([src, alt]) => <span key={src}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={src} alt={alt} loading="lazy" /></span>)}
              </div>
            </div>
            <i className="mf-trust-sep" aria-hidden="true" />
            <div className="mf-trust-blk mf-trust-pay">
              <span className="mf-trust-t">We Accept</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/img/mit-we-accept.webp" alt="Visa, Mastercard, American Express, UnionPay, Diners, DBBL Nexus, bKash, Nagad, Rocket, Upay" width={2603} height={293} loading="lazy" />
            </div>
          </section>

          {/* 5 Â· bottom line */}
          <div className="mf-bottom">
            <span className="mf-logo">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/img/mit-logo.png" alt="Munshiganj IT" width={120} height={37} loading="lazy" /></span>
            <p>&copy; {new Date().getFullYear()}, Munshiganj IT, All Rights Reserved. Developed By: <a href="https://www.xsellencebdltd.com/" target="_blank" rel="noopener noreferrer">Xsellence Bd Ltd</a></p>
            <button type="button" className="mf-top" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="Back to top"><Icon name="arrow" size={16} /></button>
          </div>
        </div>
        <div className="mf-mark" aria-hidden="true">MUNSHIGANJ IT</div>
      </footer>
    </LiveEditChrome>
  );
}
