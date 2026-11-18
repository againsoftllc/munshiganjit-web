# Munshiganj IT storefront: what the againERP backend and admin need to provide

**Audience:** the againERP backend team.
**Purpose:** list every admin feature and API the Munshiganj IT storefront (`munshiganjit-web`, Next.js) expects.

Today the storefront reads mock data from `lib/data.ts` and `lib/geo.ts`. The shapes below match those mocks, so switching to the API is a data-source change only; the UI stays the same.

This covers client feedback round 2 (table below) and round 3 (section 10):

| Point | Feature |
|---|---|
| 5 | News Headline |
| 7 | Flash Sale |
| 8 | Offers |
| 9 | Deals |
| 11 | Recently-bought popup |
| 13, 14 | Payment and checkout |

---

## 1. Rules that apply to every time-bound item

Flash Sales, Offers and Deals follow the same lifecycle.

1. **Status comes from the time window.** An item is live when `startAt ≤ now < endAt`.
   - Store the times in UTC (ISO 8601).
   - Show and edit them in Asia/Dhaka in the admin.
2. **It switches off by itself.** No admin action is needed when the time ends.
   - The storefront also hides an item the moment its countdown reaches 0.
   - The API must therefore never return an expired item as active.
3. **Nothing is ever deleted.** Ended items stay in **History**, with their name, dates and product list.
   - The admin may *archive* an item, which hides it from the History list.
   - Archiving is not a hard delete.
4. **Clone to new.** Any item, including an ended one, can be duplicated as a new draft.
   - The draft gets a new name and new dates.
   - It keeps the products and discounts, which the admin can keep or change.
   - Store `clonedFrom` on the new item.
5. **Draft vs published.** An item is visible only when `published = true` **and** it is inside its time window.
6. **Validation:**
   - `endAt > startAt`.
   - Warn when two Flash Sales or two Deals overlap. The storefront shows only one at a time: the one that started most recently.
   - A product's sale price must be below its regular price.
7. **Audit:** record `createdBy`, `createdAt`, `updatedBy` and `updatedAt` on every item.

Suggested status values for the admin list are `draft`, `scheduled`, `live`, `ended` and `archived`. All except `draft` and `archived` are derived from the dates.

---

## 2. News Headline (point 5)

The orange "News" ticker below the Grab Deals strip on the home page scrolls the active headlines and pauses on hover.

**Admin:**
- Create, edit and reorder headlines (drag to sort).
- Turn each headline on or off.
- Optional start and end dates.
- Text may be Bangla or English, up to about 200 characters.

**Model** (matches `NewsHeadline` in `lib/data.ts`):

```ts
{ id: string; text: string; active: boolean; sort: number; startAt?: string; endAt?: string }
```

**API:** `GET /news` returns the active headlines, sorted.

```json
[{ "id": "n1", "text": "১০.১০ মেগা সেল চলছে! ...", "active": true, "sort": 1 }]
```

---

## 3. Flash Sale (point 7)

On the home page this is a compact, colourful section right below **Shop by Brand**.
- It shows only while a sale is live.
- It has a countdown to `endAt` and disappears when the countdown ends.
- Each product card shows the % OFF, the flash price, the old price, a sold-progress bar ("Almost gone!" at 70% or more) and Add to Cart.

**Admin:**
- Name, start/end date-time and a product picker.
- For each product: flash price (or % discount), stock limit for the sale, and display order.
- Live view of sold/limit per product.
- History list and clone (see section 1).

**Model** (extends `FlashSale` / `FlashItem` in `lib/data.ts`):

```ts
{
  id: string; name: string; startAt: string; endAt: string; published: boolean; clonedFrom?: string;
  items: { productId: string; flashPrice: number; limit: number; sold: number; sort: number }[]
}
```

**API:** `GET /flash-sale/active` returns the one live sale, or `null`.
- Each item must carry the product's card fields: name, image, regular price.
- `sold` must be live (from orders).

```json
{
  "id": "fs-2026-10-mega", "name": "Mega Flash Sale",
  "startAt": "2026-10-18T18:00:00Z", "endAt": "2026-10-21T18:00:00Z",
  "items": [{ "productId": "samsung-odyssey-g5-27", "flashPrice": 33500, "oldPrice": 43000, "limit": 15, "sold": 11 }]
}
```

