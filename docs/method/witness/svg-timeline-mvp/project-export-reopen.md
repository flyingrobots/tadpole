# Witness: SVG Timeline MVP Project Export And Reopen

Verify Goal 5: project-level export JSON includes SVG source, discovered
targets, timeline settings, and tracks; project JSON can be validated from
paste or file upload; and valid project JSON can restore the editable SVG,
timeline settings, and compatible tracks while visibly reporting missing target
IDs.

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
- export payload includes snap step timeline settings
- malformed pasted project JSON surfaces a validation error
- current project export validates through the project import surface
- uploaded project JSON validates through the same import parser
- pasted project JSON restores a different SVG source and target library
- project restore applies restored timeline duration, current time, frame rate,
  snap step, and compatible tracks
- restored tracks apply to the rendered SVG at the restored current time
- tracks pointing at missing SVG target IDs are skipped from restored state
- skipped target IDs are reported visibly in the project import panel

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

Goal 5 is complete when users can export a project-level JSON payload, validate
pasted or uploaded project JSON, restore a project JSON payload into the active
SVG/timeline editor state, and see any skipped missing-target track IDs.
