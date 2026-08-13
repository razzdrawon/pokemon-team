# Pokémon Team Builder — MVP Plan

## Context

The Chorus skeleton runs locally (Tilt + NX + NestJS + MikroORM + React) with a placeholder
`SomeEntity`, one `GET /api/hello` route, and the NX welcome page. Build a team builder: list
the first 150 Pokémon, show selectable Profiles, assign up to 6 Pokémon to a Profile, submit.

**Contract-first.** Phase 1 freezes the API types; after that the backend and frontend proceed
in parallel, the UI running against mock fixtures until the real endpoints land.

---

## Key tradeoffs (the ones worth defending)

1. **Explicit `ProfilePokemon` join entity**, not MikroORM's implicit `@ManyToMany`. The pivot
   table can't hold extra columns; an explicit entity buys a `slot`, which makes the 6-cap a
   structural consequence of two constraints — no trigger, no count query.
2. **The 6-max lives in all three layers, doing different jobs.** DB = guarantee (survives bugs
   and concurrency), backend = authority (the 400), frontend = affordance. Not redundancy.
3. **Seed via migration** from committed JSON — network I/O in a migration would be flaky;
   committed JSON is deterministic and offline.
4. **Types-only contracts lib.** Shared interfaces erase at compile time; `class-validator`
   DTOs stay in the backend and `implements` them so `tsc` catches drift. ORM entities never
   cross the boundary.
5. **`PUT` full-replace for team submission.** Matches "pick 6 and submit", idempotent, no
   partial-failure states.
6. **Bare resources on success, enveloped errors on failure.** No `{ data: ... }` wrapper —
   it adds a layer of unwrapping for no benefit at this scale. Errors *are* enveloped, because
   the frontend needs a machine-readable discriminator.
7. **Pokédex number as Pokémon PK** (immutable reference data); uuid for Profile
   (user-generated). Mixed keys are intentional.

---

## Contracts — `packages/pokemon-contracts`

The whole of Phase 1. Everything downstream depends on this being right.

```ts
export const MAX_TEAM_SIZE = 6;

// ─── Resources ──────────────────────────────────────────────
export interface PokemonDto {
  id: number;            // National Dex, 1–150
  name: string;          // lowercase from the API; title-case in the UI
  spriteUrl: string;
  types: string[];       // 1–2, e.g. ['fire','flying']
  height: number;        // decimetres
  weight: number;        // hectograms
}

export interface ProfileDto {
  id: string;            // uuid
  name: string;
  createdAt: string;     // ISO 8601
  teamSize: number;      // lets the list view show fullness without loading teams
}

export interface TeamMemberDto {
  slot: number;          // 1..MAX_TEAM_SIZE
  pokemon: PokemonDto;
}

export interface ProfileWithTeamDto extends ProfileDto {
  team: TeamMemberDto[]; // ordered by slot
}

// ─── Requests ───────────────────────────────────────────────
export interface CreateProfileRequest { name: string; }
export interface SetTeamRequest { pokemonIds: number[]; }  // array order ⟹ slot

// ─── Errors ─────────────────────────────────────────────────
export type ApiErrorCode =
  | 'VALIDATION_FAILED'     // 400 — malformed path param or body shape
  | 'TEAM_SIZE_EXCEEDED'    // 400 — more than MAX_TEAM_SIZE ids
  | 'DUPLICATE_POKEMON'     // 400 — same Pokémon twice in one team
  | 'UNKNOWN_POKEMON'       // 400 — body references an id not in the pokemon table
  | 'PROFILE_NOT_FOUND'     // 404 — :id in the path doesn't exist
  | 'PROFILE_NAME_TAKEN'    // 409 — name unique constraint
  | 'INTERNAL_ERROR';       // 500 — catch-all from the filter

export interface ApiErrorBody {
  statusCode: number;
  code: ApiErrorCode;      // switch on this, never on the message
  message: string;         // human-readable, safe to display
  details?: string[];      // field-level messages from ValidationPipe
  path: string;
  timestamp: string;       // ISO 8601
}
```

