# CHANGELOG

All notable changes for Tadpole are documented here.

## Unreleased

### Added

- Repo-level cycle workflow setup and signpost scaffolding for METHOD-compatible
  delivery.
- Updated backend/frontend stack documentation to reflect current Svelte +
  Vite + Open Props architecture.
- Added preview scrubber parity and preview-pane keyframe insertion workflow in
  the timeline editor.
- Added source-rendered SVG target selection from the live preview, including
  target library, inspector, and new-track synchronization.
- Added rough external SVG import with file upload, raw paste import, target
  rediscovery, incompatible-track reconciliation, and reset-to-sample restore.
- Added Tadpole METHOD design and GitHub task templates with an explicit
  runtime-proof quality bar.
- Added a cycle-start workflow that syncs the merge target, opens a non-draft PR
  from the initial design/issue scaffold, and tracks in-flight work with a
  `work-in-progress` issue label.
- Added project-level Tadpole JSON export and restore with SVG source,
  discovered target metadata, timeline settings, tracks, project import
  validation, and visible skipped-track reporting for missing SVG targets.
- Added Goal 6 rough UX hardening for explicit empty states, selected-target
  quick track actions, SVG title-based target labels, a preview selected-target
  chip, and clear-tracks recovery.
- Added runnable animation export as self-contained HTML generated from the
  current sanitized SVG and active timeline tracks.
- Added SVG animation timeline import for a safe SMIL subset, converting
  supported `<animate>` and `<animateTransform>` nodes into editable Tadpole
  tracks while reporting unsupported CSS/Web Animations features and rejecting
  unsupported transform, timing, repeat, composition, reference, and color
  semantics, preserving one-shot versus indefinite loop intent, and restoring
  sample timeline duration on reset.
- Added the editor-shell production UX feature roadmap with Goals 10-19,
  issue-backed design docs, and task-template roadmap options.
- Added the systems-style TypeScript engineering standard, stricter compiler
  flags, and systems lint, audit, and typecheck gates for new TypeScript
  infrastructure.
- Added METHOD design/witness/retro documentation packet for the preview
  scrubber polish cycle.

## [0.1.0] - 2026-05-31

### Initial Features

- Initial local timeline editor with track/keyframe editing, playback, and live
  preview.
- Backend font discovery API for font list and stylesheet URLs.
- Open Props-based visual system and adjustable dynamic palette controls.
