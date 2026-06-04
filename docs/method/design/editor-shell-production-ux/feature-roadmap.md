---
title: "G10-G19 - Editor Shell Production UX Feature Roadmap"
lane: "design"
goal: "Goals 10-19"
issue: "https://github.com/flyingrobots/tadpole/issues/32"
pr: "https://github.com/flyingrobots/tadpole/pull/27"
status: "draft"
owners:
  - "@flyingrobots"
created: "2026-06-03"
updated: "2026-06-03"
---

<!-- markdownlint-disable-next-line MD025 -->
# G10-G19 - Editor Shell Production UX Feature Roadmap

## Linked Issue

- [G10-001 - Canvas-First Editor Shell](https://github.com/flyingrobots/tadpole/issues/32)

## Decision Summary

The editor-shell production UX design breaks into ten implementation feature
goals. Each goal gets its own GitHub issue and design doc so implementation can
move in reviewable slices without expanding a single omnibus cycle.

## Feature Count

The design doc covers ten implementation features:

| Goal | Feature | Issue | Design doc |
| ---- | ------- | ----- | ---------- |
| Goal 10 | Canvas-first editor shell | [#32](https://github.com/flyingrobots/tadpole/issues/32) | [canvas-first-editor-shell.md](features/canvas-first-editor-shell.md) |
| Goal 11 | Menu commands and document dialogs | [#33](https://github.com/flyingrobots/tadpole/issues/33) | [menu-commands-and-document-dialogs.md](features/menu-commands-and-document-dialogs.md) |
| Goal 12 | Contextual panels and panel host | [#34](https://github.com/flyingrobots/tadpole/issues/34) | [contextual-panels-and-panel-host.md](features/contextual-panels-and-panel-host.md) |
| Goal 13 | Target/property timeline stacks | [#35](https://github.com/flyingrobots/tadpole/issues/35) | [target-property-timeline-stacks.md](features/target-property-timeline-stacks.md) |
| Goal 14 | Playback work area controls | [#36](https://github.com/flyingrobots/tadpole/issues/36) | [playback-work-area-controls.md](features/playback-work-area-controls.md) |
| Goal 15 | SVG-native save roundtrip | [#37](https://github.com/flyingrobots/tadpole/issues/37) | [svg-native-save-roundtrip.md](features/svg-native-save-roundtrip.md) |
| Goal 16 | Editor command model and history | [#38](https://github.com/flyingrobots/tadpole/issues/38) | [editor-command-model-and-history.md](features/editor-command-model-and-history.md) |
| Goal 17 | Layers panel navigation | [#39](https://github.com/flyingrobots/tadpole/issues/39) | [layers-panel-navigation.md](features/layers-panel-navigation.md) |
| Goal 18 | Inspector editing surface | [#40](https://github.com/flyingrobots/tadpole/issues/40) | [inspector-editing-surface.md](features/inspector-editing-surface.md) |
| Goal 19 | Keyboard accessibility witnesses | [#41](https://github.com/flyingrobots/tadpole/issues/41) | [keyboard-accessibility-witnesses.md](features/keyboard-accessibility-witnesses.md) |

Deferred ideas remain tracked separately:

- [#24](https://github.com/flyingrobots/tadpole/issues/24) starter timelines
  for static SVGs.
- [#25](https://github.com/flyingrobots/tadpole/issues/25) multi-select SVG
  targets.
- Curves mode and motion-path editing remain follow-on work after Goal 13 lands.

## Roadmap Order

```mermaid
flowchart LR
  G10[Goal 10 Shell] --> G11[Goal 11 Menus]
  G11 --> G12[Goal 12 Panels]
  G12 --> G13[Goal 13 Timeline Stacks]
  G13 --> G14[Goal 14 Playback Work Area]
  G14 --> G15[Goal 15 SVG Save]
  G15 --> G16[Goal 16 Commands History]
  G16 --> G17[Goal 17 Layers]
  G17 --> G18[Goal 18 Inspector]
  G18 --> G19[Goal 19 Keyboard Witnesses]
```

## Linked Invariants

- The saved document is one SVG file.
- Runtime behavior is the proof.
- Browser witnesses are required for visual editor workflows.
- Docs describe evidence; they do not replace evidence.
- Imported SVG remains untrusted until parsed, sanitized, and validated.

## Validation Plan

```bash
npx --yes markdownlint-cli2 \
  docs/method/design/editor-shell-production-ux/feature-roadmap.md \
  docs/method/design/editor-shell-production-ux/features/*.md
git diff --check
```

## Retrospective

What changed from the design:

- TBD

What the tests proved:

- TBD

What remains open:

- TBD
