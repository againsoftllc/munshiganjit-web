/* The home page body as the admin's Live Edit stores it: `blocks.munshiganjit` of Website > Homepage.
   Whatever the admin has not changed keeps the values below (what the site always showed), so an empty
   `blocks.munshiganjit` renders the page exactly as before. Mirrored by apps/web/src/lib/website/munshiganjit-home.ts
   in the admin: keep both in step. */
import { productUrl, catUrl } from './format';
import { toContact, type ContactCfg } from './contact';
import { toAbout, type AboutCfg } from './about';
import { toFaq, toService, toPartner, type FaqCfg, type ServiceCfg, type PartnerCfg } from './info';

export const HOME_SECTIONS = [
  { id: 'hero', label: 'Hero slider' },
  { id: 'strip', label: 'Offer strip' },
  { id: 'ticker', label: 'News ticker' },
  { id: 'featured', label: 'Featured Category' },
  { id: 'brands', label: 'Shop by Brand' },
  { id: 'flash', label: 'Flash Sale' },
  { id: 'rails', label: 'Product rows (New Arrival, Top Sales ...)' },
  { id: 'spotlight', label: 'Shop by Category' },
  { id: 'quick', label: 'Quick services' },
  { id: 'cx', label: 'Customer Experience' },
  { id: 'seo', label: 'SEO text' },
] as const;
export type HomeId = (typeof HOME_SECTIONS)[number]['id'];
/** site chrome blocks (edited in Live Edit, not part of the movable home sections) */
export const CHROME_SECTIONS = [
  { id: 'hero-cards', label: 'Hero side banners' },
  { id: 'header-top', label: 'Header top bar' },
  { id: 'header', label: 'Header (logo, search, actions)' },
  { id: 'menu', label: 'Main menu' },
  { id: 'footer', label: 'Footer' },
] as const;
export const homeLabel = (id: string) => HOME_SECTIONS.find(s => s.id === id)?.label ?? CHROME_SECTIONS.find(s => s.id === id)?.label ?? id;

export interface Banner { src: string; alt: string; href: string; hidden?: boolean; /** 'fit' = whole picture visible (contain) */ fit?: string }
/** a card beside the slider: a banner picture, or a custom card with words and a button */
export interface SideCard { kind: 'image' | 'card'; src: string; alt: string; href: string; icon: string; title: string; text: string; button: string; hidden?: boolean }
export interface QuickItem { icon: string; title: string; sub: string; href: string; hidden?: boolean }
/** a tab of Shop by Category: the products of a category, or products picked one by one */
export interface SpotlightTab { name: string; mode: 'category' | 'products'; category: string; products: string[]; /** how many products to show, 0 = all */ limit: number; link: string; hidden: boolean }
/** A row of products on the home page. `source` is the kind of row: new, top, discount, rated, emi, offer, category, brand or picked (a bare category address is accepted too). */
export interface Rail { title: string; icon: string; tone: string; source: string; link: string; hidden?: boolean; category?: string; brand?: string; products?: string[]; /** how many products, 0 = the usual 12 */ limit?: number }
export interface LinkItem { icon: string; label: string; href: string; key?: string; hidden?: boolean }
/** The footer, trust strip above it included. Contact details left empty keep what Settings has. */
/** The "Just purchased" popup. It shows REAL orders (GET /storefront/munshiganjit/recent-orders: first name + city + product). */
export interface ProofCfg {
  enabled: boolean;
  /** seconds between two popups */
  everySec: number;
  /** seconds a popup stays */
  showSec: number;
  /** nothing is shown until this many recent orders exist */
  minOrders: number;
  hideVerified: boolean;
  /** 'all' | 'home-product' | 'product' */
  pages: string;
}
export const DEFAULT_PROOF: ProofCfg = { enabled: true, everySec: 120, showSec: 8, minOrders: 3, hideVerified: false, pages: 'all' };
export function toProof(raw: unknown): ProofCfg {
  const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const num = (v: unknown, d: number, min: number, max: number) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.min(max, Math.max(min, Math.round(n))) : d; };
  const d = DEFAULT_PROOF;
  return {
    enabled: r.enabled === undefined ? d.enabled : !!r.enabled,
    everySec: num(r.everySec, d.everySec, 10, 3600), showSec: num(r.showSec, d.showSec, 3, 60), minOrders: num(r.minOrders, d.minOrders, 1, 50),
    hideVerified: !!r.hideVerified, pages: ['all', 'home-product', 'product'].includes(String(r.pages)) ? String(r.pages) : d.pages,
  };
}

