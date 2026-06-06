---
title: "V1-GP4 - Native File Lifecycle"
legend: "V1"
lane: "design"
issue: "https://github.com/flyingrobots/tadpole/issues/61"
status: "active"
owners:
  - "@flyingrobots"
created: "2026-06-06"
updated: "2026-06-06"
---

<!-- markdownlint-disable-file MD025 -->

# V1-GP4 - Native File Lifecycle

## Linked Umbrella Issue

- [#61 - V1-GP4 - Native File Lifecycle](https://github.com/flyingrobots/tadpole/issues/61)

## Hill

By the end of this goalpost, users can open an SVG file, edit it, recover from
unsafe exits, and save or save as one SVG file with a clear fallback path when
direct file-system writes are unavailable.

## Slice Budget

18 slices.

## User Stories

### Story 1: Open Local SVG

Issue: [#75 - Open SVG From Local File Handle](https://github.com/flyingrobots/tadpole/issues/75)

A user wants to open an SVG from disk so that Tadpole starts from the actual
file they intend to edit.

Proof:

- [ ] File picker supports SVG only.
- [ ] Opened file label and dirty state are visible.
- [ ] Unsupported browser fallback still supports upload and paste.

Slice budget: 4.

### Story 2: Save And Save As

Issue: [#76 - Save And Save As One SVG File](https://github.com/flyingrobots/tadpole/issues/76)

A user wants Save and Save As to write one SVG file so that Tadpole does not
require project sidecars for normal use.

Proof:

- [ ] Save writes to the existing file handle when available.
- [ ] Save As chooses a new SVG destination.
- [ ] Download fallback emits the same SVG text when file handles are
      unavailable.

Slice budget: 5.

### Story 3: Dirty State And Recovery

Issue: [#77 - Add Dirty State And Unsaved Changes Recovery](https://github.com/flyingrobots/tadpole/issues/77)

A user wants explicit dirty-state protection so that import, reset, close, or
navigation cannot discard work silently.

Proof:

- [ ] Dirty state changes after timeline, import, and layout-relevant edits.
- [ ] Destructive flows require confirm, save, or discard.
- [ ] Recovery path is covered by browser witnesses.

Slice budget: 5.

### Story 4: Recent Session Recovery

Issue: [#78 - Add Recent Session Recovery](https://github.com/flyingrobots/tadpole/issues/78)

A user wants Tadpole to recover their last local editing session so that
accidental reloads do not destroy progress.

Proof:

- [ ] Session snapshot is local and versioned.
- [ ] Recovery prompt distinguishes source SVG, saved SVG, and unsaved edits.
- [ ] Users can discard recovery state deliberately.

Slice budget: 4.

## Goalpost Checklist

- [ ] Slice 1: Add file-source state model.
- [ ] Slice 2: Add Open SVG command using file handle when available.
- [ ] Slice 3: Add fallback upload/paste path compatibility.
- [ ] Slice 4: Add opened-file status facts.
- [ ] Slice 5: Add Save command for existing file handles.
- [ ] Slice 6: Add Save As command.
- [ ] Slice 7: Add download fallback adapter.
- [ ] Slice 8: Prove saved SVG text is identical across direct save and
      fallback download.
- [ ] Slice 9: Add dirty-state model.
- [ ] Slice 10: Mark dirty for timeline edits.
- [ ] Slice 11: Mark dirty for imports, resets, and project restores.
- [ ] Slice 12: Add unsaved changes dialog.
- [ ] Slice 13: Cover destructive flows with browser witnesses.
- [ ] Slice 14: Add local session snapshot.
- [ ] Slice 15: Add recovery prompt.
- [ ] Slice 16: Add discard recovery command.
- [ ] Slice 17: Add compatibility docs for browser file APIs.
- [ ] Slice 18: Run full file-lifecycle validation and retrospective.

## Acceptance Criteria

- [ ] Umbrella issue [#61](https://github.com/flyingrobots/tadpole/issues/61)
      has all child story issues linked.
- [ ] One SVG file remains the durable source of truth.
- [ ] Users never lose unsaved work without an explicit choice.
