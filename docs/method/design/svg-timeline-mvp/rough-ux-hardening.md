---
title: "G6-001 - Rough UX Hardening"
lane: "design"
goal: "Goal 6"
issue: "https://github.com/flyingrobots/tadpole/issues/11"
pr: "TBD"
status: "active"
owners:
  - "@flyingrobots"
created: "2026-06-03"
updated: "2026-06-03"
---

<!-- markdownlint-disable-next-line MD025 -->
# G6-001 - Rough UX Hardening

## Linked Issue

- [#11](https://github.com/flyingrobots/tadpole/issues/11)

## Roadmap Gate

- Goal 6: Rough UX Hardening

## Cycle Start

- [x] `git fetch origin` completed.
- [x] Local merge target branch synced to `origin/main` without rebase or force
      operations.
- [x] Cycle branch checked out from the synced merge target.
- [x] GitHub issue created from the `Tadpole Task` issue form.
- [x] `work-in-progress` label applied to the GitHub issue.
- [ ] Design doc, issue link, and initial cycle scaffold staged and committed.
- [ ] Branch pushed and PR opened to the merge target.

## Decision Summary

Goal 6 hardens the rough SVG timeline editor by making empty states explicit,
adding selected-target track shortcuts, improving imported target labels, and
adding recovery controls for track/SVG mismatch. This cycle keeps the single
screen editor shape and does not introduce a layer tree or undo stack.

## Sponsored Human

An SVG animator wants the editor to explain what can be edited next so that
rough project setup stays fast, without having to infer state from empty lists,
manual target selectors, or silent track reconciliation.

## Sponsored Agent

An agent needs stable visible labels, button names, and witness assertions so it
can verify UX state changes without scraping pixels or relying on private
component state.

## Hill

By the end of this cycle, a user can understand empty SVG/target/track states,
create common tracks directly from the selected SVG target, see clearer imported
target labels, identify the selected target near the preview, and clear tracks
when changing SVGs; the repo proves it with focused browser witnesses plus
`npm run check` and `npm run build`.

## Current Truth

- Goal 5 landed in PR #10 and `origin/main` is at merge commit `48cc594`.
- The editor imports raw SVG, discovers editable targets, applies timeline
  tracks to rendered SVG elements, and exports/restores project JSON in
  `frontend/src/App.svelte`.
- The SVG MVP roadmap checklist tracks Goal 6 in
  `docs/method/design/svg-timeline-mvp/checklist.md`.
- Current browser witnesses live under
  `docs/method/witness/svg-timeline-mvp/`.
- Existing project/import witnesses cover import safety and project restore, but
  they do not prove selected-target shortcuts or empty-state copy.

## Problem

The editor can edit any imported SVG target that has an ID, but the rough UX
still leaves common states implicit:

- An imported SVG with no editable targets leaves users with an inert target
  library.
- A selected target with no tracks does not offer direct next actions.
- Discovered target labels can be weak when SVGs lack `data-tadpole-name`,
  `aria-label`, or text content.
- The preview does not summarize the selected target near the visual surface.
- SVG changes reconcile tracks, but there is no explicit clear-tracks recovery
  action.

## Scope

This cycle includes:

- Empty states for missing SVG, missing targets, and selected targets with no
  tracks.
- Quick track creation actions scoped to the selected target.
- Better discovered target labels.
- A visible selected-target chip near the preview.
- A clear-tracks action for SVG changes.

## Non-Goals

This cycle does not include:

- Multi-select target editing.
- A layer tree or nested SVG hierarchy browser.
- Undo/redo history.
- Timeline presets or animation templates.
- Goal 8 runnable animation export.

## User Experience / Product Shape

The current single-screen editor remains intact. Goal 6 adds clearer local
states where users already look: the SVG source panel, target library, preview
heading, and selected-track/inspector area.

```mermaid
flowchart TD
  A[Import or reset SVG] --> B{Editable targets found?}
  B -- No --> C[Show target empty state]
  B -- Yes --> D[Select target from preview or target library]
  D --> E{Selected target has tracks?}
  E -- No --> F[Show quick track actions]
  E -- Yes --> G[Edit existing tracks]
  F --> H[Create selected-target track]
  H --> G
```

### Accessibility Considerations

New empty states must be plain text near the affected controls. New quick
actions must be real buttons with target and property names in their accessible
names. The selected-target chip must duplicate, not replace, existing target
library state.

## Runtime / API Contract

No exported package API changes. The user-facing contract is the DOM behavior of
the Svelte editor:

- Target library empty state appears when `availableTargets.length === 0`.
- Selected-target no-track state appears when a target is selected and no track
  exists for that target.
- Quick action buttons create tracks using the existing timeline track model.
- Improved labels are derived during SVG target discovery and exported in
  project target metadata.
- Clear-tracks action empties timeline tracks through existing in-memory state.

## Data / State Model

| State | Source of truth | Reset behavior |
| --- | --- | --- |
| SVG source | `svgSource` | Reset sample or successful import replaces it |
| Editable targets | Parsed SVG source | Recomputed on import/reset |
| Selected target | `selectedTargetId` | Settled against available targets |
| Timeline tracks | `tracks` | Reconciled on SVG load; clear action empties it |
| Export metadata | Reactive project export | Follows parsed targets and tracks |

## Accessibility Posture

| Surface | Requirement |
| --- | --- |
| Empty states | Text appears near affected control and is not visual-only |
| Quick actions | Buttons name target and property |
| Selected-target chip | Mirrors existing selected target state |
| Clear tracks | Button communicates destructive scope |

## Localization Posture

New user-visible strings are English-only inline Svelte strings, matching the
current app. No i18n catalog exists in this repo yet.

## Agent Inspectability

Browser witnesses can inspect stable text, button names, target chips, track
cards, and exported project JSON. No pixel-only assertion is required.

## Linked Invariants

- Tests and witnesses prove runtime behavior.
- Imported SVG state remains sanitized before rendering.
- Project export follows runtime truth.
- Commands change state; status copy only explains state.

## Design Alternatives Considered

### Option A: Full Layer Tree

Pros:

- Gives a structured view of all SVG targets.

Cons:

- Too large for Goal 6 and duplicates target library work.

### Option B: Local Hardening In Existing Panels

Pros:

- Small, testable, and keeps the current editor shape.

Cons:

- Does not solve deep SVG hierarchy navigation.

## Decision

Use Option B. Add local hardening to existing panels and defer layer-tree work
until after runnable export exists.

## Implementation Slices

- [ ] Slice 1: Cycle scaffold and witness plan.
- [ ] Slice 2: Empty states for missing SVG, missing targets, and selected
      targets with no tracks.
- [ ] Slice 3: Quick selected-target track creation actions.
- [ ] Slice 4: Better discovered target labels.
- [ ] Slice 5: Selected-target chip near preview.
- [ ] Slice 6: Clear-tracks action for SVG changes.

## Tests To Write First

- [ ] Browser witness proves no-target SVG import shows a target empty state.
- [ ] Browser witness proves selecting a target with no tracks exposes quick
      track actions and creates a bound track.
- [ ] Browser witness proves imported unlabeled targets receive useful labels.
- [ ] Browser witness proves selected-target chip and clear-tracks action when
      implemented.

## Acceptance Criteria

The work is done when:

- [ ] Empty states are visible and covered by browser witness.
- [ ] Quick selected-target track creation is covered by browser witness.
- [ ] Target label improvements are covered by browser witness.
- [ ] Selected-target chip and clear-tracks action are covered by browser
      witness.
- [ ] `CHANGELOG.md` and roadmap checklist are updated.
- [ ] `npm run check` and `npm run build` pass.

## Validation Plan

```bash
npm run check
npm run build
node docs/method/witness/svg-timeline-mvp/rough-ux-hardening-smoke.mjs
```

## Playback / Witness

Run the Goal 6 browser witness against the local dev server:

```bash
cd /tmp/tadpole-playwright
node /Users/james/git/tadpole/docs/method/witness/svg-timeline-mvp/rough-ux-hardening-smoke.mjs
```

## Risks

Known risks:

- More inline UI state can clutter the single-screen editor.
- Quick actions may duplicate existing track controls.

Mitigations:

- Keep copy short and colocated with the affected panel.
- Reuse the existing track creation path instead of adding a separate model.

## Follow-On Debt

- Create a future issue for layer-tree navigation if selected-target shortcuts
  are not enough for complex SVGs.

## Retrospective

Fill this in after implementation.

What changed from the design:

- ...

What the tests proved:

- ...

What remains open:

- ...

PR:

- TBD
