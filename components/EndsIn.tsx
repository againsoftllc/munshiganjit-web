'use client';
/* StarTech-style countdown: one red tile per digit, labels under each unit.
   Used by Offer Details ("OFFER ENDS IN") and Deals ("ENDING IN"); calls onEnd once at 0. */
import { useEffect, useRef, useState } from 'react';

export default function EndsIn({ end, label, onEnd, className = '' }: { end: number; label: string; onEnd?: () => void; className?: string }) {
  const [left, setLeft] = useState<number | null>(null);
  const cb = useRef(onEnd); cb.current = onEnd;
  useEffect(() => {
    const tick = () => { const l = Math.max(0, Math.floor((end - Date.now()) / 1000)); setLeft(l); if (l === 0) { clearInterval(t); cb.current?.(); } };
    const t = setInterval(tick, 1000); tick();
    return () => clearInterval(t);
  }, [end]);
  const v = left == null ? [0, 0, 0, 0] : [Math.floor(left / 86400), Math.floor(left % 86400 / 3600), Math.floor(left % 3600 / 60), left % 60];
  return (
    <div className={'od-ends ' + className}>
      <span className="od-ends-l">{label}</span>
      <div className="od-cd">
        {v.map((n, i) => (
          <span key={i} className="od-unit">
            <span className="od-digits">{String(n).padStart(2, '0').split('').map((d, j) => <i key={j}>{d}</i>)}</span>
            <small>{['Days', 'Hours', 'Minutes', 'Seconds'][i]}</small>
          </span>
        ))}
      </div>
    </div>
  );
}
