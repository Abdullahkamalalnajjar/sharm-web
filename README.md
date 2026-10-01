# sharm_web

Website version of the Sharm delivery app (the Flutter app lives in `~/Desktop/sharm_app` and keeps
working on its own). Same backend, same roles, same DoorDash-style dark theme.

## Run

```bash
cd ~/Desktop/sharm_web
npm install
npm run dev          # http://localhost:5173
```

API calls (`/api`, `/identity`, `/uploads`) are proxied by the Vite dev server to the backend set in
`vite.config.ts` (`API_PROXY_TARGET` env var overrides it). To point at a local API:

```bash
API_PROXY_TARGET=https://localhost:5003 npm run dev
```

Production build: `npm run build` → `dist/`. Set `VITE_API_BASE_URL` in `.env.production` to the API
origin and make sure that site's origin is allowed by the backend CORS policy (any `localhost` origin
already is).

## Test accounts (seeded by the backend)

| Role        | Email                | Password    |
|-------------|----------------------|-------------|
| Customer    | customer@sharm.app   | Test123!    |
| Store owner | owner@sharm.app      | Test123!    |
| Driver      | driver@sharm.app     | Test123!    |
| Admin       | admin@example.com    | Admin123!   |

The login page has quick-fill chips for these. Logging in anywhere invalidates that account's other
sessions (the backend keeps one refresh token per user).

## Stack

React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · react-router 7 · TanStack Query 5 · zustand · axios · lucide-react

## Structure

```
src/
├─ api/            axios client (bearer token, refresh on 401/403, Result<T> unwrap), endpoint modules, react-query hooks
├─ components/
│  ├─ ui/          buttons, cards, chips, fields, sheet/dialog, states, images
│  └─ layout/      AppShell (desktop header + phone bottom bar), route guards, toasts / confirm / login prompt
├─ features/
│  ├─ auth/        login, signup, guest placeholders
│  ├─ customer/    home (search, delivery picker, categories, promo, stores), store menu, product sheet
│  ├─ cart/        cart, checkout
│  ├─ orders/      my orders, order details, shared order widgets
│  ├─ addresses/   list + form sheet
│  ├─ account/     profile / logout
│  ├─ owner/       my stores, store form (logo upload), manage menu, product editor (options), dialogs
│  ├─ driver/      driver app: my deliveries (now / history), pick up and deliver
│  └─ admin/       dashboard, orders (+ driver assignment), drivers, statistics (day / month / year), stores + details sheet
├─ lib/            formatting (prices, Arabic dates), meta (types/statuses/areas), session (JWT → role)
├─ store/          zustand: auth session, browse filters, toasts, confirm, login prompt
└─ types/          API models
```

## Routes

| Path | Who |
|------|-----|
| `/`, `/store/:id` | everyone (guests browse; account actions ask to log in) |
| `/cart`, `/checkout`, `/orders`, `/orders/:id`, `/addresses`, `/account` | customer |
| `/owner`, `/owner/stores/new`, `/owner/stores/:id/edit`, `/owner/stores/:id/menu`, `/owner/stores/:id/products/...` | store owner |
| `/admin`, `/admin/orders`, `/admin/orders/:id`, `/admin/stores`, `/admin/stores/...`, `/admin/drivers`, `/admin/reports` | admin |
| `/driver`, `/driver/orders/:id` | driver |
| `/login`, `/signup` | guests |

## Theme

Tokens live in `src/index.css` (`@theme`): background `#0E0E10`, cards `#1B1B1F` with hairline borders,
DoorDash red `#EF2A2A` for brand / primary actions, yellow `#FFC62E` for prices and highlights, white type,
Cairo font, RTL.
