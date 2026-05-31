# BEARING

## Identity
Tadpole is a local-first SVG timeline animation editor for creating deterministic keyframe-based motion for logo/diagram targets.

## Current state
- Monorepo with a TypeScript backend service and Svelte frontend.
- Backend serves discovered font metadata from `backend/fonts`.
- Frontend includes a timeline-first UI for tracks, keyframes, scrubber, and live preview.
- Frontend stack is now built on Vite + Svelte and Open Props for palette/theming.

## Priority
1. Finish the first usable editor workflow for importing and timing logo animation sequences.
2. Improve timeline affordances (selection/editing, keyframe ergonomics, playback control polish).
3. Add export/import and render playback formats for downstream tooling.

## Recent ship notes
- Added editor scaffolding for timeline tracks, live preview, and keyframe workflow.
- Enabled Open Props integration and Svelte TypeScript preprocess pipeline.
- Added repo workflow alignment: working on cycle branches intended for PR flow.

## Open loops
- Signoff on cycle packet #1 from the UI/UX run should be captured and merged before shipping.
- METHOD process docs are being bootstrapped in-repo this cycle.

## Risks
- Frontend/backed coupling is intentionally local-first and in-memory; persistence/export contracts are evolving with the UI.
- Some accessibility labels and keyboard interactions still need parity checks after visual refinement.
