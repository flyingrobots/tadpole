# SVG Timeline MVP Slice Checklist

## Goal 1: Use A Real SVG As The Timeline Target

- [x] Capture a clean baseline and keep this work as a follow-up change without
      amending existing commits.
- [x] Move the current demo SVG into source-string data so the preview is no
      longer hard-coded as Svelte SVG nodes.
- [x] Parse the SVG source with browser DOM APIs and discover editable targets
      from SVG elements.
- [x] Replace the static target catalog with discovered SVG targets while
      preserving existing timeline controls.
- [x] Render the SVG source in the live preview through the imported/source SVG
      path.
- [x] Verify the existing demo SVG still appears and target controls populate
      from the parsed SVG. Browser smoke confirms `UI Text` and `Tadpole Q`
      target chips from the source-rendered SVG.

## Goal 2: Bind Timeline Tracks To Rendered SVG Elements

- [x] Bind the preview SVG container so timeline state can be applied to mounted
      SVG DOM nodes.
- [x] Apply unmuted track values to SVG target elements at the current playhead
      time.
- [x] Combine transform tracks per target for translate, scale, and rotation.
- [x] Apply visual tracks for opacity, fill, stroke, and stroke width.
- [x] Verify scrub and playback update the rendered SVG in browser. Browser
      smoke confirms playback advances time and the preview scrubber moves `#ui`
      through the rendered SVG DOM.

## Goal 3: Select SVG Elements

- [x] Add delegated preview click handling for selecting SVG elements.
- [x] Resolve clicked elements to discovered target IDs.
- [x] Sync selected preview target with the target library, new-track controls,
      and inspector.
- [x] Add a rough selected-target visual affordance in the preview.

## Goal 4: Import External SVGs

- [x] Add a compact SVG file upload control.
- [x] Add a paste/import path for raw SVG source.
- [x] Re-run target discovery when new SVG source is loaded.
- [x] Reset or reconcile timeline tracks when the SVG target set changes.
      Incompatible tracks are removed when imported targets no longer exist.
- [x] Add a reset-to-sample SVG action that restores the bundled SVG and seeded
      sample tracks.

## Goal 5: Export And Reopen Rough Projects

- [x] Extend export JSON from timeline-only to project-level SVG plus timeline
      data.
- [x] Include discovered target metadata in export.
- [x] Add project JSON import with validation for pasted/uploaded project JSON.
- [x] Restore SVG source, targets, timeline settings, and tracks from imported
      JSON.
- [x] Handle missing target IDs visibly after import.

## Goal 6: Rough UX Hardening

- [x] Add empty states for missing SVG, missing targets, and selected targets
      with no tracks.
- [x] Add quick track creation actions from the selected target.
- [x] Improve discovered target labels.
- [x] Add a visible selected-target chip near the preview.
- [x] Add a clear-tracks action for SVG changes.

## Goal 7: Cycle Documentation And Witness

- [x] Update `CHANGELOG.md` with the SVG timeline MVP slice.
- [x] Add witness notes after build and browser verification.
- [x] Add retro notes when the cycle closes.
- [x] Update `BEARING.md` if the current-state summary changes materially.

## Goal 8: Export Runnable Animation

- [x] Generate a self-contained runnable animation artifact from the current
      sanitized SVG and non-muted timeline tracks.
- [x] Add an inspectable workbench surface for copying runnable output.
- [x] Prove exported output runs outside Tadpole with a browser witness.
- [x] Update changelog, witness docs, BEARING, and retro notes.

## Goal 9: Import Existing SVG Animation Timelines

- [x] Parse existing SVG SMIL/CSS/Web Animations where safe and map them into
      Tadpole tracks.
- [x] Preserve the current import sanitizer trust boundary while extracting
      animation intent.
- [x] Prove imported animation timelines become editable Tadpole keyframes.
