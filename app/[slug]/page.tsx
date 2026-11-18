import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Listing from '@/components/Listing';
import ProductDetail from '@/components/ProductDetail';
import JsonLd from '@/components/seo/JsonLd';
import BrandsClient from '../brands/BrandsClient';
import HappyHourPage, { happyHourMeta } from '@/components/HappyHourPage';
import { getHappyHour } from '@/lib/happyHour';
import { brands, categories, categoryTextFor, detailsOf, byId, site, visibleProducts } from '@/lib/data';
import { catUrl, productUrl, brandUrl } from '@/lib/format';
import { resolveSlug } from '@/lib/resolve';
import { one, type SP } from '@/lib/catRoute';
import { loadFresh } from '@/lib/live';
import { applyMetaTemplate, breadcrumbSchema, collectionSchema, getSeoConfig, ogCard, productSchema } from '@/lib/seo';

type Params = Promise<{ slug: string }>;

const catName = (slug: string) => categories.find(c => c.slug === slug)?.name || slug;

/** a category page's title: the admin's pattern when there is one, else "<name> Price in Bangladesh" */
function pageTitle(pattern: string | undefined, vars: Record<string, string | number | undefined>, fallback: string) {
  const t = applyMetaTemplate(pattern, vars);
  return { shown: t || fallback, title: t ? { absolute: t } : fallback };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  await loadFresh();
  const { slug } = await params;
  const r = resolveSlug(slug);
  if (!r || r.type === 'brand') {
    const hh = await getHappyHour(slug);
    if (hh) return happyHourMeta(hh);
  }
  if (!r) return { title: 'Not Found' };
  const seo = await getSeoConfig();
  const siteName = seo.business.name.trim() || site.name || 'Munshiganj IT';

  if (r.type === 'product') {
    const p = byId(r.id)!;
    const d = detailsOf(p.id);
    const vars = { name: p.name, brand: p.brand, category: p.sub2 || p.sub, site: siteName, sku: p.model, price: p.price > 0 ? p.price : '' };
    const pTitle = applyMetaTemplate(seo.meta.product_title, vars);
    const pDesc = applyMetaTemplate(seo.meta.product_description, vars);
    // a title written on the product itself wins over the pattern; the pattern wins over the default
    const shown = d.seoTitle || pTitle || p.name;
    const description = d.seoDesc || pDesc || p.specs.slice(0, 5).join(' · ') || undefined;
    const path = productUrl(p.id);
    return {
      title: d.seoTitle ? d.seoTitle : pTitle ? { absolute: pTitle } : p.name,
      description,
      alternates: { canonical: path },
      openGraph: ogCard({ title: shown, description, path, image: p.image }, siteName),
      twitter: { card: 'summary_large_image', title: shown, description, images: p.image ? [p.image] : undefined },
    };
  }

  if (r.type === 'brand') {
    const vars = { name: r.name, brand: r.name, site: siteName };
    const { shown, title } = pageTitle(seo.meta.brand_title, vars, `${r.name} Products Price in Bangladesh`);
    const description = applyMetaTemplate(seo.meta.brand_description, vars) || `Buy ${r.name} products at the best price in Bangladesh from Munshiganj IT — official warranty, EMI and nationwide delivery.`;
    const path = brandUrl(r.name);
    return { title, description, alternates: { canonical: path }, openGraph: ogCard({ title: shown, description, path }, siteName) };
  }

  // a sub-category named after a brand (Power Bank > Xiaomi) reads "Xiaomi Power Bank"
  const isBrand = !!r.sub && brands.some(b => b[0].toLowerCase() === r.sub!.toLowerCase());
  const name = r.sub2 ? `${r.sub2} ${r.sub}` : r.sub ? (isBrand ? `${r.sub} ${r.cat.name}` : r.sub) : r.cat.name;
  const vars = { name, category: r.cat.name, site: siteName };
  const { shown, title } = pageTitle(seo.meta.category_title, vars, `${name} Price in Bangladesh`);
  // what the admin wrote for this very category (Website > Categories: Meta title / Meta description) comes before the general pattern
  const own = categoryTextFor(r.cat, r.sub, r.sub2);
  const shownTitle = own?.metaTitle || shown;
  const description = own?.metaDescription || applyMetaTemplate(seo.meta.category_description, vars) || `Buy ${name} at the best price in Bangladesh from Munshiganj IT — official warranty, EMI and nationwide delivery.`;
  const path = r.sub ? catUrl(r.cat.slug, { sub: r.sub, sub2: r.sub2 }) : catUrl(r.cat.slug);
  return { title: own?.metaTitle ? { absolute: own.metaTitle } : title, description, alternates: { canonical: path }, openGraph: ogCard({ title: shownTitle, description, path }, siteName) };
}

