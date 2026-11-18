/* The Contact Us page as the admin's Live Edit stores it: `blocks.munshiganjit.contact` of Website > Homepage. Whatever the admin has
   not changed keeps the values below (what the page always said), so an empty `contact` renders the page exactly as before.
   The address and the map stay empty here on purpose: empty = the ones of Settings > Site (so one change updates the whole site).
   Mirrored by apps/web/src/lib/website/munshiganjit-home.ts (readContact) in the admin: keep both in step. */

export const CONTACT_SECTIONS = [
  { id: 'contact-top', label: 'Call, email and the three big buttons' },
  { id: 'contact-office', label: 'Head office (address, hours, phones, map)' },
  { id: 'contact-outlets', label: 'Sales outlets' },
  { id: 'contact-biz', label: 'Wholesale and reseller desks' },
  { id: 'contact-form', label: 'Send us a message' },
] as const;

export interface ContactTile { icon: string; tone: string; small: string; title: string; cta: string; href: string; hidden?: boolean }
export interface OutletCfg { name: string; city: string; address: string; phones: { label: string; number: string }[]; hours: string; off: string; directions: string; hidden?: boolean }
export interface BizCard { tag: string; title: string; text: string; bullets: string[]; personName: string; personInfo: string; button: string; hidden?: boolean }
export interface ContactCfg {
  top: { callLabel: string; phones: string[]; emailLabel: string; email: string; tiles: ContactTile[] };
  office: { title: string; /** '' = the site's address */ address: string; hours: string; phones: string[]; whatsapp: string; whatsappText: string; serviceCenter: string; /** '' = the site's map */ mapEmbed: string; mapDirections: string };
  outlets: { title: string; placeholder: string; items: OutletCfg[] };
  biz: { wholesale: BizCard; reseller: BizCard };
  form: { title: string; subjects: string[]; button: string; success: string };
}

const PHONES = ['0134-7561290', '0134-7561291', '0179-5459638'];
export const DEFAULT_CONTACT: ContactCfg = {
  top: {
    callLabel: 'Call Center', phones: PHONES, emailLabel: 'For Support & Corporate Deals', email: 'hellomunshiganjit@gmail.com',
    tiles: [
      { icon: 'chat', tone: 'orange', small: 'Share Your Experience', title: 'Any Complain On Us?', cta: 'Raise a Complaint', href: '/complain' },
      { icon: 'briefcase', tone: 'blue', small: 'Bulk & Corporate Purchase', title: 'Wholesaler Contact', cta: 'Get Wholesale Price', href: '#wholesale' },
      { icon: 'store', tone: 'green', small: 'Shops & Retailers', title: 'Reseller Contact', cta: 'Become a Reseller', href: '/reseller' },
    ],
  },
  office: {
    title: 'Head Office & Experience Zone', address: '', hours: 'Saturday – Thursday, 10:00 AM – 8:00 PM (Friday Off)', phones: PHONES,
    whatsapp: '8801795459638', whatsappText: 'Chat with us on WhatsApp', serviceCenter: 'Motalib Plaza, Hatirpool · 11 AM – 7 PM', mapEmbed: '', mapDirections: '',
  },
  outlets: {
    title: 'Our Sales Outlet', placeholder: 'What’s your city?',
    items: [{
      name: 'Munshiganj IT Experience Zone (Head Office)', city: 'Dhaka', address: 'Shop No. 451 (Level 4), Motalib Plaza, Hatirpool, Dhaka, Bangladesh',
      phones: [{ label: 'Hotline', number: '0134-7561290' }, { label: 'Hotline', number: '0134-7561291' }, { label: 'Reseller & Corporate', number: '0179-5459638' }],
      hours: '10 AM - 8 PM', off: 'Friday Off', directions: '',
    }],
  },
  biz: {
    wholesale: {
      tag: 'Wholesaler Contact', title: 'Bulk orders for offices & institutions', text: 'Volume pricing, VAT invoices and credit terms for verified companies.',
      bullets: ['Quotation within 4 working hours', 'Dedicated account manager', 'Tender & government procurement support'],
      // no contact person until the shop adds a real one (the old sample names and numbers were placeholders)
      personName: '', personInfo: '', button: 'Request Wholesale Quote',
    },
    reseller: {
      tag: 'Reseller / Retailer Contact', title: 'Become an Munshiganj IT reseller', text: 'Run a gadget or mobile accessories shop? Get dealer pricing, priority stock and marketing support.',
      bullets: ['Daily updated dealer price list', 'Courier dispatch to all 64 districts', 'Warranty handled by Munshiganj IT'],
      personName: '', personInfo: '', button: 'Apply as Reseller',
    },
  },
  form: {
    title: 'Send Us a Message', subjects: ['Product enquiry', 'Order & delivery', 'Warranty & service', 'Complaint', 'Wholesale', 'Reseller'],
    button: 'Send Message', success: 'Message sent. We will reply soon.',
  },
};

