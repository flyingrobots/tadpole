# Tadpole

Tadpole is a local-first SVG timeline animation editor. It is aimed at the
practical job of opening an SVG, discovering editable targets inside it, editing
target-bound keyframes on a timeline, and saving the result back into inspectable
artifacts.

The current editor is intentionally rough but functional: the SVG stays at the
center of the workspace, panels expose editing context, and the timeline owns
track, keyframe, playback, and work-area behavior.

## What Works Today

- Import SVGs by file upload or raw paste.
- Parse a safe subset of existing SVG SMIL animations into editable tracks.
- Render sanitized SVG inline in the editor canvas.
- Select SVG targets from the canvas, Layers panel, or timeline.
- Add, move, edit, mute, duplicate, reset, and delete target-bound timeline
  tracks and keyframes.
- Use a bottom-pinned timeline with target/property stacks, animation spans,
  keyframe markers, collapsed summaries, and playback controls.
- Set playback work-area in/out markers and loop the work area.
- Inspect document, target, track, keyframe, and warning state through the
  Inspector panel.
- Use File/Edit/View/Timeline/Export/Help menu commands with stable command IDs.
- Undo and redo timeline edits through the editor command model.
- Export and restore Tadpole project JSON.
- Export runnable self-contained HTML for playback outside Tadpole.
- Save supported editable animation tracks back into one SVG file.
- Navigate the core editing path with keyboard-focused witness coverage.

## Important Limits

Tadpole is not a full SVG animation implementation yet.

- SVG-native save supports the current safe importer/editor subset.
- Unsupported SMIL features, CSS animations, Web Animations, and several
  non-linear or partial-duration cases surface warnings instead of editable
  tracks.
- Static SVG starter timeline suggestions are heuristic starting points, not
  imported source truth.
- Project JSON is the working persistence format; generated HTML and SVG exports
  are artifacts.
- The frontend still has a large `App.svelte` surface that predates the newer
  systems-style TypeScript standard.

## Repository Layout

```text
backend/       Express service for font discovery and metadata
frontend/      Svelte + Vite editor application
docs/          Design docs, METHOD artifacts, witnesses, retros, standards
scripts/       Repo validation and systems-style audit helpers
```

The frontend uses Vite and Svelte. The backend exists mainly to serve font
metadata and downloaded font files from `backend/fonts/`.

## Requirements

- Node.js compatible with the checked-in dependency set.
- npm, using the package manager declared in `package.json`.
- Local ports `4000` and `5173` available for the default dev stack.

Install dependencies from the repo root:

```bash
npm install
```

## Run Locally

Start both workspaces from the repo root:

```bash
npm run dev
```

Open the editor:

```text
http://localhost:5173/
```

Useful local endpoints:

- Frontend: `http://localhost:5173/`
- Backend health check: `http://localhost:4000/health`

If startup fails with `EADDRINUSE` on port `4000`, another backend process is
already listening there. Stop that process before running the default dev stack;
the Vite proxy expects the backend at `http://localhost:4000`.

To run workspaces separately:

```bash
npm run dev:backend
npm run dev:frontend
```

To test local fonts, put `.woff2`, `.woff`, `.ttf`, or `.otf` files in
`backend/fonts/` and restart the backend.

## Validate

Run the default quality gate:

```bash
npm run check
npm run build
npm audit --audit-level=moderate
```

`npm run check` includes:

- frontend Svelte checks
- systems-style ESLint checks
- systems-style audit
- backend TypeScript typecheck
- frontend systems TypeScript typecheck
- systems typecheck coverage verification

Browser witnesses expect the dev server to be running. Example:

```bash
npm run dev
TADPOLE_APP_URL=http://localhost:5173/ node docs/method/witness/editor-shell-production-ux/keyboard-a11y-smoke.mjs
```

Representative witnesses:

- `docs/method/witness/svg-timeline-mvp/import-gate-smoke.mjs`
- `docs/method/witness/svg-timeline-mvp/project-export-smoke.mjs`
- `docs/method/witness/svg-timeline-mvp/animation-import-smoke.mjs`
- `docs/method/witness/svg-timeline-mvp/runnable-export-smoke.mjs`
- `docs/method/witness/editor-shell-production-ux/menu-dialogs-smoke.mjs`
- `docs/method/witness/editor-shell-production-ux/timeline-stacks-smoke.mjs`
- `docs/method/witness/editor-shell-production-ux/work-area-smoke.mjs`
- `docs/method/witness/editor-shell-production-ux/svg-save-roundtrip-smoke.mjs`
- `docs/method/witness/editor-shell-production-ux/command-history-smoke.mjs`
- `docs/method/witness/editor-shell-production-ux/layers-panel-smoke.mjs`
- `docs/method/witness/editor-shell-production-ux/inspector-smoke.mjs`
- `docs/method/witness/editor-shell-production-ux/keyboard-a11y-smoke.mjs`

Core witnesses that do not require the browser include:

- `docs/method/witness/editor-shell-production-ux/command-history-core.ts`
- `docs/method/witness/editor-shell-production-ux/svg-layer-tree-core.ts`
- `docs/method/witness/editor-shell-production-ux/svg-native-save-core.ts`

## Engineering Standard

New TypeScript infrastructure follows
`docs/engineering/SYSTEMS_STYLE_TYPESCRIPT.md`.

The short version:

- Runtime truth wins.
- Domain values with invariants need runtime-backed construction.
- Boundary input must be parsed or validated before becoming trusted state.
- Core logic should stay browser-portable.
- Host-specific APIs belong behind adapters.
- No `any`, no casual `unknown`, no type assertions as contracts.
- Tests and witnesses prove behavior; docs explain it.

The current application still contains older code. New infrastructure should
trend toward the standard without hiding existing migration debt.

## METHOD Workflow

This repository uses METHOD-style cycle work.

- Cycle branches use `cycles/<LEGEND>_<slug>`.
- New cycle designs start from `docs/method/design/TEMPLATE.md`.
- GitHub tasks use the `Tadpole Task` issue form.
- Runtime or product work must name executable proof, not only documentation.
- Cycle-start work uses a non-draft PR.
- Apply `work-in-progress` to the linked issue while implementation is in
  flight.
- Remove `work-in-progress` when implementation and witness evidence are ready
  for review.

Cycle source-of-truth surfaces:

- `BEARING.md`
- `CHANGELOG.md`
- `docs/method/design/`
- `docs/method/witness/`
- `docs/method/retro/`

## Roadmap Direction

The near-term direction is to keep pushing from "rough but works" toward an
editor that can handle real SVG production workflows:

- richer import intelligence for existing SVG animation timelines
- denser timeline editing for complex artwork
- broader SVG-native save parity
- deeper batch target/keyframe workflows
- curve/tangent editing
- stronger decomposition of the current frontend monolith

## GitHub

Repository: `https://github.com/flyingrobots/tadpole`
