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
- Added the Goal 10 canvas-first editor shell with top menu commands,
  document-status badges, hidden-by-default secondary panels, centered SVG
  stage, bottom-pinned timeline, and browser layout witnesses.
- Added Goal 11 menu commands and document dialogs with File/Edit/View/
  Timeline/Export/Help command IDs, Open/Paste/Save/Export dialogs, View panel
  toggles, and browser keyboard/pointer witnesses.
- Added Goal 12 contextual panel host state with stable panel open facts,
  warning and dirty status badge actions, panel close focus return, responsive
  narrow-screen sheets, and browser panel-host witnesses.
- Added Goal 13 target/property timeline stacks with expandable SVG target
  rows, property-row keyframe editing, animation spans, collapsed summary dots,
  and browser stack witnesses.
- Added Goal 14 playback work-area controls with in/out markers, work-area
  loop playback, seconds/frames display switching, keyboard commands, and a
  browser work-area witness.
- Added Goal 15 SVG-native save roundtrip with a deterministic serializer,
  Save SVG dialog output, unsupported-state blocking warnings, standard SVG
  animation nodes, and a browser save/reopen witness.
- Added Goal 16 editor command model and history with runtime-backed command
  intents, reversible keyframe and track operations, Edit menu undo/redo,
  keyboard shortcuts, inspectable history facts, and command-history witnesses.
- Added Goal 17 layers panel navigation with a runtime SVG hierarchy model,
  searchable layer rows, target/parent/depth facts, track/keyframe/warning
  badges, keyboard target selection, and a layers-panel browser witness.
- Added Goal 18 Inspector editing surface with contextual document, target,
  track, keyframe, and warning modes, stable selected-state facts, keyframe
  value validation, and an inspector browser witness.
- Added Goal 19 keyboard accessibility witnesses with keyboard-driven
  import, Layers target selection, timeline keyframe creation, focused
  keyframe move/delete, playback, warning inspection, and panel focus-return
  coverage.
- Added a Dockview-like editor shell contract with left/right panel docking,
  dock-region facts, dock-aware resizing, and bottom timeline track visibility
  controls so the SVG canvas remains the center workspace.
- Added METHOD design/witness/retro documentation packet for the preview
  scrubber polish cycle.

### Fixed

- Tightened Goal 17 layer rows so warning counts resolve exact SVG target IDs,
  layer-row values are runtime validated, and the layers witness proves canvas
  selection on the SVG node itself.
- Fixed focused menu item activation so Enter and Space execute the selected
  command, and hardened playback work-area guards before reading loop bounds.
- Fixed SVG animation import for staggered safe SMIL timelines by importing
  non-zero `begin` offsets into keyframe times and supporting
  `stroke-dashoffset` as an editable, previewable, runnable, and saveable
  numeric property, including SVG-native save/reopen for partial-duration
  scalar tracks.

## [0.1.0] - 2026-05-31

### Initial Features

- Initial local timeline editor with track/keyframe editing, playback, and live
  preview.
- Backend font discovery API for font list and stylesheet URLs.
- Open Props-based visual system and adjustable dynamic palette controls.
