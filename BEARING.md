# BEARING

## Identity

Tadpole is a local-first SVG timeline animation editor for creating
deterministic keyframe-based motion for logo/diagram targets.

## Current state

- Monorepo with a TypeScript backend service and Svelte frontend.
- Backend serves discovered font metadata from `backend/fonts`.
- Frontend includes a single-screen SVG timeline editor with tracks, keyframes,
  scrubber, and live preview.
- Users can import SVGs by upload or paste, select discovered SVG targets from
  the preview or target library, create target-bound tracks, and clear tracks
  when changing SVGs.
- Project JSON export/restore preserves sanitized SVG source, discovered target
  metadata, timeline settings, tracks, and visible missing-target warnings.
- Frontend stack is now built on Vite + Svelte and Open Props for
  palette/theming.

## Priority

1. Add runnable animation export for downstream use outside the editor.
2. Import or extract existing SVG animation timelines into editable Tadpole
   tracks after runnable export lands.
3. Improve editing ergonomics for complex SVGs, including target navigation,
   undo/redo, and denser timeline workflows.
4. Keep import/project persistence contracts covered by browser witnesses as
   the editor grows.

## Recent ship notes

- Added editor scaffolding for timeline tracks, live preview, and keyframe
  workflow.
- Enabled Open Props integration and Svelte TypeScript preprocess pipeline.
- Added repo workflow alignment: working on cycle branches intended for PR flow.
- Completed SVG timeline MVP Goals 1-6: source-rendered SVG preview,
  target-bound timeline application, preview target selection, external SVG
  import, project JSON export/restore, and rough UX hardening.
- Added checked-in browser witnesses for SVG import safety, project restore,
  and rough UX states.

## Open loops

- Goal 8 remains open: export a runnable animation, not only a Tadpole project
  JSON payload.
- Goal 9 is queued after Goal 8: infer editable Tadpole tracks from existing
  SVG animation data when possible.
- A layer tree, undo/redo, and multi-select target editing remain deferred.

## Risks

- Imported SVG and project JSON are untrusted surfaces; sanitizer and validator
  coverage must stay close to any import or export change.
- The editor is still local-first and in-memory; project JSON is persistence,
  but runnable output does not exist yet.
- Complex SVG navigation may become difficult without a layer tree or hierarchy
  browser.
