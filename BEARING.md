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
- Supported SMIL animation nodes from imported SVGs are converted into editable
  Tadpole tracks before sanitized SVG markup is rendered.
- Project JSON export/restore preserves sanitized SVG source, discovered target
  metadata, timeline settings, tracks, and visible missing-target warnings.
- Runnable animation export emits self-contained HTML with the sanitized SVG,
  non-muted tracks, and a compact playback runtime for downstream use.
- The default editor route now opens into a canvas-first shell with top menu
  panel commands, document-status badges, centered SVG stage, and bottom-pinned
  timeline.
- The editor shell now exposes File/Edit/View/Timeline/Export/Help menu
  commands with stable command IDs and document dialogs for Open SVG, Paste SVG,
  Save SVG, and Runnable HTML export.
- Contextual editor panels now publish stable open-state facts, warning/dirty
  status badges open the relevant panels, and panel close actions return focus
  to the invoking control.
- Timeline tracks now render as expandable target/property stacks with
  property-row keyframe controls, animation spans, and collapsed summary dots.
- Playback now includes runtime work-area in/out markers, work-area loop
  playback, seconds/frames display switching, and keyboard review commands.
- Save SVG now serializes supported editable tracks back into one SVG file
  with standard animation nodes and a save/reopen browser witness.
- Timeline keyframe and track edits now dispatch through runtime-backed editor
  command objects, with Edit menu undo/redo, platform keyboard shortcuts, and
  inspectable command-history facts.
- Frontend stack is now built on Vite + Svelte and Open Props for
  palette/theming.
- New TypeScript infrastructure must follow
  `docs/engineering/SYSTEMS_STYLE_TYPESCRIPT.md`; `npm run check` now includes
  the systems-style lint, audit, and typecheck gates.

## Priority

1. Expand import intelligence after the safe SMIL subset, including static SVG
   starter timeline suggestions and wider animation-format support.
2. Improve editing ergonomics for complex SVGs, including target navigation,
   undo/redo, and denser timeline workflows.
3. Keep import/project persistence contracts covered by browser witnesses as
   the editor grows.

## Recent ship notes

- Added editor scaffolding for timeline tracks, live preview, and keyframe
  workflow.
- Enabled Open Props integration and Svelte TypeScript preprocess pipeline.
- Added repo workflow alignment: working on cycle branches intended for PR flow.
- Completed SVG timeline MVP Goals 1-6: source-rendered SVG preview,
  target-bound timeline application, preview target selection, external SVG
  import, project JSON export/restore, and rough UX hardening.
- Completed Goal 8 runnable animation export with a self-contained HTML
  artifact and browser witness.
- Completed Goal 9 SVG animation timeline import for supported SMIL
  `<animate>`/`<animateTransform>` input with unsupported-feature warnings.
- Completed Goal 10 canvas-first editor shell as a stacked cycle on the
  editor-shell production UX design branch.
- Completed Goal 11 menu commands and document dialogs as a stacked cycle on
  the editor-shell production UX design branch.
- Completed Goal 12 contextual panels and panel host as a stacked cycle on the
  editor-shell production UX design branch.
- Completed Goal 13 target/property timeline stacks as a stacked cycle on the
  contextual-panel host branch.
- Completed Goal 14 playback work-area controls as a stacked cycle on the
  timeline-stacks branch.
- Completed Goal 15 SVG-native save roundtrip as a stacked cycle on the
  playback work-area branch.
- Completed Goal 16 editor command model and history as a stacked cycle on the
  SVG-native save branch.
- Added checked-in browser witnesses for SVG import safety, project restore,
  rough UX states, and runnable export playback.

## Open loops

- Static SVG starter timeline suggestions remain deferred after the supported
  SMIL import subset.
- Layer tree, import/revert undo, work-area SVG metadata persistence, dense
  timeline summary sampling, and multi-select target editing remain deferred.
- SVG-native save currently supports the safe importer subset only; non-linear
  easing, partial-duration tracks, unaligned translate components, and broader
  SMIL parity remain deliberate follow-on work.
- The current `frontend/src/App.svelte` monolith predates the systems-style
  standard and remains explicit migration debt while new infrastructure code is
  held to the stricter gate.

## Risks

- Imported SVG and project JSON are untrusted surfaces; sanitizer and validator
  coverage must stay close to any import or export change.
- The editor is still local-first and in-memory; project JSON is persistence,
  and runnable HTML export is a generated artifact rather than saved state.
- Complex SVG navigation may become difficult without a layer tree or hierarchy
  browser.
