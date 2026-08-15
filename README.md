# Pokémon Team Builder

A Pokémon team builder: pick a Profile, choose up to 6 of the first 150 Pokémon, submit.
Originally built as Chorus Engineering's take-home interview project; this README now
documents the finished app for anyone running or reviewing it.

## Tech Stack

- React UI
- Emotion CSS
- Typescript
- Node/NestJS Backend
- NX Monorepo
- Github Actions CI
- PostgreSQL Database
- Vite
- Tilt
- Docker Desktop + Kubernetes

## Documentation

- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — technical map: diagrams, data model, request flow
- **[docs/DECISIONS.md](docs/DECISIONS.md)** — why: tradeoffs, findings, gotchas hit while building
- **[docs/PLAN.md](docs/PLAN.md)** — the internal working plan this was built from
- **[LLM_TRANSCRIPT.md](LLM_TRANSCRIPT.md)** — full AI-assisted session transcript

Start with `DECISIONS.md` for the reasoning behind the build; `ARCHITECTURE.md` for how it's
put together.

## Prerequisites

- [nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) with Kubernetes enabled
- [Tilt](https://docs.tilt.dev/install.html) (`brew install tilt` on macOS)

## Getting Started

Clone this repository, then run the setup script:

```bash
bash scripts/setup.sh
```

This will verify all prerequisites, install dependencies, and tell you exactly what to do next.

Once setup is complete, start the dev environment:

```bash
tilt up
```

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:4200 |
| Backend  | http://localhost:3000/api |
| Postgres | localhost:5432 |

Stop everything when you're done:

```bash
tilt down
```

> **Note:** the `backend: build if changed` resource in the Tilt UI is manual-trigger — click
> ▶ on it once per `tilt up`, or backend changes won't reach the running pod. See
> [`CLAUDE.md`](CLAUDE.md) for this and other dev-loop gotchas.

### Connecting to the Database

Use whatever tool you'd like to connect to the database.

[We recommend DataGrip.](https://www.jetbrains.com/datagrip/)

| Field    | Value     |
|----------|-----------|
| Host     | localhost |
| Port     | 5432      |
| Database | pokemon   |
| Username | admin     |
| Password | admin     |

### Trying the API

Import [`postman/pokemon-team-builder.postman_collection.json`](postman/pokemon-team-builder.postman_collection.json)
into Postman for every endpoint plus the documented error cases. `baseUrl` defaults to
`localhost:3000/api`.

### Running the tests

```bash
nx run-many -t lint test build     # unit tests + build, backend and frontend
nx e2e pokemon-ui-e2e -- --project=chromium   # e2e, needs tilt up running
```

## Troubleshooting

> The setup script fails on a prerequisite.

Read the output carefully — it will tell you exactly what's missing and link you to the install docs.

> Docker Desktop says Kubernetes is not enabled.

Open Docker Desktop → Settings → Kubernetes → check "Enable Kubernetes" → Apply & Restart.

> `tilt up` fails immediately.

Make sure Docker Desktop is running and Kubernetes is healthy. You can verify with:

```bash
kubectl cluster-info --context docker-desktop
```

> The backend won't pick up my changes / new database migrations.

Click ▶ on `backend: build if changed` in the Tilt UI, and check `pnpm mikro-orm migration:up`
ran from `packages/pokemon-user-backend`. See `CLAUDE.md`'s gotchas list.
