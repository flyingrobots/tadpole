---
title: "V1-GP2 - Runtime Core Extraction"
legend: "V1"
lane: "design"
issue: "https://github.com/flyingrobots/tadpole/issues/59"
status: "active"
owners:
  - "@flyingrobots"
created: "2026-06-06"
updated: "2026-06-06"
---

<!-- markdownlint-disable-file MD025 -->

# V1-GP2 - Runtime Core Extraction

## Linked Umbrella Issue

- [#59 - V1-GP2 - Runtime Core Extraction](https://github.com/flyingrobots/tadpole/issues/59)

## Hill

By the end of this goalpost, the SVG animation importer, timing resolver,
profile model, and SVG-native serializer are runtime-backed TypeScript modules
with pure tests, and `App.svelte` calls them through narrow UI adapters.

## Slice Budget

20 slices.

## User Stories

### Story 1: Extract Importer Core

Issue: [#28 - Extract SVG animation importer into a pure module](https://github.com/flyingrobots/tadpole/issues/28)

A maintainer wants SVG animation import logic outside the Svelte component so
that timing and track extraction can be tested and evolved safely.

Proof:

- [ ] Importer module accepts SVG text and returns runtime import results.
- [ ] UI adapter converts import results into editor state.
- [ ] Existing browser witnesses remain green.

Slice budget: 5.

### Story 2: Extract Native Save Core

Issue: [#68 - Extract SVG Native Save Serializer Core](https://github.com/flyingrobots/tadpole/issues/68)

A maintainer wants SVG-native save serialization in a dedicated runtime module
so that save behavior can be tested without driving the UI.

Proof:

- [ ] Serializer module owns supported scalar and transform serialization.
- [ ] Pure tests cover blocked saves, metadata, looping, partial durations, and
      reopened semantics.
- [ ] UI calls the module through a narrow adapter.

Slice budget: 4.

### Story 3: Runtime-Backed Profile Model

Issue: [#69 - Add Runtime-Backed Animation Profile Model](https://github.com/flyingrobots/tadpole/issues/69)

An agent needs runtime-backed property, timing, warning, and profile objects so
that it can inspect importer decisions without scraping UI prose.

Proof:

- [ ] Domain classes validate animation property IDs, timing spans, track keys,
      warning codes, and profile categories.
- [ ] Boundary parsers convert SVG and JSON inputs into trusted objects.
- [ ] Tests prove invalid states cannot enter the core model.

Slice budget: 4.

### Story 4: Pure Fixture Harness

Issue: [#70 - Add Pure Importer Serializer Fixture Harness](https://github.com/flyingrobots/tadpole/issues/70)

A maintainer wants table-driven importer and serializer tests so that adding SVG
support does not require adding only slow browser witnesses.

Proof:

- [ ] Fixture table asserts warnings, tracks, keyframes, duration, and save
      output.
- [ ] Browser witnesses remain for integration only.
- [ ] The harness is documented and runs in the default quality gate.

Slice budget: 4.

### Story 5: App Monolith Decomposition

Issue: [#17 - Decompose the Svelte editor monolith](https://github.com/flyingrobots/tadpole/issues/17)

A maintainer wants product behavior split out of `App.svelte` so that UI layout
changes do not risk SVG import, save, and command behavior.

Proof:

- [ ] Extracted modules own domain behavior.
- [ ] Component code owns rendering and interaction wiring.
- [ ] Systems-style TypeScript audit does not regress.

Slice budget: 3.

## Goalpost Checklist

- [ ] Slice 1: Define importer result and warning classes.
- [ ] Slice 2: Move clock and syncbase timing resolution into core.
- [ ] Slice 3: Move `<animate>` scalar extraction into core.
- [ ] Slice 4: Move `<animateTransform>` extraction into core.
- [ ] Slice 5: Replace UI importer code with adapter calls.
- [ ] Slice 6: Define serializer request/result classes.
- [ ] Slice 7: Move scalar save serialization into core.
- [ ] Slice 8: Move transform save serialization into core.
- [ ] Slice 9: Move metadata save/reopen handling into core.
- [ ] Slice 10: Add animation property value objects.
- [ ] Slice 11: Add timing span and track key value objects.
- [ ] Slice 12: Add profile category and warning code value objects.
- [ ] Slice 13: Add fixture manifest parser.
- [ ] Slice 14: Add importer fixture runner.
- [ ] Slice 15: Add serializer fixture runner.
- [ ] Slice 16: Wire fixture runner into `npm run check` or a documented gate.
- [ ] Slice 17: Move project import/export helpers out of component if touched.
- [ ] Slice 18: Move preview style resolution behind a testable boundary.
- [ ] Slice 19: Update docs and witnesses for extracted core modules.
- [ ] Slice 20: Run full validation and complete retrospective.

## Acceptance Criteria

- [ ] Umbrella issue [#59](https://github.com/flyingrobots/tadpole/issues/59)
      has all child story issues linked.
- [ ] Runtime modules own SVG animation truth.
- [ ] `App.svelte` no longer owns importer or serializer semantics.
