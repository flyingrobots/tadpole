---
title: "Goal 8 - Export Runnable Animation Output"
lane: "design"
goal: "Goal 8"
issue: "https://github.com/flyingrobots/tadpole/issues/15"
pr: "https://github.com/flyingrobots/tadpole/pull/16"
status: "active"
owners:
  - "@flyingrobots"
created: "2026-06-03"
updated: "2026-06-03"
---

<!-- markdownlint-disable-next-line MD025 -->
# Goal 8 - Export Runnable Animation Output

## Linked Issue

- [Issue #15](https://github.com/flyingrobots/tadpole/issues/15)

## Roadmap Gate

- Goal 8: Export Runnable Animation

## Cycle Start

- [x] `git fetch origin` completed.
- [x] Local merge target branch synced to `origin/main` or the named merge
      target without rebase or force operations.
- [x] Cycle branch checked out from the synced merge target.
- [x] GitHub issue created from the `Tadpole Task` issue form.
- [x] `work-in-progress` label applied to the GitHub issue.
- [x] Design doc, issue link, and initial cycle scaffold staged and committed.
- [x] Branch pushed and non-draft PR opened to the merge target.

## Decision Summary

Tadpole will export a self-contained runnable HTML animation artifact generated
from the current sanitized SVG source and active timeline tracks. The artifact
will embed the sanitized SVG, a compact copy of the track data, and a small
deterministic runtime that applies the same supported property model outside
the editor.

## Sponsored Human

A logo or diagram editor wants to copy or download a runnable animation so that
they can hand off the current Tadpole result to another surface, without having
to rebuild the Tadpole project model or keep the editor open.

## Sponsored Agent

An agent needs a deterministic exported artifact and browser witness so it can
verify that the animation runs outside Tadpole, without inferring behavior from
the editor preview DOM or project JSON prose.

## Hill

By the end of this cycle, a Tadpole user can export the current SVG timeline as
a self-contained runnable HTML artifact through the workbench export surface,
and the repo proves it with a browser witness that loads the artifact outside
the editor and observes animated SVG state changes.

## Current Truth

Tadpole is a local-first SVG timeline animation editor:
[BEARING.md#L5:4b51c95523f3414691b5b451eeb7775e471c0ae6](https://github.com/flyingrobots/tadpole/blob/4b51c95523f3414691b5b451eeb7775e471c0ae6/BEARING.md#L5).

The frontend already has project JSON with sanitized SVG source, target
metadata, timeline settings, and tracks:
[frontend/src/App.svelte#L55:4b51c95523f3414691b5b451eeb7775e471c0ae6](https://github.com/flyingrobots/tadpole/blob/4b51c95523f3414691b5b451eeb7775e471c0ae6/frontend/src/App.svelte#L55)
and
[frontend/src/App.svelte#L903:4b51c95523f3414691b5b451eeb7775e471c0ae6](https://github.com/flyingrobots/tadpole/blob/4b51c95523f3414691b5b451eeb7775e471c0ae6/frontend/src/App.svelte#L903).

Plain SVG import discovers editable targets and reconciles existing tracks,
but it does not infer a timeline from the SVG:
[docs/method/design/svg-timeline-mvp/checklist.md#L41:4b51c95523f3414691b5b451eeb7775e471c0ae6](https://github.com/flyingrobots/tadpole/blob/4b51c95523f3414691b5b451eeb7775e471c0ae6/docs/method/design/svg-timeline-mvp/checklist.md#L41).

Goal 8 is still open because project JSON is persistence, but runnable output
does not exist:
[BEARING.md#L44:4b51c95523f3414691b5b451eeb7775e471c0ae6](https://github.com/flyingrobots/tadpole/blob/4b51c95523f3414691b5b451eeb7775e471c0ae6/BEARING.md#L44).

## Problem

Project export preserves Tadpole state, but it is not a runnable deliverable.
A user can reopen a project in Tadpole, yet cannot hand another tool a single
artifact that animates the SVG outside the editor.

## Scope

This cycle includes:

- Runnable export generation from the active sanitized SVG and active timeline
  tracks.
- A visible workbench export surface for inspecting and copying the runnable
  artifact.
- A browser witness that opens the exported artifact outside the editor and
  proves that supported track properties animate.
- Documentation updates that mark animation extraction/import as the next
  roadmap goal after Goal 8.

## Non-Goals

This cycle does not include:

- Inferring Tadpole tracks from existing SVG SMIL, CSS, or Web Animations.
- Video, GIF, Lottie, or sprite-sheet export.
- External asset bundling.
- Exporting muted tracks as active animation behavior.
- Solving layer-tree navigation, undo/redo, or multi-select editing.

## User Experience / Product Shape

The user edits the SVG as usual, then uses a runnable export action near the
existing project export surface. The UI communicates:

- the artifact is generated from the current sanitized SVG and timeline tracks;
- copy success or failure through an `aria-live` status line;
- the artifact contents in a scrollable code block for inspection;
- the distinction between project JSON persistence and runnable output.

Keyboard users can tab to the runnable export action after the project export
controls. Screen-reader users receive the same success or failure status as
visible users.

## Runtime / API Contract

Contract name: `tadpole-runnable-html-1`.

The exported artifact is a standalone HTML document with:

- sanitized SVG markup in a `.tadpole-stage` container;
- a JSON script block containing duration, looping, discovered targets, and
  non-muted tracks;
- a tiny runtime that uses `requestAnimationFrame` to apply supported Tadpole
  properties to matching SVG target IDs;
- visible fallback text only if JavaScript is unavailable.

Supported properties:

| Tadpole property | Export behavior |
| ---------------- | --------------- |
| `x` | participates in composed CSS `translate(...)` |
| `y` | participates in composed CSS `translate(...)` |
| `scale` | participates in composed CSS `scale(...)` |
| `rotation` | participates in composed CSS `rotate(...)` |
| `opacity` | writes inline `opacity` |
| `fill` | writes inline `fill` |
| `stroke` | writes inline `stroke` |
| `strokeWidth` | writes inline `stroke-width` |

Unsupported or invalid target IDs are skipped by the exported runtime. Muted
tracks are excluded from the export payload.

## Data / State / Schema Model

| State | Source |
| ----- | ------ |
| SVG source | current sanitized `svgMarkup` |
| Targets | current `availableTargets` |
| Timeline duration | current `timelineDurationMs` |
| Looping | current `isLooping` |
| Track data | current non-muted `tracks` |
| Runtime clock | exported artifact `requestAnimationFrame` timestamp |

The export artifact is derived state and is regenerated whenever the current
project export inputs change. It does not alter Tadpole project JSON schema.

## Security / Trust Boundary

The artifact uses the same sanitized SVG source already rendered by the editor.
It does not re-enable stripped SVG animation, script, foreign-object, or unsafe
URL surfaces. Track values continue to pass through existing project validators
when they come from project import, and editor-created values are constrained by
the existing UI controls.

The exported runtime must not fetch external resources, eval user data, or
write arbitrary HTML from track values.

## Accessibility Posture

| Surface | Requirement |
| ------- | ----------- |
| Semantic labels or facts | Export controls name copy/download behavior. |
| Focus order or ownership | Controls follow project export controls. |
| Non-visual equivalent | Export status uses `aria-live`. |
| Keyboard behavior | Buttons remain native buttons. |
| Secret or redaction behavior | Not applicable. |

## Localization / Directionality Posture

| String or surface | Requirement |
| ----------------- | ----------- |
| User-visible strings | Added in `frontend/src/App.svelte`. |
| Catalog or source location | Inline strings; no catalog exists today. |
| Directionality assumptions | Copy does not rely on left/right. |
| Locale updates, if any | Not applicable. |

## Agent Inspectability

An agent can inspect:

- the runnable artifact code block;
- the artifact version string `tadpole-runnable-html-1`;
- the browser witness assertions;
- SVG target inline styles inside an isolated exported page;
- the issue and PR links in this design doc.

## Linked Invariants

- Runtime behavior is the proof.
- Imported SVG and project data are untrusted until sanitized or validated.
- Timeline state must remain deterministic under async input.
- Docs describe evidence; they do not replace evidence.
- Browser witness coverage is required for visual editor workflows.

## Alternatives Considered

### Option A: Self-Contained HTML Runtime

Pros:

- Preserves the existing Tadpole interpolation model.
- Easy for a browser witness to load outside the editor.
- Keeps the first runnable export independent of SMIL/CSS feature gaps.

Cons:

- The artifact is HTML, not a pure SVG file.
- Downstream consumers that require SVG-only output still need a later export
  mode.

### Option B: Pure SVG With SMIL Or CSS Keyframes

Pros:

- Output can remain a single SVG file.
- Easier to embed as an image in some contexts.

Cons:

- More approximation risk for current easing and transform composition.
- The editor sanitizer currently strips native SVG animation nodes on import,
  so this would introduce a second animation model immediately.

## Decision

Choose Option A for Goal 8. The MVP gate is runnable output with proof, and a
small self-contained HTML runtime gives the closest behavior to the editor with
the fewest new assumptions. SVG-only export can be a follow-on issue if needed.

## Implementation Slices

- [ ] Slice 1: Cycle scaffold with issue, design doc, checklist, and non-draft
      PR.
- [ ] Slice 2: Generate `tadpole-runnable-html-1` from sanitized SVG, targets,
      duration, loop state, and non-muted tracks.
- [ ] Slice 3: Add a workbench UI surface for inspecting and copying runnable
      output with accessible status.
- [ ] Slice 4: Add a browser witness that exports a project, opens the artifact
      outside Tadpole, and proves SVG target styles change over time.
- [ ] Slice 5: Update changelog, checklist, BEARING, and witness docs, including
      animation extraction/import as the next roadmap goal.

Each slice is small enough to review independently and corresponds to one
runtime proof or documentation witness.

## Tests To Write First

Behavior tests required:

- [ ] Browser witness fails until runnable export exists and can animate outside
      Tadpole.
- [ ] Browser witness asserts the exported artifact version and animated target
      style changes.

Documentation or process tests, only if relevant:

- [ ] Markdown lint changed docs.

Rule: documentation tests cannot be the only proof for product or runtime work.

## Proof Matrix

| Claim | Required proof |
| ----- | -------------- |
| Runnable export is generated | Witness reads output from the editor UI. |
| Export runs outside Tadpole | Witness loads artifact in an isolated page. |
| SVG state changes over time | Witness observes target style changes. |
| Post-MVP extraction is recorded | Checklist and BEARING name it. |

## Acceptance Criteria

The work is done when:

- [ ] Behavior witness proves a runnable artifact animates outside the editor.
- [ ] Rendered UI exposes runnable export inspection and copy state.
- [ ] Project JSON compatibility remains unchanged.
- [ ] Accessibility is preserved for new controls and status copy.
- [ ] New strings are accounted for in this design.
- [ ] Docs, changelog, witness, and issue links are updated.
- [ ] CI and local validation are green.

## Validation Plan

Commands expected before PR:

```bash
npm run check
npm run build
node docs/method/witness/svg-timeline-mvp/runnable-export-smoke.mjs
npx --yes markdownlint-cli2 \
  CHANGELOG.md \
  BEARING.md \
  docs/method/design/svg-timeline-mvp/checklist.md \
  docs/method/design/svg-timeline-mvp/runnable-animation-export.md \
  docs/method/witness/svg-timeline-mvp/runnable-animation-export.md
git diff --check
```

## Playback / Witness

Run:

```bash
npm run dev
node docs/method/witness/svg-timeline-mvp/runnable-export-smoke.mjs
```

The witness opens the editor, reads runnable output from the UI, then loads the
artifact in a separate browser page without relying on the editor DOM.

## Open Questions

| Question | Owner | Resolution |
| -------- | ----- | ---------- |
| Should SVG-only export be separate? | @flyingrobots | Yes, defer it. |

## Follow-On Issues

- Import/extract existing SVG animation timelines into Tadpole tracks after Goal
  8 lands.
- Consider SVG-only runnable export after the HTML artifact contract is proven.

## Retrospective

Fill this in after implementation.

What changed from the design:

- ...

What the tests proved:

- ...

What remains open:

- Import/extract existing SVG animation timelines into Tadpole tracks remains
  post-MVP follow-on work.

PR:

- [Pull request #16](https://github.com/flyingrobots/tadpole/pull/16)
