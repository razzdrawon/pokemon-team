# Architecture

Technical reference for the system as built. For *why* things are built this way, see
[`DECISIONS.md`](DECISIONS.md). For the original plan and full contract spec, see
[`PLAN.md`](PLAN.md).

## System

```mermaid
graph LR
    Browser -->|":4200"| Vite[Vite dev server<br/>local process]
    Vite -->|"proxy /api/*"| Backend[NestJS API<br/>:3000, k8s pod]
    Backend --> DB[(Postgres<br/>k8s pod + PVC)]
```

Tilt runs all three. Frontend is a local process (fast HMR); backend and Postgres run in
Docker Desktop's Kubernetes. See `CLAUDE.md` for the dev-loop gotchas (manual backend build
trigger, PVC persistence).

CI (`.github/workflows/ci.yml`) runs `nx run-many -t lint test build` on every PR into `main`.

## Data model

```mermaid
erDiagram
    PROFILE ||--o{ PROFILE_POKEMON : has
    POKEMON ||--o{ PROFILE_POKEMON : "referenced by"

    PROFILE {
        uuid id PK
        text name UK
        timestamptz created_at
    }
    POKEMON {
        int id PK "National Dex number"
        text name UK
        text sprite_url
        text_array types
        int height
        int weight
    }
    PROFILE_POKEMON {
        uuid profile_id PK,FK
        smallint slot PK "1..6, CHECK constrained"
        int pokemon_id FK
    }
```

`PROFILE_POKEMON` has a composite primary key `(profile_id, slot)`, no surrogate id, plus:

```sql
CHECK (slot BETWEEN 1 AND 6)              -- 6 legal slots per profile
UNIQUE (profile_id, pokemon_id)           -- no duplicate Pokémon on one team
```

Why this shape: `DECISIONS.md`.

## Request flow

`PUT /api/profiles/:id/team` end to end, one transaction:

1. Vite proxy forwards to `ProfileController`
2. `ValidationPipe` checks uuid + body shape → `VALIDATION_FAILED` if either fails
3. `ProfileService.setTeam`:
   1. `findProfileOrThrow` — `PROFILE_NOT_FOUND` if missing
   2. `validateTeamSelection` — size, duplicates, unknown ids
   3. `replaceTeam` — delete + recreate `ProfilePokemon` rows
   4. `loadTeam` — reload and return `ProfileWithTeamDto`

Every thrown `AppException` — from the pipe or the service — is caught by one global
`ApiErrorFilter` and turned into the same `ApiErrorBody` shape. Error precedence table:
`PLAN.md`.

## Module structure

```mermaid
graph TD
    AppModule --> DbModule
    AppModule --> PokemonModule
    AppModule --> ProfileModule
    PokemonModule --> PokemonController --> PokemonService
    ProfileModule --> ProfileController --> ProfileService
    PokemonService -.->|EntityManager| DB[(Postgres)]
    ProfileService -.->|EntityManager| DB
```

`DbModule` registers every entity once (`autoLoadEntities` + the `entities` barrel).
`PokemonModule`/`ProfileModule` have no `MikroOrmModule.forFeature()` — adding it
double-registers the same entities and crashes on boot. Neither uses `@InjectRepository()`
anyway, so it wasn't doing anything.

## Frontend structure

```mermaid
graph TD
    App --> ProfilePicker
    App --> PokemonGrid
    App --> TeamTray
    App -->|usePokemon, useProfiles, useProfileTeam| Hooks[hooks/useAsync]
    App -->|useTeamSelection| Selection[local selection state]
    Hooks --> ApiModules[api/pokemon.api.ts · api/profiles.api.ts]
    ApiModules --> Client[api/client.ts]
    Client -->|"fetch /api/*"| Backend
```

Every data hook composes `useAsync` (`data`/`error`/`loading`/`refetch`). `refetch` isn't
awaitable — why: `DECISIONS.md`.

Submitting a team, client side:

1. `PokemonGrid` / `TeamTray` call `useTeamSelection.toggle` — local state only, no request
2. "Submit team" → `setTeam(profileId, { pokemonIds })`
3. Response (`ProfileWithTeamDto`) is written directly into local state
4. `ApiError` → message shown inline near the tray

## Contracts boundary

```mermaid
graph LR
    Contracts["@pokemon/contracts<br/>(types only)"] --> Backend[pokemon-user-backend]
    Contracts --> UI[pokemon-ui]
    Backend -.->|"DTOs implements ..."| Contracts
```

`pokemon-contracts` exports interfaces, the error envelope, and one runtime value
(`MAX_TEAM_SIZE`) — nothing else crosses the boundary. Backend DTOs `implements` the shared
request interfaces. MikroORM entities never serialize straight to the wire — mappers
(`*.mapper.ts` per module) sit at the boundary instead.

## API surface

Full endpoint table, request/response shapes, and error codes: `PLAN.md`.
