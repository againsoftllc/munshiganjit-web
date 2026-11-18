'use client';
/* Reseller / Corporate landing (client banner design) + application. Submitting the form makes the visitor's customer account
   (phone + password; or uses the account they are signed in to), signs them in and sends the application, which belongs to that
   account. The admin approves it and the same account then sees the partner prices (see /partner and My Account). */
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Icon, Crumb } from './ui';
import { usePartner } from './partner';
import { site } from '@/lib/data';
import { TIER_LABEL, type Tier } from '@/lib/b2b';
import { useStore } from './store';
import { useHomeCfg } from './live-edit/EmbedLiveEdit';
import { LiveEditChrome } from './live-edit/LiveEditSection';

const COPY: Record<Tier, { crumb: string; t1: string; t3: string; q: string; sub: string; why: [string, string][]; team: string; cta: string; form: string; bizLabel: string }> = {
  reseller: {
    crumb: 'Become a Reseller', t1: 'Become an', t3: 'Reseller',
    q: 'Are you a gadget retailer or mobile accessories shop owner?', sub: 'Let’s make a partnership with',
    why: [['globe', 'Direct Import From China'], ['tag', 'Enjoy Competitive Reseller Prices'], ['layers', 'Wide Range of Product Availability'], ['shield', 'Genuine Products with Warranty Support'], ['truck', 'Nationwide Courier Delivery Across Bangladesh'], ['support', 'Dedicated Reseller Support'], ['gift', 'Exclusive Deals & Special Offers']],
    team: 'Munshiganj IT Reseller Support Team', cta: 'Apply to Become a Reseller', form: 'Reseller Application', bizLabel: 'Business / Shop Name',
  },
  corporate: {
    crumb: 'Corporate Buyer', t1: 'Become an', t3: 'Corporate Buyer',
    q: 'Buying gadgets and accessories for your office or company?', sub: 'Get bulk corporate prices from',
    why: [['tag', 'Special Corporate Prices on Bulk Orders'], ['invoice', 'VAT Invoice & Official Quotation'], ['shield', 'Genuine Products with Warranty Support'], ['briefcase', 'Dedicated Corporate Account Manager'], ['truck', 'Nationwide Delivery to Every Branch'], ['layers', 'Quantity-based Pricing'], ['gift', 'Exclusive Corporate Deals']],
    team: 'Munshiganj IT Corporate Sales Team', cta: 'Apply as Corporate Buyer', form: 'Corporate Buyer Application', bizLabel: 'Company Name',
  },
};

