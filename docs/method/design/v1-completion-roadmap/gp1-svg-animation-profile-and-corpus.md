---
title: "V1-GP1 - SVG Animation Profile And Corpus"
legend: "V1"
lane: "design"
issue: "https://github.com/flyingrobots/tadpole/issues/58"
status: "active"
owners:
  - "@flyingrobots"
created: "2026-06-06"
updated: "2026-06-06"
---

<!-- markdownlint-disable-file MD025 -->

# V1-GP1 - SVG Animation Profile And Corpus

## Linked Umbrella Issue

- [#58 - V1-GP1 - SVG Animation Profile And Corpus](https://github.com/flyingrobots/tadpole/issues/58)

## Hill

By the end of this goalpost, a user or agent can inspect exactly which SVG
animation semantics Tadpole edits, preserves, repairs, or rejects, and the repo
proves the contract with fixture-table tests and browser witnesses.

## Slice Budget

18 slices.

## User Stories

### Story 1: SVG Animation Profile

Issue: [#65 - Document Tadpole SVG Animation Profile](https://github.com/flyingrobots/tadpole/issues/65)

A designer-engineer wants Tadpole to publish a clear SVG Animation Profile so
that they know which animation semantics are editable, preserved, repairable, or
unsupported before trusting a save.

Proof:

- [ ] Profile doc lists supported properties, timing, repeat, easing,
      transform, and preservation behavior.
- [ ] Import warnings link back to profile categories.
- [ ] Docs distinguish source truth from generated suggestions.

Slice budget: 4.

### Story 2: Support Matrix

Issue: [#30 - Add a full SVG animation import support matrix](https://github.com/flyingrobots/tadpole/issues/30)

An implementer wants a source-of-truth support matrix so that every future SVG
feature lands with an explicit import, edit, preview, save, and reopen posture.

Proof:

- [ ] Matrix names every supported and rejected SVG animation construct.
- [ ] Each row links to tests or planned tests.
- [ ] Unsupported rows name whether repair or preservation is expected.

Slice budget: 3.

### Story 3: Fixture Table Tests

Issue: [#29 - Add importer fixture table tests for SVG edge cases](https://github.com/flyingrobots/tadpole/issues/29)

A maintainer wants table-driven importer tests so that edge-case behavior is
proved without driving the whole browser editor.

Proof:

- [ ] Fixtures assert target count, tracks, keyframes, warning codes, and
      duration.
- [ ] Edge cases include inherited styles, timing offsets, duplicate tracks,
      invalid values, and unsupported composition.
- [ ] Browser witnesses remain focused on integration behavior.

Slice budget: 4.

### Story 4: Real-World SVG Corpus

Issue: [#66 - Add Real-World SVG Corpus Fixtures](https://github.com/flyingrobots/tadpole/issues/66)

A maintainer wants a checked-in SVG corpus so that importer/save regressions are
caught against real files, not only minimal fixtures.

Proof:

- [ ] Corpus includes static, supported animated, unsupported animated,
      hostile, nested, inherited-style, and large SVG examples.
- [ ] Each fixture has expected target count, track count, warning count,
      properties, and duration.
- [ ] Corpus tests run without requiring private local files.

Slice budget: 4.

### Story 5: Profile-Guided Warnings

Issue: [#67 - Convert Import Warnings Into Profile Guidance](https://github.com/flyingrobots/tadpole/issues/67)

A user importing a complex SVG wants warnings to explain what happened and what
they can do next so that unsupported animation does not feel like silent
failure.

Proof:

- [ ] Warning objects have stable codes and profile categories.
- [ ] Warnings panel groups warnings by target, property, and severity.
- [ ] Each warning names whether the feature is unsupported, preserved, or
      repairable.

Slice budget: 3.

## Goalpost Checklist

- [ ] Slice 1: Create the profile document skeleton and category taxonomy.
- [ ] Slice 2: Fill supported property and timing rows from current behavior.
- [ ] Slice 3: Add import/edit/preview/save/reopen posture columns.
- [ ] Slice 4: Add warning-code taxonomy and source-truth language.
- [ ] Slice 5: Convert current minimal importer fixtures into table cases.
- [ ] Slice 6: Add inherited style and underlying-value table cases.
- [ ] Slice 7: Add timing-offset and syncbase table cases.
- [ ] Slice 8: Add rejected composition, repeat, easing, and unsafe reference
      table cases.
- [ ] Slice 9: Add corpus directory and fixture manifest.
- [ ] Slice 10: Check in static and simple animated real-world fixtures.
- [ ] Slice 11: Add unsupported and hostile corpus fixtures.
- [ ] Slice 12: Add large nested SVG fixture expectations.
- [ ] Slice 13: Emit stable warning codes from import.
- [ ] Slice 14: Map warnings to profile categories.
- [ ] Slice 15: Group warning panel output by target and profile category.
- [ ] Slice 16: Add browser witness for profile-linked warnings.
- [ ] Slice 17: Add docs links from README and import report.
- [ ] Slice 18: Run full profile/corpus validation and update retrospective.

## Acceptance Criteria

- [ ] Umbrella issue [#58](https://github.com/flyingrobots/tadpole/issues/58)
      has all child story issues linked.
- [ ] The profile is specific enough to write a RED test from it.
- [ ] Fixture tests and browser witnesses prove the profile; docs alone do not.
