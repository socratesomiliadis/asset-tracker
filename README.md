# Asset Tracker

A full-stack TypeScript app for managing 150 seeded infrastructure assets. Browse assets in a list and on a map, filter by type/status or geographic area, inspect details, and create, edit, or delete records. Forms support both map selection and typed coordinates.

## Local setup

Prerequisites: **Node.js 24**, **pnpm 11.18.0** (pinned in `package.json`), and Docker with Compose. Run commands from the repository root.

If using nvm, run `nvm install` and `nvm use` to select Node 24 from `.nvmrc`.

```bash
cp .env.example .env
pnpm install --frozen-lockfile
docker compose up -d --wait db
pnpm --filter @asset-tracker/shared build
pnpm db:migrate
pnpm dev
```

Compose waits for PostgreSQL to be healthy before migrations run. The shared build is required by the migration configuration. `pnpm dev` then watches shared code and runs both applications with hot reload.

- Client: http://localhost:5173
- API: http://localhost:3001/api/assets
- Health: http://localhost:3001/api/health

**Using the map:** Pan or zoom, then click **Search this area** to update both views. Until then, results retain their previous geographic scope, shown alongside the matching count in each panel. Click a cluster to zoom in, or an individual marker/list item to open its details. The list shows 25 rows per page; the map includes all matching assets, independently of the list page.

Only PostgreSQL is containerized. Compose uses port `5432`, with database, username, and password `asset_tracker`. Data persists in the `postgres_data` volume: `pnpm db:down` stops the container without deleting data, and `pnpm db:up` starts it again. Use `pnpm db:logs` for database logs. To use an existing PostgreSQL instance, set `DATABASE_URL` in `.env` and skip Compose.

The API seeds once from root `seed.json` before accepting requests. Later starts preserve edits and deletions, including an empty asset store. Existing nonempty stores are retained. Failed initialization rolls back and prevents startup. Apply committed migrations before starting the API; `pnpm db:seed` can run initialization separately.

The backend reads `.env`; Compose credentials are configured separately in `docker-compose.yml`. Vite proxies `/api` to port `3001`. If changing `PORT`, also set Vite's `API_PROXY_TARGET`; if changing the client origin, update `CORS_ORIGIN`.

## Stack and structure

- **Client:** React 19, Vite, TanStack Query, React Hook Form, Zod, Tailwind CSS, shadcn/ui (Base UI), and MapLibre GL JS.
- **Server:** Express 5, Drizzle ORM, node-postgres, and PostgreSQL 17.
- **Tooling:** pnpm workspaces, TypeScript, Vitest, React Testing Library, Supertest, Playwright, and Oxlint.

```text
frontend/src/
  pages/          Filters, selection, pagination, and page composition
  components/     Lists, details, forms, maps, and shared UI
  hooks/          Queries, mutations, and map camera behavior
  lib/            HTTP client, dates, markers, and map configuration
backend/src/
  routes/         Request validation and HTTP responses
  services/       Application operations and merged-update validation
  repositories/   Database queries and response mapping
  db/             Schema, connection, and startup initialization
  middleware/     Central error handling
shared/src/       Zod schemas, domain types, and constants
```

TanStack Query owns server data; React state holds UI choices. Mutations invalidate asset queries. Shared Zod schemas validate forms, API requests, and seed data, while PostgreSQL enforces required fields, enums, coordinate ranges, and inspection-after-installation ordering.

Migrations are committed in `backend/drizzle`. After schema changes, use `pnpm db:generate`, review the SQL, then run `pnpm db:migrate`. `pnpm db:check` checks migration consistency.

## Tests and checks

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

`pnpm typecheck` checks application code, tests, and tooling configurations across all workspaces, including the root Playwright tests. Backend and shared production builds exclude test files.

Default tests cover validation, HTTP responses, startup sequencing, form behavior, filters, pagination, selection, dates, and map interactions. They mock database/network/map boundaries and require no running database or public tiles.

Optional PostgreSQL integration tests exercise real CRUD queries, combined filters, geographic boundaries, and repeatable startup seeding:

