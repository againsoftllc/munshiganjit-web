/* Help & Support (FAQ) and the Service Center page as the admin's Live Edit stores them: `blocks.munshiganjit.faq` and
   `blocks.munshiganjit.service` of Website > Homepage. Whatever the admin has not changed keeps the values below (what the pages always
   said), so empty content renders both pages exactly as before. Address, hotline and map of the Service Center stay empty on purpose:
   empty = the ones of Settings > Site. Mirrored by apps/web/src/lib/website/munshiganjit-home.ts (readFaq / readService) in the admin:
   keep both in step. */

export const FAQ_SECTIONS = [
  { id: 'faq-hero', label: 'Title and search box' },
  { id: 'faq-groups', label: 'Questions and answers' },
  { id: 'faq-help', label: 'Call, WhatsApp and contact buttons' },
] as const;
export const SERVICE_SECTIONS = [
  { id: 'service-info', label: 'Service Center details' },
  { id: 'service-form', label: 'Repair / warranty request form' },
] as const;

export interface FaqGroup { id: string; title: string; icon: string; tone: string; items: { q: string; a: string }[]; hidden?: boolean }
export interface HelpTile { icon: string; tone: string; small: string; title: string; href: string }
export interface FaqCfg {
  hero: { title: string; subtitle: string; placeholder: string };
  groups: FaqGroup[];
  help: HelpTile[];
}
export interface ServiceCfg {
  info: { title: string; /** '' = the site's address */ address: string; hours: string; /** '' = the site's hotline */ hotline: string; outside: string; before: string; policyText: string; /** '' = the site's map */ mapEmbed: string };
  form: { title: string; types: string[]; button: string; success: string };
}

const g = (id: string, title: string, icon: string, tone: string, qa: [string, string][]): FaqGroup => ({ id, title, icon, tone, items: qa.map(([q, a]) => ({ q, a })) });

export const DEFAULT_FAQ: FaqCfg = {
  hero: { title: 'How can we help you?', subtitle: 'Answers to the questions our customers ask most', placeholder: 'Search e.g. delivery charge, EMI, warranty' },
  groups: [
    g('orders', 'Orders & Payment', 'cart', 'c-blue', [
      ['How do I place an order?', 'Add products to your cart, go to Checkout, fill in your information and choose a payment method. You will get an SMS confirmation, and our team will call to confirm.'],
      ['Which payment methods are accepted?', 'Cash on Delivery, bKash, Nagad, Rocket, Visa, Mastercard, AMEX (via SSLCommerz) and 0% EMI on partner bank credit cards.'],
      ['How do I cancel an order?', 'You can cancel before shipping from My Account → Order History, or by calling 0134-7561290. You will get an SMS when the cancellation is confirmed.'],
    ]),
    g('delivery', 'Delivery', 'truck', 'c-green', [
      ['How long does delivery take?', 'Inside Dhaka: within 24 hours. Outside Dhaka: 48–72 hours. Same-day express delivery is available in Dhaka for orders placed before 2 PM.'],
      ['What is the delivery charge?', 'Inside Dhaka {delivery_inside} (free over {delivery_free_over}), outside Dhaka {delivery_outside}, express {delivery_express}. Store pickup is free.'],
      ['How can I track my order?', 'Use the Track Your Order page with your Order ID and phone number to see the status: Pending, Processing, Shipped, Delivered.'],
    ]),
    g('emi', 'EMI', 'card', 'c-violet', [
      ['Which banks offer 0% EMI?', '18 banks including BRAC Bank, City Bank, EBL, DBBL and Standard Chartered, for 3, 6, 9 or 12 months.'],
      ['Is EMI price different?', 'Yes. EMI uses the Regular Price, while the Cash Discount Price applies to cash and online payments.'],
    ]),
    g('warranty', 'Warranty', 'shield', 'c-orange', [
      ['How do I claim warranty?', 'Bring the product and invoice to our Service Center (Motalib Plaza, Hatirpool, Dhaka), or call 0134-7561290 for a courier pickup from outside Dhaka.'],
      ['What is not covered?', 'Physical, liquid or burn damage, and products with a tampered warranty sticker.'],
    ]),
    g('returns', 'Return & Refund', 'returns', 'c-red', [
      ['What is the return policy?', 'Products with a manufacturing defect can be replaced within 7 days of delivery, in their original box with all accessories.'],
      ['When will I get a refund?', 'Within 3–7 working days to your original payment method after inspection.'],
    ]),
  ],
  help: [
    { icon: 'support', tone: 'c-orange', small: 'Call Center (9 AM – 10 PM)', title: '0134-7561290', href: 'tel:01347561290' },
    { icon: 'whatsapp', tone: 'c-green', small: 'Chat with us', title: 'WhatsApp', href: 'https://wa.me/8801795459638' },
    { icon: 'mail', tone: 'c-blue', small: 'Still need help?', title: 'Contact Us', href: '/contact' },
  ],
};

export const DEFAULT_SERVICE: ServiceCfg = {
  info: {
    title: 'Munshiganj IT Service Center', address: '', hours: 'Saturday – Thursday, 11:00 AM – 7:00 PM (Friday Off)', hotline: '',
    outside: 'Call the hotline for a courier pickup of your device', before: 'Bring the product with its invoice.', policyText: 'warranty policy', mapEmbed: '',
  },
  form: {
    title: 'Request a Repair or Warranty Service', types: ['Warranty claim', 'Paid repair', 'Courier pickup (outside Dhaka)'], button: 'Submit Request',
    success: 'Service request received. Our technician will call you within 24 hours.',
  },
};

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});
const rows = (v: unknown): Json[] => (Array.isArray(v) ? v.filter((x): x is Json => !!x && typeof x === 'object') : []);
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
const pick = (v: unknown, d: string) => (typeof v === 'string' && v.trim() ? v : d);
const strs = (v: unknown, d: string[]) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map(x => x.trim()).filter(Boolean) : d);

