# Asset Tracker

A full-stack TypeScript assignment for managing infrastructure assets. Users can browse a paginated list and map, filter by type/status or map area, inspect details, and create, edit, or delete assets. The form supports typed coordinates and selecting a location on the map. Dates and times are displayed and edited in UTC; creating an asset selects it and centers the map, including assets outside the first list page.

## Tech stack

- **Client:** React 19, Vite, TanStack Query, React Hook Form, Zod, Tailwind CSS, shadcn/ui (Base UI), and MapLibre GL JS.
- **Server:** Express 5, Drizzle ORM, node-postgres, and Zod.
- **Database:** PostgreSQL 17, running through Docker Compose.
- **Tooling:** pnpm workspaces, TypeScript, Vitest, React Testing Library, Supertest, Playwright, and Oxlint.

## Local setup

Prerequisites: Node.js 24, pnpm **11.18.0** (pinned in `package.json`), and Docker with Compose. Run commands from the repository root unless noted.

```bash
cp .env.example .env
pnpm install --frozen-lockfile
pnpm db:up
docker compose up -d --wait db
pnpm --filter @asset-tracker/shared build
pnpm db:migrate
pnpm dev
```

The Compose wait step ensures PostgreSQL is healthy before migrations run. `pnpm dev` builds the shared package, then watches shared code and runs both applications with hot reload. Before accepting HTTP requests, the API automatically initializes assets from the root `seed.json` on first startup. Apply migrations before starting the API, including when upgrading an existing database.

- Client: http://localhost:5173
- API: http://localhost:3001/api
- Health: http://localhost:3001/api/health (HTTP liveness only; does not check the database)

Vite proxies `/api` to port `3001`. If you change the backend `PORT`, set `API_PROXY_TARGET` for Vite (for example, `http://localhost:3002`); if you change the client origin, update `CORS_ORIGIN` in `.env`.

### PostgreSQL and Docker

Only PostgreSQL is containerized; client and server run on the host. Compose exposes port `5432`, using database, username, and password `asset_tracker`. The root `.env` supplies `DATABASE_URL`, `PORT`, and `CORS_ORIGIN` to the backend. Compose credentials are configured separately in `docker-compose.yml`.

```bash
pnpm db:logs       # Follow PostgreSQL logs
pnpm db:down       # Stop/remove containers; retain database volume
pnpm db:up         # Start again with existing data
```

Data persists in the named `postgres_data` volume. An existing PostgreSQL instance can be used instead by setting `DATABASE_URL` and skipping Docker startup. Ensure port `5432` is free when using Compose.

### Migrations and seeding

Committed SQL migrations live in `backend/drizzle`; the schema is in `backend/src/db/schema.ts`.

```bash
# After editing the schema:
pnpm --filter @asset-tracker/shared build
pnpm db:generate   # Generate SQL; review and commit it
pnpm db:migrate    # Apply pending migrations
pnpm db:check     # Check migration consistency
pnpm db:seed      # Optional: run the same one-time initialization without starting the API
```

Initialization imports and validates `seed.json` and writes a durable `initializations` record in one transaction. A PostgreSQL transaction lock serializes simultaneous startups. Failed imports roll back both data and the record; the API exits without listening, and the next startup can retry after the problem is corrected. An empty seed also records successful initialization.

Later startups and `pnpm db:seed` skip initialization once recorded, preserving edits and deletions even if every asset has been deleted. They no longer read the seed file or upsert its rows. Existing databases containing assets but no initialization record are adopted without modifying their data. An empty database with no record is treated as new; historical deletions before this feature cannot be inferred. To get a fresh sample dataset, use a separate new database and apply migrations before starting the API.

`pnpm db:push` is available for local prototyping; use committed migrations for reproducible setup. `pnpm db:studio` opens Drizzle Studio.

### Running client and server separately

Build shared code once, then use separate terminals:

```bash
pnpm --filter @asset-tracker/shared build
pnpm --filter @asset-tracker/shared dev  # Terminal 1: shared package watch
pnpm --filter backend dev               # Terminal 2: API
pnpm --filter frontend dev              # Terminal 3: client
```

`pnpm build` builds all workspaces. After building, `pnpm --filter backend start` runs the compiled API and `pnpm --filter frontend preview` previews the client build. The compiled API uses the same startup initialization. Keep root `seed.json` alongside the `backend` directory for a fresh database. The development proxy is not a production deployment configuration; production hosting needs `/api` routing.

## Tests and checks

```bash
pnpm test         # Shared, backend, and frontend tests
pnpm typecheck    # All workspaces
pnpm lint         # Oxlint across frontend, backend, and shared code
pnpm build        # TypeScript compilation and production client build
```

