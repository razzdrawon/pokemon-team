# Chorus Interview

## About this Interview

Welcome to Chorus Engineering's Interview project!

We're looking for engineers who are experienced, passionate, and obsessed with strong systems and high productivity.

To facilitate this, we provide an interview project that mirrors the technical stack we use here at Chorus.

**You, the interviewee, have the power to decide if this is the technology that you want to work on.**

The goal of this interview is to understand how you think and build. We care less about whether every feature is complete and more about the decisions you made along the way — your architecture choices, your tradeoffs, what you reached for and why. Show your work. A well-reasoned, thoughtfully structured solution will always stand out over one that just checks the boxes.

This is a take-home project. If it goes well, we'll invite you to a 1-hour pairing session where we'll extend your work together — so treat it like something you'd actually hand off.

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

## Prerequisites

- [nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) with Kubernetes enabled
- [Tilt](https://docs.tilt.dev/install.html) (`brew install tilt` on macOS)

## Getting Started

**The Hiring Manager will send you a link to this repository.**

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

## Prompt

Lets make a Pokémon Team builder!

We want to create a way to select 6 Pokémon to be on our team.

The UI should allow the user to:

1. View a list of the first 150 Pokémon
2. Select from the list of Pokémon
3. Submit the Pokémon that we have selected to the backend.

**It does not have to be a beautiful UX experience. We're aiming for functional.**

### Completion Criteria

Database Requirements

- There should be a Profile table
- There should be a Pokémon table
- There should be a relationship between Pokémon and Profiles.

UI Requirements

- Show a list of the first 150 Pokémon
- Show selectable Profiles
- Select a profile, and choose up to 6 Pokémon.

API Requirements

- Return pokemon
- Create Profiles
- Handle receiving Pokémon related to Profiles

## AI Use

Use of AI-assisted programming is acceptable.

If you use an LLM, add an `LLM_TRANSCRIPT.md` file to the repo with the following:

- The tool and model used (e.g. Cursor, Claude Sonnet 4.5)
- The **full conversation** — your prompts and the model's responses. Not just the generated output.

## Submission Criteria

All of your work should be located in a Github Repo.

Ensure your repo is public, and submit the URL back to the hiring manager.

### Troubleshooting

> The setup script fails on a prerequisite.

Read the output carefully — it will tell you exactly what's missing and link you to the install docs.

> Docker Desktop says Kubernetes is not enabled.

Open Docker Desktop → Settings → Kubernetes → check "Enable Kubernetes" → Apply & Restart.

> `tilt up` fails immediately.

Make sure Docker Desktop is running and Kubernetes is healthy. You can verify with:

```bash
kubectl cluster-info --context docker-desktop
```

> The requirements are confusing. I'm stuck.

Contact the hiring manager, and inform them of the situation. Be specific and clear about your concerns or issues.