> **Why a `code` field:** Nest's default error shape (`{ statusCode, message, error }`) forces
> the frontend to string-match to tell "team full" from "profile gone". A stable enum lets the
> UI branch on `TEAM_SIZE_EXCEEDED` without coupling to copy. Costs one exception filter.

> **Why `UNKNOWN_POKEMON` is a 400, not a 404** — the id arrives *inside a request body*, so it
> is a malformed request against a resource that does exist (the profile). A 404 would wrongly
> imply the addressed URL is gone.

### Endpoints

| Method | Route | Body | Success | Errors |
|---|---|---|---|---|
| `GET` | `/api/pokemon` | — | `200 PokemonDto[]`<br>(150, by dex no.) | — |
| `GET` | `/api/profiles` | — | `200 ProfileDto[]`<br>(empty array, never 404) | — |
| `POST` | `/api/profiles` | `CreateProfileRequest` | `201 ProfileDto` | `400 VALIDATION_FAILED` — name missing / empty / not a string / over 50 chars<br>`409 PROFILE_NAME_TAKEN` |
| `GET` | `/api/profiles/:id` | — | `200 ProfileWithTeamDto`<br>(empty `team[]` if none) | `400 VALIDATION_FAILED` — malformed uuid<br>`404 PROFILE_NOT_FOUND` |
| `PUT` | `/api/profiles/:id/team` | `SetTeamRequest` | `200 ProfileWithTeamDto` | `400 VALIDATION_FAILED` — malformed uuid, `pokemonIds` not an array, non-integer entries<br>`400 TEAM_SIZE_EXCEEDED`<br>`400 DUPLICATE_POKEMON`<br>`400 UNKNOWN_POKEMON`<br>`404 PROFILE_NOT_FOUND` |

Every endpoint can also return `500 INTERNAL_ERROR` from the global filter — omitted above.

### Coverage against the README

| README requirement | Satisfied by |
|---|---|
| API — "Return pokemon" | `GET /api/pokemon` |
| API — "Create Profiles" | `POST /api/profiles` |
| API — "Handle receiving Pokémon related to Profiles" | `PUT /api/profiles/:id/team` — the write path for a submitted selection; also read back via `GET /api/profiles/:id` |
| UI — "Show a list of the first 150 Pokémon" | `GET /api/pokemon` → `PokemonGrid` |
| UI — "Show selectable Profiles" | `GET /api/profiles` → `ProfilePicker` *(not in the API bullets, but the UI needs it)* |
| UI — "Select a profile, choose up to 6" | `GET /api/profiles/:id` + `PUT .../team` |
| DB — Profile / Pokémon tables + relationship | `Profile`, `Pokemon`, `ProfilePokemon` |

**Error precedence for `PUT /team`** — fixed order, so failures are deterministic and testable:

```
1. VALIDATION_FAILED    (pipes: uuid shape, body shape)
2. PROFILE_NOT_FOUND    (does the addressed resource exist?)
3. TEAM_SIZE_EXCEEDED   (cheap, no DB read)
4. DUPLICATE_POKEMON    (cheap, no DB read)
5. UNKNOWN_POKEMON      (needs a query — do it last)
```
Cheap checks before expensive ones, and the resource must exist before its contents are judged.

---

## Data model

**`Profile`** — `id` uuid PK · `name` text unique · `createdAt`

**`Pokemon`** — `id` int PK (dex no.) · `name` text unique · `spriteUrl` · `types` text[] ·
`height` int · `weight` int
> Sprite URL is derivable: `.../sprites/pokemon/{id}.png`. The list endpoint returns only
> `{name, url}`, so `types` needs the 150 detail calls — fine, it's a one-off script.

**`ProfilePokemon`** — `id` uuid PK · `profile` FK · `pokemon` FK · `slot` smallint
```sql
slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 6),
UNIQUE (profile_id, slot),        -- 6 slots, each used once ⟹ 7th row impossible
UNIQUE (profile_id, pokemon_id),  -- no duplicates on a team
FOREIGN KEY ... ON DELETE CASCADE
```