Default tests cover shared validation, API responses and invalid requests, startup sequencing and failure handling, form submission, filters, selection, pagination recovery, and coordinate handling. They mock database/network/map boundaries as needed and require neither PostgreSQL nor live map tiles.

To also run initialization and HTTP integration tests against local PostgreSQL:

```bash
TEST_DATABASE_URL=postgresql://asset_tracker:asset_tracker@localhost:5432/asset_tracker pnpm --filter backend test
```

The integration suite creates, migrates, and drops a uniquely named temporary database; it does not modify the database named in the URL. The database user needs permission to create databases. Tests cover first initialization, repeated startup, edits and partial/complete deletions, adoption of existing data, empty/invalid seeds, transaction rollback and retry, and simultaneous startup attempts. A second suite exercises the actual HTTP → service → repository → PostgreSQL flow: CRUD persistence, partial updates, combined filters and totals, pagination, inclusive geographic edges, antimeridian crossing, lightweight map responses, and unsupported dates. It uses a non-UTC database connection to verify that date-only inputs still mean midnight UTC. Without `TEST_DATABASE_URL`, both PostgreSQL suites are skipped.

### Browser smoke test

```bash
pnpm exec playwright install chromium
TEST_DATABASE_URL=postgresql://asset_tracker:asset_tracker@localhost:5432/asset_tracker pnpm test:e2e
```

The Playwright test starts an isolated API on `127.0.0.1:3101` and Vite on `127.0.0.1:5174`, creates and migrates a temporary database, seeds it through normal initialization, and drops it on shutdown. Both ports must be free; the runner refuses to reuse existing servers. It never writes to the database named by `TEST_DATABASE_URL`.

The browser runs in the New York timezone and covers cluster-to-area search, creating an older asset through the map picker, revealing it outside page one, UTC display/edit consistency, a failed-save retry that preserves the draft, persistence after reload, and confirmed deletion. MapLibre runs normally, while public basemap requests receive empty local fixtures so the test does not depend on tile-provider availability. The simulated failure intercepts one PATCH; the successful requests go to the real API and PostgreSQL.

## API overview

| Method | Endpoint | Result |
| --- | --- | --- |
| GET | `/api/health` | `{ "status": "ok" }` |
| GET | `/api/assets` | `{ data: Asset[], meta: { total, limit, offset } }` |
| GET | `/api/assets/map` | Paginated points containing only `id`, `name`, `type`, `status`, `lat`, and `lng` |
| GET | `/api/assets/:id` | Asset, or `404` |
| POST | `/api/assets` | Created asset (`201`) |
| PATCH | `/api/assets/:id` | Updated asset, or `404` |
| DELETE | `/api/assets/:id` | Empty response (`204`), or `404` |

An asset has `id` (UUID), `name`, `type` (`pipe`, `hydrant`, `sensor`, `valve`), `status` (`ok`, `warning`, `critical`), numeric `lat`/`lng`, `installed_at`, nullable `last_inspected_at`, and `notes`.

Creation requires all fields except the server-generated `id`; use `null` for no inspection date and `""` for empty notes. PATCH accepts a nonempty subset of creation fields. Dates represent instants. Inputs accept ISO dates (midnight UTC) or ISO datetimes with an offset, with years 0001–9999 and offsets within ±14:00; the resulting UTC instant must also fall within those years. Responses normalize dates to UTC ISO datetimes. The form includes time inputs with explicit UTC labels, and the detail view uses UTC regardless of the browser timezone. Unchanged fields retain their original timestamps. No conversion or migration of existing stored timestamps is needed.

List query parameters:

- `type`, `status`, and `search` (case-insensitive matching against name or notes).
- `installed_from`, `installed_to`, `inspected_from`, `inspected_to` (inclusive instant bounds; date-only bounds mean midnight UTC, and reversed ranges return `400`). To include an entire end day, use its final instant, such as `2026-01-10T23:59:59.999Z`.
- `minLat`, `maxLat`, `minLng`, `maxLng` (all four required together).
- `limit` (1–100; default 50), `offset` (nonnegative; default 0).
- `sort_by`: `name`, `type`, `status`, `installed_at`, or `last_inspected_at`; `sort_order`: `asc` or `desc`. Defaults to installation date descending, with ID ascending as a stable tie-breaker.

Both list endpoints share filtering, sorting, and pagination. The map endpoint omits notes and dates; selecting a marker outside the list page loads its full details from `/api/assets/:id`. The UI uses 25 rows per page and exposes type, status, and area filters; the API additionally supports search, date filters, and sorting.

