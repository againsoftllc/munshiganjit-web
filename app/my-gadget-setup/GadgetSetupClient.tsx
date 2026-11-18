'use client';
/* My Gadget Setup (replaces PC Builder, client doc point 20):
   Gadget Type → Brand → Model → Compatibility Check → report → Best Matching / You Can Also Buy
   per gadget group → Buy Now / Add to Cart → Export the report to WhatsApp.
   The last check is kept for this browser tab, so coming back (e.g. from Others) shows it again. */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { visibleProducts, site, type Product } from '@/lib/data';
import { DEVICE_TYPES, SETUP_GROUPS, brandsOf, modelsOf, devices, isBestMatch, reportOf, noteOf, emptyNoteOf, type Device } from '@/lib/phones';
import { money, productUrl } from '@/lib/format';
import { Crumb, Icon, ProductImg } from '@/components/ui';
import { useStore } from '@/components/store';

const KEY = 'nt3_setup';
interface Saved { type: string; brand: string; model: string; group: string; picked: string[] }

function Pick({ p, on, toggle }: { p: Product; on: boolean; toggle: () => void }) {
  const { addAndOpen } = useStore();
  return (
    <div className={'gs-item' + (on ? ' on' : '')}>
      <label className="gs-check"><input type="checkbox" checked={on} onChange={toggle} aria-label={'Select ' + p.name} /></label>
      <Link prefetch={false} href={productUrl(p.id)} className="gs-img"><ProductImg p={p} size={64} /></Link>
      <div className="gs-info">
        <Link prefetch={false} href={productUrl(p.id)} className="gs-name notranslate" translate="no">{p.name}</Link>
        <span className="gs-attrs">{Object.entries(p.attrs || {}).slice(0, 3).map(([k, v]) => k + ': ' + v).join(' · ')}</span>
        <span className="gs-price"><b>{money(p.price)}</b>{p.old && <s>{money(p.old)}</s>}</span>
      </div>
      <div className="gs-btns">
        <button className="btn btn-accent btn-sm" onClick={() => addAndOpen(p.id, 'buy')} disabled={p.stock === 'out'}>Buy Now</button>
        <button className="btn btn-line-brand btn-sm" onClick={() => addAndOpen(p.id, 'add')} disabled={p.stock === 'out'}>Add to Cart</button>
      </div>
    </div>
  );
}

