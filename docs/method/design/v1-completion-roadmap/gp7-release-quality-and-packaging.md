---
title: "V1-GP7 - Release Quality And Packaging"
legend: "V1"
lane: "design"
issue: "https://github.com/flyingrobots/tadpole/issues/64"
status: "active"
owners:
  - "@flyingrobots"
created: "2026-06-06"
updated: "2026-06-06"
---

<!-- markdownlint-disable-file MD025 -->

# V1-GP7 - Release Quality And Packaging

## Linked Umbrella Issue

- [#64 - V1-GP7 - Release Quality And Packaging](https://github.com/flyingrobots/tadpole/issues/64)

## Hill

By the end of this goalpost, Tadpole has a reproducible v1 release gate: one
validation command, tutorial docs, example SVGs, performance expectations, label
hygiene, and a concrete release checklist.

## Slice Budget

16 slices.

## User Stories

### Story 1: Shared Witness Harness

Issue: [#18 - Extract a shared Playwright witness harness](https://github.com/flyingrobots/tadpole/issues/18)

A maintainer wants browser witnesses to share setup helpers so that witness
coverage can grow without copy-paste drift.

Proof:

- [ ] Shared helper owns app launch, console/page error capture, menu commands,
      panel opening, and payload reads.
- [ ] Existing witnesses migrate incrementally.
- [ ] Witness failures remain easy to diagnose.

Slice budget: 3.

### Story 2: One-Command Validation

Issue: [#88 - Add One-Command Full Validation Runner](https://github.com/flyingrobots/tadpole/issues/88)

A maintainer wants one command for the v1 quality gate so that release readiness
is reproducible.

Proof:

- [ ] Command runs check, build, core tests, browser witnesses, Markdown checks,
      and corpus checks.
- [ ] Failures are grouped by subsystem.
- [ ] CI and local docs use the same command.

Slice budget: 3.

### Story 3: Performance Corpus

Issue: [#89 - Add Large SVG Performance Corpus](https://github.com/flyingrobots/tadpole/issues/89)

A maintainer wants large SVG performance witnesses so that Tadpole stays usable
with production artwork.

Proof:

- [ ] Corpus covers 500+ targets, 100+ tracks, 1000+ keyframes, nested groups,
      and large paths.
- [ ] Witness records import time, interaction readiness, and scrub
      responsiveness.
- [ ] Regression thresholds are documented.

Slice budget: 3.

### Story 4: User Docs And Examples

Issue: [#90 - Add User Tutorial Docs And Example SVGs](https://github.com/flyingrobots/tadpole/issues/90)

A new user wants a short tutorial and example SVGs so that they can learn the
open-edit-preview-save workflow quickly.

Proof:

- [ ] Tutorial covers import, select target, edit keyframes, preview, save SVG,
      and reopen.
- [ ] Example SVGs are checked in and covered by tests.
- [ ] README links the tutorial and support profile.

Slice budget: 3.

### Story 5: V1 Release Checklist

Issue: [#91 - Create V1 Release Checklist And Versioning Plan](https://github.com/flyingrobots/tadpole/issues/91)

A maintainer wants a v1 release checklist so that completeness has a concrete
gate instead of a vibe.

Proof:

- [ ] Checklist names required docs, tests, examples, support-profile coverage,
      and known limits.
- [ ] Versioning and changelog policy are documented.
- [ ] Release issue tracks final blockers.

Slice budget: 2.

### Story 6: Label Hygiene

Issue: [#19 - Fix work-in-progress label metadata to match non-draft PR workflow](https://github.com/flyingrobots/tadpole/issues/19)

A maintainer wants labels and templates to match the actual workflow so that
issues do not keep stale process language.

Proof:

- [ ] `work-in-progress` label description no longer mentions draft PRs.
- [ ] Issue template includes v1 goalpost options.
- [ ] Existing stale WIP labels are audited.

Slice budget: 2.

## Goalpost Checklist

- [ ] Slice 1: Add shared Playwright witness helper.
- [ ] Slice 2: Migrate two high-traffic witnesses.
- [ ] Slice 3: Document witness harness usage.
- [ ] Slice 4: Add `npm run validate:v1` script.
- [ ] Slice 5: Wire core tests and browser witnesses into the command.
- [ ] Slice 6: Add grouped failure output.
- [ ] Slice 7: Add large SVG corpus fixture.
- [ ] Slice 8: Add large timeline fixture.
- [ ] Slice 9: Add performance witness thresholds.
- [ ] Slice 10: Add user tutorial.
- [ ] Slice 11: Add example SVG files.
- [ ] Slice 12: Link docs from README.
- [ ] Slice 13: Add v1 release checklist.
- [ ] Slice 14: Document versioning and changelog policy.
- [ ] Slice 15: Fix label/template workflow drift.
- [ ] Slice 16: Run release validation and complete retrospective.

## Acceptance Criteria

- [ ] Umbrella issue [#64](https://github.com/flyingrobots/tadpole/issues/64)
      has all child story issues linked.
- [ ] Release readiness is reproducible through a single command.
- [ ] A new user can learn the core workflow from docs and examples.
