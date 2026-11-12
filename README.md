# TKS Chicken Centre - ERP + POS (frontend demo)

A clickable demo of an ERP and POS web app for a chicken processing and retail
business in Kerala. It is frontend only: there is no backend, no database and no
real login. All data is dummy data kept in the browser.

## Run it

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Pick a role on the login page and sign in. Any password works.

For a presentation, the production build is faster:

```bash
npm run build
npm start
```

## What to show in the demo

1. **Login** - choose Owner, Manager, Cashier or Production staff. The menu changes with the role.
2. **Dashboard** - today's sales, bills, live and cut stock, today's yield, cash in hand and customer outstanding.
3. **POS** - tap a product, enter the weight on the number pad or press **Read scale**, then **Pay**.
   The receipt opens with a Print button. Go back to the Dashboard: sales and stock have changed.
4. **Processing** - press **New batch**, then **Fill sample weights**. Change any weight and watch
   the yield % and the balance change. The batch can be saved only when input = outputs + waste + loss.
5. **Purchase** - a new purchase adds birds and kg to live stock.
6. **Settings > Demo data** - **Reset demo data** restores the original data.

POS keyboard shortcuts: `/` or `F2` search, `F9` pay, `F4` hold bill, `Enter` confirm.

## Roles

| Role | Screens |
| --- | --- |
| Owner | Everything |
| Manager | Everything except Settings |
| Cashier | POS, Customers, Advance orders |
| Production staff | Purchase, Processing, Inventory |

## The yield rule

There is no fixed yield percentage anywhere in the app.

- Live birds enter stock as a count plus total live weight (kg).
- A processing batch records the actual input (birds, live kg) and the actual weighed output (kg per product).
- Yield % = output kg / input live kg, calculated for each batch.
- Waste and loss are entered separately, so input = outputs + waste + loss.
- The 30 days of dummy batches have a different yield every day, between 68% and 74%.

## About the dummy data

- Data is saved in the browser's localStorage (key `tks-chicken-erp`), so changes survive a refresh.
- The history covers the last 30 days ending today. If you open the demo on a later day, the data is
  generated again for the new day so the dashboard always has "today" numbers. Changes made on the
  earlier day are replaced when that happens.
- The same dummy data is generated on every reset.

## Product photos and logo

- Product photos are in `public/products/`. Which product uses which photo is set in the `PHOTOS`
  list in `src/data/seed/catalog.ts`. Where there is no photo of the exact cut, the closest photo is
  reused. Products with no photo (live birds, heart) show a drawn illustration.
- To change a photo in the running app: Settings > Products > Edit > Upload photo.
- The logo files are `public/logo.png` (green), `public/logo-white.png` (for dark mode) and
  `src/app/icon.png` (browser tab icon). The logo on printed bills can be switched off in
  Settings > Bill format.

## Tech stack

Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, Zustand (persisted to localStorage),
Recharts, lucide-react, React Hook Form + Zod.

## Folder structure

```
src/
  app/
    login/                 Login with role picker
    pos/                   Full-screen POS
    (erp)/                 Screens with the sidebar layout
      dashboard/ purchases/ processing/ inventory/
      customers/ customers/[id]/ orders/ suppliers/ reports/ settings/
  components/
    ui/                    shadcn/ui components
    layout/                Sidebar shell, theme toggle, user menu, providers
    shared/                Page header, stat card, empty state, form field, receipt
    pos/                   Weight pad, cart, payment dialog
    dashboard/ processing/ customers/ settings/
  data/                    The data layer (the only place that touches data)
    types.ts               All domain types
    seed/                  Products, customers, suppliers and the 30-day history generator
    store.ts               Zustand store, saved to localStorage
    api.ts                 getProducts, createSale, createBatch, createPurchase ...
    selectors.ts           Derived numbers: outstanding, ledgers, stock history, yield
  lib/                     Formatting (INR, kg, DD-MM-YYYY), CSV export, permissions, validation
```

## Connecting a real backend later

All reads and writes go through `src/data/api.ts`. To use a real API:

1. Keep the function names and the types in `src/data/types.ts`.
2. Replace each function body in `api.ts` with an API call. The functions are synchronous today,
   so they will become `async` and the screens that call them will need `await`.
3. Screens read data with `useStore(...)`. Replace those reads with your data-fetching hooks
   (for example TanStack Query) that return the same types.
4. `selectors.ts` holds the business calculations. These can stay in the frontend or move to the server.

## Formats

Currency in INR, weights in kg with 3 decimals, dates as DD-MM-YYYY.