**Pricing rule (important):** while a sale is live, the flash price must be the price used in the cart, checkout and order.
- The prototype currently uses the product's normal sale price.
- The backend should return the effective price on the product and in the cart API, so all pages agree.
- When the sale ends, the price returns to normal automatically.

---

## 4. Offers (point 8, StarTech offer page)

- **`/offers`:** a grid of offer cards, newest first. Each card shows a square banner, the date range, the outlet, the title, a short description and **View Details**.
- **`/offers/:id`:** an **OFFER ENDS IN** countdown, the banner, title, dates and outlet, a rich description, terms (শর্তাবলি), "check out our best prices" links, the offer's products, and share buttons.
- Expired offers drop off `/offers` automatically. An expired offer's details page still opens and says "This offer has ended".

**Admin:**
- **Basics:**
  - title, short description
  - banner image (square, at least 800×800, WebP or JPG; the prototype draws HTML/CSS banners until real artwork exists)
  - outlet (`Online` or `All Outlet`, or a list of outlets)
  - start/end date-time
- **Content:**
  - intro line
  - body (rich text; bold is enough)
  - terms (a list of lines)
  - links (label + URL)
  - linked products (picker)
- Offer History, clone to a new offer, archive (see section 1).

**Model** (matches `Offer` in `lib/data.ts`, with an uploaded banner instead of the CSS `banner` fields):

```ts
{
  id: string; slug: string; title: string; desc: string; bannerUrl: string;
  outlet: 'Online' | 'All Outlet' | string[]; startAt: string; endAt: string; published: boolean; clonedFrom?: string;
  intro: string; body: string;          // body: plain text with **bold** markers, or sanitised HTML
  terms: string[]; links: { label: string; url: string }[]; productIds: string[]
}
```

**API:**
- `GET /offers?status=active` returns the live offers (card fields only).
- `GET /offers/:id` returns the full offer, including an ended one. The response carries `status` so the page can show "ended".
- `GET /offers?status=ended` returns the history (admin and reporting).

---

## 5. Deals (point 9, separate from Offers)

`/deals` is opened from the home **Grab Deals** strip. It is *not* the Offers page.
- **Header:** the deal title (Bangla), a red tagline, a description and an **ENDING IN** countdown.
- **Left column:**
  - **Shop by Category** list with counts
  - **Discount Amount** range slider (৳ saved, min–max)
  - **Brand** list with counts
- **Right column:** the deal products, biggest saving first. The URL keeps the filters (`/deals?cat=monitors&brand=DAHUA`).
- When the deal ends, the page shows "No deal is running right now".

**Admin:**
- Name, Bangla heading, tagline, description and start/end date-time.
- Product picker, with a deal price (or discount) per product.
- Deal History and clone (see section 1).

**Model** (extends `Deal` in `lib/data.ts`):

```ts
{
  id: string; name: string; head: string; tagline: string; body: string;
  startAt: string; endAt: string; published: boolean; clonedFrom?: string;
  items: { productId: string; dealPrice: number }[]
}
```

**API:** `GET /deals/active` returns the live deal, or `null`.
- Items must include `cat`, `brand`, `price`, `oldPrice` and `stock`, so the storefront can build the category/brand counts and the discount range itself.
- If the catalogue grows past a few hundred items, add server-side filters `?cat=&brand=&minSave=&maxSave=` that return the counts.

The **pricing rule** from the Flash Sale section applies here too.

---

## 6. Recently-bought popup (point 11)

A small card at the bottom-left of every page, except checkout, login and register.
- It says "*Name* from *Area* purchased *Product*", with the model, "N minutes ago" and "Verified".
- It rotates every 18 seconds and stays up for 6 seconds.

**Admin:**
- Global on/off, rotation interval and display time.
- **Choose which products can appear.** This is a per-product on/off switch; the prototype has the flag as the 5th tuple item of `recentBuyers`.
- The feed should come from **real recent orders** of the enabled products.
  - Show only the buyer's first name and area/thana; no phone number or full address.
  - Optionally allow manual entries for launch week.

**API:** `GET /popup-feed` returns the latest 20 or so entries, newest first.

