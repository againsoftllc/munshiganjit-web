'use client';
/* News Headline ticker (StarTech style) — auto-scrolls, pauses on hover.
   Text comes from `newsHeadlines` in lib/data.ts (later: admin-editable via againERP API). */
import { newsHeadlines } from '@/lib/data';
import { Icon } from './ui';
import { useHomeCfg } from './live-edit/EmbedLiveEdit';

export default function NewsTicker() {
  const { ticker } = useHomeCfg();
  // Live Edit's own headline list when one was saved, else the headlines set up in Marketing
  const items = ticker ? ticker.filter(n => !n.hidden) : newsHeadlines.filter(n => n.active);
  if (!items.length) return null;
  const line = items.map((n, i) => (
    <span key={i} className="nt-item">{n.text}<i className="nt-dot" aria-hidden="true" /></span>
  ));
  return (
    <div className="news-ticker" role="marquee" aria-label="News headlines">
      <span className="nt-label"><Icon name="bell" size={16} />News</span>
      <div className="nt-viewport">
        {/* one pass: the line comes in from the right, runs out on the left, and only then starts again (the track starts one screen wide of blank). Speed scales with text length */}
        <div className="nt-track" style={{ animationDuration: Math.max(24, 14 + items.reduce((n, x) => n + x.text.length, 0) / 5) + 's' }}>
          {line}
        </div>
      </div>
    </div>
  );
}