## Folder structure

```
packages/
  pokemon-contracts/src/        index · pokemon · profile · team · errors
  pokemon-user-backend/src/
    common/                     api-error.filter.ts · app-exception.ts
    modules/database/entities/  profile · pokemon · profile-pokemon · index (barrel)
    modules/pokemon/            module · controller · service · mapper
    modules/profile/            module · controller · service · mapper · dto/
    seed/                       fetch-pokeapi.ts (dev-only) · pokemon-seed.json
  pokemon-ui/src/
    api/                        client.ts · pokemon.api.ts · profiles.api.ts
    api/mock/                   fixtures.ts · mock.api.ts
    hooks/                      useAsync · usePokemon · useProfiles · useTeamSelection
    components/                 ProfilePicker/ · PokemonGrid/ · PokemonCard/ · TeamTray/
```

---

## Phase 0 — Scaffolding

**0.1** Delete `some.entity.ts` + `Migration20260506031559.ts`. Reset the volume:
```bash
tilt down && kubectl delete pvc pokemon-postgres-pvc
```
**0.2** Create `packages/pokemon-contracts` **by hand** (`src/index.ts`, `tsconfig.json`,
`project.json`) — the generator fights the no-`package.json` convention here. Add to
`tsconfig.base.json` (currently has no `paths` key):
```json
"paths": { "@interview/contracts": ["packages/pokemon-contracts/src/index.ts"] }
```
Both vite configs already register `nxViteTsPaths()` — no bundler changes.
**0.3** Dev proxy in `packages/pokemon-ui/vite.config.ts`:
```ts
proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } }
```
✅ `tilt up` clean · `curl localhost:4200/api/hello` returns the backend's JSON

## Phase 1 — Contracts (the gate)

Write the contract set above into `pokemon-contracts`. Review it standalone.
✅ Both apps import a type from `@interview/contracts` and `nx build` passes on each.

**After this phase, 2A and 2B run in parallel.**

## Phase 2A — Backend

**2A.1** Three entities + a barrel `entities/index.ts` exporting an `entities` array. Both
`db.module.ts` and `mikro-orm.config.ts` import that one barrel, so the two configs cannot
drift apart.
**2A.2** Schema migration. ⚠️ Read the SQL before applying — snake_case, the `CHECK`, both
uniques, cascades. **Hand-add the `CHECK` if MikroORM doesn't emit it.**
**2A.3** `seed/fetch-pokeapi.ts` — one-off dev script (1 list call + 150 throttled detail
calls) → commits `pokemon-seed.json` with a `{ source, fetchedAt, count, pokemon: [...] }`
header. Never runs in setup or CI.
**2A.4** Second migration inserting those 150 rows; `down()` deletes them.
**2A.5** `common/` — `AppException` (carries an `ApiErrorCode`) + a global exception filter
producing `ApiErrorBody`. Global `ValidationPipe` in `main.ts` (`whitelist`, `transform`,
`forbidNonWhitelisted`), its output mapped to `VALIDATION_FAILED` + `details[]`.
**2A.6** `modules/pokemon/` — module, controller, service, mapper (entity → DTO boundary).
**2A.7** `modules/profile/` — same, plus `dto/` classes with `class-validator` decorators
**and** `implements` the shared request types.
**2A.8** `ProfileService.setTeam()` — all rules in **one transaction** (check and write must
not be separable, or concurrent PUTs race). Replace-the-set; `slot` by array position; catch
DB constraint violations and map them to `ApiErrorBody` so raw Postgres never reaches a client.
✅ `curl` every endpoint incl. error cases. Click ▶ on `backend: build if changed` once per `tilt up`.

## Phase 2B — Frontend (parallel, mock-backed)