export function toFaq(raw: unknown): FaqCfg {
  const r = obj(raw), h = obj(r.hero), d = DEFAULT_FAQ;
  return {
    hero: { title: pick(h.title, d.hero.title), subtitle: str(h.subtitle, d.hero.subtitle), placeholder: pick(h.placeholder, d.hero.placeholder) },
    groups: Array.isArray(r.groups)
      ? rows(r.groups).map((x, i) => ({
          id: pick(x.id, 'g' + i), title: str(x.title, ''), icon: str(x.icon, 'help'), tone: str(x.tone, 'c-blue'), hidden: !!x.hidden,
          items: rows(x.items).map(it => ({ q: str(it.q, ''), a: str(it.a, '') })),
        }))
      : d.groups,
    help: Array.isArray(r.help) ? rows(r.help).map(t => ({ icon: str(t.icon, 'mail'), tone: str(t.tone, 'c-blue'), small: str(t.small, ''), title: str(t.title, ''), href: str(t.href, '/') })) : d.help,
  };
}

export function toService(raw: unknown): ServiceCfg {
  const r = obj(raw), i = obj(r.info), f = obj(r.form), d = DEFAULT_SERVICE;
  return {
    info: {
      title: pick(i.title, d.info.title), address: str(i.address, ''), hours: str(i.hours, d.info.hours), hotline: str(i.hotline, ''), outside: str(i.outside, d.info.outside),
      before: str(i.before, d.info.before), policyText: str(i.policyText, d.info.policyText), mapEmbed: str(i.mapEmbed, ''),
    },
    form: { title: pick(f.title, d.form.title), types: strs(f.types, d.form.types), button: pick(f.button, d.form.button), success: pick(f.success, d.form.success) },
  };
}

/* ---------- Become a Reseller / Corporate Buyer (`blocks.munshiganjit.reseller` / `.corporate`) ---------- */
export interface PartnerWhy { icon: string; text: string; hidden?: boolean }
export interface PartnerCfg {
  t1: string; t3: string; question: string; sub: string; why: PartnerWhy[];
  /** the contact box */
  contactLabel: string; team: string; /** '' = the site's hotline */ phone: string; /** '' = the site's reseller email */ email: string; cta: string;
  form: { title: string; bizLabel: string; volumes: string[]; reqHint: string };
}
const VOLUMES = ['Under 1 Lakh', '1 to 3 Lakh', '3 to 5 Lakh', '5 to 10 Lakh', '10 Lakh +'];
const w = (list: [string, string][]): PartnerWhy[] => list.map(([icon, text]) => ({ icon, text }));
export const DEFAULT_PARTNER: Record<'reseller' | 'corporate', PartnerCfg> = {
  reseller: {
    t1: 'Become an', t3: 'Reseller', question: 'Are you a gadget retailer or mobile accessories shop owner?', sub: 'Let’s make a partnership with',
    why: w([['globe', 'Direct Import From China'], ['tag', 'Enjoy Competitive Reseller Prices'], ['layers', 'Wide Range of Product Availability'], ['shield', 'Genuine Products with Warranty Support'], ['truck', 'Nationwide Courier Delivery Across Bangladesh'], ['support', 'Dedicated Reseller Support'], ['gift', 'Exclusive Deals & Special Offers']]),
    contactLabel: 'Partner Contact', team: 'Munshiganj IT Reseller Support Team', phone: '', email: '', cta: 'Apply to Become a Reseller',
    form: { title: 'Reseller Application', bizLabel: 'Business / Shop Name', volumes: VOLUMES, reqHint: 'Which products and brands are you interested in?' },
  },
  corporate: {
    t1: 'Become an', t3: 'Corporate Buyer', question: 'Buying gadgets and accessories for your office or company?', sub: 'Get bulk corporate prices from',
    why: w([['tag', 'Special Corporate Prices on Bulk Orders'], ['invoice', 'VAT Invoice & Official Quotation'], ['shield', 'Genuine Products with Warranty Support'], ['briefcase', 'Dedicated Corporate Account Manager'], ['truck', 'Nationwide Delivery to Every Branch'], ['layers', 'Quantity-based Pricing'], ['gift', 'Exclusive Corporate Deals']]),
    contactLabel: 'Partner Contact', team: 'Munshiganj IT Corporate Sales Team', phone: '', email: '', cta: 'Apply as Corporate Buyer',
    form: { title: 'Corporate Buyer Application', bizLabel: 'Company Name', volumes: VOLUMES, reqHint: 'Which products and brands are you interested in?' },
  },
};

export function toPartner(raw: unknown, tier: 'reseller' | 'corporate'): PartnerCfg {
  const r = obj(raw), f = obj(r.form), d = DEFAULT_PARTNER[tier];
  return {
    t1: pick(r.t1, d.t1), t3: pick(r.t3, d.t3), question: str(r.question, d.question), sub: str(r.sub, d.sub),
    why: Array.isArray(r.why) ? rows(r.why).map(x => ({ icon: str(x.icon, 'check'), text: str(x.text, ''), hidden: !!x.hidden })) : d.why,
    contactLabel: pick(r.contactLabel, d.contactLabel), team: str(r.team, d.team), phone: str(r.phone, ''), email: str(r.email, ''), cta: pick(r.cta, d.cta),
    form: { title: pick(f.title, d.form.title), bizLabel: pick(f.bizLabel, d.form.bizLabel), volumes: strs(f.volumes, d.form.volumes), reqHint: str(f.reqHint, d.form.reqHint) },
  };
}
