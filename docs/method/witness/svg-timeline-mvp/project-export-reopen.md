# Witness: SVG Timeline MVP Project Export Half-Gate

Verify the first half of Goal 5: project-level export JSON includes SVG source,
discovered targets, timeline settings, and tracks, and project JSON can be
validated from paste or file upload before restore behavior is added.

## Branch

- `cycles/UIUX_project-export-reopen`

## Browser Smoke

Run from a shell with the Tadpole dev server active:

```bash
cd /tmp/tadpole-playwright
node /Users/james/git/tadpole/docs/method/witness/svg-timeline-mvp/project-export-smoke.mjs
```

Expected output:

```text
project export browser smoke passed
```

Assertions covered:

- export payload version is `tadpole-project-1`
- export payload includes SVG label and sanitized SVG source
- export payload includes discovered target metadata for `UI Text` and
  `Tadpole Q`
- export payload includes timeline duration, current time, frame rate, and
  sample tracks
- malformed pasted project JSON surfaces a validation error
- current project export validates through the project import surface
- uploaded project JSON validates through the same import parser

## Local Checks

```bash
npm run check
npm run build
git diff --check
node --check docs/method/witness/svg-timeline-mvp/project-export-smoke.mjs
npx markdownlint-cli2 CHANGELOG.md \
  docs/method/design/svg-timeline-mvp/checklist.md \
  docs/method/witness/svg-timeline-mvp/project-export-reopen.md
```

## Acceptance

Goal 5 is half complete when users can export a project-level JSON payload and
the app can validate pasted or uploaded project JSON. Restoring SVG source,
timeline settings, tracks, and missing-target states remains intentionally open
for the next Goal 5 slices.
