# Decisions

Full reasoning and the complete plan are in [`PLAN.md`](PLAN.md) for anyone who wants the detail. Technical structure is in
[`ARCHITECTURE.md`](ARCHITECTURE.md).

## Key decisions & tradeoffs

- **Explicit `ProfilePokemon` join entity, composite PK `(profile, slot)`.** Not MikroORM's
  implicit `@ManyToMany` — that gives a pivot table with no room for `slot`. No surrogate
  id: nothing ever addresses a membership row by its own id. `UNIQUE(profile, pokemon)` +
  the composite PK makes the 6-cap structural, not just app logic. (Supersedes `PLAN.md`'s
  original surrogate-uuid design, decided mid-build.)
- **6-max enforced in three layers, not one.** DB `CHECK` = guarantee, `ProfileService` =
  authority (the actual 400), frontend = affordance (disables the 7th card). Each covers a
  failure mode the others can't — not redundant.
- **`MAX_TEAM_SIZE` is the one runtime export from an otherwise types-only contracts lib.**
  Everything else erases at compile time. The DB `CHECK` derives its expression from this
  constant, so there's exactly one place the number `6` is ever typed.
- **`PUT` full-replace for team submission**, not per-member mutation. Matches "pick 6 and
  submit," idempotent, no partial-failure states. Delete + recreate happens in one
  transaction with the validation, so a failed check never touches the table.
- **Closed `ApiErrorCode` union with fixed precedence**, one global filter. Every domain
  error becomes the same `ApiErrorBody` shape; `setTeam` checks cheapest/most-fundamental
  first (`VALIDATION_FAILED → PROFILE_NOT_FOUND → TEAM_SIZE_EXCEEDED → DUPLICATE_POKEMON →
  UNKNOWN_POKEMON`) so failures are deterministic and testable.
- **Seed data via a migration, from a committed JSON snapshot** — not a live API call at
  startup. Deterministic, offline, no network dependency for anyone running `tilt up`.
- **Pokédex number as `Pokemon`'s PK; uuid for `Profile`.** Immutable reference data vs.
  user-generated data — mixed key strategy is intentional, not inconsistent.
- **No mock API layer / `VITE_USE_MOCK_API` flag.** `api/client.ts` talks straight to the
  real backend; `test/fixtures.ts` keeps component tests independent of it. Same goal as
  `PLAN.md`'s mock design, simpler mechanism.
- **Mutation responses update state directly, not a refetch.** `setTeam`/`createProfile`
  responses are written straight into local state — `useAsync`'s `refetch` returns a cleanup
  function, not a promise, so it isn't awaitable, and the response already has everything
  needed anyway.
- **Not every component is fully "dumb."** `ProfilePicker` owns its own create-form state
  rather than lifting it to `app.tsx`. Acceptable at this scope; not worth extracting further.
- **One e2e test, not a suite.** It covers the real end-to-end workflow (create → select 6 →
  submit → reload → persisted) against the live stack; business rules are unit tested
  separately. Enough for this scope — more integration coverage is a good next step given
  more time, not a gap in what's here.
- **CI runs lint/test/build, not e2e.** The Playwright test needs the live Tilt/k8s stack;
  standing that up in Actions is real infra work for one test, not worth it at this scope.

## Gotchas found while building

- **Vite's esbuild transform doesn't emit `emitDecoratorMetadata`**, so NestJS's implicit
  constructor injection silently resolves to `Object` and DI fails at boot with no
  compile-time warning. Fix: explicit `@Inject(Token)` on every constructor param — that's
  why it's used throughout instead of typical bare NestJS constructor injection.
- **`vitest.config.ts` silently shadowed `vite.config.ts` for test runs**, and had no
  path-alias plugin — a pre-existing skeleton gap, invisible until the first spec needed
  `@pokemon/contracts`. Fixed by adding the plugin there too.

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
