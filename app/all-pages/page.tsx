import type { Metadata } from 'next';
import Link from 'next/link';
import { Icon } from '@/components/ui';
import { catUrl, productUrl, blogUrl } from '@/lib/format';
import { blog } from '@/lib/data';

export const metadata: Metadata = {
  title: 'All Pages — UI Review',
  robots: { index: false },
};

const PG: [href: string, icon: string, title: string, desc: string, ref: string][] = [
  ['/', 'home', 'Home Page', 'Daraz slider · Total Successful Orders · moving circle products · recently-bought popup · share experience', 'Daraz + Motion View + TV Hut'],
  [catUrl('power-bank'), 'grid', 'Product Listing', 'Grid/List · Price, Availability, Brand, Rating filters · Sort · Pagination · product counts by brand / category / sub-category', 'StarTech'],
  ['/offers', 'gift', 'Offers', 'Time-bound offer cards with date range and outlet · Offer Details with countdown, terms and product links · ended offers hide automatically', 'StarTech'],
  ['/offers/mega-tech-fest', 'calendar', 'Offer Details', 'OFFER ENDS IN countdown · banner · description · terms (শর্তাবলি) · product links · share', 'StarTech'],
  ['/deals', 'tag', 'Deals', 'All discounted products with the same filters, sorting and pagination as the listing page', 'StarTech + Daraz'],
  [productUrl('anker-zolo-10000mah'), 'box', 'Product Details', 'Gallery · colour-based price · units sold · stock status · same product from other brands · Spec / Description / Questions / Reviews', 'StarTech'],
  ['/search?q=gaming', 'search', 'Search Results', 'Keyword results with Brand, Price and Category filters, plus sorting', 'StarTech'],
  ['/cart', 'cart', 'Cart Page', 'Your Products · qty update · remove · coupon / gift voucher · Order Summary · floating cart on the right', 'StarTech + Gadget Peaky'],
  ['/checkout', 'card', 'Checkout', 'Login/Register/Guest · Customer Information · Payment Method · Delivery Method · Products Overview · Order Summary', 'TV Hut'],
  ['/login', 'user', 'Login', 'Phone/Email + Password, or OTP login', 'StarTech'],
  ['/register', 'edit', 'Register', 'Registration form with phone verification', 'StarTech'],
  ['/account', 'users', 'User Dashboard', 'Total / Successful / Cancelled / Returned orders · My Reviews · Order History · Address Book · Wishlist · Profile', 'TV Hut theme'],
  ['/track-order', 'truck', 'Order Tracking', 'Pending → Processing → Shipped → Delivered with activity timeline', 'Pathao style'],
  ['/wishlist', 'heart', 'Wishlist', 'Saved products · move to cart', 'StarTech'],
  ['/compare', 'compare', 'Compare Products', 'Up to 4 products · search & select · spec table · highlight differences', 'StarTech'],
  ['/blog', 'invoice', 'Blog Home', 'Featured categories · feature articles · latest articles', 'StarTech'],
  [blog[0] ? blogUrl(blog[0].id) : '/blog', 'invoice', 'Blog Details', 'SEO article · table of contents · category-wise products · comments', 'StarTech'],
  ['/contact', 'phone', 'Contact Us', '5 buttons incl. Wholesaler & Reseller contact · Google Map right of address · sales outlets', 'StarTech'],
  ['/about-us', 'info', 'About Us', 'Company details · mission / vision · BIN, TIN, Trade License at the bottom', 'StarTech'],
  ['/help-support', 'help', 'Help & Support (FAQ)', 'Searchable questions from customer queries', '—'],
  ['/policy#returns', 'returns', 'Policies', 'Return & Refund, Warranty, EMI, Payment, Delivery, Privacy, Terms', 'Footer links'],
  ['/404', 'alert', '404 Page', 'Error message + category and product suggestions', 'StarTech'],
];

export default function AllPages() {
  return (
    <div className="wrap">
      <section className="faq-hero" style={{ textAlign: 'left' }}>
        <h1>Munshiganj IT Storefront: UI Review (v2)</h1>
        <p style={{ marginBottom: 0 }}>Each page follows the reference site named in the client requirement sheet. Click any card to open the page.</p>
      </section>
      <section className="sec">
        <div className="pg-grid">
          {PG.map((p, i) => (
            <Link key={p[0] + i} className="pg" href={p[0]}>
              <span className="pgi"><Icon name={p[1]} size={22} /></span>
              <span><b>{String(i + 1).padStart(2, '0')} · {p[2]}</b><span>{p[3]}</span><em>Reference: {p[4]}</em></span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
