# Witness: Runnable Animation Export

Verify Goal 8: Tadpole exports a self-contained runnable HTML animation
artifact from the current sanitized SVG and timeline tracks, and the artifact
animates outside the editor.

## Command

```bash
cd /tmp/tadpole-playwright
node /Users/james/git/tadpole/docs/method/witness/svg-timeline-mvp/runnable-export-smoke.mjs
```

## Proof

The browser witness:

- opens the editor at `http://localhost:5173/`;
- reads runnable output from `[data-tadpole-runnable-output]`;
- asserts the output version is `tadpole-runnable-html-1`;
- asserts the artifact contains the sanitized SVG stage and sample track data;
- loads the artifact in a separate browser page with `page.setContent`;
- waits for the exported runtime to mark itself as running;
- observes `#ui` transform changing after runtime playback advances;
- observes `#q` opacity changing after runtime playback advances;
- checks both the editor page and artifact page for browser errors.

## Acceptance Link

Goal 8 is complete when the exported artifact can animate supported Tadpole
track properties outside Tadpole without using the editor DOM.