```json
{ "enabled": true, "intervalSec": 18, "showSec": 6,
  "items": [{ "name": "Rakib", "area": "Mirpur, Dhaka", "productId": "asus-tuf-gaming-f16", "minutesAgo": 3 }] }
```

---

## 7. Checkout, payment and delivery (points 13 and 14)

The checkout follows the Motion View guest checkout.
- **Left column:**
  - cart with per-item select (only ticked items are ordered)
  - delivery address: Name, Phone, security check, Address, Division → District → Sub District, Home/Office
- **Right column:** Payment, Delivery Method, Summary.

The backend needs to provide:

- **Order create:** `POST /orders` with the body below. It returns `{ orderId }`, and the success popup links to Track Your Order. Recalculate every price and charge on the server; never trust the client totals.

  ```json
  { "items": [{ "productId": "...", "color": "...", "qty": 1 }],
    "customer": { "name": "...", "phone": "01XXXXXXXXX" },
    "address": { "line": "...", "division": "...", "district": "...", "subDistrict": "...", "type": "home|office" },
    "delivery": { "method": "home|pickup", "pickupPoint": "..." },
    "payment": "cod|bkash|card", "voucher": "NTECH500", "turnstileToken": "..." }
  ```

- **Payments:**
  - `bkash` uses the bKash checkout. `card` ("Card & MFS") uses SSLCommerz, which covers cards, Nagad, Rocket, Upay, internet banking and more.
  - Merchant accounts are needed for both.
  - Create the order as *pending payment*, redirect to the gateway, then confirm through the gateway's IPN/callback.
- **Security check:** Cloudflare Turnstile. The storefront currently shows a placeholder.
  - We need a site key (frontend) and a secret key (verified server-side on `POST /orders`).
- **Address data:** Division → District → Sub District. The prototype ships all 8 divisions and 64 districts in `lib/geo.ts`.
  - Please provide the official list from the ERP: `GET /geo/divisions`, `GET /geo/districts?division=`, `GET /geo/sub-districts?district=`.
- **Delivery zones and charges:**
  - Admin sets the charge per district or sub district. The demo uses ৳60 inside Dhaka and ৳120 elsewhere.
  - Admin sets the free-delivery threshold (demo: ৳5,000), shown as "Delivery Charge Discount".
  - The API returns `{ charge, discount }` for a given address and cart.
- **Pickup points:** admin list of outlets (name, address, hours, on/off). Pickup is free ("Enjoy Free Delivery").
- **Vouchers:**
  - Admin CRUD with: code, fixed or % amount, max discount, minimum order, start/end, usage limit (total and per phone), and products or categories it applies to.
  - API: `POST /vouchers/validate { code, items }` returns `{ discount }` or an error message.
  - The demo codes are `NTECH500` (৳500) and `EID10` (10%, max ৳5,000).

---

## 8. API list (summary)

| Method & path | Used by | Notes |
|---|---|---|
| `GET /settings/header-logo-anim` | Header logo animation | 1–4 `{ image, label }`, in display order |
| `GET /news` | Home ticker | active, sorted |
| `GET /flash-sale/active` | Home Flash Sale | one or `null`; live `sold` |
| `GET /offers?status=active` | `/offers` | card fields |
| `GET /offers/:id` | `/offers/:id` | includes `status` (ended still readable) |
| `GET /deals/active` | `/deals` | items with cat/brand/price/oldPrice/stock |
| `GET /popup-feed` | Recently-bought popup | settings + recent items |
| `GET /geo/...` | Checkout address | divisions, districts, sub districts |
| `POST /delivery/quote` | Checkout summary | `{ charge, discount }` |
| `POST /vouchers/validate` | Checkout voucher | `{ discount }` |
| `POST /orders` | Confirm Order | returns `orderId`; payment redirect for bKash/card |

**General conventions:**
- Prices are whole Taka (integers).
- Times are ISO 8601 in UTC.
- Product IDs are slugs (e.g. `asus-tuf-gaming-f16`), which the storefront uses in URLs.
- Images should be served as WebP where possible.
- Public GET endpoints can be cached for about 60 seconds. The storefront re-checks the offers list every minute, and the countdowns handle the exact end time on the client.

---

## 9. Already in the storefront, waiting for data

