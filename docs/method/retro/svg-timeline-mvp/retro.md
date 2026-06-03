# Retro: SVG Timeline MVP

## Outcome

Closed the first rough SVG timeline editing arc. The editor moved from a fixed
demo preview into a source-rendered SVG workflow with imported SVGs, discovered
targets, target-bound tracks, project JSON export/restore, and rough empty-state
hardening.

Goal 8 remains the next product gate: export a runnable animation that works
outside Tadpole.

## What shipped

- Source-rendered SVG preview and target discovery from ID-bearing SVG elements.
- Timeline values applied to rendered SVG DOM targets at the playhead.
- Preview and target-library selection synchronized with track creation.
- SVG upload, raw paste import, sanitizer guards, and incompatible-track
  reconciliation.
- Project-level JSON export/restore for SVG source, targets, timeline settings,
  tracks, and missing-target warnings.
- Rough UX states for blank SVG input, no editable targets, no tracks, selected
  targets with no tracks, preview selected-target context, and clear-tracks
  recovery.
- Cycle-start process docs now require non-draft PRs, matching repo
  instructions.

## What went well

- Small goal gates kept the editor shippable after each PR.
- Browser witnesses caught real state risks: stale async SVG imports, unsafe
  SVG animation nodes, project validation gaps, and stale warning state.
- The shared track creation and selection helpers made later UX hardening
  cheaper than expected.
- PR self-review loops improved the import/project trust boundary instead of
  only polishing copy.

## What was difficult

- Svelte reactive export state needed care so project JSON reflected runtime
  truth rather than stale helper output.
- Imported SVGs create several adjacent empty states; tests had to distinguish
  blank SVG input, zero editable targets, and zero tracks.
- Review automation rate limits made some merge gates noisy, so local witness
  evidence and GraphQL review-thread checks mattered.
- The single-screen editor is dense enough that future complexity probably
  needs better target navigation, not just more buttons.

## Evidence

- Browser witness: `docs/method/witness/svg-timeline-mvp/import-gate-smoke.mjs`
- Browser witness:
  `docs/method/witness/svg-timeline-mvp/project-export-smoke.mjs`
- Browser witness:
  `docs/method/witness/svg-timeline-mvp/rough-ux-hardening-smoke.mjs`
- Roadmap checklist:
  `docs/method/design/svg-timeline-mvp/checklist.md`

## Validation Commands

Recent Goal 6 closure used:

```bash
npm run check
npm run build
node docs/method/witness/svg-timeline-mvp/rough-ux-hardening-smoke.mjs
node docs/method/witness/svg-timeline-mvp/import-gate-smoke.mjs
node docs/method/witness/svg-timeline-mvp/project-export-smoke.mjs
```

Goal 7 documentation closure uses:

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

## Follow-Up

- Goal 8: export runnable animation output.
- Add layer-tree navigation if target-library chips are not enough for complex
  imported SVGs.
- Add undo/redo once timeline and import operations become more destructive.
