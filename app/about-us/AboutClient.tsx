'use client';
/* About Us. Every block comes from the admin's Live Edit (see lib/about.ts for what it shows until something is saved); the
   address, the map and the legal numbers are the site's own (Settings > Site). The page is not written in Website > Pages. */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Icon, Crumb, CountUp } from '@/components/ui';
import { site } from '@/lib/data';
import { safeHtml } from '@/lib/html';
import { useHomeCfg } from '@/components/live-edit/EmbedLiveEdit';
import { LiveEditChrome } from '@/components/live-edit/LiveEditSection';

export default function AboutClient() {
  const a = useHomeCfg().about;
  const [zoom, setZoom] = useState<{ src: string; title: string } | null>(null);
  useEffect(() => {
    if (!zoom) return;
    document.body.classList.add('lock');
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoom(null); };
    addEventListener('keydown', k);
    return () => { document.body.classList.remove('lock'); removeEventListener('keydown', k); };
  }, [zoom]);

  const stats = a.stats.items.filter(s => !s.hidden);
  const pillars = a.pillars.items.filter(p => !p.hidden);
  const letters = a.auth.items.filter(l => !l.hidden);
  const L = site.legal;
  const legal: [string, string][] = [['BIN No', L.bin], ['TIN No', L.tin], ['Trade License No', L.tradeLicense]];
  const h = a.hero;

  return (
    <>
      <Crumb items={[['About Us']]} />

      <LiveEditChrome id="about-hero" label="top banner">
        <section className="ab-hero">
          <div className="wrap ab-hero-in">
            <div className="ab-hero-txt">
              {h.eyebrow && <span className="ab-eyebrow"><Icon name="award" size={14} />{h.eyebrow}</span>}
              <h1>{h.title}</h1>
              {h.subtitle && <p>{h.subtitle}</p>}
              <div className="ab-btns">
                {h.primaryText && <Link className="btn btn-accent" href={h.primaryHref}>{h.primaryText}<Icon name="arrow" size={16} /></Link>}
                {h.secondaryText && <Link className="btn ab-btn-ghost" href={h.secondaryHref}>{h.secondaryText}</Link>}
              </div>
            </div>
            <div className="ab-hero-vis">
              {h.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={h.image} alt={h.title} />
              ) : (
                <div className="ab-promise">
                  <b>{h.cardTitle}</b>
                  <ul>{h.points.map(p => <li key={p}><span><Icon name="check" size={14} /></span>{p}</li>)}</ul>
                </div>
              )}
            </div>
          </div>
        </section>
      </LiveEditChrome>

      <div className="wrap ab-wrap">
        {stats.length > 0 && (
          <LiveEditChrome id="about-stats" label="numbers">
            <section className="ab-stats">
              {stats.map(s => <div key={s.label}>{s.icon && <i className="ab-stat-ico"><Icon name={s.icon} size={26} /></i>}<b><CountUp to={s.value} suffix={s.suffix} /></b><span>{s.label}</span></div>)}
            </section>
          </LiveEditChrome>
        )}

        <LiveEditChrome id="about-story" label="our story">
          <section className={'ab-story' + (a.story.image ? ' has-img' : '')}>
            <div className="ab-story-txt">
              {a.story.eyebrow && <span className="ab-kicker">{a.story.eyebrow}</span>}
              <h2>{a.story.title}</h2>
              <div className="ab-rich" dangerouslySetInnerHTML={{ __html: safeHtml(a.story.html) }} />
            </div>
            {a.story.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <div className="ab-story-img"><img src={a.story.image} alt={a.story.title} loading="lazy" /></div>
            )}
          </section>
        </LiveEditChrome>

        {pillars.length > 0 && (
          <LiveEditChrome id="about-pillars" label="mission, vision and promises">
            <section className="ab-sec">
              <header className="ab-head">
                {a.pillars.title && <h2>{a.pillars.title}</h2>}
                {a.pillars.subtitle && <p>{a.pillars.subtitle}</p>}
              </header>
              <div className="ab-pillars">
                {pillars.map((p, i) => (
                  <article key={p.title + i} className="ab-pillar">
                    <span className="ab-ico"><Icon name={p.icon} size={22} /></span>
                    <h3>{p.title}</h3>
                    <p>{p.text}</p>
                  </article>
                ))}
              </div>
            </section>
          </LiveEditChrome>
        )}

        {letters.length > 0 && (
          <LiveEditChrome id="about-auth" label="authorized distributor letters">
            <section className="ab-sec ab-auth" id="authorized">
              <header className="ab-head">
                {a.auth.eyebrow && <span className="ab-kicker">{a.auth.eyebrow}</span>}
                {a.auth.title && <h2>{a.auth.title}</h2>}
                {a.auth.subtitle && <p>{a.auth.subtitle}</p>}
              </header>
              <div className="ab-letters">
                {letters.map((l, i) => (
                  <button key={l.image + i} type="button" className="ab-letter" onClick={() => setZoom({ src: l.image, title: l.title || l.brand })} aria-label={'Open ' + (l.title || l.brand)}>
                    <span className="ab-paper">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={l.image} alt={l.title || l.brand} loading="lazy" />
                      <span className="ab-zoom"><Icon name="zoom" size={18} /></span>
                    </span>
                    <span className="ab-letter-cap">
                      {l.brand && <em>{l.brand}</em>}
                      {l.title && <b>{l.title}</b>}
                      {l.text && <small>{l.text}</small>}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </LiveEditChrome>
        )}

        <LiveEditChrome id="about-visit" label="visit us and legal numbers">
          <section className="ab-sec ab-visit">
            <div className="ab-visit-card">
              <div className="ab-visit-txt">
                <h2>{a.visit.title}</h2>
                {a.visit.text && <p>{a.visit.text}</p>}
                <ul>
                  <li><Icon name="pin" size={16} />{site.address}</li>
                  {site.hours && <li><Icon name="clock" size={16} />{site.hours}</li>}
                </ul>
                {a.visit.button && site.map.directions && <a className="btn btn-brand" href={site.map.directions} target="_blank" rel="noopener noreferrer">{a.visit.button}</a>}
              </div>
              {!a.visit.hideMap && site.map.embed && (
                <div className="ab-map"><iframe src={site.map.embed} title="Map" loading="lazy" referrerPolicy="no-referrer-when-downgrade" /></div>
              )}
            </div>
            {!a.visit.hideLegal && (
              <div className="ab-legal" id="legal">
                {legal.filter(r => r[1]).map(r => <div key={r[0]}><span>{r[0]} of Munshiganj IT</span><b>{r[1]}</b></div>)}
              </div>
            )}
          </section>
        </LiveEditChrome>

        <LiveEditChrome id="about-cta" label="closing banner">
          <section className="ab-cta">
            <div>
              <h2>{a.cta.title}</h2>
              {a.cta.text && <p>{a.cta.text}</p>}
            </div>
            <div className="ab-btns">
              {a.cta.button && <Link className="btn btn-accent" href={a.cta.href}>{a.cta.button}</Link>}
              {a.cta.secondText && <Link className="btn ab-btn-ghost" href={a.cta.secondHref}>{a.cta.secondText}</Link>}
            </div>
          </section>
        </LiveEditChrome>
      </div>

      {zoom && (
        <div className="ab-lightbox" role="dialog" aria-modal="true" aria-label={zoom.title} onClick={() => setZoom(null)}>
          <button type="button" className="ab-lb-x" aria-label="Close" onClick={() => setZoom(null)}><Icon name="close" size={22} /></button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={zoom.src} alt={zoom.title} onClick={e => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