| Area | File | Mock to replace |
|---|---|---|
| Header logo animation | `components/Header.tsx` (`LogoAnim`) | `headerLogoAnim` (admin: upload/replace/reorder 1–4 square images, transparent PNG or WebP, ≥200×200; currently Earbuds → Power Bank → Neckband → Headphone) |
| News ticker | `components/NewsTicker.tsx` | `newsHeadlines` |
| Flash Sale | `components/FlashSale.tsx` | `flashSales`, `activeFlashSale()` |
| Offers | `app/offers/page.tsx`, `app/offers/[id]/OfferDetail.tsx` | `offers`, `offerLive()` |
| Deals | `app/deals/DealsClient.tsx` | `deals`, `activeDeal()` |
| Popup | `components/Floating.tsx` (`RecentlyBought`) | `recentBuyers` |
| Checkout | `app/checkout/CheckoutClient.tsx` | `lib/geo.ts`, `COUPONS` in `components/store.tsx` |
| Footer payments | `components/Footer.tsx` | SSLCommerz "Pay With" banner in `public/img/payments/` (static; replace if the accepted channels change) |
| Catalogue & main menu | `lib/catalog.ts`, `components/Header.tsx` (`CatBar`), `components/Listing.tsx` | `categories`, `products` (see section 10.1) |
| Live chat | `components/LiveChat.tsx` | `chatAgents` |
| Home rows & Shop by Category | `components/HomeRails.tsx` | `homeRails`, `spotlightCategories` |
| Customer Experience | `app/HomeClient.tsx`, `app/reviews/ReviewsClient.tsx` | `reviews`, `REVIEW_TOPICS` |
| SEO text, trust strip | `app/HomeClient.tsx`, `components/Footer.tsx` | `seoText`, `trustItems` |
| My Gadget Setup | `app/my-gadget-setup/GadgetSetupClient.tsx` | `lib/phones.ts` (`phones`, `isBestMatch`) |
| Order tracking (new orders) | `app/track-order/TrackClient.tsx` | `lib/orders.ts` (browser storage today) |

---

## 10. Client feedback round 3 (Google Doc "munshiganjit")

Everything below already works in the storefront with mock data. The admin needs to manage it.

### 10.1 Main menu, categories and filters
- The main menu shows 18 categories in one line; what does not fit the screen goes under **More**.
- A category is either **brand-menu** (Power Bank, Earbuds, Head Phone, Neckband, Earphone, Bluetooth Speaker, Charger, Cable, Microphone, Stylus Pen, Converter, Card Reader) or **type-menu** (Gadgets, Computer Accessories, Networking, Car Accessories, Bags & Lifestyle, Others).
- Brand-menu categories list their brands in the dropdown. Type-menu categories list their sub-types.
- Each category can have **category-wise filters** (e.g. Power Bank: Capacity, Cable Type, Watt, Color). The admin defines the filter groups and their values per category; each product stores its values.

```ts
Category { slug: string; name: string; icon: string; brandMenu?: string[]; subs: [name, count][]; filters?: [label, values[]][] }
Product  { ...; attrs?: Record<string, string>; discontinued?: boolean }
```

### 10.2 Discontinued products
- Admin product list has a **Discontinued** switch.
- A discontinued product is hidden from search, menus, listings and home rows. Its own page still opens (and stays in Google) and shows **Status: Discontinued** with the buy buttons disabled.
- Switching it back to in stock makes it visible again; no re-upload.
- Keep discontinued products in the sitemap.

### 10.3 Live chat
- Admin assigns agent **name** and **photo** (`chatAgents`). The chat button shows the photo of the agent who is online.
- With no agent online, automated answers reply (delivery, EMI, warranty, order, price).
- Every conversation is saved in **chat history**. Only an admin can delete history.
- API: `GET /chat/agents` (with presence), `POST /chat/messages`, `GET /chat/history` (admin).

### 10.4 Uploads: show resolution and size
Every image upload field in the admin (banners, offer artwork, products, header animation, agent photos, category images) must show the file's **pixel resolution and file size** before saving, next to the **recommended size** for that slot, so designs can be made to fit exactly:

| Slot | Recommended |
|---|---|
| Hero banner | 1200×400, WebP/JPG, ≤ 300 KB |
| Offer banner | 800×800 (square), WebP/JPG |
| Product photo | 800×800 (square), transparent or white background |
| Header logo animation | 200×200 (square), transparent PNG/WebP |
| Agent photo | 200×200 (square) |

