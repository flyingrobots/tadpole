# Cycle Design: UIUX_open-props-stack

## Sponsors

- Human sponsor: UX Steward (workflow visibility and release discipline)
- Agent sponsor: Implementation Agent (frontend build + doc/signpost execution)
- User sponsor: Tadpole builder (editor project direction)

## Problem

The repository has no METHOD ship-signposts, which makes cycle scope and human
handoff opaque. This cycle establishes the repository-level METHOD artifacts
needed for traceable iteration while keeping existing app functionality intact.

## Scope

In scope:

- Add `BEARING.md` and `CHANGELOG.md` with current project state and unreleased
  deltas.
- Add METHOD backlog scaffold under
  `docs/method/backlog/{inbox,asap,bad-code,cool-ideas}`.
- Add a METHOD workflow note to `README.md`.
- Add a backlog intake note with provenance metadata in
  `docs/method/backlog/inbox/`.

Out of scope:

- Runtime UI feature changes.
- New functional tests beyond lightweight verification commands.
- CI/security remediation unrelated to this cycle.

## Accessibility/Assistive Posture

- The cycle is documentation-only and does not modify interactive behavior.
- Verified artifacts are text files and should remain machine-readable and
  screen-reader-safe (UTF-8 markdown).
- For human readability, signposts include short section headings and
  predictable file names.

## Localization/Directionality Posture

- Text authored in U.S. English for project baseline.
- Markdown structure uses logical flow (`##` hierarchy) to support potential
  future translation tooling and bidi-aware rendering.

## Agent-Inspectability Posture

- All claims are directly inspectable from files in-repo.
- No generated/binary artifacts are added.
- Instructions below provide copy/paste commands for deterministic verification.

## Requirements / Playback Questions

Human playback:

1. Can a reviewer see repository priority/state from `BEARING.md` and recent
   edits from `CHANGELOG.md`?
2. Can backlog intake start from a canonical inbox file with provenance
   metadata?
3. Is the README now explicit about METHOD branch/PR conventions?
4. Is the cycle recoverable from a single PR diff?

Agent playback:

1. Can this cycle be re-synced by checking only committed files in the branch
   diff?
2. Are METHOD-required artifacts present under `docs/method` and top-level ship
   surfaces?

## Implementation Plan

1. Create METHOD ship-surface files (`BEARING.md`, `CHANGELOG.md`).
2. Add backlog scaffold directories and a concrete intake note.
3. Document process note in README.
4. Commit as one cycle artifact.

## Risks / Assumptions

- Assumes no existing METHOD signposts or backlog structure in this repo.
- Assumes local workflow prefers lightweight markdown artifacts over a full
  `method init` bootstrap.

## Completion Criteria

- Files from this cycle are present as historical METHOD setup artifacts in the
  integration PR that carries them.
- Reviewers can distinguish this Open Props setup packet from follow-up UIUX
  work in the same PR.
