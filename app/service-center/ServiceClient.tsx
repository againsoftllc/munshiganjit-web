'use client';
/* /service-center — service center info + repair / warranty request (later POST /service-requests) */
import Link from 'next/link';
import { Icon, Crumb } from '@/components/ui';
import { useStore } from '@/components/store';
import { site } from '@/lib/data';
import { ApiError, sendContact } from '@/lib/api';
import { useHomeCfg } from '@/components/live-edit/EmbedLiveEdit';
import { LiveEditChrome } from '@/components/live-edit/LiveEditSection';
import { telHref } from '@/lib/contact';

export default function ServiceClient() {
  const { toast } = useStore();
  const c = useHomeCfg().service;
  const hotline = c.info.hotline || site.hotline;
  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget, d = new FormData(form), v = (k: string) => String(d.get(k) || '').trim();
    try {
      await sendContact({ name: v('name'), phone: v('phone'), email: '', subject: 'Service request: ' + v('type'), message: ['Product & model: ' + v('prod'), 'Invoice / Order ID: ' + (v('order') || '-'), 'Service type: ' + v('type'), '', v('msg')].join('\n'), website: v('website') });
      toast(c.form.success);
      form.reset();
    } catch (err) { toast(err instanceof ApiError ? err.message : 'Could not send the request. Please call us on ' + hotline + '.'); }
  };
  return (
    <>
      <Crumb items={[['Service Center']]} />
      <div className="wrap">
        <LiveEditChrome id="service-info" label="service center details"><section className="addr-map">
          <div className="am-info">
            <h1 style={{ fontSize: 22, marginBottom: 18 }}>{c.info.title}</h1>
            <div className="am-line"><span className="ic"><Icon name="pin" size={19} /></span><div><b>Address</b><span>{c.info.address || site.address}</span></div></div>
            <div className="am-line"><span className="ic"><Icon name="clock" size={19} /></span><div><b>Service Hours</b><span>{c.info.hours}</span></div></div>
            <div className="am-line"><span className="ic"><Icon name="phone" size={19} /></span><div><b>Hotline</b><a href={telHref(hotline)}>{hotline}</a></div></div>
            <div className="am-line"><span className="ic"><Icon name="truck" size={19} /></span><div><b>Outside Dhaka</b><span>{c.info.outside}</span></div></div>
            <div className="am-line"><span className="ic"><Icon name="shield" size={19} /></span><div><b>Before you come</b><span>{c.info.before}{c.info.policyText && <> See our <Link href="/policy#warranty">{c.info.policyText}</Link>.</>}</span></div></div>
          </div>
          <iframe title="Munshiganj IT Service Center on Google Maps" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={c.info.mapEmbed || site.map.embed}></iframe>
        </section></LiveEditChrome>

        <LiveEditChrome id="service-form" label="repair request form"><section className="box sec">
          <h3><Icon name="support" size={18} />{c.form.title}</h3>
          <form className="form-grid" style={{ marginTop: 12 }} onSubmit={send}>
            <div className="field"><label htmlFor="sv-name">Full Name <span className="req">*</span></label><input id="sv-name" name="name" className="input" required /></div>
            <div className="field"><label htmlFor="sv-phone">Phone <span className="req">*</span></label><input id="sv-phone" name="phone" className="input" required inputMode="tel" /></div>
            <div className="field"><label htmlFor="sv-prod">Product &amp; Model <span className="req">*</span></label><input id="sv-prod" name="prod" className="input" required /></div>
            <div className="field"><label htmlFor="sv-order">Invoice / Order ID</label><input id="sv-order" name="order" className="input" placeholder="NTE-XXXXXX" /></div>
            <div className="field"><label htmlFor="sv-type">Service Type</label><select id="sv-type" name="type" className="select">{c.form.types.map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="field full"><label htmlFor="sv-msg">Problem Details <span className="req">*</span></label><textarea id="sv-msg" name="msg" className="textarea" required /></div>
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
            <div className="full"><button className="btn btn-brand" type="submit">{c.form.button}</button></div>
          </form>
        </section></LiveEditChrome>
      </div>
    </>
  );
}
