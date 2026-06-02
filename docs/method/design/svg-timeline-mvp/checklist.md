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
- [ ] Verify the existing demo SVG still appears and target controls populate
      from the parsed SVG. Build passes; browser visual check is pending drift
      review.

## Goal 2: Bind Timeline Tracks To Rendered SVG Elements

- [ ] Bind the preview SVG container so timeline state can be applied to mounted
      SVG DOM nodes.
- [ ] Apply unmuted track values to SVG target elements at the current playhead
      time.
- [ ] Combine transform tracks per target for translate, scale, and rotation.
- [ ] Apply visual tracks for opacity, fill, stroke, and stroke width.
- [ ] Verify scrub and playback update the rendered SVG.

## Goal 3: Select SVG Elements

- [ ] Add delegated preview click handling for selecting SVG elements.
- [ ] Resolve clicked elements to discovered target IDs.
- [ ] Sync selected preview target with the target library, new-track controls,
      and inspector.
- [ ] Add a rough selected-target visual affordance in the preview.

## Goal 4: Import External SVGs

- [ ] Add a compact SVG file upload control.
- [ ] Add a paste/import path for raw SVG source.
- [ ] Re-run target discovery when new SVG source is loaded.
- [ ] Reset or reconcile timeline tracks when the SVG target set changes.
- [ ] Add a reset-to-sample SVG action.

## Goal 5: Export And Reopen Rough Projects

- [ ] Extend export JSON from timeline-only to project-level SVG plus timeline
      data.
- [ ] Include discovered target metadata in export.
- [ ] Add project JSON import.
- [ ] Restore SVG source, targets, timeline settings, and tracks from imported
      JSON.
- [ ] Handle missing target IDs visibly after import.

## Goal 6: Rough UX Hardening

- [ ] Add empty states for missing SVG, missing targets, and selected targets
      with no tracks.
- [ ] Add quick track creation actions from the selected target.
- [ ] Improve discovered target labels.
- [ ] Add a visible selected-target chip near the preview.
- [ ] Add a clear-tracks action for SVG changes.

## Goal 7: Cycle Documentation And Witness

- [ ] Update `CHANGELOG.md` with the SVG timeline MVP slice.
- [ ] Add witness notes after build and manual verification.
- [ ] Add retro notes when the cycle closes.
- [ ] Update `BEARING.md` if the current-state summary changes materially.
