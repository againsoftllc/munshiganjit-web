/* Featured Categories — 8 × 2 grid of line-icon tiles under a centered heading (Techland-style layout, own icons). */
import Link from 'next/link';
import type { ReactNode } from 'react';

const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
const svg = (children: ReactNode) => <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" {...S}>{children}</svg>;

const ICONS: Record<string, ReactNode> = {
  laptop: svg(<><rect x="14" y="14" width="36" height="25" rx="2.5" /><path d="M6 46h52M10 46l4-7h36l4 7" /></>),
  ac: svg(<><rect x="7" y="16" width="50" height="18" rx="4" /><path d="M14 27h36M20 41q-3 5 0 10M32 41q-3 5 0 10M44 41q-3 5 0 10" /></>),
  desktop: svg(<><rect x="6" y="12" width="36" height="26" rx="2.5" /><path d="M24 38v7M15 45h18" /><rect x="46" y="14" width="12" height="34" rx="2" /><circle cx="52" cy="22" r="1.6" /><path d="M49 41h6" /></>),
  cpu: svg(<><rect x="19" y="19" width="26" height="26" rx="3" /><rect x="26" y="26" width="12" height="12" rx="1.5" /><path d="M26 12v7M32 12v7M38 12v7M26 45v7M32 45v7M38 45v7M12 26h7M12 32h7M12 38h7M45 26h7M45 32h7M45 38h7" /></>),
  board: svg(<><rect x="9" y="9" width="46" height="46" rx="3" /><rect x="16" y="16" width="14" height="14" rx="1.5" /><path d="M37 17h12M37 23h12M37 29h12M16 38h32M16 44h32M16 50h20" /></>),
  ssd: svg(<><rect x="6" y="20" width="52" height="24" rx="3" /><rect x="13" y="27" width="22" height="10" rx="1.5" /><path d="M42 27v10M47 27v10M52 27v10" /></>),
  gpu: svg(<><rect x="6" y="18" width="52" height="22" rx="3" /><circle cx="22" cy="29" r="7" /><circle cx="42" cy="29" r="7" /><circle cx="22" cy="29" r="2" /><circle cx="42" cy="29" r="2" /><path d="M12 40v6h22v-6M44 46h8" /></>),
  ram: svg(<><rect x="5" y="22" width="54" height="18" rx="2.5" /><rect x="11" y="27" width="8" height="8" /><rect x="23" y="27" width="8" height="8" /><rect x="35" y="27" width="8" height="8" /><rect x="47" y="27" width="8" height="8" /><path d="M10 40v5M16 40v5M22 40v5M28 40v5M34 40v5M40 40v5M46 40v5M52 40v5" /></>),
  tv: svg(<><rect x="7" y="16" width="50" height="32" rx="3" /><rect x="12" y="21" width="40" height="22" rx="2" /><path d="M24 8l8 8 8-8M20 48l-3 8M44 48l3 8" /></>),
  router: svg(<><rect x="7" y="38" width="50" height="14" rx="3" /><circle cx="16" cy="45" r="1.6" /><circle cx="23" cy="45" r="1.6" /><path d="M44 45h6M14 38V18M50 38V18M32 38V10M26 22q6-6 12 0M23 27q9-9 18 0" /></>),
  monitor: svg(<><rect x="6" y="10" width="52" height="34" rx="3" /><path d="M32 44v8M22 54h20" /></>),
  printer: svg(<><rect x="12" y="26" width="40" height="20" rx="3" /><path d="M20 26V12h24v14M20 40h24v14H20z" /><circle cx="46" cy="32" r="1.5" /></>),
  fryer: svg(<><rect x="17" y="8" width="30" height="46" rx="8" /><rect x="23" y="16" width="18" height="12" rx="3" /><path d="M25 38h14M28 44h8" /></>),
  washer: svg(<><rect x="11" y="6" width="42" height="52" rx="3" /><path d="M11 18h42" /><circle cx="19" cy="12" r="1.6" /><circle cx="26" cy="12" r="1.6" /><circle cx="32" cy="38" r="12" /><path d="M25 38q3.5-4 7 0t7 0" /></>),
  watch: svg(<><rect x="19" y="17" width="26" height="30" rx="8" /><path d="M24 17l2-9h12l2 9M24 47l2 9h12l2-9M26 29h12M26 35h8" /></>),
  camera: svg(<><path d="M22 18q10-9 20 0M26 23q6-5 12 0" /><rect x="12" y="29" width="40" height="9" rx="4" /><circle cx="32" cy="48" r="9" /><circle cx="32" cy="48" r="3.5" /></>),
};

const TILES: { label: string; icon: keyof typeof ICONS; q: string }[] = [
  { label: 'Laptop', icon: 'laptop', q: 'Laptop' },
  { label: 'Air Conditioner', icon: 'ac', q: 'Air Conditioner' },
  { label: 'Desktop', icon: 'desktop', q: 'Desktop' },
  { label: 'Processor', icon: 'cpu', q: 'Processor' },
  { label: 'Motherboard', icon: 'board', q: 'Motherboard' },
  { label: 'SSD', icon: 'ssd', q: 'SSD' },
  { label: 'Graphics Card', icon: 'gpu', q: 'Graphics Card' },
  { label: 'RAM', icon: 'ram', q: 'RAM' },
  { label: 'Television', icon: 'tv', q: 'Television' },
  { label: 'Router', icon: 'router', q: 'Router' },
  { label: 'Monitor', icon: 'monitor', q: 'Monitor' },
  { label: 'Printer', icon: 'printer', q: 'Printer' },
  { label: 'Air Fryer', icon: 'fryer', q: 'Air Fryer' },
  { label: 'Washing Machine', icon: 'washer', q: 'Washing Machine' },
  { label: 'Smart Watch', icon: 'watch', q: 'Smart Watch' },
  { label: 'WiFi Camera', icon: 'camera', q: 'WiFi Camera' },
];

export default function FeaturedCats() {
  return (
    <>
      <div className="fcx-head">
        <h2>Featured Categories</h2>
        <p>Explore our wide range of tech products</p>
      </div>
      <div className="fcx-grid">
        {TILES.map(t => (
          <Link prefetch={false} key={t.label} className="fcx-tile" href={'/search?q=' + encodeURIComponent(t.q)}>
            <span className="fcx-ic">{ICONS[t.icon]}</span>
            <span className="fcx-name">{t.label}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
