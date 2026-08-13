# HSN BY AYAT — full-stack storefront

A complete e-commerce platform: customer storefront, REST API, and admin
back office, built with Next.js (App Router), Prisma, and MySQL/MariaDB
(swappable to Postgres). The storefront design — colors, fonts, garment-tag
aesthetic — is ported 1:1 from the original single-file
`threadform-store.html` prototype.

## Tech stack

- **Frontend:** Next.js 16 (App Router), React 19, plain CSS (`src/app/globals.css`) — no CSS framework, matching the original hand-built stylesheet.
- **Backend:** Next.js Route Handlers under `src/app/api/**`.
- **Database:** MySQL/MariaDB (e.g. Hostinger's included database), Postgres-swappable, via Prisma ORM 7.
- **Auth:** JWT in httpOnly cookies. Two roles: `admin` (full back office) and optional `customer` accounts.
- **File storage:** local `/public/uploads` (fine on any host with a persistent filesystem); one-file swap to S3/Cloudflare R2 for serverless hosts like Vercel.
- **State:** Zustand for cart + UI overlay state (persisted to `localStorage` for the cart only).
- **Validation:** zod on every API input.

## Project structure

```
prisma/
  schema.prisma        Database schema
  seed.ts               Seeds admin user, settings, and the 16 launch products
  migrations/
src/
  app/
    (storefront)/        Route group: customer-facing pages, wrapped in storefront chrome
      page.tsx            Homepage
      shop/                /shop — filterable, paginated collection page
      products/[slug]/     Product detail page
      track/               Order tracking
      info/[page]/         Shipping / returns / FAQ / contact
      layout.tsx           Storefront shell: announcement bar, header, footer, cart/search/checkout overlays
    admin/
      (auth)/login/         Admin login (no sidebar)
      (protected)/          Everything else under /admin — auth-guarded
        page.tsx             Dashboard
        products/            List, create, edit
        orders/              List, detail (status + packing slip)
        inventory/           Flat stock editor
        content/             Settings/CMS editor
        newsletter/          Subscriber list + export
        admins/              Admin user management
        layout.tsx           Auth guard + sidebar shell
    api/
      products, collections, search, orders, orders/track, newsletter, settings   — public
      admin/**                                                                     — admin-only, cookie-guarded
      customer/**                                                                  — optional customer accounts
    layout.tsx            True app root: fonts only, no chrome (shared by both route groups)
    globals.css           Full design system — CSS custom properties, all component classes
  components/            Storefront components (Header, ProductCard, CartDrawer, ...)
  components/admin/      Admin-only components (sidebar, product form, login form)
  lib/
    prisma.ts             Prisma client singleton (MySQL/MariaDB adapter wired up)
    auth.ts                JWT signing/verification, session helpers
    storage.ts              Upload abstraction (local disk / S3-compatible)
    settings.ts               Typed wrapper over the Setting key/value store, with defaults
    queries.ts                  Shared read queries (used by both API routes and Server Components)
    validation/                   zod schemas per resource
    rateLimit.ts                    In-memory limiter for order creation + tracking lookups
    cartStore.ts, uiStore.ts          Zustand stores
```

## Setup

Requires Node.js 20.9+, npm, and a reachable MySQL/MariaDB database (a local
install, a Docker container, or your hosting provider's database reachable
from your machine).

```bash
npm install
cp .env.example .env        # then edit JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD, DATABASE_URL
npm run db:migrate          # applies all migrations to your MySQL database
npm run db:seed             # admin user + default settings + 16 launch products
npm run dev
```

Visit `http://localhost:3000` for the storefront and `http://localhost:3000/admin`
for the back office (log in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` from your `.env`).

### Other useful commands

| Command | What it does |
|---|---|
| `npm run build` | Production build (also type-checks) |
| `npm run start` | Runs the production build |
| `npm run db:studio` | Opens Prisma Studio to browse/edit data visually |
| `npm run db:generate` | Regenerates the Prisma client after a schema change |
| `npm run lint` | ESLint |

### Testing it end-to-end

1. Browse the storefront, add a product to cart, check out with Cash on Delivery.
2. Copy the order number from the confirmation screen, go to `/track`, and look it up with the phone number you entered.
3. Log into `/admin`, find the order under **Orders**, and move it through the status pipeline (PENDING → CONFIRMED → PACKED → SHIPPED → DELIVERED) — each change is timestamped and visible on both the admin order page and the public tracking page.
4. Edit an announcement or hero slide under **Admin → Content** and refresh the homepage — it updates live, since all storefront copy is database-driven.

## Changing the brand name and colors

Both live in exactly one place each:

- **Colors:** the CSS custom properties at the top of `src/app/globals.css`:
  ```css
  :root {
    --paper: #f2f1ec;
    --ink: #171715;
    --indigo: #2a3b7d;
    --tag: #ddd9ce;
    --line: #c9c6bc;
    --sale: #96473a;
  }
  ```
  Every component references these tokens — change them here and the whole app (storefront + admin) updates.

- **Brand name / contact info** used in the footer, page titles, and info pages: `src/lib/settings.ts` → `DEFAULT_SETTINGS.brand` (this is also editable live from **Admin → Content** once seeded, without touching code).

- **Logo:** go to **Admin → Content → Brand & contact → Logo** and upload an image — no code involved. It replaces the text wordmark everywhere the wordmark appears (header, admin sidebar, admin login, printed packing slips); removing it reverts to the text wordmark. If you'd rather ship a fixed logo asset in code instead of an admin-uploaded one, or want to change the *text* wordmark's two-tone split (the "HSN" / "BY AYAT" fallback, used until a logo is uploaded), edit `src/components/BrandWordmark.tsx` — everything else reads through `src/components/BrandMark.tsx`, which is the single place that decides "uploaded logo vs. text fallback."

  You can upload any reasonably-sized image — a huge product-shoot PNG, a logo with lots of padding around it, a non-square crop, whatever a client hands you. The upload endpoint auto-processes anything sent with `type=logo` (`src/lib/imageProcessing.ts`, using `sharp`): it trims uniform-colour padding from the edges, then downscales to fit within 480×160px (never upscales a small logo), and re-encodes as PNG. The frontend then fits that processed image into each display slot — header (max 32×190px), admin sidebar/login (max 28×160px), packing slip (max 22×140px) — via `max-height`/`max-width` with `width:/height:auto`, so the logo's own aspect ratio is always preserved and it can never overflow or stretch, regardless of the source image's original shape.

## Database schema

See `prisma/schema.prisma`. Key models: `Category` / `Subcategory`, `Product`
/ `ProductImage` / `Variant` (stock tracked per size), `Order` / `OrderItem` /
`OrderStatusLog`, `Customer` / `Address`, `NewsletterSubscriber`, `AdminUser`,
and `Setting` (a typed key/value store — see `src/lib/settings.ts` for the
schema of each key).

Four additions beyond the originally-approved schema, all additive:
- `Category` / `Subcategory` — real, admin-manageable tables (id, name, slug,
  sortOrder, isActive) replacing what was originally a fixed 3-value enum
  (`Tops`/`Bottoms`/`Accessories`) plus a free-text subcategory field. See
  "Managing categories" below.
- `Product.placeholderType` / `placeholderColor` — drive the drawn-SVG
  garment fallback (shape + tint) shown until real product photos are
  uploaded, ported from the original prototype's per-product `type`/`color`.
- `OrderStatusLog` — records every status change with a timestamp, so the
  admin order page and the public tracking timeline both have real history.
- `PasswordResetToken` — single-use, 1-hour-expiry tokens for the admin
  "forgot password" flow (only a SHA-256 hash is stored, never the raw token).

## Managing categories

Categories and subcategories (e.g. "Tops" → "Tees"/"Fleece"/"Layers") are
fully admin-manageable — not hardcoded. Go to **Admin → Categories** to add,
rename, reorder (↑/↓), deactivate, or delete them. A brand-new top-level
category shows up in the storefront's mega-menu and `/shop` filters
immediately, as soon as at least one active product uses it.

You can also add a new category or subcategory inline while creating a
product, via the "+ New category" / "+ New subcategory" buttons right on the
product form — handy when you don't want to break your flow to go manage
categories separately first.

A few rules worth knowing:
- Deleting a category/subcategory is blocked while any product still
  references it (delete the products first, or just deactivate it instead —
  deactivating hides it from the storefront and from the product form's
  dropdowns without touching existing products).
- Subcategories belong to exactly one category; renaming a category doesn't
  require renaming its subcategories.
- Storefront URLs use slugs (`/shop?group=tops&sub=tees`), not display names,
  so renaming "Tops" to "Tops & Outerwear" doesn't break existing links —
  only changing the *slug* would (the category edit form lets you set slug
  and name independently for exactly this reason).

## Bulk product import (CSV / Excel)

**Admin → Products → Import CSV/Excel.** Download the template, fill it in
(or export from a spreadsheet you already have), upload it, review the
preview, then confirm. Nothing is written to the database until you click
confirm — the preview step parses and validates every row for real, so
you'll see exactly what will be created vs. updated vs. skipped first.

- **One row per product.** Sizes and stock go in a single cell as
  `SIZE:QTY;SIZE:QTY`, e.g. `S:10;M:5;L:0`.
- **Upsert by slug.** If a row's slug matches an existing product, that
  product (and its variant stock) is updated instead of duplicated — leave
  the Slug column blank on new products and it's generated from the name.
  This also makes the same import flow usable for bulk price/stock updates:
  export your current catalog's slugs, edit the numbers, re-import.
  Existing variants are matched by size — new sizes are added, sizes you
  remove from the sheet are simply left alone (not deleted).
- **Categories/subcategories are created automatically** if the name in the
  sheet doesn't match anything in **Admin → Categories** yet — the preview
  clearly flags which ones are "new" before you confirm, so a typo doesn't
  silently create a near-duplicate category.
- **Sale price → sale % is computed automatically**, same as the single
  product form.
- **Both `.csv` and `.xlsx`/`.xls` are supported** via the same upload (parsed
  with SheetJS — installed from SheetJS's own CDN rather than the npm
  registry, since the npm-published build has two long-standing unpatched
  advisories; see `package.json`).
- **Images are not part of the import** — add photos on each product's edit
  page afterward. Bulk-importing arbitrary image URLs server-side opens up
  SSRF risk that didn't seem worth it for a first version; happy to revisit
  if it'd be genuinely useful to you.
- Max 500 rows / 5MB per file — split larger catalogs into batches.

## Admin account management

- **Change your password:** while logged in, go to **Admin → Admin users →
  Your password**. Requires the current password.
- **Forgot password:** the login page has a "Forgot password?" link →
  enter your email → a reset link is emailed (valid 1 hour, single-use).
  **Without SMTP configured, the reset link is printed to the server
  console instead of emailed** — that's fine for local dev (copy the link
  from your terminal) but you must set `SMTP_HOST` / `SMTP_PORT` /
  `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_FROM` in `.env` before relying on
  this in production. Any standard SMTP provider works (Amazon SES,
  Postmark, Mailgun, Resend's SMTP endpoint, etc.) — see `src/lib/email.ts`.
- **Invite/remove other admins:** also on the **Admin users** page. The
  last remaining admin can't be removed, and you can't remove yourself.

## Money and stock safety

- All prices are **integers in PKR** — no floats anywhere, including sale
  price math (`src/lib/money.ts`).
- Order numbers (`TF-XXXXXX`) are generated server-side with a uniqueness
  check (`src/lib/orderNumber.ts`).
- Stock decrements happen inside a database transaction using a
  conditional `UPDATE ... WHERE stockQty >= qty` guard
  (`src/app/api/orders/route.ts`), so two simultaneous checkouts cannot
  oversell the last unit — verified manually by placing an order for more
  units than were in stock and confirming it's rejected without touching
  the stock row.
- Public API responses never expose exact stock counts beyond what the UI
  needs: a boolean "available", plus an exact number *only* when stock is
  under 3 (to power the "Only 2 left" copy).

## Performance, SEO & security

A production-hardening pass on top of the functional build:

- **Fonts** are self-hosted via `next/font/google` (`src/app/layout.tsx`)
  instead of a `<link>` to `fonts.googleapis.com` — removes a render-blocking
  third-party request and the flash-of-fallback-font layout shift. The
  generated CSS variables feed into the existing `--sans`/`--mono` tokens in
  `globals.css`, so nothing else about the design system changed.
- **Images** (product photos, quick-view, PDP gallery, and cards) go through
  `next/image` — automatic AVIF/WebP conversion, responsive `srcset`, lazy
  loading below the fold, and `priority` on the one LCP-critical image (the
  PDP hero photo). The uploaded-logo `<img>` is deliberately left as-is: it's
  one small, admin-controlled asset with no fixed intrinsic size, so
  next/image's width/height contract isn't worth the complexity there.
- **`next.config.ts`** now sets `images.formats`, allow-lists the S3 bucket
  host for remote image optimization when `STORAGE_DRIVER=s3` (read from
  `S3_PUBLIC_BASE_URL` at build/start time), disables the `X-Powered-By`
  header, and adds baseline security headers (`X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) on every route.
- **SEO**: `src/app/robots.ts` and `src/app/sitemap.ts` (Next's file
  conventions, served at `/robots.txt` and `/sitemap.xml`) — the sitemap is
  generated from live product/category data, and `/admin` + `/api` are
  disallowed. Every page now composes its `<title>` through the root title
  template (`%s | HSN BY AYAT`) instead of hand-writing the brand suffix
  everywhere; the admin back office has its own template and is marked
  `noindex` in both `robots.ts` and page metadata (defense in depth). The
  shop listing's title is now generated dynamically from the active
  filter (e.g. "Tops · Sale" instead of a static "Shop").
- **Caching**: the product detail page and the static info pages
  (shipping/returns/FAQ/contact) opt into ISR (`export const revalidate`)
  since they don't depend on `searchParams` and don't need to hit the
  database on every single request. The homepage and `/shop` intentionally
  stay fully dynamic — they read `searchParams` for filtering/sorting, which
  Next always renders per-request regardless of a `revalidate` export, so
  adding one there would be a no-op. None of this affects checkout: the
  atomic stock-decrement transaction (above) is the real oversell guard, not
  the freshness of a listing page.
- Set **`NEXT_PUBLIC_SITE_URL`** to the real production domain before
  deploying (see `.env.example`) — it's used to build absolute URLs in the
  sitemap, `robots.txt`, and Open Graph/Twitter share previews. It defaults
  to `http://localhost:3000`, which is only correct for local dev.

## Database provider

The app runs on **MySQL/MariaDB** via the `@prisma/adapter-mariadb` driver
adapter (chosen because it's what's bundled with Hostinger-style shared
hosting — no separate database service to stand up). `DATABASE_URL` is a
standard connection string: `mysql://user:password@host:port/dbname`.

A handful of `String` fields that can legitimately hold more than MySQL's
default 191-character `VARCHAR` — product descriptions, order
address/notes, and the settings JSON blob (which holds the full Terms/
Privacy page bodies) — are explicitly annotated `@db.Text` in
`prisma/schema.prisma` for this reason.

**Switching to Postgres instead**, if you ever move off MySQL:
1. In `prisma/schema.prisma`, change `provider = "mysql"` to `provider = "postgresql"` and delete the `@db.Text` annotations (Postgres's default text type has no length cap, so they're unnecessary — harmless either way, but they're MySQL-flavored syntax).
2. `npm install @prisma/adapter-pg pg` (and `npm uninstall @prisma/adapter-mariadb mariadb`).
3. In `src/lib/prisma.ts` **and** `prisma/seed.ts`, swap the adapter:
   ```ts
   import { PrismaPg } from "@prisma/adapter-pg";
   const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
   ```
4. Set `DATABASE_URL` to your Postgres connection string, then `npx prisma migrate deploy`.

### Known issue: `prisma migrate deploy` / `db push` can't reach Hostinger's MySQL

Confirmed by actually deploying to Hostinger: Prisma's CLI (`migrate deploy`,
`migrate dev`, `db push`, `db execute` — anything that opens its own DB
connection via Prisma's internal schema engine) fails with
`P1000: Authentication failed`, even with correct credentials. The `mysql`
CLI and the app's own `mariadb` driver (via `@prisma/adapter-mariadb`, what
`src/lib/prisma.ts` actually uses at runtime) connect to the exact same
database with the exact same credentials without any problem — this is
specifically Prisma's bundled schema-engine binary failing to negotiate
with this MariaDB version (11.8), not a credentials or hosting-permissions
issue.

**Practical effect:** the `build` script does *not* run `prisma migrate
deploy` (it did originally; removed after confirming it breaks the build
here). Applying the schema — for the initial setup, and for any future
migration — means generating the SQL yourself and running it directly
against the database:

```bash
# Generates the raw SQL for a schema change without needing a live DB
# connection (this specific Prisma command doesn't hit the broken engine
# path), then apply it directly:
npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script > /tmp/change.sql
mysql -u <user> -p -h localhost <dbname> < /tmp/change.sql
```

Then record it in Prisma's own tracking table so migration history stays
consistent (see `prisma/migrations/20260803000000_init_mysql` for the
pattern — a `_prisma_migrations` row per applied migration, checksum from
`shasum -a 256 migration.sql`). Annoying, but it's a one-time cost per
schema change, and if you ever move to a different MySQL host (or Prisma
fixes this engine incompatibility in a later release), `prisma migrate
deploy` can simply be added back to the `build` script.

## File storage: local vs. S3 / Cloudflare R2

Local disk storage (`STORAGE_DRIVER=local`, the default) needs the app to
run somewhere with a **persistent, stable** filesystem path — a real VPS or
a Docker container with a volume, where `public/uploads` is the same real
directory on every deploy. It is **not** fine on Vercel or other serverless
hosts (filesystem wiped on every deploy), and — confirmed the hard way in
production — **not automatically fine on Hostinger's Git-based Node.js App
deploys either**: each deploy there builds into a brand-new versioned
directory (`hbuilds/versions/<id>/nodejs`), so `public/uploads` starts
empty every time, silently 404ing anything uploaded before the next deploy
even though the database still references it.

**The fix already wired up for this**: `scripts/link-persistent-uploads.js`
runs on every `npm install` (via `postinstall`) and, if `PERSISTENT_UPLOADS_DIR`
is set, replaces `public/uploads` with a symlink to that fixed path —
outside the versioned build tree, so it's the same real directory across
every deploy. On the current Hostinger setup this is set to
`/home/<user>/domains/<domain>/persistent-uploads` (a sibling of `hbuilds/`,
set once as an environment variable in hPanel, not in the repo). Hosts
that don't need this (local dev, Docker/VPS with one stable directory)
just don't set the env var, and the script no-ops.

To switch to S3-compatible storage instead (needed for Vercel, or just
preferred — sidesteps this whole class of problem structurally):
set `STORAGE_DRIVER=s3` and fill in the `S3_*` variables in `.env`
(`S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`,
`S3_PUBLIC_BASE_URL`). No code changes needed — `src/lib/storage.ts` is the
single abstraction every upload path goes through (`saveUpload` /
`deleteUpload`), and it branches on `STORAGE_DRIVER` at call time.

## Deployment

### Hostinger (shared hosting, "Setup Node.js App")

This is the deployment this project is currently configured for.

1. **Database**: hPanel → Databases → MySQL Databases → create a database
   and a user, note the database name/username/password. Host is usually
   `localhost` from the app's own server.
2. **Email**: hPanel → Emails → Email Accounts → create a mailbox (e.g.
   `hello@hsnbyayat.com`), then find its SMTP settings under
   Emails → Configuration.
3. **Upload the code**: via Git (hPanel supports deploying from a repo) or
   by uploading the project files directly under the domain's app directory.
4. **hPanel → Advanced → Setup Node.js App**: point it at the project
   directory, select a Node.js version ≥ 20.9 (required by Next.js 16),
   and set the startup file — since this is a Next.js app rather than a
   single script, use the app's "run command" field (if offered) for
   `npm run build && npm start`, or SSH in and run those manually/under a
   process manager (`pm2 start npm --name hsnbyayat -- start`) if the panel
   expects a single persistent process instead.
5. **Environment variables**: set everything from `.env.example` (real
   values) either in hPanel's Node.js app environment-variables UI, or in a
   `.env` file in the project root if the panel loads one automatically —
   check Hostinger's Node.js app docs for which your plan supports.
6. **First deploy only**: SSH in and run `npx prisma migrate deploy` (applies
   the schema to your fresh MySQL database) then `npm run db:seed` (creates
   the first admin user and default content).
7. **DNS**: point `hsnbyayat.com`'s A/CNAME record at wherever Hostinger's
   Node.js app is served from (hPanel shows this) — since the domain is
   already on the same Hostinger account, this is usually pre-wired.

Exact button labels vary by Hostinger plan/panel version — if a step above
doesn't match what you see, tell me what's on screen and we'll adjust.

### Vercel

Works as-is for the Next.js app itself, but needs two things Hostinger
doesn't: a database reachable from the internet (Hostinger's MySQL is
usually `localhost`-only from its own server, so you'd need a separate host
like PlanetScale, or to allow remote MySQL access if your Hostinger plan
supports it) and `STORAGE_DRIVER=s3` (see above — Vercel's filesystem is
ephemeral). Set all `.env.example` variables as Vercel project environment
variables, then run `npx prisma migrate deploy` once against the production
`DATABASE_URL` before first traffic.

