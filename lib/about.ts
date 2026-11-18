/* The About Us page as the admin's Live Edit stores it: `blocks.munshiganjit.about` of Website > Homepage. Whatever the admin has not
   changed keeps the values below, so empty content renders the page as designed. The page is NOT managed from Website > Pages any
   more. Mirrored by apps/web/src/lib/website/munshiganjit-home.ts (readAbout) in the admin: keep both in step. */

export const ABOUT_SECTIONS = [
  { id: 'about-hero', label: 'Top banner (title, buttons, promise card)' },
  { id: 'about-stats', label: 'Numbers strip' },
  { id: 'about-story', label: 'Our story' },
  { id: 'about-pillars', label: 'Mission, vision and promises' },
  { id: 'about-auth', label: 'Authorized distributor letters' },
  { id: 'about-visit', label: 'Visit us and legal numbers' },
  { id: 'about-cta', label: 'Closing banner' },
] as const;

export interface AboutStat { icon: string; value: number; suffix: string; label: string; hidden?: boolean }
export interface AboutPillar { icon: string; title: string; text: string; hidden?: boolean }
export interface AboutLetter { brand: string; title: string; text: string; image: string; hidden?: boolean }
export interface AboutCfg {
  hero: { eyebrow: string; title: string; subtitle: string; primaryText: string; primaryHref: string; secondaryText: string; secondaryHref: string; /** '' = the drawn card */ image: string; cardTitle: string; points: string[] };
  stats: { items: AboutStat[] };
  story: { eyebrow: string; title: string; html: string; image: string };
  pillars: { title: string; subtitle: string; items: AboutPillar[] };
  auth: { eyebrow: string; title: string; subtitle: string; items: AboutLetter[] };
  visit: { title: string; text: string; button: string; hideMap: boolean; hideLegal: boolean };
  cta: { title: string; text: string; button: string; href: string; secondText: string; secondHref: string };
}

export const DEFAULT_ABOUT: AboutCfg = {
  hero: {
    eyebrow: 'Authorized tech retailer · Bangladesh',
    title: 'About Munshiganj IT',
    subtitle: 'A Bangladeshi technology retailer built on a simple promise: genuine products, honest prices and support that answers the phone.',
    primaryText: 'Shop now', primaryHref: '/products', secondaryText: 'Contact us', secondaryHref: '/contact',
    image: '', cardTitle: 'The Munshiganj IT promise',
    points: ['100% genuine products', 'Official brand warranty', '7-Day Replacement guarantee', 'Delivery across Bangladesh', 'Cash on Delivery & 0% EMI'],
  },
  stats: {
    items: [
      { icon: 'box', value: 128540, suffix: '+', label: 'Successful Orders' },
      { icon: 'users', value: 86000, suffix: '+', label: 'Happy Customers' },
      { icon: 'award', value: 60, suffix: '+', label: 'Brand Partners' },
      { icon: 'globe', value: 64, suffix: '', label: 'Districts Covered' },
    ],
  },
  story: {
    eyebrow: 'Our story', title: 'Genuine technology, made easy to buy',
    html: '<p>Munshiganj IT is a Bangladeshi technology retailer built on a simple promise: genuine products, honest prices and support that answers the phone. We sell power banks, earbuds, headphones, chargers, cables, smart gadgets and lifestyle accessories from the world’s leading brands, sourced directly from official distributors and backed by official warranty.</p><p>Besides retail, we offer corporate and wholesale supply, a reseller program for shops across the country, an in-house service and warranty center, free product setup and expert buying advice by phone, WhatsApp and in our Experience Zone at Motalib Plaza, Hatirpool.</p>',
    image: '',
  },
  pillars: {
    title: 'What we stand for', subtitle: 'Four things you can count on every time you shop with us',
    items: [
      { icon: 'target', title: 'Our Mission', text: 'To make genuine technology accessible to every Bangladeshi through transparent pricing, flexible payment (Cash on Delivery, mobile banking, cards and 0% EMI) and reliable after-sales service nationwide.' },
      { icon: 'eye', title: 'Our Vision', text: 'To be Bangladesh’s most trusted tech destination, the first place people check for a power bank, a charger or a gadget, online or in-store.' },
      { icon: 'support', title: 'Services We Provide', text: 'Corporate and wholesale supply, a reseller program, an in-house service and warranty center, free product setup and expert buying advice by phone, WhatsApp and in our Experience Zone.' },
      { icon: 'shield', title: 'Customer Satisfaction', text: 'Every order is quality-checked before dispatch and can be tracked live. If a product has a manufacturing defect within 7 days, we replace it: our 7-Day Replacement guarantee.' },
    ],
  },
  auth: {
    eyebrow: 'Official partners', title: 'Authorized distributor',
    subtitle: 'Our brand partners trust us with their products. Tap a letter to read it in full.',
    items: [
      { brand: 'Hoco', title: 'Hoco authorization letter', text: 'Authorized to sell Hoco products in Bangladesh.', image: '/img/authorization/hoco-authorization-letter.jpeg' },
      { brand: 'Acefast', title: 'Acefast authorization letter', text: 'Authorized to sell Acefast products in Bangladesh.', image: '/img/authorization/acefast-authorization-letter.jpeg' },
    ],
  },
  visit: { title: 'Visit our Experience Zone', text: 'Touch, try and compare before you buy. Our team will help you choose.', button: 'Get Directions', hideMap: false, hideLegal: false },
  cta: { title: 'Ready to upgrade your tech?', text: 'Genuine products, honest prices, support you can call.', button: 'Shop now', href: '/products', secondText: 'Become a reseller', secondHref: '/reseller' },
};

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});
const rows = (v: unknown): Json[] => (Array.isArray(v) ? v.filter((x): x is Json => !!x && typeof x === 'object') : []);
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
const pick = (v: unknown, d: string) => (typeof v === 'string' && v.trim() ? v : d);
const strs = (v: unknown, d: string[]) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').map(x => x.trim()).filter(Boolean) : d);

