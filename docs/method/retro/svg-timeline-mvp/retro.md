# Retro: SVG Timeline MVP

## Outcome

Closed the first rough SVG timeline editing arc. The editor moved from a fixed
demo preview into a source-rendered SVG workflow with imported SVGs, discovered
targets, target-bound tracks, project JSON export/restore, rough empty-state
hardening, runnable HTML export for use outside Tadpole, and supported SMIL
animation import into editable tracks.

The rough SVG timeline editing arc is now complete through Goal 9. Follow-on
work should widen import intelligence and improve editing ergonomics without
weakening the sanitizer boundary.

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
- Runnable HTML animation export generated from sanitized SVG source and active
  timeline tracks, with a browser witness that loads the artifact outside the
  editor.
- Supported SMIL `<animate>` and `<animateTransform>` input is converted into
  editable Tadpole tracks, while unsupported CSS/Web Animations inputs are
  reported instead of executed.
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
- Browser witness:
  `docs/method/witness/svg-timeline-mvp/runnable-export-smoke.mjs`
- Browser witness:
  `docs/method/witness/svg-timeline-mvp/animation-import-smoke.mjs`
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

Goal 8 runnable export closure uses:

```bash
npm run check
npm run build
cd /tmp/tadpole-playwright
node /Users/james/git/tadpole/docs/method/witness/svg-timeline-mvp/runnable-export-smoke.mjs
node /Users/james/git/tadpole/docs/method/witness/svg-timeline-mvp/project-export-smoke.mjs
npx --yes markdownlint-cli2 \
  CHANGELOG.md \
  BEARING.md \
  docs/method/design/svg-timeline-mvp/checklist.md \
  docs/method/design/svg-timeline-mvp/runnable-animation-export.md \
  docs/method/witness/svg-timeline-mvp/runnable-animation-export.md \
  docs/method/retro/svg-timeline-mvp/retro.md
ruby -e 'require "yaml"; YAML.load_file(".github/ISSUE_TEMPLATE/task.yml")'
git diff --check
```

Goal 9 animation import closure uses:

```bash
npm run check
npm run build
cd /tmp/tadpole-playwright
TADPOLE_APP_URL=http://localhost:5174/ \
  node /Users/james/git/tadpole/docs/method/witness/svg-timeline-mvp/animation-import-smoke.mjs
npx --yes markdownlint-cli2 \
  CHANGELOG.md \
  BEARING.md \
  docs/method/design/svg-timeline-mvp/checklist.md \
  docs/method/design/svg-timeline-mvp/svg-animation-timeline-import.md \
  docs/method/witness/svg-timeline-mvp/animation-import.md \
  docs/method/retro/svg-timeline-mvp/retro.md
git diff --check
```

## Follow-Up

- Static SVG starter timeline suggestions remain separate follow-on work.
- Expand animation import beyond the first safe SMIL subset.
- Consider SVG-only runnable export after HTML artifact behavior is proven.
- Add layer-tree navigation if target-library chips are not enough for complex
  imported SVGs.
- Add undo/redo once timeline and import operations become more destructive.
