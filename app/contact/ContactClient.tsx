'use client';
/* Contact Us. Everything on the page (phones, email, hours, outlets, wholesale / reseller desks, the form's subjects ...) comes from
   the admin's Live Edit (see lib/contact.ts for what it shows until something is saved); the address and the map are the site's own
   (Settings > Site) unless the admin sets them here. The forms are really sent: they land in the admin's Website > Messages. */
import Link from 'next/link';
import { useCallback, useState, type FormEvent } from 'react';
import { Icon, Crumb, Modal } from '@/components/ui';
import { useStore } from '@/components/store';
import { site } from '@/lib/data';
import { ApiError, sendContact } from '@/lib/api';
import { telHref, type BizCard } from '@/lib/contact';
import { useHomeCfg } from '@/components/live-edit/EmbedLiveEdit';
import { LiveEditChrome } from '@/components/live-edit/LiveEditSection';

const VOLUMES = ['Under 1 Lakh', '1 to 3 Lakh', '3 to 5 Lakh', '5 to 10 Lakh', '10 Lakh +'];

function Biz({ id, card, cls, tag, onRequest, applyHref }: { id: string; card: BizCard; cls: string; tag: string; onRequest?: () => void; applyHref?: string }) {
  if (card.hidden) return null;
  return (
    <div className={'biz-card ' + cls} id={id}>
      <span className={'tag' + (cls === 'rs' ? ' orange' : '')}><Icon name={cls === 'rs' ? 'store' : 'briefcase'} size={12} />{card.tag || tag}</span>
      <h3>{card.title}</h3><p>{card.text}</p>
      <ul>{card.bullets.map(b => <li key={b}><Icon name="check" size={15} />{b}</li>)}</ul>
      {card.personName && (
        <div className="person"><span className="av" style={cls === 'rs' ? { background: 'var(--accent-50)', color: 'var(--accent-600)' } : undefined}>{card.personName.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span><div><b>{card.personName}</b>{card.personInfo}</div></div>
      )}
      {onRequest ? <button className="btn btn-brand" onClick={onRequest}>{card.button}</button> : <Link className="btn btn-accent" href={applyHref || '/reseller'}>{card.button}</Link>}
    </div>
  );
}

export default function ContactClient() {
  const { toast } = useStore();
  const c = useHomeCfg().contact;
  const [city, setCity] = useState('');
  const [bizOpen, setBizOpen] = useState(false);
  const [bizTitle, setBizTitle] = useState('Business Enquiry');
  const [busy, setBusy] = useState(false);
  const closeBiz = useCallback(() => setBizOpen(false), []);

  const v = city.toLowerCase();
  const outlets = c.outlets.items.filter(o => !o.hidden && (!v || (o.name + o.city + o.address).toLowerCase().includes(v)));
  const openBiz = (t: string) => { setBizTitle(t); setBizOpen(true); };
  const address = c.office.address.trim() || site.address;
  const mapEmbed = c.office.mapEmbed.trim() || site.map.embed;
  const mapDirections = c.office.mapDirections.trim() || site.map.directions;
  const call = c.top.phones[0] || '';

  /* send to the admin's inbox; the honeypot field `website` is left empty by people */
  const send = async (e: FormEvent<HTMLFormElement>, body: { name: string; phone: string; email: string; subject: string; message: string }, done: () => void, ok: string) => {
    e.preventDefault();
    const form = e.currentTarget;
    if (busy) return;
    setBusy(true);
    try {
      await sendContact({ ...body, website: String((form.elements.namedItem('website') as HTMLInputElement | null)?.value || '') });
      form.reset(); done(); toast(ok, 'mail');
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not send. Please check your connection and try again.', 'alert');
    } finally { setBusy(false); }
  };
  const val = (f: HTMLFormElement, name: string) => String((f.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null)?.value || '').trim();

  return (
    <>
      <Crumb items={[['Contact Us']]} />
      <div className="wrap">
        <LiveEditChrome id="contact-top" label="call, email and buttons"><section className="c-top c5">
          <div className="c-stack">
            {c.top.phones.length > 0 && <a className="c-mini" href={telHref(call)}><span className="cm-ic"><Icon name="phone" size={22} /></span><span><small>{c.top.callLabel}</small><b>{c.top.phones.join(' / ')}</b></span></a>}
            {c.top.email && <a className="c-mini" href={'mailto:' + c.top.email}><span className="cm-ic"><Icon name="mail" size={22} /></span><span><small>{c.top.emailLabel}</small><b>{c.top.email}</b></span></a>}
          </div>
          {c.top.tiles.filter(t => !t.hidden).map(t => {
            const inner = <><span className={'cb-ic c-' + t.tone}><Icon name={t.icon} size={30} /></span><div><small>{t.small}</small><b>{t.title}</b><span className="go">{t.cta} <Icon name="arrow" size={14} /></span></div></>;
            return t.href.startsWith('#') ? <a key={t.title} className="c-big" href={t.href}>{inner}</a> : <Link key={t.title} className="c-big" href={t.href}>{inner}</Link>;
          })}
        </section></LiveEditChrome>

        <LiveEditChrome id="contact-office" label="head office"><section className="addr-map">
          <div className="am-info">
            <h2 style={{ fontSize: 20, marginBottom: 18 }}>{c.office.title}</h2>
            <div className="am-line"><span className="ic"><Icon name="pin" size={19} /></span><div><b>Address</b><span>{address}</span></div></div>
            {c.office.hours && <div className="am-line"><span className="ic"><Icon name="clock" size={19} /></span><div><b>Opening Hours</b><span>{c.office.hours}</span></div></div>}
            {c.office.phones.length > 0 && <div className="am-line"><span className="ic"><Icon name="phone" size={19} /></span><div><b>Phone</b>{c.office.phones.map((p, i) => <span key={p}>{i > 0 && ' · '}<a href={telHref(p)}>{p}</a></span>)}</div></div>}
            {c.office.whatsapp && <div className="am-line"><span className="ic"><Icon name="whatsapp" size={19} /></span><div><b>WhatsApp</b><a href={'https://wa.me/' + c.office.whatsapp.replace(/\D/g, '')} target="_blank" rel="noopener">{c.office.whatsappText}</a></div></div>}
            {c.office.serviceCenter && <div className="am-line"><span className="ic"><Icon name="shield" size={19} /></span><div><b>Service Center</b><span>{c.office.serviceCenter}</span></div></div>}
          </div>
          <iframe title="Munshiganj IT location on Google Maps" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={mapEmbed}></iframe>
        </section></LiveEditChrome>

        <LiveEditChrome id="contact-outlets" label="sales outlets"><div>
          <div className="outlet-bar"><h2>{c.outlets.title}</h2><div className="ig"><Icon name="search" size={16} /><input className="input" id="city" placeholder={c.outlets.placeholder} value={city} onChange={e => setCity(e.target.value)} /></div></div>
          <div className="grid g3" id="outlets">
            {outlets.length ? outlets.map(o => (
              <div className="outlet" key={o.name}>
                <div className="outlet-body"><h3>{o.name}</h3>
                  <div className="ol"><Icon name="home" size={16} />Address</div><p>{o.address}</p>
                  {o.phones.length > 0 && <><div className="ol"><Icon name="phone" size={16} />Phone</div>
                  <div className="phones">{o.phones.map(p => <span key={p.number}><small>{p.label}</small>{p.number}</span>)}</div></>}
                </div>
                <div className="of"><span><b>{o.hours}</b><small>{o.off}</small></span>
                  <a className="btn btn-line btn-sm" style={{ color: 'var(--price)', borderColor: 'var(--price)' }} target="_blank" rel="noopener" href={o.directions || (/Motalib/.test(o.address) ? mapDirections : 'https://www.google.com/maps/search/' + encodeURIComponent(o.address))}>Get Direction <Icon name="share" size={14} /></a>
                </div>
              </div>
            )) : <p className="muted">No outlet found in this city yet.</p>}
          </div>
        </div></LiveEditChrome>

        <LiveEditChrome id="contact-biz" label="wholesale and reseller"><section className="sec">
          <div className="biz">
            <Biz id="wholesale" card={c.biz.wholesale} cls="ws" tag="Wholesaler Contact" onRequest={() => openBiz('Wholesale Enquiry')} />
            <Biz id="reseller" card={c.biz.reseller} cls="rs" tag="Reseller / Retailer Contact" applyHref="/reseller" />
          </div>
        </section></LiveEditChrome>

        <LiveEditChrome id="contact-form" label="message form"><section className="box">
          <h3><Icon name="mail" size={18} />{c.form.title}</h3>
          <form className="form-grid" id="cf" style={{ marginTop: 12 }} onSubmit={e => void send(e, { name: val(e.currentTarget, 'name'), phone: val(e.currentTarget, 'phone'), email: val(e.currentTarget, 'email'), subject: val(e.currentTarget, 'subject'), message: val(e.currentTarget, 'message') }, () => undefined, c.form.success)}>
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
            <div className="field"><label htmlFor="cf-name">Name <span className="req">*</span></label><input id="cf-name" name="name" className="input" required maxLength={160} /></div>
            <div className="field"><label htmlFor="cf-phone">Phone <span className="req">*</span></label><input id="cf-phone" name="phone" className="input" required inputMode="tel" maxLength={50} /></div>
            <div className="field"><label htmlFor="cf-email">Email</label><input id="cf-email" name="email" className="input" type="email" maxLength={255} /></div>
            <div className="field"><label htmlFor="cf-subj">Subject</label><select id="cf-subj" name="subject" className="select">{c.form.subjects.map(s => <option key={s}>{s}</option>)}</select></div>
            <div className="field full"><label htmlFor="cf-msg">Message <span className="req">*</span></label><textarea id="cf-msg" name="message" className="textarea" required maxLength={5000} /></div>
            <div className="full"><button className="btn btn-brand" type="submit" disabled={busy}>{busy ? 'Sending…' : c.form.button}</button></div>
          </form>
        </section></LiveEditChrome>
      </div>

      <Modal open={bizOpen} onClose={closeBiz} title={bizTitle}>
        <form className="modal-body form-grid" onSubmit={e => {
          const f = e.currentTarget;
          const lines = [`Business: ${val(f, 'biz')}`, `Contact person: ${val(f, 'person')}`, `District: ${val(f, 'district')}`, `Trade license: ${val(f, 'license') || '-'}`, `Monthly volume: ${val(f, 'volume')}`, `Requirements: ${val(f, 'req') || '-'}`];
          void send(e, { name: val(f, 'person'), phone: val(f, 'phone'), email: '', subject: bizTitle, message: lines.join('\n') }, closeBiz, 'Thank you! Our business team will contact you within 1 working day.');
        }}>
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
          <div className="field"><label>Business Name</label><input name="biz" className="input" required /></div>
          <div className="field"><label>Contact Person</label><input name="person" className="input" required /></div>
          <div className="field"><label>Phone</label><input name="phone" className="input" required inputMode="tel" /></div>
          <div className="field"><label>District</label><input name="district" className="input" required /></div>
          <div className="field"><label>Trade License No.</label><input name="license" className="input" /></div>
          <div className="field"><label>Monthly Volume</label><select name="volume" className="select">{VOLUMES.map(x => <option key={x}>{x}</option>)}</select></div>
          <div className="field full"><label>Requirements</label><textarea name="req" className="textarea" /></div>
          <button className="btn btn-brand btn-block full" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Submit'}</button>
        </form>
      </Modal>
    </>
  );
}
