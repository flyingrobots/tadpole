---
title: "G18-001 - Inspector Editing Surface"
lane: "design"
goal: "Goal 18"
issue: "https://github.com/flyingrobots/tadpole/issues/40"
pr: "https://github.com/flyingrobots/tadpole/pull/50"
status: "active"
owners:
  - "@flyingrobots"
created: "2026-06-03"
updated: "2026-06-05"
---

<!-- markdownlint-disable-next-line MD025 -->
# G18-001 - Inspector Editing Surface

## Linked Issue

- [G18-001 - Inspector Editing Surface](https://github.com/flyingrobots/tadpole/issues/40)

## Roadmap Gate

- Goal 18: Inspector Editing Surface

## Cycle Start

- [x] `git fetch origin` completed.
- [x] Local merge target branch synced to `origin/main` by regular merge.
- [x] Cycle branch checked out.
- [x] GitHub issue created or reused.
- [x] `work-in-progress` label applied when implementation starts.
- [x] Design doc, issue link, and initial cycle scaffold staged and committed.
- [x] Branch pushed and non-draft PR opened to the merge target.

## Decision Summary

Goal 18 adds contextual Inspector modes for document, target, track, keyframe,
and warning selection. Inspector edits provide precision controls without
making common timeline timing edits depend on the Inspector.

## Sponsored Human

A user wants precise facts and controls for the selected thing so that they can
edit values confidently, without searching global controls.

## Sponsored Agent

An agent needs selected-state facts and inspector mode selectors so it can
verify contextual editing without guessing from panel text.

## Hill

By the end of this cycle, opening the Inspector after selecting a target,
track, keyframe, or warning shows the corresponding Inspector mode, and
keyframe edits update preview/export state, proven by a browser witness.

## Current Truth

- Current `main` includes a thin drawer Inspector panel with selected target
  and track facts, but it does not expose a stable mode contract or keyframe
  editor. Evidence:
  [`frontend/src/App.svelte#5032:870f3c136e9a800c6ad12a4ad32ffbaa521eeef3`](https://github.com/flyingrobots/tadpole/blob/870f3c136e9a800c6ad12a4ad32ffbaa521eeef3/frontend/src/App.svelte#L5032).
- Current `main` also includes an always-visible timeline-side selection
  inspector with target, track, and keyframe controls, so precision editing
  exists but is not the contextual Inspector panel surface. Evidence:
  [`frontend/src/App.svelte#5754:870f3c136e9a800c6ad12a4ad32ffbaa521eeef3`](https://github.com/flyingrobots/tadpole/blob/870f3c136e9a800c6ad12a4ad32ffbaa521eeef3/frontend/src/App.svelte#L5754).
- Current timeline property rows still own direct keyframe editing, preserving
  the invariant that timing edits do not require the Inspector. Evidence:
  [`frontend/src/App.svelte#5677:870f3c136e9a800c6ad12a4ad32ffbaa521eeef3`](https://github.com/flyingrobots/tadpole/blob/870f3c136e9a800c6ad12a4ad32ffbaa521eeef3/frontend/src/App.svelte#L5677).
- Parent design: Inspector Model starts in
  [`docs/method/design/editor-shell-production-ux/design.md#1046:870f3c136e9a800c6ad12a4ad32ffbaa521eeef3`](https://github.com/flyingrobots/tadpole/blob/870f3c136e9a800c6ad12a4ad32ffbaa521eeef3/docs/method/design/editor-shell-production-ux/design.md#L1046).
- Mockup:
  [`docs/method/design/editor-shell-production-ux/mockups/panels-inspector-layers.svg`](../mockups/panels-inspector-layers.svg).

## Problem

Global controls do not scale as timeline and panel complexity grows. The editor
needs selection-driven precision controls with clear mode boundaries.

## Scope

This cycle includes:

- Inspector mode mapping from selection state.
- Document facts mode.
- Target facts and track creation actions.
- Track facts and defaults.
- Keyframe time/value/easing/source controls.
- Warning facts mode.

## Non-Goals

This cycle does not include:

- Curve tangent editing.
- Layer hierarchy editing.
- Serializer warning repair workflows.

## User Experience / Product Shape

Inspector is opened from the View menu and follows the current selection while
open. It can be closed; common timing edits still happen directly in the
timeline.

```mermaid
stateDiagram-v2
  [*] --> DocumentMode
  DocumentMode --> TargetMode: target selected
  TargetMode --> TrackMode: track selected
  TrackMode --> KeyframeMode: keyframe selected
  KeyframeMode --> WarningMode: warning selected
  WarningMode --> DocumentMode: clear selection
```

## Runtime / API Contract

Inspector modes:

- `document`
- `target`
- `track`
- `keyframe`
- `warning`

Each mode exposes selected IDs and validation state through stable selectors.

## Data / State / Schema Model

Inspector derives from selection and timeline state. Edits dispatch existing or
future command handlers. Invalid values do not enter timeline state.

## Security / Trust Boundary

Inspector text derived from SVG attributes is escaped. Value edits use existing
property validation before preview or export state updates.

## Accessibility Posture

| Surface | Requirement |
| ------- | ----------- |
| Inspector | Labelled complementary panel. |
| Mode | Heading names selected object. |
| Inputs | Labels include property/time/value. |
| Errors | Validation errors are textual and associated with fields. |

## Localization / Directionality Posture

Inspector labels and validation strings are visible. Controls must tolerate
long translated labels.

## Agent Inspectability

Browser witnesses inspect mode, selected IDs, field values, validation errors,
and preview/export updates.

## Linked Invariants

- Timeline edits must remain deterministic.
- Invalid keyframe values cannot enter project state.
- Browser witnesses prove user-visible editor workflows.

## Alternatives Considered

### Option A: Keep All Controls Inline

Pros:

- Fewer panels.

Cons:

- Timeline rows become too dense.

### Option B: Contextual Inspector

Pros:

- Keeps timeline focused on timing.
- Provides precise editing when needed.

Cons:

- Requires mode and focus management.

## Decision

Choose Option B. Inspector is contextual precision UI, not mandatory timing UI.

## Implementation Slices

- [x] Slice 1: Add inspector mode derivation.
- [x] Slice 2: Render document and target modes.
- [x] Slice 3: Render track mode and track actions.
- [x] Slice 4: Render keyframe editor with validation.
- [x] Slice 5: Add warning mode and browser witness.

## Tests To Write First

- [x] Browser witness: selecting a target opens target mode.
- [x] Browser witness: selecting keyframe opens keyframe mode.
- [x] Browser witness: keyframe value edit updates preview/export state.

## Proof Matrix

| Claim | Required proof |
| ----- | -------------- |
| Inspector follows selection | Browser mode assertions |
| Keyframe edits are valid | Browser preview/export assertion |
| Invalid values are blocked | Validation assertion |

## Acceptance Criteria

- [x] Inspector modes match selection state.
- [x] Keyframe edits update timeline and preview.
- [x] Invalid values are rejected or warned.
- [x] Timeline remains usable with Inspector closed.
- [x] Local validation is green.

## Validation Plan

```bash
npm run check
npm run build
npm audit --audit-level=moderate
node docs/method/witness/editor-shell-production-ux/inspector-smoke.mjs
node docs/method/witness/editor-shell-production-ux/menu-dialogs-smoke.mjs
node docs/method/witness/editor-shell-production-ux/panel-host-smoke.mjs
node docs/method/witness/editor-shell-production-ux/timeline-stacks-smoke.mjs
node docs/method/witness/editor-shell-production-ux/work-area-smoke.mjs
node docs/method/witness/editor-shell-production-ux/layers-panel-smoke.mjs
node docs/method/witness/editor-shell-production-ux/command-history-smoke.mjs
node docs/method/witness/editor-shell-production-ux/svg-save-roundtrip-smoke.mjs
node docs/method/witness/svg-timeline-mvp/import-gate-smoke.mjs
node docs/method/witness/svg-timeline-mvp/project-export-smoke.mjs
node docs/method/witness/svg-timeline-mvp/animation-import-smoke.mjs
node docs/method/witness/svg-timeline-mvp/runnable-export-smoke.mjs
node docs/method/witness/svg-timeline-mvp/rough-ux-hardening-smoke.mjs
npx tsx docs/method/witness/editor-shell-production-ux/command-history-core.ts
npx tsx docs/method/witness/editor-shell-production-ux/svg-native-save-core.ts
npx tsx docs/method/witness/editor-shell-production-ux/svg-layer-tree-core.ts
npx markdownlint-cli2 CHANGELOG.md BEARING.md docs/method/design/editor-shell-production-ux/features/inspector-editing-surface.md
git diff --check
```

## Playback / Witness

Run `docs/method/witness/editor-shell-production-ux/inspector-smoke.mjs`
against the dev app. It imports an SVG with one supported animation and one
unsupported animation warning, opens the Inspector, selects a target without a
track, selects a keyframe, edits a valid and invalid value, closes the
Inspector, proves timeline selection still works, then reopens the Inspector in
warning mode.

## Open Questions

- @flyingrobots: Should Inspector auto-open on target selection or only when
  enabled? Default to contextual open on desktop and a panel sheet on narrow
  screens.

## Follow-On Issues

- Curves mode value-shape editing.

## Retrospective

What changed from the design:

- Inspector mode is contextual once the panel is opened through the View menu.
  Selection does not force-open the panel, preserving the hidden-by-default
  secondary-panel invariant.
- Warning mode reuses the Warnings panel row selection, so warnings can be
  inspected without inventing a second warning list.

What the tests proved:

- The browser witness proves `document`/`target`/`track`/`keyframe`/`warning`
  mode facts, selected IDs, keyframe value editing, invalid-value rejection,
  closed-Inspector timeline usability, and warning inspection.
- Regression witnesses prove the new panel does not break menu/dialogs, panel
  host focus, timeline stacks, work-area controls, layers navigation, command
  history, SVG save, import, project restore, runnable export, or rough UX
  flows.

What remains open:

- Curve/tangent editing and serializer warning repair remain follow-on work.

PR:

- [#50](https://github.com/flyingrobots/tadpole/pull/50)
