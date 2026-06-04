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
- Reset Sample restores the sample timeline duration after a longer SVG import.
- Unsupported discrete timing is warned and not imported as linear motion.
- Failed file imports clear stale animation warning UI.
- Unsafe explicit `href` and `xlink:href` animation target references are warned
  and not retargeted to parent elements.
- One-argument `translate` imports as x-only motion with no synthetic y track.
- Imported fill/stroke colors interpolate when source values are supported CSS
  hex or RGB colors.
- Non-uniform scale and pivoted rotate imports warn instead of dropping
  unsupported transform semantics.
- Finite repeats and malformed transform values warn instead of shortening or
  inventing motion.
- RGBA color values warn instead of importing without alpha interpolation.
- Overlong transform value arity warns instead of dropping extra components.
- Additive and accumulated SMIL animations warn instead of importing as absolute
  motion.
- One-shot SVG imports clear looping, while indefinite imports preserve looping.

## Command

After `npm install`, run the app, then execute from the repository root:

```bash
TADPOLE_APP_URL=http://localhost:5174/ \
  node docs/method/witness/svg-timeline-mvp/animation-import-smoke.mjs
```

The URL may be `http://localhost:5173/` when Vite does not need to choose a
fallback port.

## Result

The witness prints:

```text
animation import browser smoke passed
```
