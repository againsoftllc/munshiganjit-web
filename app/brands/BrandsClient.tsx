'use client';
/* /brands — all brand logos as 3D cards. Clicking a logo opens that brand's product
   listing (left-side filters, Buy Now and Add to Cart) with no brand logos on top. */
import { brands } from '@/lib/data';
import { Crumb } from '@/components/ui';
import Listing from '@/components/Listing';
import { BrandGrid } from '@/components/BrandStrip';

export default function BrandsClient({ brand }: { brand?: string }) {
  const valid = brand && brands.some(b => b[0] === brand) ? brand : undefined;
  if (valid) return (
    <>
      <Crumb items={[['All Brands', '/brands'], [valid]]} />
      <Listing key={valid} mode="brand" hideCrumb initial={{ brand: valid }} />
    </>
  );
  return (
    <>
      <Crumb items={[['All Brands']]} />
      <div className="wrap brands-top">
        <div className="ch">
          <h2>Shop by Brand</h2>
          <p>Official partner of 60+ global brands — select a brand to see its products</p>
        </div>
        <BrandGrid />
      </div>
    </>
  );
}