export interface FooterCfg {
  logo: string; about: string; linksTitle: string; links: LinkItem[]; zoneTitle: string; directions: string; copyright: string; social: Record<string, string>;
  /** the strip of 4 promises above the footer: null = the catalog's trust items */
  trust: { icon: string; title: string; text: string; hidden: boolean }[] | null; hideTrust: boolean;
  phones: string[]; whatsapp: string; whatsappLabel: string; email: string; address: string; mapEmbed: string; mapDirections: string;
  memberTitle: string; members: { image: string; alt: string; href: string; hidden: boolean }[]; hideMembers: boolean;
  acceptTitle: string; acceptImage: string; acceptAlt: string; hideAccept: boolean;
  creditText: string; creditName: string; creditHref: string; hideCredit: boolean; hideEmail: boolean;
}
export const DEFAULT_PAY = '/img/payments/sslcommerz-pay-with.webp';
export interface HomeCfg {
  header: { welcome: string; hotlineLabel: string; links: LinkItem[]; logo: string; searchPlaceholder: string; actions: LinkItem[];
    /** the pictures that slide in beside the logo: off = the logo stays alone; items = product ids picked in Live Edit (null = the built-in four) */
    anim: { off: boolean; items: string[] | null } };
  footer: FooterCfg;
  /** the "Just purchased" popup (real orders): see ProofCfg */
  proof: ProofCfg;
  /** the Contact Us page (see lib/contact.ts) */
  contact: ContactCfg;
  /** Help & Support (FAQ) and the Service Center page (see lib/info.ts) */
  /** the About Us page (see lib/about.ts) */
  about: AboutCfg;
  faq: FaqCfg;
  service: ServiceCfg;
  /** Become a Reseller / Corporate Buyer pages */
  reseller: PartnerCfg;
  corporate: PartnerCfg;
  layout: { id: HomeId; hidden: boolean }[];
  slides: Banner[];
  /** slider autoplay in ms, 0 = off */
  heroMs: number;
  side: SideCard[];
  strip: { tag: string; tagSub: string; text: string; button: string; href: string; images: string[]; /** the strip follows an offer: hidden by the API when it is not running now */ hidden: boolean; showFrom: string; showUntil: string };
  /** items = the tiles picked in Live Edit (null = every main-menu category, product photo as the picture) */
  featured: { title: string; subtitle: string; link: string; items: { slug: string; image: string; name: string; hidden: boolean }[] | null };
  /** items = the brands picked in Live Edit, by name (null = every brand) */
  brands: { title: string; subtitle: string; linkText: string; items: { name: string; hidden: boolean }[] | null };
  /** null = the rows set up in the catalog (New Arrival, Top Sales ...) */
  rails: Rail[] | null;
  /** tabs = the tabs made in Live Edit; else slugs (the catalog's Category Spotlight list), one tab per category */
  spotlight: { title: string; slugs: string[] | null; tabs: SpotlightTab[] | null };
  quick: QuickItem[];
  cx: { title: string; shareTitle: string; shareText: string; button: string; viewAll: string; /** the score box: out of 5, and the words after "from" */ rating: number; countText: string };
  /** null = the headlines set up in Marketing */
  ticker: { text: string; hidden: boolean }[] | null;
  /** null = the SEO text set up in the catalog */
  seo: { title: string; paragraphs: string[]; /** rich text from the editor; wins over `paragraphs` */ html: string } | null;
}

