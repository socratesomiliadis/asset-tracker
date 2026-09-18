# Asset Tracker

A small full-stack TypeScript starter with a React frontend, an Express API, and PostgreSQL provided by Docker Compose.

## Stack

- Frontend: React, Vite, TypeScript, TanStack Query, MapLibre GL, React Hook Form, Zod, Tailwind CSS, and shadcn/ui
- Backend: Express, TypeScript, Drizzle ORM, and Zod
- Database: PostgreSQL 17 via Docker Compose
- Tests: Vitest and Supertest

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Docker with Docker Compose

## Getting started

```bash
cp .env.example .env
npm install
npm run db:up
npm run dev
```

The frontend runs at [http://localhost:5173](http://localhost:5173) and proxies `/api` requests to the backend at [http://localhost:3001](http://localhost:3001).

Only PostgreSQL is containerized. The frontend and backend run directly on the host with hot reload.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run frontend and backend together |
| `npm run build` | Build both workspaces |
| `npm test` | Run the backend test suite |
| `npm run typecheck` | Type-check both workspaces |
| `npm run lint` | Lint the frontend |
| `npm run db:up` | Start PostgreSQL |
| `npm run db:down` | Stop PostgreSQL |
| `npm run db:generate` | Generate a Drizzle migration after schema changes |
| `npm run db:migrate` | Apply committed Drizzle migrations |
| `npm run db:push` | Push the current schema directly during local prototyping |

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
└── docker-compose.yml
```

To add more shadcn/ui components, run the CLI from the frontend workspace:

```bash
cd frontend
npx shadcn@latest add <component>
```
