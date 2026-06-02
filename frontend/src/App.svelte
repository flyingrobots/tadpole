<script lang="ts">
  import { onDestroy, onMount, tick as nextDomUpdate } from "svelte";

  type FontRecord = {
    file: string;
    family: string;
    format: string;
    url: string;
  };

  type AnimationTarget = {
    id: string;
    name: string;
    kind: "group" | "path" | "text" | "shape";
  };

  type AnimationProperty = "x" | "y" | "scale" | "rotation" | "opacity" | "fill" | "stroke" | "strokeWidth";
  type TrackSortMode = "manual" | "target" | "property";

  type KeyframeEasing = "linear" | "power1.inOut" | "power2.out" | "power3.inOut" | "expo.out" | "back.inOut";

  type Keyframe = {
    id: string;
    time: number;
    value: string;
    easing: KeyframeEasing;
  };

  type PlayheadNeighborhood = {
    at: Keyframe | null;
    previous: Keyframe | null;
    next: Keyframe | null;
  };

  type DraggingKeyframe = {
    trackId: string;
    keyframeId: string;
    lane: HTMLDivElement;
  } | null;

  type TimelineTrack = {
    id: string;
    targetId: string;
    property: AnimationProperty;
    keyframes: Keyframe[];
    muted: boolean;
  };

  type PropertyDefinition = {
    id: AnimationProperty;
    label: string;
    kind: "number" | "color";
    defaultValue: string;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    snap?: number;
  };

  const softwareBase = "CO + UI";

  // Open Props palette state.
  let fonts: FontRecord[] = [];
  let loading = true;
  let error = "";
  let paletteHue = 250;
  let paletteChroma = 0.15;
  let paletteRotate = 0;
  const palettePresets = [
    { name: "Coqui", hue: 34, chroma: 0.2, rotate: 2 },
    { name: "Ocean", hue: 210, chroma: 0.17, rotate: 0 },
    { name: "Mint", hue: 155, chroma: 0.18, rotate: 0 },
    { name: "Amber", hue: 48, chroma: 0.2, rotate: 0 },
    { name: "Graphite", hue: 250, chroma: 0.08, rotate: 0 },
  ];
  const drawerWidthPresets = [228, 300, 380, 460, 560, 660];
  const timelineDurationPresets = [500, 800, 1200, 1600, 2200, 3000];
  const minGridDivisions = 5;
  const maxGridDivisions = 24;
  const defaultGridDivisions = 12;

  // Animation timeline state.
  const easingModes: KeyframeEasing[] = ["linear", "power1.inOut", "power2.out", "power3.inOut", "expo.out", "back.inOut"];
  const propertyCatalog: PropertyDefinition[] = [
    { id: "x", label: "Translate X", kind: "number", defaultValue: "0", min: -220, max: 220, step: 1, unit: "px", snap: 1 },
    { id: "y", label: "Translate Y", kind: "number", defaultValue: "0", min: -220, max: 220, step: 1, unit: "px", snap: 1 },
    { id: "scale", label: "Scale", kind: "number", defaultValue: "1", min: 0.2, max: 2.2, step: 0.05 },
    { id: "rotation", label: "Rotate", kind: "number", defaultValue: "0", min: -360, max: 360, step: 1, unit: "°", snap: 1 },
    { id: "opacity", label: "Opacity", kind: "number", defaultValue: "1", min: 0, max: 1, step: 0.01 },
    { id: "fill", label: "Fill", kind: "color", defaultValue: "var(--color-6)" },
    { id: "stroke", label: "Stroke", kind: "color", defaultValue: "var(--color-4)" },
    { id: "strokeWidth", label: "Stroke Width", kind: "number", defaultValue: "1", min: 0.5, max: 8, step: 0.25, unit: "px", snap: 0.25 },
  ];
  const properties: AnimationProperty[] = propertyCatalog.map((property) => property.id);
  const transformProperties: AnimationProperty[] = ["x", "y", "scale", "rotation"];
  const propertyById = new Map<AnimationProperty, PropertyDefinition>(
    propertyCatalog.map((property): [AnimationProperty, PropertyDefinition] => [property.id, property]),
  );
  const numericProperties = new Set(properties.filter((property) => propertyById.get(property)?.kind === "number"));
  type PreviewStyle = {
    transform: string;
    opacity: string;
    fill: string;
    stroke: string;
    strokeWidth: string;
  };
  type PreviewStyleProperty =
    | "transform"
    | "transform-origin"
    | "transform-box"
    | "opacity"
    | "fill"
    | "stroke"
    | "stroke-width";
  type OriginalInlineStyle = {
    value: string;
    priority: string;
  };

  const defaultSvgSource = `<svg class="preview-svg" viewBox="0 0 420 180" aria-label="Logo Animation Preview" xmlns="http://www.w3.org/2000/svg">
  <g id="logo" data-tadpole-name="Logo Group">
    <g id="q" data-tadpole-name="Tadpole Q" fill="var(--color-6)" stroke="var(--color-9)" stroke-width="1.2">
      <ellipse cx="82" cy="88" rx="35" ry="38" fill="none" />
      <ellipse cx="82" cy="88" rx="18" ry="20" />
      <path d="M116 72 C132 66, 132 110, 116 104" />
    </g>
    <text
      id="co"
      class="preview-text"
      data-tadpole-name="CO Text"
      x="140"
      y="72"
      font-size="44"
      font-family="var(--font-sans)"
      font-weight="700"
      fill="var(--color-6)"
    >CO</text>
    <text
      id="ui"
      class="preview-text"
      data-tadpole-name="UI Text"
      x="150"
      y="114"
      font-size="44"
      font-family="var(--font-sans)"
      font-weight="700"
      fill="var(--color-6)"
    >UI</text>
    <path
      id="arc"
      data-tadpole-name="Tadpole Arc"
      d="M154 104 C183 44 252 44 282 104"
      fill="none"
      stroke="var(--color-9)"
      stroke-width="2.5"
      stroke-linecap="round"
    />
    <path
      id="accent"
      data-tadpole-name="Arrow Accent"
      d="M274 102 L292 86 L292 118 Z"
      fill="var(--color-6)"
      stroke="var(--color-9)"
      stroke-width="1.2"
    />
  </g>
</svg>`;
  const selectableSvgSelector = ["svg", "g", "path", "text", "rect", "circle", "ellipse", "line", "polyline", "polygon"].join(",");
  const blockedSvgElements = new Set(["script", "style", "foreignobject", "iframe", "object", "embed", "link", "meta"]);
  const strictReferenceAttributeNames = new Set(["href", "src", "xlink:href"]);
  const urlStyleAttributeNames = new Set([
    "clip-path",
    "cursor",
    "fill",
    "filter",
    "marker-end",
    "marker-mid",
    "marker-start",
    "mask",
    "stroke",
  ]);
  const safeStyleProperties = new Set([
    "display",
    "fill",
    "fill-opacity",
    "font-family",
    "font-size",
    "font-style",
    "font-weight",
    "letter-spacing",
    "opacity",
    "stroke",
    "stroke-dasharray",
    "stroke-dashoffset",
    "stroke-linecap",
    "stroke-linejoin",
    "stroke-miterlimit",
    "stroke-opacity",
    "stroke-width",
    "transform",
    "transform-box",
    "transform-origin",
    "visibility",
  ]);
  const unsafeCssValuePattern = /(?:url\s*\(|@import|expression\s*\(|(?:java|vb)script:|data:|https?:|\/\/)/i;
  const externalReferencePattern = /(?:(?:java|vb)script:|data:|https?:|\/\/)/i;
  const cssUrlReferencePattern = /url\s*\(\s*["']?([^"')]+)["']?\s*\)/gi;
  const localReferencePattern = /^(?:#[-\w:.]+|url\(#[-\w:.]+\))$/;
  const previewTrackedStyleProperties: PreviewStyleProperty[] = [
    "transform",
    "transform-origin",
    "transform-box",
    "opacity",
    "fill",
    "stroke",
    "stroke-width",
  ];

  const svgKindFromTag = (tagName: string): AnimationTarget["kind"] => {
    const tag = tagName.toLowerCase();
    if (tag === "g" || tag === "svg") {
      return "group";
    }
    if (tag === "path") {
      return "path";
    }
    if (tag === "text") {
      return "text";
    }
    return "shape";
  };

  const nameFromId = (id: string): string =>
    id
      .replace(/[-_]+/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  const nameFromSvgElement = (element: Element, id: string): string => {
    const explicitName = element.getAttribute("data-tadpole-name") ?? element.getAttribute("aria-label");
    if (explicitName?.trim()) {
      return explicitName.trim();
    }

    if (element.tagName.toLowerCase() === "text") {
      const textLabel = element.textContent?.trim();
      if (textLabel) {
        return `${textLabel} Text`;
      }
    }

    return nameFromId(id) || id;
  };

  const isSafeSvgReference = (value: string): boolean => {
    if (value === "") {
      return true;
    }
    return localReferencePattern.test(value);
  };

  const hasUnsafeSvgReference = (value: string): boolean => {
    if (externalReferencePattern.test(value)) {
      return true;
    }

    return Array.from(value.matchAll(cssUrlReferencePattern)).some((match) => !isSafeSvgReference(match[1]?.trim() ?? ""));
  };

  const sanitizeStyleAttribute = (value: string): string => {
    return value
      .split(";")
      .map((declaration) => declaration.trim())
      .filter(Boolean)
      .reduce<string[]>((safeDeclarations, declaration) => {
        const separatorIndex = declaration.indexOf(":");
        if (separatorIndex <= 0) {
          return safeDeclarations;
        }

        const property = declaration.slice(0, separatorIndex).trim().toLowerCase();
        const propertyValue = declaration.slice(separatorIndex + 1).trim();
        if (!safeStyleProperties.has(property) || unsafeCssValuePattern.test(propertyValue)) {
          return safeDeclarations;
        }

        safeDeclarations.push(`${property}: ${propertyValue}`);
        return safeDeclarations;
      }, [])
      .join("; ");
  };

  const discoverSvgTargets = (source: string): AnimationTarget[] => {
    if (typeof DOMParser === "undefined") {
      return [];
    }

    const doc = new DOMParser().parseFromString(source, "image/svg+xml");
    if (doc.querySelector("parsererror")) {
      return [];
    }

    const seen = new Set<string>();
    return Array.from(doc.querySelectorAll(selectableSvgSelector)).reduce<AnimationTarget[]>((targets, element) => {
      const id = element.getAttribute("id")?.trim();
      if (!id || seen.has(id)) {
        return targets;
      }

      seen.add(id);
      targets.push({
        id,
        name: nameFromSvgElement(element, id),
        kind: svgKindFromTag(element.tagName),
      });
      return targets;
    }, []);
  };

  const sanitizeSvgSource = (source: string): string => {
    if (typeof DOMParser === "undefined" || typeof XMLSerializer === "undefined") {
      return "";
    }

    const doc = new DOMParser().parseFromString(source, "image/svg+xml");
    if (doc.querySelector("parsererror")) {
      return "";
    }

    doc.querySelectorAll("*").forEach((element) => {
      if (blockedSvgElements.has(element.tagName.toLowerCase())) {
        element.remove();
        return;
      }

      Array.from(element.attributes).forEach((attribute) => {
        const name = attribute.name.toLowerCase();
        const value = attribute.value.trim();
        if (name.startsWith("on")) {
          element.removeAttribute(attribute.name);
          return;
        }

        if (name === "style") {
          const sanitizedStyle = sanitizeStyleAttribute(value);
          if (sanitizedStyle) {
            element.setAttribute(attribute.name, sanitizedStyle);
          } else {
            element.removeAttribute(attribute.name);
          }
          return;
        }

        if (strictReferenceAttributeNames.has(name) && !isSafeSvgReference(value)) {
          element.removeAttribute(attribute.name);
          return;
        }

        if (urlStyleAttributeNames.has(name) && hasUnsafeSvgReference(value)) {
          element.removeAttribute(attribute.name);
        }
      });
    });

    const svg = doc.documentElement;
    return svg?.tagName.toLowerCase() === "svg" ? new XMLSerializer().serializeToString(svg) : "";
  };

  let svgSource = defaultSvgSource;
  let svgMarkup = sanitizeSvgSource(svgSource) || defaultSvgSource;
  let availableTargets: AnimationTarget[] = discoverSvgTargets(svgMarkup);

  const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
  const clampMs = (value: number): number => clamp(Math.round(value), 0, timelineDurationMs);
  const clampPercent = (value: number): number => clamp(value, 0, 100);

  const trackPercent = (time: number): number =>
    timelineDurationMs === 0 ? 0 : clampPercent((clampMs(time) / timelineDurationMs) * 100);

  const pointerTimeFromRect = (rect: DOMRect, event: MouseEvent): number =>
    applySnap(clampMs(((event.clientX - rect.left) / rect.width) * timelineDurationMs));

  const pointerTimeFromElement = (ref: HTMLElement | null, event: MouseEvent): number => {
    if (!ref) {
      return currentTime;
    }
    const rect = ref.getBoundingClientRect();
    if (rect.width === 0) {
      return currentTime;
    }
    return pointerTimeFromRect(rect, event);
  };

  const makeTrackId = (): string => `track-${(trackCursor += 1)}`;
  const makeKeyframeId = (): string => `kf-${Math.floor(Math.random() * 100000)}`;

  const formatMs = (value: number): string => `${value}ms`;
  const formatSec = (value: number): string => `${(value / 1000).toFixed(2)}s`;

  let trackCursor = 0;
  let tracks: TimelineTrack[] = [
    {
      id: "track-co-fill",
      targetId: "co",
      property: "fill",
      muted: false,
      keyframes: [
        { id: "track-co-fill-1", time: 0, value: "var(--color-6)", easing: "linear" },
        { id: "track-co-fill-2", time: 350, value: "var(--color-8)", easing: "power1.inOut" },
        { id: "track-co-fill-3", time: 700, value: "var(--color-6)", easing: "power1.inOut" },
      ],
    },
    {
      id: "track-ui-x",
      targetId: "ui",
      property: "x",
      muted: false,
      keyframes: [
        { id: "track-ui-x-1", time: 0, value: "0", easing: "linear" },
        { id: "track-ui-x-2", time: 520, value: "8", easing: "expo.out" },
      ],
    },
    {
      id: "track-q-opacity",
      targetId: "q",
      property: "opacity",
      muted: false,
      keyframes: [
        { id: "track-q-opacity-1", time: 0, value: "0", easing: "linear" },
        { id: "track-q-opacity-2", time: 540, value: "1", easing: "power2.out" },
      ],
    },
  ];
  let targetNameById = new Map(availableTargets.map((target) => [target.id, target.name] as const));

  let selectedTrackId = tracks[0]?.id ?? "";
  let selectedTrack: TimelineTrack | null = tracks[0] ?? null;
  let selectedKeyframe: Keyframe | null = null;
  let activeTrack: TimelineTrack | null = tracks[0] ?? null;
  let selectedTrackHasKeyframes = tracks[0]?.keyframes.length ? tracks[0].keyframes.length > 0 : false;
  let selectedTrackNeighborhood: PlayheadNeighborhood = { at: null, previous: null, next: null };
  let clampedGridCount = defaultGridDivisions;
  let selectedTargetId = availableTargets[0]?.id ?? "";
  let timelineDurationMs = 1200;
  let currentTime = 0;
  let isPlaying = false;
  let isLooping = true;
  let frameRate = 60;
  let snapToFrames = true;
  let snapMs = 16;

  let playbackStartTime = 0;
  let lastFrameTimestamp = 0;
  let rafHandle: number | null = null;
  let isResizingDrawer = false;
  let isScrubbing = false;
  let scrubberSource: "timeline" | "preview" | null = null;
  let drawerOpen = true;
  let drawerWidth = 300;
  let drawerResizeStartX = 0;
  let drawerResizeStartWidth = 300;
  let timelineCursorElement: HTMLButtonElement | null = null;
  let previewScrubberElement: HTMLDivElement | null = null;
  let previewSvgHostElement: HTMLDivElement | null = null;
  let originalPreviewInlineStyles = new WeakMap<SVGElement, Map<PreviewStyleProperty, OriginalInlineStyle>>();
  let copiedExport = "";
  let showOnlySelected = false;
  let trackFilterTerm = "";
  let trackSortMode: TrackSortMode = "manual";
  let showKeyboardShortcuts = true;
  let selectedKeyframeId = "";
  let timelineGridDensity = defaultGridDivisions;
  let draggingKeyframe: DraggingKeyframe = null;

  let newTrackTargetId = availableTargets[0]?.id ?? "";
  let newTrackProperty: AnimationProperty = "fill";
  const minDrawerWidth = 228;
  const maxDrawerWidth = 700;
  const collapsedDrawerWidth = 52;
  let layoutColumnWidth = `${drawerWidth}px`;

  const clampDrawerWidth = (value: number): number => Math.max(minDrawerWidth, Math.min(maxDrawerWidth, Math.round(value)));
  const setDrawerWidth = (value: number): void => {
    drawerWidth = clampDrawerWidth(value);
    drawerOpen = true;
  };
  const setDrawerPreset = (value: number): void => {
    setDrawerWidth(value);
    drawerOpen = true;
  };
  const toggleDrawer = (): void => {
    drawerOpen = !drawerOpen;
  };
  const resizeDrawerByKeyboard = (event: KeyboardEvent): void => {
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setDrawerWidth(drawerWidth - (event.shiftKey ? 24 : 12));
      drawerOpen = true;
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setDrawerWidth(drawerWidth + (event.shiftKey ? 24 : 12));
      drawerOpen = true;
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setDrawerWidth(minDrawerWidth);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setDrawerWidth(maxDrawerWidth);
    }
  };
  const stopDrawerResize = (): void => {
    if (!isResizingDrawer) {
      return;
    }
    isResizingDrawer = false;
    window.removeEventListener("mousemove", onDrawerResizeMove);
    window.removeEventListener("mouseup", stopDrawerResize);
  };
  const onDrawerResizeMove = (event: MouseEvent): void => {
    if (!isResizingDrawer) {
      return;
    }
    const next = drawerResizeStartWidth + Math.round(event.clientX - drawerResizeStartX);
    setDrawerWidth(next);
  };
  const startDrawerResize = (event: MouseEvent): void => {
    event.preventDefault();
    isResizingDrawer = true;
    drawerOpen = true;
    drawerResizeStartX = event.clientX;
    drawerResizeStartWidth = drawerWidth;
    window.addEventListener("mousemove", onDrawerResizeMove);
    window.addEventListener("mouseup", stopDrawerResize);
  };

  const isNumericProperty = (property: AnimationProperty): boolean => numericProperties.has(property);
  const isTextInputTarget = (target: EventTarget | null): boolean => {
    return (
      target instanceof HTMLElement &&
      !!target.closest("input, textarea, select, button, [contenteditable='true'], [role='textbox']")
    );
  };
  const propertySpec = (property: AnimationProperty): PropertyDefinition => propertyById.get(property) ?? propertyCatalog[0]!;
  const defaultValueFor = (property: AnimationProperty): string => propertySpec(property).defaultValue;
  const toCssValue = (value: string, property: AnimationProperty): string => {
    const spec = propertySpec(property);
    if (spec.kind === "number" && spec.unit && property !== "strokeWidth" && property !== "opacity" && property !== "scale") {
      return `${value}${spec.unit}`;
    }
    return value;
  };

  const sortKeyframes = (items: Keyframe[]): Keyframe[] =>
    [...items].sort((first, second) => first.time - second.time);

  const normalizeTracks = (): void => {
    tracks = tracks.map((track) => ({
      ...track,
      keyframes: sortKeyframes(track.keyframes).map((keyframe) => ({ ...keyframe, time: clampMs(keyframe.time) })),
    }));
  };

  const interpolateNumeric = (firstValue: number, secondValue: number, ratio: number): number =>
    firstValue + (secondValue - firstValue) * ratio;

  const getCurrentValue = (track: TimelineTrack, time: number): string => {
    if (track.keyframes.length === 0) {
      return defaultValueFor(track.property);
    }
    const sorted = sortKeyframes(track.keyframes);
    if (time <= sorted[0].time) {
      return sorted[0].value;
    }
    if (time >= sorted[sorted.length - 1].time) {
      return sorted[sorted.length - 1].value;
    }

    for (let i = 0; i < sorted.length - 1; i += 1) {
      const left = sorted[i];
      const right = sorted[i + 1];
      if (time >= left.time && time <= right.time) {
        if (!isNumericProperty(track.property)) {
          const midpoint = left.time + (right.time - left.time) / 2;
          return time < midpoint ? left.value : right.value;
        }
        const leftValue = Number(left.value);
        const rightValue = Number(right.value);
        if (Number.isNaN(leftValue) || Number.isNaN(rightValue) || right.time === left.time) {
          return left.value;
        }
        const ratio = (time - left.time) / (right.time - left.time);
        return String(interpolateNumeric(leftValue, rightValue, ratio));
      }
    }

    return sorted[sorted.length - 1].value;
  };

  const tickFrameMs = (): number => 1000 / clamp(frameRate, 12, 144);
  const applySnap = (value: number): number => {
    if (!snapToFrames || snapMs <= 0) {
      return value;
    }
    return Math.round(value / snapMs) * snapMs;
  };

  const fetchFonts = async (): Promise<void> => {
    try {
      const response = await fetch("/api/fonts");
      const payload = await response.json();
      fonts = (Array.isArray(payload) ? payload : []) as FontRecord[];
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      error = `Could not reach backend font service. ${message}`;
    } finally {
      loading = false;
    }
  };

  onMount(() => {
    normalizeTracks();
    document.documentElement.style.setProperty("--palette-hue", `${paletteHue}`);
    document.documentElement.style.setProperty("--palette-chroma", `${paletteChroma}`);
    document.documentElement.style.setProperty("--palette-hue-rotate-by", `${paletteRotate}`);
    void fetchFonts();
    void nextDomUpdate().then(applyTimelineToPreviewSvg);
    window.addEventListener("keydown", handleGlobalKeyboard);
  });

  onDestroy(() => {
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
    }
    if (isResizingDrawer) {
      stopDrawerResize();
    }
    if (isScrubbing) {
      stopScrub();
    }
    if (draggingKeyframe) {
      stopKeyframeDrag();
    }
    window.removeEventListener("keydown", handleGlobalKeyboard);
  });

  $: {
    document.documentElement.style.setProperty("--palette-hue", `${paletteHue}`);
    document.documentElement.style.setProperty("--palette-chroma", `${paletteChroma}`);
    document.documentElement.style.setProperty("--palette-hue-rotate-by", `${paletteRotate}`);
  }
  $: layoutColumnWidth = drawerOpen ? `${drawerWidth}px` : `${collapsedDrawerWidth}px`;
  $: svgMarkup = sanitizeSvgSource(svgSource) || defaultSvgSource;
  $: availableTargets = discoverSvgTargets(svgMarkup);
  $: targetNameById = new Map(availableTargets.map((target) => [target.id, target.name] as const));
  $: {
    if (previewSvgHostElement) {
      currentTime;
      tracks;
      availableTargets;
      svgMarkup;
      void applyTimelineToPreviewSvg();
    }
  }

  $: activeTrack = tracks.find((track) => track.id === selectedTrackId) ?? null;
  $: selectedTrackHasKeyframes = (activeTrack?.keyframes?.length ?? 0) > 0;
  $: clampedGridCount = Math.max(minGridDivisions, Math.min(maxGridDivisions, timelineGridDensity));
  $: timelineTicks = Array.from({ length: clampedGridCount + 1 }, (_, index) =>
    Math.round((index / clampedGridCount) * timelineDurationMs),
  );
  $: visibleTracks = (() => {
    const selectedOnlyTracks =
      showOnlySelected && selectedTrackId !== "" ? tracks.filter((track) => track.id === selectedTrackId) : tracks;
    const normalizedFilter = trackFilterTerm.trim().toLowerCase();
    const matchingFilter =
      normalizedFilter === ""
        ? selectedOnlyTracks
        : selectedOnlyTracks.filter((track) => {
            const targetName = (targetNameById.get(track.targetId) ?? track.targetId).toLowerCase();
            return (
              track.id.toLowerCase().includes(normalizedFilter) ||
              track.targetId.toLowerCase().includes(normalizedFilter) ||
              targetName.includes(normalizedFilter) ||
              track.property.toLowerCase().includes(normalizedFilter)
            );
          });

    if (trackSortMode === "target") {
      return [...matchingFilter].sort((left, right) => {
        const leftTarget = (targetNameById.get(left.targetId) ?? left.targetId).toLowerCase();
        const rightTarget = (targetNameById.get(right.targetId) ?? right.targetId).toLowerCase();
        if (leftTarget === rightTarget) {
          const leftProperty = left.property.toLowerCase();
          const rightProperty = right.property.toLowerCase();
          if (leftProperty === rightProperty) {
            return left.id.localeCompare(right.id);
          }
          return leftProperty.localeCompare(rightProperty);
        }
        return leftTarget.localeCompare(rightTarget);
      });
    }

    if (trackSortMode === "property") {
      return [...matchingFilter].sort((left, right) => {
        if (left.property === right.property) {
          return left.targetId.localeCompare(right.targetId) || left.id.localeCompare(right.id);
        }
        return left.property.localeCompare(right.property);
      });
    }

    return matchingFilter;
  })();
  $: totalTrackKeyframes = tracks.reduce((total, track) => total + track.keyframes.length, 0);
  $: playheadLabel = isPlaying ? "Playing" : currentTime === 0 ? "Idle" : "Paused";
  $: selectedTrackName =
    activeTrack === null
      ? "No track selected"
      : `${targetNameById.get(activeTrack.targetId) ?? activeTrack.targetId} • ${activeTrack.property}`;
  $: exportPayload = JSON.stringify(
    {
      version: "tadpole-timeline-1",
      duration: timelineDurationMs,
      frameRate,
      tracks,
    },
    null,
    2,
  );
  $: selectedTrack = activeTrack;
  $: selectedKeyframe = selectedTrack
    ? selectedTrack.keyframes.find((keyframe) => keyframe.id === selectedKeyframeId) ?? null
    : null;
  $: selectedTrackNeighborhood = getNeighborhoodForTime(selectedTrack, currentTime);
  $: {
    if (!selectedTrackId) {
      selectedKeyframeId = "";
    } else if (!selectedTrack || (selectedKeyframeId !== "" && !selectedTrack.keyframes.some((keyframe) => keyframe.id === selectedKeyframeId))) {
      selectedKeyframeId = "";
    }
  }

  const applyPalette = (hue: number, chroma: number, rotate: number): void => {
    paletteHue = hue;
    paletteChroma = chroma;
    paletteRotate = rotate;
  };
  const randomizePalette = (): void => {
    applyPalette(
      Math.floor(Math.random() * 361),
      Number((Math.random() * 0.24 + 0.05).toFixed(2)),
      Math.floor(Math.random() * 17),
    );
  };
  const resetPalette = (): void => {
    applyPalette(250, 0.15, 0);
  };
  const setPaletteHue = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    paletteHue = Number(input.value);
  };
  const setPaletteChroma = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    paletteChroma = Number(input.value);
  };
  const setPaletteRotate = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    paletteRotate = Number(input.value);
  };

  const setTimelineDuration = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    timelineDurationMs = clamp(Math.max(250, Number(input.value)), 250, 30000);
    currentTime = clampMs(currentTime);
    normalizeTracks();
  };
  const setTimelineDurationPreset = (value: number): void => {
    timelineDurationMs = clamp(value, 250, 30000);
    currentTime = clampMs(currentTime);
    normalizeTracks();
  };
  const setCurrentTime = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    currentTime = applySnap(clampMs(Number(input.value)));
  };
  const setTimelineGridDensity = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    timelineGridDensity = clamp(Number(input.value), minGridDivisions, maxGridDivisions);
  };
  const setTrackFilterTerm = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    trackFilterTerm = input.value;
  };
  const setTrackSortMode = (mode: TrackSortMode): void => {
    trackSortMode = mode;
  };
  const clearTrackFilters = (): void => {
    trackFilterTerm = "";
    showOnlySelected = false;
  };

  const jumpToUsingRef = (ref: HTMLElement | null, event: MouseEvent): void => {
    if (!ref) {
      return;
    }
    currentTime = pointerTimeFromElement(ref, event);
    pauseTimeline();
  };
  const startScrub = (source: "timeline" | "preview", event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }
    if (isScrubbing) {
      return;
    }
    event.preventDefault();
    isScrubbing = true;
    scrubberSource = source;
    pauseTimeline();
    window.addEventListener("mousemove", onScrubMove);
    window.addEventListener("mouseup", stopScrub);
    onScrubMove(event);
  };
  const onScrubMove = (event: MouseEvent): void => {
    if (!isScrubbing || scrubberSource === null) {
      return;
    }
    const currentSource = scrubberSource;
    if (currentSource === "timeline") {
      jumpToUsingRef(timelineCursorElement, event);
      return;
    }
    jumpToUsingRef(previewScrubberElement, event);
  };
  const stopScrub = (): void => {
    if (!isScrubbing) {
      return;
    }
    isScrubbing = false;
    scrubberSource = null;
    window.removeEventListener("mousemove", onScrubMove);
    window.removeEventListener("mouseup", stopScrub);
  };
  const toggleShowOnlySelected = (): void => {
    showOnlySelected = !showOnlySelected;
  };
  const addKeyframeAtCurrentForSelected = (): void => {
    const created = addKeyframeAtTimeForSelected(currentTime);
    selectedKeyframeId = created ?? "";
  };

  const addKeyframeAtTimeForSelected = (time: number): string | null => {
    if (selectedTrackId === "") {
      return null;
    }
    const track = tracks.find((candidate) => candidate.id === selectedTrackId);
    if (!track) {
      return null;
    }
    const snapped = applySnap(clampMs(time));
    const created = addKeyframe(selectedTrackId, snapped, keyframeValueAtTime(track, snapped));
    selectedKeyframeId = created ?? "";
    currentTime = snapped;
    return created;
  };

  const addKeyframeAtTimeForTrack = (trackId: string, time: number): string | null => {
    const track = tracks.find((candidate) => candidate.id === trackId);
    if (!track) {
      return null;
    }
    const snapped = applySnap(clampMs(time));
    const created = addKeyframe(trackId, snapped, keyframeValueAtTime(track, snapped));
    if (created) {
      selectedTrackId = trackId;
      selectedKeyframeId = created;
      currentTime = snapped;
    }
    return created;
  };

  const togglePlay = (): void => {
    if (isPlaying) {
      pauseTimeline();
    } else {
      playTimeline();
    }
  };
  const copyExport = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(exportPayload);
      copiedExport = "Copied";
      window.setTimeout(() => {
        copiedExport = "";
      }, 1200);
    } catch {
      copiedExport = "Copy failed";
      window.setTimeout(() => {
        copiedExport = "";
      }, 1200);
    }
  };

  const jumpByTimelineKey = (event: KeyboardEvent): void => {
    if (isTextInputTarget(event.target)) {
      return;
    }
    jumpByKeyboard(event);
    if (event.key.toLowerCase() === "k") {
      event.preventDefault();
      addKeyframeAtCurrentForSelected();
    }
  };

  const jumpByKeyboard = (event: KeyboardEvent): void => {
    const step = snapToFrames && snapMs > 0 ? snapMs : 16;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      currentTime = applySnap(clampMs(currentTime - step));
      return;
    }
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      currentTime = applySnap(clampMs(currentTime + step));
      return;
    }
    if (event.key === "PageDown") {
      event.preventDefault();
      currentTime = applySnap(clampMs(currentTime - step * 10));
      return;
    }
    if (event.key === "PageUp") {
      event.preventDefault();
      currentTime = applySnap(clampMs(currentTime + step * 10));
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      currentTime = 0;
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      currentTime = timelineDurationMs;
    }
  };

  const jumpToPreviousKeyframe = (): void => {
    const track = selectedTrack;
    if (track === null || track.keyframes.length === 0) {
      return;
    }
    const sorted = sortKeyframes(track.keyframes);
    const previous = [...sorted].reverse().find((candidate) => candidate.time < currentTime);
    const fallback = sorted[0];
    const nextFrame = previous ?? fallback;
    currentTime = applySnap(clampMs(nextFrame.time));
    selectedKeyframeId = nextFrame.id;
  };

  const jumpToNextKeyframe = (): void => {
    const track = selectedTrack;
    if (track === null || track.keyframes.length === 0) {
      return;
    }
    const sorted = sortKeyframes(track.keyframes);
    const next = sorted.find((candidate) => candidate.time > currentTime);
    const fallback = sorted[sorted.length - 1];
    const nextFrame = next ?? fallback;
    currentTime = applySnap(clampMs(nextFrame.time));
    selectedKeyframeId = nextFrame.id;
  };

  const handleGlobalKeyboard = (event: KeyboardEvent): void => {
    if (isTextInputTarget(event.target)) {
      return;
    }

    const key = event.key.toLowerCase();
    if (key === " " || key === "k" || key === "arrowleft" || key === "arrowright" || key === "arrowup" || key === "arrowdown" || key === "home" || key === "end" || key === "pageup" || key === "pagedown") {
      jumpByKeyboard(event);
      if (key === " ") {
        event.preventDefault();
        togglePlay();
      }
      if (key === "k") {
        event.preventDefault();
        addKeyframeAtCurrentForSelected();
      }
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      if (selectedTrackId !== "" && selectedKeyframeId !== "") {
        event.preventDefault();
        removeKeyframe(selectedTrackId, selectedKeyframeId);
        selectedKeyframeId = "";
      }
      return;
    }

    if (event.key === "[" || event.key === "]") {
      event.preventDefault();
      const index = tracks.findIndex((track) => track.id === selectedTrackId);
      if (index === -1) {
        return;
      }
      const nextIndex = event.key === "[" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= tracks.length) {
        return;
      }
      selectedTrackId = tracks[nextIndex]!.id;
      selectedKeyframeId = "";
      return;
    }

    if (key === "," || key === ".") {
      event.preventDefault();
      if (key === ",") {
        jumpToPreviousKeyframe();
        return;
      }
      jumpToNextKeyframe();
      return;
    }

    if ((event.ctrlKey || event.metaKey) && (event.key === "d" || event.key === "D")) {
      event.preventDefault();
      duplicateTrack(selectedTrackId);
      return;
    }

    if (event.key.toLowerCase() === "m") {
      event.preventDefault();
      if (selectedTrackId !== "") {
        toggleTrackMute(selectedTrackId);
      }
      return;
    }

    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      resetPalette();
      return;
    }

    if (event.key.toLowerCase() === "h") {
      event.preventDefault();
      showKeyboardShortcuts = !showKeyboardShortcuts;
      return;
    }
  };

  const keyframeValueAtTime = (track: TimelineTrack, time: number): string =>
    track.keyframes.length === 0 ? defaultValueFor(track.property) : getCurrentValue(track, time);

  const getActiveTrackForTarget = (targetId: string, property: AnimationProperty): TimelineTrack | undefined => {
    const matching = tracks.filter((track) => track.targetId === targetId && track.property === property && !track.muted);
    if (matching.length === 0) {
      return undefined;
    }
    return matching.find((track) => track.id === selectedTrackId) ?? matching[0];
  };

  const resolveNumericTrackValue = (
    targetId: string,
    property: AnimationProperty,
    fallback: number,
  ): number => {
    const value = getActiveTrackForTarget(targetId, property);
    if (!value) {
      return fallback;
    }
    const resolved = Number(getCurrentValue(value, currentTime));
    return Number.isFinite(resolved) ? resolved : fallback;
  };

  const resolveTrackValue = (targetId: string, property: AnimationProperty, fallback: string): string => {
    const track = getActiveTrackForTarget(targetId, property);
    return track ? getCurrentValue(track, currentTime) : fallback;
  };

  const getDefaultPreviewStyle = (targetId: string): PreviewStyle => {
    const baseFill = targetId === "q" || targetId === "co" || targetId === "ui" || targetId === "accent" ? "var(--color-6)" : "none";
    const baseStroke = targetId === "arc" || targetId === "q" || targetId === "accent" ? "var(--color-9)" : "none";
    return {
      transform: "translate(0px, 0px) scale(1) rotate(0deg)",
      opacity: "1",
      fill: baseFill,
      stroke: baseStroke,
      strokeWidth: targetId === "arc" ? "2.5" : "1.2",
    };
  };

  const resolvePreviewStyle = (targetId: string): PreviewStyle => {
    const base = getDefaultPreviewStyle(targetId);
    const x = resolveNumericTrackValue(targetId, "x", 0);
    const y = resolveNumericTrackValue(targetId, "y", 0);
    const scale = resolveNumericTrackValue(targetId, "scale", 1);
    const rotation = resolveNumericTrackValue(targetId, "rotation", 0);
    const opacity = resolveTrackValue(targetId, "opacity", base.opacity);
    const fill = resolveTrackValue(targetId, "fill", base.fill);
    const stroke = resolveTrackValue(targetId, "stroke", base.stroke);
    const strokeWidth = resolveTrackValue(targetId, "strokeWidth", base.strokeWidth);
    return {
      transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`,
      opacity,
      fill,
      stroke,
      strokeWidth: `${strokeWidth}`,
    };
  };

  const targetSelector = (targetId: string): string => {
    if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
      return `#${CSS.escape(targetId)}`;
    }
    const escaped = targetId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    return `[id="${escaped}"]`;
  };

  const originalInlineStylesFor = (element: SVGElement): Map<PreviewStyleProperty, OriginalInlineStyle> => {
    const existing = originalPreviewInlineStyles.get(element);
    if (existing) {
      return existing;
    }

    const snapshot = new Map<PreviewStyleProperty, OriginalInlineStyle>();
    previewTrackedStyleProperties.forEach((property) => {
      snapshot.set(property, {
        value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property),
      });
    });
    originalPreviewInlineStyles.set(element, snapshot);
    return snapshot;
  };

  const setPreviewStyleProperty = (element: SVGElement, property: PreviewStyleProperty, value: string): void => {
    originalInlineStylesFor(element);
    element.style.setProperty(property, value);
  };

  const restorePreviewStyleProperty = (element: SVGElement, property: PreviewStyleProperty): void => {
    const original = originalInlineStylesFor(element).get(property);
    if (!original || original.value === "") {
      element.style.removeProperty(property);
      return;
    }
    element.style.setProperty(property, original.value, original.priority);
  };

  const applyTimelineToPreviewSvg = async (): Promise<void> => {
    if (!previewSvgHostElement) {
      return;
    }

    await nextDomUpdate();
    availableTargets.forEach((target) => {
      const element = previewSvgHostElement?.querySelector<SVGElement>(targetSelector(target.id));
      if (!element) {
        return;
      }

      const style = resolvePreviewStyle(target.id);
      if (transformProperties.some((property) => getActiveTrackForTarget(target.id, property))) {
        setPreviewStyleProperty(element, "transform", style.transform);
        setPreviewStyleProperty(element, "transform-origin", "center");
        setPreviewStyleProperty(element, "transform-box", "fill-box");
      } else {
        restorePreviewStyleProperty(element, "transform");
        restorePreviewStyleProperty(element, "transform-origin");
        restorePreviewStyleProperty(element, "transform-box");
      }

      if (getActiveTrackForTarget(target.id, "opacity")) {
        setPreviewStyleProperty(element, "opacity", style.opacity);
      } else {
        restorePreviewStyleProperty(element, "opacity");
      }

      if (getActiveTrackForTarget(target.id, "fill")) {
        setPreviewStyleProperty(element, "fill", style.fill);
      } else {
        restorePreviewStyleProperty(element, "fill");
      }

      if (getActiveTrackForTarget(target.id, "stroke")) {
        setPreviewStyleProperty(element, "stroke", style.stroke);
      } else {
        restorePreviewStyleProperty(element, "stroke");
      }

      if (getActiveTrackForTarget(target.id, "strokeWidth")) {
        setPreviewStyleProperty(element, "stroke-width", style.strokeWidth);
      } else {
        restorePreviewStyleProperty(element, "stroke-width");
      }
    });
  };

  const movePlayheadToTrack = (time: number): void => {
    currentTime = clampMs(time);
  };

  const tick = (timestamp: number): void => {
    if (!isPlaying) {
      return;
    }

    if (timestamp - lastFrameTimestamp < tickFrameMs()) {
      rafHandle = requestAnimationFrame(tick);
      return;
    }
    lastFrameTimestamp = timestamp;

    const duration = Math.max(0.001, timelineDurationMs);
    const elapsed = timestamp - playbackStartTime;
    let next = isLooping ? elapsed % duration : clamp(elapsed, 0, duration);
    next = applySnap(clampMs(next));
    currentTime = next;

    if (!isLooping && elapsed >= duration) {
      currentTime = timelineDurationMs;
      isPlaying = false;
      if (rafHandle !== null) {
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }
      return;
    }

    rafHandle = requestAnimationFrame(tick);
  };

  const playTimeline = (): void => {
    if (isPlaying) {
      return;
    }
    if (currentTime >= timelineDurationMs && !isLooping) {
      currentTime = 0;
    }
    isPlaying = true;
    playbackStartTime = performance.now() - currentTime;
    lastFrameTimestamp = performance.now();
    rafHandle = requestAnimationFrame((timestamp) => tick(timestamp));
  };

  const pauseTimeline = (): void => {
    isPlaying = false;
    if (rafHandle !== null) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
  };

  const stopTimeline = (): void => {
    pauseTimeline();
    currentTime = 0;
  };

  const toggleLoop = (): void => {
    isLooping = !isLooping;
  };

  const setPlayRate = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    frameRate = clamp(Number(input.value), 12, 144);
  };

  const setSnapSetting = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    snapMs = Number(input.value);
  };

  const setTimelineSnap = (): void => {
    snapToFrames = !snapToFrames;
  };

  const selectTarget = (targetId: string): void => {
    selectedTargetId = targetId;
    newTrackTargetId = targetId;
  };

  const addTrack = (): void => {
    const newTrack: TimelineTrack = {
      id: makeTrackId(),
      targetId: newTrackTargetId,
      property: newTrackProperty,
      muted: false,
      keyframes: [{ id: makeKeyframeId(), time: 0, value: defaultValueFor(newTrackProperty), easing: "linear" }],
    };
    tracks = [...tracks, newTrack];
    selectedTrackId = newTrack.id;
    selectedKeyframeId = "";
  };

  const moveTrackOrder = (trackId: string, direction: -1 | 1): void => {
    const index = tracks.findIndex((track) => track.id === trackId);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= tracks.length) {
      return;
    }
    const nextTracks = [...tracks];
    const [track] = nextTracks.splice(index, 1);
    if (!track) {
      return;
    }
    nextTracks.splice(destination, 0, track);
    tracks = nextTracks;
  };

  const canMoveTrackUp = (trackId: string): boolean => tracks.findIndex((track) => track.id === trackId) > 0;
  const canMoveTrackDown = (trackId: string): boolean => tracks.findIndex((track) => track.id === trackId) < tracks.length - 1;

  const moveTrackToTop = (trackId: string): void => {
    const index = tracks.findIndex((track) => track.id === trackId);
    if (index <= 0) {
      return;
    }
    const nextTracks = [...tracks];
    const [track] = nextTracks.splice(index, 1);
    if (!track) {
      return;
    }
    tracks = [track, ...nextTracks];
  };

  const moveTrackToBottom = (trackId: string): void => {
    const index = tracks.findIndex((track) => track.id === trackId);
    if (index === -1 || index === tracks.length - 1) {
      return;
    }
    const nextTracks = [...tracks];
    const [track] = nextTracks.splice(index, 1);
    if (!track) {
      return;
    }
    tracks = [...nextTracks, track];
  };

  const duplicateTrack = (trackId: string): void => {
    const source = tracks.find((track) => track.id === trackId);
    if (!source) {
      return;
    }
    const copy: TimelineTrack = {
      id: makeTrackId(),
      targetId: source.targetId,
      property: source.property,
      muted: false,
      keyframes: source.keyframes.map((keyframe) => ({
        ...keyframe,
        id: makeKeyframeId(),
      })),
    };
    tracks = [...tracks, copy];
    selectedTrackId = copy.id;
    selectedKeyframeId = "";
  };

  const removeTrack = (trackId: string): void => {
    tracks = tracks.filter((track) => track.id !== trackId);
    if (tracks.length > 0 && selectedTrackId === trackId) {
      selectedTrackId = tracks[0]?.id ?? "";
      selectedKeyframeId = "";
    }
  };

  const setTrackTarget = (trackId: string, event: Event): void => {
    const input = event.currentTarget as HTMLSelectElement;
    const targetId = input.value;
    tracks = tracks.map((track) => (track.id === trackId ? { ...track, targetId } : track));
  };

  const setTrackProperty = (trackId: string, event: Event): void => {
    const input = event.currentTarget as HTMLSelectElement;
    const property = input.value as AnimationProperty;
    tracks = tracks.map((track) =>
      track.id === trackId
        ? { ...track, property, keyframes: track.keyframes.map((keyframe) => ({ ...keyframe, value: defaultValueFor(property) })) }
        : track,
    );
  };

  const resetTrackValues = (trackId: string): void => {
    tracks = tracks.map((track) =>
      track.id === trackId
        ? { ...track, keyframes: track.keyframes.map((keyframe) => ({ ...keyframe, value: defaultValueFor(track.property) })) }
        : track,
    );
  };

  const toggleTrackMute = (trackId: string): void => {
    tracks = tracks.map((track) => (track.id === trackId ? { ...track, muted: !track.muted } : track));
  };

  const addKeyframeAtCurrent = (trackId: string): string | null => {
    const track = tracks.find((candidate) => candidate.id === trackId);
    if (!track) {
      return null;
    }
    const created = addKeyframe(trackId, currentTime, keyframeValueAtTime(track, currentTime));
    if (created) {
      selectedKeyframeId = created;
    }
    return created;
  };

  const addKeyframe = (trackId: string, atMs: number, value?: string): string | null => {
    const snapped = applySnap(clampMs(atMs));
    let createdId: string | null = null;
    tracks = tracks.map((track) => {
      if (track.id !== trackId) {
        return track;
      }
      const existingIndex = track.keyframes.findIndex((candidate) => candidate.time === snapped);
      const newFrame: Keyframe = {
        id: makeKeyframeId(),
        time: snapped,
        value: value ?? defaultValueFor(track.property),
        easing: "linear",
      };
      createdId = newFrame.id;
      if (existingIndex >= 0) {
        const next = [...track.keyframes];
        createdId = next[existingIndex]?.id ?? null;
        next[existingIndex] = {
          ...next[existingIndex],
          value: newFrame.value,
          easing: newFrame.easing,
        };
        return { ...track, keyframes: sortKeyframes(next) };
      }
      return { ...track, keyframes: sortKeyframes([...track.keyframes, newFrame]) };
    });
    return createdId;
  };

  const addKeyframeFromLane = (trackId: string, event: MouseEvent): void => {
    const clicked = event.currentTarget as HTMLDivElement;
    const rect = clicked.getBoundingClientRect();
    const local = pointerTimeFromRect(rect, event);
    const created = addKeyframeAtTimeForTrack(trackId, local);
    selectedTrackId = trackId;
    selectedKeyframeId = created ?? "";
    movePlayheadToTrack(local);
  };

  const getNeighborhoodForTime = (track: TimelineTrack | null, time: number): PlayheadNeighborhood => {
    if (!track || track.keyframes.length === 0) {
      return { at: null, previous: null, next: null };
    }

    const sorted = sortKeyframes(track.keyframes);
    const snapped = clampMs(time);
    const at = sorted.find((candidate) => candidate.time === snapped) ?? null;
    const previous = [...sorted].reverse().find((candidate) => candidate.time < snapped) ?? null;
    const next = sorted.find((candidate) => candidate.time > snapped) ?? null;
    return { at, previous, next };
  };

  const addKeyframeFromPreviewScrubber = (event: MouseEvent): void => {
    if (selectedTrackId === "") {
      return;
    }
    const target = event.target as HTMLElement;
    if (target.closest(".preview-keyframe") || target.closest(".preview-scrubber") || target.closest(".preview-scrubber-time")) {
      return;
    }
    if (!previewScrubberElement) {
      return;
    }
    const local = pointerTimeFromElement(previewScrubberElement, event);
    const created = addKeyframeAtTimeForSelected(local);
    selectedKeyframeId = created ?? "";
  };

  const removeKeyframe = (trackId: string, keyframeId: string): void => {
    tracks = tracks.map((track) =>
      track.id === trackId ? { ...track, keyframes: track.keyframes.filter((keyframe) => keyframe.id !== keyframeId) } : track,
    );
    if (selectedTrackId === trackId && selectedKeyframeId === keyframeId) {
      selectedKeyframeId = "";
    }
  };

  const duplicateSelectedKeyframe = (): string | null => {
    if (!selectedTrackId || !selectedKeyframeId) {
      return null;
    }
    const track = tracks.find((candidate) => candidate.id === selectedTrackId);
    const source = track?.keyframes.find((keyframe) => keyframe.id === selectedKeyframeId);
    if (!track || !source) {
      return null;
    }
    const duplicatedTime = applySnap(clampMs(source.time + (snapToFrames ? snapMs || 16 : 16)));
    const created = addKeyframe(selectedTrackId, duplicatedTime, source.value);
    if (created) {
      selectedKeyframeId = created;
      selectedTrackId = track.id;
      movePlayheadToTrack(duplicatedTime);
    }
    return created;
  };

  const selectTrack = (trackId: string): void => {
    selectedTrackId = trackId;
    selectedKeyframeId = "";
  };

  const selectKeyframe = (trackId: string, keyframeId: string, time: number): void => {
    selectedTrackId = trackId;
    selectedKeyframeId = keyframeId;
    currentTime = applySnap(clampMs(time));
  };

  const updateKeyframeTime = (trackId: string, keyframeId: string, event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    setKeyframeTime(trackId, keyframeId, Number(input.value));
  };

  const setKeyframeTime = (trackId: string, keyframeId: string, value: number): void => {
    const snapped = applySnap(clampMs(value));
    tracks = tracks.map((track) =>
      track.id === trackId
        ? {
            ...track,
            keyframes: sortKeyframes(
              track.keyframes.map((keyframe) =>
                keyframe.id === keyframeId ? { ...keyframe, time: snapped } : keyframe,
              ),
            ),
          }
        : track,
    );

    if (selectedTrackId === trackId && selectedKeyframeId === keyframeId) {
      currentTime = snapped;
    }
  };

  const startKeyframeDrag = (trackId: string, event: MouseEvent): void => {
    const marker = event.currentTarget as HTMLButtonElement;
    const keyframeId = marker.dataset.keyframeId;
    const lane = marker.closest(".track-lane") as HTMLDivElement | null;
    if (!keyframeId || !lane || event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    draggingKeyframe = { trackId, keyframeId, lane };
    selectedTrackId = trackId;
    selectedKeyframeId = keyframeId;
    pauseTimeline();
    window.addEventListener("mousemove", onKeyframeDragMove);
    window.addEventListener("mouseup", stopKeyframeDrag);
    onKeyframeDragMove(event);
  };

  const onKeyframeDragMove = (event: MouseEvent): void => {
    if (!draggingKeyframe) {
      return;
    }
    const rect = draggingKeyframe.lane.getBoundingClientRect();
    if (rect.width === 0) {
      return;
    }
    const computedTime = ((event.clientX - rect.left) / rect.width) * timelineDurationMs;
    setKeyframeTime(draggingKeyframe.trackId, draggingKeyframe.keyframeId, computedTime);
  };

  const stopKeyframeDrag = (): void => {
    if (!draggingKeyframe) {
      return;
    }
    draggingKeyframe = null;
    window.removeEventListener("mousemove", onKeyframeDragMove);
    window.removeEventListener("mouseup", stopKeyframeDrag);
  };

  const updateKeyframeValue = (trackId: string, keyframeId: string, event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    const keyframeTrack = tracks.find((track) => track.id === trackId);
    const spec = keyframeTrack ? propertySpec(keyframeTrack.property) : null;
    const nextValue = spec?.kind === "number" ? String(Number(input.value) || 0) : input.value;
    tracks = tracks.map((track) =>
      track.id === trackId
        ? {
            ...track,
            keyframes: track.keyframes.map((keyframe) =>
              keyframe.id === keyframeId
                ? {
                    ...keyframe,
                    value: nextValue,
                  }
                : keyframe,
            ),
          }
        : track,
    );
  };

  const updateKeyframeEasing = (trackId: string, keyframeId: string, event: Event): void => {
    const input = event.currentTarget as HTMLSelectElement;
    tracks = tracks.map((track) =>
      track.id === trackId
        ? {
            ...track,
            keyframes: track.keyframes.map((keyframe) =>
              keyframe.id === keyframeId ? { ...keyframe, easing: input.value as KeyframeEasing } : keyframe,
            ),
          }
        : track,
    );
  };

  const dropKeyframeAtPlayhead = (): void => {
    const created = addKeyframeAtTimeForSelected(currentTime);
    selectedKeyframeId = created ?? "";
  };

</script>

<main class="shell">
  <section class="panel app-intro">
    <p class="eyebrow">{softwareBase}</p>
    <h1>Tadpole</h1>
    <p>Timeline-first UI for building SVG animation keyframes and sequencing element properties by group/element.</p>
  </section>

  <section class="editor-layout" style={`--tadpole-drawer-width:${layoutColumnWidth};`}>
    <aside class="drawer" class:drawer-collapsed={!drawerOpen}>
      <div class="drawer-toggle-wrap">
        <button
          type="button"
          class="drawer-toggle"
          on:click={toggleDrawer}
          aria-expanded={drawerOpen}
          aria-label={drawerOpen ? "Collapse left drawer" : "Expand left drawer"}
        >
          {drawerOpen ? "◂" : "▸"}
        </button>
      </div>

      <div class="drawer-content" aria-hidden={!drawerOpen}>
        <section class="panel panel-workspace-controls">
          <h2>Workspace</h2>
          <p class="muted">Control the editor layout and quick workflow mode.</p>
          <div class="inline-label compact">
            <span>Drawer width: {drawerWidth}px</span>
            <div class="preset-row">
              {#each drawerWidthPresets as preset}
                <button type="button" class:active={drawerWidth === preset && drawerOpen} on:click={() => setDrawerPreset(preset)}>
                  {preset}
                </button>
              {/each}
            </div>
          </div>
          <div class="inline-label compact">
            <span>Filters</span>
            <input
              type="search"
              placeholder="Filter track id, target, property"
              value={trackFilterTerm}
              on:input={setTrackFilterTerm}
            />
            <div class="preset-row">
              <button type="button" class:is-active={trackSortMode === "manual"} on:click={() => setTrackSortMode("manual")}>
                Manual
              </button>
              <button type="button" class:is-active={trackSortMode === "target"} on:click={() => setTrackSortMode("target")}>
                Target
              </button>
              <button
                type="button"
                class:is-active={trackSortMode === "property"}
                on:click={() => setTrackSortMode("property")}
              >
                Property
              </button>
              <button type="button" on:click={clearTrackFilters}>Clear filters</button>
            </div>
          </div>
          <div class="inline-label compact">
            <span>Track visibility</span>
            <button type="button" class:is-active={showOnlySelected} on:click={toggleShowOnlySelected}>
              {showOnlySelected ? "Show all tracks" : "Show selected track only"}
            </button>
          </div>
        </section>
        <section class="panel">
        <h2>Dynamic Palette (Open Props)</h2>
        <p class="muted">Tune hue/chroma/rotation and remix the full 16-color Open Props palette in place.</p>
        <div class="controls">
          <label class="inline-label">
            Hue <strong>{paletteHue}°</strong>
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={paletteHue}
              on:input={setPaletteHue}
            />
          </label>
          <label class="inline-label">
            Chroma <strong>{paletteChroma.toFixed(2)}</strong>
            <input
              type="range"
              min="0"
              max="0.28"
              step="0.01"
              value={paletteChroma}
              on:input={setPaletteChroma}
            />
          </label>
          <label class="inline-label">
            Rotation <strong>{paletteRotate}</strong>
            <input
              type="range"
              min="0"
              max="36"
              step="1"
              value={paletteRotate}
              on:input={setPaletteRotate}
            />
          </label>
          <div class="palette-actions">
            {#each palettePresets as preset}
              <button type="button" on:click={() => applyPalette(preset.hue, preset.chroma, preset.rotate)}>
                {preset.name}
              </button>
            {/each}
            <button type="button" on:click={randomizePalette}>Randomize</button>
            <button type="button" on:click={resetPalette}>Reset</button>
          </div>
        </div>
        <div class="palette-swatch">
          {#each Array.from({ length: 16 }) as _, index}
            <span class="swatch" style={`background: var(--color-${index + 1});`}></span>
          {/each}
        </div>
        </section>

        <section class="panel">
        <h2>SVG Target Library</h2>
        <p class="muted">Pick a group/element target, then add its properties as tracks.</p>
        <div class="target-grid">
          {#each availableTargets as target}
            <button
              type="button"
              class="target-chip"
              class:is-active={target.id === selectedTargetId}
              on:click={() => {
                selectTarget(target.id);
                newTrackTargetId = target.id;
              }}
            >
              <span class="target-name">{target.name}</span>
              <span class="target-kind">{target.kind}</span>
            </button>
          {/each}
        </div>
        </section>

        <section class="panel">
        <h2>Detected Fonts</h2>
        {#if loading}
          <p>Loading font inventory…</p>
        {:else if error}
          <p class="error">{error}</p>
          <p>Start backend with <code>npm run dev:backend</code>.</p>
        {:else if fonts.length === 0}
          <p class="muted">No fonts found in <code>backend/fonts</code>.</p>
        {:else}
          <ul class="font-list">
            {#each fonts as font}
              <li>
                <strong>{font.family}</strong>
                <span>{font.format.toUpperCase()}</span>
                <span class="chip">{font.file}</span>
                <a href={font.url} target="_blank" rel="noreferrer">download</a>
                <a href={`${font.url}/stylesheet`} target="_blank" rel="noreferrer">css</a>
              </li>
            {/each}
          </ul>
        {/if}
        </section>
      </div>
    </aside>

    <button
      type="button"
      class="layout-resizer"
      aria-label="Resize left drawer"
      tabindex="0"
      on:mousedown={startDrawerResize}
      on:keydown={resizeDrawerByKeyboard}
      on:focus={() => {
        if (!drawerOpen) {
          drawerOpen = true;
        }
      }}
    >
      <span class="layout-resizer-indicator" aria-hidden="true"></span>
    </button>

    <div class="workbench">
      <div class="workbench-toolbar">
        <div class="workbench-toolbar-left">
          <div>
            <p class="eyebrow">Animation Workbench</p>
            <h2>Timeline + Live Preview</h2>
          </div>
          <div class="status-row">
            <span class="status-chip">State: {playheadLabel}</span>
            <span class="status-chip">Tracks: {tracks.length}</span>
            <span class="status-chip">Visible: {visibleTracks.length}</span>
            <span class="status-chip">Keys: {totalTrackKeyframes}</span>
            <span class="status-chip">Target: {selectedTrackName}</span>
            <span class="status-chip">Grid: {clampedGridCount}</span>
            <span class="status-chip">Snap: {snapToFrames ? "on" : "off"}</span>
            <span class="status-chip">Keyframe: {selectedKeyframe?.id ?? "none"}</span>
          </div>
        </div>
          <div class="toolbar">
            <button type="button" on:click={togglePlay}>{isPlaying ? "Pause" : "Play"}</button>
            <button type="button" on:click={stopTimeline}>Stop</button>
            <button type="button" on:click={toggleLoop} class:is-active={isLooping}>
              Loop {isLooping ? "ON" : "OFF"}
            </button>
            <button type="button" on:click={jumpToPreviousKeyframe} disabled={!selectedTrackHasKeyframes}>
              ← Prev keyframe
            </button>
            <button type="button" on:click={jumpToNextKeyframe} disabled={!selectedTrackHasKeyframes}>
              Next keyframe →
            </button>
            <button type="button" on:click={addKeyframeAtCurrentForSelected} disabled={selectedTrackId === ""}>
              Drop keyframe @ {formatMs(currentTime)}
            </button>
          <button type="button" on:click={duplicateSelectedKeyframe} disabled={selectedTrackId === "" || selectedKeyframeId === ""}>
            Duplicate selected keyframe
          </button>
          <button type="button" on:click={copyExport}>Export JSON {copiedExport ? `• ${copiedExport}` : ""}</button>
          <button type="button" on:click={() => (showKeyboardShortcuts = !showKeyboardShortcuts)}>
            {showKeyboardShortcuts ? "Hide shortcuts" : "Show shortcuts"}
          </button>
        </div>
      </div>
      {#if showKeyboardShortcuts}
        <div class="shortcuts-panel">
          <span>Space: Play/Pause</span>
          <span>Arrows: scrub by frame</span>
          <span>PgUp/PgDn: scrub by 10x</span>
          <span>Double-click preview scrubber: drop keyframe</span>
          <span>K: Add keyframe @ playhead</span>
          <span>,: Previous keyframe</span>
          <span>.: Next keyframe</span>
          <span>Delete: remove selected keyframe</span>
          <span>[ / ]: previous/next track</span>
          <span>M: Mute selected track</span>
          <span>Ctrl/Cmd + D: duplicate selected track</span>
          <span>H: toggle this panel</span>
        </div>
      {/if}
      <section class="panel panel-timeline">
        <div class="panel-heading">
          <div>
            <h2>Animation Timeline</h2>
            <p class="muted">Create and edit GSAP-like tracks. Click the ruler to scrub, click track lanes to add keyframes.</p>
          </div>
        </div>

        <div class="timeline-controls">
          <div class="control-row">
            <label class="inline-label compact">
              <span>Duration</span>
              <input
                type="range"
                min="250"
                max="30000"
                step="50"
                value={timelineDurationMs}
                on:input={setTimelineDuration}
              />
              <span>{formatMs(timelineDurationMs)} ({formatSec(timelineDurationMs)})</span>
            </label>
            <label class="inline-label compact">
              <span>Preset</span>
              <div class="preset-row">
                {#each timelineDurationPresets as preset}
                  <button type="button" on:click={() => setTimelineDurationPreset(preset)}>{preset}ms</button>
                {/each}
              </div>
            </label>
            <label class="inline-label compact">
              <span>Time</span>
              <input type="range" min="0" max={timelineDurationMs} step="1" value={currentTime} on:input={setCurrentTime} />
              <span>{formatMs(currentTime)} | {formatSec(currentTime)}</span>
            </label>
          </div>
          <div class="control-row">
            <label class="inline-label compact">
              <span>FPS</span>
              <input type="number" min="12" max="144" value={frameRate} on:input={setPlayRate} />
            </label>
            <label class="inline-label compact">
              <span>Snap</span>
              <input type="checkbox" checked={snapToFrames} on:change={setTimelineSnap} />
            </label>
            <label class="inline-label compact">
              <span>Snap Step (ms)</span>
              <input type="number" min="1" max="250" value={snapMs} on:input={setSnapSetting} />
            </label>
            <label class="inline-label compact">
              <span>Current</span>
              <input type="number" min="0" max={timelineDurationMs} value={currentTime} on:input={setCurrentTime} />
            </label>
            <label class="inline-label compact">
              <span>Grid density (ticks)</span>
              <input
                type="range"
                min={minGridDivisions}
                max={maxGridDivisions}
                step="1"
                value={timelineGridDensity}
                on:input={setTimelineGridDensity}
              />
              <span>{timelineGridDensity} marks</span>
            </label>
          </div>
        </div>

        <button
          type="button"
          class="timeline-ruler"
          bind:this={timelineCursorElement}
          aria-label="Timeline scrubber"
          on:mousedown={(event) => startScrub("timeline", event)}
          on:pointerup={stopScrub}
          on:keydown={jumpByTimelineKey}
        >
          <div class="timeline-track">
            {#each timelineTicks as tick}
              <div class="ruler-stop" style={`left:${trackPercent(tick)}%;`}>
                <span>{tick}ms</span>
              </div>
            {/each}
            <span class="scrubber" style={`left:${trackPercent(currentTime)}%;`}></span>
            <span class="scrubber-time" style={`left:${trackPercent(currentTime)}%;`}>{formatMs(currentTime)}</span>
          </div>
        </button>

        <div class="track-scroll">
          <div class="track-list">
            {#each visibleTracks as track (track.id)}
              <div
                class="track-card"
                class:track-selected={track.id === selectedTrackId}
                aria-label={`Track for ${targetNameById.get(track.targetId)} ${track.property}`}
              >
                <div class="track-heading">
                  <label class="inline-label">
                    <span>Target</span>
                    <select value={track.targetId} on:change={(event) => setTrackTarget(track.id, event)}>
                      {#each availableTargets as target}
                        <option value={target.id}>{target.name}</option>
                      {/each}
                    </select>
                  </label>
                  <label class="inline-label">
                    <span>Property</span>
                    <select value={track.property} on:change={(event) => setTrackProperty(track.id, event)}>
                      {#each propertyCatalog as property}
                        <option value={property.id}>{property.label}</option>
                      {/each}
                    </select>
                  </label>
                  <div class="track-meta">
                    <button type="button" class="inline-select" on:click={() => selectTrack(track.id)}>
                      {track.id === selectedTrackId ? "Selected" : "Select track"}
                    </button>
                    <button type="button" on:click={() => moveTrackOrder(track.id, -1)} disabled={!canMoveTrackUp(track.id)}>
                      ↑
                    </button>
                    <button type="button" on:click={() => moveTrackOrder(track.id, 1)} disabled={!canMoveTrackDown(track.id)}>
                      ↓
                    </button>
                    <button type="button" on:click={() => moveTrackToTop(track.id)} disabled={!canMoveTrackUp(track.id)}>
                      ⤒
                    </button>
                    <button type="button" on:click={() => moveTrackToBottom(track.id)} disabled={!canMoveTrackDown(track.id)}>
                      ⤓
                    </button>
                    <span class="chip">
                      {targetNameById.get(track.targetId)} • {track.property}
                    </span>
                    <button type="button" class:active={!track.muted} on:click={() => toggleTrackMute(track.id)}>
                      {track.muted ? "Unmute" : "Mute"}
                    </button>
                    <button type="button" on:click={() => resetTrackValues(track.id)}>
                      Reset values
                    </button>
                    <button type="button" on:click={() => duplicateTrack(track.id)}>Duplicate</button>
                    <button type="button" on:click={() => removeTrack(track.id)}>Delete</button>
                  </div>
                </div>

                <p class="muted tiny">
                  Live value at playhead: <code>{toCssValue(getCurrentValue(track, currentTime), track.property)}</code>
                  <span class="muted-divider">|</span>
                  Keyframes: {track.keyframes.length}
                </p>

                <div class="track-lane-shell">
                  <div
                    class="track-lane"
                    role="button"
                    tabindex="0"
                    aria-label={`Add keyframe for ${targetNameById.get(track.targetId)} ${track.property}`}
                    on:click={(event) => addKeyframeFromLane(track.id, event)}
                    on:keydown={(event) => {
                      if (event.key === " " || event.key === "Enter") {
                        event.preventDefault();
                        addKeyframeAtTimeForTrack(track.id, currentTime);
                      }
                    }}
                  >
                    <span class={`track-line ${track.muted ? "is-muted" : ""}`}></span>
                    {#each sortKeyframes(track.keyframes) as keyframe}
                      <button
                        type="button"
                        class={`keyframe-marker ${
                          keyframe.id === selectedKeyframeId && track.id === selectedTrackId ? "is-selected" : ""
                        } ${
                          draggingKeyframe?.trackId === track.id && draggingKeyframe?.keyframeId === keyframe.id
                            ? "is-dragging"
                            : ""
                        }`}
                        data-keyframe-id={keyframe.id}
                        style={`left:${trackPercent(keyframe.time)}%;`}
                        on:mousedown={(event) => startKeyframeDrag(track.id, event)}
                        on:click|stopPropagation={() => selectKeyframe(track.id, keyframe.id, keyframe.time)}
                        on:keydown={(event) => {
                          if (event.key === " " || event.key === "Enter") {
                            event.preventDefault();
                            selectKeyframe(track.id, keyframe.id, keyframe.time);
                          }
                        }}
                        title={`${keyframe.id} • ${keyframe.time}ms • ${keyframe.value}`}
                      >
                        {Math.round(keyframe.time)}
                      </button>
                    {/each}
                    <span class="playhead-mini" style={`left:${trackPercent(currentTime)}%;`}></span>
                  </div>
                </div>

                <div class="track-keys">
                  <div class="keyframe-header">
                    <h3>Keyframes</h3>
                    <button type="button" on:click={() => addKeyframeAtTimeForTrack(track.id, currentTime)}>
                      + Drop keyframe at {currentTime}ms
                    </button>
                  </div>
                  <ul>
                    {#each sortKeyframes(track.keyframes) as keyframe}
                      <li class:selected={selectedKeyframeId === keyframe.id && selectedTrackId === track.id}>
                        <button
                          type="button"
                          class="key-id-button"
                          on:click={() => selectKeyframe(track.id, keyframe.id, keyframe.time)}
                          on:keydown={(event) => {
                            if (event.key === " " || event.key === "Enter") {
                              event.preventDefault();
                              selectKeyframe(track.id, keyframe.id, keyframe.time);
                            }
                          }}
                        >
                          <span class="key-id">{keyframe.id}</span>
                        </button>
                        <label class="inline-label">
                          <span>time</span>
                          <input
                            type="number"
                            min="0"
                            max={timelineDurationMs}
                            value={keyframe.time}
                            on:input={(event) => updateKeyframeTime(track.id, keyframe.id, event)}
                          />
                        </label>
                        <label class="inline-label">
                          <span>value</span>
                          <input
                            type={isNumericProperty(track.property) ? "number" : "text"}
                            min={isNumericProperty(track.property) ? `${propertySpec(track.property).min ?? 0}` : undefined}
                            max={isNumericProperty(track.property) ? `${propertySpec(track.property).max ?? 0}` : undefined}
                            step={isNumericProperty(track.property) ? `${propertySpec(track.property).step ?? 1}` : undefined}
                            value={keyframe.value}
                            on:input={(event) => updateKeyframeValue(track.id, keyframe.id, event)}
                          />
                        </label>
                        <label class="inline-label">
                          <span>ease</span>
                          <select value={keyframe.easing} on:change={(event) => updateKeyframeEasing(track.id, keyframe.id, event)}>
                            {#each easingModes as easing}
                              <option value={easing}>{easing}</option>
                            {/each}
                          </select>
                        </label>
                        <button type="button" on:click={() => removeKeyframe(track.id, keyframe.id)}>Delete</button>
                      </li>
                    {/each}
                  </ul>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <section class="panel inspector-panel">
          <div class="panel-heading">
            <div>
              <h2>Selection Inspector</h2>
              <p class="muted">Quickly inspect and edit the selected track and keyframe.</p>
            </div>
          </div>
          {#if selectedTrack}
            <div class="inspector-grid">
              <label class="inline-label compact">
                <span>Selected Track</span>
                <input value={selectedTrack.id} readonly />
              </label>
              <label class="inline-label compact">
                <span>Target</span>
                <select value={selectedTrack.targetId} on:change={(event) => setTrackTarget(selectedTrack.id, event)}>
                  {#each availableTargets as target}
                    <option value={target.id}>{target.name}</option>
                  {/each}
                </select>
              </label>
              <label class="inline-label compact">
                <span>Property</span>
                <select value={selectedTrack.property} on:change={(event) => setTrackProperty(selectedTrack.id, event)}>
                  {#each propertyCatalog as property}
                    <option value={property.id}>{property.label}</option>
                  {/each}
                </select>
              </label>
              <label class="inline-label compact">
                <span>Playhead value</span>
                <input value={toCssValue(getCurrentValue(selectedTrack, currentTime), selectedTrack.property)} readonly />
              </label>
              <div class="inline-label compact">
                <span>Mute</span>
                <button type="button" on:click={() => toggleTrackMute(selectedTrack.id)}>
                  {selectedTrack.muted ? "Unmute" : "Mute"}
                </button>
              </div>
              <div class="inline-label compact">
                <span>Keyframes</span>
                <input value={selectedTrack.keyframes.length} readonly />
              </div>
            </div>

            <div class="inspector-actions">
              <button type="button" on:click={() => addKeyframeAtTimeForTrack(selectedTrack.id, currentTime)} disabled={selectedTrack === null}>
                Drop keyframe @ {formatMs(currentTime)}
              </button>
              <button
                type="button"
                on:click={duplicateSelectedKeyframe}
                disabled={selectedTrackId === "" || selectedKeyframeId === ""}
              >
                Duplicate selected keyframe
              </button>
              <button type="button" on:click={() => removeTrack(selectedTrack.id)} disabled={tracks.length <= 1}>
                Delete track
              </button>
            </div>

            {#if selectedKeyframe}
              <div class="inspector-keyframe">
                <h3>Active Keyframe</h3>
                <p class="muted">Editing: <strong>{selectedKeyframe.id}</strong> on {targetNameById.get(selectedTrack.targetId)}: {selectedTrack.property}</p>
                <div class="track-keys mini">
                  <label class="inline-label compact">
                    <span>time</span>
                    <input
                      type="number"
                      min="0"
                      max={timelineDurationMs}
                      value={selectedKeyframe.time}
                      on:input={(event) => updateKeyframeTime(selectedTrack.id, selectedKeyframe.id, event)}
                    />
                  </label>
                  <label class="inline-label compact">
                    <span>value</span>
                    <input
                      type={isNumericProperty(selectedTrack.property) ? "number" : "text"}
                      min={isNumericProperty(selectedTrack.property) ? `${propertySpec(selectedTrack.property).min ?? 0}` : undefined}
                      max={isNumericProperty(selectedTrack.property) ? `${propertySpec(selectedTrack.property).max ?? 0}` : undefined}
                      step={isNumericProperty(selectedTrack.property) ? `${propertySpec(selectedTrack.property).step ?? 1}` : undefined}
                      value={selectedKeyframe.value}
                      on:input={(event) => updateKeyframeValue(selectedTrack.id, selectedKeyframe.id, event)}
                    />
                  </label>
                  <label class="inline-label compact">
                    <span>easing</span>
                    <select value={selectedKeyframe.easing} on:change={(event) => updateKeyframeEasing(selectedTrack.id, selectedKeyframe.id, event)}>
                      {#each easingModes as easing}
                        <option value={easing}>{easing}</option>
                      {/each}
                    </select>
                  </label>
                  <button type="button" on:click={() => removeKeyframe(selectedTrack.id, selectedKeyframe.id)}>Delete keyframe</button>
                </div>
              </div>
            {:else}
              <p class="muted tiny">Select a keyframe in the timeline to edit per-keyframe values.</p>
            {/if}
          {:else}
            <p class="muted tiny">Select a track to unlock detailed editing controls.</p>
          {/if}
        </section>

        <div class="add-track">
          <h3>New Track</h3>
          <div class="toolbar">
            <label class="inline-label">
              <span>Target</span>
              <select bind:value={newTrackTargetId}>
                {#each availableTargets as target}
                  <option value={target.id}>{target.name}</option>
                {/each}
              </select>
            </label>
            <label class="inline-label">
              <span>Property</span>
              <select bind:value={newTrackProperty}>
                {#each propertyCatalog as property}
                  <option value={property.id}>{property.label}</option>
                {/each}
              </select>
            </label>
            <button type="button" on:click={addTrack}>Create Track</button>
          </div>
          <p class="muted tiny">
            Tip: click a timeline lane or use + Drop keyframe at playhead on any selected track.
          </p>
        </div>

        <div class="export-block">
          <h3>Timeline Export</h3>
          <p class="muted">
            Use this JSON payload in a future player / render step.
          </p>
          <pre><code>{exportPayload}</code></pre>
        </div>
      </section>

      <section class="panel panel-preview">
        <div class="panel-heading">
          <div>
            <h2>Live Preview</h2>
            <p class="muted">
              Animate the logo targets in-place as the playhead moves.
              {#if activeTrack}
                Targeting <strong>{targetNameById.get(activeTrack.targetId) ?? activeTrack.targetId}</strong>:{activeTrack.property}
              {/if}
            </p>
          </div>
          <div class="toolbar">
            <button type="button" on:click={dropKeyframeAtPlayhead} disabled={activeTrack === null}>
              Drop keyframe on {activeTrack ? ` ${targetNameById.get(activeTrack.targetId) ?? activeTrack.targetId}` : "selected track"} @
              {currentTime}ms
            </button>
          </div>
        </div>

        <div class="preview-controls">
          <div class="preview-controls-row">
            <label class="inline-label compact">
              <span>Scrubber</span>
              <input
                type="range"
                min="0"
                max={timelineDurationMs}
                step={snapToFrames ? snapMs : 1}
                value={currentTime}
                on:input={setCurrentTime}
              />
              <span>{formatMs(currentTime)} ({formatSec(currentTime)})</span>
            </label>
            <label class="inline-label compact">
              <span>Drop keyframe</span>
              <button type="button" on:click={dropKeyframeAtPlayhead} disabled={activeTrack === null}>
                Drop on selected track
              </button>
              <span>
                {#if selectedTrackNeighborhood.at}
                  on frame {formatMs(selectedTrackNeighborhood.at.time)}
                {:else if selectedTrackNeighborhood.previous}
                  between {formatMs(selectedTrackNeighborhood.previous.time)} and {selectedTrackNeighborhood.next
                    ? formatMs(selectedTrackNeighborhood.next.time)
                    : "end"}
                {:else if selectedTrackNeighborhood.next}
                  before {formatMs(selectedTrackNeighborhood.next.time)}
                {:else}
                  no frames
                {/if}
              </span>
            </label>
          </div>
          <div class="preview-metadata" aria-live="polite">
            <span class="preview-metadata-item">
              {#if selectedTrack === null}
                No active track selected
              {:else}
                Selected: {targetNameById.get(selectedTrack.targetId) ?? selectedTrack.targetId} • {selectedTrack.property}
              {/if}
            </span>
            <span class="preview-metadata-item">
              {#if selectedTrackNeighborhood.previous}
                Prev: {formatMs(selectedTrackNeighborhood.previous.time)}
              {/if}
            </span>
            <span class="preview-metadata-item">
              {#if selectedTrackNeighborhood.next}
                Next: {formatMs(selectedTrackNeighborhood.next.time)}
              {/if}
            </span>
          </div>
        </div>

        <div class="preview-shell">
          <div
            class="preview-track"
            bind:this={previewScrubberElement}
            role="button"
            tabindex="0"
            aria-label="Preview scrubber"
            on:mousedown={(event) => startScrub("preview", event)}
            on:dblclick={addKeyframeFromPreviewScrubber}
            on:pointerup={stopScrub}
            on:keydown={jumpByTimelineKey}
          >
            {#each timelineTicks as tick}
              <span class="preview-tick" style={`left:${trackPercent(tick)}%;`}>{tick}ms</span>
            {/each}
            {#if activeTrack}
              {#each sortKeyframes(activeTrack.keyframes) as keyframe}
                <button
                  type="button"
                  class={`preview-keyframe ${selectedKeyframeId === keyframe.id ? "is-selected" : ""}`}
                  style={`left:${trackPercent(keyframe.time)}%;`}
                  title={`keyframe ${keyframe.time}ms • ${keyframe.value}`}
                  on:mousedown={(event) => event.stopPropagation()}
                  on:click={() => selectKeyframe(activeTrack.id, keyframe.id, keyframe.time)}
                ></button>
              {/each}
            {/if}
            <span class="preview-scrubber" style={`left:${trackPercent(currentTime)}%;`}></span>
            <span class="preview-scrubber-time" style={`left:${trackPercent(currentTime)}%;`}>
              {formatMs(currentTime)}
            </span>
          </div>
          <div class="preview-stage">
            <div
              class="preview-svg-host"
              bind:this={previewSvgHostElement}
              aria-label="Source SVG Animation Preview"
            >
              {@html svgMarkup}
            </div>
          </div>
        </div>
      </section>
    </div>
  </section>
</main>

<style>
  .shell {
    width: min(110rem, 100%);
    margin: 0 auto;
    display: grid;
    gap: var(--size-4);
    align-content: start;
  }

  .editor-layout {
    display: grid;
    gap: var(--size-4);
    grid-template-columns: var(--tadpole-drawer-width, 24rem) var(--size-1) 1fr;
    align-items: start;
  }

  .drawer {
    display: grid;
    gap: var(--size-4);
    position: sticky;
    top: var(--size-3);
    width: var(--tadpole-drawer-width, 24rem);
    min-width: var(--tadpole-drawer-width, 24rem);
    max-width: var(--tadpole-drawer-width, 24rem);
    overflow: hidden;
    transition: width 0.1s ease;
  }

  .drawer-content {
    display: grid;
    gap: var(--size-4);
    min-width: 0;
  }

  .drawer-collapsed .drawer-content {
    display: none;
  }

  .drawer-toggle-wrap {
    display: flex;
    justify-content: flex-end;
  }

  .drawer-toggle {
    min-width: 2rem;
    border: 1px solid var(--tadpole-border);
    border-radius: 999px;
    min-height: 2rem;
    width: 2rem;
    color: var(--tadpole-text);
    background: var(--color-10);
    cursor: pointer;
    line-height: 1;
  }

  .drawer-toggle:hover {
    background: color-mix(in oklab, var(--color-10) 88%, white);
  }

  .layout-resizer {
    margin-top: calc(var(--size-8) - 0.2rem);
    width: var(--size-1);
    border: 0;
    border-radius: var(--radius-2);
    background: color-mix(in oklab, var(--tadpole-border), black);
    padding: 0;
    cursor: col-resize;
    position: sticky;
    top: calc(var(--size-3) + 2.6rem);
    height: calc(100% - var(--size-8));
  }

  .layout-resizer-indicator {
    width: 0.1rem;
    height: 1.4rem;
    display: block;
    margin: 0 auto;
    border-radius: 999px;
    background: color-mix(in oklab, var(--tadpole-text-muted), transparent 55%);
  }

  .layout-resizer:focus-visible {
    outline: 2px solid var(--tadpole-accent);
    outline-offset: 2px;
  }

  .workbench {
    display: grid;
    gap: var(--size-4);
    min-width: 0;
    grid-template-columns: 1fr;
    grid-template-areas:
      "toolbar"
      "timeline"
      "preview";
  }

  .workbench-toolbar {
    grid-area: toolbar;
    border: 1px dashed var(--tadpole-border);
    border-radius: var(--radius);
    background: var(--tadpole-panel);
    padding: var(--size-3) var(--size-4);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--size-4);
    flex-wrap: wrap;
  }

  .workbench-toolbar-left {
    display: grid;
    gap: 0.25rem;
  }

  .status-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-2);
    margin-top: 0.25rem;
  }

  .shortcuts-panel {
    margin-top: 0.5rem;
    border: 1px dashed var(--tadpole-border);
    border-radius: var(--radius-2);
    padding: 0.5rem;
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    color: var(--tadpole-text-muted);
    font-size: var(--font-size-0);
  }

  .shortcuts-panel span {
    border: 1px solid color-mix(in oklab, var(--tadpole-border), transparent);
    border-radius: 999px;
    padding: 0.2rem 0.45rem;
    background: color-mix(in oklab, var(--color-10) 78%, transparent);
  }

  .status-chip {
    border: 1px solid var(--tadpole-border);
    border-radius: 999px;
    padding: 0.15rem 0.5rem;
    color: var(--tadpole-text-muted);
    font-size: var(--font-size-0);
    background: color-mix(in oklab, var(--color-13) 72%, transparent);
  }

  .panel-timeline {
    grid-area: timeline;
  }

  .panel-preview {
    grid-area: preview;
  }

  .eyebrow {
    margin: 0;
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--tadpole-text-muted);
  }

  h1 {
    margin: 0;
    font-size: clamp(1.9rem, 4vw, 2.75rem);
    line-height: 1.1;
  }

  h2 {
    margin: 0 0 0.5rem;
  }

  h3 {
    margin: 0 0 0.5rem;
    font-size: var(--font-size-1);
    color: var(--tadpole-text);
  }

  p {
    margin: 0.25rem 0 0;
  }

  .panel {
    border: 1px solid var(--tadpole-border);
    border-radius: var(--radius);
    padding: var(--size-4);
    background: var(--tadpole-panel);
    backdrop-filter: blur(2px);
  }

  .panel-preview {
    height: clamp(18rem, 38vh, 24rem);
    min-height: 20rem;
    max-height: clamp(20rem, 42vh, 24rem);
    display: grid;
    grid-template-rows: auto auto 1fr;
  }

  .muted {
    color: var(--tadpole-text-muted);
  }

  .tiny {
    font-size: var(--font-size-0);
  }

  .preview-controls {
    margin: var(--size-3) 0;
  }

  .preview-controls-row {
    display: grid;
    gap: var(--size-2);
  }

  .preview-metadata {
    margin-top: var(--size-2);
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-2);
    color: var(--tadpole-text-muted);
    align-items: center;
  }

  .preview-metadata-item {
    border: 1px solid color-mix(in oklab, var(--tadpole-border), transparent);
    border-radius: var(--radius-2);
    padding: 0.2rem 0.5rem;
    background: color-mix(in oklab, var(--color-13) 72%, transparent);
  }

  .panel-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--size-4);
  }

  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-2);
    justify-content: flex-end;
  }

  .toolbar button,
  .palette-actions button,
  .track-meta button {
    border-radius: var(--radius-2);
    border: 1px solid var(--tadpole-border);
    padding: 0.45rem 0.72rem;
    color: var(--tadpole-text);
    background: var(--color-10);
    cursor: pointer;
    min-height: 2rem;
    font-weight: var(--font-weight-5);
  }

  .toolbar button:hover,
  .palette-actions button:hover,
  .track-meta button:hover {
    background: color-mix(in oklab, var(--color-10) 88%, white);
  }

  .preset-row button.active,
  .inline-label button.is-active {
    border-color: color-mix(in oklab, var(--tadpole-accent) 45%, var(--tadpole-border));
    background: color-mix(in oklab, var(--color-8) 22%, var(--color-10));
  }

  .toolbar button.is-active {
    border-color: color-mix(in oklab, var(--tadpole-accent) 45%, var(--tadpole-border));
    background: color-mix(in oklab, var(--color-8) 22%, var(--color-10));
  }

  .toolbar button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .inline-label {
    display: grid;
    gap: var(--size-1);
    color: var(--tadpole-text-muted);
  }

  .inline-label.compact {
    min-width: 8rem;
  }

  .inline-label input,
  .inline-label select {
    border: 1px solid var(--tadpole-border);
    background: var(--color-13);
    border-radius: var(--radius-2);
    padding: 0.35rem 0.5rem;
    color: var(--tadpole-text);
  }

  .inline-label input[type="range"] {
    min-width: 14rem;
  }

  .controls {
    margin-top: var(--size-3);
    display: grid;
    gap: var(--size-4);
  }

  .palette-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-2);
  }

  .preset-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-2);
  }

  .preset-row button {
    font-size: var(--font-size-0);
    padding: 0.28rem 0.5rem;
    min-height: 1.8rem;
  }

  .panel-workspace-controls {
    background: color-mix(in oklab, var(--color-12) 86%, transparent);
  }

  .palette-swatch {
    margin-top: var(--size-2);
    display: grid;
    grid-template-columns: repeat(16, minmax(2rem, 1fr));
    gap: var(--size-2);
  }

  .swatch {
    aspect-ratio: 1;
    border-radius: var(--radius-2);
    border: 1px solid color-mix(in oklab, var(--tadpole-border), black);
  }

  .target-grid {
    margin-top: var(--size-3);
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
    gap: var(--size-2);
  }

  .target-chip {
    border: 1px dashed var(--tadpole-border);
    border-radius: var(--radius-2);
    background: color-mix(in oklab, var(--color-13) 72%, transparent);
    color: var(--tadpole-text);
    text-align: left;
    padding: 0.6rem;
    cursor: pointer;
    display: grid;
    gap: 0.18rem;
  }

  .target-chip.is-active {
    border-style: solid;
    border-color: color-mix(in oklab, var(--tadpole-accent) 42%, transparent);
    background: color-mix(in oklab, var(--color-8) 18%, transparent);
  }

  .target-name {
    font-size: var(--font-size-1);
    font-weight: var(--font-weight-5);
  }

  .target-kind {
    color: var(--tadpole-text-muted);
    font-size: var(--font-size-0);
    text-transform: uppercase;
  }

  .timeline-controls {
    margin: var(--size-4) 0 var(--size-3);
    display: grid;
    gap: var(--size-2);
  }

  .control-row {
    display: grid;
    gap: var(--size-2);
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  }

  .timeline-ruler {
    margin: var(--size-3) 0 var(--size-3);
    display: block;
    width: 100%;
    border: 0;
    padding: 0;
    background: transparent;
    text-align: initial;
  }

  .timeline-track {
    position: relative;
    height: var(--size-7);
    border-radius: var(--radius-2);
    border: 1px dashed color-mix(in oklab, var(--tadpole-border), white);
    background: color-mix(in oklab, var(--color-13) 90%, transparent);
    overflow: hidden;
  }

  .ruler-stop {
    position: absolute;
    top: 0;
    bottom: 0;
    transform: translateX(-50%);
    pointer-events: none;
    width: 0.1px;
  }

  .ruler-stop span {
    position: absolute;
    bottom: -0.2rem;
    transform: translate(-50%, 100%);
    font-size: var(--font-size-0);
    color: var(--tadpole-text-muted);
  }

  .scrubber {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    transform: translateX(-1px);
    background: var(--tadpole-accent);
  }

  .scrubber-time {
    position: absolute;
    top: 0;
    transform: translate(-50%, -100%);
    font-size: var(--font-size-0);
    color: var(--tadpole-text-muted);
    pointer-events: none;
  }

  .track-list {
    margin-top: var(--size-4);
    display: grid;
    gap: var(--size-3);
  }

  .track-scroll {
    max-height: min(48vh, 36rem);
    overflow: auto;
    padding-right: var(--size-2);
    padding-bottom: var(--size-1);
  }

  .track-scroll::-webkit-scrollbar {
    width: 0.5rem;
  }

  .track-scroll::-webkit-scrollbar-thumb {
    background: color-mix(in oklab, var(--tadpole-border), white);
    border-radius: var(--radius-2);
  }

  .track-card {
    border: 1px solid var(--tadpole-border);
    border-radius: var(--radius-2);
    background: color-mix(in oklab, var(--color-12) 82%, transparent);
    padding: var(--size-3);
  }

  .track-card:hover {
    border-color: color-mix(in oklab, var(--color-9) 52%, var(--tadpole-border));
  }

  .track-selected {
    outline: 2px solid color-mix(in oklab, var(--tadpole-accent) 45%, transparent);
  }

  .track-card:focus-within {
    outline: 2px solid color-mix(in oklab, var(--tadpole-accent) 45%, transparent);
    outline-offset: 2px;
  }

  .track-heading {
    display: grid;
    gap: var(--size-2);
    grid-template-columns: 1fr 1fr auto;
    align-items: end;
  }

  .track-meta {
    display: flex;
    align-items: center;
    gap: var(--size-2);
    justify-content: flex-end;
    grid-column: 1 / -1;
    flex-wrap: wrap;
  }

  .track-meta button {
    min-height: 1.75rem;
    padding-block: 0.35rem;
    border-radius: var(--radius-2);
  }

  .track-meta button.active {
    background: color-mix(in oklab, var(--color-8) 28%, var(--color-10));
  }

  .muted-divider {
    display: inline-block;
    margin: 0 0.5rem;
  }

  .track-lane-shell {
    margin-top: var(--size-2);
    padding: var(--size-1) 0 var(--size-1);
  }

  .track-lane {
    position: relative;
    height: var(--size-8);
    border-radius: var(--radius-2);
    background: color-mix(in oklab, var(--color-13) 70%, transparent);
    cursor: crosshair;
  }

  .track-line {
    position: absolute;
    top: 50%;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--color-9);
    transform: translateY(-50%);
  }

  .track-line.is-muted {
    opacity: 0.2;
  }

  .keyframe-marker {
    position: absolute;
    top: 50%;
    z-index: 2;
    width: 1.4rem;
    aspect-ratio: 1;
    transform: translate(-50%, -50%);
    border-radius: 999px;
    border: 1px solid var(--color-0);
    color: var(--color-0);
    background: var(--color-9);
    font-size: 8px;
    padding: 0;
    cursor: pointer;
  }

  .keyframe-marker:hover {
    background: var(--color-8);
  }

  .keyframe-marker.is-selected {
    background: var(--color-5);
    border-color: var(--color-0);
    transform: translate(-50%, -52%) scale(1.08);
  }

  .keyframe-marker.is-dragging {
    cursor: grabbing;
    background: var(--color-8);
  }

  .playhead-mini {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: color-mix(in oklab, var(--color-8) 85%, var(--color-9));
    transform: translateX(-1px);
  }

  .track-keys {
    margin-top: var(--size-2);
    padding-top: var(--size-2);
    border-top: 1px dashed var(--tadpole-border);
  }

  .keyframe-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--size-2);
  }

  .track-keys ul {
    margin: var(--size-2) 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--size-2);
  }

  .inspector-panel {
    border: 1px solid color-mix(in oklab, var(--tadpole-border), var(--color-10));
    border-radius: var(--radius-2);
    padding: var(--size-3);
    display: grid;
    gap: var(--size-3);
    background: color-mix(in oklab, var(--color-12) 75%, transparent);
  }

  .inspector-grid {
    margin: 0;
    display: grid;
    gap: var(--size-2);
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  }

  .inspector-grid .inline-label.compact {
    min-width: 0;
  }

  .inspector-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-2);
    align-items: center;
  }

  .inspector-keyframe {
    border-top: 1px dashed var(--tadpole-border);
    padding-top: var(--size-3);
    margin-top: var(--size-2);
  }

  .inspector-keyframe .track-keys {
    margin-top: 0.75rem;
    border-top: 0;
    padding-top: 0;
  }

  .inspector-keyframe .track-keys .inline-label {
    min-width: 0;
  }

  .track-keys.mini .inline-label {
    grid-template-columns: 1fr;
  }

  .track-keys li {
    display: grid;
    gap: var(--size-2);
    align-items: center;
    grid-template-columns: auto 1fr 1fr 1fr auto;
    padding-bottom: var(--size-2);
    border-bottom: 1px solid var(--tadpole-border);
    cursor: pointer;
  }

  .track-keys li.selected {
    background: color-mix(in oklab, var(--color-8) 12%, transparent);
    border-color: color-mix(in oklab, var(--color-8) 52%, var(--tadpole-border));
    border-radius: var(--radius-2);
  }

  .key-id {
    color: var(--tadpole-text-muted);
    font-size: var(--font-size-0);
  }

  .track-keys li .inline-label {
    min-width: 0;
  }

  .key-id-button {
    border: 0;
    padding: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    text-align: left;
    border-radius: var(--radius-1);
  }

  .add-track {
    margin-top: var(--size-4);
    border: 1px dashed var(--tadpole-border);
    border-radius: var(--radius-2);
    padding: var(--size-3);
    background: color-mix(in oklab, var(--color-13) 74%, transparent);
  }

  .add-track .toolbar {
    align-items: end;
  }

  .export-block {
    margin-top: var(--size-4);
    border-top: 1px dashed var(--tadpole-border);
    padding-top: var(--size-3);
    display: grid;
    gap: var(--size-2);
  }

  .export-block pre {
    margin: 0;
    border: 1px solid var(--tadpole-border);
    background: color-mix(in oklab, var(--color-13) 82%, transparent);
    border-radius: var(--radius-2);
    padding: var(--size-2);
    overflow: auto;
    max-height: 12rem;
    font-size: 12px;
  }

  .preview-shell {
    margin-top: var(--size-3);
    display: grid;
    gap: var(--size-3);
    align-content: start;
    min-height: 0;
  }

  .preview-track {
    position: relative;
    height: var(--size-7);
    border-radius: var(--radius-2);
    border: 1px dashed color-mix(in oklab, var(--tadpole-border), white);
    background: color-mix(in oklab, var(--color-13) 90%, transparent);
    overflow: hidden;
    cursor: pointer;
  }

  .preview-tick {
    position: absolute;
    top: 0;
    bottom: 0;
    transform: translateX(-50%);
    font-size: var(--font-size-0);
    color: var(--tadpole-text-muted);
    pointer-events: none;
  }

  .preview-tick:first-of-type,
  .preview-tick:last-of-type {
    display: none;
  }

  .preview-keyframe {
    appearance: none;
    border: 0;
    padding: 0;
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    transform: translateX(-1px);
    background: color-mix(in oklab, var(--color-6) 72%, var(--tadpole-accent));
    opacity: 0.85;
    cursor: pointer;
    pointer-events: auto;
  }

  .preview-keyframe:hover,
  .preview-keyframe:focus-visible {
    opacity: 1;
    background: color-mix(in oklab, var(--color-8) 72%, var(--tadpole-accent));
    outline: 1px solid color-mix(in oklab, var(--color-8) 62%, white);
  }

  .preview-keyframe.is-selected {
    background: var(--color-5);
    width: 3px;
    opacity: 1;
    box-shadow: 0 0 0 2px color-mix(in oklab, var(--color-5) 22%, transparent);
  }

  .preview-scrubber {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    transform: translateX(-1px);
    background: var(--tadpole-accent);
  }

  .preview-scrubber-time {
    position: absolute;
    top: 0;
    transform: translate(-50%, -100%);
    font-size: var(--font-size-0);
    color: var(--tadpole-text-muted);
    pointer-events: none;
    background: color-mix(in oklab, var(--color-13) 92%, transparent);
    border-radius: var(--radius-2);
    padding: 0.15rem 0.38rem;
    border: 1px solid color-mix(in oklab, var(--tadpole-border), transparent);
  }

  .preview-stage {
    min-height: 10rem;
    border-radius: var(--radius-2);
    border: 1px dashed color-mix(in oklab, var(--tadpole-border), white);
    background: var(--color-13);
    overflow: hidden;
    display: grid;
    place-items: center;
    height: 100%;
  }

  .preview-svg-host {
    width: min(420px, 100%);
    max-width: 100%;
    display: grid;
    place-items: center;
  }

  .preview-svg,
  .preview-svg-host :global(svg) {
    width: min(420px, 100%);
    max-width: 100%;
    height: auto;
    display: block;
  }

  .preview-text,
  .preview-svg-host :global(.preview-text) {
    letter-spacing: 0.02em;
  }

  .font-list {
    margin: var(--size-3) 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--size-2);
  }

  .font-list li {
    display: grid;
    grid-template-columns: 1fr auto auto auto auto;
    align-items: center;
    gap: var(--size-2);
    padding: var(--size-2) 0;
    border-bottom: 1px solid var(--tadpole-border);
  }

  .error {
    color: var(--red-3);
  }

  a {
    color: var(--tadpole-accent);
    font-weight: 600;
  }

  .chip {
    color: var(--tadpole-text-muted);
    font-size: var(--font-size-0);
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    max-width: 13rem;
  }

  @media (max-width: 960px) {
    .editor-layout {
      grid-template-columns: 1fr;
    }

    .layout-resizer {
      display: none;
    }

    .drawer {
      position: static;
      order: 2;
      width: auto;
      min-width: 0;
      max-width: none;
      overflow: auto;
    }

    .workbench {
      order: 1;
    }

    .drawer-collapsed .drawer-content {
      display: grid;
    }

    .panel-heading,
    .track-heading,
    .track-meta {
      flex-wrap: wrap;
    }

    .panel-heading {
      align-items: start;
    }

    .control-row {
      grid-template-columns: 1fr;
    }

    .track-heading {
      grid-template-columns: 1fr;
    }

    .track-meta {
      justify-content: flex-start;
    }

    .track-keys li {
      grid-template-columns: 1fr;
    }

    .font-list li {
      grid-template-columns: 1fr;
      justify-items: start;
    }

    .workbench {
      grid-template-areas:
        "toolbar"
        "timeline"
        "preview";
    }

    .workbench-toolbar {
      flex-direction: column;
      align-items: stretch;
    }
  }

  @media (min-width: 1200px) {
    .workbench {
      grid-template-columns: 1fr minmax(18rem, 26rem);
      grid-template-areas:
        "toolbar toolbar"
        "timeline preview";
      align-items: start;
    }

    .panel-preview {
      min-height: 0;
      height: min(100%, 32rem);
      max-height: 32rem;
      position: sticky;
      top: var(--size-3);
    }

    .panel-timeline {
      max-height: min(62vh, 48rem);
      overflow: auto;
    }
  }
</style>