```bash
TEST_DATABASE_URL=postgresql://asset_tracker:asset_tracker@localhost:5432/asset_tracker pnpm --filter backend test
```

The browser smoke test covers area search, creation with the map picker, failed-edit recovery, persistence, and deletion:

```bash
pnpm exec playwright install chromium
TEST_DATABASE_URL=postgresql://asset_tracker:asset_tracker@localhost:5432/asset_tracker pnpm test:e2e
```

Both use temporary databases that are migrated and dropped automatically; they do not modify the database named in `TEST_DATABASE_URL`. Its user needs permission to create databases. PostgreSQL suites are skipped unless that variable is set. The browser runner requires free ports `3101` and `5174` and supplies local basemap fixtures to avoid dependence on tile availability.

## API

| Method | Endpoint | Result |
| --- | --- | --- |
| GET | `/api/health` | `{ "status": "ok" }` |
| GET | `/api/assets` | `{ data: Asset[], meta: { total, limit, offset } }` |
| GET | `/api/assets/map` | Same pagination, with only `id`, `name`, `type`, `status`, `lat`, and `lng` |
| GET | `/api/assets/:id` | Full asset |
| POST | `/api/assets` | Created asset (`201`) |
| PATCH | `/api/assets/:id` | Updated asset |
| DELETE | `/api/assets/:id` | Empty response (`204`) |

Creation requires `name`, `type` (`pipe`, `hydrant`, `sensor`, `valve`), `status` (`ok`, `warning`, `critical`), numeric `lat`/`lng`, `installed_at`, `last_inspected_at`, and `notes`. Use `null` for no inspection date and `""` for empty notes. The server generates the UUID. PATCH accepts a nonempty subset of those fields.

Dates accept ISO dates (midnight UTC) or ISO datetimes with offsets; responses and the UI use UTC. Inspection cannot precede installation. Unchanged fields retain their original timestamps.

Both list endpoints accept:

- `type`, `status`, and `search` (case-insensitive name/notes matching).
- `minLat`, `maxLat`, `minLng`, `maxLng`, supplied together; boundaries are inclusive.
- `installed_from`, `installed_to`, `inspected_from`, `inspected_to`: inclusive instant bounds. Date-only bounds mean midnight UTC, not the end of that day.
- `limit` (1–100; default 50) and `offset` (default 0).
- `sort_by` (`name`, `type`, `status`, `installed_at`, `last_inspected_at`) and `sort_order` (`asc`, `desc`). Default: installation date descending, then ID ascending for stable ties.

The UI exposes type, status, and area filters; search, date filters, and sorting are API extras.

```bash
curl 'http://localhost:3001/api/assets?type=sensor&minLat=40&maxLat=43&minLng=-73&maxLng=-70&limit=25&offset=0'
```

Errors use `{ error: { code, message, details? } }`: invalid input returns `400`, missing assets `404`, oversized bodies `413`, and unexpected failures `500`.

## Decisions and deliberate limits

- **PostgreSQL without PostGIS:** Constraints, transactions, and migrations suit structured asset data. Numeric coordinates and bounding-box comparisons cover this dataset; distance or polygon queries would justify reconsidering PostGIS. Longitude filtering handles wrapped maps and antimeridian crossings.
- **Explicit area search:** A button avoids fetching on every pan. The map collects lightweight points separately from list pagination and clusters them in the browser. Fetching every matching point is suitable here, but would need viewport retrieval or server-side clustering at larger scale.
- **MapLibre and OpenFreeMap:** Interactive vector maps without an API key. Maps load lazily, use a shared customized Positron style, and retain upstream licenses in `frontend/src/lib/map-style/`. Module-load or initialization failures show a local fallback, preserving the list and typed coordinates. Public tiles remain an external dependency.
- **Offset pagination:** Simple for a small dataset and previous/next navigation. Concurrent changes can shift pages; list and count queries do not share a transaction snapshot.
- **Assignment scope:** Authentication, deployment, mobile optimization, accessibility audits, and production observability are intentionally omitted. Health checks report HTTP liveness only. The app is intended for local evaluation.
