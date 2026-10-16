# Guava

Personal budgeting app built with:

- **Next.js 16** (App Router, TypeScript, React 19) for both frontend and backend
- **shadcn/ui** (Nova preset) + Tailwind CSS v4
- **Neon** Postgres through **Prisma 7** (Neon serverless driver adapter)
- **Plaid** for connecting bank accounts

## Setup

**1. Install** (Node 20.9+, pnpm). This also generates the Prisma client.

```bash
pnpm install
```

**2. Environment.** Copy the example and fill it in:

```bash
cp .env.example .env
```

| Variable                          | Where to get it                                                               |
| --------------------------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`                    | Neon console → Connect → **Pooled** connection string                         |
| `DIRECT_URL`                      | Same screen, pooling turned **off**                                           |
| `PLAID_CLIENT_ID`, `PLAID_SECRET` | Plaid dashboard → Developers → Keys (use the Sandbox secret)                  |
| `ENCRYPTION_KEY`                  | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |

**3. Create the tables** in Neon, then load sample data (about three years of expenses for the demo user, ending today):

```bash
pnpm db:deploy
pnpm db:seed
```

**4. Run it:**

```bash
pnpm dev
```

Check http://localhost:3000/api/health first; it should report `"database": "connected"`. Then open http://localhost:3000. To try Plaid, go to **Settings**, click **Connect a bank**, pick any institution, and sign in with `user_good` / `pass_good`.

## Project layout

```
prisma/
  schema.prisma               Users, bank connections, categories, expenses, settings
  migrations/                 SQL migrations (pnpm db:deploy applies them)
  seed.ts                     Sample data for the demo user (pnpm db:seed)
prisma.config.ts              Prisma CLI config (uses DIRECT_URL for migrations)
app/
  error.tsx                   Shown when the app can't load (e.g. database down)
  (app)/                      Dashboard, Expenses, Categories, Settings
    layout.tsx                Loads the user's data and wraps the app shell
  api/
    health/                   GET: database ping
    plaid/
      create-link-token/      POST: step 1 of Plaid Link
      exchange-public-token/  POST: step 3, saves the bank and its accounts
      webhook/                POST: Plaid webhook receiver (stub)
components/
  plaid-link-button.tsx       Client component that runs the Link flow
  ui/                         shadcn components (add more: pnpm dlx shadcn@latest add dialog)
lib/
  prisma.ts                   Shared Prisma client (Neon adapter, pooled URL)
  plaid.ts                    Plaid API client
  crypto.ts                   AES-256-GCM encryption for stored access tokens
  current-user.ts             Demo user stub; replace with real auth
  guava/
    store.tsx                 Client store: instant updates, saved via server actions
    server/snapshot.ts        Loads a user's data from the database
    server/actions.ts         Server actions that validate and save each change
generated/prisma/             Generated Prisma client (gitignored)
```

## Scripts

| Command                        | Does                                                        |
| ------------------------------ | ----------------------------------------------------------- |
| `pnpm dev`                     | Dev server                                                  |
| `pnpm build` / `pnpm start`    | Production build / serve                                    |
| `pnpm lint` / `pnpm typecheck` | ESLint / TypeScript                                         |
| `pnpm db:migrate`              | Create and apply a migration after editing the schema (dev) |
| `pnpm db:deploy`               | Apply existing migrations (production / CI)                 |
| `pnpm db:seed`                 | Reset the demo user's data to fresh sample data             |
| `pnpm db:studio`               | Browse your Neon data in Prisma Studio                      |

## Before going to production

- **Add auth.** `lib/current-user.ts` returns a single demo user. Replace it with a real auth provider; every Plaid route already goes through it.
- **Verify webhooks.** `app/api/plaid/webhook` logs events but doesn't check Plaid's signature yet.
- **Keep access tokens server-side.** They're encrypted in the database and never returned to the browser. Keep `ENCRYPTION_KEY` out of git.
