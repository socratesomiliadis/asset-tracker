# Asset Tracker

A small full-stack TypeScript starter with a React frontend, an Express API, and PostgreSQL provided by Docker Compose.

## Stack

- Frontend: React, Vite, TypeScript, TanStack Query, MapLibre GL, React Hook Form, Zod, Tailwind CSS, and shadcn/ui
- Backend: Express, TypeScript, Drizzle ORM, and Zod
- Database: PostgreSQL 17 via Docker Compose
- Tests: Vitest and Supertest

## Prerequisites

- Node.js 20 or newer
- pnpm 11 or newer
- Docker with Docker Compose

## Getting started

```bash
cp .env.example .env
pnpm install
pnpm db:up
pnpm dev
```

The frontend runs at [http://localhost:5173](http://localhost:5173) and proxies `/api` requests to the backend at [http://localhost:3001](http://localhost:3001).

Only PostgreSQL is containerized. The frontend and backend run directly on the host with hot reload.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run frontend and backend together |
| `pnpm build` | Build both workspaces |
| `pnpm test` | Run the backend test suite |
| `pnpm typecheck` | Type-check both workspaces |
| `pnpm lint` | Lint the frontend |
| `pnpm db:up` | Start PostgreSQL |
| `pnpm db:down` | Stop PostgreSQL |
| `pnpm db:generate` | Generate a Drizzle migration after schema changes |
| `pnpm db:migrate` | Apply committed Drizzle migrations |
| `pnpm db:seed` | Upsert all assets from `seed.json` |
| `pnpm db:push` | Push the current schema directly during local prototyping |
| `pnpm db:check` | Check generated migration consistency |
| `pnpm db:studio` | Open Drizzle Studio |

## Layout

```text
.
├── backend/
│   └── src/
│       ├── db/           # Drizzle client and schema
│       ├── app.ts        # Express application and routes
│       └── server.ts     # HTTP server entry point
├── frontend/
│   └── src/
│       ├── App.tsx       # React application shell
│       └── lib/          # shadcn utilities
├── shared/
│   └── src/              # Shared domain types and Zod schemas
└── docker-compose.yml
```

The frontend and backend both depend on the `@asset-tracker/shared` workspace package:

```ts
import { assetSchema, type Asset } from '@asset-tracker/shared'
```

To add more shadcn/ui components, run the CLI from the frontend workspace:

```bash
cd frontend
pnpm dlx shadcn@latest add <component>
```
