'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Icon, Crumb } from '@/components/ui';
import { useHomeCfg } from '@/components/live-edit/EmbedLiveEdit';
import { LiveEditChrome } from '@/components/live-edit/LiveEditSection';
import { DELIVERY_FALLBACK, fillDelivery, type Delivery } from '@/lib/delivery';

/* the questions come from Live Edit (Help & Support); what is not changed there is lib/info.ts DEFAULT_FAQ */
type QA = [string, string];
const PILLS: [string, string, string, string][] = [['delivery', 'Delivery', 'truck', 'c-green'], ['emi', 'EMI', 'card', 'c-violet'], ['warranty', 'Warranty', 'shield', 'c-orange'], ['cancel', 'Cancel order', 'xCircle', 'c-red'], ['return', 'Return', 'returns', 'c-blue']];
const key = (g: string, i: number) => g + ':' + i;
const hits = (v: string, qa: QA) => !v || (qa[0] + qa[1]).toLowerCase().includes(v);

export default function FaqClient({ delivery = DELIVERY_FALLBACK }: { delivery?: Delivery }) {
  const cfg = useHomeCfg().faq;
  const F = cfg.groups.filter(g => !g.hidden).map(g => ({ ...g, qa: g.items.map((x): QA => [x.q, fillDelivery(x.a, delivery)]) }));
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('orders');
  const [open, setOpen] = useState<Set<string>>(() => new Set([key('orders', 0)]));
  const v = q.toLowerCase().trim();

  const search = (val: string) => {
    setQ(val);
    const s = val.toLowerCase().trim();
    if (!s) return;
    setOpen(o => { const n = new Set(o); F.forEach(g => g.qa.forEach((qa, i) => { if (hits(s, qa)) n.add(key(g.id, i)); })); return n; });
  };
  const toggle = (k: string) => setOpen(o => { const n = new Set(o); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const goCat = (id: string) => {
    setCat(id);
    const el = document.getElementById(id);
    if (el) scrollTo({ top: el.getBoundingClientRect().top + scrollY - 150, behavior: 'smooth' });
  };

  const any = F.some(g => g.qa.some(qa => hits(v, qa)));

  return (
    <>
      <Crumb items={[['Help & Support']]} />
      <div className="wrap">
        <LiveEditChrome id="faq-hero" label="title and search"><section className="faq-hero"><h1>{cfg.hero.title}</h1><p>{cfg.hero.subtitle}</p>
          <div className="ig"><Icon name="search" size={18} /><input className="input" id="fq" placeholder={cfg.hero.placeholder} value={q} onChange={e => search(e.target.value)} /></div>
          <div className="brand-pills" style={{ justifyContent: 'center', margin: '14px 0 0' }}>
            {PILLS.map(([k, label, ic, tone]) => <button key={k} className={'pill faq-pill ' + tone} data-q={k} onClick={() => search(k)}><Icon name={ic} size={14} />{label}</button>)}
          </div>
        </section></LiveEditChrome>
        <LiveEditChrome id="faq-groups" label="questions and answers"><div className="faq-wrap">
          <nav className="faq-cats" id="cats">
            {F.map(c => <button key={c.id} className={cat === c.id ? 'on' : ''} data-c={c.id} onClick={() => goCat(c.id)}><span className={'fc-ic ' + c.tone}><Icon name={c.icon} size={17} /></span>{c.title}<em>{c.qa.length}</em></button>)}
          </nav>
          <div id="faq">
            {F.map(c => {
              const n = c.qa.filter(qa => hits(v, qa)).length;
              return (
                <div className="faq-g" id={c.id} key={c.id} hidden={!n}>
                  <h3><span className={'fg-ic ' + c.tone}><Icon name={c.icon} size={18} /></span>{c.title}</h3>
                  {c.qa.map((qa, i) => (
                    <div key={i} className={'acc-item' + (open.has(key(c.id, i)) ? ' open' : '')} hidden={!hits(v, qa)}>
                      <button className="acc-head" onClick={() => toggle(key(c.id, i))}>{qa[0]}<Icon name="down" size={18} /></button>
                      <div className="acc-body">{qa[1]}</div>
                    </div>
                  ))}
                </div>
              );
            })}
            <div className="oops" id="none" hidden={any}><h3>No matching question</h3><p>Try another keyword or contact us.</p></div>
          </div>
        </div></LiveEditChrome>
        <LiveEditChrome id="faq-help" label="call, WhatsApp and contact"><section className="sec"><div className="help-row">
          {cfg.help.map((t, i) => {
            const inner = <><span className={'cm-ic ' + t.tone}><Icon name={t.icon} size={22} /></span><span><small>{t.small}</small><b>{t.title}</b></span></>;
            return t.href.startsWith('/') ? <Link key={i} className="c-mini" href={t.href}>{inner}</Link> : <a key={i} className="c-mini" href={t.href} {...(t.href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}>{inner}</a>;
          })}
        </div></section></LiveEditChrome>
      </div>
    </>
  );
}
