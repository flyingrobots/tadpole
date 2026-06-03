# Tadpole

Monorepo for a local SVG timeline animation tool with:

- TypeScript backend service for font loading and metadata
- Svelte + Vite frontend

## Layout

- `backend/` Node + Express service that exposes font discovery/download APIs.
- `frontend/` Svelte app built with Vite (and `/api` is proxied to backend).

## Setup

```bash
npm install
```

Run from the repo root.

## Run locally

```bash
npm run dev:backend
npm run dev:frontend
```

Then open:

- Frontend: `http://localhost:5173/`
- Backend health check: `http://localhost:4000/health`

Drop your fonts into `backend/fonts/` (`.woff2`, `.woff`, `.ttf`, `.otf`) and
restart backend.

## Stack note

- Svelte provides the frontend component model and reactive UI runtime.
- Vite provides the dev server, build pipeline, and local `/api` proxy for the
  Svelte app.

## Process

This repository follows METHOD for cycle-based engineering:

- Cycle branches use `cycles/<LEGEND>_<slug>`.
- Ship to `main` via PRs with cycle artifacts (design/witness/retro as
  available).
- New cycle designs start from `docs/method/design/TEMPLATE.md`.
- GitHub tasks use the `Tadpole Task` issue form and must name executable proof
  for runtime or product changes.
- Cycle-start work uses a non-draft PR: sync the merge target after
  `git fetch`, create the cycle branch, write the design doc and GitHub issue,
  stage and commit that scaffold, push the branch, open a PR, and apply the
  `work-in-progress` label to the issue.
- Remove the issue's `work-in-progress` label when implementation and witness
  evidence are ready for review.
- Source-of-truth ship surfaces: `BEARING.md`, `CHANGELOG.md`, and METHOD
  backlog under `docs/method/`.

## GitHub

Repo target: `https://github.com/flyingrobots/tadpole`
