# Rough UX Hardening Witness

Verify the Goal 6 half-gate for rough UX hardening.

## Browser Smoke

Run the app from the repository root:

```bash
npm run dev
```

Run the witness from the Playwright workspace:

```bash
cd /tmp/tadpole-playwright
node /Users/james/git/tadpole/docs/method/witness/svg-timeline-mvp/rough-ux-hardening-smoke.mjs
```

Expected output:

```text
rough UX hardening browser smoke passed
```

## Coverage

The smoke verifies:

- A no-target SVG import shows an explicit target-library empty state.
- The timeline explains that editable SVG targets are required before track
  creation.
- A selected SVG target with no tracks exposes selected-target quick actions.
- The `Create Opacity track for Solo Target` quick action creates a bound track.
- SVG `<title>` metadata is used for discovered target labels.

## Half-Gate Status

Goal 6 is halfway complete when the editor proves empty states, selected-target
quick track creation, and improved discovered target labels. Remaining slices
are the selected-target preview chip and clear-tracks recovery action.
