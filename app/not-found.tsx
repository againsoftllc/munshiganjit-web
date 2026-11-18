import type { Metadata } from 'next';
import Link from 'next/link';
import { categories, visibleProducts as products } from '@/lib/data';
import { catUrl } from '@/lib/format';
import { Crumb, Icon, SecHead, ProductCard } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: { index: false },
};

export default function NotFound() {
  const popular = products.filter(p => p.stock === 'in').sort((a, b) => b.sold - a.sold).slice(0, 5);
  return (
    <>
      <Crumb items={[['The page you requested cannot be found!']]} />
      <div className="wrap">
        <div className="oops">
          <div className="oops-art">
            <span className="dot" style={{ width: 22, height: 22, right: 4, top: 186 }} />
            <span className="dot" style={{ width: 10, height: 10, left: -26, top: 96, background: 'var(--brand)' }} />
            <span className="dot" style={{ width: 12, height: 12, right: -34, top: 64 }} />
            <div className="inner">404</div>
          </div>
          <h3>Oops!</h3>
          <p>The page you requested cannot be found.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn btn-brand" href="/">Continue</Link>
            <Link className="btn btn-line" href="/offers">See Offers</Link>
          </div>
        </div>
        <section className="sec">
          <SecHead a="You might be" b="looking for" />
          <div className="cat-tiles" style={{ paddingTop: 0 }}>
            {categories.map(c => (
              <Link key={c.slug} className="ctile" href={catUrl(c.slug)}><span className="ci"><Icon name={c.icon} size={22} /></span><b>{c.name}</b><span>{c.count} items</span></Link>
            ))}
            <Link className="ctile deal" href="/offers"><span className="ci"><Icon name="tag" size={22} /></span><b>Offers</b><span>Hot deals</span></Link>
          </div>
        </section>
        <section className="sec">
          <SecHead a="Popular" b="Products" link="/products" />
          <div className="grid g5">{popular.map(p => <ProductCard key={p.id} p={p} />)}</div>
        </section>
      </div>
    </>
  );
}
