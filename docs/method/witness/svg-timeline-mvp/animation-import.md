# Witness: SVG Animation Timeline Import

Goal 9 proves that Tadpole can read supported animation intent from raw SVG
markup before sanitization, remove the original executable animation nodes, and
turn the motion into editable timeline tracks.

## Covered Behavior

- Raw SVG paste imports supported SMIL `<animate>` nodes for `opacity` and
  `fill`.
- Raw SVG paste imports supported SMIL `<animateTransform>` nodes for
  `translate` and `rotate`.
- Imported animation nodes become normal Tadpole tracks and editable keyframes.
- Unsupported CSS animation, Web Animations script, and `<animateMotion>` input
  are shown as import warnings.
- The rendered preview and project export keep sanitized SVG without animation,
  style, or script nodes.
- Editing an imported keyframe updates project JSON export.
- Unitless SVG clock values import as seconds.
- Unsupported discrete timing is warned and not imported as linear motion.
- Failed file imports clear stale animation warning UI.
- Unsafe explicit animation target references are warned and not retargeted to
  parent elements.
- One-argument `translate` imports as x-only motion with no synthetic y track.

## Command

Run the app, then execute:

```bash
cd /tmp/tadpole-playwright
TADPOLE_APP_URL=http://localhost:5174/ \
  node /Users/james/git/tadpole/docs/method/witness/svg-timeline-mvp/animation-import-smoke.mjs
```

The URL may be `http://localhost:5173/` when Vite does not need to choose a
fallback port.

## Result

The witness prints:

```text
animation import browser smoke passed
```
