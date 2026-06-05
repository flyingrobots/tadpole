---
title: "G17-001 - Layers Panel Navigation"
lane: "design"
goal: "Goal 17"
issue: "https://github.com/flyingrobots/tadpole/issues/39"
pr: "https://github.com/flyingrobots/tadpole/pull/49"
status: "active"
owners:
  - "@flyingrobots"
created: "2026-06-03"
updated: "2026-06-04"
---

<!-- markdownlint-disable-next-line MD025 -->
# G17-001 - Layers Panel Navigation

## Linked Issue

- [G17-001 - Layers Panel Navigation](https://github.com/flyingrobots/tadpole/issues/39)

## Roadmap Gate

- Goal 17: Layers Panel Navigation

## Cycle Start

- [x] `git fetch origin` completed.
- [x] Local merge target branch synced to `origin/main` by regular merge.
- [x] Cycle branch checked out.
- [x] GitHub issue created.
- [x] `work-in-progress` label applied when implementation starts.
- [x] Design doc, issue link, and initial cycle scaffold staged and committed.
- [x] Branch pushed and non-draft PR opened to the merge target.

## Decision Summary

Goal 17 adds a Layers panel that exposes the SVG hierarchy, target IDs, labels,
kinds, track counts, warning counts, and keyboard selection path for complex
SVG documents.

## Sponsored Human

A user wants to select and inspect SVG targets from a structured layer list so
that small or overlapping canvas elements are still easy to animate.

## Sponsored Agent

An agent needs a machine-readable layer tree and synchronized selection facts so
it can verify target navigation without pointer-only interactions.

## Hill

By the end of this cycle, a user can open Layers, search SVG targets, select a
row, and see canvas/timeline selection synchronize, proven by a browser witness.

## Current Truth

- Tadpole discovers SVG targets from sanitized SVG markup in
  [`frontend/src/App.svelte#522:6b7123c395af5505dbeb6ba90d05d80c4f23e348`](https://github.com/flyingrobots/tadpole/blob/6b7123c395af5505dbeb6ba90d05d80c4f23e348/frontend/src/App.svelte#L522),
  then keeps the reactive target registry current in
  [`frontend/src/App.svelte#1759:6b7123c395af5505dbeb6ba90d05d80c4f23e348`](https://github.com/flyingrobots/tadpole/blob/6b7123c395af5505dbeb6ba90d05d80c4f23e348/frontend/src/App.svelte#L1759).
- Tadpole already supports canvas target selection: preview application marks
  the selected SVG node in
  [`frontend/src/App.svelte#3528:6b7123c395af5505dbeb6ba90d05d80c4f23e348`](https://github.com/flyingrobots/tadpole/blob/6b7123c395af5505dbeb6ba90d05d80c4f23e348/frontend/src/App.svelte#L3528),
  pointer selection is handled in
  [`frontend/src/App.svelte#3703:6b7123c395af5505dbeb6ba90d05d80c4f23e348`](https://github.com/flyingrobots/tadpole/blob/6b7123c395af5505dbeb6ba90d05d80c4f23e348/frontend/src/App.svelte#L3703),
  and the rendered canvas surface is exposed by
  [`frontend/src/App.svelte#5837:6b7123c395af5505dbeb6ba90d05d80c4f23e348`](https://github.com/flyingrobots/tadpole/blob/6b7123c395af5505dbeb6ba90d05d80c4f23e348/frontend/src/App.svelte#L5837).
- Existing browser coverage proves selected-target feedback in
  [`docs/method/witness/svg-timeline-mvp/rough-ux-hardening-smoke.mjs#109:6b7123c395af5505dbeb6ba90d05d80c4f23e348`](https://github.com/flyingrobots/tadpole/blob/6b7123c395af5505dbeb6ba90d05d80c4f23e348/docs/method/witness/svg-timeline-mvp/rough-ux-hardening-smoke.mjs#L109).
- Goal 17 implements existing issue
  [#22](https://github.com/flyingrobots/tadpole/issues/22), which tracked layer
  tree navigation as a cool idea.
- Parent design: the Layers Panel Model starts in
  [`docs/method/design/editor-shell-production-ux/design.md#1059:6b7123c395af5505dbeb6ba90d05d80c4f23e348`](https://github.com/flyingrobots/tadpole/blob/6b7123c395af5505dbeb6ba90d05d80c4f23e348/docs/method/design/editor-shell-production-ux/design.md#L1059).

## Problem

Canvas-only target selection does not scale to dense SVGs and is not sufficient
as the non-pointer path for target selection.

## Scope

This cycle includes:

- SVG hierarchy view model.
- Layers panel rows with target facts.
- Selection sync between layer, canvas, and timeline.
- Search/filter by ID, name, and kind.
- Track/warning badges.

## Non-Goals

This cycle does not include:

- Reparenting SVG nodes.
- Editing SVG hierarchy.
- Multi-select targets.
- Saving layer visibility changes.

## User Experience / Product Shape

The Layers panel opens from View or contextual state. It lists SVG hierarchy,
supports search, and selects/focuses targets.

```mermaid
flowchart LR
  SvgDom[SVG DOM] --> LayerModel[Layer model]
  LayerModel --> LayersPanel
  LayersPanel --> Selection
  Selection --> Stage
  Selection --> Timeline
```

## Runtime / API Contract

Layer row facts:

- `targetId`
- `parentTargetId`
- `label`
- `kind`
- `depth`
- `trackCount`
- `warningCount`
- `selected`

## Data / State / Schema Model

Layer model derives from sanitized SVG DOM and current target registry. Search
query and expanded hierarchy state are runtime UI state.

## Security / Trust Boundary

Layer labels are text derived from SVG attributes and must be escaped. The
panel must not render raw SVG markup.

## Accessibility Posture

| Surface | Requirement |
| ------- | ----------- |
| Tree rows | Keyboard navigable tree/list semantics. |
| Search | Labelled input and result count. |
| Selection | Selected state exposed. |
| Badges | Track/warning counts exposed as text. |

## Localization / Directionality Posture

Search placeholder, empty states, and row badges are visible strings. Tree
indentation must support directionality.

## Agent Inspectability

Browser witnesses inspect row facts, selection state, search results, and
canvas/timeline sync.

## Linked Invariants

- Canvas target selection must have a non-pointer alternative.
- SVG-derived text is untrusted until escaped.
- Selection state must remain deterministic.

## Alternatives Considered

### Option A: Flat Target List

Pros:

- Simpler to build.

Cons:

- Loses SVG hierarchy context.

### Option B: Hierarchical Layers Panel

Pros:

- Matches production editor expectations.
- Supports complex documents.

Cons:

- Needs hierarchy view model.

## Decision

Choose Option B. Hierarchy is necessary for real SVG inspection.

## Implementation Slices

- [x] Slice 1: Build SVG hierarchy model.
- [x] Slice 2: Render Layers panel rows.
- [x] Slice 3: Sync selection to stage and timeline.
- [x] Slice 4: Add search/filter and badges.
- [x] Slice 5: Add keyboard/browser witness.

## Tests To Write First

- [x] Browser witness: layer row selection selects canvas target.
- [x] Browser witness: search filters by ID/name/kind.
- [x] Browser witness: warning/track counts are exposed.
- [x] Core witness: layer rows reject invalid runtime values.

## Proof Matrix

| Claim | Required proof |
| ----- | -------------- |
| Layer tree reflects SVG | Row fact assertions |
| Selection syncs | Browser selection assertion |
| Keyboard path works | Browser keyboard flow |
| Warning counts are exact | Prefix-ID browser regression |
| Layer rows are trusted runtime values | Core constructor invariant witness |

## Acceptance Criteria

- [x] Layers panel shows SVG hierarchy.
- [x] Layer selection syncs with stage and timeline.
- [x] Search works by ID/name/kind.
- [x] Keyboard navigation works.
- [x] Local validation is green.

## Validation Plan

```bash
npm run check
npm run build
npx tsx docs/method/witness/editor-shell-production-ux/svg-layer-tree-core.ts
node docs/method/witness/editor-shell-production-ux/layers-panel-smoke.mjs
```

## Playback / Witness

Run `layers-panel-smoke.mjs` against a nested SVG fixture.

## Open Questions

- @flyingrobots: Should non-animated but selectable nodes show by default? Yes,
  with filters for animated-only later.

## Follow-On Issues

- [#25 Multi-select SVG targets](https://github.com/flyingrobots/tadpole/issues/25)

## Retrospective

What changed from the design:

- The runtime hierarchy model landed as `frontend/src/SvgLayerTree.ts`, while
  per-row track, keyframe, warning, and selection facts are decorated by the
  editor shell from current runtime state.

What the tests proved:

- `layers-panel-smoke.mjs` proves a nested imported SVG renders layer rows with
  parent/depth facts, search filters by documented fields, track counts are
  exposed, warning counts do not bleed across prefix target IDs, and keyboard
  row activation synchronizes selection with the selected SVG node and timeline.
- `svg-layer-tree-core.ts` proves layer rows reject invalid runtime values and
  preserve frozen trusted row/tree state.

What remains open:

- Multi-select and saved layer visibility remain follow-on work.

PR:

- [#49](https://github.com/flyingrobots/tadpole/pull/49)