export default function GadgetSetupClient() {
  const { addToCart, openDrawer, toast } = useStore();
  const [type, setType] = useState<string>(DEVICE_TYPES[0]?.[0] ?? '');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [device, setDevice] = useState<Device | null>(null);
  const [group, setGroup] = useState(SETUP_GROUPS[DEVICE_TYPES[0]?.[0] ?? '']?.[0]?.key ?? '');
  const [picked, setPicked] = useState<string[]>([]);

  /* devices and groups come from the My Gadget Setup plugin; restore the last check (this tab) */
  useEffect(() => { restore(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const restore = () => {
    try {
      const s: Saved | null = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      const d = s && devices.find(x => x.type === s.type && x.brand === s.brand && x.model === s.model);
      if (s && d) { setType(s.type); setBrand(s.brand); setModel(s.model); setDevice(d); setGroup(s.group); setPicked(s.picked); }
    } catch { /* private mode */ }
  };
  useEffect(() => {
    if (!device) return;
    try { sessionStorage.setItem(KEY, JSON.stringify({ type: device.type, brand: device.brand, model: device.model, group, picked } satisfies Saved)); } catch { /* private mode */ }
  }, [device, group, picked]);

  const check = () => {
    const d = devices.find(x => x.type === type && x.brand === brand && x.model === model);
    if (!d) return toast('Please choose gadget type, brand and model', 'alert');
    setDevice(null); setLoading(true); setPicked([]); setGroup(SETUP_GROUPS[type]?.[0]?.key ?? '');
    setTimeout(() => { setDevice(d); setLoading(false); }, 1400);
  };
  const toggle = (id: string) => setPicked(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));

  const groups = device ? SETUP_GROUPS[device.type] ?? [] : [];
  const g = groups.find(x => x.key === group) ?? groups[0];
  const inGroup = g ? visibleProducts.filter(g.pick) : [];
  const best = device && g ? inGroup.filter(p => isBestMatch(p, g, device)) : [];
  const also = device && g ? (g.showAll ? inGroup : inGroup.filter(p => !isBestMatch(p, g, device))) : [];
  const chosen = picked.map(id => visibleProducts.find(p => p.id === id)).filter((p): p is Product => !!p);
  const total = chosen.reduce((s, p) => s + p.price, 0);
  const report = device ? reportOf(device) : [];

  const exportWa = () => {
    if (!device) return;
    const origin = typeof location !== 'undefined' ? location.origin : '';
    const text = [`*My Gadget Setup — ${device.brand} ${device.model} (${device.type})*`, ...report.map(([k, v]) => `${k}: ${v}`), '',
      chosen.length ? '*Selected gadgets*' : '', ...chosen.map(p => `• ${p.name} — ${money(p.price)}\n  ${origin}${productUrl(p.id)}`),
      chosen.length ? `Total: ${money(total)}` : '', '', `Munshiganj IT · ${site.hotline}`].filter((l, i, a) => l || a[i - 1]).join('\n');
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  };
  const addAll = () => { chosen.forEach(p => addToCart(p.id)); openDrawer('cart'); };
  const note = !device || !g ? '' : noteOf(g, device);

  return (
    <>
      <Crumb items={[['My Gadget Setup']]} />
      <div className="wrap gs">
        <section className="gs-hero">
          <span className="gs-hero-ic"><Icon name="setup" size={34} /></span>
          <h1>Simplify Your Gadget Buying!</h1>
          <p>Choose gadgets and accessories compatible with your {DEVICE_TYPES.map(([n]) => n.toLowerCase()).reduce((a, n, i, all) => a + (i === 0 ? '' : i === all.length - 1 ? ' or ' : ', ') + n, '')}.</p>
          <div className="gs-form gs-form4">
            <div className="field"><label htmlFor="gs-t">Gadget Type:</label>
              <select id="gs-t" className="select" value={type} onChange={e => { setType(e.target.value); setBrand(''); setModel(''); }}>
                {DEVICE_TYPES.map(([t]) => <option key={t}>{t}</option>)}
              </select></div>
            <div className="field"><label htmlFor="gs-b">Brand:</label>
              <select id="gs-b" className="select" value={brand} onChange={e => { setBrand(e.target.value); setModel(''); }}>
                <option value="">Select brand</option>{brandsOf(type).map(b => <option key={b}>{b}</option>)}
              </select></div>
            <div className="field"><label htmlFor="gs-m">Model:</label>
              <select id="gs-m" className="select" value={model} disabled={!brand} onChange={e => setModel(e.target.value)}>
                <option value="">Select model</option>{modelsOf(type, brand).map(m => <option key={m.model}>{m.model}</option>)}
              </select></div>
            <button className="btn btn-accent gs-go" onClick={check} disabled={loading}><Icon name="checkCircle" size={18} />Compatibility Check</button>
          </div>
        </section>

        {loading && <div className="gs-loading" role="status"><span className="gs-spin" /><b>Checking compatibility…</b><span>Matching ports, sizes and power</span></div>}

        {device && g && <>
          <section className="gs-report">
            <h2><Icon name="invoice" size={20} />Your Report <small>{device.type}: {device.brand} {device.model}</small></h2>
            <div className="gs-rgrid">{report.map(([k, v]) => <div key={k}><span>{k}:</span><b>{v}</b></div>)}</div>
          </section>

          <section className="gs-pick">
            <h2>Choose Your Gadgets From Here</h2>
            <div className="gs-tabs" role="tablist">
              {groups.map(x => (
                <button key={x.key} role="tab" aria-selected={g.key === x.key} className={g.key === x.key ? 'on' : ''} onClick={() => setGroup(x.key)}><Icon name={x.icon} size={17} />{x.label}</button>
              ))}
              <Link prefetch={false} className="gs-tab-other" href="/categories"><Icon name="more" size={17} />Others</Link>
            </div>
            {inGroup.length === 0 ? (
              <div className="gs-col gs-soon"><Icon name="clock" size={20} /><p><b>{g.label}</b> for {device.model} are coming soon. Please call {site.hotline} and we will arrange one for you.</p></div>
            ) : (
              <div className="gs-cols">
                <div className="gs-col best">
                  <h3><Icon name="checkCircle" size={18} />Best Matching <em>{best.length}</em></h3>
                  <p className="gs-note">{note}</p>
                  {best.length ? best.map(p => <Pick key={p.id} p={p} on={picked.includes(p.id)} toggle={() => toggle(p.id)} />)
                    : <p className="muted gs-empty">{emptyNoteOf(g, device)}</p>}
                </div>
                <div className="gs-col also">
                  <h3><Icon name="layers" size={18} />You Can Also Buy <em>{also.length}</em></h3>
                  <p className="gs-note">{g.showAll ? 'All ' + g.label.toLowerCase() + 's we sell.' : 'Other products in this category.'}</p>
                  {also.length ? also.map(p => <Pick key={p.id} p={p} on={picked.includes(p.id)} toggle={() => toggle(p.id)} />) : <p className="muted gs-empty">Everything in this category is a best match.</p>}
                </div>
              </div>
            )}
          </section>

          <div className="gs-bar">
            <span><b>{chosen.length}</b> selected · <b>{money(total)}</b></span>
            <button className="btn btn-brand" onClick={addAll} disabled={!chosen.length}><Icon name="cart" size={16} />Add Selected to Cart</button>
            <button className="btn btn-wa" onClick={exportWa}><Icon name="whatsapp" size={16} />Export to WhatsApp</button>
          </div>
        </>}
      </div>
    </>
  );
}