type Json = Record<string, unknown>;
const obj = (v: unknown): Json => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : {});
const str = (v: unknown, d: string) => (typeof v === 'string' ? v : d);
const pick = (v: unknown, d: string) => (typeof v === 'string' && v.trim() ? v : d);
const rows = (v: unknown): Json[] => (Array.isArray(v) ? v.filter((x): x is Json => !!x && typeof x === 'object') : []);
const strs = (v: unknown, d: string[]): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()) : d);

const biz = (raw: unknown, d: BizCard): BizCard => {
  const r = obj(raw);
  return {
    tag: pick(r.tag, d.tag), title: pick(r.title, d.title), text: str(r.text, d.text), bullets: strs(r.bullets, d.bullets),
    personName: str(r.personName, d.personName), personInfo: str(r.personInfo, d.personInfo), button: pick(r.button, d.button), hidden: !!r.hidden,
  };
};

/** `blocks.munshiganjit.contact` (saved, or a Live Edit draft) -> everything the Contact page renders, defaults filled in */
export function toContact(raw: unknown): ContactCfg {
  const r = obj(raw), top = obj(r.top), of = obj(r.office), ou = obj(r.outlets), bz = obj(r.biz), fm = obj(r.form), d = DEFAULT_CONTACT;
  return {
    top: {
      callLabel: pick(top.callLabel, d.top.callLabel), phones: strs(top.phones, d.top.phones), emailLabel: pick(top.emailLabel, d.top.emailLabel), email: str(top.email, d.top.email),
      tiles: Array.isArray(top.tiles)
        ? rows(top.tiles).map(t => ({ icon: str(t.icon, 'tag'), tone: str(t.tone, 'blue'), small: str(t.small, ''), title: str(t.title, ''), cta: str(t.cta, ''), href: str(t.href, '/'), hidden: !!t.hidden })).filter(t => t.title)
        : d.top.tiles,
    },
    office: {
      title: pick(of.title, d.office.title), address: str(of.address, ''), hours: str(of.hours, d.office.hours), phones: strs(of.phones, d.office.phones),
      whatsapp: str(of.whatsapp, d.office.whatsapp), whatsappText: pick(of.whatsappText, d.office.whatsappText), serviceCenter: str(of.serviceCenter, d.office.serviceCenter),
      mapEmbed: str(of.mapEmbed, ''), mapDirections: str(of.mapDirections, ''),
    },
    outlets: {
      title: pick(ou.title, d.outlets.title), placeholder: pick(ou.placeholder, d.outlets.placeholder),
      items: Array.isArray(ou.items)
        ? rows(ou.items).map(o => ({
            name: str(o.name, ''), city: str(o.city, ''), address: str(o.address, ''), hours: str(o.hours, ''), off: str(o.off, ''), directions: str(o.directions, ''), hidden: !!o.hidden,
            phones: rows(o.phones).map(p => ({ label: str(p.label, ''), number: str(p.number, '') })).filter(p => p.number.trim()),
          })).filter(o => o.name)
        : d.outlets.items,
    },
    biz: { wholesale: biz(bz.wholesale, d.biz.wholesale), reseller: biz(bz.reseller, d.biz.reseller) },
    form: {
      title: pick(fm.title, d.form.title), subjects: strs(fm.subjects, d.form.subjects), button: pick(fm.button, d.form.button), success: pick(fm.success, d.form.success),
    },
  };
}

/** "0134-7561290" -> "tel:01347561290" */
export const telHref = (n: string) => 'tel:' + n.replace(/[^\d+]/g, '');
