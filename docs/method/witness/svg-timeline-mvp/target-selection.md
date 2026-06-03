# Witness: SVG Timeline MVP Target Selection

## Purpose

Verify the next SVG timeline MVP gate: selecting discovered SVG targets from
the rendered preview and syncing that target through editing controls.

## Environment

- Branch: `cycles/UIUX_svg-target-selection`
- Implementation base synced to `origin/main` at `219707e`
- Current review base merged from `origin/main` at `816992e`
- App URL: `http://localhost:5173/`

## Automated Browser Smoke

Command shape:

```bash
npm run dev

# In a temporary directory outside the repo:
npm install playwright @playwright/test
npx playwright install chromium
npx playwright test target-selection.spec.js --browser=chromium --reporter=line
```

Observed result:

```text
Browser smoke passed
```

Assertions covered:

- source-rendered SVG appears in `.preview-svg-host`
- target library populates from parsed SVG targets, including `UI Text` and
  `Tadpole Q`
- preview scrubber at `520ms` applies timeline values to the rendered `#ui`
  SVG element
- playback advances timeline time and updates the rendered `#ui` SVG element
- clicking rendered `#ui` selects that target
- selected target highlight class appears on `#ui`
- target library active chip, inspector fields, and new-track target all sync
  to `ui`
- clicking rendered `#accent` selects that target, updates the new-track target,
  and clears active track inspector state because no seeded track targets
  `accent`
- selecting a keyframe in the `Tadpole Q` opacity track resynchronizes the
  active target chip, selected target summary, and preview highlight to `q`

## Local Checks

- `npm run check`
- `npm run build`
- `npm audit --audit-level=moderate`

## Acceptance

Goal 3 is complete when preview clicks resolve to discovered SVG target IDs,
selected targets are visible in the preview, and the target library, new-track
controls, and inspector reflect the same target.
