# CLAUDE.md

Guidance for Claude Code when working in this repository.

---

## Git — do not commit or push

**Never run `git commit`, `git push`, `git merge`, or `git rebase` unless I explicitly ask
in that message.**

The workflow is: you make changes → I review, run, and test them → I say "commit" or "push".
Until I say it, leave everything in the working tree.

- Completing a task or a phase is **not** a signal to commit. Neither is "the tests pass."
- Do not create branches, tags, or stashes on your own initiative.
- Do not amend, reset, revert, or otherwise rewrite history.
- `git status`, `git diff`, `git log`, and other read-only git commands are always fine — use
  them freely to show me what changed.
- If you think a commit point makes sense, say so and stop. Don't do it.

When I do ask for a commit, follow the repo's existing message style (see `git log`):
Conventional Commits, e.g. `feat: add profile team endpoint`.

## Other destructive actions — ask first

Confirm before doing anything that destroys state I might not be able to recreate:

- `tilt down`, `kubectl delete`, dropping the Postgres PVC
- Deleting or overwriting files that aren't part of the change we agreed on
- `rm -rf`, force-overwriting, `pnpm install` with lockfile changes

Reading, building, linting, testing, and starting dev servers need no confirmation.

---

## Project

Pokémon Team Builder — the Chorus engineering take-home. Pick a Profile, choose up to 6 of
the first 150 Pokémon, submit.

**The plan lives at [`docs/PLAN.md`](docs/PLAN.md)** — contracts, data model, phases, and the
tradeoffs behind each decision. Read it before starting work; keep it current if we change
direction.

### Stack

NX monorepo (pnpm workspaces) · NestJS + MikroORM + PostgreSQL · React 19 + Emotion + Vite ·
Tilt over Docker Desktop Kubernetes · Vitest + Playwright

### Layout

| Package | What it is |
|---|---|
| `packages/pokemon-contracts` | Types-only lib shared by both apps (`@interview/contracts`) |
| `packages/pokemon-user-backend` | NestJS API, runs in k8s |
| `packages/pokemon-ui` | React app, runs as a local Vite dev server |
| `packages/*-e2e` | Playwright (UI) and Jest (backend) e2e projects |

---

## Working conventions

- **Contract-first.** Types in `pokemon-contracts` are the source of truth. Backend DTOs
  `implements` the shared request interfaces so `tsc` catches drift. Never share MikroORM
  entities or `class-validator` DTO classes across the package boundary.
- **Mappers at the boundary.** Entities never serialize straight to the wire.
- **Test what carries signal** — business rules (the 6-cap, not-found paths), not controllers,
  mappers, or presentational components. See the testing table in `docs/PLAN.md`.
- **One phase at a time.** Stop at the checkpoints in the plan so I can review.

---

## Dev environment

```bash
tilt up      # postgres (k8s) + backend (k8s) + UI (local vite)
tilt down    # tear down
```

| Service | URL |
|---|---|
| Frontend | http://localhost:4200 |
| Backend | http://localhost:3000/api |
| Postgres | localhost:5432 — `admin` / `admin` / db `pokemon` |
| Tilt UI | http://localhost:10350 |

### Gotchas that will waste your time

1. **`backend: build if changed` is `TRIGGER_MODE_MANUAL`.** Click ▶ on it in the Tilt UI once
   per `tilt up`, or backend source changes silently never reach the running pod.
2. **The Postgres PVC survives `tilt down`.** A real reset needs
   `kubectl delete pvc pokemon-postgres-pvc` — ask before doing it.
3. **`packages/pokemon-user-backend/dist/` is committed.** The Dockerfile packages it rather
   than compiling, so it churns in diffs. Leave it tracked.
4. **`UnderscoreNamingStrategy`** — camelCase entity properties become snake_case columns.
5. **Always read generated migration SQL before applying it.** MikroORM may not emit `CHECK`
   constraints from decorators.

### Commands

```bash
nx run-many -t lint test build     # everything
nx test pokemon-user-backend       # backend unit tests
nx test pokemon-ui                 # UI unit tests
nx e2e pokemon-ui-e2e              # Playwright
nx show project pokemon-ui --web   # inspect NX's inferred targets
```

Migrations run from `packages/pokemon-user-backend`:
```bash
pnpm mikro-orm migration:create
pnpm mikro-orm migration:up
```

### Transcript

The interview README requires `LLM_TRANSCRIPT.md`. Regenerate it from the Claude Code session
log — re-run before submitting so it covers the whole conversation:
```bash
python3 scripts/export-transcript.py
```
`--list` shows sessions, `--session <uuid>` picks one, `--thinking` includes reasoning blocks,
`--full-tools` dumps full tool inputs instead of one-line summaries.