export default function PartnerLanding({ type }: { type: Tier }) {
  const base = COPY[type];
  /* the words come from Live Edit (Become a Reseller / Corporate Buyer); lib/info.ts DEFAULT_PARTNER says what is shown until then */
  const cfg = useHomeCfg()[type];
  const c = { crumb: base.crumb, t1: cfg.t1, t3: cfg.t3, q: cfg.question, sub: cfg.sub, why: cfg.why.filter(x => !x.hidden).map((x): [string, string] => [x.icon, x.text]), team: cfg.team, cta: cfg.cta, form: cfg.form.title, bizLabel: cfg.form.bizLabel };
  const phone = cfg.phone || site.hotline;
  const email = cfg.email || site.resellerEmail;
  const { ready, register, registerNew, me, signedIn, account } = usePartner();
  const { signIn, toast } = useStore();
  const [busy, setBusy] = useState(false);
  const next = encodeURIComponent(type === 'reseller' ? '/reseller' : '/corporate');
  const [done, setDone] = useState(false);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const data = { type, business: String(f.get('biz')), person: String(f.get('person')), phone: String(f.get('phone')), district: String(f.get('dist')), tradeLicense: String(f.get('tl') || ''), volume: String(f.get('vol')), note: String(f.get('req') || '') };
    setBusy(true);
    try {
      if (signedIn) {
        const sent = await register(data);
        if (!sent) { toast('Could not send your application. Please check your connection and try again.', 'alert'); return; }
      } else {
        const r = await registerNew(data, String(f.get('pw')), String(f.get('email') || ''));
        if ('error' in r) { toast(r.error, 'alert'); return; }
        signIn(r.session); // the new account is signed in
        toast('Your account is created and your application is sent', 'checkCircle');
      }
    } finally { setBusy(false); }
    setDone(true);
    form.reset();
    document.getElementById('apply')?.scrollIntoView({ behavior: 'smooth' });
  };
  const mine = me && me.type === type ? me : null;
  // an approved partner of the other type can't apply again: the type changes through a switch request on /partner
  const otherApproved = !!me && me.type !== type && me.status === 'approved';

  return (
    <>
      <Crumb items={[[c.crumb]]} />
      <div className="wrap">
        <LiveEditChrome id={type + '-hero'} label="title, benefits and contact"><section className="rsl-hero">
          <div className="rsl-copy">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="rsl-logo" src="/img/mit-logo-dark.png" alt="Munshiganj IT" width={181} height={40} />
            <h1 className="rsl-title">
              <span className="t1">{c.t1}</span>
              <span className="t2 notranslate" translate="no">Munshiganj IT</span>
              <span className="t3">{c.t3}</span>
            </h1>
            <p className="rsl-q">{c.q}</p>
            <p className="rsl-sub">{c.sub} <b className="notranslate" translate="no">Munshiganj IT</b>!</p>
            <div className="rsl-why">
              <h2>Why Choose <span className="notranslate" translate="no">Munshiganj IT</span>?</h2>
              <ul>{c.why.map(([ic, t]) => <li key={t}><span className="rsl-ic"><Icon name={ic} size={17} /></span>{t}</li>)}</ul>
            </div>
            <div className="rsl-bottom">
              <div className="rsl-contact">
                <span className="rsl-cic"><Icon name="support" size={26} /></span>
                <div>
                  <small>{cfg.contactLabel}</small>
                  <b>{c.team}</b>
                  <a href={'tel:' + phone.replace(/[^\d+]/g, '')}><Icon name="phone" size={14} />Phone: {phone}</a>
                  <a href={'mailto:' + email}><Icon name="mail" size={14} />Email: {email}</a>
                </div>
              </div>
              <a className="rsl-cta" href="#apply"><Icon name="arrow" size={20} />{c.cta}</a>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="rsl-photo" src="/img/banners/reseller-photo.webp" alt="Munshiganj IT partnership — Baseus, Hoco and Anker gadgets" width={600} height={1065} />
        </section></LiveEditChrome>

        <LiveEditChrome id={type + '-form'} label="application form"><section className="box rsl-form" id="apply">
          <h2><Icon name="briefcase" size={20} />{c.form}</h2>
          {(done || mine) && mine && (
            <div className={'pp-status ' + mine.status}>
              <Icon name={mine.status === 'approved' ? 'checkCircle' : mine.status === 'rejected' ? 'xCircle' : 'clock'} size={18} />
              <span>
                {mine.status === 'pending' && <>Application received for <b>{mine.business}</b>. Status: <b>Pending approval</b> — our team will call you within 1 working day. Partner prices unlock after approval.</>}
                {mine.status === 'approved' && <>You are an approved {TIER_LABEL[type]} partner. <Link href="/partner/products">See your partner prices →</Link></>}
                {mine.status === 'rejected' && <>Your application was not approved. Please call {phone} for details.</>}
              </span>
            </div>
          )}
          {ready && !signedIn && <p className="muted">Fill in your details — this also creates your customer account (your phone number and a password), so you can follow your request and order once approved. Already have an account? <Link href={'/login?next=' + next}>Sign in</Link></p>}
          {ready && signedIn && !mine && <p className="muted">Signed in as <b>{account?.name}</b>. Fill in your business details to apply. <Link href="/partner">See your partner account</Link></p>}
          {ready && signedIn && mine && <p className="muted">Your application is linked to your account ({account?.name}). <Link href="/partner">See your partner account</Link></p>}
          {ready && signedIn && otherApproved && <p className="muted">Your account is already an approved <b>{TIER_LABEL[me!.type]}</b> partner — one account holds one partner type. To change it, send a switch request from <Link href="/partner">your partner account</Link>.</p>}
          {ready && !mine && !otherApproved && <form className="form-grid" style={{ marginTop: 14 }} onSubmit={submit}>
            <div className="field"><label htmlFor="rs-biz">{c.bizLabel} <span className="req">*</span></label><input id="rs-biz" name="biz" className="input" required /></div>
            <div className="field"><label htmlFor="rs-person">Contact Person <span className="req">*</span></label><input id="rs-person" name="person" className="input" required defaultValue={account?.name || ''} /></div>
            <div className="field"><label htmlFor="rs-phone">Phone <span className="req">*</span></label><input id="rs-phone" name="phone" className="input" required inputMode="tel" placeholder="01XXXXXXXXX" defaultValue={account?.phone || ''} readOnly={signedIn} /></div>
            <div className="field"><label htmlFor="rs-dist">District <span className="req">*</span></label><input id="rs-dist" name="dist" className="input" required /></div>
            <div className="field"><label htmlFor="rs-tl">Trade License No.</label><input id="rs-tl" name="tl" className="input" /></div>
            <div className="field"><label htmlFor="rs-vol">Monthly Volume</label><select id="rs-vol" name="vol" className="select">{cfg.form.volumes.map(v => <option key={v}>{v}</option>)}</select></div>
            {!signedIn && <div className="field"><label htmlFor="rs-email">Email <small>(optional)</small></label><input id="rs-email" name="email" type="email" className="input" autoComplete="email" /></div>}
            {!signedIn && <div className="field"><label htmlFor="rs-pw">Password <span className="req">*</span></label><input id="rs-pw" name="pw" type="password" className="input" required minLength={6} autoComplete="new-password" placeholder="At least 6 characters" /></div>}
            <div className="field full"><label htmlFor="rs-req">Requirements</label><textarea id="rs-req" name="req" className="textarea" placeholder={cfg.form.reqHint} /></div>
            <div className="full"><button className="btn btn-accent btn-lg" type="submit" disabled={busy}>{busy ? 'Sending…' : c.cta} <Icon name="arrow" size={16} /></button></div>
          </form>}
        </section></LiveEditChrome>
      </div>
    </>
  );
}
