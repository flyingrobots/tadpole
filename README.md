# Tadpole

Monorepo for a local SVG timeline animation tool with:

- TypeScript backend service for font loading and metadata
- Svelte + Vite frontend

## Layout

- `backend/` Node + Express service that exposes font discovery/download APIs.
- `frontend/` Lit app built with Vite (and `/api` is proxied to backend).

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

Drop your fonts into `backend/fonts/` (`.woff2`, `.woff`, `.ttf`, `.otf`) and restart backend.

## Stack note

- Vue is a **UI framework** (like a set of reusable components and state rules)
- Vite is a **build/dev tool** and dev server that Vue can run on (plus many others)
- This repo uses **Svelte** with Vite for lightweight reactive UI.

## Process

This repository follows METHOD for cycle-based engineering:

- Cycle branches use `cycles/<LEGEND>_<slug>`.
- Ship to `main` via PRs with cycle artifacts (design/witness/retro as available).
- Source-of-truth ship surfaces: `BEARING.md`, `CHANGELOG.md`, and METHOD backlog under `docs/method/`.

## GitHub

Repo target: `https://github.com/flyingrobots/tadpole`