export const DEFAULT_SLIDES: Banner[] = [
  { src: '/img/banners/slide-mit-everything-it.jpg', alt: 'Munshiganj IT — Everything IT, one place. Laptop, desktop, components, gadgets and networking', href: '/products' },
  { src: '/img/banners/slide-mit-genuine.jpg', alt: '100% genuine products with official warranty from Munshiganj IT', href: '/about-us' },
  { src: '/img/banners/slide-mit-free-delivery.jpg', alt: 'Free home delivery all over Bangladesh on orders of ৳1,000 or more', href: '/policy#delivery' },
];
export const DEFAULT_SIDE: SideCard[] = [
  { kind: 'image', icon: '', title: '', text: '', button: '', src: '/img/banners/side-mit-reseller.jpg', alt: 'Become a Munshiganj IT reseller — wholesale prices and nationwide delivery. Apply now.', href: '/reseller' },
  { kind: 'image', icon: '', title: '', text: '', button: '', src: '/img/banners/side-mit-genuine.jpg', alt: '100% genuine products, official warranty support, best price in Bangladesh', href: '/about-us' },
];
export const DEFAULT_QUICK: QuickItem[] = [
  { icon: 'chat', title: 'Raise a Complain', sub: 'Share your experience', href: '/complain' },
  { icon: 'truck', title: 'Track Your Order', sub: 'Live delivery status', href: '/track-order' },
  { icon: 'help', title: 'Help & Support', sub: 'Answers to common questions', href: '/help-support' },
  { icon: 'compare', title: 'Compare Products', sub: 'Find the right one', href: '/compare' },
  { icon: 'store', title: 'Become a Reseller', sub: 'Dealer price & support', href: '/reseller' },
  { icon: 'support', title: 'Service Center', sub: 'Repair your device', href: '/service-center' },
];
export const DEFAULT_STRIP: HomeCfg['strip'] = {
  tag: '10.10', tagSub: 'MEGA SALE',
  text: 'Extra **৳500 off** on orders above ৳5,000 with code **NTECH500** · Direct import, wholesale prices',
  button: 'Grab Deals', href: '/deals',
  images: ['jbl-wave-buds-2', 'anker-zolo-10000mah', 'jbl-tune-530bt'],
  hidden: false, showFrom: '', showUntil: '',
};

export const DEFAULT_HEADER: HomeCfg['header'] = {
  welcome: 'Welcome to **Munshiganj IT** — Enter the New Era of Tech',
  hotlineLabel: 'Hotline',
  anim: { off: false, items: null },
  links: [
    { icon: 'truck', label: 'Track Your Order', href: '/track-order' },
    { icon: 'help', label: 'Help & Support', href: '/help-support' },
    { icon: 'store', label: 'Become a Reseller', href: '/reseller' },
    { icon: 'briefcase', label: 'Corporate Buyer', href: '/corporate' },
  ],
  logo: '/img/mit-logo.png',
  searchPlaceholder: 'Search products, brands...',
  actions: [
    { key: 'offer', icon: 'tag', label: 'Offers', href: '/offers' },
    { key: 'pcb', icon: 'setup', label: 'My Gadget Setup', href: '/my-gadget-setup' },
    { key: 'compare', icon: 'compare', label: 'Compare', href: '/compare' },
  ],
};
const FL: [string, string][] = [
  ['/about-us', 'About Munshiganj IT'], ['/policy#payment', 'Payment Methods'], ['/contact', 'Contact Us'], ['/offers', 'Promotional Offers'],
  ['/service-center', 'Contact Service Center'], ['/reseller', 'Become a Reseller'], ['/corporate', 'Corporate Buyer'], ['/policy#emi', 'EMI'], ['/policy#terms', 'Terms & Conditions'], ['/policy#privacy', 'Privacy Policy'],
  ['/help-support', 'Help & Support'], ['/blog', 'Blog'], ['/policy#warranty', 'Warranty Policy'], ['/policy#returns', 'Return & Refund Policy'],
];
export const DEFAULT_FOOTER: HomeCfg['footer'] = {
  logo: '/img/mit-logo-dark.png',
  about: 'Bangladesh’s new era of tech shopping: genuine gadgets and accessories with official warranty and fast delivery across all 64 districts.',
  linksTitle: 'Shop With Us',
  links: FL.map(([href, label]) => ({ icon: '', label, href })),
  zoneTitle: 'Experience Zone',
  directions: 'Get Directions',
  copyright: '© 2026 Munshiganj IT · All rights reserved',
  social: { facebook: '#', youtube: '#', tiktok: '#', instagram: '#', linkedin: '#', whatsapp: '' },
  trust: null, hideTrust: false,
  phones: [], whatsapp: '', whatsappLabel: 'Live Chat on WhatsApp', email: '', address: '', mapEmbed: '', mapDirections: '',
  memberTitle: 'Proud Member OF:', members: [], hideMembers: false,
  acceptTitle: 'We Accept:', acceptImage: DEFAULT_PAY, acceptAlt: 'Visa, Mastercard, Amex, UnionPay, Diners, DBBL Nexus, bKash, Nagad, Rocket, Upay, tap, MyCash, internet banking and more via SSLCommerz', hideAccept: false,
  creditText: 'Developed by', creditName: 'Againsoft', creditHref: 'https://againsoft.com', hideCredit: false, hideEmail: false,
};

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});
const str = (v: unknown, d = '') => (typeof v === 'string' ? v : d);
const arr = (v: unknown): Json[] => (Array.isArray(v) ? v.filter((x): x is Json => !!x && typeof x === 'object') : []);
const pick = (v: unknown, d: string) => (typeof v === 'string' && v.trim() ? v : d);

