# Witness Packet: Track Filter/Sort + Keyframe Navigation

- Branch: `cycles/UIUX_timeline-controls-polish`
- Date: 2026-05-31
- Environment: local UI smoke test

## Expected checks

- UI
  - Drawer filter box accepts text and narrows track list immediately.
  - Sort controls switch between manual / target / property order.
  - `Show selected track only` still enforces single-track visibility after
    filtering.
  - Status chip updates to the current visible track count.
- Keyframes
  - `,` and `.` are wired in global keyboard handler.
  - Toolbar buttons for Prev/Next keyframe appear and are disabled when no
    selected track keyframes exist.
  - Jump actions move playhead to a keyframe on the selected track and update
    selected keyframe.

## Commands executed (manual)

- Start dev stack: `npm run dev`
- Open UI and confirm:
  - track filter input filters list
  - target/property sort buttons are active/inactive
  - keyframe nav via toolbar and `,`/`.` jumps while scrubbing