**2B.1** Delete `nx-welcome.tsx`; reduce `app.tsx` to a shell.
**2B.2** `api/client.ts` — thin `fetch` wrapper: base path, JSON, and on non-2xx parse
`ApiErrorBody` into a typed `ApiError` carrying `.code`.
**2B.3** `api/mock/` — fixtures (a few Pokémon, two profiles) + a mock implementation matching
the same signatures, including the error paths. Switch on `import.meta.env.VITE_USE_MOCK_API`
so the UI is buildable before the backend exists. **Delete the flag in Phase 3.**
**2B.4** `hooks/useAsync.ts` — one generic `{ data, error, loading, refetch }`. Review before
building on it; everything composes it. Then `usePokemon` / `useProfiles` as thin wrappers.
**2B.5** `useTeamSelection` — the only real client logic: selected ids, cap, toggle, `isFull`.
Pure. Comment it as a UX affordance, *not* the enforcement boundary.
**2B.6** Components (Emotion): `ProfilePicker` (list + inline create), `PokemonGrid`/
`PokemonCard` (150 sprites, selected state, disabled when full), `TeamTray` (6 slots, remove,
submit).
**2B.7** Compose: pick profile → load team → adjust → submit. Explicit loading/error states;
surface `ApiError.code` (e.g. `PROFILE_NAME_TAKEN` → inline form error).

## Phase 3 — Integration

**3.1** Flip off the mock flag, run against the real backend, fix contract drift.
**3.2** Remove the mock switch from the production path (keep fixtures for tests).
**3.3** One Playwright happy path: create profile → select 6 → submit → reload → persisted.
✅ `nx run-many -t lint test build` clean

## Phase 4 — Wrap up

`ARCHITECTURE.md` (tradeoffs + deferred) · README (seed step, manual Tilt trigger, endpoint
table) · `LLM_TRANSCRIPT.md` (required) · repo public.

---

## Testing — only what carries signal

**`ProfileService` (Vitest, mocked `EntityManager`)** — the business rules:

| Case | Expect |
|---|---|
| `setTeam` with 7 ids | `TEAM_SIZE_EXCEEDED` |
| `setTeam` with a repeated id | `DUPLICATE_POKEMON` |
| `setTeam` with id 9999 | `UNKNOWN_POKEMON` |
| `setTeam` on unknown profile | `PROFILE_NOT_FOUND` |
| `setTeam` over an existing team | **replaces**, doesn't append |
| `setTeam` with `[]` | clears the team |
| `setTeam` slot assignment | slots are 1..n in array order |
| `setTeam`, 7 ids **and** unknown profile | `PROFILE_NOT_FOUND` wins (precedence) |
| `createProfile` with a taken name | `PROFILE_NAME_TAKEN` |
| `getProfile` unknown id | `PROFILE_NOT_FOUND` |

**`useTeamSelection` (Vitest)** — cap holds at `MAX_TEAM_SIZE`, toggle-off works, no duplicates.

**Playwright** — one happy path (Phase 3.3).

**Deliberately not tested:** controllers (thin pass-throughs), mappers (trivial), presentational
components, the one-off seed script. Say so in `ARCHITECTURE.md` — the omissions are a choice,
not an oversight.

## Gotchas

1. `backend: build if changed` is **manual-trigger** — click ▶ once per `tilt up` or backend
   edits never reach the pod.
2. MikroORM may not emit the `CHECK` — verify the SQL; the DB-level cap depends on it.
3. The PVC survives `tilt down`. Delete it for a real reset.
4. `packages/pokemon-user-backend/dist/` is committed — expect diff churn.

## Deferred (note in ARCHITECTURE.md, don't build)

- `seed_metadata` table for real data versioning — the JSON header covers MVP provenance
- Runtime-configurable team size — needs dropping the DB `CHECK`. Raising 6→10 is a one-line
  migration; *lowering* it is a data migration (teams already over the limit)
- Type badges + filtering (`types` is already seeded for this)
- Pagination / search beyond the first 150
- Auth — Profiles are currently unowned