/** `blocks.munshiganjit.about` (saved, or a Live Edit draft) -> everything the About page renders, defaults filled in */
export function toAbout(raw: unknown): AboutCfg {
  const r = obj(raw), h = obj(r.hero), st = obj(r.stats), sy = obj(r.story), pl = obj(r.pillars), au = obj(r.auth), vi = obj(r.visit), ct = obj(r.cta), d = DEFAULT_ABOUT;
  return {
    hero: {
      eyebrow: str(h.eyebrow, d.hero.eyebrow), title: pick(h.title, d.hero.title), subtitle: str(h.subtitle, d.hero.subtitle),
      primaryText: str(h.primaryText, d.hero.primaryText), primaryHref: pick(h.primaryHref, d.hero.primaryHref),
      secondaryText: str(h.secondaryText, d.hero.secondaryText), secondaryHref: pick(h.secondaryHref, d.hero.secondaryHref),
      image: str(h.image, ''), cardTitle: str(h.cardTitle, d.hero.cardTitle), points: strs(h.points, d.hero.points),
    },
    stats: {
      items: Array.isArray(st.items)
        ? rows(st.items).map(x => ({ icon: str(x.icon, ''), value: Math.max(0, Number(x.value) || 0), suffix: str(x.suffix, ''), label: str(x.label, ''), hidden: !!x.hidden })).filter(x => x.label)
        : d.stats.items,
    },
    story: { eyebrow: str(sy.eyebrow, d.story.eyebrow), title: pick(sy.title, d.story.title), html: str(sy.html, d.story.html), image: str(sy.image, '') },
    pillars: {
      title: str(pl.title, d.pillars.title), subtitle: str(pl.subtitle, d.pillars.subtitle),
      items: Array.isArray(pl.items) ? rows(pl.items).map(x => ({ icon: str(x.icon, 'check'), title: str(x.title, ''), text: str(x.text, ''), hidden: !!x.hidden })).filter(x => x.title) : d.pillars.items,
    },
    auth: {
      eyebrow: str(au.eyebrow, d.auth.eyebrow), title: str(au.title, d.auth.title), subtitle: str(au.subtitle, d.auth.subtitle),
      items: Array.isArray(au.items) ? rows(au.items).map(x => ({ brand: str(x.brand, ''), title: str(x.title, ''), text: str(x.text, ''), image: str(x.image, ''), hidden: !!x.hidden })).filter(x => x.image) : d.auth.items,
    },
    visit: { title: str(vi.title, d.visit.title), text: str(vi.text, d.visit.text), button: str(vi.button, d.visit.button), hideMap: !!vi.hideMap, hideLegal: !!vi.hideLegal },
    cta: {
      title: str(ct.title, d.cta.title), text: str(ct.text, d.cta.text), button: str(ct.button, d.cta.button), href: pick(ct.href, d.cta.href),
      secondText: str(ct.secondText, d.cta.secondText), secondHref: pick(ct.secondHref, d.cta.secondHref),
    },
  };
}
