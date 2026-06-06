---
title: "V1-GP6 - Intelligent Import Repair And Starter Motion"
legend: "V1"
lane: "design"
issue: "https://github.com/flyingrobots/tadpole/issues/63"
status: "active"
owners:
  - "@flyingrobots"
created: "2026-06-06"
updated: "2026-06-06"
---

<!-- markdownlint-disable-file MD025 -->

# V1-GP6 - Intelligent Import Repair And Starter Motion

## Linked Umbrella Issue

- [#63 - V1-GP6 - Intelligent Import Repair And Starter Motion](https://github.com/flyingrobots/tadpole/issues/63)

## Hill

By the end of this goalpost, Tadpole can help users start or repair an
animation timeline while clearly labeling whether data was imported from source
SVG, authored in Tadpole, suggested heuristically, or repaired from unsupported
source animation.

## Slice Budget

20 slices.

## User Stories

### Story 1: Static Starter Timelines

Issue: [#24 - Suggest starter timelines for static SVGs](https://github.com/flyingrobots/tadpole/issues/24)

A user importing a static SVG wants optional starter timeline suggestions so
that they are not left with a blank animation surface.

Proof:

- [ ] Suggestions are deterministic and inspectable.
- [ ] Suggestions are optional and editable before application.
- [ ] Suggestions never claim to be imported source truth.

Slice budget: 3.

### Story 2: Repair Suggestions

Issue: [#31 - Offer import repair suggestions for unsupported SVG motion](https://github.com/flyingrobots/tadpole/issues/31)

A user importing unsupported SVG animation wants Tadpole to offer safe repair
suggestions instead of only warning that something failed.

Proof:

- [ ] Repair suggestions cite unsupported source features.
- [ ] Preview does not mutate the timeline.
- [ ] Applying repair creates normal editable tracks.

Slice budget: 4.

### Story 3: Timeline Provenance

Issue: [#84 - Add Timeline Provenance Model](https://github.com/flyingrobots/tadpole/issues/84)

A user and agent need every track to say whether it was imported, authored,
suggested, or repaired so that generated help never masquerades as SVG source
truth.

Proof:

- [ ] Track provenance is runtime-backed and persisted where appropriate.
- [ ] UI labels provenance consistently.
- [ ] Save/import behavior preserves source-truth boundaries.

Slice budget: 4.

### Story 4: Repair Preview And Apply

Issue: [#85 - Preview And Apply Unsupported Animation Repair Suggestions](https://github.com/flyingrobots/tadpole/issues/85)

A user importing an unsupported SVG animation wants Tadpole to propose a safe
editable approximation that they can preview before applying.

Proof:

- [ ] Repair suggestions are deterministic.
- [ ] Preview does not mutate tracks until applied.
- [ ] Applying repair creates normal command-history entries.

Slice budget: 4.

### Story 5: Preservation Policy

Issue: [#86 - Define Unsupported Animation Preservation Policy](https://github.com/flyingrobots/tadpole/issues/86)

A user wants Tadpole to clearly preserve or remove unsupported animation nodes
according to policy so that save behavior is predictable.

Proof:

- [ ] Profile doc defines preserve, remove, and block behavior.
- [ ] Save warnings explain when unsupported source animation would be lost.
- [ ] Tests cover preserved and blocked unsupported nodes.

Slice budget: 3.

### Story 6: Inspectable Import Report

Issue: [#87 - Add Agent-Inspectable Import Report Schema](https://github.com/flyingrobots/tadpole/issues/87)

An agent needs a structured import report so that it can summarize imported
tracks, warnings, suggestions, and repairs without scraping pixels or prose.

Proof:

- [ ] Import report schema includes targets, tracks, warnings, profile
      categories, suggestions, and repair candidates.
- [ ] Browser and pure tests assert report facts.
- [ ] Export/debug panel exposes the report deterministically.

Slice budget: 2.

## Goalpost Checklist

- [ ] Slice 1: Reconcile existing starter timeline planner with provenance.
- [ ] Slice 2: Add starter suggestion profile categories.
- [ ] Slice 3: Add starter suggestion witness updates.
- [ ] Slice 4: Define repair candidate data model.
- [ ] Slice 5: Add unsupported animation to repair candidate conversion.
- [ ] Slice 6: Add repair preview UI.
- [ ] Slice 7: Add repair apply command.
- [ ] Slice 8: Add repair undo/redo behavior.
- [ ] Slice 9: Add track provenance classes.
- [ ] Slice 10: Add provenance UI labels and facts.
- [ ] Slice 11: Persist provenance where needed.
- [ ] Slice 12: Add source-truth preservation checks.
- [ ] Slice 13: Define preserve/remove/block policy in profile.
- [ ] Slice 14: Add save warning for unsupported source loss.
- [ ] Slice 15: Add tests for preserved unsupported nodes.
- [ ] Slice 16: Add import report schema.
- [ ] Slice 17: Expose report in debug/export panel.
- [ ] Slice 18: Add report browser witness.
- [ ] Slice 19: Update README and tutorial language.
- [ ] Slice 20: Run full intelligent-import validation and retrospective.

## Acceptance Criteria

- [ ] Umbrella issue [#63](https://github.com/flyingrobots/tadpole/issues/63)
      has all child story issues linked.
- [ ] Imported, authored, suggested, and repaired timelines are distinct.
- [ ] Repair suggestions are useful without compromising source truth.
