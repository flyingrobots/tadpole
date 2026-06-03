# Witness: SVG Timeline MVP External SVG Import

## Purpose

Verify the next SVG timeline MVP gate: importing external SVG source by file
upload or raw paste, rediscovering editable targets, reconciling tracks, and
returning to the bundled sample SVG.

## Environment

- Branch: `cycles/UIUX_svg-import-gate`
- Base synced to `origin/main` at `a4916b9`
- App URL: `http://localhost:5173/`
- Browser smoke runner: Playwright `1.60.0` installed in `/tmp/tadpole-playwright`

## Automated Browser Smoke

Command shape:

```bash
npm run dev

# In /tmp/tadpole-playwright:
npm install playwright@1.60.0
node --input-type=module <<'NODE'
// Inline Playwright import-gate smoke script.
NODE
```

Observed result:

```text
import gate browser smoke passed
```

Assertions covered:

- bundled sample SVG renders and exposes `UI Text` and `Tadpole Q` targets
- raw pasted rocket SVG replaces the preview
- pasted rocket SVG target library includes `Flame` and `Window`
- paste import reports `0 tracks kept, 3 removed` when sample tracks no longer
  match imported target IDs
- imported `#flame` can be selected directly from the rendered preview
- selected-target inspector updates to `flame`
- new track creation after import creates a `Flame • fill` track
- file upload import loads `badge.svg`
- uploaded badge SVG target library includes `Badge Rect` and `Go Text`
- file upload reports `0 tracks kept, 1 removed` after reconciling the
  previously created `flame` track
- valid SVG with no ID-bearing targets renders, clears tracks, shows the
  no-target state, and disables new-track creation
- invalid raw SVG paste surfaces an import error without replacing the last
  valid SVG
- reset-to-sample restores the bundled sample SVG, target library, and three
  seeded sample tracks
- sample timeline still applies the `#ui` transform after reset
- browser run completed with no page errors or browser console errors

## Local Checks

- `npm run check`
- `npm run build`
- `git diff --check`

## Acceptance

Goal 4 is complete when users can import SVGs by file upload and raw paste,
target discovery refreshes for the active SVG, timeline tracks do not silently
point at missing targets after an SVG change, and the bundled sample can be
restored in one action.
