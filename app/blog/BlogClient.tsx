'use client';
import { useState } from 'react';
import { Icon, Crumb } from '@/components/ui';
import { blog } from '@/lib/data';
import PostCard from './PostCard';

/* the icon of a category tile (by the category's name in the admin's Blog > Categories); any other name gets the tag icon */
const ICON: Record<string, string> = { 'buying guide': 'layers', reviews: 'starO', 'tips & tricks': 'bolt', 'tech news': 'globe', lifestyle: 'home' };
const PER_PAGE = 9;

export default function BlogClient() {
  const [active, setActive] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  /* the category tiles and their article counts come from the articles themselves (what the admin published) */
  const FC: [string, string, number][] = [];
  for (const b of blog) {
    if (!b.cat) continue;
    const hit = FC.find(c => c[0] === b.cat);
    if (hit) hit[2]++; else FC.push([b.cat, ICON[b.cat.toLowerCase()] || 'tag', 1]);
  }
  const all = blog.slice(3).concat(blog.slice(0, 1)).filter(b => !active || b.cat === active);
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const cur = Math.min(page, pages);
  const latest = all.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);
  const go = (n: number) => { setPage(n); document.getElementById('latest')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return (
    <>
      <Crumb items={[['Blog']]} />
      <div className="wrap">
        <section className="sec"><div className="center-head"><h2>Featured Categories</h2><p>Read insightful articles from top categories</p></div>
          <div className="fcats" id="fcats">
            {FC.map(c => (
              <a key={c[0]} className={'fcat' + (active === c[0] ? ' on' : '')} href="#latest" data-c={c[0]} onClick={e => {
                e.preventDefault();
                setActive(a => (a === c[0] ? null : c[0]));
                setPage(1);
                document.getElementById('latest')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}>
                <span className="fi"><Icon name={c[1]} size={22} /></span><span><b>{c[0]}</b><span>{c[2]} {c[2] === 1 ? 'Article' : 'Articles'}</span></span>
              </a>
            ))}
          </div>
        </section>
        <section className="sec" style={{ paddingTop: 6 }}><div className="center-head"><h2>Feature Articles</h2><p>Read the latest tech articles by the industry experts!</p></div>
          <div className="grid g3" id="feat">{blog.slice(0, 3).map(b => <PostCard key={b.id} b={b} />)}</div>
        </section>
        <section className="sec" style={{ paddingTop: 6 }}><div className="center-head"><h2 id="lt">{active || 'Latest Article'}</h2><p>Buying guides, reviews and news for Bangladeshi buyers</p></div>
          <div className="grid g3" id="latest">
            {latest.length ? latest.map(b => <PostCard key={b.id} b={b} />) : <p className="muted">No articles yet in this category.</p>}
          </div>
          {pages > 1 && (
            <nav className="pagination">
              {Array.from({ length: pages }, (_, i) => i + 1).map(n => cur === n ? <span key={n} className="on">{n}</span> : <a key={n} href="#latest" onClick={e => { e.preventDefault(); go(n); }}>{n}</a>)}
              {cur < pages && <a href="#latest" aria-label="Next" onClick={e => { e.preventDefault(); go(cur + 1); }}><Icon name="right" size={14} /></a>}
            </nav>
          )}
        </section>
      </div>
    </>
  );
}
