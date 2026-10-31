# Guava

A personal expense tracker that keeps each user's expenses in a Neon Postgres database they own.

Guava's own database holds only logins and an encrypted pointer to each user's database. Expenses, categories, dashboard widgets and optional Plaid bank connections all live in the user's database, so their financial data never sits on the app's servers.

Built with Next.js 16 (App Router, React 19), Tailwind CSS v4 and shadcn/ui, Prisma 7 on Neon's serverless driver, and Better Auth.

## Prerequisites

- Node.js 20.9 or later and pnpm
- A [Neon](https://neon.tech) project with two databases: one for the app, one to connect as your workspace
- Docker, to run the integration and e2e tests

## Getting started

Install dependencies. This also generates both Prisma clients.

```bash
pnpm install
```

Copy the example environment file and fill it in:

```bash
cp .env.example .env
```

| Variable             | Value                                                                         |
| -------------------- | ----------------------------------------------------------------------------- |
| `DATABASE_URL`       | Neon console → Connect → pooled connection string for the app database        |
| `DIRECT_URL`         | The same string with pooling off, used by Prisma migrations                   |
| `BETTER_AUTH_SECRET` | `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `BETTER_AUTH_URL`    | The app's URL, such as `http://localhost:3000`                                |
| `ENCRYPTION_KEY`     | Same command as `BETTER_AUTH_SECRET`, with a different value                  |

`ENCRYPTION_KEY` encrypts stored connection strings and Plaid keys. Changing it makes saved data unreadable, so every environment that shares an app database must use the same value.

Apply the app database migrations and start the dev server:

```bash
pnpm db:deploy
pnpm dev
```

Open http://localhost:3000/api/health to confirm the app reaches its database, then http://localhost:3000 to create an account. Onboarding asks for a second Neon connection string: use a separate, empty database. Guava creates its tables there.

To import bank transactions, open **Integrations**, save your own Plaid client ID and secret, and click **Connect a bank**. In the Plaid sandbox, any bank accepts `user_good` / `pass_good`.

## Databases

| Database             | Schema                      | Holds                                                     | Migrations                                                   |
| -------------------- | --------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| App                  | `prisma/schema.prisma`      | Users, sessions, and each user's encrypted workspace link | `pnpm db:migrate` to create, `pnpm db:deploy` to apply       |
| Workspace (a user's) | `prisma/user/schema.prisma` | Expenses, categories, settings, Plaid keys and banks      | `pnpm user-db:migration <name>`, applied by the app on visit |

Workspace databases aren't managed by `prisma migrate`. After editing `prisma/user/schema.prisma`, `pnpm user-db:migration <name>` writes `lib/user-db/migrations/NNNN_<name>.ts`. Guava applies pending migrations when a user connects a database and on their first visit after a deploy. For steps SQL can't express, write a code migration (`{ up(client) }`) in the same folder and add it to `index.ts`.

## Testing

```bash
pnpm test:unit                 # Vitest, no database
pnpm test:db:up                # Postgres behind Neon's local proxy, in Docker
pnpm test:integration          # Vitest against the test databases
pnpm test:e2e                  # Builds the app and runs Playwright
pnpm test:db:down
```

Unit tests sit next to the code they cover (`lib/**/*.test.ts`). Integration and e2e tests live in `tests/`. Before the first e2e run, install the browser with `pnpm exec playwright install chromium`.

The test databases come from `compose.test.yaml`. Setting `NEON_LOCAL_PROXY` points the app's Neon driver at the local proxy, so the tests exercise the same code as production. `tests/env.ts` builds the test settings at runtime and passes them over `.env`, so tests never touch real databases. The database password is random, created on the first `pnpm test:db:up` in `tests/db/.password` (gitignored).

CI runs the unit, integration and e2e suites in parallel on every pull request and on pushes to `main`.

## Scripts

| Command                         | Does                                                    |
| ------------------------------- | ------------------------------------------------------- |
| `pnpm dev`                      | Starts the dev server                                   |
| `pnpm build` / `pnpm start`     | Builds / serves the production app                      |
| `pnpm lint` / `pnpm typecheck`  | Runs ESLint / TypeScript                                |
| `pnpm format`                   | Formats with Prettier (`format:check` to check only)    |
| `pnpm db:migrate`               | Creates and applies an app database migration (dev)     |
| `pnpm db:deploy`                | Applies committed app database migrations               |
| `pnpm db:studio`                | Opens Prisma Studio on the app database                 |
| `pnpm user-db:migration <name>` | Generates the next workspace database migration         |
| `pnpm -s plaid:dump`            | Prints raw Plaid data for a workspace's banks, for `jq` |

## Contributing

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org), checked by commitlint in CI. [release-please](https://github.com/googleapis/release-please) reads them to open a release pull request that bumps the version and updates `CHANGELOG.md`.

## Known gaps

- Banks sync only when the user clicks **Sync now**. There are no Plaid webhooks yet.
- There's no password reset until an email provider is added.