/** Saved order (unknown ids dropped); a section not saved yet slots in after the one it follows by default. */
export function toLayout(raw: unknown): HomeCfg['layout'] {
  const known = new Set<string>(HOME_SECTIONS.map(s => s.id));
  const saved = arr(raw).filter(x => typeof x.id === 'string' && known.has(x.id as string)).map(x => ({ id: x.id as HomeId, hidden: !!x.hidden }));
  const out = saved.filter((x, i) => saved.findIndex(y => y.id === x.id) === i);
  HOME_SECTIONS.forEach((s, i) => {
    if (out.some(x => x.id === s.id)) return;
    const prev = i > 0 ? out.findIndex(x => x.id === HOME_SECTIONS[i - 1].id) : -1;
    out.splice(prev + 1, 0, { id: s.id, hidden: false });
  });
  return out;
}

/* uploaded pictures are served by the API, not by this site */
const API = (process.env.NEXT_PUBLIC_AGAINERP_API || '').replace(/\/$/, '');
const media = (u: string) => (u.startsWith('/uploads/') && API ? API + u : u);

/* slider slides as the admin's hero editor stores them (image_url, object_fit ...); `src` is accepted too */
const slides = (raw: unknown): Banner[] => {
  if (!Array.isArray(raw)) return DEFAULT_SLIDES;
  return arr(raw).map(b => ({ src: media(str(b.image_url) || str(b.src)), alt: str(b.alt), href: str(b.href) || '/', hidden: !!b.hidden, fit: str(b.object_fit) })).filter(b => b.src);
};
const sideCards = (raw: unknown): SideCard[] => {
  if (!Array.isArray(raw)) return DEFAULT_SIDE;
  return arr(raw).map(b => ({ kind: b.kind === 'card' ? 'card' as const : 'image' as const, src: media(str(b.image)), alt: str(b.alt), href: str(b.href) || '/', icon: str(b.icon, 'bolt'), title: str(b.title), text: str(b.text), button: str(b.button), hidden: !!b.hidden }))
    .filter(b => (b.kind === 'image' ? b.src : b.title || b.text));
};

const links = (raw: unknown, d: LinkItem[]): LinkItem[] => Array.isArray(raw)
  ? arr(raw).map(l => ({ icon: str(l.icon), label: str(l.label), href: str(l.href, '/'), key: typeof l.key === 'string' ? l.key : undefined, hidden: !!l.hidden })).filter(l => l.label)
  : d;