### 10.5 Home page sections
- **New Arrival** (latest uploads) and **Top Sales** (best selling) under Flash Sale, same size as Flash Sale, auto-scrolling, with View All.
- The admin can **add more rows** below them (`homeRails`: title, icon, colour, source = new / top / category).
- **Shop by Category:** the Category Spotlight list is editable (`spotlightCategories`: add, remove, reorder). Clicking a category swaps the products in the same row; only View All opens the category page.
- Products in a live offer or flash sale show an animated **OFFER** badge.
- **SEO text** (title + paragraphs with links) and the **trust strip** (4 items) are editable.

### 10.6 Customer Experience
- "Share Your Experience" first asks **What would you like to review?** (Website, Delivery & Packaging, Product Quality, Sales Person's Behavior, Warranty & Service Center, Other), then rating, name, location, text and photos.
- Reviews are moderated before they appear. The home page scrolls the latest reviews with date and time; `/reviews` lists all, newest first.
- API: `GET /reviews?sort=new&topic=`, `POST /reviews`.

### 10.7 My Gadget Setup (replaces PC Builder)
- Phone database: brand, model, charging port, input watt, output (reverse) watt, battery mAh (`lib/phones.ts`). Admin adds models.
- **Best Matching** = same or higher capability than the phone needs (power bank: capacity ≥ battery and watt ≥ input; charger: watt ≥ input; cable: same connector and enough watt; converter: right connector). Everything else in the category is **You Can Also Buy**.
- The customer can Buy Now / Add to Cart and **Export** the report to WhatsApp.
- API: `GET /phones`, `GET /phones/:id/compatible?cat=`.

### 10.8 Forms
- `/complain` (StarTech-style Complain & Feedback), `/reseller` (reseller application) and `/service-center` (repair / warranty request) need `POST /complaints`, `POST /reseller-applications`, `POST /service-requests`.
- New orders: `POST /orders` returns the order with `placedAt`; `/track-order` shows **Order Placed** with that date and time until the order is confirmed.

---

## 11. Reseller & Corporate buyers (B2B prices)

The storefront already runs this flow in demo mode (`lib/b2b.ts`, `components/partner.tsx`, data kept in the browser). The backend needs to provide accounts, approval and prices.

### 11.1 Flow
1. A shop owner applies on `/reseller`, a company on `/corporate` (business name, contact person, phone, district, trade license, monthly volume, requirements).
2. The account is **pending**. Retail visitors and pending partners see normal prices and offers only.
3. The admin **approves** or **rejects** the application.
4. An approved partner signs in on `/partner` and sees their tier price on the products selected for that tier (product page box, product cards, `/partner/products`, cart).

Demo admin screen for the client walkthrough: `/partner-admin` (not indexed). Demo logins: reseller `01700000001`, corporate `01700000002`.

### 11.2 Prices the admin sets per tier (Reseller and Corporate are separate)
- **Product selection:** which products the tier may buy at partner prices.
- Per selected product:
  - **With warranty** price
  - **No warranty** price (optional)
  - **Colour-wise** prices (optional)
  - **Quantity breaks**, e.g. 10+ units, 50+ units (unit price per break)
  - **Minimum order quantity**

```ts
TierPrice { warranty: number; noWarranty?: number; colors?: Record<string, number>; qty?: [minQty, unitPrice][]; moq?: number }
Partner   { id; type: 'reseller' | 'corporate'; business; person; phone; district; tradeLicense?; volume?; status: 'pending' | 'approved' | 'rejected' }
```

### 11.3 API
| Method & path | Used by | Notes |
|---|---|---|
| `POST /partners` | `/reseller`, `/corporate` | creates a pending application |
| `POST /partners/login` (OTP to phone) | `/partner` | returns a session token |
| `GET /partners/me` | header, product pages, cart | type + status |
| `GET /b2b/prices?tier=` | product cards, product page, `/partner/products` | only for approved partners |
| `POST /orders` | checkout | server recalculates partner unit prices (warranty, colour, quantity) — never trust the browser |
| Admin: list / approve / reject partners, edit tier selections and prices | againERP admin | |