### VPS / Docker

```bash
cp .env.example .env   # fill in real values, including a mysql:// DATABASE_URL
docker compose up -d --build
```

This builds the app image (see `Dockerfile`) — point `DATABASE_URL` at any
reachable MySQL instance (a sibling container, a managed database, etc).
The container runs `prisma migrate deploy` on every boot (a no-op if
already up to date) before starting the server.

> **Note:** I don't have Docker available in this environment, so the
> Dockerfile is written and reviewed carefully but not build-tested here —
> please do a `docker compose up --build` locally before relying on it, and
> let me know if anything needs adjusting.

### Rate limiting caveat

`src/lib/rateLimit.ts` is an in-memory limiter — correct and effective on a
single long-running process (Hostinger's Node app, a VPS, a Docker
container), but each instance tracks its own counters on serverless/
multi-instance platforms. Fine as a best-effort abuse guard either way;
swap in a Redis-backed limiter (e.g. Upstash) if you need it to be
authoritative across many instances.

## API overview

All endpoints validate input with zod and return JSON.

**Public** — `/api/products`, `/api/products/[slug]`, `/api/collections`,
`/api/search`, `/api/settings`, `/api/newsletter` (POST), `/api/orders`
(POST — creates an order), `/api/orders/track` (POST — order number + phone,
both must match; rate-limited).

**Admin** (require a valid admin session cookie) — full CRUD under
`/api/admin/products`, `/api/admin/orders`, `/api/admin/inventory`,
`/api/admin/settings`, `/api/admin/subscribers`, `/api/admin/admins`,
`/api/admin/dashboard`, `/api/admin/uploads`, plus
`/api/admin/orders/export` and `/api/admin/subscribers/export` (CSV).

**Customer accounts** (optional, no dedicated storefront UI yet — see
"What's not built" below) — register/login/logout/me/orders under
`/api/customer/**`.

## What's not built / deliberately deferred

- **Card payments.** Only Cash on Delivery and Bank Transfer, per spec.
  `Order.paymentMethod` is structured so a provider (Stripe/PayFast/SafePay)
  can be added as a third option later without a schema change.
- **Customer account UI.** The backend (register/login/order history) is
  complete and orders link to a logged-in customer's account, but there's
  no storefront login page — the original prototype has no account UI
  either, and guest checkout covers every flow in the spec.
- A few small CSS classes were added for surfaces the original single-page
  prototype never had as standalone routes (the product detail page, order
  tracking page, info pages, and pagination) — built from the same
  tokens/borders/shadow language as everything else, not a redesign.
