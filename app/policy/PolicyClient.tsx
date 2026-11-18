'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { Icon, Crumb } from '@/components/ui';
import { DELIVERY_FALLBACK, insideRate, outsideRate, type Delivery } from '@/lib/delivery';
import { money } from '@/lib/format';

const P: Record<string, [title: string, icon: string, body: ReactNode]> = {
  returns: ['Return & Refund Policy', 'returns', <>
    <p>If a product has a manufacturing defect within <b>7 days</b> of delivery, we will replace it. The product must be in its original box with all accessories, gifts and the invoice.</p>
    <h3>Refund</h3><p>If a replacement is not available, we refund the full amount within 3–7 working days to your original payment method.</p>
    <h3>Not returnable</h3><ul><li>Products with physical or liquid damage</li><li>Opened software and consumables</li><li>Products with a tampered warranty sticker</li></ul>
  </>],
  warranty: ['Warranty Policy', 'shield', <>
    <p>All products carry the official manufacturer warranty. Claims are handled at our Service Center, Motalib Plaza, Hatirpool, Dhaka.</p>
    <ul><li>Bring the product with its invoice</li><li>Outside Dhaka: call 0134-7561290 for a courier pickup</li><li>Typical turnaround: 7–15 working days</li></ul>
  </>],
  emi: ['EMI Policy', 'card', <p>0% EMI is available on credit cards from 18 partner banks for 3, 6, 9 or 12 months. The minimum order is ৳5,000. EMI uses the Regular Price.</p>],
  payment: ['Payment Methods', 'wallet', <p>We accept Cash on Delivery, bKash, Nagad, Rocket, Upay, Visa, Mastercard, AMEX, DBBL Nexus and internet banking via SSLCommerz. Orders above ৳50,000 on COD need a ৳5,000 advance.</p>],
  delivery: ['Delivery Policy', 'truck', null], // its text is made from the admin's delivery charge (see deliveryText)
  privacy: ['Privacy Policy', 'lock', <p>We collect only the information needed to process your orders: name, phone, email, address and order history. We never sell your data. Card details are processed by SSLCommerz and are never stored by Munshiganj IT.</p>],
  terms: ['Terms & Conditions', 'invoice', <p>Prices may change without notice. An order is confirmed only after verification by our team. Munshiganj IT may cancel orders with obvious pricing errors and refund in full. These terms are governed by the laws of Bangladesh.</p>],
};

/** the Delivery Policy built in, from the admin's current charge (used when the admin has not written the page) */
const deliveryText = (d: Delivery): ReactNode => (
  <ul>
    <li>Inside Dhaka: {money(insideRate(d))}, within 24 hours{d.freeFrom > 0 ? ' (free over ' + money(d.freeFrom) + ')' : ''}</li>
    <li>Outside Dhaka: {money(outsideRate(d))}, 48–72 hours</li>
    {d.express !== null && <li>Express same day (Dhaka): {money(d.express)}</li>}
    {d.pickupOn && <li>Store pickup: free</li>}
  </ul>
);

/** page text written in the admin's Website > Pages, by tab id (empty = the text built in above) */
export type PolicyPages = Record<string, { html: string; updated: string } | undefined>;

export default function PolicyClient({ pages = {}, dates = {}, delivery = DELIVERY_FALLBACK }: { pages?: PolicyPages; dates?: Record<string, string>; delivery?: Delivery }) {
  const [k, setK] = useState('returns');

  useEffect(() => {
    const sync = () => { const h = location.hash.slice(1); setK(P[h] ? h : 'returns'); };
    /* Next <Link> to /policy#x while already here uses pushState (no hashchange) → re-sync after link clicks */
    const onClick = (e: MouseEvent) => { if ((e.target as Element).closest?.('a[href*="#"]')) setTimeout(sync, 0); };
    sync();
    addEventListener('hashchange', sync);
    addEventListener('popstate', sync);
    document.addEventListener('click', onClick);
    return () => { removeEventListener('hashchange', sync); removeEventListener('popstate', sync); document.removeEventListener('click', onClick); };
  }, []);
  useEffect(() => { document.title = P[k][0] + ' | Munshiganj IT'; }, [k]);

  const cur = P[k];
  return (
    <>
      <Crumb items={[[cur[0]]]} />
      <div className="wrap pol-wrap">
        <nav className="faq-cats" id="pn">
          {Object.keys(P).map(id => (
            <button key={id} data-p={id} className={id === k ? 'on' : ''} onClick={() => { location.hash = id; }}>
              <Icon name={P[id][1]} size={17} />{P[id][0]}
            </button>
          ))}
        </nav>
        <article className="about-box" style={{ marginTop: 0 }}>
          <div className="prose" id="pb">
            <span className="tag gray">Last updated: {dates[k] || 'Oct 01, 2026'}</span>
            <h2 style={{ marginTop: 10 }}>{cur[0]}</h2>
            {pages[k]?.html ? <div dangerouslySetInnerHTML={{ __html: pages[k]!.html }} /> : k === 'delivery' ? deliveryText(delivery) : cur[2]}
          </div>
        </article>
      </div>
    </>
  );
}
