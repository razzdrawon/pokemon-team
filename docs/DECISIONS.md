# Decisions

Full reasoning and the complete plan are in [`PLAN.md`](PLAN.md) for anyone who wants the detail. Technical structure is in
[`ARCHITECTURE.md`](ARCHITECTURE.md).

## Key decisions & tradeoffs

- **Explicit `ProfilePokemon` join entity, composite PK `(profile, slot)`.** Not MikroORM's
  implicit `@ManyToMany` — a pivot table can't hold a `slot` column. I questioned the
  surrogate uuid PK partway through the build, since no row is ever addressed by its own id;
  a composite PK covers it, and `UNIQUE(profile, pokemon)` makes the 6-cap structural.
- **6-max enforced in three layers, not one.** I weighed DB vs. backend vs. frontend
  enforcement and chose all three: DB `CHECK` = guarantee, `ProfileService` = authority (the
  actual 400), frontend = affordance (disables the 7th card). Each covers a failure mode the
  others can't.
- **`MAX_TEAM_SIZE` is the one runtime export from an otherwise types-only contracts lib.**
  An early version hardcoded the DB `CHECK`'s literal separately; I flagged the human-error
  risk, so the `CHECK` now derives from the constant directly — one place `6` is ever typed.
- **`PUT` full-replace for team submission**, not per-member mutation. Matches "pick 6 and
  submit," idempotent, no partial-failure states — delete + recreate in one transaction with
  the validation, so a failed check never touches the table.
- **Closed `ApiErrorCode` union with fixed precedence**, one global filter. I wanted explicit
  success/error contracts before building both sides in parallel: `VALIDATION_FAILED →
  PROFILE_NOT_FOUND → TEAM_SIZE_EXCEEDED → DUPLICATE_POKEMON → UNKNOWN_POKEMON`. Reviewing
  the first draft I cut an unneeded endpoint (`GET /pokemon/:id`) and pushed until the
  `UNKNOWN_POKEMON` vs. `PROFILE_NOT_FOUND` distinction made sense.
- **Seed data via a migration, from a committed JSON snapshot**, not a separate step. My
  instinct while reviewing the plan — immutable reference data deserves the same
  versioning/rollback guarantees as the schema. Deterministic, offline, no network dependency
  for anyone running `tilt up`.
- **Pokédex number as `Pokemon`'s PK; uuid for `Profile`.** Immutable reference data vs.
  user-generated data — mixed key strategy is intentional.
- **No mock API layer / `VITE_USE_MOCK_API` flag.** I dropped the planned mock-switch layer
  once the backend already existed. Kept the frontend testable independently anyway, via
  `test/fixtures.ts` for component tests instead of a runtime switch.
- **Mutation responses update state directly, not a refetch.** `setTeam`/`createProfile`
  responses go straight into local state — `useAsync`'s `refetch` returns a cleanup function,
  not a promise, so it isn't awaitable, and the response already has what's needed.
- **Not every component is fully "dumb."** I noticed `ProfilePicker` owns its create-form
  state rather than lifting it to `app.tsx` — acceptable at this scope, not worth extracting.
- **One e2e test, not a suite.** I judged create → select 6 → submit → reload → persisted
  against the live stack enough for this scope, with business rules unit tested separately.
  More integration coverage is a good next step given more time.
- **CI runs lint/test/build, not e2e.** I scoped it there — the Playwright test needs the
  live Tilt/k8s stack, and standing that up in Actions is real infra work for one test.

## Gotchas found while building

- **Vite's esbuild transform doesn't emit `emitDecoratorMetadata`**, so NestJS's implicit
  constructor injection silently resolves to `Object` and DI fails at boot with no
  compile-time warning. Fix: explicit `@Inject(Token)` on every constructor param — that's
  why it's used throughout instead of typical bare NestJS constructor injection.
- **`vitest.config.ts` silently shadowed `vite.config.ts` for test runs**, and had no
  path-alias plugin — a pre-existing skeleton gap, invisible until the first spec needed
  `@pokemon/contracts`. Fixed by adding the plugin there too.

## Pre-merge review (PR #2)

I asked for a review before merging — consistency, dead code, naming/readability, and a
security scan for anything I'd missed. That produced 10 verified findings; I picked 3 to
fix now and deferred the rest.

**Fixed:**
- **Profile-switch race** — switching profiles or double-submitting could silently write
  one profile's team onto another (`useAsync` kept stale `data` during a refetch, nothing
  blocked switching mid-submit). Fixed: clear team state on profile change, guard stale PUT
  responses against the now-selected profile, disable switching mid-submit.
- **Profile name wasn't trimmed** — whitespace-only names passed validation, padded names
  bypassed uniqueness. A gap I'd missed earlier. Fixed: trim before validation, server-side.
- **Malformed JSON returned `500 INTERNAL_ERROR`** instead of `400 VALIDATION_FAILED`.
  Fixed: map framework-level 400s to the same code the app's own pipe uses.

**Deferred (confirmed real, not blocking):**
- Migration `down()` on the composite-PK change re-adds a `NOT NULL` column with no
  default — breaks rollback once the table has any rows.
- Deleted `some_entity` migration has no `DROP TABLE` — orphans the table on non-fresh DBs.
- `MAX_TEAM_SIZE`'s DB `CHECK` can drift from the constant with no CI guard.
- `ProfilePicker`/e2e hardcode `6` instead of importing `MAX_TEAM_SIZE`.
- `useTeamSelection.isSelected` is exported but unused; `PokemonGrid` duplicates the lookup.
- `replaceTeam`'s defensive `UNKNOWN_POKEMON` throw is unreachable dead code.
- `findAll()` full-scans the join table instead of a SQL aggregate — already a documented,
  scale-aware tradeoff, not an oversight.

## Deferred

- **`seed_metadata` table for data-import versioning** — the seed JSON's own header
  (`source`, `fetchedAt`, `count`) plus migration timestamps already cover MVP provenance.
- **Runtime-configurable team size** — the DB `CHECK` is what makes the cap free; making it
  dynamic means dropping that guarantee for a rule that hasn't changed since 1996.
- **Type badges / filtering on the Pokémon grid** — `types` is already seeded, but grid
  filtering is a UI feature beyond what the prompt asked for.
- **Pagination / search beyond the first 150** — out of scope; the prompt fixes the list at 150.
- **Auth** — Profiles are unowned by design; the prompt never introduces a concept of "user."
- **UX polish** (styling, spacing, empty/loading-state affordances) — functional over
  polished per the prompt; a reasonable next step for a pairing session, not the MVP.
