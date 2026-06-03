---
title: "G7-001 - Cycle Documentation And Witness"
lane: "design"
goal: "Goal 7"
issue: "https://github.com/flyingrobots/tadpole/issues/13"
pr: "https://github.com/flyingrobots/tadpole/pull/14"
status: "active"
owners:
  - "@flyingrobots"
created: "2026-06-03"
updated: "2026-06-03"
---

<!-- markdownlint-disable-next-line MD025 -->
# G7-001 - Cycle Documentation And Witness

## Linked Issue

- [#13](https://github.com/flyingrobots/tadpole/issues/13)

## Roadmap Gate

- Goal 7: Cycle Documentation And Witness

## Cycle Start

- [x] `git fetch origin` completed.
- [x] Local merge target branch synced to `origin/main` without rebase or force
      operations.
- [x] Cycle branch checked out from the synced merge target.
- [x] GitHub issue created from the `Tadpole Task` issue form.
- [x] `work-in-progress` label applied to the GitHub issue.
- [x] Design doc and issue link staged for the initial cycle commit.
- [x] Branch pushed and non-draft PR opened to the merge target.

## Decision Summary

Goal 7 closes the SVG timeline MVP documentation packet by adding retrospective
notes and refreshing repo-bearing context after Goals 1-6 changed the editor
from a fixed demo timeline into an imported-SVG workflow. This cycle is
documentation-only and does not change runtime behavior.

## Sponsored Human

An SVG editor maintainer wants a clear summary of what shipped and what remains
so that the next cycle can start from current truth, without re-reading every
merged PR.

## Sponsored Agent

An agent needs checklist, bearing, witness, and retro docs to agree so it can
select the next roadmap slice, without inferring state from stale project
summaries.

## Hill

By the end of this cycle, a reviewer can inspect the SVG timeline MVP's shipped
evidence, retrospective, and current-state summary through repo docs, and the
repo proves the packet with Markdown lint plus existing witness references.

## Current Truth

- Goal 7 still has two unchecked items in the SVG timeline MVP checklist:
  retro notes and a BEARING refresh, shown at
  [docs/method/design/svg-timeline-mvp/checklist.md#68:c89bc288cd854c268f063897b0d12075d1283eda](https://github.com/flyingrobots/tadpole/blob/c89bc288cd854c268f063897b0d12075d1283eda/docs/method/design/svg-timeline-mvp/checklist.md#L68).
- `BEARING.md` still describes the frontend as a timeline-first UI with live
  preview but does not mention imported SVGs, target discovery, project
  export/restore, or rough UX hardening:
  [BEARING.md#8:c89bc288cd854c268f063897b0d12075d1283eda](https://github.com/flyingrobots/tadpole/blob/c89bc288cd854c268f063897b0d12075d1283eda/BEARING.md#L8).
- The Goal 6 witness proves blank SVG, no-target SVG, selected-target quick
  actions, title labels, preview chip, and clear-tracks recovery:
  [docs/method/witness/svg-timeline-mvp/rough-ux-hardening.md#26:c89bc288cd854c268f063897b0d12075d1283eda](https://github.com/flyingrobots/tadpole/blob/c89bc288cd854c268f063897b0d12075d1283eda/docs/method/witness/svg-timeline-mvp/rough-ux-hardening.md#L26).
- The Goal 6 retrospective still says PR review and merge remain open, even
  though PR #12 has now landed:
  [docs/method/design/svg-timeline-mvp/rough-ux-hardening.md#340:c89bc288cd854c268f063897b0d12075d1283eda](https://github.com/flyingrobots/tadpole/blob/c89bc288cd854c268f063897b0d12075d1283eda/docs/method/design/svg-timeline-mvp/rough-ux-hardening.md#L340).

## Problem

The SVG timeline MVP has runtime witnesses for the rough editor workflow, but
the documentation packet is not closed. The checklist still asks for retro
notes, and BEARING still points future contributors toward pre-import editor
truth.

## Scope

This cycle includes:

- Add SVG timeline MVP retrospective notes.
- Refresh `BEARING.md` to reflect imported SVG editing, project JSON
  persistence, witnesses, and the remaining export gap.
- Align cycle-start docs with the repo instruction that PRs are non-draft.
- Close stale Goal 6 retrospective text now that PR #12 has merged.
- Mark Goal 7 checklist items complete after docs and validation land.
- Remove the work-in-progress label from issue #13 when the PR is ready.

## Non-Goals

This cycle does not include:

- Goal 8 runnable animation export.
- New frontend controls or runtime state.
- Project JSON schema changes.
- New browser witness behavior unless docs validation exposes a stale witness.

## User Experience / Product Shape

Not applicable. This cycle changes repo documentation only, not the rendered
editor surface.

## Runtime / API Contract

No runtime or package API changes. The contract is documentation consistency:

- `BEARING.md` states the current editor workflow accurately.
- The SVG timeline MVP checklist marks only completed documentation work.
- Retrospective notes state what shipped, what tests proved, and what remains.

## Data / State / Schema Model

Not applicable. No persisted project state or schema changes.

## Security / Trust Boundary

No trust boundary changes. This cycle documents existing imported-SVG behavior
but does not alter sanitizer, project import, filesystem, network, or generated
output surfaces.

## Accessibility Posture

Not applicable to runtime behavior. Documentation should continue to name the
accessibility and keyboard gaps that matter for future UI cycles.

## Localization / Directionality Posture

No new app-visible strings are added. Documentation remains English-only.

## Agent Inspectability

Agents can inspect the result through stable Markdown files:

- `BEARING.md`
- `docs/method/design/svg-timeline-mvp/checklist.md`
- SVG timeline MVP retro notes
- existing witness docs under `docs/method/witness/svg-timeline-mvp/`

## Linked Invariants

- Docs describe evidence; they do not replace evidence.
- Runtime behavior remains the proof for editor workflows.
- Cycle closure must name deferred work instead of hiding it in prose.
- Git history stays linear enough to audit without amend, rebase, or force.

## Alternatives Considered

### Option A: Single Checklist Toggle

Pros:

- Fastest possible Goal 7 closure.

Cons:

- Leaves BEARING stale and gives future work weak orientation.

### Option B: Close The Cycle Packet

Pros:

- Updates checklist, retrospective, and bearing together.
- Gives Goal 8 a clean starting point.

Cons:

- Slightly more documentation surface to lint.

## Decision

Use Option B. Goal 7 exists to close documentation and witness context, so a
checklist-only change would undercut the gate.

## Implementation Slices

- [x] Slice 1: Cycle scaffold and PR.
- [x] Slice 2: SVG timeline MVP retrospective notes.
- [x] Slice 3: BEARING refresh.
- [x] Slice 4: Process-doc non-draft PR alignment.
- [x] Slice 5: Stale Goal 6 retrospective closure.
- [x] Slice 6: Checklist closure and validation notes.

## Tests To Write First

Documentation checks required:

- [x] Markdown lint for changed docs.
- [x] YAML parse for the GitHub issue template.
- [x] `git diff --check`.

Runtime checks:

- [x] Not required; no runtime code changes.

## Proof Matrix

| Claim | Required proof |
| --- | --- |
| Retrospective exists and names shipped work | Markdown lint and file review |
| BEARING reflects current editor state | Markdown lint and file review |
| Cycle-start docs require non-draft PRs | Markdown lint and file review |
| GitHub issue template remains parseable | Ruby YAML parse |
| Goal 6 retrospective is not stale | Markdown lint and file review |
| Goal 7 checklist closes only after docs land | Markdown lint and diff review |
| No runtime changes are included | `git diff --stat` |

## Acceptance Criteria

The work is done when:

- [x] SVG timeline MVP retrospective notes are added.
- [x] `BEARING.md` reflects the imported-SVG editor workflow.
- [x] Cycle-start docs require non-draft PRs.
- [x] Goal 6 retrospective no longer carries stale PR review/merge work.
- [x] Goal 7 checklist items are checked.
- [x] Changed docs pass Markdown lint.
- [x] GitHub issue template parses as YAML.
- [x] `git diff --check` passes.
- [x] Issue and PR are linked correctly.

## Validation Plan

```bash
npx --yes markdownlint-cli2 \
  README.md \
  BEARING.md \
  docs/method/design/TEMPLATE.md \
  docs/method/design/svg-timeline-mvp/checklist.md \
  docs/method/design/svg-timeline-mvp/cycle-documentation-witness.md \
  docs/method/design/svg-timeline-mvp/rough-ux-hardening.md \
  docs/method/retro/svg-timeline-mvp/retro.md
ruby -e 'require "yaml"; YAML.load_file(".github/ISSUE_TEMPLATE/task.yml")'
git diff --check
```

## Playback / Witness

Reviewers can inspect:

```bash
README.md
BEARING.md
docs/method/design/TEMPLATE.md
.github/ISSUE_TEMPLATE/task.yml
docs/method/design/svg-timeline-mvp/checklist.md
docs/method/design/svg-timeline-mvp/cycle-documentation-witness.md
docs/method/design/svg-timeline-mvp/rough-ux-hardening.md
docs/method/retro/svg-timeline-mvp/retro.md
```

## Open Questions

- Should Goal 8 start immediately after this packet closes?
  Owner: @flyingrobots. Resolution: defer to the next cycle.

## Follow-On Issues

- Goal 8 runnable animation export remains the next product gap.

## Retrospective

What changed from the design:

- Process docs were also aligned with the repo instruction that cycle PRs are
  non-draft.
- The stale Goal 6 retrospective was closed after PR #12 merged.
- No runtime checks were added because implementation stayed documentation-only.

What the tests proved:

- Markdown lint and `git diff --check` prove the changed docs meet the repo's
  style and whitespace gates.
- Ruby YAML parsing proves the edited GitHub issue form remains syntactically
  valid.

What remains open:

- Goal 8 runnable animation export.

PR:

- [#14](https://github.com/flyingrobots/tadpole/pull/14)
