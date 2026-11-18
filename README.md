# Munshiganj IT Storefront (Next.js)

Next.js 15 (App Router, TypeScript) port of the approved HTML UI in `../ui/`. All data is mock data for the client demo. It is shaped so it can later be replaced by the againERP API.

## Run locally
```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build (same as Vercel)
```

## Deploy (GitHub + Vercel)
1. Push this folder (`munshiganjit-web/`) to a GitHub repository. `.gitignore` already excludes `node_modules` and `.next`.
2. In Vercel, choose **Add New → Project**, import the repo and keep the defaults (Framework: Next.js, Build: `next build`).
   - If the repo root is the parent `munshiganjit/` folder instead, set **Root Directory** to `munshiganjit-web`.
3. Deploy. No environment variables are needed for the demo.

## Structure
| Path | What |
|---|---|
| `app/layout.tsx` | Header, Footer and floating widgets around every page; fonts via `next/font` |
| `app/globals.css` | Full design system from the HTML prototype |
| `components/Header.tsx` | TV Hut-style header, animated logo, live search, category bar with dropdowns |
| `components/Footer.tsx` | Footer (map, call center, newsletter, payments, socials) |
| `components/Floating.tsx` | Compare/Cart rail, cart drawer, mobile menu, recently-bought popup, WhatsApp, bottom nav, toasts |
| `components/store.tsx` | Cart, wishlist, compare, coupon, toasts (localStorage; swap for API later) |
| `components/ui.tsx` | Icon, ProductImg, ProductCard, Crumb, SecHead, Modal, Countdown… |
| `components/Listing.tsx` | Category, offers and search listing with filters and counts |
| `components/ProductDetail.tsx` | Product page (colour-based price, other brands, tabs) |
| `lib/data.ts` | Mock categories, products, blog, etc. **Replace with againERP API calls.** |
| `lib/format.ts` | Money format (৳1,18,500) and URL helpers |

## Routes
`/` · `/category/[slug]?sub=&brand=` · `/products?stock=&brand=&sort=` · `/offers` · `/search?q=` · `/product/[id]` · `/cart` · `/checkout` · `/login` · `/register` · `/account#section` · `/track-order?id=` · `/wishlist` · `/compare` · `/blog` · `/blog/[id]` · `/contact` · `/about` · `/help-support` (old `/faq` redirects) · `/policy#section` · `/all-pages` (review index)

## Known demo limitations
- Product images are placeholder illustrations (`ProductImg` → swap for `next/image` with real photos).
- Pagination and "Show" count are visual only; the বাংলা toggle shows a "coming soon" toast.
- Orders, account data, tracking and form submissions are mock (toasts only).