```bash
curl 'http://localhost:3001/api/assets?type=sensor&minLat=40&maxLat=43&minLng=-73&maxLng=-70&limit=25&offset=0'
```

Errors use `{ error: { code, message, details? } }`. Invalid inputs return `400`, missing assets `404`, oversized request bodies `413`, and unexpected failures `500`.

## Architecture and validation

```text
frontend/src/
  pages/          Page composition, filters, selection, pagination
  components/     Asset views, forms, drawers, maps, shared UI
  hooks/          TanStack Query reads and mutations, map camera behavior
  lib/            HTTP client, UTC date conversion, marker builders, map configuration
backend/src/
  routes/         Request validation and HTTP responses
  services/       Application operations; coordinates list/count queries
  repositories/   Drizzle queries and database-to-API mapping
  db/             Connection pool, schema, seed script
  middleware/     Central error handling
shared/src/       Zod schemas, inferred domain types, shared constants
```

The client HTTP module centralizes requests and error handling. Query keys include filters and pagination; successful mutations invalidate asset queries. React state holds UI choices, while TanStack Query owns server data. Reusable form fields, drawer layout, status badges, and map configuration keep presentation consistent.

Shared Zod schemas drive form validation, API validation, and seed validation. They reject unknown fields, invalid UUIDs/enums/dates, out-of-range coordinates, empty updates, and incomplete bounding boxes or reversed latitude bounds. Query strings are coerced to numeric values where appropriate. PostgreSQL adds required columns, enums, coordinate checks, and an inspection-after-installation constraint.

Date ordering is validated on creation and against merged stored values on partial updates, with inspection-field errors. The database constraint remains a final guard. TypeScript response types do not provide runtime validation of fetched JSON.

## Technical decisions and trade-offs

- **PostgreSQL:** The data is structured and benefits from constraints, transactional writes, predictable SQL filtering, and versioned migrations. PostgreSQL also leaves room for richer queries without changing the storage model. It requires a running database, but Compose makes the assignment setup repeatable.
- **No PostGIS intentionally:** Assets are stored as points and the required spatial operation is rectangular viewport filtering. Numeric coordinates and ordinary SQL comparisons cover that scope without extension setup or geometry conversions. Radius searches, distances, polygons, or larger spatial workloads would justify revisiting PostGIS.
- **Bounding-box filtering:** “Search this area” maps directly to inclusive latitude/longitude comparisons, combined with other filters before pagination and counting. An explicit search button avoids requests on every pan. The list uses 25-row pages; the map independently collects lightweight points through API responses bounded to 100 assets each, deduplicates IDs, and creates DOM markers only within the viewport. Cluster clicks expose the same area-search action as manual panning and zooming.
- **Geospatial limits:** Coordinates use six decimal places. The client clamps latitude bounds; longitude bounds are normalized across wrapped world copies, and crossing intervals query both sides of the antimeridian. Only viewports spanning at least a full world use every longitude. There is no spatial index; existing indexes cover type, status, and installation date.
- **MapLibre:** It provides an open-source interactive map with camera controls, markers, and click coordinates without tying rendering to a proprietary service. The vector basemap uses OpenFreeMap tiles and a locally maintained Positron style with softer water, park, and building colors; no API key is needed. Both maps share this style. Upstream style licenses are in `frontend/src/lib/map-style/`, and MapLibre displays the source attribution. MapLibre and its explicit worker configuration load through lazy map components, allowing the list to render without waiting for the map bundle. The renderer still adds bundle weight, and public tile availability remains an external dependency.
- **Offset pagination:** It is sufficient for this small assignment dataset and the previous/next UI. It keeps totals and page recovery straightforward. Stable sorting handles ties, but deep offsets become expensive and concurrent writes can shift rows between pages. List and count also run separately, without a shared transaction snapshot.
- **Small layered backend:** Routes, services, and repositories separate HTTP concerns from queries. Some service methods are thin pass-throughs; the project avoids additional abstractions until they serve a concrete need.

## What I would improve with more time

1. Extend browser scenarios to provider failures and keyboard interaction; keep the existing smoke test focused on the core workflow.
2. Profile queries before adding indexes, cursor pagination, or PostGIS. For larger datasets, use viewport-based retrieval or server-side clustering instead of collecting every point; lightweight responses and viewport marker rendering do not remove that network scaling limit.
3. Profile the remaining map bundle and review accessibility, mobile interactions, and tile-provider configuration for deployment.
4. Add authentication/authorization, deployment configuration, database readiness checks, and structured operational logging before exposing the application publicly.
