'use client';
/* /categories — "View All Category": every main-menu category (Featured Category tiles) */
import { categories } from '@/lib/data';
import { Crumb } from '@/components/ui';
import { CatTile } from '../HomeClient';

export default function CategoriesClient() {
  return (
    <>
      <Crumb items={[['All Categories']]} />
      <div className="wrap" style={{ paddingTop: 22, paddingBottom: 30 }}>
        <div className="ch"><h1 style={{ fontSize: 24 }}>All Categories</h1><p>Choose a category to see its products</p></div>
        <div className="fcat-grid">{categories.map((c, i) => <CatTile key={c.slug} c={c} i={i} />)}</div>
      </div>
    </>
  );
}