/** `blocks.munshiganjit` (saved, or a Live Edit draft) -> everything the home page renders, defaults filled in */
export function toHome(raw: unknown): HomeCfg {
  const r = obj(raw);
  const hero = obj(r.hero), strip = obj(r.strip), feat = obj(r.featured), br = obj(r.brands), spot = obj(r.spotlight), cx = obj(r.cx);
  const seo = obj(r.seo);
  const hd = obj(r.header), ft = obj(r.footer), soc = obj(ft.social);
  return {
    header: {
      welcome: pick(hd.welcome, DEFAULT_HEADER.welcome), hotlineLabel: pick(hd.hotlineLabel, DEFAULT_HEADER.hotlineLabel),
      links: links(hd.links, DEFAULT_HEADER.links), logo: pick(hd.logo, DEFAULT_HEADER.logo),
      searchPlaceholder: pick(hd.searchPlaceholder, DEFAULT_HEADER.searchPlaceholder), actions: links(hd.actions, DEFAULT_HEADER.actions),
      anim: { off: obj(hd.anim).off === true, items: Array.isArray(obj(hd.anim).items) ? (obj(hd.anim).items as unknown[]).filter((x): x is string => typeof x === 'string' && !!x.trim()) : null },
    },
    footer: {
      logo: pick(ft.logo, DEFAULT_FOOTER.logo), about: pick(ft.about, DEFAULT_FOOTER.about), linksTitle: pick(ft.linksTitle, DEFAULT_FOOTER.linksTitle),
      links: links(ft.links, DEFAULT_FOOTER.links), zoneTitle: pick(ft.zoneTitle, DEFAULT_FOOTER.zoneTitle), directions: pick(ft.directions, DEFAULT_FOOTER.directions),
      copyright: pick(ft.copyright, DEFAULT_FOOTER.copyright),
      social: Object.fromEntries(Object.keys(DEFAULT_FOOTER.social).map(k => [k, typeof soc[k] === 'string' ? (soc[k] as string) : DEFAULT_FOOTER.social[k]])),
      trust: Array.isArray(ft.trust) ? arr(ft.trust).map(t => ({ icon: str(t.icon, 'check'), title: str(t.title), text: str(t.text), hidden: !!t.hidden })).filter(t => t.title) : null,
      hideTrust: !!ft.hideTrust,
      phones: Array.isArray(ft.phones) ? ft.phones.filter((x): x is string => typeof x === 'string' && !!x.trim()) : [],
      whatsapp: str(ft.whatsapp), whatsappLabel: pick(ft.whatsappLabel, DEFAULT_FOOTER.whatsappLabel), email: str(ft.email), address: str(ft.address),
      mapEmbed: str(ft.mapEmbed), mapDirections: str(ft.mapDirections),
      memberTitle: pick(ft.memberTitle, DEFAULT_FOOTER.memberTitle), hideMembers: !!ft.hideMembers,
      members: Array.isArray(ft.members) ? arr(ft.members).map(m => ({ image: media(str(m.image)), alt: str(m.alt), href: str(m.href), hidden: !!m.hidden })).filter(m => m.image) : [],
      acceptTitle: pick(ft.acceptTitle, DEFAULT_FOOTER.acceptTitle), acceptImage: media(pick(ft.acceptImage, DEFAULT_PAY)), acceptAlt: pick(ft.acceptAlt, DEFAULT_FOOTER.acceptAlt), hideAccept: !!ft.hideAccept,
      creditText: str(ft.creditText, DEFAULT_FOOTER.creditText), creditName: pick(ft.creditName, DEFAULT_FOOTER.creditName), creditHref: pick(ft.creditHref, DEFAULT_FOOTER.creditHref),
      hideCredit: !!ft.hideCredit, hideEmail: !!ft.hideEmail,
    },
    contact: toContact(r.contact),
    about: withAboutMedia(toAbout(r.about)),
    proof: toProof(r.proof),
    faq: toFaq(r.faq),
    service: toService(r.service),
    reseller: toPartner(r.reseller, 'reseller'),
    corporate: toPartner(r.corporate, 'corporate'),
    ticker: Array.isArray(obj(r.ticker).items) ? arr(obj(r.ticker).items).map(x => ({ text: str(x.text), hidden: !!x.hidden })).filter(x => x.text.trim()) : null,
    layout: toLayout(r.layout),
    slides: slides(hero.slides),
    heroMs: typeof hero.autoplay_ms === 'number' ? Math.max(0, hero.autoplay_ms) : 5500,
    side: sideCards(r.side_cards),
    strip: {
      tag: str(strip.tag, DEFAULT_STRIP.tag), tagSub: str(strip.tagSub, DEFAULT_STRIP.tagSub),
      text: pick(strip.text, DEFAULT_STRIP.text), button: pick(strip.button, DEFAULT_STRIP.button),
      // an empty Link on a strip that follows an offer: that offer's own page
      href: pick(strip.href, pick(strip.autoHref, DEFAULT_STRIP.href)),
      hidden: strip.hidden === true, showFrom: str(strip.showFrom), showUntil: str(strip.showUntil),
      images: Array.isArray(strip.images) ? strip.images.filter((x): x is string => typeof x === 'string' && !!x.trim()) : DEFAULT_STRIP.images,
    },
    featured: { title: pick(feat.title, 'Featured Category'), subtitle: pick(feat.subtitle, 'Get your desired product from featured category!'), link: pick(feat.link, '/categories'),
      items: Array.isArray(feat.items) ? arr(feat.items).map(x => ({ slug: str(x.slug), image: media(str(x.image)), name: str(x.name), hidden: !!x.hidden })).filter(x => x.slug) : null },
    brands: { title: pick(br.title, 'Shop by Brand'), subtitle: pick(br.subtitle, 'Official partner of 60+ global brands'), linkText: pick(br.linkText, 'View All Brands'),
      items: Array.isArray(br.items) ? arr(br.items).map(x => ({ name: str(x.name), hidden: !!x.hidden })).filter(x => x.name) : null },
    rails: Array.isArray(r.rails) ? arr(r.rails).map(x => ({ title: str(x.title), icon: str(x.icon, 'tag'), tone: str(x.tone, 'cat'), source: str(x.source), link: str(x.link), hidden: !!x.hidden, category: str(x.category), brand: str(x.brand), products: Array.isArray(x.products) ? x.products.filter((p): p is string => typeof p === 'string' && !!p) : [], limit: typeof x.limit === 'number' && x.limit > 0 ? Math.floor(x.limit) : 0 })).filter(x => x.title && x.source) : null,
    spotlight: { title: pick(spot.title, 'Shop by Category'), slugs: Array.isArray(spot.slugs) ? spot.slugs.filter((x): x is string => typeof x === 'string' && !!x) : null,
      tabs: Array.isArray(spot.tabs) ? arr(spot.tabs).map(t => ({ name: str(t.name), mode: t.mode === 'products' ? 'products' as const : 'category' as const, category: str(t.category), products: Array.isArray(t.products) ? t.products.filter((x): x is string => typeof x === 'string' && !!x) : [], limit: typeof t.limit === 'number' && t.limit > 0 ? Math.floor(t.limit) : 0, link: str(t.link), hidden: !!t.hidden })) : null },
    quick: Array.isArray(r.quick) ? arr(r.quick).map(q => ({ icon: str(q.icon, 'help'), title: str(q.title), sub: str(q.sub), href: str(q.href, '/'), hidden: !!q.hidden })).filter(q => q.title) : DEFAULT_QUICK,
    cx: {
      title: pick(cx.title, 'Customer Experience'), shareTitle: pick(cx.shareTitle, 'Share Your Experience'),
      shareText: pick(cx.shareText, 'Ordered online or visited our shop? Tell other buyers how it went. Every review is read by our team.'),
      button: pick(cx.button, 'Share Your Experience'), viewAll: pick(cx.viewAll, 'View All Reviews'),
      rating: typeof cx.rating === 'number' && cx.rating >= 0 && cx.rating <= 5 ? cx.rating : 4.8, countText: pick(cx.countText, '12,400+ reviews'),
    },
    seo: Array.isArray(seo.paragraphs) || typeof seo.title === 'string' || typeof seo.html === 'string'
      ? { title: str(seo.title), html: str(seo.html), paragraphs: Array.isArray(seo.paragraphs) ? seo.paragraphs.filter((x): x is string => typeof x === 'string' && !!x.trim()) : [] }
      : null,
  };
}

/** "Extra **৳500 off** ..." -> pieces, the **marked** ones bold */
export function boldParts(text: string): { t: string; b: boolean }[] {
  return text.split('**').map((t, i) => ({ t, b: i % 2 === 1 })).filter(p => p.t);
}

/** "Visit [Munshiganj IT](/about) today" -> text and link pieces (the SEO text keeps its links this way) */
export function linkParts(text: string): ({ t: string } | { t: string; href: string })[] {
  const out: ({ t: string } | { t: string; href: string })[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(text))) { if (m.index > last) out.push({ t: text.slice(last, m.index) }); out.push({ t: m[1], href: m[2] }); last = m.index + m[0].length; }
  if (last < text.length) out.push({ t: text.slice(last) });
  return out;
}

/** uploaded pictures of the About page live on the API: give them its address */
function withAboutMedia(a: AboutCfg): AboutCfg {
  return {
    ...a,
    hero: { ...a.hero, image: a.hero.image ? media(a.hero.image) : '' },
    story: { ...a.story, image: a.story.image ? media(a.story.image) : '' },
    auth: { ...a.auth, items: a.auth.items.map(i => ({ ...i, image: media(i.image) })) },
  };
}