export default async function SlugPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  await loadFresh();
  const { slug } = await params;
  const r = resolveSlug(slug);
  // /<campaign slug>: a Happy Hour campaign of the admin (after categories and products, before a brand of the same name)
  if (!r || r.type === 'brand') {
    const hh = await getHappyHour(slug);
    if (hh) return <HappyHourPage hh={hh} />;
  }
  if (!r) notFound();
  const seo = await getSeoConfig();
  const siteName = seo.business.name.trim() || site.name || 'Munshiganj IT';

  if (r.type === 'product') {
    const p = byId(r.id)!;
    // category chain: top category, the sub-category, the third level, then the product
    const path = [{ name: catName(p.cat), href: catUrl(p.cat) }, ...(p.sub && p.sub !== catName(p.cat) ? [{ name: p.sub, href: catUrl(p.cat, { sub: p.sub }) }] : []), ...(p.sub2 ? [{ name: p.sub2, href: catUrl(p.cat, { sub: p.sub, sub2: p.sub2 }) }] : [])];
    const ld = seo.enabled && seo.pages.product
      ? [productSchema(p, detailsOf(p.id).desc, seo, siteName, path.map(c => c.name).join(" > ")), breadcrumbSchema([{ name: 'Home', href: '/' }, ...path, { name: p.name, href: productUrl(p.id) }])]
      : [];
    return (
      <>
        <JsonLd data={ld} />
        <ProductDetail key={r.id} id={r.id} />
      </>
    );
  }

  if (r.type === 'brand') {
    const ld = seo.enabled && seo.pages.brand
      ? collectionSchema({ name: `${r.name} Products`, path: brandUrl(r.name), products: visibleProducts.filter(p => p.brand === r.name), crumbs: [{ name: 'Home', href: '/' }, { name: r.name, href: brandUrl(r.name) }] })
      : [];
    return (
      <>
        <JsonLd data={ld} />
        <BrandsClient key={r.name} brand={r.name} />
      </>
    );
  }

  const sp = await searchParams;
  // old links (/power-bank?sub=Xiaomi) go to the sub-category's own address
  const legacySub = one(sp.sub);
  if (!r.sub && legacySub) permanentRedirect(catUrl(r.cat.slug, { sub: legacySub }));
  const initial = { ...(r.sub ? { sub: r.sub } : {}), ...(r.sub2 ? { sub2: r.sub2 } : {}), brand: r.sub ? undefined : one(sp.brand), stock: one(sp.stock), sort: one(sp.sort) };
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: r.cat.name, href: catUrl(r.cat.slug) },
    ...(r.sub ? [{ name: r.sub, href: catUrl(r.cat.slug, { sub: r.sub }) }] : []),
    ...(r.sub2 ? [{ name: r.sub2, href: catUrl(r.cat.slug, { sub: r.sub, sub2: r.sub2 }) }] : []),
  ];
  const here = crumbs[crumbs.length - 1];
  const ld = seo.enabled && seo.pages.category
    ? collectionSchema({
        name: r.sub2 ? `${r.sub2} ${r.sub}` : r.sub || r.cat.name, path: here.href,
        products: visibleProducts.filter(p => p.cat === r.cat.slug && (!r.sub || p.sub === r.sub) && (!r.sub2 || p.sub2 === r.sub2)), crumbs,
      })
    : [];
  return (
    <>
      <JsonLd data={ld} />
      <Listing key={[slug, initial.brand, initial.stock, initial.sort].join('|')} mode="category" catSlug={r.cat.slug} initial={initial} about={categoryTextFor(r.cat, r.sub, r.sub2)?.description} />
    </>
  );
}
