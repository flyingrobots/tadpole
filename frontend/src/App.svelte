<script lang="ts">
  import { onDestroy, onMount, tick as nextDomUpdate } from "svelte";
  import {
    AddKeyframeCommand,
    AddTrackCommand,
    AddTracksCommand,
    DeleteKeyframeCommand,
    dispatchEditorCommand,
    EditorCommandHistory,
    type EditorCommandIntent,
    EditorHistoryEntry,
    EditorCommandStateSnapshot,
    MoveKeyframeCommand,
    RemoveTrackCommand,
    SeekTimelineCommand,
    SetKeyframeEasingCommand,
    SetKeyframeValueCommand,
  } from "./EditorCommands";
  import { serializeSvgNativeSave, SvgNativeSaveRequest } from "./SvgNativeSave";
  import { buildSvgLayerTree, type SvgLayerRow } from "./SvgLayerTree";
  import {
    selectableSvgTargetSelector,
    svgTargetKindFromTag,
    svgTargetNameFromElement,
    type SvgTargetKind,
  } from "./SvgTargetMetadata";
  import { StarterTimelinePlanner } from "./StarterTimelinePlanner";
  import { StarterTimelineSuggestion } from "./StarterTimelineSuggestion";
  import { StarterTimelineTargetFact } from "./StarterTimelineTargetFact";

  type FontRecord = {
    file: string;
    family: string;
    format: string;
    url: string;
  };

  type AnimationTarget = {
    id: string;
    name: string;
    kind: SvgTargetKind;
  };

  type AnimationProperty =
    | "x"
    | "y"
    | "scale"
    | "rotation"
    | "opacity"
    | "fill"
    | "stroke"
    | "strokeWidth"
    | "strokeDashoffset";
  type TrackSortMode = "manual" | "target" | "property";
  type TimeDisplayMode = "seconds" | "frames";
  type EditorPanel =
    | "none"
    | "workspace"
    | "source"
    | "palette"
    | "targets"
    | "fonts"
    | "export"
    | "warnings"
    | "layers"
    | "inspector"
    | "debug";
  type ContextPanel = Exclude<EditorPanel, "none">;
  type EditorMenu = "file" | "edit" | "view" | "timeline" | "export" | "help";
  type EditorDialog = "open-svg" | "paste-svg" | "save-svg" | "export-runnable";
  type InspectorMode = "document" | "target" | "track" | "keyframe" | "warning";
  type InspectorValidationState = "valid" | "invalid";
  type DockRegion = "left" | "right";

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

  type RgbColor = {
    r: number;
    g: number;
    b: number;
  };

  type DraggingKeyframe = {
    trackId: string;
    keyframeId: string;
    lane: HTMLDivElement;
    startTime: number;
    startSnapshot: EditorCommandStateSnapshot;
  } | null;

  type TimelineTrack = {
    id: string;
    targetId: string;
    property: AnimationProperty;
    keyframes: Keyframe[];
    muted: boolean;
  };

  type KeyframeSpan = {
    id: string;
    startTime: number;
    endTime: number;
  };

  type TargetSummaryKeyframe = {
    id: string;
    trackId: string;
    keyframeId: string;
    property: AnimationProperty;
    time: number;
    value: string;
  };

  type TimelineTargetKind = AnimationTarget["kind"] | "missing";

  type PropertyTimelineRow = {
    id: string;
    track: TimelineTrack;
    targetId: string;
    targetLabel: string;
    targetKind: TimelineTargetKind;
    propertyLabel: string;
    sortedKeyframes: Keyframe[];
    spans: KeyframeSpan[];
    currentValue: string;
    keyframeCount: number;
  };

  type TargetTimelineRow = {
    targetId: string;
    targetLabel: string;
    targetKind: TimelineTargetKind;
    expanded: boolean;
    trackCount: number;
    keyframeCount: number;
    mutedTrackCount: number;
    warningCount: number;
    propertyRows: PropertyTimelineRow[];
    summaryKeyframes: TargetSummaryKeyframe[];
  };

  type LayerPanelRow = {
    row: SvgLayerRow;
    trackCount: number;
    keyframeCount: number;
    warningCount: number;
    selected: boolean;
  };

  type InspectorWarning = {
    id: string;
    source: string;
    message: string;
  };

  type SvgLoadOptions = {
    label: string;
    revision?: number;
    restoreSampleTracks?: boolean;
  };

  type ImportedAnimationKeyframe = Omit<Keyframe, "id">;

  type ImportedAnimationTrack = {
    targetId: string;
    property: AnimationProperty;
    keyframes: ImportedAnimationKeyframe[];
  };

  type SvgAnimationImportResult = {
    tracks: ImportedAnimationTrack[];
    warnings: string[];
    duration: number;
    hasIndefiniteRepeat: boolean;
  };

  type SvgImportResult = {
    markup: string;
    targets: AnimationTarget[];
    animation: SvgAnimationImportResult;
  };

  type TadpoleProject = {
    version: "tadpole-project-1";
    svg: {
      label: string;
      source: string;
      targets: AnimationTarget[];
    };
    timeline: {
      duration: number;
      currentTime: number;
      frameRate: number;
      isLooping: boolean;
      snapToFrames: boolean;
      snapMs: number;
      gridDensity: number;
      tracks: TimelineTrack[];
    };
  };

  type RunnableAnimationPayload = {
    version: "tadpole-runnable-html-1";
    svg: {
      label: string;
      source: string;
      targets: AnimationTarget[];
    };
    timeline: {
      duration: number;
      frameRate: number;
      isLooping: boolean;
      selectedTrackId: string;
      tracks: TimelineTrack[];
    };
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
  const sampleTimelineDurationMs = 1200;
  const minGridDivisions = 5;
  const maxGridDivisions = 24;
  const defaultGridDivisions = 12;
  const projectExportVersion = "tadpole-project-1";
  const runnableExportVersion = "tadpole-runnable-html-1";
  const defaultProjectImportStatus = "Paste a Tadpole project JSON payload to validate it.";
  const defaultPanelReturnFocusSelector = "[data-tadpole-panel-toggle]";
  const panelSheetMediaQueryText = "(max-width: 720px)";
  const panelFocusableSelector =
    "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex]:not([tabindex='-1'])";
  const panelIds: ContextPanel[] = [
    "workspace",
    "source",
    "palette",
    "targets",
    "fonts",
    "export",
    "warnings",
    "layers",
    "inspector",
    "debug",
  ];

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
    { id: "strokeDashoffset", label: "Stroke Dash Offset", kind: "number", defaultValue: "0", step: 1, snap: 1 },
  ];
  const quickTrackPropertyIds = new Set<AnimationProperty>(["x", "y", "opacity", "fill"]);
  const quickTrackProperties = propertyCatalog.filter((property) => quickTrackPropertyIds.has(property.id));
  const properties: AnimationProperty[] = propertyCatalog.map((property) => property.id);
  const transformProperties: AnimationProperty[] = ["x", "y", "scale", "rotation"];
  const propertyById = new Map<AnimationProperty, PropertyDefinition>(
    propertyCatalog.map((property): [AnimationProperty, PropertyDefinition] => [property.id, property]),
  );
  const starterTimelinePlanner = new StarterTimelinePlanner();
  const numericProperties = new Set(properties.filter((property) => propertyById.get(property)?.kind === "number"));
  const colorProperties = new Set(properties.filter((property) => propertyById.get(property)?.kind === "color"));
  type PreviewStyle = {
    transform: string;
    opacity: string;
    fill: string;
    stroke: string;
    strokeWidth: string;
    strokeDashoffset: string;
  };
  type PreviewStyleProperty =
    | "transform"
    | "transform-origin"
    | "transform-box"
    | "opacity"
    | "fill"
    | "stroke"
    | "stroke-width"
    | "stroke-dashoffset";
  type OriginalInlineStyle = {
    value: string;
    priority: string;
  };

  const sampleSvgLabel = "Sample Logo";
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
  const blockedSvgElements = new Set([
    "animate",
    "animatecolor",
    "animatemotion",
    "animatetransform",
    "discard",
    "script",
    "set",
    "style",
    "foreignobject",
    "iframe",
    "mpath",
    "object",
    "embed",
    "link",
    "meta",
  ]);
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
  const unsafeProjectStyleValuePattern = /[;{}<>]/;
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
    "stroke-dashoffset",
  ];
  const supportedSmilAttributeProperties = new Map<string, AnimationProperty>([
    ["opacity", "opacity"],
    ["fill", "fill"],
    ["stroke", "stroke"],
    ["stroke-width", "strokeWidth"],
    ["strokewidth", "strokeWidth"],
    ["stroke-dashoffset", "strokeDashoffset"],
    ["strokedashoffset", "strokeDashoffset"],
  ]);
  const nativeSaveMetadataAttributeName = "data-tadpole-native-save-metadata";
  const nativeSaveMetadataVersion = "tadpole-svg-native-save-1";
  const unsupportedAnimationTags = new Set(["animatecolor", "animatemotion", "set"]);

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
    return Array.from(doc.querySelectorAll(selectableSvgTargetSelector)).reduce<AnimationTarget[]>((targets, element) => {
      const id = element.getAttribute("id")?.trim();
      if (!id || seen.has(id)) {
        return targets;
      }

      seen.add(id);
      targets.push({
        id,
        name: svgTargetNameFromElement(element, id),
        kind: svgTargetKindFromTag(element.tagName),
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

  const parseSvgImport = (source: string): SvgImportResult | null => {
    const sourceText = source.trim();
    if (sourceText === "") {
      return null;
    }

    const markup = sanitizeSvgSource(sourceText);
    if (markup === "") {
      return null;
    }

    return {
      markup,
      targets: discoverSvgTargets(markup),
      animation: extractSvgAnimationIntent(sourceText),
    };
  };

  let svgSource = defaultSvgSource;
  let svgMarkup = sanitizeSvgSource(svgSource) || defaultSvgSource;
  let availableTargets: AnimationTarget[] = discoverSvgTargets(svgMarkup);
  let svgSourceLabel = sampleSvgLabel;
  let documentDirty = false;
  let svgDraftSource = svgMarkup;
  let svgImportStatus = `${sampleSvgLabel} loaded with ${availableTargets.length} targets.`;
  let svgImportError = "";
  let animationImportWarnings: string[] = [];
  let svgImportRevision = 0;

  const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
  const clampMsForDuration = (value: number, duration: number): number => clamp(Math.round(value), 0, duration);
  const clampMs = (value: number): number => clampMsForDuration(value, timelineDurationMs);
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

  let trackCursor = 0;
  let keyframeCursor = 0;

  const makeTrackId = (): string => `track-${(trackCursor += 1)}`;
  const existingKeyframeIds = (): Set<string> => new Set(tracks.flatMap((track) => track.keyframes.map((keyframe) => keyframe.id)));
  const makeKeyframeId = (): string => {
    const existing = existingKeyframeIds();
    let id = "";
    do {
      id = `kf-${(keyframeCursor += 1)}`;
    } while (existing.has(id));
    return id;
  };
  const syncIdCursorsFromTracks = (items: TimelineTrack[]): void => {
    items.forEach((track) => {
      const trackMatch = /^track-(\d+)$/.exec(track.id);
      if (trackMatch) {
        trackCursor = Math.max(trackCursor, Number(trackMatch[1]));
      }
      track.keyframes.forEach((keyframe) => {
        const keyframeMatch = /^kf-(\d+)$/.exec(keyframe.id);
        if (keyframeMatch) {
          keyframeCursor = Math.max(keyframeCursor, Number(keyframeMatch[1]));
        }
      });
    });
  };

  const formatMs = (value: number): string => `${value}ms`;
  const formatSec = (value: number): string => `${(value / 1000).toFixed(2)}s`;
  const frameDurationMsFor = (rate: number): number => 1000 / clamp(rate, 12, 144);
  const frameForMs = (value: number, rate: number): number => Math.round(clampMs(value) / frameDurationMsFor(rate));
  const formatFrame = (value: number, rate: number): string => `${frameForMs(value, rate)}f`;
  const formatTimeDisplay = (value: number, mode: TimeDisplayMode, rate: number): string =>
    mode === "frames" ? formatFrame(value, rate) : formatSec(value);
  const formatWorkAreaPoint = (value: number | null, mode: TimeDisplayMode, rate: number): string =>
    value === null ? "none" : `${formatMs(value)} / ${formatTimeDisplay(value, mode, rate)}`;
  const normalizeWorkAreaToDuration = (): void => {
    if (workAreaInMs !== null) {
      workAreaInMs = clampMs(workAreaInMs);
    }
    if (workAreaOutMs !== null) {
      workAreaOutMs = clampMs(workAreaOutMs);
    }
  };

  const createSampleTracks = (): TimelineTrack[] => [
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

  let tracks: TimelineTrack[] = createSampleTracks();
  let targetNameById = new Map(availableTargets.map((target) => [target.id, target.name] as const));

  let selectedTrackId = tracks[0]?.id ?? "";
  let selectedTrack: TimelineTrack | null = tracks[0] ?? null;
  let selectedKeyframe: Keyframe | null = null;
  let inspectorMode: InspectorMode = "document";
  let inspectorValidationState: InspectorValidationState = "valid";
  let inspectorValidationMessage = "";
  let inspectorWarnings: InspectorWarning[] = [];
  let selectedInspectorWarningId = "";
  let selectedInspectorWarning: InspectorWarning | null = null;
  let activeTrack: TimelineTrack | null = tracks[0] ?? null;
  let selectedTrackHasKeyframes = tracks[0]?.keyframes.length ? tracks[0].keyframes.length > 0 : false;
  let selectedTrackNeighborhood: PlayheadNeighborhood = { at: null, previous: null, next: null };
  let documentWarningCount = 0;
  let documentImportStatusLabel = sampleSvgLabel;
  let clampedGridCount = defaultGridDivisions;
  let selectedTargetId = availableTargets[0]?.id ?? "";
  let selectedTarget: AnimationTarget | null = availableTargets[0] ?? null;
  let selectedTargetTracks: TimelineTrack[] = [];
  let collapsedTimelineTargetIds = new Set<string>();
  let timelineTracksVisible = true;
  let timelineTargetRows: TargetTimelineRow[] = [];
  let starterTimelineSuggestions: StarterTimelineSuggestion[] = [];
  let starterTimelineSelectedIds = new Set<string>();
  let starterTimelineStatus = "No starter timeline suggestions.";
  let starterTimelineSelectedCount = 0;
  let starterTimelineCanApply = false;
  let timelineDurationMs = sampleTimelineDurationMs;
  let currentTime = 0;
  let isPlaying = false;
  let isLooping = true;
  let loopWorkArea = false;
  let workAreaInMs: number | null = null;
  let workAreaOutMs: number | null = null;
  let workAreaActive = false;
  let workAreaStartMs = 0;
  let workAreaEndMs = 0;
  let workAreaLabel = "none";
  let currentTimeDisplay = "";
  let durationTimeDisplay = "";
  let timeDisplayMode: TimeDisplayMode = "seconds";
  let frameRate = 60;
  let snapToFrames = true;
  let snapMs = 16;

  let playbackStartTime = 0;
  let lastFrameTimestamp = 0;
  let rafHandle: number | null = null;
  let isResizingDrawer = false;
  let isScrubbing = false;
  let scrubberSource: "timeline" | "preview" | null = null;
  let drawerOpen = false;
  let panelDockRegion: DockRegion = "left";
  let activePanel: EditorPanel = "none";
  let openMenu: EditorMenu | null = null;
  let activeDialog: EditorDialog | null = null;
  let dialogReturnMenu: EditorMenu | null = null;
  let panelReturnFocusSelector = defaultPanelReturnFocusSelector;
  let panelHostIsSheet = false;
  let panelHostUsesDialog = false;
  let panelSheetMediaQuery: MediaQueryList | null = null;
  let drawerWidth = 300;
  let drawerResizeStartX = 0;
  let drawerResizeStartWidth = 300;
  let timelineCursorElement: HTMLButtonElement | null = null;
  let previewScrubberElement: HTMLDivElement | null = null;
  let previewSvgHostElement: HTMLDivElement | null = null;
  let originalPreviewInlineStyles = new WeakMap<SVGElement, Map<PreviewStyleProperty, OriginalInlineStyle>>();
  let copiedExport = "";
  let runnableExportStatus = "";
  let svgNativeSaveStatus = "";
  let projectDraftSource = "";
  let projectImportStatus = defaultProjectImportStatus;
  let projectImportError = "";
  let projectMissingTargetIds: string[] = [];
  let showOnlySelected = false;
  let trackFilterTerm = "";
  let layerSearchTerm = "";
  let multiSelectedTargetIds = new Set<string>();
  let multiSelectedTargets: AnimationTarget[] = [];
  let multiSelectedTargetIdList = "";
  let batchTrackProperty: AnimationProperty = "opacity";
  let lastBatchCreatedCount = 0;
  let trackSortMode: TrackSortMode = "manual";
  let showKeyboardShortcuts = false;
  let selectedKeyframeId = "";
  let timelineGridDensity = defaultGridDivisions;
  let draggingKeyframe: DraggingKeyframe = null;
  let svgLayerRows: readonly SvgLayerRow[] = buildSvgLayerTree(svgMarkup).rows;
  let visibleLayerRows: LayerPanelRow[] = [];
  let editorCommandHistory = EditorCommandHistory.empty();
  let editorCommandStatus = "Command history ready.";
  let editorLastCommandId = "";
  let canUndoEditorCommand = false;
  let canRedoEditorCommand = false;
  let svgNativeSaveResult = serializeSvgNativeSave(new SvgNativeSaveRequest(svgMarkup, tracks, timelineDurationMs, isLooping));
  let svgNativeSaveWarnings = svgNativeSaveResult.warnings;
  let svgNativeSaveFile = svgNativeSaveFilename(svgSourceLabel);

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
  const panelLabelFor = (panel: EditorPanel): string => {
    switch (panel) {
      case "workspace":
        return "Workspace";
      case "source":
        return "SVG Source";
      case "palette":
        return "Palette";
      case "targets":
        return "Target Library";
      case "fonts":
        return "Fonts";
      case "export":
        return "Project Export";
      case "warnings":
        return "Warnings";
      case "layers":
        return "Layers";
      case "inspector":
        return "Inspector";
      case "debug":
        return "Debug";
      case "none":
        return "Panels";
    }
  };
  const focusElementBySelector = (selector: string): void => {
    const target = document.querySelector(selector);
    if (target instanceof HTMLElement) {
      target.focus();
    }
  };
  const focusActivePanelClose = (): void => {
    void nextDomUpdate().then(() => focusElementBySelector("[data-tadpole-panel-close]"));
  };
  const syncPanelHostMode = (): void => {
    panelHostIsSheet = panelSheetMediaQuery?.matches ?? false;
  };
  const setPanelDockRegion = (region: DockRegion): void => {
    panelDockRegion = region;
    drawerOpen = true;
  };
  const closePanel = (): void => {
    const returnFocusSelector = panelReturnFocusSelector || defaultPanelReturnFocusSelector;
    drawerOpen = false;
    activePanel = "none";
    panelReturnFocusSelector = defaultPanelReturnFocusSelector;
    void nextDomUpdate().then(() => focusElementBySelector(returnFocusSelector));
  };
  const toggleDrawer = (): void => {
    drawerOpen = !drawerOpen;
    if (!drawerOpen) {
      panelReturnFocusSelector = defaultPanelReturnFocusSelector;
      closePanel();
    } else if (activePanel === "none") {
      activePanel = "source";
      panelReturnFocusSelector = defaultPanelReturnFocusSelector;
      focusActivePanelClose();
    }
  };

  const openPanel = (panel: ContextPanel, returnFocusSelector = defaultPanelReturnFocusSelector): void => {
    panelReturnFocusSelector = returnFocusSelector;
    if (activePanel === panel && drawerOpen) {
      closePanel();
      return;
    }
    activePanel = panel;
    drawerOpen = true;
    focusActivePanelClose();
  };
  const menuOrder: EditorMenu[] = ["file", "edit", "view", "timeline", "export", "help"];
  const closeMenus = (): void => {
    openMenu = null;
  };
  const focusMenuButton = (menu: EditorMenu): void => {
    const button = document.querySelector(`[data-tadpole-menu-button="${menu}"]`);
    if (button instanceof HTMLElement) {
      button.focus();
    }
  };
  const focusFirstMenuItem = (menu: EditorMenu): void => {
    void nextDomUpdate().then(() => {
      const menuElement = document.querySelector(`[data-tadpole-menu="${menu}"]`);
      const item = menuElement?.querySelector("button:not(:disabled)");
      if (item instanceof HTMLElement) {
        item.focus();
      }
    });
  };
  const toggleMenu = (menu: EditorMenu): void => {
    openMenu = openMenu === menu ? null : menu;
  };
  const openMenuWithFocus = (menu: EditorMenu): void => {
    openMenu = menu;
    focusFirstMenuItem(menu);
  };
  const openEditorDialog = (dialog: EditorDialog, returnMenu: EditorMenu): void => {
    activeDialog = dialog;
    dialogReturnMenu = returnMenu;
    closeMenus();
    void nextDomUpdate().then(() => {
      const dialogElement = document.querySelector("[data-tadpole-active-dialog]");
      const focusTarget = dialogElement?.querySelector("input, textarea, button");
      if (focusTarget instanceof HTMLElement) {
        focusTarget.focus();
      }
    });
  };
  const closeEditorDialog = (): void => {
    const returnMenu = dialogReturnMenu;
    activeDialog = null;
    dialogReturnMenu = null;
    if (returnMenu) {
      void nextDomUpdate().then(() => focusMenuButton(returnMenu));
    }
  };
  const togglePanelCommand = (panel: ContextPanel, returnFocusSelector = '[data-tadpole-menu-button="view"]'): void => {
    openPanel(panel, returnFocusSelector);
    closeMenus();
  };
  const runViewCommand = (panel: ContextPanel): void => {
    togglePanelCommand(panel);
  };
  const openWarningsFromBadge = (): void => {
    openPanel("warnings", "[data-tadpole-warning-badge]");
    closeMenus();
  };
  const openDirtyStateFromBadge = (): void => {
    openPanel("export", "[data-tadpole-dirty-badge]");
    closeMenus();
  };
  const runFileRevertCommand = (): void => {
    resetToSampleSvg();
    closeMenus();
  };
  const runHelpShortcutsCommand = (): void => {
    showKeyboardShortcuts = !showKeyboardShortcuts;
    closeMenus();
  };
  const handleMenuButtonKeydown = (event: KeyboardEvent, menu: EditorMenu): void => {
    event.stopPropagation();
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openMenuWithFocus(menu);
      return;
    }
    const index = menuOrder.indexOf(menu);
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusMenuButton(menuOrder[(index + 1) % menuOrder.length]);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusMenuButton(menuOrder[(index + menuOrder.length - 1) % menuOrder.length]);
      return;
    }
    if (event.key === "Escape") {
      closeMenus();
    }
  };
  const handleMenuItemKeydown = (event: KeyboardEvent, menu: EditorMenu): void => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenus();
      focusMenuButton(menu);
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (event.currentTarget instanceof HTMLButtonElement) {
        event.currentTarget.click();
      }
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    event.preventDefault();
    const menuElement = document.querySelector(`[data-tadpole-menu="${menu}"]`);
    const itemList = menuElement ? Array.from(menuElement.querySelectorAll("button:not(:disabled)")) : [];
    const items = itemList.filter((item): item is HTMLButtonElement => item instanceof HTMLButtonElement);
    if (items.length === 0) {
      return;
    }
    const activeIndex = items.findIndex((item) => item === document.activeElement);
    const fallbackIndex = event.key === "ArrowDown" ? 0 : items.length - 1;
    const nextIndex =
      activeIndex === -1
        ? fallbackIndex
        : event.key === "ArrowDown"
          ? (activeIndex + 1) % items.length
          : (activeIndex + items.length - 1) % items.length;
    items[nextIndex]?.focus();
  };
  const handleDialogKeydown = (event: KeyboardEvent): void => {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      closeEditorDialog();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const dialogElement = document.querySelector("[data-tadpole-active-dialog]");
    const focusableList = dialogElement
      ? Array.from(dialogElement.querySelectorAll("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)"))
      : [];
    const focusable = focusableList.filter((item): item is HTMLElement => item instanceof HTMLElement);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) {
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const handlePanelHostKeydown = (event: KeyboardEvent): void => {
    if (!panelHostUsesDialog) {
      return;
    }
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      closePanel();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }

    const panelElement = document.querySelector("[data-tadpole-panel-host]");
    const focusableList = panelElement
      ? Array.from(panelElement.querySelectorAll(panelFocusableSelector))
      : [];
    const focusable = focusableList.filter((item): item is HTMLElement => item instanceof HTMLElement);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) {
      return;
    }
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };
  const resizeDrawerByKeyboard = (event: KeyboardEvent): void => {
    const step = event.shiftKey ? 24 : 12;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setDrawerWidth(drawerWidth + (panelDockRegion === "right" ? step : -step));
      drawerOpen = true;
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setDrawerWidth(drawerWidth + (panelDockRegion === "right" ? -step : step));
      drawerOpen = true;
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setDrawerWidth(drawerWidth - step);
      drawerOpen = true;
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setDrawerWidth(drawerWidth + step);
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
    const pointerDelta = event.clientX - drawerResizeStartX;
    const dockAwareDelta = panelDockRegion === "right" ? -pointerDelta : pointerDelta;
    const next = drawerResizeStartWidth + Math.round(dockAwareDelta);
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
  const isLocalKeyboardSurface = (target: EventTarget | null): boolean =>
    target instanceof HTMLElement && !!target.closest("[data-tadpole-menubar], [data-tadpole-active-dialog]");
  const hasOpenLocalKeyboardSurface = (): boolean =>
    document.querySelector("[data-tadpole-active-dialog], [data-tadpole-menu]") !== null;
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

  const keyframeSpansFor = (items: Keyframe[]): KeyframeSpan[] => {
    const sorted = sortKeyframes(items);
    const spans: KeyframeSpan[] = [];
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const next = sorted[index];
      if (!previous || !next || next.time <= previous.time) {
        continue;
      }
      spans.push({
        id: `${previous.id}-to-${next.id}`,
        startTime: previous.time,
        endTime: next.time,
      });
    }
    return spans;
  };

  const spanWidthPercent = (startTime: number, endTime: number): number =>
    Math.max(0, trackPercent(endTime) - trackPercent(startTime));

  const buildTimelineTargetRows = (
    trackItems: TimelineTrack[],
    targets: AnimationTarget[],
    collapsedTargetIds: Set<string>,
    time: number,
  ): TargetTimelineRow[] => {
    const targetById = new Map(targets.map((target) => [target.id, target] as const));
    const rowsByTargetId = new Map<string, TargetTimelineRow>();
    const rows: TargetTimelineRow[] = [];

    trackItems.forEach((track) => {
      const target = targetById.get(track.targetId);
      const targetLabel = target?.name ?? track.targetId;
      const targetKind = target?.kind ?? "missing";
      let targetRow = rowsByTargetId.get(track.targetId);
      if (!targetRow) {
        targetRow = {
          targetId: track.targetId,
          targetLabel,
          targetKind,
          expanded: !collapsedTargetIds.has(track.targetId),
          trackCount: 0,
          keyframeCount: 0,
          mutedTrackCount: 0,
          warningCount: target ? 0 : 1,
          propertyRows: [],
          summaryKeyframes: [],
        };
        rowsByTargetId.set(track.targetId, targetRow);
        rows.push(targetRow);
      }

      const sortedKeyframes = sortKeyframes(track.keyframes);
      const propertyLabel = propertySpec(track.property).label;
      const propertyRow: PropertyTimelineRow = {
        id: `${track.targetId}:${track.property}:${track.id}`,
        track,
        targetId: track.targetId,
        targetLabel,
        targetKind,
        propertyLabel,
        sortedKeyframes,
        spans: keyframeSpansFor(sortedKeyframes),
        currentValue: toCssValue(getCurrentValue(track, time), track.property),
        keyframeCount: sortedKeyframes.length,
      };

      targetRow.propertyRows.push(propertyRow);
      targetRow.trackCount += 1;
      targetRow.keyframeCount += propertyRow.keyframeCount;
      targetRow.mutedTrackCount += track.muted ? 1 : 0;
      targetRow.summaryKeyframes.push(
        ...sortedKeyframes.map((keyframe): TargetSummaryKeyframe => ({
          id: `${track.id}:${keyframe.id}`,
          trackId: track.id,
          keyframeId: keyframe.id,
          property: track.property,
          time: keyframe.time,
          value: keyframe.value,
        })),
      );
    });

    rows.forEach((row) => {
      row.summaryKeyframes = row.summaryKeyframes.sort(
        (first, second) =>
          first.time - second.time ||
          first.property.localeCompare(second.property) ||
          first.trackId.localeCompare(second.trackId) ||
          first.keyframeId.localeCompare(second.keyframeId),
      );
    });

    return rows;
  };

  const warningReferencedTargetIds = (warning: string, sortedTargetIds: readonly string[]): string[] => {
    const referencedTargetIds: string[] = [];
    sortedTargetIds.forEach((targetId) => {
      const marker = `#${targetId}`;
      let markerIndex = warning.indexOf(marker);
      while (markerIndex !== -1) {
        const targetIdStart = markerIndex + 1;
        const hasLongerKnownTargetMatch = referencedTargetIds.some(
          (referencedTargetId) =>
            referencedTargetId.startsWith(targetId) &&
            warning.slice(targetIdStart, targetIdStart + referencedTargetId.length) === referencedTargetId,
        );
        if (!hasLongerKnownTargetMatch) {
          referencedTargetIds.push(targetId);
          return;
        }
        markerIndex = warning.indexOf(marker, markerIndex + marker.length);
      }
    });
    return referencedTargetIds;
  };

  const buildLayerPanelRows = (
    layerRows: readonly SvgLayerRow[],
    trackItems: TimelineTrack[],
    warnings: readonly string[],
    selectedId: string,
    query: string,
  ): LayerPanelRow[] => {
    const trackCountByTargetId = new Map<string, number>();
    const keyframeCountByTargetId = new Map<string, number>();
    const warningCountByTargetId = new Map<string, number>();
    trackItems.forEach((track) => {
      trackCountByTargetId.set(track.targetId, (trackCountByTargetId.get(track.targetId) ?? 0) + 1);
      keyframeCountByTargetId.set(track.targetId, (keyframeCountByTargetId.get(track.targetId) ?? 0) + track.keyframes.length);
    });
    const sortedTargetIds = Array.from(new Set(layerRows.map((row) => row.targetId))).sort(
      (first, second) => second.length - first.length || first.localeCompare(second),
    );
    warnings.forEach((warning) => {
      warningReferencedTargetIds(warning, sortedTargetIds).forEach((targetId) => {
        warningCountByTargetId.set(targetId, (warningCountByTargetId.get(targetId) ?? 0) + 1);
      });
    });

    return layerRows
      .filter((row) => row.matches(query))
      .map((row): LayerPanelRow => ({
        row,
        trackCount: trackCountByTargetId.get(row.targetId) ?? 0,
        keyframeCount: keyframeCountByTargetId.get(row.targetId) ?? 0,
        warningCount: warningCountByTargetId.get(row.targetId) ?? 0,
        selected: row.targetId === selectedId,
      }));
  };

  const inspectorWarningHashOffset = 2_166_136_261;
  const inspectorWarningHashPrime = 16_777_619;

  const stableInspectorWarningId = (source: string, message: string): string => {
    let hash = inspectorWarningHashOffset;
    for (const character of `${source}:${message}`) {
      hash ^= character.codePointAt(0) ?? 0;
      hash = Math.imul(hash, inspectorWarningHashPrime) >>> 0;
    }
    return `${source}-${hash.toString(36)}`;
  };

  const buildInspectorWarnings = (
    svgError: string,
    projectError: string,
    importWarnings: readonly string[],
    missingTargetIds: readonly string[],
  ): InspectorWarning[] => {
    const warnings: InspectorWarning[] = [];
    if (svgError) {
      warnings.push({ id: "svg-import-error", source: "SVG import", message: svgError });
    }
    if (projectError) {
      warnings.push({ id: "project-import-error", source: "Project import", message: projectError });
    }
    importWarnings.forEach((warning) => {
      warnings.push({ id: stableInspectorWarningId("animation-import", warning), source: "Animation import", message: warning });
    });
    missingTargetIds.forEach((targetId) => {
      warnings.push({
        id: `project-missing-target-${targetId}`,
        source: "Project restore",
        message: `Missing target ID: ${targetId}`,
      });
    });
    return warnings;
  };

  const normalizeTrackList = (items: TimelineTrack[], duration = timelineDurationMs): TimelineTrack[] =>
    items.map((track) => ({
      ...track,
      keyframes: sortKeyframes(track.keyframes).map((keyframe) => ({ ...keyframe, time: clampMsForDuration(keyframe.time, duration) })),
    }));

  const normalizeTracks = (): void => {
    tracks = normalizeTrackList(tracks);
  };

  const runnableTracksFor = (items: TimelineTrack[], targets: AnimationTarget[], duration: number): TimelineTrack[] => {
    const targetIds = new Set(targets.map((target) => target.id));
    return normalizeTrackList(items, duration)
      .filter((track) => !track.muted && targetIds.has(track.targetId) && track.keyframes.length > 0)
      .map((track) => ({
        ...track,
        keyframes: track.keyframes.flatMap((keyframe) => {
          const value = normalizeProjectKeyframeValue(track.property, keyframe.value);
          return value === null ? [] : [{ ...keyframe, value }];
        }),
      }))
      .filter((track) => track.keyframes.length > 0);
  };

  const escapeHtml = (value: string): string =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const safeJsonForHtml = (value: unknown): string =>
    (JSON.stringify(value) ?? "null")
      .replace(/&/g, "\\u0026")
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");

  const runnableExportFilename = (label: string): string => {
    const slug = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `${slug || "tadpole-animation"}.html`;
  };
  function svgNativeSaveFilename(label: string): string {
    const slug = label
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `${slug || "tadpole-animation"}.svg`;
  }

  const runnableRuntimeScript = `(() => {
  const dataNode = document.getElementById("tadpole-animation-data");
  const stage = document.querySelector("[data-tadpole-stage]");
  if (!dataNode || !stage) {
    return;
  }

  const data = JSON.parse(dataNode.textContent || "{}");
  const timeline = data.timeline || {};
  const tracks = Array.isArray(timeline.tracks) ? timeline.tracks : [];
  const targets = Array.isArray(data.svg && data.svg.targets) ? data.svg.targets : [];
  const selectedTrackId = typeof timeline.selectedTrackId === "string" ? timeline.selectedTrackId : "";
  const duration = Math.max(1, Number(timeline.duration) || 1);
  const isLooping = timeline.isLooping !== false;
  const numericProperties = new Set(["x", "y", "scale", "rotation", "opacity", "strokeWidth", "strokeDashoffset"]);
  const transformProperties = ["x", "y", "scale", "rotation"];
  const defaults = {
    x: "0",
    y: "0",
    scale: "1",
    rotation: "0",
    opacity: "1",
    fill: "none",
    stroke: "none",
    strokeWidth: "1.2",
    strokeDashoffset: "0",
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const sortKeyframes = (track) =>
    Array.isArray(track.keyframes)
      ? [...track.keyframes].sort((first, second) => first.time - second.time)
      : [];
	  const interpolateNumeric = (firstValue, secondValue, ratio) =>
	    firstValue + (secondValue - firstValue) * ratio;
	  const parseCssColor = (value) => {
	    const trimmed = String(value || "").trim();
	    const shortHex = /^#([0-9a-f]{3})$/i.exec(trimmed);
	    if (shortHex) {
	      const [, hex] = shortHex;
	      return {
	        r: parseInt(hex[0] + hex[0], 16),
	        g: parseInt(hex[1] + hex[1], 16),
	        b: parseInt(hex[2] + hex[2], 16),
	      };
	    }
	    const longHex = /^#([0-9a-f]{6})$/i.exec(trimmed);
	    if (longHex) {
	      const [, hex] = longHex;
	      return {
	        r: parseInt(hex.slice(0, 2), 16),
	        g: parseInt(hex.slice(2, 4), 16),
	        b: parseInt(hex.slice(4, 6), 16),
	      };
	    }
	    const rgb = /^rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)$/i.exec(trimmed);
	    if (!rgb) {
	      return null;
	    }
	    const color = { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
	    return [color.r, color.g, color.b].every((part) => Number.isInteger(part) && part >= 0 && part <= 255) ? color : null;
	  };
	  const formatCssColor = (color) =>
	    "rgb(" + Math.round(color.r) + ", " + Math.round(color.g) + ", " + Math.round(color.b) + ")";
	  const interpolateCssColor = (firstValue, secondValue, ratio) => {
	    const firstColor = parseCssColor(firstValue);
	    const secondColor = parseCssColor(secondValue);
	    if (!firstColor || !secondColor) {
	      return null;
	    }
	    return formatCssColor({
	      r: interpolateNumeric(firstColor.r, secondColor.r, ratio),
	      g: interpolateNumeric(firstColor.g, secondColor.g, ratio),
	      b: interpolateNumeric(firstColor.b, secondColor.b, ratio),
	    });
	  };
	  const applyEasing = (ratio, easing) => {
    const t = clamp(ratio, 0, 1);
    switch (easing) {
      case "power1.inOut":
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case "power2.out":
        return 1 - Math.pow(1 - t, 3);
      case "power3.inOut":
        return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
      case "expo.out":
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      case "back.inOut": {
        const back = 1.70158 * 1.525;
        return t < 0.5
          ? (Math.pow(2 * t, 2) * ((back + 1) * 2 * t - back)) / 2
          : (Math.pow(2 * t - 2, 2) * ((back + 1) * (t * 2 - 2) + back) + 2) / 2;
      }
      case "linear":
      default:
        return t;
    }
  };

  const getCurrentValue = (track, time) => {
    const sorted = sortKeyframes(track);
    if (sorted.length === 0) {
      return defaults[track.property] || "";
    }
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
	        const ratio = (time - left.time) / (right.time - left.time);
	        const easedRatio = applyEasing(ratio, right.easing);
	        if (!numericProperties.has(track.property)) {
	          const colorValue = interpolateCssColor(left.value, right.value, easedRatio);
	          if (colorValue) {
	            return colorValue;
	          }
	          const midpoint = left.time + (right.time - left.time) / 2;
	          return time < midpoint ? left.value : right.value;
	        }
	        const leftValue = Number(left.value);
	        const rightValue = Number(right.value);
	        if (!Number.isFinite(leftValue) || !Number.isFinite(rightValue) || right.time === left.time) {
	          return left.value;
	        }
	        return String(interpolateNumeric(leftValue, rightValue, easedRatio));
	      }
	    }

    return sorted[sorted.length - 1].value;
  };

  const activeTrackFor = (targetId, property) => {
    const matching = tracks.filter((track) => track.targetId === targetId && track.property === property);
    if (matching.length === 0) {
      return null;
    }
    return matching.find((track) => track.id === selectedTrackId) || matching[0];
  };

  const findTargetElement = (targetId) => {
    const nodes = stage.querySelectorAll("[id]");
    for (const node of nodes) {
      if (node.id === targetId) {
        return node;
      }
    }
    return null;
  };

  const numericValue = (targetId, property, fallback, time) => {
    const track = activeTrackFor(targetId, property);
    if (!track) {
      return fallback;
    }
    const value = Number(getCurrentValue(track, time));
    return Number.isFinite(value) ? value : fallback;
  };

  const trackValue = (targetId, property, fallback, time) => {
    const track = activeTrackFor(targetId, property);
    return track ? getCurrentValue(track, time) : fallback;
  };

  const applyAt = (time) => {
    targets.forEach((target) => {
      const element = findTargetElement(target.id);
      if (!element) {
        return;
      }
      element.setAttribute("data-tadpole-runnable-target", "true");

      if (transformProperties.some((property) => activeTrackFor(target.id, property))) {
        const x = numericValue(target.id, "x", 0, time);
        const y = numericValue(target.id, "y", 0, time);
        const scale = numericValue(target.id, "scale", 1, time);
        const rotation = numericValue(target.id, "rotation", 0, time);
        element.style.transform = "translate(" + x + "px, " + y + "px) scale(" + scale + ") rotate(" + rotation + "deg)";
        element.style.transformOrigin = "center";
        element.style.transformBox = "fill-box";
      }

      if (activeTrackFor(target.id, "opacity")) {
        element.style.opacity = trackValue(target.id, "opacity", defaults.opacity, time);
      }
      if (activeTrackFor(target.id, "fill")) {
        element.style.fill = trackValue(target.id, "fill", defaults.fill, time);
      }
      if (activeTrackFor(target.id, "stroke")) {
        element.style.stroke = trackValue(target.id, "stroke", defaults.stroke, time);
      }
      if (activeTrackFor(target.id, "strokeWidth")) {
        element.style.strokeWidth = trackValue(target.id, "strokeWidth", defaults.strokeWidth, time);
      }
      if (activeTrackFor(target.id, "strokeDashoffset")) {
        element.style.strokeDashoffset = trackValue(target.id, "strokeDashoffset", defaults.strokeDashoffset, time);
      }
    });
  };

  const startedAt = performance.now();
  const step = (timestamp) => {
    const elapsed = timestamp - startedAt;
    const time = isLooping ? elapsed % duration : Math.min(elapsed, duration);
    applyAt(time);
    document.documentElement.dataset.tadpoleRuntimeState = isLooping || time < duration ? "running" : "complete";
    if (isLooping || time < duration) {
      window.requestAnimationFrame(step);
    }
  };

  applyAt(0);
  document.documentElement.dataset.tadpoleRuntimeVersion = data.version || "";
  document.documentElement.dataset.tadpoleRuntimeState = "running";
  window.requestAnimationFrame(step);
})();`;

  const createRunnableAnimationHtml = (payload: RunnableAnimationPayload): string => {
    const title = escapeHtml(`${payload.svg.label || "Tadpole Animation"} Runnable Animation`);
    const scriptClose = "</" + "script>";
    const payloadJson = safeJsonForHtml(payload);
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root {
      color-scheme: light dark;
      --font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      --color-4: #14b8a6;
      --color-5: #2dd4bf;
      --color-6: #0f766e;
      --color-8: #2563eb;
      --color-9: #1d4ed8;
      background: #f8fafc;
      color: #0f172a;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #f8fafc;
      font-family: var(--font-sans);
    }

    .tadpole-export-shell {
      width: min(960px, 92vw);
      display: grid;
      gap: 1rem;
      padding: 2rem;
    }

    .tadpole-stage {
      display: grid;
      place-items: center;
    }

    .tadpole-stage svg {
      width: 100%;
      max-height: 86vh;
      overflow: visible;
    }
  </style>
</head>
<body data-tadpole-runnable-export="${payload.version}">
  <main class="tadpole-export-shell" aria-label="${title}">
    <div class="tadpole-stage" data-tadpole-stage>
${payload.svg.source}
    </div>
    <noscript>This Tadpole animation requires JavaScript playback.</noscript>
  </main>
  <script id="tadpole-animation-data" type="application/json">${payloadJson}${scriptClose}
  <script>
${runnableRuntimeScript}
  ${scriptClose}
</body>
</html>`;
  };

  const interpolateNumeric = (firstValue: number, secondValue: number, ratio: number): number =>
    firstValue + (secondValue - firstValue) * ratio;

  const parseCssColor = (value: string): RgbColor | null => {
    const trimmed = value.trim();
    const shortHex = /^#([0-9a-f]{3})$/i.exec(trimmed);
    if (shortHex) {
      const [, hex] = shortHex;
      return {
        r: parseInt(hex[0]! + hex[0]!, 16),
        g: parseInt(hex[1]! + hex[1]!, 16),
        b: parseInt(hex[2]! + hex[2]!, 16),
      };
    }

    const longHex = /^#([0-9a-f]{6})$/i.exec(trimmed);
    if (longHex) {
      const [, hex] = longHex;
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }

    const rgb = /^rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)$/i.exec(trimmed);
    if (!rgb) {
      return null;
    }

    const color = { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
    return Object.values(color).every((part) => Number.isInteger(part) && part >= 0 && part <= 255) ? color : null;
  };

  const formatCssColor = (color: RgbColor): string =>
    `rgb(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)})`;

  const interpolateCssColor = (firstValue: string, secondValue: string, ratio: number): string | null => {
    const firstColor = parseCssColor(firstValue);
    const secondColor = parseCssColor(secondValue);
    if (!firstColor || !secondColor) {
      return null;
    }

    return formatCssColor({
      r: interpolateNumeric(firstColor.r, secondColor.r, ratio),
      g: interpolateNumeric(firstColor.g, secondColor.g, ratio),
      b: interpolateNumeric(firstColor.b, secondColor.b, ratio),
    });
  };

  const applyEasing = (ratio: number, easing: KeyframeEasing): number => {
    const t = clamp(ratio, 0, 1);
    switch (easing) {
      case "power1.inOut":
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      case "power2.out":
        return 1 - Math.pow(1 - t, 3);
      case "power3.inOut":
        return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
      case "expo.out":
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      case "back.inOut": {
        const back = 1.70158 * 1.525;
        return t < 0.5
          ? (Math.pow(2 * t, 2) * ((back + 1) * 2 * t - back)) / 2
          : (Math.pow(2 * t - 2, 2) * ((back + 1) * (t * 2 - 2) + back) + 2) / 2;
      }
      case "linear":
      default:
        return t;
    }
  };

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
        const ratio = (time - left.time) / (right.time - left.time);
        const easedRatio = applyEasing(ratio, right.easing);
        if (!isNumericProperty(track.property)) {
          const colorValue = interpolateCssColor(left.value, right.value, easedRatio);
          if (colorValue) {
            return colorValue;
          }
          const midpoint = left.time + (right.time - left.time) / 2;
          return time < midpoint ? left.value : right.value;
        }
        const leftValue = Number(left.value);
        const rightValue = Number(right.value);
        if (Number.isNaN(leftValue) || Number.isNaN(rightValue) || right.time === left.time) {
          return left.value;
        }
        return String(interpolateNumeric(leftValue, rightValue, easedRatio));
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
    panelSheetMediaQuery = window.matchMedia(panelSheetMediaQueryText);
    syncPanelHostMode();
    panelSheetMediaQuery.addEventListener("change", syncPanelHostMode);
    void fetchFonts();
    void nextDomUpdate().then(applyTimelineToPreviewSvg);
    window.addEventListener("keydown", handleGlobalKeyboard, { capture: true });
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
    panelSheetMediaQuery?.removeEventListener("change", syncPanelHostMode);
    panelSheetMediaQuery = null;
    window.removeEventListener("keydown", handleGlobalKeyboard, { capture: true });
  });

  $: {
    document.documentElement.style.setProperty("--palette-hue", `${paletteHue}`);
    document.documentElement.style.setProperty("--palette-chroma", `${paletteChroma}`);
    document.documentElement.style.setProperty("--palette-hue-rotate-by", `${paletteRotate}`);
  }
  $: layoutColumnWidth = drawerOpen ? `${drawerWidth}px` : `${collapsedDrawerWidth}px`;
  $: panelHostActivePanelId = drawerOpen ? activePanel : "none";
  $: panelHostOpenPanelIds = drawerOpen && activePanel !== "none" ? activePanel : "";
  $: panelHostUsesDialog = panelHostIsSheet && drawerOpen && activePanel !== "none";
  $: activePanelLabel = panelLabelFor(panelHostActivePanelId);
  $: panelDockLabel = panelDockRegion === "left" ? "Left" : "Right";
  $: dockLayoutMode = panelHostUsesDialog ? "sheet" : "docked";
  $: timelineDockState = timelineTracksVisible ? "expanded" : "collapsed";
  $: starterTimelineSelectedCount = starterTimelineSuggestions.filter((suggestion) =>
    starterTimelineSelectedIds.has(suggestion.id),
  ).length;
  $: starterTimelineCanApply = starterTimelineSelectedCount > 0;
  $: svgMarkup = sanitizeSvgSource(svgSource) || defaultSvgSource;
  $: availableTargets = discoverSvgTargets(svgMarkup);
  $: svgLayerRows = buildSvgLayerTree(svgMarkup).rows;
  $: targetNameById = new Map(availableTargets.map((target) => [target.id, target.name] as const));
  $: {
    const selectedTargetExists = availableTargets.some((target) => target.id === selectedTargetId);
    const firstTargetId = availableTargets[0]?.id ?? "";
    if (!selectedTargetExists) {
      selectedTargetId = firstTargetId;
      newTrackTargetId = firstTargetId;
    } else if (!availableTargets.some((target) => target.id === newTrackTargetId)) {
      newTrackTargetId = selectedTargetId;
    }
  }
  $: selectedTarget = availableTargets.find((target) => target.id === selectedTargetId) ?? null;
  $: selectedTargetTracks = selectedTarget ? tracks.filter((track) => track.targetId === selectedTarget.id) : [];
  $: {
    const validTargetIds = new Set(availableTargets.map((target) => target.id));
    if ([...multiSelectedTargetIds].some((targetId) => !validTargetIds.has(targetId))) {
      multiSelectedTargetIds = new Set([...multiSelectedTargetIds].filter((targetId) => validTargetIds.has(targetId)));
    }
  }
  $: multiSelectedTargets = availableTargets.filter((target) => multiSelectedTargetIds.has(target.id));
  $: multiSelectedTargetIdList = multiSelectedTargets.map((target) => target.id).join(",");
  $: visibleLayerRows = buildLayerPanelRows(
    svgLayerRows,
    tracks,
    animationImportWarnings,
    selectedTargetId,
    layerSearchTerm,
  );
  $: {
    if (previewSvgHostElement) {
      currentTime;
      tracks;
      availableTargets;
      svgMarkup;
      selectedTargetId;
      void applyTimelineToPreviewSvg();
    }
  }

  $: activeTrack = tracks.find((track) => track.id === selectedTrackId) ?? null;
  $: selectedTrackHasKeyframes = (activeTrack?.keyframes?.length ?? 0) > 0;
  $: clampedGridCount = Math.max(minGridDivisions, Math.min(maxGridDivisions, timelineGridDensity));
  $: timelineTicks = Array.from({ length: clampedGridCount + 1 }, (_, index) =>
    Math.round((index / clampedGridCount) * timelineDurationMs),
  );
  $: workAreaActive = workAreaInMs !== null && workAreaOutMs !== null && workAreaOutMs > workAreaInMs;
  $: workAreaStartMs = workAreaActive && workAreaInMs !== null ? workAreaInMs : 0;
  $: workAreaEndMs = workAreaActive && workAreaOutMs !== null ? workAreaOutMs : 0;
  $: workAreaLabel = workAreaActive
    ? `${formatWorkAreaPoint(workAreaInMs, timeDisplayMode, frameRate)} to ${formatWorkAreaPoint(workAreaOutMs, timeDisplayMode, frameRate)}`
    : "none";
  $: currentTimeDisplay = formatTimeDisplay(currentTime, timeDisplayMode, frameRate);
  $: durationTimeDisplay = formatTimeDisplay(timelineDurationMs, timeDisplayMode, frameRate);
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
  $: timelineTargetRows = buildTimelineTargetRows(visibleTracks, availableTargets, collapsedTimelineTargetIds, currentTime);
  $: totalTrackKeyframes = tracks.reduce((total, track) => total + track.keyframes.length, 0);
  $: playheadLabel = isPlaying ? "Playing" : currentTime === 0 ? "Idle" : "Paused";
  $: documentWarningCount =
    animationImportWarnings.length +
    projectMissingTargetIds.length +
    (svgImportError ? 1 : 0) +
    (projectImportError ? 1 : 0);
  $: documentImportStatusLabel = svgImportError ? "error" : svgSourceLabel;
  $: selectedTrackName =
    activeTrack === null
      ? "No track selected"
      : `${targetNameById.get(activeTrack.targetId) ?? activeTrack.targetId} • ${activeTrack.property}`;
  $: projectExport = {
    version: projectExportVersion,
    svg: {
      label: svgSourceLabel,
      source: svgMarkup,
      targets: availableTargets,
    },
    timeline: {
      duration: timelineDurationMs,
      currentTime,
      frameRate,
      isLooping,
      snapToFrames,
      snapMs,
      gridDensity: timelineGridDensity,
      tracks,
    },
  } as TadpoleProject;

  $: exportPayload = JSON.stringify(projectExport, null, 2);
  $: runnableExportPayload = {
    version: runnableExportVersion,
    svg: {
      label: svgSourceLabel,
      source: svgMarkup,
      targets: availableTargets,
    },
    timeline: {
      duration: timelineDurationMs,
      frameRate,
      isLooping,
      selectedTrackId,
      tracks: runnableTracksFor(tracks, availableTargets, timelineDurationMs),
    },
  } as RunnableAnimationPayload;
  $: runnableExportHtml = createRunnableAnimationHtml(runnableExportPayload);
  $: runnableExportTrackCount = runnableExportPayload.timeline.tracks.length;
  $: runnableExportFile = runnableExportFilename(svgSourceLabel);
  $: svgNativeSaveResult = serializeSvgNativeSave(new SvgNativeSaveRequest(svgMarkup, tracks, timelineDurationMs, isLooping));
  $: svgNativeSaveWarnings = svgNativeSaveResult.warnings;
  $: svgNativeSaveFile = svgNativeSaveFilename(svgSourceLabel);
  $: canUndoEditorCommand = editorCommandHistory.canUndo();
  $: canRedoEditorCommand = editorCommandHistory.canRedo();
  $: selectedTrack = activeTrack;
  $: selectedKeyframe = selectedTrack
    ? selectedTrack.keyframes.find((keyframe) => keyframe.id === selectedKeyframeId) ?? null
    : null;
  $: selectedTrackNeighborhood = getNeighborhoodForTime(selectedTrack, currentTime);
  $: inspectorWarnings = buildInspectorWarnings(svgImportError, projectImportError, animationImportWarnings, projectMissingTargetIds);
  $: selectedInspectorWarning = inspectorWarnings.find((warning) => warning.id === selectedInspectorWarningId) ?? null;
  $: inspectorMode = selectedInspectorWarning
    ? "warning"
    : selectedKeyframe
      ? "keyframe"
      : selectedTrack
        ? "track"
        : selectedTarget
          ? "target"
          : "document";
  $: inspectorValidationState = inspectorValidationMessage ? "invalid" : "valid";
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
    normalizeWorkAreaToDuration();
    normalizeTracks();
    markDocumentDirty();
  };
  const setTimelineDurationPreset = (value: number): void => {
    timelineDurationMs = clamp(value, 250, 30000);
    currentTime = clampMs(currentTime);
    normalizeWorkAreaToDuration();
    normalizeTracks();
    markDocumentDirty();
  };
  const setCurrentTime = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    currentTime = applySnap(clampMs(Number(input.value)));
  };
  const setWorkAreaInPoint = (): void => {
    workAreaInMs = applySnap(clampMs(currentTime));
  };
  const setWorkAreaOutPoint = (): void => {
    workAreaOutMs = applySnap(clampMs(currentTime));
  };
  const clearWorkArea = (): void => {
    workAreaInMs = null;
    workAreaOutMs = null;
    loopWorkArea = false;
  };
  const toggleLoopWorkArea = (): void => {
    loopWorkArea = !loopWorkArea;
  };
  const toggleTimeDisplayMode = (): void => {
    timeDisplayMode = timeDisplayMode === "seconds" ? "frames" : "seconds";
  };
  const setTimelineGridDensity = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    timelineGridDensity = clamp(Number(input.value), minGridDivisions, maxGridDivisions);
    markDocumentDirty();
  };
  const setTrackFilterTerm = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    trackFilterTerm = input.value;
  };
  const setLayerSearchTerm = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    layerSearchTerm = input.value;
  };
  const setTrackSortMode = (mode: TrackSortMode): void => {
    trackSortMode = mode;
  };
  const clearTrackFilters = (): void => {
    trackFilterTerm = "";
    showOnlySelected = false;
  };
  const toggleTimelineTargetStack = (targetId: string): void => {
    const nextCollapsedTargetIds = new Set(collapsedTimelineTargetIds);
    if (nextCollapsedTargetIds.has(targetId)) {
      nextCollapsedTargetIds.delete(targetId);
    } else {
      nextCollapsedTargetIds.add(targetId);
    }
    collapsedTimelineTargetIds = nextCollapsedTargetIds;
  };
  const expandAllTimelineStacks = (): void => {
    collapsedTimelineTargetIds = new Set<string>();
  };
  const expandTimelineStackForTarget = (targetId: string): void => {
    if (!collapsedTimelineTargetIds.has(targetId)) {
      return;
    }
    const nextCollapsedTargetIds = new Set(collapsedTimelineTargetIds);
    nextCollapsedTargetIds.delete(targetId);
    collapsedTimelineTargetIds = nextCollapsedTargetIds;
  };
  const collapseAllTimelineStacks = (): void => {
    collapsedTimelineTargetIds = new Set(timelineTargetRows.map((row) => row.targetId));
  };
  const toggleTimelineTrackVisibility = (): void => {
    timelineTracksVisible = !timelineTracksVisible;
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

  const beginSvgImport = (): number => {
    svgImportRevision += 1;
    return svgImportRevision;
  };

  const clearProjectImportStatus = (): void => {
    projectImportStatus = defaultProjectImportStatus;
    projectImportError = "";
    projectMissingTargetIds = [];
  };

  const markDocumentDirty = (): void => {
    documentDirty = true;
  };

  const markDocumentClean = (): void => {
    documentDirty = false;
  };

  const clearInspectorWarningSelection = (): void => {
    selectedInspectorWarningId = "";
  };

  const clearInspectorValidation = (): void => {
    inspectorValidationMessage = "";
  };

  const selectInspectorWarning = (warningId: string): void => {
    selectedInspectorWarningId = warningId;
    clearInspectorValidation();
  };

  const resetInspectorStateForDocumentChange = (): void => {
    clearInspectorWarningSelection();
    clearInspectorValidation();
  };

  const clearStarterTimelineSuggestions = (status = "No starter timeline suggestions."): void => {
    starterTimelineSuggestions = [];
    starterTimelineSelectedIds = new Set<string>();
    starterTimelineStatus = status;
  };

  const starterTimelineTargetFactsFor = (
    targets: readonly AnimationTarget[],
    layerRows: readonly SvgLayerRow[],
  ): StarterTimelineTargetFact[] => {
    const rowByTargetId = new Map(layerRows.map((row): [string, SvgLayerRow] => [row.targetId, row]));
    return targets.map((target, index) => {
      const row = rowByTargetId.get(target.id);
      return new StarterTimelineTargetFact(
        target.id,
        target.name,
        target.kind,
        row?.parentTargetId ?? "",
        row?.depth ?? 0,
        index,
      );
    });
  };

  const prepareStarterTimelineSuggestions = (
    targets: readonly AnimationTarget[],
    layerRows: readonly SvgLayerRow[],
    existingTrackCount: number,
  ): void => {
    const plan = starterTimelinePlanner.plan(starterTimelineTargetFactsFor(targets, layerRows), existingTrackCount);
    starterTimelineSuggestions = [...plan.suggestions];
    starterTimelineSelectedIds = new Set(starterTimelineSuggestions.map((suggestion) => suggestion.id));
    starterTimelineStatus =
      starterTimelineSuggestions.length > 0
        ? `${starterTimelineSuggestions.length} deterministic starter timeline suggestions ready.`
        : "No starter timeline suggestions.";
  };

  const dismissStarterTimelineSuggestions = (): void => {
    clearStarterTimelineSuggestions("Starter timeline suggestions dismissed.");
  };

  const isStarterTimelineSuggestionSelected = (suggestionId: string): boolean =>
    starterTimelineSelectedIds.has(suggestionId);

  const toggleStarterTimelineSuggestion = (suggestionId: string, event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    const nextSelectedIds = new Set(starterTimelineSelectedIds);
    if (input.checked) {
      nextSelectedIds.add(suggestionId);
    } else {
      nextSelectedIds.delete(suggestionId);
    }
    starterTimelineSelectedIds = nextSelectedIds;
  };

  const updateStarterTimelineSuggestionValue = (suggestionId: string, keyframeIndex: number, event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    if (input.value.trim() === "") {
      starterTimelineStatus = "Starter keyframe values cannot be blank.";
      return;
    }
    starterTimelineSuggestions = starterTimelineSuggestions.map((suggestion) =>
      suggestion.id === suggestionId ? suggestion.withKeyframeValue(keyframeIndex, input.value) : suggestion,
    );
    starterTimelineStatus = "Starter timeline suggestion edited.";
  };

  const trackFromStarterTimelineSuggestion = (suggestion: StarterTimelineSuggestion): TimelineTrack | null => {
    if (!isAnimationProperty(suggestion.property)) {
      starterTimelineStatus = `Starter suggestion ${suggestion.id} uses unsupported property ${suggestion.property}.`;
      return null;
    }
    const keyframes: Keyframe[] = [];
    for (const keyframe of suggestion.keyframes) {
      if (!isKeyframeEasing(keyframe.easing)) {
        starterTimelineStatus = `Starter suggestion ${suggestion.id} uses unsupported easing ${keyframe.easing}.`;
        return null;
      }
      const normalizedValue = normalizeProjectKeyframeValue(suggestion.property, keyframe.value);
      if (normalizedValue === null) {
        starterTimelineStatus = `Starter suggestion ${suggestion.id} has invalid ${suggestion.property} value.`;
        return null;
      }
      keyframes.push({
        id: makeKeyframeId(),
        time: clampMs(keyframe.time),
        value: normalizedValue,
        easing: keyframe.easing,
      });
    }
    return {
      id: makeTrackId(),
      targetId: suggestion.targetId,
      property: suggestion.property,
      keyframes,
      muted: false,
    };
  };

  const applySelectedStarterTimelineSuggestions = (): void => {
    const selectedSuggestions = starterTimelineSuggestions.filter((suggestion) =>
      starterTimelineSelectedIds.has(suggestion.id),
    );
    let appliedCount = 0;
    for (const suggestion of selectedSuggestions) {
      const track = trackFromStarterTimelineSuggestion(suggestion);
      if (track && runEditorCommand(new AddTrackCommand(track), true)) {
        appliedCount += 1;
      }
    }
    if (appliedCount === 0) {
      starterTimelineStatus = "No starter timeline suggestions were applied.";
      return;
    }
    clearStarterTimelineSuggestions(`Applied ${appliedCount} starter timeline ${appliedCount === 1 ? "track" : "tracks"}.`);
    svgImportStatus = `Applied ${appliedCount} starter timeline ${appliedCount === 1 ? "track" : "tracks"} to ${svgSourceLabel}.`;
  };

  const resetEditorCommandHistory = (): void => {
    editorCommandHistory = EditorCommandHistory.empty();
    editorCommandStatus = "Command history reset.";
    editorLastCommandId = "";
  };

  const editorCommandSnapshot = (): EditorCommandStateSnapshot =>
    new EditorCommandStateSnapshot(tracks, selectedTargetId, selectedTrackId, selectedKeyframeId, currentTime);

  const applyEditorCommandSnapshot = (snapshot: EditorCommandStateSnapshot): void => {
    tracks = snapshot.tracks.map((track): TimelineTrack => ({
      id: track.id,
      targetId: track.targetId,
      property: track.property,
      muted: track.muted,
      keyframes: track.keyframes.map((keyframe): Keyframe => ({
        id: keyframe.id,
        time: clampMs(keyframe.time),
        value: keyframe.value,
        easing: keyframe.easing,
      })),
    }));
    selectedTargetId = availableTargets.some((target) => target.id === snapshot.selectedTargetId)
      ? snapshot.selectedTargetId
      : availableTargets[0]?.id ?? "";
    newTrackTargetId = selectedTargetId;
    const restoredTrack = tracks.find((track) => track.id === snapshot.selectedTrackId);
    selectedTrackId = restoredTrack?.id ?? "";
    selectedKeyframeId = restoredTrack?.keyframes.some((keyframe) => keyframe.id === snapshot.selectedKeyframeId)
      ? snapshot.selectedKeyframeId
      : "";
    currentTime = applySnap(clampMs(snapshot.currentTime));
  };

  const runEditorCommand = (command: EditorCommandIntent, recordHistory: boolean, markDirty = recordHistory): boolean => {
    const execution = dispatchEditorCommand(editorCommandSnapshot(), editorCommandHistory, command, recordHistory);
    if (!execution.changed) {
      return false;
    }

    applyEditorCommandSnapshot(execution.state);
    editorCommandHistory = execution.history;
    editorLastCommandId = execution.commandId;
    editorCommandStatus = `Command ${execution.commandId} applied.`;
    if (markDirty) {
      markDocumentDirty();
    }
    return true;
  };

  const undoEditorCommand = (): void => {
    const move = editorCommandHistory.undo();
    if (!move.changed || move.state === null) {
      editorCommandStatus = "Nothing to undo.";
      return;
    }

    applyEditorCommandSnapshot(move.state);
    editorCommandHistory = move.history;
    editorLastCommandId = move.commandId ?? "";
    editorCommandStatus = `Undid ${move.commandId ?? "command"}.`;
    lastBatchCreatedCount = 0;
    markDocumentDirty();
  };

  const redoEditorCommand = (): void => {
    const move = editorCommandHistory.redo();
    if (!move.changed || move.state === null) {
      editorCommandStatus = "Nothing to redo.";
      return;
    }

    applyEditorCommandSnapshot(move.state);
    editorCommandHistory = move.history;
    editorLastCommandId = move.commandId ?? "";
    editorCommandStatus = `Redid ${move.commandId ?? "command"}.`;
    lastBatchCreatedCount = 0;
    markDocumentDirty();
  };

  const syncSelectedTrack = (trackId: string, keyframeId = ""): TimelineTrack | null => {
    clearInspectorWarningSelection();
    clearInspectorValidation();
    const track = tracks.find((candidate) => candidate.id === trackId) ?? null;
    if (!track) {
      selectedTrackId = "";
      selectedKeyframeId = "";
      return null;
    }

    selectedTrackId = track.id;
    selectedKeyframeId = keyframeId;
    if (availableTargets.some((target) => target.id === track.targetId)) {
      selectedTargetId = track.targetId;
      newTrackTargetId = track.targetId;
    }
    return track;
  };

  const settleSelectionForTargets = (targets: AnimationTarget[]): void => {
    const targetIds = new Set(targets.map((target) => target.id));
    const selectedTrackStillExists = tracks.find((track) => track.id === selectedTrackId && targetIds.has(track.targetId));
    if (selectedTrackStillExists) {
      selectedTrackId = selectedTrackStillExists.id;
      selectedKeyframeId = selectedTrackStillExists.keyframes.some((keyframe) => keyframe.id === selectedKeyframeId)
        ? selectedKeyframeId
        : "";
      selectedTargetId = selectedTrackStillExists.targetId;
      newTrackTargetId = selectedTrackStillExists.targetId;
      return;
    }

    const fallbackTrack = tracks.find((track) => targetIds.has(track.targetId));
    if (fallbackTrack) {
      selectedTrackId = fallbackTrack.id;
      selectedKeyframeId = "";
      selectedTargetId = fallbackTrack.targetId;
      newTrackTargetId = fallbackTrack.targetId;
      return;
    }

    selectedTrackId = "";
    selectedKeyframeId = "";
    const selectedTargetStillExists = targets.some((target) => target.id === selectedTargetId);
    const fallbackTargetId = selectedTargetStillExists ? selectedTargetId : targets[0]?.id ?? "";
    selectedTargetId = fallbackTargetId;
    newTrackTargetId = fallbackTargetId;
  };

  const loadSvgSource = (source: string, options: SvgLoadOptions): boolean => {
    if (options.revision !== undefined && options.revision !== svgImportRevision) {
      return false;
    }

    const parsed = parseSvgImport(source);
    if (!parsed) {
      svgImportError = "Import failed: enter valid SVG markup.";
      animationImportWarnings = [];
      clearStarterTimelineSuggestions("Starter timeline suggestions unavailable because SVG import failed.");
      return false;
    }

    pauseTimeline();
    resetInspectorStateForDocumentChange();

    const targetIds = new Set(parsed.targets.map((target) => target.id));
    const importedTracksForTargets = parsed.animation.tracks.filter((track) => targetIds.has(track.targetId));
    const missingAnimationTargetIds = Array.from(
      new Set(parsed.animation.tracks.filter((track) => !targetIds.has(track.targetId)).map((track) => track.targetId)),
    ).sort();
    const importWarnings = [
      ...parsed.animation.warnings,
      ...missingAnimationTargetIds.map((targetId) => `Skipped animation track for missing target #${targetId}.`),
    ];
    const parsedLayerRows = buildSvgLayerTree(parsed.markup).rows;
    const importedTimelineTracks = importedTracksForTargets.map(createTimelineTrackFromImported);
    const importedTrackCount = importedTimelineTracks.length;
    const restoredSampleTracks = options.restoreSampleTracks && importedTrackCount === 0 ? createSampleTracks() : null;
    const nextDuration =
      importedTrackCount > 0
        ? clamp(Math.max(250, parsed.animation.duration), 250, 30000)
        : restoredSampleTracks
          ? sampleTimelineDurationMs
        : timelineDurationMs;
    const candidateTracks =
      importedTrackCount > 0 ? importedTimelineTracks : restoredSampleTracks ? restoredSampleTracks : tracks;
    const reconciledTracks = normalizeTrackList(candidateTracks.filter((track) => targetIds.has(track.targetId)), nextDuration);
    const removedTrackCount = candidateTracks.length - reconciledTracks.length;

    svgSource = parsed.markup;
    svgDraftSource = parsed.markup;
    svgSourceLabel = options.label;
    svgImportError = "";
    animationImportWarnings = importWarnings;
    if (options.restoreSampleTracks && options.label === sampleSvgLabel) {
      markDocumentClean();
    } else {
      markDocumentDirty();
    }
    clearProjectImportStatus();
    if (importedTrackCount > 0 || restoredSampleTracks) {
      timelineDurationMs = nextDuration;
      currentTime = 0;
      isLooping = importedTrackCount > 0 ? parsed.animation.hasIndefiniteRepeat : true;
      normalizeWorkAreaToDuration();
    }
    tracks = reconciledTracks;
    if (importedTrackCount === 0 && !restoredSampleTracks && reconciledTracks.length === 0) {
      prepareStarterTimelineSuggestions(parsed.targets, parsedLayerRows, reconciledTracks.length);
    } else {
      clearStarterTimelineSuggestions(
        importedTrackCount > 0
          ? "Starter timeline suggestions skipped because SVG animation tracks were imported."
          : "Starter timeline suggestions skipped because editable tracks already exist.",
      );
    }
    originalPreviewInlineStyles = new WeakMap<SVGElement, Map<PreviewStyleProperty, OriginalInlineStyle>>();
    settleSelectionForTargets(parsed.targets);
    resetEditorCommandHistory();

    const trackSummary =
      importedTrackCount > 0
        ? `Imported ${reconciledTracks.length} animation tracks.`
        : options.restoreSampleTracks
          ? `Restored ${reconciledTracks.length} sample tracks.`
          : `${reconciledTracks.length} tracks kept${removedTrackCount > 0 ? `, ${removedTrackCount} removed` : ""}.`;
    const warningSummary =
      importWarnings.length > 0
        ? ` ${importWarnings.length} unsupported animation ${importWarnings.length === 1 ? "note" : "notes"} reported.`
        : "";
    svgImportStatus = `${options.label} loaded with ${parsed.targets.length} targets. ${trackSummary}${warningSummary}`;
    return true;
  };

  const importSvgDraft = (): boolean => {
    return loadSvgSource(svgDraftSource, { label: "Pasted SVG", revision: beginSvgImport() });
  };

  const importSvgDraftAndClose = (): void => {
    if (importSvgDraft()) {
      closeEditorDialog();
    }
  };

  const resetToSampleSvg = (): void => {
    loadSvgSource(defaultSvgSource, { label: sampleSvgLabel, revision: beginSvgImport(), restoreSampleTracks: true });
  };

  const importSvgFile = async (event: Event): Promise<boolean> => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return false;
    }

    const revision = beginSvgImport();
    const isSvgFile = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");
    if (!isSvgFile) {
      svgImportError = "Import failed: choose an SVG file.";
      animationImportWarnings = [];
      input.value = "";
      return false;
    }

    try {
      const text = await file.text();
      return loadSvgSource(text, { label: file.name, revision });
    } catch {
      if (revision === svgImportRevision) {
        svgImportError = "Import failed: could not read the SVG file.";
        animationImportWarnings = [];
      }
      return false;
    } finally {
      input.value = "";
    }
  };

  const importSvgFileAndClose = async (event: Event): Promise<void> => {
    if (await importSvgFile(event)) {
      closeEditorDialog();
    }
  };

  const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === "object" && value !== null && !Array.isArray(value);

  const hasUniqueNonEmptyIds = <T,>(items: T[], getId: (item: T) => string): boolean => {
    const ids = new Set<string>();
    return items.every((item) => {
      const id = getId(item).trim();
      if (id === "" || ids.has(id)) {
        return false;
      }
      ids.add(id);
      return true;
    });
  };

  const isAnimationTargetKind = (value: unknown): value is AnimationTarget["kind"] =>
    value === "group" || value === "path" || value === "text" || value === "shape";

  const isAnimationProperty = (value: unknown): value is AnimationProperty =>
    typeof value === "string" && properties.includes(value as AnimationProperty);

  const isKeyframeEasing = (value: unknown): value is KeyframeEasing =>
    typeof value === "string" && easingModes.includes(value as KeyframeEasing);

  const sourceElementById = (document: Document, id: string): Element | null =>
    Array.from(document.querySelectorAll("[id]")).find((element) => element.getAttribute("id") === id) ?? null;

  const smilAttributeNameForProperty = (property: AnimationProperty): string => {
    switch (property) {
      case "strokeWidth":
        return "stroke-width";
      case "strokeDashoffset":
        return "stroke-dashoffset";
      case "opacity":
        return "opacity";
      case "fill":
        return "fill";
      case "stroke":
        return "stroke";
      case "x":
        return "x";
      case "y":
        return "y";
      case "scale":
        return "scale";
      case "rotation":
        return "rotation";
    }
  };

  const inlineStylePropertyValue = (element: Element, propertyName: string): string => {
    const styleAttribute = element.getAttribute("style") ?? "";
    const propertyNameLower = propertyName.toLowerCase();
    for (const declaration of styleAttribute.split(";")) {
      const separatorIndex = declaration.indexOf(":");
      if (separatorIndex < 0) {
        continue;
      }
      const name = declaration.slice(0, separatorIndex).trim().toLowerCase();
      const value = declaration.slice(separatorIndex + 1).trim();
      if (name === propertyNameLower && value !== "") {
        return value;
      }
    }
    return "";
  };

  const defaultUnderlyingValueForProperty = (property: AnimationProperty): string => {
    switch (property) {
      case "opacity":
      case "scale":
      case "strokeWidth":
        return "1";
      case "strokeDashoffset":
      case "x":
      case "y":
      case "rotation":
        return "0";
      case "fill":
      case "stroke":
        return "";
    }
  };

  const normalizeProjectKeyframeValue = (property: AnimationProperty, value: string): string | null => {
    const trimmedValue = value.trim();
    if (trimmedValue === "") {
      return null;
    }

    if (numericProperties.has(property)) {
      const numericValue = Number(trimmedValue);
      const definition = propertyById.get(property);
      if (
        !Number.isFinite(numericValue) ||
        (definition?.min !== undefined && numericValue < definition.min) ||
        (definition?.max !== undefined && numericValue > definition.max)
      ) {
        return null;
      }
      return String(numericValue);
    }

    if (
      unsafeCssValuePattern.test(trimmedValue) ||
      hasUnsafeSvgReference(trimmedValue) ||
      unsafeProjectStyleValuePattern.test(trimmedValue)
    ) {
      return null;
    }

    return trimmedValue;
  };

  const normalizeUnderlyingAnimationValue = (property: AnimationProperty, value: string): string | null => {
    const normalized = normalizeProjectKeyframeValue(property, value);
    if (normalized === null) {
      return null;
    }
    return colorProperties.has(property) && parseCssColor(normalized) === null ? null : normalized;
  };

  const underlyingAnimationValue = (property: AnimationProperty, targetElement: Element | null): string | null => {
    const attributeName = smilAttributeNameForProperty(property);
    const candidates = targetElement
      ? [
          inlineStylePropertyValue(targetElement, attributeName),
          targetElement.getAttribute(attributeName)?.trim() ?? "",
          defaultUnderlyingValueForProperty(property),
        ]
      : [defaultUnderlyingValueForProperty(property)];

    for (const candidate of candidates) {
      if (candidate === "") {
        continue;
      }
      const normalized = normalizeUnderlyingAnimationValue(property, candidate);
      if (normalized !== null) {
        return normalized;
      }
    }

    return null;
  };

  const withPreBeginHoldKeyframes = (
    property: AnimationProperty,
    keyframes: ImportedAnimationKeyframe[],
    beginOffset: number,
    targetElement: Element | null,
  ): ImportedAnimationKeyframe[] => {
    if (beginOffset <= 0) {
      return keyframes;
    }

    const firstKeyframe = keyframes[0];
    if (!firstKeyframe || firstKeyframe.time <= 0) {
      return keyframes;
    }

    const underlyingValue = underlyingAnimationValue(property, targetElement);
    if (underlyingValue === null || underlyingValue === firstKeyframe.value) {
      return keyframes;
    }

    const holdKeyframes: ImportedAnimationKeyframe[] = [{ time: 0, value: underlyingValue, easing: "linear" }];
    const holdUntil = firstKeyframe.time - 1;
    if (holdUntil > 0) {
      holdKeyframes.push({ time: holdUntil, value: underlyingValue, easing: "linear" });
    }

    return [...holdKeyframes, ...keyframes];
  };

  const svgNativeSaveMetadataDuration = (document: Document): number => {
    const metadataElements = Array.from(document.querySelectorAll(`[${nativeSaveMetadataAttributeName}="true"]`));
    for (const metadataElement of metadataElements) {
      const text = metadataElement.textContent?.trim() ?? "";
      if (text === "") {
        continue;
      }
      try {
        const parsed: unknown = JSON.parse(text);
        if (
          isRecord(parsed) &&
          parsed.version === nativeSaveMetadataVersion &&
          typeof parsed.durationMs === "number" &&
          Number.isFinite(parsed.durationMs) &&
          parsed.durationMs > 0
        ) {
          return Math.round(parsed.durationMs);
        }
      } catch {
        return 0;
      }
    }
    return 0;
  };

  const parseClockValueMs = (value: string): number | null => {
    const trimmed = value.trim();
    if (trimmed === "") {
      return null;
    }

    const simpleMatch = /^(-?\d+(?:\.\d+)?)(ms|s|min|h)?$/i.exec(trimmed);
    if (simpleMatch) {
      const amount = Number(simpleMatch[1]);
      if (!Number.isFinite(amount) || amount < 0) {
        return null;
      }
      const unit = simpleMatch[2]?.toLowerCase();
      if (unit === "ms") {
        return amount;
      }
      if (unit === "min") {
        return amount * 60_000;
      }
      if (unit === "h") {
        return amount * 3_600_000;
      }
      return amount * 1000;
    }

    const clockParts = trimmed.split(":").map((part) => Number(part));
    if (clockParts.length < 2 || clockParts.length > 3 || clockParts.some((part) => !Number.isFinite(part) || part < 0)) {
      return null;
    }

    const [hours = 0, minutes = 0, seconds = 0] = clockParts.length === 2 ? [0, clockParts[0], clockParts[1]] : clockParts;
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  };

  const smilList = (value: string | null): string[] =>
    (value ?? "")
      .split(";")
      .map((item) => item.trim())
      .filter(Boolean);

  const resolveSmilValues = (element: Element): string[] => {
    const values = smilList(element.getAttribute("values"));
    if (values.length > 0) {
      return values;
    }

    const from = element.getAttribute("from")?.trim();
    const to = element.getAttribute("to")?.trim();
    return from && to ? [from, to] : [];
  };

  const resolveSmilKeyTimes = (element: Element, count: number): number[] | null => {
    if (count < 2) {
      return null;
    }

    const explicit = smilList(element.getAttribute("keyTimes"));
    if (explicit.length > 0) {
      if (explicit.length !== count) {
        return null;
      }
      const parsed = explicit.map((value) => Number(value));
      const isValid = parsed.every((value, index) => {
        const previous = index === 0 ? 0 : parsed[index - 1]!;
        return Number.isFinite(value) && value >= 0 && value <= 1 && (index === 0 ? value === 0 : value > previous);
      });
      return isValid && parsed[parsed.length - 1] === 1 ? parsed : null;
    }

    return Array.from({ length: count }, (_, index) => (count === 1 ? 0 : index / (count - 1)));
  };

  const localTargetIdFromReference = (value: string | null): string | null => {
    const trimmed = value?.trim() ?? "";
    if (!trimmed.startsWith("#") || !isSafeSvgReference(trimmed)) {
      return null;
    }
    return trimmed.slice(1);
  };

  const targetIdForAnimationElement = (element: Element): string | null => {
    const referenceValues = [
      element.getAttribute("href"),
      element.getAttribute("xlink:href"),
      element.getAttributeNS("http://www.w3.org/1999/xlink", "href"),
    ].filter((value): value is string => value !== null);
    if (referenceValues.length > 0) {
      return referenceValues.map(localTargetIdFromReference).find((targetId) => targetId !== null) ?? null;
    }

    const parentId = element.parentElement?.getAttribute("id")?.trim();
    return parentId || null;
  };

  const trackKeyframesFromValues = (
    property: AnimationProperty,
    values: string[],
    keyTimes: number[],
    duration: number,
    offset: number,
  ): ImportedAnimationKeyframe[] | null => {
    if (values.length !== keyTimes.length || duration <= 0) {
      return null;
    }

    const keyframes = values.map((value, index): ImportedAnimationKeyframe | null => {
      const normalizedValue = normalizeProjectKeyframeValue(property, value);
      if (normalizedValue === null) {
        return null;
      }
      if (colorProperties.has(property) && parseCssColor(normalizedValue) === null) {
        return null;
      }

      return {
        time: Math.round(offset + duration * keyTimes[index]!),
        value: normalizedValue,
        easing: "linear",
      };
    });

    return keyframes.every((keyframe) => keyframe !== null) ? (keyframes as ImportedAnimationKeyframe[]) : null;
  };

  const parseSmilNumberList = (value: string): number[] | null => {
    const parts = value.trim().split(/[\s,]+/).filter(Boolean);
    if (parts.length === 0) {
      return null;
    }
    const numbers = parts.map((part) => Number(part));
    return numbers.every((part) => Number.isFinite(part)) ? numbers : null;
  };

  const numbersFromSmilValue = (value: string): number[] => parseSmilNumberList(value) ?? [];

  const dimensionValuesFromTransformValues = (values: string[], dimension: 0 | 1): string[] =>
    values.map((value) => {
      const numbers = numbersFromSmilValue(value);
      return String(numbers[dimension] ?? 0);
    });

  const hasNonUniformScaleValues = (values: string[]): boolean =>
    values.some((value) => {
      const numbers = numbersFromSmilValue(value);
      return numbers.length > 1 && numbers[1] !== numbers[0];
    });

  const hasUnsupportedTransformValueArity = (values: string[], min: number, max: number): boolean =>
    values.some((value) => {
      const count = numbersFromSmilValue(value).length;
      return count < min || count > max;
    });

  const hasExplicitRotatePivotValues = (values: string[]): boolean =>
    values.some((value) => numbersFromSmilValue(value).length > 1);

  const valuesChange = (values: string[]): boolean => values.some((value) => value !== values[0]);

  const unsupportedRepeatAttributeName = (element: Element): string => {
    const repeatDur = element.getAttribute("repeatDur")?.trim();
    if (repeatDur) {
      return "repeatDur";
    }

    const repeatCount = element.getAttribute("repeatCount")?.trim();
    if (repeatCount && repeatCount.toLowerCase() !== "indefinite") {
      return "repeatCount";
    }

    return "";
  };

  const hasIndefiniteRepeat = (element: Element): boolean =>
    element.getAttribute("repeatCount")?.trim().toLowerCase() === "indefinite";

  const unsupportedCompositionAttribute = (element: Element): string => {
    const additive = element.getAttribute("additive")?.trim().toLowerCase();
    if (additive && additive !== "replace") {
      return `additive "${additive}"`;
    }

    const accumulate = element.getAttribute("accumulate")?.trim().toLowerCase();
    if (accumulate && accumulate !== "none") {
      return `accumulate "${accumulate}"`;
    }

    return "";
  };

  const extractAnimateElementTrack = (
    element: Element,
    targetId: string,
    targetElement: Element | null,
    duration: number,
    beginOffset: number,
    warnings: string[],
  ): ImportedAnimationTrack | null => {
    const attributeName = element.getAttribute("attributeName")?.trim().toLowerCase() ?? "";
    const property = supportedSmilAttributeProperties.get(attributeName);
    if (!property) {
      warnings.push(`Unsupported animate attribute "${attributeName || "unknown"}" on #${targetId}.`);
      return null;
    }

    const values = resolveSmilValues(element);
    const keyTimes = resolveSmilKeyTimes(element, values.length);
    if (!keyTimes) {
      warnings.push(`Unsupported keyTimes or value count for ${attributeName} on #${targetId}.`);
      return null;
    }

    const keyframes = trackKeyframesFromValues(property, values, keyTimes, duration, beginOffset);
    if (!keyframes) {
      warnings.push(`Unsupported ${attributeName} values on #${targetId}.`);
      return null;
    }

    return { targetId, property, keyframes: withPreBeginHoldKeyframes(property, keyframes, beginOffset, targetElement) };
  };

  const extractAnimateTransformTracks = (
    element: Element,
    targetId: string,
    targetElement: Element | null,
    duration: number,
    beginOffset: number,
    warnings: string[],
  ): ImportedAnimationTrack[] => {
    const attributeName = element.getAttribute("attributeName")?.trim().toLowerCase() ?? "";
    if (attributeName && attributeName !== "transform") {
      warnings.push(`Unsupported animateTransform attribute "${attributeName}" on #${targetId}.`);
      return [];
    }

    const transformType = element.getAttribute("type")?.trim().toLowerCase() ?? "";
    const values = resolveSmilValues(element);
    const keyTimes = resolveSmilKeyTimes(element, values.length);
    if (!keyTimes) {
      warnings.push(`Unsupported keyTimes or transform value count on #${targetId}.`);
      return [];
    }
    if (values.some((value) => parseSmilNumberList(value) === null)) {
      warnings.push(`Unsupported malformed transform values on #${targetId}.`);
      return [];
    }

    if (transformType === "translate") {
      if (hasUnsupportedTransformValueArity(values, 1, 2)) {
        warnings.push(`Unsupported translate value arity on #${targetId}.`);
        return [];
      }
      const xValues = dimensionValuesFromTransformValues(values, 0);
      const yValues = dimensionValuesFromTransformValues(values, 1);
      const tracks: ImportedAnimationTrack[] = [];
      const xKeyframes = trackKeyframesFromValues("x", xValues, keyTimes, duration, beginOffset);
      const yKeyframes = trackKeyframesFromValues("y", yValues, keyTimes, duration, beginOffset);
      if (xKeyframes && valuesChange(xValues)) {
        tracks.push({ targetId, property: "x", keyframes: withPreBeginHoldKeyframes("x", xKeyframes, beginOffset, targetElement) });
      }
      if (yKeyframes && valuesChange(yValues)) {
        tracks.push({ targetId, property: "y", keyframes: withPreBeginHoldKeyframes("y", yKeyframes, beginOffset, targetElement) });
      }
      if (tracks.length === 0) {
        warnings.push(`Unsupported or static translate values on #${targetId}.`);
      }
      return tracks;
    }

    if (transformType === "scale") {
      if (hasUnsupportedTransformValueArity(values, 1, 2)) {
        warnings.push(`Unsupported scale value arity on #${targetId}.`);
        return [];
      }
      if (hasNonUniformScaleValues(values)) {
        warnings.push(`Unsupported non-uniform scale values on #${targetId}.`);
        return [];
      }
      const scaleValues = dimensionValuesFromTransformValues(values, 0);
      const keyframes = trackKeyframesFromValues("scale", scaleValues, keyTimes, duration, beginOffset);
      if (!keyframes) {
        warnings.push(`Unsupported scale values on #${targetId}.`);
        return [];
      }
      return [{ targetId, property: "scale", keyframes: withPreBeginHoldKeyframes("scale", keyframes, beginOffset, targetElement) }];
    }

    if (transformType === "rotate") {
      if (hasExplicitRotatePivotValues(values)) {
        warnings.push(`Unsupported pivoted rotate values on #${targetId}.`);
        return [];
      }
      const rotationValues = dimensionValuesFromTransformValues(values, 0);
      const keyframes = trackKeyframesFromValues("rotation", rotationValues, keyTimes, duration, beginOffset);
      if (!keyframes) {
        warnings.push(`Unsupported rotate values on #${targetId}.`);
        return [];
      }
      return [{ targetId, property: "rotation", keyframes: withPreBeginHoldKeyframes("rotation", keyframes, beginOffset, targetElement) }];
    }

    warnings.push(`Unsupported animateTransform type "${transformType || "unknown"}" on #${targetId}.`);
    return [];
  };

  const extractSvgAnimationIntent = (source: string): SvgAnimationImportResult => {
    const emptyResult: SvgAnimationImportResult = { tracks: [], warnings: [], duration: 0, hasIndefiniteRepeat: false };
    if (typeof DOMParser === "undefined") {
      return emptyResult;
    }

    const doc = new DOMParser().parseFromString(source, "image/svg+xml");
    if (doc.querySelector("parsererror")) {
      return emptyResult;
    }

    const warnings: string[] = [];
    const tracks: ImportedAnimationTrack[] = [];
    const metadataDuration = svgNativeSaveMetadataDuration(doc);
    const importedTrackKeys = new Set<string>();
    let importedIndefiniteRepeat = false;
    const appendImportedTrack = (track: ImportedAnimationTrack): boolean => {
      const key = `${track.targetId}:${track.property}`;
      if (importedTrackKeys.has(key)) {
        warnings.push(`Skipped duplicate ${track.property} animation on #${track.targetId}.`);
        return false;
      }

      importedTrackKeys.add(key);
      tracks.push(track);
      return true;
    };
    const animationElements = Array.from(doc.querySelectorAll("*")).filter((element) => {
      const tag = element.tagName.toLowerCase();
      return tag === "animate" || tag === "animatetransform" || unsupportedAnimationTags.has(tag);
    });

    doc.querySelectorAll("style").forEach((styleElement) => {
      const styleText = styleElement.textContent ?? "";
      if (/@keyframes|animation(?:-name)?\s*:/i.test(styleText)) {
        warnings.push("CSS animation rules were not imported.");
      }
    });

    doc.querySelectorAll("script").forEach((scriptElement) => {
      const scriptText = scriptElement.textContent ?? "";
      if (/\banimate\s*\(/i.test(scriptText) || /\.animate\s*\(/i.test(scriptText)) {
        warnings.push("Web Animations script was not imported.");
      }
    });

    animationElements.forEach((element) => {
      const tag = element.tagName.toLowerCase();
      const targetId = targetIdForAnimationElement(element);
      if (!targetId) {
        warnings.push(`Unsupported ${tag} without a local target ID.`);
        return;
      }

      if (unsupportedAnimationTags.has(tag)) {
        warnings.push(`Unsupported ${tag} animation on #${targetId}.`);
        return;
      }
      const targetElement = sourceElementById(doc, targetId);

      const begin = element.getAttribute("begin");
      const beginOffset = begin ? parseClockValueMs(begin) : 0;
      if (beginOffset === null || beginOffset < 0) {
        warnings.push(`Unsupported begin time on #${targetId}.`);
        return;
      }

      const calcMode = element.getAttribute("calcMode")?.trim().toLowerCase();
      if (calcMode && calcMode !== "linear") {
        warnings.push(`Unsupported calcMode "${calcMode}" on #${targetId}.`);
        return;
      }

      const unsupportedRepeat = unsupportedRepeatAttributeName(element);
      if (unsupportedRepeat) {
        warnings.push(`Unsupported ${unsupportedRepeat} on #${targetId}.`);
        return;
      }

      const unsupportedComposition = unsupportedCompositionAttribute(element);
      if (unsupportedComposition) {
        warnings.push(`Unsupported ${unsupportedComposition} on #${targetId}.`);
        return;
      }

      const duration = parseClockValueMs(element.getAttribute("dur") ?? "");
      if (!duration || duration <= 0) {
        warnings.push(`Unsupported or missing duration on #${targetId}.`);
        return;
      }

      if (tag === "animate") {
        const track = extractAnimateElementTrack(element, targetId, targetElement, duration, beginOffset, warnings);
        if (track && appendImportedTrack(track)) {
          if (hasIndefiniteRepeat(element)) {
            importedIndefiniteRepeat = true;
          }
        }
        return;
      }

      const transformTracks = extractAnimateTransformTracks(element, targetId, targetElement, duration, beginOffset, warnings);
      let appendedTransformTrack = false;
      transformTracks.forEach((track) => {
        if (appendImportedTrack(track)) {
          appendedTransformTrack = true;
        }
      });
      if (appendedTransformTrack && hasIndefiniteRepeat(element)) {
        importedIndefiniteRepeat = true;
      }
    });

    const importedDuration = tracks.reduce((maxDuration, track) => {
      const trackDuration = track.keyframes.reduce((maxTime, keyframe) => Math.max(maxTime, keyframe.time), 0);
      return Math.max(maxDuration, trackDuration);
    }, 0);
    const duration = Math.max(importedDuration, metadataDuration);

    return { tracks, warnings: Array.from(new Set(warnings)), duration, hasIndefiniteRepeat: importedIndefiniteRepeat };
  };

  const createTimelineTrackFromImported = (track: ImportedAnimationTrack): TimelineTrack => ({
    id: makeTrackId(),
    targetId: track.targetId,
    property: track.property,
    muted: false,
    keyframes: [...track.keyframes].sort((first, second) => first.time - second.time).map((keyframe) => ({
      id: makeKeyframeId(),
      time: keyframe.time,
      value: keyframe.value,
      easing: keyframe.easing,
    })),
  });

  const parseProjectTargets = (value: unknown): AnimationTarget[] | null => {
    if (!Array.isArray(value)) {
      return null;
    }

    const targets = value.map((candidate): AnimationTarget | null => {
      if (!isRecord(candidate) || typeof candidate.id !== "string" || typeof candidate.name !== "string") {
        return null;
      }
      if (!isAnimationTargetKind(candidate.kind)) {
        return null;
      }
      return {
        id: candidate.id,
        name: candidate.name,
        kind: candidate.kind,
      };
    });

    if (!targets.every((target) => target !== null)) {
      return null;
    }
    const parsedTargets = targets as AnimationTarget[];
    return hasUniqueNonEmptyIds(parsedTargets, (target) => target.id) ? parsedTargets : null;
  };

  const projectTargetsMatchParsedSvg = (projectTargets: AnimationTarget[], parsedTargets: AnimationTarget[]): boolean => {
    if (projectTargets.length !== parsedTargets.length) {
      return false;
    }

    const projectTargetsById = new Map(projectTargets.map((target) => [target.id, target]));
    return parsedTargets.every((parsedTarget) => {
      const projectTarget = projectTargetsById.get(parsedTarget.id);
      return projectTarget?.name === parsedTarget.name && projectTarget.kind === parsedTarget.kind;
    });
  };

  const parseProjectTracks = (value: unknown): TimelineTrack[] | null => {
    if (!Array.isArray(value)) {
      return null;
    }

    const tracksFromProject = value.map((candidate): TimelineTrack | null => {
      if (
        !isRecord(candidate) ||
        typeof candidate.id !== "string" ||
        typeof candidate.targetId !== "string" ||
        !isAnimationProperty(candidate.property) ||
        typeof candidate.muted !== "boolean" ||
        !Array.isArray(candidate.keyframes)
      ) {
        return null;
      }

      const property = candidate.property;
      const keyframes = candidate.keyframes.map((keyframe): Keyframe | null => {
        if (
          !isRecord(keyframe) ||
          typeof keyframe.id !== "string" ||
          typeof keyframe.time !== "number" ||
          !Number.isFinite(keyframe.time) ||
          typeof keyframe.value !== "string" ||
          !isKeyframeEasing(keyframe.easing)
        ) {
          return null;
        }

        const value = normalizeProjectKeyframeValue(property, keyframe.value);
        if (value === null) {
          return null;
        }

        return {
          id: keyframe.id,
          time: keyframe.time,
          value,
          easing: keyframe.easing,
        };
      });

      if (!keyframes.every((keyframe) => keyframe !== null)) {
        return null;
      }
      const parsedKeyframes = keyframes as Keyframe[];
      if (!hasUniqueNonEmptyIds(parsedKeyframes, (keyframe) => keyframe.id)) {
        return null;
      }

      return {
        id: candidate.id,
        targetId: candidate.targetId,
        property,
        muted: candidate.muted,
        keyframes: parsedKeyframes,
      };
    });

    if (!tracksFromProject.every((track) => track !== null)) {
      return null;
    }
    const tracks = tracksFromProject as TimelineTrack[];
    return hasUniqueNonEmptyIds(tracks, (track) => track.id) ? tracks : null;
  };

  const parseProjectImport = (
    source: string,
  ): { project: TadpoleProject; parsedSvg: { markup: string; targets: AnimationTarget[] } } | { error: string } => {
    const sourceText = source.trim();
    if (sourceText === "") {
      return { error: "Project import failed: paste project JSON." };
    }

    let payload: unknown;
    try {
      payload = JSON.parse(sourceText);
    } catch {
      return { error: "Project import failed: enter valid JSON." };
    }

    if (!isRecord(payload) || payload.version !== projectExportVersion) {
      return { error: `Project import failed: expected ${projectExportVersion}.` };
    }

    const svg = payload.svg;
    const timeline = payload.timeline;
    if (!isRecord(svg) || typeof svg.label !== "string" || typeof svg.source !== "string") {
      return { error: "Project import failed: SVG source metadata is missing." };
    }
    const parsedSvg = parseSvgImport(svg.source);
    if (!parsedSvg) {
      return { error: "Project import failed: SVG source is not valid importable SVG." };
    }

    const targets = parseProjectTargets(svg.targets);
    if (!targets) {
      return { error: "Project import failed: target metadata is invalid." };
    }
    if (!projectTargetsMatchParsedSvg(targets, parsedSvg.targets)) {
      return { error: "Project import failed: target metadata does not match SVG source." };
    }

    if (
      !isRecord(timeline) ||
      typeof timeline.duration !== "number" ||
      !Number.isFinite(timeline.duration) ||
      typeof timeline.currentTime !== "number" ||
      !Number.isFinite(timeline.currentTime) ||
      typeof timeline.frameRate !== "number" ||
      !Number.isFinite(timeline.frameRate) ||
      typeof timeline.isLooping !== "boolean" ||
      typeof timeline.snapToFrames !== "boolean" ||
      typeof timeline.snapMs !== "number" ||
      !Number.isFinite(timeline.snapMs) ||
      typeof timeline.gridDensity !== "number" ||
      !Number.isFinite(timeline.gridDensity)
    ) {
      return { error: "Project import failed: timeline settings are invalid." };
    }

    const projectTracks = parseProjectTracks(timeline.tracks);
    if (!projectTracks) {
      return { error: "Project import failed: timeline tracks are invalid." };
    }

    return {
      project: {
        version: projectExportVersion,
        svg: {
          label: svg.label,
          source: svg.source,
          targets,
        },
        timeline: {
          duration: timeline.duration,
          currentTime: timeline.currentTime,
          frameRate: timeline.frameRate,
          isLooping: timeline.isLooping,
          snapToFrames: timeline.snapToFrames,
          snapMs: timeline.snapMs,
          gridDensity: timeline.gridDensity,
          tracks: projectTracks,
        },
      },
      parsedSvg,
    };
  };

  const validateProjectDraft = (): void => {
    const parsed = parseProjectImport(projectDraftSource);
    if ("error" in parsed) {
      projectImportError = parsed.error;
      return;
    }

    projectImportError = "";
    projectMissingTargetIds = [];
    projectImportStatus = `Project JSON validated: ${parsed.project.svg.label} with ${parsed.project.svg.targets.length} targets and ${parsed.project.timeline.tracks.length} tracks.`;
  };

  const useCurrentProjectExport = (): void => {
    projectDraftSource = exportPayload;
    validateProjectDraft();
  };

  const importProjectFile = async (event: Event): Promise<void> => {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const isJsonFile = file.type === "application/json" || file.name.toLowerCase().endsWith(".json");
    if (!isJsonFile) {
      projectImportError = "Project import failed: choose a JSON file.";
      input.value = "";
      return;
    }

    try {
      projectDraftSource = await file.text();
      validateProjectDraft();
    } catch {
      projectImportError = "Project import failed: could not read the JSON file.";
    } finally {
      input.value = "";
    }
  };

  const formatSkippedTargetSummary = (missingTargetIds: string[]): string => {
    if (missingTargetIds.length === 0) {
      return "";
    }
    const suffix = missingTargetIds.length === 1 ? "target" : "targets";
    return ` Skipped tracks for missing ${suffix}: ${missingTargetIds.join(", ")}.`;
  };

  const restoreProjectDraft = (): void => {
    const parsed = parseProjectImport(projectDraftSource);
    if ("error" in parsed) {
      projectImportError = parsed.error;
      return;
    }

    pauseTimeline();
    beginSvgImport();
    resetInspectorStateForDocumentChange();

    const label = parsed.project.svg.label.trim() || "Imported Project";
    const nextDuration = clamp(Math.max(250, parsed.project.timeline.duration), 250, 30000);
    const targetIds = new Set(parsed.parsedSvg.targets.map((target) => target.id));
    const normalizedTracks = normalizeTrackList(parsed.project.timeline.tracks, nextDuration);
    const restoredTracks = normalizedTracks.filter((track) => targetIds.has(track.targetId));
    const missingTargetIds = Array.from(
      new Set(normalizedTracks.filter((track) => !targetIds.has(track.targetId)).map((track) => track.targetId)),
    ).sort();

    svgSource = parsed.parsedSvg.markup;
    svgDraftSource = parsed.parsedSvg.markup;
    svgSourceLabel = label;
    svgImportError = "";
    animationImportWarnings = [];
    timelineDurationMs = nextDuration;
    currentTime = clampMsForDuration(parsed.project.timeline.currentTime, nextDuration);
    frameRate = clamp(parsed.project.timeline.frameRate, 12, 144);
    isLooping = parsed.project.timeline.isLooping;
    snapToFrames = parsed.project.timeline.snapToFrames;
    snapMs = clamp(Math.round(parsed.project.timeline.snapMs), 1, 250);
    timelineGridDensity = clamp(Math.round(parsed.project.timeline.gridDensity), minGridDivisions, maxGridDivisions);
    normalizeWorkAreaToDuration();
    tracks = restoredTracks;
    syncIdCursorsFromTracks(restoredTracks);
    originalPreviewInlineStyles = new WeakMap<SVGElement, Map<PreviewStyleProperty, OriginalInlineStyle>>();
    settleSelectionForTargets(parsed.parsedSvg.targets);
    resetEditorCommandHistory();
    clearStarterTimelineSuggestions("Starter timeline suggestions skipped because a project timeline was restored.");

    const skippedSummary = formatSkippedTargetSummary(missingTargetIds);
    projectImportError = "";
    projectMissingTargetIds = missingTargetIds;
    projectImportStatus = `Project restored: ${label} with ${parsed.parsedSvg.targets.length} targets and ${restoredTracks.length} tracks.${skippedSummary}`;
    svgImportStatus = `${label} restored from project with ${parsed.parsedSvg.targets.length} targets and ${restoredTracks.length} tracks.${skippedSummary}`;
    markDocumentClean();
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
    syncSelectedTrack(track.id, created ?? "");
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
      syncSelectedTrack(trackId, created);
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

  const setRunnableExportStatus = (status: string): void => {
    runnableExportStatus = status;
    window.setTimeout(() => {
      if (runnableExportStatus === status) {
        runnableExportStatus = "";
      }
    }, 1600);
  };

  const setSvgNativeSaveStatus = (status: string): void => {
    svgNativeSaveStatus = status;
    window.setTimeout(() => {
      if (svgNativeSaveStatus === status) {
        svgNativeSaveStatus = "";
      }
    }, 1600);
  };

  const copyRunnableExport = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(runnableExportHtml);
      setRunnableExportStatus("Runnable HTML copied");
    } catch {
      setRunnableExportStatus("Runnable HTML copy failed");
    }
  };

  const copyNativeSvg = async (): Promise<void> => {
    if (!svgNativeSaveResult.ok) {
      setSvgNativeSaveStatus("SVG-native save is blocked by serializer warnings.");
      return;
    }

    try {
      await navigator.clipboard.writeText(svgNativeSaveResult.svgText);
      setSvgNativeSaveStatus("SVG copied");
    } catch {
      setSvgNativeSaveStatus("SVG copy failed");
    }
  };

  const downloadRunnableExport = (): void => {
    const blob = new Blob([runnableExportHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = runnableExportFile;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setRunnableExportStatus(`Downloaded ${runnableExportFile}`);
  };

  const downloadNativeSvg = (): void => {
    if (!svgNativeSaveResult.ok) {
      setSvgNativeSaveStatus("SVG-native save is blocked by serializer warnings.");
      return;
    }

    const blob = new Blob([svgNativeSaveResult.svgText], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = svgNativeSaveFile;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setSvgNativeSaveStatus(`Downloaded ${svgNativeSaveFile}`);
  };

  const jumpByTimelineKey = (event: KeyboardEvent): void => {
    if (
      activeDialog !== null ||
      openMenu !== null ||
      hasOpenLocalKeyboardSurface() ||
      isTextInputTarget(event.target) ||
      isLocalKeyboardSurface(event.target)
    ) {
      return;
    }
    jumpByKeyboard(event);
    if (event.key.toLowerCase() === "k") {
      event.preventDefault();
      addKeyframeAtCurrentForSelected();
    }
  };

  const keyboardStepMs = (): number => (snapToFrames && snapMs > 0 ? snapMs : 16);

  const jumpByKeyboard = (event: KeyboardEvent): void => {
    const step = keyboardStepMs();
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
    const key = event.key.toLowerCase();
    const hasCommandModifier = (event.ctrlKey || event.metaKey) && !event.altKey;
    if (
      activeDialog !== null ||
      openMenu !== null ||
      hasOpenLocalKeyboardSurface() ||
      isTextInputTarget(event.target) ||
      isLocalKeyboardSurface(event.target)
    ) {
      return;
    }

    if (hasCommandModifier && key === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        redoEditorCommand();
        return;
      }
      undoEditorCommand();
      return;
    }

    if (hasCommandModifier && key === "y") {
      event.preventDefault();
      redoEditorCommand();
      return;
    }

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
      syncSelectedTrack(tracks[nextIndex]!.id);
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

    if (key === "i") {
      event.preventDefault();
      setWorkAreaInPoint();
      return;
    }

    if (key === "o") {
      event.preventDefault();
      setWorkAreaOutPoint();
      return;
    }

    if (key === "l") {
      event.preventDefault();
      toggleLoopWorkArea();
      return;
    }

    if (key === "u") {
      event.preventDefault();
      toggleTimeDisplayMode();
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
      strokeDashoffset: "0",
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
    const strokeDashoffset = resolveTrackValue(targetId, "strokeDashoffset", base.strokeDashoffset);
    return {
      transform: `translate(${x}px, ${y}px) scale(${scale}) rotate(${rotation}deg)`,
      opacity,
      fill,
      stroke,
      strokeWidth: `${strokeWidth}`,
      strokeDashoffset: `${strokeDashoffset}`,
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

      element.classList.toggle("tadpole-selected-target", target.id === selectedTargetId);
      element.setAttribute("data-tadpole-target", "true");

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

      if (getActiveTrackForTarget(target.id, "strokeDashoffset")) {
        setPreviewStyleProperty(element, "stroke-dashoffset", style.strokeDashoffset);
      } else {
        restorePreviewStyleProperty(element, "stroke-dashoffset");
      }
    });
  };

  const movePlayheadToTrack = (time: number): void => {
    runEditorCommand(new SeekTimelineCommand(clampMs(time)), false);
  };

  const activeWorkAreaLoopBounds = (): { start: number; end: number } | null => {
    if (!loopWorkArea || !workAreaActive) {
      return null;
    }
    return { start: workAreaStartMs, end: workAreaEndMs };
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
    const workAreaLoop = activeWorkAreaLoopBounds();
    const workAreaLoopStart = workAreaLoop?.start;
    const workAreaLoopEnd = workAreaLoop?.end;
    const hasWorkAreaLoop = typeof workAreaLoopStart === "number" && typeof workAreaLoopEnd === "number";
    let next = isLooping ? elapsed % duration : clamp(elapsed, 0, duration);
    if (hasWorkAreaLoop) {
      const workAreaDuration = Math.max(1, workAreaLoopEnd - workAreaLoopStart);
      next = workAreaLoopStart + (elapsed % workAreaDuration);
    }
    next = applySnap(clampMs(next));
    currentTime = next;

    if (!isLooping && !hasWorkAreaLoop && elapsed >= duration) {
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
    const workAreaLoop = activeWorkAreaLoopBounds();
    const workAreaLoopStart = workAreaLoop?.start;
    const workAreaLoopEnd = workAreaLoop?.end;
    if (
      typeof workAreaLoopStart === "number" &&
      typeof workAreaLoopEnd === "number" &&
      (currentTime < workAreaLoopStart || currentTime >= workAreaLoopEnd)
    ) {
      currentTime = workAreaLoopStart;
    } else if (currentTime >= timelineDurationMs && !isLooping) {
      currentTime = 0;
    }
    isPlaying = true;
    playbackStartTime = performance.now() - (typeof workAreaLoopStart === "number" ? currentTime - workAreaLoopStart : currentTime);
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
    markDocumentDirty();
  };

  const setPlayRate = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    frameRate = clamp(Number(input.value), 12, 144);
    markDocumentDirty();
  };

  const setSnapSetting = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    snapMs = Number(input.value);
    markDocumentDirty();
  };

  const setTimelineSnap = (): void => {
    snapToFrames = !snapToFrames;
    markDocumentDirty();
  };

  const resolvePreviewTargetId = (eventTarget: EventTarget | null): string | null => {
    if (!(eventTarget instanceof Element) || !previewSvgHostElement) {
      return null;
    }

    const targetIds = new Set(availableTargets.map((target) => target.id));
    let candidate: Element | null = eventTarget;
    while (candidate && candidate !== previewSvgHostElement) {
      const id = candidate.getAttribute("id")?.trim();
      if (id && targetIds.has(id)) {
        return id;
      }
      candidate = candidate.parentElement;
    }
    return null;
  };

  const selectTarget = (targetId: string, options: { syncTrack?: boolean } = {}): void => {
    if (!availableTargets.some((target) => target.id === targetId)) {
      return;
    }
    clearInspectorWarningSelection();
    clearInspectorValidation();
    selectedTargetId = targetId;
    newTrackTargetId = targetId;

    if (!options.syncTrack || activeTrack?.targetId === targetId) {
      return;
    }

    const matchingTrack = tracks.find((track) => track.targetId === targetId);
    if (matchingTrack) {
      syncSelectedTrack(matchingTrack.id);
      return;
    }

    selectedTrackId = "";
    selectedKeyframeId = "";
  };

  const selectLayerTarget = (targetId: string): void => {
    selectTarget(targetId, { syncTrack: true });
    expandTimelineStackForTarget(targetId);
  };

  const setTargetBatchSelection = (targetId: string, event: Event): void => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement) || !availableTargets.some((target) => target.id === targetId)) {
      return;
    }
    const nextSelectedTargetIds = new Set(multiSelectedTargetIds);
    if (input.checked) {
      nextSelectedTargetIds.add(targetId);
    } else {
      nextSelectedTargetIds.delete(targetId);
    }
    multiSelectedTargetIds = nextSelectedTargetIds;
    lastBatchCreatedCount = 0;
  };

  const clearBatchTargetSelection = (): void => {
    multiSelectedTargetIds = new Set<string>();
    lastBatchCreatedCount = 0;
  };

  const setBatchTrackProperty = (event: Event): void => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLSelectElement)) {
      return;
    }
    const property = input.value;
    if (!isAnimationProperty(property)) {
      return;
    }
    batchTrackProperty = property;
    lastBatchCreatedCount = 0;
  };

  const selectPreviewTarget = (event: PointerEvent): void => {
    const targetId = resolvePreviewTargetId(event.target);
    if (!targetId) {
      return;
    }

    event.stopPropagation();
    selectTarget(targetId, { syncTrack: true });
    panelReturnFocusSelector = "[data-tadpole-canvas-stage]";
    activePanel = "inspector";
    drawerOpen = true;
  };

  const createTrackDraft = (targetId: string, property: AnimationProperty): TimelineTrack | null => {
    if (!availableTargets.some((target) => target.id === targetId)) {
      return null;
    }
    return {
      id: makeTrackId(),
      targetId,
      property,
      muted: false,
      keyframes: [{ id: makeKeyframeId(), time: 0, value: defaultValueFor(property), easing: "linear" }],
    };
  };

  const createTrack = (targetId: string, property: AnimationProperty): TimelineTrack | null => {
    const newTrack = createTrackDraft(targetId, property);
    if (!newTrack) {
      return null;
    }
    return runEditorCommand(new AddTrackCommand(newTrack), true) ? newTrack : null;
  };

  const createTracksForSelectedTargets = (): void => {
    const newTracks = multiSelectedTargets
      .filter((target) => !tracks.some((track) => track.targetId === target.id && track.property === batchTrackProperty))
      .map((target) => createTrackDraft(target.id, batchTrackProperty))
      .filter((track): track is TimelineTrack => track !== null);
    if (newTracks.length === 0) {
      lastBatchCreatedCount = 0;
      svgImportStatus = `No new ${propertySpec(batchTrackProperty).label} tracks to create for the batch selection.`;
      return;
    }
    const added = runEditorCommand(new AddTracksCommand(newTracks), true);
    if (!added) {
      lastBatchCreatedCount = 0;
      return;
    }
    const lastTrack = newTracks.at(-1);
    lastBatchCreatedCount = newTracks.length;
    newTrackProperty = batchTrackProperty;
    if (lastTrack) {
      newTrackTargetId = lastTrack.targetId;
    }
    newTracks.forEach((track) => expandTimelineStackForTarget(track.targetId));
    showOnlySelected = false;
    svgImportStatus = `Created ${newTracks.length} ${propertySpec(batchTrackProperty).label} batch ${newTracks.length === 1 ? "track" : "tracks"}.`;
  };

  const addTrack = (): void => {
    createTrack(newTrackTargetId, newTrackProperty);
  };

  const addTrackForSelectedTarget = (property: AnimationProperty): void => {
    if (!selectedTarget) {
      return;
    }
    newTrackTargetId = selectedTarget.id;
    newTrackProperty = property;
    createTrack(selectedTarget.id, property);
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
    markDocumentDirty();
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
    markDocumentDirty();
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
    markDocumentDirty();
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
    runEditorCommand(new AddTrackCommand(copy), true);
  };

  const removeTrack = (trackId: string): void => {
    runEditorCommand(new RemoveTrackCommand(trackId), true);
  };

  const clearTracks = (): void => {
    const clearedTrackCount = tracks.length;
    if (clearedTrackCount === 0) {
      return;
    }

    tracks = [];
    markDocumentDirty();
    syncSelectedTrack("");
    const suffix = clearedTrackCount === 1 ? "track" : "tracks";
    svgImportStatus = `Cleared ${clearedTrackCount} timeline ${suffix} from ${svgSourceLabel}.`;
  };

  const setTrackTarget = (trackId: string, event: Event): void => {
    const input = event.currentTarget as HTMLSelectElement;
    const targetId = input.value;
    tracks = tracks.map((track) => (track.id === trackId ? { ...track, targetId } : track));
    markDocumentDirty();
    if (selectedTrackId === trackId) {
      selectTarget(targetId);
    }
  };

  const setTrackProperty = (trackId: string, event: Event): void => {
    const input = event.currentTarget as HTMLSelectElement;
    const property = input.value as AnimationProperty;
    tracks = tracks.map((track) =>
      track.id === trackId
        ? { ...track, property, keyframes: track.keyframes.map((keyframe) => ({ ...keyframe, value: defaultValueFor(property) })) }
        : track,
    );
    markDocumentDirty();
  };

  const resetTrackValues = (trackId: string): void => {
    tracks = tracks.map((track) =>
      track.id === trackId
        ? { ...track, keyframes: track.keyframes.map((keyframe) => ({ ...keyframe, value: defaultValueFor(track.property) })) }
        : track,
    );
    markDocumentDirty();
  };

  const toggleTrackMute = (trackId: string): void => {
    tracks = tracks.map((track) => (track.id === trackId ? { ...track, muted: !track.muted } : track));
    markDocumentDirty();
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
    const track = tracks.find((candidate) => candidate.id === trackId);
    if (!track) {
      return null;
    }
    const existingFrame = track.keyframes.find((candidate) => candidate.time === snapped);
    const newFrame: Keyframe = {
      id: existingFrame?.id ?? makeKeyframeId(),
      time: snapped,
      value: value ?? defaultValueFor(track.property),
      easing: "linear",
    };
    if (runEditorCommand(new AddKeyframeCommand(trackId, newFrame), true)) {
      createdId = newFrame.id;
    }
    return createdId;
  };

  const addKeyframeFromLane = (trackId: string, event: MouseEvent): void => {
    const clicked = event.currentTarget as HTMLDivElement;
    const rect = clicked.getBoundingClientRect();
    const local = pointerTimeFromRect(rect, event);
    const created = addKeyframeAtTimeForTrack(trackId, local);
    syncSelectedTrack(trackId, created ?? "");
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
    runEditorCommand(new DeleteKeyframeCommand(trackId, keyframeId), true);
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
      syncSelectedTrack(track.id, created);
      movePlayheadToTrack(duplicatedTime);
    }
    return created;
  };

  const selectTrack = (trackId: string): void => {
    syncSelectedTrack(trackId);
  };

  const selectKeyframe = (trackId: string, keyframeId: string, time: number): void => {
    syncSelectedTrack(trackId, keyframeId);
    currentTime = applySnap(clampMs(time));
  };

  const updateKeyframeTime = (trackId: string, keyframeId: string, event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    setKeyframeTime(trackId, keyframeId, Number(input.value));
  };

  const setKeyframeTime = (trackId: string, keyframeId: string, value: number, recordHistory = true): void => {
    const snapped = applySnap(clampMs(value));
    runEditorCommand(new MoveKeyframeCommand(trackId, keyframeId, snapped), recordHistory, true);
  };

  const moveKeyframeByKeyboard = (
    trackId: string,
    keyframeId: string,
    currentKeyframeTime: number,
    event: KeyboardEvent,
  ): boolean => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return false;
    }
    event.preventDefault();
    const direction = event.key === "ArrowLeft" ? -1 : 1;
    const multiplier = event.shiftKey ? 10 : 1;
    const nextTime = applySnap(clampMs(currentKeyframeTime + direction * keyboardStepMs() * multiplier));
    setKeyframeTime(trackId, keyframeId, nextTime);
    syncSelectedTrack(trackId, keyframeId);
    currentTime = nextTime;
    return true;
  };

  const timelineKeyframeButtonsForTrack = (trackId: string): HTMLElement[] => {
    const nodes = Array.from(document.querySelectorAll("[data-tadpole-keyframe-track-id][data-keyframe-id]"));
    return nodes.filter(
      (node): node is HTMLElement =>
        node instanceof HTMLElement && node.getAttribute("data-tadpole-keyframe-track-id") === trackId,
    );
  };

  const timelineTrackLaneFor = (trackId: string): HTMLElement | null => {
    const lanes = Array.from(document.querySelectorAll("[data-tadpole-track-lane]"));
    return (
      lanes.find(
        (node): node is HTMLElement => node instanceof HTMLElement && node.getAttribute("data-tadpole-track-lane") === trackId,
      ) ?? null
    );
  };

  const nextKeyframeFocusIdAfterRemoval = (trackId: string, keyframeId: string): string => {
    const buttons = timelineKeyframeButtonsForTrack(trackId);
    const currentIndex = buttons.findIndex((button) => button.getAttribute("data-keyframe-id") === keyframeId);
    if (currentIndex === -1) {
      return "";
    }
    return (
      buttons[currentIndex + 1]?.getAttribute("data-keyframe-id") ??
      buttons[currentIndex - 1]?.getAttribute("data-keyframe-id") ??
      ""
    );
  };

  const focusKeyframeOrTrackLane = (trackId: string, keyframeId: string): void => {
    const keyframeTarget = keyframeId
      ? timelineKeyframeButtonsForTrack(trackId).find((button) => button.getAttribute("data-keyframe-id") === keyframeId)
      : null;
    const focusTarget = keyframeTarget ?? timelineTrackLaneFor(trackId);
    focusTarget?.focus();
  };

  const handleKeyframeKeyboard = (
    trackId: string,
    keyframeId: string,
    currentKeyframeTime: number,
    event: KeyboardEvent,
  ): void => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      selectKeyframe(trackId, keyframeId, currentKeyframeTime);
      return;
    }
    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      event.stopPropagation();
      const nextFocusKeyframeId = nextKeyframeFocusIdAfterRemoval(trackId, keyframeId);
      removeKeyframe(trackId, keyframeId);
      selectedKeyframeId = nextFocusKeyframeId;
      void nextDomUpdate().then(() => focusKeyframeOrTrackLane(trackId, nextFocusKeyframeId));
      return;
    }
    if (moveKeyframeByKeyboard(trackId, keyframeId, currentKeyframeTime, event)) {
      event.stopPropagation();
    }
  };

  const startKeyframeDrag = (trackId: string, event: MouseEvent): void => {
    const marker = event.currentTarget as HTMLButtonElement;
    const keyframeId = marker.dataset.keyframeId;
    const lane = marker.closest(".track-lane") as HTMLDivElement | null;
    if (!keyframeId || !lane || event.button !== 0) {
      return;
    }
    const keyframeTrack = tracks.find((track) => track.id === trackId);
    const keyframe = keyframeTrack?.keyframes.find((candidate) => candidate.id === keyframeId);
    if (!keyframe) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    draggingKeyframe = { trackId, keyframeId, lane, startTime: keyframe.time, startSnapshot: editorCommandSnapshot() };
    syncSelectedTrack(trackId, keyframeId);
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
    setKeyframeTime(draggingKeyframe.trackId, draggingKeyframe.keyframeId, computedTime, false);
  };

  const stopKeyframeDrag = (): void => {
    if (!draggingKeyframe) {
      return;
    }
    const drag = draggingKeyframe;
    draggingKeyframe = null;
    window.removeEventListener("mousemove", onKeyframeDragMove);
    window.removeEventListener("mouseup", stopKeyframeDrag);
    const keyframeTrack = tracks.find((track) => track.id === drag.trackId);
    const keyframe = keyframeTrack?.keyframes.find((candidate) => candidate.id === drag.keyframeId);
    if (!keyframe || keyframe.time === drag.startTime) {
      return;
    }
    const after = editorCommandSnapshot();
    editorCommandHistory = editorCommandHistory.record(new EditorHistoryEntry("keyframe.move", drag.startSnapshot, after));
    editorLastCommandId = "keyframe.move";
    editorCommandStatus = "Command keyframe.move applied.";
  };

  const normalizedKeyframeValueInput = (trackId: string, value: string): string | null => {
    const keyframeTrack = tracks.find((track) => track.id === trackId);
    if (!keyframeTrack) {
      return null;
    }
    return normalizeProjectKeyframeValue(keyframeTrack.property, value);
  };

  const applyKeyframeValueInput = (trackId: string, keyframeId: string, value: string): boolean => {
    const nextValue = normalizedKeyframeValueInput(trackId, value);
    if (nextValue === null) {
      return false;
    }
    return runEditorCommand(new SetKeyframeValueCommand(trackId, keyframeId, nextValue), true);
  };

  const updateKeyframeValue = (trackId: string, keyframeId: string, event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    applyKeyframeValueInput(trackId, keyframeId, input.value);
  };

  const updateInspectorKeyframeTime = (trackId: string, keyframeId: string, event: Event): void => {
    clearInspectorValidation();
    updateKeyframeTime(trackId, keyframeId, event);
  };

  const updateInspectorKeyframeValue = (trackId: string, keyframeId: string, event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    const keyframeTrack = tracks.find((track) => track.id === trackId);
    if (!keyframeTrack) {
      inspectorValidationMessage = "Invalid keyframe target.";
      return;
    }
    const nextValue = normalizedKeyframeValueInput(trackId, input.value);
    if (nextValue === null) {
      inspectorValidationMessage = `Invalid ${keyframeTrack.property} value.`;
      return;
    }
    runEditorCommand(new SetKeyframeValueCommand(trackId, keyframeId, nextValue), true);
    clearInspectorValidation();
  };

  const updateInspectorKeyframeEasing = (trackId: string, keyframeId: string, event: Event): void => {
    clearInspectorValidation();
    updateKeyframeEasing(trackId, keyframeId, event);
  };

  const updateKeyframeEasing = (trackId: string, keyframeId: string, event: Event): void => {
    const input = event.currentTarget as HTMLSelectElement;
    if (!isKeyframeEasing(input.value)) {
      return;
    }
    runEditorCommand(new SetKeyframeEasingCommand(trackId, keyframeId, input.value), true);
  };

  const dropKeyframeAtPlayhead = (): void => {
    const created = addKeyframeAtTimeForSelected(currentTime);
    selectedKeyframeId = created ?? "";
  };

</script>

<main class="shell editor-shell" data-tadpole-editor-shell>
  <header class="editor-menubar" data-tadpole-menubar>
    <div class="editor-brand">
      <span class="brand-mark" aria-hidden="true">T</span>
      <div>
        <p class="eyebrow">{softwareBase}</p>
        <h1>Tadpole</h1>
      </div>
    </div>

    <nav class="menu-actions" aria-label="Editor menu">
      <div class="menu-group">
        <button
          type="button"
          class="menu-root"
          class:is-active={openMenu === "file"}
          data-tadpole-menu-button="file"
          aria-haspopup="menu"
          aria-expanded={openMenu === "file"}
          on:click={() => toggleMenu("file")}
          on:keydown={(event) => handleMenuButtonKeydown(event, "file")}
        >
          File
        </button>
        {#if openMenu === "file"}
          <div class="menu-popover" role="menu" data-tadpole-menu="file" aria-label="File menu">
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="file.openSvg"
              on:click={() => openEditorDialog("open-svg", "file")}
              on:keydown={(event) => handleMenuItemKeydown(event, "file")}
            >
              Open SVG...
            </button>
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="file.pasteSvg"
              on:click={() => openEditorDialog("paste-svg", "file")}
              on:keydown={(event) => handleMenuItemKeydown(event, "file")}
            >
              Paste SVG...
            </button>
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="file.saveSvg"
              on:click={() => openEditorDialog("save-svg", "file")}
              on:keydown={(event) => handleMenuItemKeydown(event, "file")}
            >
              Save SVG
            </button>
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="file.saveSvgAs"
              on:click={() => openEditorDialog("save-svg", "file")}
              on:keydown={(event) => handleMenuItemKeydown(event, "file")}
            >
              Save SVG As...
            </button>
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="file.revertSvg"
              on:click={runFileRevertCommand}
              on:keydown={(event) => handleMenuItemKeydown(event, "file")}
            >
              Revert to Sample SVG
            </button>
          </div>
        {/if}
      </div>

      <div class="menu-group">
        <button
          type="button"
          class="menu-root"
          class:is-active={openMenu === "edit"}
          data-tadpole-menu-button="edit"
          aria-haspopup="menu"
          aria-expanded={openMenu === "edit"}
          on:click={() => toggleMenu("edit")}
          on:keydown={(event) => handleMenuButtonKeydown(event, "edit")}
        >
          Edit
        </button>
        {#if openMenu === "edit"}
          <div class="menu-popover" role="menu" data-tadpole-menu="edit" aria-label="Edit menu">
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="edit.undo"
              data-tadpole-disabled={canUndoEditorCommand ? "false" : "true"}
              disabled={!canUndoEditorCommand}
              on:click={() => {
                undoEditorCommand();
                closeMenus();
              }}
              on:keydown={(event) => handleMenuItemKeydown(event, "edit")}
            >
              Undo
            </button>
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="edit.redo"
              data-tadpole-disabled={canRedoEditorCommand ? "false" : "true"}
              disabled={!canRedoEditorCommand}
              on:click={() => {
                redoEditorCommand();
                closeMenus();
              }}
              on:keydown={(event) => handleMenuItemKeydown(event, "edit")}
            >
              Redo
            </button>
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="edit.copyProjectJson"
              on:click={() => {
                void copyExport();
                closeMenus();
              }}
              on:keydown={(event) => handleMenuItemKeydown(event, "edit")}
            >
              Copy Project JSON
            </button>
          </div>
        {/if}
      </div>

      <div class="menu-group">
        <button
          type="button"
          class="menu-root"
          class:is-active={openMenu === "view"}
          data-tadpole-menu-button="view"
          aria-haspopup="menu"
          aria-expanded={openMenu === "view"}
          on:click={() => toggleMenu("view")}
          on:keydown={(event) => handleMenuButtonKeydown(event, "view")}
        >
          View
        </button>
        {#if openMenu === "view"}
          <div class="menu-popover" role="menu" data-tadpole-menu="view" aria-label="View menu">
            <button
              type="button"
              role="menuitemcheckbox"
              data-tadpole-command="view.showSource"
              aria-label="Open SVG source panel"
              aria-checked={activePanel === "source" && drawerOpen}
              on:click={() => runViewCommand("source")}
              on:keydown={(event) => handleMenuItemKeydown(event, "view")}
            >
              Source Panel
            </button>
            <button
              type="button"
              role="menuitemcheckbox"
              data-tadpole-command="view.showWarnings"
              aria-checked={activePanel === "warnings" && drawerOpen}
              on:click={() => runViewCommand("warnings")}
              on:keydown={(event) => handleMenuItemKeydown(event, "view")}
            >
              Warnings Panel
            </button>
            <button
              type="button"
              role="menuitemcheckbox"
              data-tadpole-command="view.showLayers"
              aria-label="Open layers panel"
              aria-checked={activePanel === "layers" && drawerOpen}
              on:click={() => runViewCommand("layers")}
              on:keydown={(event) => handleMenuItemKeydown(event, "view")}
            >
              Layers Panel
            </button>
            <button
              type="button"
              role="menuitemcheckbox"
              data-tadpole-command="view.showInspector"
              aria-label="Open inspector panel"
              aria-checked={activePanel === "inspector" && drawerOpen}
              on:click={() => runViewCommand("inspector")}
              on:keydown={(event) => handleMenuItemKeydown(event, "view")}
            >
              Inspector Panel
            </button>
            <button
              type="button"
              role="menuitemcheckbox"
              data-tadpole-command="view.showExport"
              aria-label="Open export panel"
              aria-checked={activePanel === "export" && drawerOpen}
              on:click={() => runViewCommand("export")}
              on:keydown={(event) => handleMenuItemKeydown(event, "view")}
            >
              Export Panel
            </button>
            <button
              type="button"
              role="menuitemcheckbox"
              data-tadpole-command="view.showDebug"
              aria-checked={activePanel === "debug" && drawerOpen}
              on:click={() => runViewCommand("debug")}
              on:keydown={(event) => handleMenuItemKeydown(event, "view")}
            >
              Debug Panel
            </button>
            <button
              type="button"
              role="menuitemcheckbox"
              data-tadpole-command="view.showTargets"
              aria-label="Open targets panel"
              aria-checked={activePanel === "targets" && drawerOpen}
              on:click={() => runViewCommand("targets")}
              on:keydown={(event) => handleMenuItemKeydown(event, "view")}
            >
              Target Library
            </button>
            <button
              type="button"
              role="menuitemcheckbox"
              data-tadpole-command="view.showPalette"
              aria-label="Open palette panel"
              aria-checked={activePanel === "palette" && drawerOpen}
              on:click={() => runViewCommand("palette")}
              on:keydown={(event) => handleMenuItemKeydown(event, "view")}
            >
              Palette
            </button>
            <button
              type="button"
              role="menuitemcheckbox"
              data-tadpole-command="view.showWorkspace"
              aria-label="Open workspace panel"
              aria-checked={activePanel === "workspace" && drawerOpen}
              on:click={() => runViewCommand("workspace")}
              on:keydown={(event) => handleMenuItemKeydown(event, "view")}
            >
              Workspace
            </button>
            <button
              type="button"
              role="menuitemcheckbox"
              data-tadpole-command="view.showFonts"
              aria-label="Open fonts panel"
              aria-checked={activePanel === "fonts" && drawerOpen}
              on:click={() => runViewCommand("fonts")}
              on:keydown={(event) => handleMenuItemKeydown(event, "view")}
            >
              Fonts
            </button>
          </div>
        {/if}
      </div>

      <div class="menu-group">
        <button
          type="button"
          class="menu-root"
          class:is-active={openMenu === "timeline"}
          data-tadpole-menu-button="timeline"
          aria-haspopup="menu"
          aria-expanded={openMenu === "timeline"}
          on:click={() => toggleMenu("timeline")}
          on:keydown={(event) => handleMenuButtonKeydown(event, "timeline")}
        >
          Timeline
        </button>
        {#if openMenu === "timeline"}
          <div class="menu-popover" role="menu" data-tadpole-menu="timeline" aria-label="Timeline menu">
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="timeline.playPause"
              on:click={() => {
                togglePlay();
                closeMenus();
              }}
              on:keydown={(event) => handleMenuItemKeydown(event, "timeline")}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="timeline.stop"
              on:click={() => {
                stopTimeline();
                closeMenus();
              }}
              on:keydown={(event) => handleMenuItemKeydown(event, "timeline")}
            >
              Stop
            </button>
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="timeline.previousKeyframe"
              disabled={!selectedTrackHasKeyframes}
              on:click={() => {
                jumpToPreviousKeyframe();
                closeMenus();
              }}
              on:keydown={(event) => handleMenuItemKeydown(event, "timeline")}
            >
              Previous Keyframe
            </button>
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="timeline.nextKeyframe"
              disabled={!selectedTrackHasKeyframes}
              on:click={() => {
                jumpToNextKeyframe();
                closeMenus();
              }}
              on:keydown={(event) => handleMenuItemKeydown(event, "timeline")}
            >
              Next Keyframe
            </button>
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="timeline.toggleLoop"
              on:click={() => {
                toggleLoop();
                closeMenus();
              }}
              on:keydown={(event) => handleMenuItemKeydown(event, "timeline")}
            >
              Toggle Full Loop
            </button>
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="timeline.dropKeyframe"
              disabled={selectedTrackId === ""}
              on:click={() => {
                addKeyframeAtCurrentForSelected();
                closeMenus();
              }}
              on:keydown={(event) => handleMenuItemKeydown(event, "timeline")}
            >
              Drop Keyframe at Playhead
            </button>
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="timeline.setInPoint"
              on:click={() => {
                setWorkAreaInPoint();
                closeMenus();
              }}
              on:keydown={(event) => handleMenuItemKeydown(event, "timeline")}
            >
              Set Work Area In
            </button>
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="timeline.setOutPoint"
              on:click={() => {
                setWorkAreaOutPoint();
                closeMenus();
              }}
              on:keydown={(event) => handleMenuItemKeydown(event, "timeline")}
            >
              Set Work Area Out
            </button>
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="timeline.clearWorkArea"
              on:click={() => {
                clearWorkArea();
                closeMenus();
              }}
              on:keydown={(event) => handleMenuItemKeydown(event, "timeline")}
            >
              Clear Work Area
            </button>
            <button
              type="button"
              role="menuitemcheckbox"
              data-tadpole-command="timeline.toggleWorkAreaLoop"
              aria-checked={loopWorkArea}
              on:click={() => {
                toggleLoopWorkArea();
                closeMenus();
              }}
              on:keydown={(event) => handleMenuItemKeydown(event, "timeline")}
            >
              Loop Work Area
            </button>
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="timeline.toggleFramesSeconds"
              on:click={() => {
                toggleTimeDisplayMode();
                closeMenus();
              }}
              on:keydown={(event) => handleMenuItemKeydown(event, "timeline")}
            >
              Toggle Seconds/Frames
            </button>
          </div>
        {/if}
      </div>

      <div class="menu-group">
        <button
          type="button"
          class="menu-root"
          class:is-active={openMenu === "export"}
          data-tadpole-menu-button="export"
          aria-haspopup="menu"
          aria-expanded={openMenu === "export"}
          on:click={() => toggleMenu("export")}
          on:keydown={(event) => handleMenuButtonKeydown(event, "export")}
        >
          Export
        </button>
        {#if openMenu === "export"}
          <div class="menu-popover" role="menu" data-tadpole-menu="export" aria-label="Export menu">
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="export.runnableHtml"
              on:click={() => openEditorDialog("export-runnable", "export")}
              on:keydown={(event) => handleMenuItemKeydown(event, "export")}
            >
              Runnable HTML...
            </button>
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="export.projectJson"
              on:click={() => togglePanelCommand("export", '[data-tadpole-menu-button="export"]')}
              on:keydown={(event) => handleMenuItemKeydown(event, "export")}
            >
              Project JSON Panel
            </button>
          </div>
        {/if}
      </div>

      <div class="menu-group">
        <button
          type="button"
          class="menu-root"
          class:is-active={openMenu === "help"}
          data-tadpole-menu-button="help"
          aria-haspopup="menu"
          aria-expanded={openMenu === "help"}
          on:click={() => toggleMenu("help")}
          on:keydown={(event) => handleMenuButtonKeydown(event, "help")}
        >
          Help
        </button>
        {#if openMenu === "help"}
          <div class="menu-popover align-end" role="menu" data-tadpole-menu="help" aria-label="Help menu">
            <button
              type="button"
              role="menuitem"
              data-tadpole-command="help.keyboardShortcuts"
              on:click={runHelpShortcutsCommand}
              on:keydown={(event) => handleMenuItemKeydown(event, "help")}
            >
              Keyboard Shortcuts
            </button>
          </div>
        {/if}
      </div>
    </nav>

    <div class="document-status" data-tadpole-document-status aria-live="polite">
      <span class="status-chip status-strong">Document: {svgSourceLabel}</span>
      <span class="status-chip" title={svgImportError || svgImportStatus}>Import: {documentImportStatusLabel}</span>
      <button
        type="button"
        class="status-chip status-button"
        data-tadpole-dirty-badge
        data-tadpole-dirty={documentDirty ? "true" : "false"}
        on:click={openDirtyStateFromBadge}
      >
        Dirty: {documentDirty ? "yes" : "no"}
      </button>
      <span class="status-chip">Targets: {availableTargets.length}</span>
      <span class="status-chip">Tracks: {tracks.length}</span>
      <span
        class="status-chip"
        data-tadpole-starter-suggestion-badge
        data-tadpole-starter-suggestion-count={starterTimelineSuggestions.length}
        data-tadpole-selected-starter-suggestion-count={starterTimelineSelectedCount}
        title={starterTimelineStatus}
      >
        Starter suggestions: {starterTimelineSuggestions.length}
      </span>
      <span
        class="status-chip"
        data-tadpole-command-history
        data-tadpole-can-undo={canUndoEditorCommand ? "true" : "false"}
        data-tadpole-can-redo={canRedoEditorCommand ? "true" : "false"}
        data-tadpole-undo-count={editorCommandHistory.undoStack.length}
        data-tadpole-redo-count={editorCommandHistory.redoStack.length}
        data-tadpole-last-command={editorLastCommandId}
        title={editorCommandStatus}
      >
        History: {editorCommandHistory.undoStack.length}/{editorCommandHistory.redoStack.length}
      </span>
      <button
        type="button"
        class="status-chip status-button"
        class:status-warning={documentWarningCount > 0}
        data-tadpole-warning-badge
        data-tadpole-warning-count={documentWarningCount}
        aria-label={`Warnings: ${documentWarningCount}. Open warnings panel.`}
        aria-keyshortcuts="Enter Space"
        on:click={openWarningsFromBadge}
      >
        Warnings: {documentWarningCount}
      </button>
      <span class="status-chip">Playhead: {playheadLabel}</span>
    </div>
  </header>

  {#if activeDialog !== null}
    <div class="dialog-backdrop">
      <div
        class="document-dialog"
        role="dialog"
        tabindex="-1"
        aria-modal="true"
        aria-labelledby={`dialog-title-${activeDialog}`}
        data-tadpole-active-dialog
        data-tadpole-dialog={activeDialog}
        on:keydown={handleDialogKeydown}
      >
        <div class="dialog-heading">
          <div>
            {#if activeDialog === "open-svg"}
              <p class="eyebrow">File</p>
              <h2 id="dialog-title-open-svg">Open SVG</h2>
            {:else if activeDialog === "paste-svg"}
              <p class="eyebrow">File</p>
              <h2 id="dialog-title-paste-svg">Paste SVG</h2>
            {:else if activeDialog === "save-svg"}
              <p class="eyebrow">File</p>
              <h2 id="dialog-title-save-svg">Save SVG</h2>
            {:else}
              <p class="eyebrow">Export</p>
              <h2 id="dialog-title-export-runnable">Export Runnable HTML</h2>
            {/if}
          </div>
          <button type="button" class="dialog-close" on:click={closeEditorDialog} aria-label="Close dialog">Close</button>
        </div>

        {#if activeDialog === "open-svg"}
          <div class="dialog-body">
            <p class="muted">Open an SVG file through the same parser and sanitizer used by the source panel.</p>
            <label class="inline-label compact">
              <span>SVG file</span>
              <input type="file" accept=".svg,image/svg+xml" on:change={importSvgFileAndClose} />
            </label>
            {#if svgImportError}
              <p class="error tiny" aria-live="assertive">{svgImportError}</p>
            {:else}
              <p class="muted tiny" aria-live="polite">{svgImportStatus}</p>
            {/if}
          </div>
        {:else if activeDialog === "paste-svg"}
          <div class="dialog-body">
            <p class="muted">Paste raw SVG markup. Scripts, external references, and unsupported animation nodes stay behind the import boundary.</p>
            <label class="inline-label compact">
              <span>SVG markup</span>
              <textarea rows="9" spellcheck="false" bind:value={svgDraftSource}></textarea>
            </label>
            <div class="dialog-actions">
              <button type="button" on:click={importSvgDraftAndClose} disabled={svgDraftSource.trim() === ""}>
                Import Pasted SVG
              </button>
              <button type="button" on:click={closeEditorDialog}>Cancel</button>
            </div>
            {#if svgImportError}
              <p class="error tiny" aria-live="assertive">{svgImportError}</p>
            {:else}
              <p class="muted tiny" aria-live="polite">{svgImportStatus}</p>
            {/if}
          </div>
        {:else if activeDialog === "save-svg"}
          <div
            class="dialog-body"
            data-tadpole-svg-save-state={svgNativeSaveResult.ok ? "ready" : "blocked"}
            data-tadpole-svg-save-warning-count={svgNativeSaveWarnings.length}
            data-tadpole-svg-save-blocking-count={svgNativeSaveResult.blockingWarningCount()}
            data-tadpole-svg-save-track-count={svgNativeSaveResult.serializedTrackCount}
          >
            <p class="muted">
              Save the current editable timeline back into one SVG file with standard SVG animation nodes.
            </p>
            <div class="svg-source-summary">
              <span class="status-chip">Document: {svgSourceLabel}</span>
              <span class="status-chip">Dirty: {documentDirty ? "yes" : "no"}</span>
              <span class="status-chip">Tracks: {tracks.length}</span>
              <span class="status-chip">Serialized: {svgNativeSaveResult.serializedTrackCount}</span>
              <span class="status-chip">File: {svgNativeSaveFile}</span>
            </div>
            <div class="dialog-actions">
              <button type="button" data-tadpole-command="file.copySvg" on:click={copyNativeSvg} disabled={!svgNativeSaveResult.ok}>
                Copy SVG
              </button>
              <button type="button" data-tadpole-command="file.downloadSvg" on:click={downloadNativeSvg} disabled={!svgNativeSaveResult.ok}>
                Download SVG
              </button>
              <button type="button" on:click={closeEditorDialog}>Close</button>
            </div>
            <p class={svgNativeSaveResult.ok ? "muted tiny" : "error tiny"} aria-live={svgNativeSaveResult.ok ? "polite" : "assertive"}>
              {#if svgNativeSaveStatus}
                {svgNativeSaveStatus}
              {:else if svgNativeSaveResult.ok}
                SVG-native save ready with {svgNativeSaveResult.serializedTrackCount} serialized tracks.
              {:else}
                SVG-native save blocked by {svgNativeSaveResult.blockingWarningCount()} serializer warnings.
              {/if}
            </p>
            {#if svgNativeSaveWarnings.length > 0}
              <div class="warning tiny" data-tadpole-svg-save-warnings aria-live="polite">
                <strong>SVG-native save warnings</strong>
                <ul>
                  {#each svgNativeSaveWarnings as warning}
                    <li data-tadpole-svg-save-warning={warning.code} data-tadpole-svg-save-warning-severity={warning.severity}>
                      {warning.message}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
            {#if svgNativeSaveResult.ok}
              <pre class="dialog-code" data-tadpole-svg-save-output>{svgNativeSaveResult.svgText}</pre>
            {/if}
          </div>
        {:else}
          <div class="dialog-body">
            <p class="muted">
              Export a self-contained HTML file with the sanitized SVG and {runnableExportTrackCount} active tracks.
            </p>
            <div class="dialog-actions">
              <button type="button" on:click={copyRunnableExport}>Copy Runnable HTML</button>
              <button type="button" on:click={downloadRunnableExport}>Download Runnable HTML</button>
              <button type="button" on:click={closeEditorDialog}>Close</button>
            </div>
            <p class="muted tiny" aria-live="polite">
              {runnableExportStatus || `${runnableExportVersion} ready as ${runnableExportFile}.`}
            </p>
            <pre class="dialog-code" data-tadpole-runnable-dialog-output>{runnableExportHtml}</pre>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <section
    class="editor-layout"
    class:dock-right={panelDockRegion === "right"}
    data-tadpole-dock-layout
    data-tadpole-dock-mode={dockLayoutMode}
    data-tadpole-active-dock-region={panelDockRegion}
    data-tadpole-left-dock-open={drawerOpen && activePanel !== "none" && panelDockRegion === "left" ? "true" : "false"}
    data-tadpole-right-dock-open={drawerOpen && activePanel !== "none" && panelDockRegion === "right" ? "true" : "false"}
    data-tadpole-center-pane="canvas"
    data-tadpole-bottom-dock="timeline"
    data-tadpole-timeline-dock-state={timelineDockState}
    style={`--tadpole-drawer-width:${layoutColumnWidth};`}
  >
    <aside
      class="drawer panel-host"
      class:drawer-collapsed={!drawerOpen}
      data-tadpole-panel-host
      data-tadpole-dock-panel="context"
      data-tadpole-dock-region={panelDockRegion}
      data-tadpole-active-panel={panelHostActivePanelId}
      data-tadpole-panel-open={drawerOpen && activePanel !== "none" ? "true" : "false"}
      data-tadpole-open-panel-ids={panelHostOpenPanelIds}
      data-tadpole-warning-count={documentWarningCount}
      data-tadpole-dirty={documentDirty ? "true" : "false"}
      role={panelHostUsesDialog ? "dialog" : "region"}
      aria-modal={panelHostUsesDialog ? "true" : undefined}
      aria-labelledby={panelHostUsesDialog ? "active-panel-title" : undefined}
      aria-label="Editor panels"
      on:keydown={handlePanelHostKeydown}
    >
      <div class="drawer-toggle-wrap">
        <button
          type="button"
          class="drawer-toggle"
          data-tadpole-panel-toggle
          on:click={toggleDrawer}
          aria-expanded={drawerOpen}
          aria-label={drawerOpen ? `Collapse ${panelDockLabel.toLowerCase()} dock` : `Expand ${panelDockLabel.toLowerCase()} dock`}
        >
          {#if panelDockRegion === "left"}
            {drawerOpen ? "◂" : "▸"}
          {:else}
            {drawerOpen ? "▸" : "◂"}
          {/if}
        </button>
      </div>

      <div class="panel-state-ledger" data-tadpole-panel-state-ledger aria-hidden="true">
        {#each panelIds as panelId}
          <span
            data-tadpole-panel-id={panelId}
            data-tadpole-panel-open={drawerOpen && activePanel === panelId ? "true" : "false"}
            data-tadpole-panel-active={drawerOpen && activePanel === panelId ? "true" : "false"}
          ></span>
        {/each}
      </div>

      <div class="drawer-content" aria-hidden={!drawerOpen}>
        {#if drawerOpen && activePanel !== "none"}
          <div class="panel-host-heading" data-tadpole-panel-heading>
            <div>
              <p class="eyebrow">Panel</p>
              <h2 id="active-panel-title">{activePanelLabel}</h2>
            </div>
            <div class="dock-panel-actions" aria-label="Panel dock controls">
              <button
                type="button"
                data-tadpole-dock-panel-left
                data-tadpole-dock-active={panelDockRegion === "left" ? "true" : "false"}
                aria-pressed={panelDockRegion === "left"}
                on:click={() => setPanelDockRegion("left")}
              >
                Dock Left
              </button>
              <button
                type="button"
                data-tadpole-dock-panel-right
                data-tadpole-dock-active={panelDockRegion === "right" ? "true" : "false"}
                aria-pressed={panelDockRegion === "right"}
                on:click={() => setPanelDockRegion("right")}
              >
                Dock Right
              </button>
              <button type="button" data-tadpole-panel-close on:click={closePanel}>Close Panel</button>
            </div>
          </div>
        {/if}

        {#if activePanel === "none"}
          <section class="panel panel-host-empty" data-tadpole-panel-id="none" data-tadpole-panel-open="false">
            <p class="muted tiny">Use View, File, or Export menus to open secondary editor surfaces.</p>
          </section>
        {/if}

        {#if activePanel === "workspace"}
        <section class="panel panel-workspace-controls" data-tadpole-panel-id="workspace" data-tadpole-panel-open="true">
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
        {/if}

        {#if activePanel === "source"}
        <section class="panel panel-svg-source" data-tadpole-panel-id="source" data-tadpole-panel-open="true">
          <h2>SVG Source</h2>
          <div class="svg-source-summary">
            <span class="status-chip">{svgSourceLabel}</span>
            <span class="status-chip">{availableTargets.length} targets</span>
            <span class="status-chip">{tracks.length} tracks</span>
          </div>
          <label class="inline-label compact">
            <span>Upload</span>
            <input type="file" accept=".svg,image/svg+xml" on:change={importSvgFile} />
          </label>
          <label class="inline-label compact">
            <span>Raw SVG</span>
            <textarea rows="6" spellcheck="false" bind:value={svgDraftSource}></textarea>
          </label>
          {#if svgDraftSource.trim() === ""}
            <p class="empty-state tiny">Raw SVG is empty. Paste SVG markup or upload an SVG file before importing.</p>
          {/if}
          <div class="toolbar source-actions">
            <button type="button" on:click={importSvgDraft}>Import Paste</button>
            <button type="button" on:click={resetToSampleSvg}>Reset Sample</button>
            <button type="button" on:click={clearTracks} disabled={tracks.length === 0}>Clear Tracks</button>
          </div>
          {#if svgImportError}
            <p class="error tiny" aria-live="assertive">{svgImportError}</p>
          {:else}
            <p class="muted tiny" aria-live="polite">{svgImportStatus}</p>
          {/if}
          {#if !svgImportError && animationImportWarnings.length > 0}
            <div class="warning tiny animation-import-warnings" aria-live="polite" data-tadpole-animation-import-warnings>
              <strong>Animation import warnings</strong>
              <ul>
                {#each animationImportWarnings as warning}
                  <li>{warning}</li>
                {/each}
              </ul>
            </div>
          {/if}
        </section>
        {/if}

        {#if activePanel === "export"}
        <section class="panel export-block" data-tadpole-panel-id="export" data-tadpole-panel-open="true">
          <h2>Project Export</h2>
          <p class="muted">
            Save this JSON payload to preserve the SVG source, discovered targets, and timeline tracks.
          </p>
          <pre><code>{exportPayload}</code></pre>
          <h3>Runnable Animation Export</h3>
          <p class="muted">
            Export a self-contained HTML artifact with the sanitized SVG and {runnableExportTrackCount} active tracks.
          </p>
          <div class="toolbar source-actions">
            <button type="button" on:click={copyRunnableExport}>Copy Runnable HTML</button>
            <button type="button" on:click={downloadRunnableExport}>Download Runnable HTML</button>
          </div>
          <p class="muted tiny" aria-live="polite">
            {runnableExportStatus || `${runnableExportVersion} ready as ${runnableExportFile}.`}
          </p>
          <pre class="runnable-export-output" data-tadpole-runnable-output>{runnableExportHtml}</pre>
          <h3>Project JSON Import</h3>
          <label class="inline-label compact">
            <span>Upload Project</span>
            <input type="file" accept=".json,application/json" on:change={importProjectFile} />
          </label>
          <label class="inline-label compact">
            <span>Project JSON</span>
            <textarea rows="6" spellcheck="false" bind:value={projectDraftSource}></textarea>
          </label>
          <div class="toolbar source-actions">
            <button type="button" on:click={validateProjectDraft}>Validate Project JSON</button>
            <button type="button" on:click={restoreProjectDraft}>Restore Project</button>
            <button type="button" on:click={useCurrentProjectExport}>Use Current Export</button>
          </div>
          {#if projectImportError}
            <p class="error tiny" aria-live="assertive">{projectImportError}</p>
          {:else}
            <p class="muted tiny" aria-live="polite">{projectImportStatus}</p>
          {/if}
          {#if projectMissingTargetIds.length > 0}
            <p class="warning tiny" aria-live="polite">Missing target IDs: {projectMissingTargetIds.join(", ")}</p>
          {/if}
        </section>
        {/if}

        {#if activePanel === "warnings"}
        <section class="panel panel-warning-list" data-tadpole-warnings-panel data-tadpole-panel-id="warnings" data-tadpole-panel-open="true">
          <h2>Warnings</h2>
          <div class="svg-source-summary">
            <span class="status-chip">Warnings: {documentWarningCount}</span>
            <span class="status-chip">Import: {documentImportStatusLabel}</span>
          </div>
          {#if documentWarningCount === 0}
            <p class="empty-state tiny">No document warnings are currently active.</p>
          {/if}
          {#if inspectorWarnings.length > 0}
            <ul class="warning-row-list" aria-label="Document warnings">
              {#each inspectorWarnings as warning}
                <li>
                  <button
                    type="button"
                    class:selected={warning.id === selectedInspectorWarningId}
                    data-tadpole-warning-row={warning.id}
                    data-tadpole-warning-source={warning.source}
                    on:click={() => selectInspectorWarning(warning.id)}
                  >
                    <strong>{warning.source}</strong>
                    <span>{warning.message}</span>
                  </button>
                </li>
              {/each}
            </ul>
          {/if}
        </section>
        {/if}

        {#if activePanel === "layers"}
        <section
          class="panel panel-layers"
          data-tadpole-layers-panel
          data-tadpole-panel-id="layers"
          data-tadpole-panel-open="true"
          data-tadpole-layer-total-count={svgLayerRows.length}
          data-tadpole-layer-visible-count={visibleLayerRows.length}
          data-tadpole-multi-select-count={multiSelectedTargets.length}
          data-tadpole-multi-selected-target-ids={multiSelectedTargetIdList}
          data-tadpole-batch-created-count={lastBatchCreatedCount}
        >
          <h2>Layers</h2>
          <p class="muted">Browse SVG hierarchy, inspect target facts, and select targets without using the canvas.</p>
          <label class="inline-label compact">
            <span>Search layers</span>
            <input
              type="search"
              data-tadpole-layer-search
              placeholder="Filter by id, name, parent, or kind"
              value={layerSearchTerm}
              on:input={setLayerSearchTerm}
            />
          </label>
          <div class="svg-source-summary" aria-live="polite">
            <span class="status-chip">{visibleLayerRows.length} visible</span>
            <span class="status-chip">{svgLayerRows.length} total</span>
            <span class="status-chip">{selectedTarget ? `Selected #${selectedTarget.id}` : "No selected target"}</span>
            <span class="status-chip">Batch: {multiSelectedTargets.length}</span>
          </div>
          <div class="layer-batch-toolbar" aria-label="Layer batch editing">
            <label class="inline-label compact">
              <span>Batch property</span>
              <select
                value={batchTrackProperty}
                data-tadpole-batch-track-property
                on:change={setBatchTrackProperty}
              >
                {#each propertyCatalog as property}
                  <option value={property.id}>{property.label}</option>
                {/each}
              </select>
            </label>
            <button
              type="button"
              data-tadpole-batch-create-tracks
              on:click={createTracksForSelectedTargets}
              disabled={multiSelectedTargets.length === 0}
            >
              Create tracks for selected targets
            </button>
            <button
              type="button"
              data-tadpole-clear-multi-selection
              on:click={clearBatchTargetSelection}
              disabled={multiSelectedTargets.length === 0}
            >
              Clear
            </button>
          </div>
          {#if svgLayerRows.length === 0}
            <p class="empty-state tiny">No editable SVG targets found.</p>
          {:else if visibleLayerRows.length === 0}
            <p class="empty-state tiny">No layer rows match the current search.</p>
          {:else}
            <ul class="layer-list" role="tree" aria-label="SVG layer tree">
              {#each visibleLayerRows as layer}
                <li>
                  <div class="layer-row-shell">
                    <label class="layer-batch-toggle">
                      <input
                        type="checkbox"
                        checked={multiSelectedTargetIds.has(layer.row.targetId)}
                        data-tadpole-layer-batch-toggle={layer.row.targetId}
                        aria-label={`Include ${layer.row.label} in batch selection`}
                        on:change={(event) => setTargetBatchSelection(layer.row.targetId, event)}
                      />
                    </label>
                    <button
                      type="button"
                      class="layer-row"
                      class:selected={layer.selected}
                      data-tadpole-layer-row={layer.row.targetId}
                      data-tadpole-layer-parent-id={layer.row.parentTargetId}
                      data-tadpole-layer-label={layer.row.label}
                      data-tadpole-layer-kind={layer.row.kind}
                      data-tadpole-layer-depth={layer.row.depth}
                      data-tadpole-layer-track-count={layer.trackCount}
                      data-tadpole-layer-key-count={layer.keyframeCount}
                      data-tadpole-layer-warning-count={layer.warningCount}
                      data-tadpole-layer-selected={layer.selected ? "true" : "false"}
                      data-tadpole-layer-multi-selected={multiSelectedTargetIds.has(layer.row.targetId) ? "true" : "false"}
                      data-tadpole-layer-visible="true"
                      role="treeitem"
                      aria-level={layer.row.depth + 1}
                      aria-selected={layer.selected}
                      aria-label={`${layer.row.label}, ${layer.row.kind}, ${layer.trackCount} tracks, ${layer.warningCount} warnings`}
                      style={`--layer-depth:${layer.row.depth};`}
                      on:click={() => selectLayerTarget(layer.row.targetId)}
                    >
                      <span class="layer-row-main">
                        <span class="layer-row-disclosure" aria-hidden="true">▸</span>
                        <span class="layer-row-label">{layer.row.label}</span>
                        <code>#{layer.row.targetId}</code>
                      </span>
                      <span class="layer-row-facts">
                        <span class="chip">{layer.row.kind}</span>
                        <span class="chip">{layer.trackCount} tracks</span>
                        <span class="chip">{layer.keyframeCount} keys</span>
                        {#if layer.warningCount > 0}
                          <span class="chip warning">{layer.warningCount} warnings</span>
                        {/if}
                      </span>
                    </button>
                  </div>
                </li>
              {/each}
            </ul>
          {/if}
        </section>
        {/if}

        {#if activePanel === "inspector"}
        <section
          class="panel panel-command-inspector inspector-panel"
          data-tadpole-inspector-panel
          data-tadpole-panel-id="inspector"
          data-tadpole-panel-open="true"
          data-tadpole-inspector-mode={inspectorMode}
          data-tadpole-inspector-target-id={selectedTarget?.id ?? ""}
          data-tadpole-inspector-track-id={selectedTrack?.id ?? ""}
          data-tadpole-inspector-keyframe-id={selectedKeyframe?.id ?? ""}
          data-tadpole-inspector-warning-id={selectedInspectorWarning?.id ?? ""}
          data-tadpole-inspector-validation={inspectorValidationState}
          role="complementary"
          aria-label="Selection inspector"
        >
          <h2>Inspector</h2>
          <div class="svg-source-summary" aria-live="polite">
            <span class="status-chip">Mode: {inspectorMode}</span>
            <span class="status-chip">Warnings: {documentWarningCount}</span>
            <span class="status-chip">Dirty: {documentDirty ? "yes" : "no"}</span>
          </div>

          {#if inspectorMode === "warning" && selectedInspectorWarning}
            <div class="selected-target-summary" data-tadpole-inspector-warning-mode>
              <h3>{selectedInspectorWarning.source}</h3>
              <p class="warning tiny" data-tadpole-inspector-warning-message>{selectedInspectorWarning.message}</p>
              <div class="inspector-grid">
                <label class="inline-label compact">
                  <span>Warning ID</span>
                  <input value={selectedInspectorWarning.id} readonly />
                </label>
                <label class="inline-label compact">
                  <span>Source</span>
                  <input value={selectedInspectorWarning.source} readonly />
                </label>
              </div>
            </div>
          {:else if inspectorMode === "keyframe" && selectedTrack && selectedKeyframe}
            <div class="selected-target-summary" data-tadpole-inspector-keyframe-mode>
              <h3>Keyframe</h3>
              <p class="muted">
                Editing <strong>{selectedKeyframe.id}</strong> on
                {targetNameById.get(selectedTrack.targetId) ?? selectedTrack.targetId}:{selectedTrack.property}
              </p>
              <div class="track-keys mini">
                <label class="inline-label compact">
                  <span>Time</span>
                  <input
                    type="number"
                    min="0"
                    max={timelineDurationMs}
                    value={selectedKeyframe.time}
                    data-tadpole-inspector-keyframe-time
                    on:input={(event) => updateInspectorKeyframeTime(selectedTrack.id, selectedKeyframe.id, event)}
                  />
                </label>
                <label class="inline-label compact">
                  <span>Value</span>
                  <input
                    type={isNumericProperty(selectedTrack.property) ? "number" : "text"}
                    min={isNumericProperty(selectedTrack.property) ? `${propertySpec(selectedTrack.property).min ?? 0}` : undefined}
                    max={isNumericProperty(selectedTrack.property) ? `${propertySpec(selectedTrack.property).max ?? 0}` : undefined}
                    step={isNumericProperty(selectedTrack.property) ? `${propertySpec(selectedTrack.property).step ?? 1}` : undefined}
                    value={selectedKeyframe.value}
                    data-tadpole-inspector-keyframe-value
                    aria-invalid={inspectorValidationState === "invalid"}
                    aria-describedby={inspectorValidationState === "invalid" ? "inspector-keyframe-error" : undefined}
                    on:input={(event) => updateInspectorKeyframeValue(selectedTrack.id, selectedKeyframe.id, event)}
                  />
                </label>
                <label class="inline-label compact">
                  <span>Easing</span>
                  <select
                    value={selectedKeyframe.easing}
                    data-tadpole-inspector-keyframe-easing
                    on:change={(event) => updateInspectorKeyframeEasing(selectedTrack.id, selectedKeyframe.id, event)}
                  >
                    {#each easingModes as easing}
                      <option value={easing}>{easing}</option>
                    {/each}
                  </select>
                </label>
                <button type="button" on:click={() => removeKeyframe(selectedTrack.id, selectedKeyframe.id)}>Delete keyframe</button>
              </div>
              {#if inspectorValidationMessage}
                <p id="inspector-keyframe-error" class="error tiny" data-tadpole-inspector-error>
                  {inspectorValidationMessage}
                </p>
              {/if}
            </div>
          {:else if inspectorMode === "track" && selectedTrack}
            <div class="selected-target-summary" data-tadpole-inspector-track-mode>
              <h3>Track</h3>
              <div class="inspector-grid">
                <label class="inline-label compact">
                  <span>Track</span>
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
                <label class="inline-label compact">
                  <span>Keyframes</span>
                  <input value={selectedTrack.keyframes.length} readonly />
                </label>
              </div>
              <div class="inspector-actions">
                <button type="button" on:click={() => addKeyframeAtTimeForTrack(selectedTrack.id, currentTime)}>
                  Drop keyframe @ {formatMs(currentTime)}
                </button>
                <button type="button" on:click={duplicateSelectedKeyframe} disabled={selectedKeyframeId === ""}>
                  Duplicate selected keyframe
                </button>
                <button type="button" on:click={() => removeTrack(selectedTrack.id)} disabled={tracks.length <= 1}>
                  Delete track
                </button>
              </div>
            </div>
          {:else if inspectorMode === "target" && selectedTarget}
            <div class="selected-target-summary" data-tadpole-inspector-target-mode>
              <h3>Selected SVG Target</h3>
              <div class="inspector-grid">
                <label class="inline-label compact">
                  <span>Name</span>
                  <input value={selectedTarget.name} readonly />
                </label>
                <label class="inline-label compact">
                  <span>ID</span>
                  <input value={selectedTarget.id} readonly />
                </label>
                <label class="inline-label compact">
                  <span>Kind</span>
                  <input value={selectedTarget.kind} readonly />
                </label>
                <label class="inline-label compact">
                  <span>Tracks</span>
                  <input value={selectedTargetTracks.length} readonly />
                </label>
              </div>
              {#if selectedTargetTracks.length === 0}
                <p class="empty-state tiny">
                  {selectedTarget.name} has no tracks yet. Create a track to animate this selected target.
                </p>
              {/if}
              <div class="toolbar quick-track-actions" aria-label={`Quick track actions for ${selectedTarget.name}`}>
                {#each quickTrackProperties as property}
                  <button type="button" on:click={() => addTrackForSelectedTarget(property.id)}>
                    Create {property.label} track for {selectedTarget.name}
                  </button>
                {/each}
              </div>
            </div>
          {:else}
            <div class="selected-target-summary" data-tadpole-inspector-document-mode>
              <h3>Document</h3>
              <p class="muted">No specific SVG target, track, keyframe, or warning is selected.</p>
              <div class="inspector-grid">
                <label class="inline-label compact">
                  <span>SVG</span>
                  <input value={svgSourceLabel} readonly />
                </label>
                <label class="inline-label compact">
                  <span>Targets</span>
                  <input value={availableTargets.length} readonly />
                </label>
                <label class="inline-label compact">
                  <span>Tracks</span>
                  <input value={tracks.length} readonly />
                </label>
                <label class="inline-label compact">
                  <span>Duration</span>
                  <input value={formatMs(timelineDurationMs)} readonly />
                </label>
              </div>
            </div>
          {/if}
        </section>
        {/if}

        {#if activePanel === "debug"}
        <section class="panel panel-debug" data-tadpole-debug-panel data-tadpole-panel-id="debug" data-tadpole-panel-open="true">
          <h2>Debug</h2>
          <p class="muted">Machine-readable runtime facts for witnesses and agents.</p>
          <pre><code>{JSON.stringify(
            {
              activePanel,
              activeDialog,
              documentDirty,
              documentWarningCount,
              targets: availableTargets.length,
              tracks: tracks.length,
              selectedTrackId,
            },
            null,
            2,
          )}</code></pre>
        </section>
        {/if}

        {#if activePanel === "palette"}
        <section class="panel" data-tadpole-panel-id="palette" data-tadpole-panel-open="true">
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
        {/if}

        {#if activePanel === "targets"}
        <section class="panel panel-target-library" data-tadpole-panel-id="targets" data-tadpole-panel-open="true">
        <h2>SVG Target Library</h2>
        <p class="muted">Pick a group/element target, then add its properties as tracks.</p>
        {#if availableTargets.length === 0}
          <p class="empty-state tiny">No editable SVG targets found. Add id attributes to SVG elements before animating them.</p>
        {:else}
          <div class="target-grid">
            {#each availableTargets as target}
              <button
                type="button"
                class="target-chip"
                class:is-active={target.id === selectedTargetId}
                aria-pressed={target.id === selectedTargetId}
                on:click={() => selectTarget(target.id, { syncTrack: true })}
              >
                <span class="target-name">{target.name}</span>
                <span class="target-kind">{target.kind}</span>
              </button>
            {/each}
          </div>
        {/if}
        </section>
        {/if}

        {#if activePanel === "fonts"}
        <section class="panel" data-tadpole-panel-id="fonts" data-tadpole-panel-open="true">
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
        {/if}
      </div>
    </aside>

    <button
      type="button"
      class="layout-resizer"
      aria-label={`Resize ${panelDockLabel.toLowerCase()} dock`}
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
            <span class="status-chip">SVG: {svgSourceLabel}</span>
            <span class="status-chip">Target: {selectedTrackName}</span>
            <span class="status-chip">Grid: {clampedGridCount}</span>
            <span class="status-chip">Snap: {snapToFrames ? "on" : "off"}</span>
            <span class="status-chip">Keyframe: {selectedKeyframe?.id ?? "none"}</span>
          </div>
        </div>
          <div class="toolbar" data-tadpole-playback-controls aria-label="Playback controls">
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
          <button type="button" on:click={copyExport}>Copy Project JSON {copiedExport ? `• ${copiedExport}` : ""}</button>
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
          <span>I / O: set work area in/out</span>
          <span>L: toggle work-area loop</span>
          <span>U: toggle seconds/frames</span>
          <span>M: Mute selected track</span>
          <span>Ctrl/Cmd + D: duplicate selected track</span>
          <span>H: toggle this panel</span>
        </div>
      {/if}
      <section
        class="panel panel-timeline"
        class:timeline-tracks-collapsed={!timelineTracksVisible}
        data-tadpole-bottom-timeline
        data-tadpole-timeline-tracks-visible={timelineTracksVisible ? "true" : "false"}
        data-tadpole-work-area-active={workAreaActive ? "true" : "false"}
        data-tadpole-work-area-in={workAreaInMs ?? ""}
        data-tadpole-work-area-out={workAreaOutMs ?? ""}
        data-tadpole-loop-work-area={loopWorkArea ? "true" : "false"}
        data-tadpole-time-display-mode={timeDisplayMode}
        data-tadpole-current-time-ms={currentTime}
        data-tadpole-duration-ms={timelineDurationMs}
        data-tadpole-current-time-display={currentTimeDisplay}
        aria-label="Animation timeline"
      >
        <div class="panel-heading">
          <div>
            <h2>Animation Timeline</h2>
            <p class="muted">Create and edit GSAP-like tracks. Click the ruler to scrub, click track lanes to add keyframes.</p>
          </div>
        </div>

        <div class="timeline-playback-compact" data-tadpole-playback-controls aria-label="Timeline playback controls">
          <button type="button" on:click={togglePlay}>{isPlaying ? "Pause" : "Play"}</button>
          <button type="button" on:click={stopTimeline}>Stop</button>
          <button type="button" on:click={toggleLoop} class:is-active={isLooping}>Loop {isLooping ? "ON" : "OFF"}</button>
          <button type="button" on:click={toggleLoopWorkArea} class:is-active={loopWorkArea}>
            Work Area {loopWorkArea ? "ON" : "OFF"}
          </button>
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
              <span>{formatMs(timelineDurationMs)} ({durationTimeDisplay})</span>
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
              <span>{formatMs(currentTime)} | {currentTimeDisplay}</span>
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
              <span data-tadpole-current-time-label>{currentTimeDisplay}</span>
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
          <div class="control-row work-area-controls" data-tadpole-work-area-controls aria-label="Work area controls">
            <div class="work-area-summary">
              <span class="status-chip" data-tadpole-work-area-label>Work Area: {workAreaLabel}</span>
              <span class="status-chip" data-tadpole-work-area-in-label>
                In: {formatWorkAreaPoint(workAreaInMs, timeDisplayMode, frameRate)}
              </span>
              <span class="status-chip" data-tadpole-work-area-out-label>
                Out: {formatWorkAreaPoint(workAreaOutMs, timeDisplayMode, frameRate)}
              </span>
            </div>
            <div class="preset-row">
              <button type="button" data-tadpole-command="timeline.setInPoint" on:click={setWorkAreaInPoint}>
                Set In @ {formatMs(currentTime)}
              </button>
              <button type="button" data-tadpole-command="timeline.setOutPoint" on:click={setWorkAreaOutPoint}>
                Set Out @ {formatMs(currentTime)}
              </button>
              <button type="button" data-tadpole-command="timeline.clearWorkArea" on:click={clearWorkArea}>
                Clear Work Area
              </button>
              <button
                type="button"
                data-tadpole-command="timeline.toggleWorkAreaLoop"
                class:is-active={loopWorkArea}
                aria-pressed={loopWorkArea}
                on:click={toggleLoopWorkArea}
              >
                Loop Work Area {loopWorkArea ? "ON" : "OFF"}
              </button>
              <button type="button" data-tadpole-command="timeline.toggleFramesSeconds" on:click={toggleTimeDisplayMode}>
                Time: {timeDisplayMode === "seconds" ? "Seconds" : "Frames"}
              </button>
            </div>
          </div>
        </div>

        <div class="timeline-stack-controls" data-tadpole-timeline-stack-controls>
          <span class="status-chip">Stacks: {timelineTargetRows.length}</span>
          <span class="status-chip">Visible tracks: {visibleTracks.length}</span>
          <button
            type="button"
            data-tadpole-timeline-track-visibility
            aria-pressed={!timelineTracksVisible}
            on:click={toggleTimelineTrackVisibility}
          >
            {timelineTracksVisible ? "Collapse timeline tracks" : "Expand timeline tracks"}
          </button>
          <button type="button" on:click={expandAllTimelineStacks} disabled={timelineTargetRows.length === 0}>
            Show timeline tracks
          </button>
          <button type="button" on:click={collapseAllTimelineStacks} disabled={timelineTargetRows.length === 0}>
            Hide timeline tracks
          </button>
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
            {#if workAreaActive}
              <span
                class="work-area-range"
                data-tadpole-work-area-range
                style={`left:${trackPercent(workAreaStartMs)}%; width:${spanWidthPercent(workAreaStartMs, workAreaEndMs)}%;`}
              ></span>
            {/if}
            {#if workAreaInMs !== null}
              <span
                class="work-area-marker work-area-marker-in"
                data-tadpole-work-area-marker="in"
                style={`left:${trackPercent(workAreaInMs)}%;`}
              >
                In {formatTimeDisplay(workAreaInMs, timeDisplayMode, frameRate)}
              </span>
            {/if}
            {#if workAreaOutMs !== null}
              <span
                class="work-area-marker work-area-marker-out"
                data-tadpole-work-area-marker="out"
                style={`left:${trackPercent(workAreaOutMs)}%;`}
              >
                Out {formatTimeDisplay(workAreaOutMs, timeDisplayMode, frameRate)}
              </span>
            {/if}
            <span class="scrubber" style={`left:${trackPercent(currentTime)}%;`}></span>
            <span class="scrubber-time" style={`left:${trackPercent(currentTime)}%;`}>{currentTimeDisplay}</span>
          </div>
        </button>

        <div class="track-scroll">
          <div class="track-list">
            {#if visibleTracks.length === 0}
              {#if starterTimelineSuggestions.length > 0}
                <section
                  class="starter-timeline-suggestions"
                  data-tadpole-starter-timeline-suggestions
                  data-tadpole-starter-origin="heuristic"
                  data-tadpole-starter-suggestion-count={starterTimelineSuggestions.length}
                  data-tadpole-selected-starter-suggestion-count={starterTimelineSelectedCount}
                  aria-label="Starter timeline suggestions"
                >
                  <div class="starter-suggestion-heading">
                    <div>
                      <h3>Starter timeline suggestions</h3>
                      <p class="muted tiny">
                        Deterministic suggestions from SVG ids, labels, kinds, hierarchy, and source order. They are not
                        imported animation truth.
                      </p>
                    </div>
                    <span class="status-chip">Selected: {starterTimelineSelectedCount}</span>
                  </div>
                  <div class="starter-suggestion-list">
                    {#each starterTimelineSuggestions as suggestion}
                      <section
                        class="starter-suggestion-row"
                        data-tadpole-starter-suggestion-id={suggestion.id}
                        data-tadpole-starter-target-id={suggestion.targetId}
                        data-tadpole-starter-property={suggestion.property}
                        data-tadpole-starter-reason={suggestion.reason}
                      >
                        <label class="starter-suggestion-toggle">
                          <input
                            type="checkbox"
                            data-tadpole-starter-suggestion-toggle
                            checked={isStarterTimelineSuggestionSelected(suggestion.id)}
                            on:change={(event) => toggleStarterTimelineSuggestion(suggestion.id, event)}
                          />
                          <span>
                            <strong>{suggestion.targetLabel}</strong>
                            <span class="muted tiny">#{suggestion.targetId} • {suggestion.propertyLabel}</span>
                          </span>
                        </label>
                        <p class="muted tiny">{suggestion.reason}</p>
                        <div class="starter-keyframes">
                          {#each suggestion.keyframes as keyframe, keyframeIndex}
                            <label class="inline-label compact">
                              <span>{formatMs(keyframe.time)}</span>
                              <input
                                value={keyframe.value}
                                data-tadpole-starter-keyframe-value={keyframeIndex}
                                aria-label={`${suggestion.targetLabel} ${suggestion.propertyLabel} starter keyframe at ${formatMs(
                                  keyframe.time,
                                )}`}
                                on:input={(event) =>
                                  updateStarterTimelineSuggestionValue(suggestion.id, keyframeIndex, event)}
                              />
                            </label>
                          {/each}
                        </div>
                      </section>
                    {/each}
                  </div>
                  <div class="starter-suggestion-actions">
                    <button
                      type="button"
                      data-tadpole-apply-starter-timeline
                      disabled={!starterTimelineCanApply}
                      on:click={applySelectedStarterTimelineSuggestions}
                    >
                      Apply selected starter tracks
                    </button>
                    <button type="button" data-tadpole-dismiss-starter-timeline on:click={dismissStarterTimelineSuggestions}>
                      Dismiss suggestions
                    </button>
                    <span class="muted tiny" aria-live="polite">{starterTimelineStatus}</span>
                  </div>
                </section>
              {:else if availableTargets.length === 0}
                <p class="empty-state tiny">Import an SVG with editable targets before creating timeline tracks.</p>
              {:else if tracks.length === 0}
                <p class="empty-state tiny">No timeline tracks yet. Select a target, then create a track to start animating.</p>
              {:else}
                <p class="muted tiny">No timeline tracks match the current filter or selected-track view.</p>
              {/if}
            {/if}
            {#each timelineTargetRows as targetRow (targetRow.targetId)}
              <section
                class="target-stack"
                class:collapsed={!targetRow.expanded}
                data-tadpole-target-row={targetRow.targetId}
                data-tadpole-target-row-expanded={targetRow.expanded ? "true" : "false"}
                data-tadpole-target-row-track-count={targetRow.trackCount}
                data-tadpole-target-row-key-count={targetRow.keyframeCount}
                aria-label={`${targetRow.targetLabel} target animation stack`}
              >
                <div class="target-stack-heading">
                  <button
                    type="button"
                    class="target-stack-toggle"
                    data-tadpole-target-stack-toggle={targetRow.targetId}
                    aria-expanded={targetRow.expanded}
                    on:click={() => toggleTimelineTargetStack(targetRow.targetId)}
                  >
                    <span class="target-stack-disclosure">{targetRow.expanded ? "▾" : "▸"}</span>
                    <span class="target-stack-title">{targetRow.targetLabel}</span>
                    <code>#{targetRow.targetId}</code>
                  </button>
                  <div class="target-stack-facts">
                    <span class="status-chip">{targetRow.targetKind}</span>
                    <span class="status-chip">{targetRow.trackCount} tracks</span>
                    <span class="status-chip">{targetRow.keyframeCount} keys</span>
                    {#if targetRow.warningCount > 0}
                      <span class="status-chip warning">{targetRow.warningCount} warnings</span>
                    {/if}
                  </div>
                </div>

                <div
                  class="target-summary-lane"
                  data-tadpole-target-summary-lane={targetRow.targetId}
                  data-tadpole-summary-key-count={targetRow.summaryKeyframes.length}
                  aria-label={`${targetRow.targetLabel} collapsed keyframe summary`}
                >
                  <span class={`track-line ${targetRow.mutedTrackCount === targetRow.trackCount ? "is-muted" : ""}`}></span>
                  {#each targetRow.summaryKeyframes as summaryKeyframe (summaryKeyframe.id)}
                    <button
                      type="button"
                      class="summary-key-dot"
                      data-tadpole-summary-keyframe={summaryKeyframe.keyframeId}
                      data-tadpole-summary-track={summaryKeyframe.trackId}
                      data-tadpole-summary-property={summaryKeyframe.property}
                      data-tadpole-summary-time={summaryKeyframe.time}
                      data-tadpole-summary-value={summaryKeyframe.value}
                      aria-label={`${targetRow.targetLabel} ${summaryKeyframe.property} keyframe at ${formatMs(
                        summaryKeyframe.time,
                      )} value ${summaryKeyframe.value}`}
                      style={`left:${trackPercent(summaryKeyframe.time)}%;`}
                      on:click={() => selectKeyframe(summaryKeyframe.trackId, summaryKeyframe.keyframeId, summaryKeyframe.time)}
                      title={`${summaryKeyframe.property} • ${summaryKeyframe.time}ms • ${summaryKeyframe.value}`}
                    >
                      {summaryKeyframe.property}
                    </button>
                  {/each}
                  <span class="playhead-mini" style={`left:${trackPercent(currentTime)}%;`}></span>
                </div>

                {#if targetRow.expanded}
                  <div class="property-row-list">
                    {#each targetRow.propertyRows as propertyRow (propertyRow.id)}
                      <div
                        class="track-card property-row-card"
                        class:track-selected={propertyRow.track.id === selectedTrackId}
                        data-tadpole-property-row={propertyRow.track.id}
                        data-tadpole-target-id={propertyRow.targetId}
                        data-tadpole-property={propertyRow.track.property}
                        data-tadpole-key-count={propertyRow.keyframeCount}
                        aria-label={`Track for ${propertyRow.targetLabel} ${propertyRow.track.property}`}
                      >
                        <div class="track-heading">
                          <label class="inline-label">
                            <span>Target</span>
                            <select value={propertyRow.track.targetId} on:change={(event) => setTrackTarget(propertyRow.track.id, event)}>
                              {#each availableTargets as target}
                                <option value={target.id}>{target.name}</option>
                              {/each}
                            </select>
                          </label>
                          <label class="inline-label">
                            <span>Property</span>
                            <select
                              value={propertyRow.track.property}
                              on:change={(event) => setTrackProperty(propertyRow.track.id, event)}
                            >
                              {#each propertyCatalog as property}
                                <option value={property.id}>{property.label}</option>
                              {/each}
                            </select>
                          </label>
                          <div class="track-meta">
                            <button type="button" class="inline-select" on:click={() => selectTrack(propertyRow.track.id)}>
                              {propertyRow.track.id === selectedTrackId ? "Selected" : "Select track"}
                            </button>
                            <button
                              type="button"
                              on:click={() => moveTrackOrder(propertyRow.track.id, -1)}
                              disabled={!canMoveTrackUp(propertyRow.track.id)}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              on:click={() => moveTrackOrder(propertyRow.track.id, 1)}
                              disabled={!canMoveTrackDown(propertyRow.track.id)}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              on:click={() => moveTrackToTop(propertyRow.track.id)}
                              disabled={!canMoveTrackUp(propertyRow.track.id)}
                            >
                              ⤒
                            </button>
                            <button
                              type="button"
                              on:click={() => moveTrackToBottom(propertyRow.track.id)}
                              disabled={!canMoveTrackDown(propertyRow.track.id)}
                            >
                              ⤓
                            </button>
                            <span class="chip">
                              {propertyRow.targetLabel} • {propertyRow.track.property} • {propertyRow.propertyLabel}
                            </span>
                            <button
                              type="button"
                              class:active={!propertyRow.track.muted}
                              on:click={() => toggleTrackMute(propertyRow.track.id)}
                            >
                              {propertyRow.track.muted ? "Unmute" : "Mute"}
                            </button>
                            <button type="button" on:click={() => resetTrackValues(propertyRow.track.id)}>
                              Reset values
                            </button>
                            <button type="button" on:click={() => duplicateTrack(propertyRow.track.id)}>Duplicate</button>
                            <button type="button" on:click={() => removeTrack(propertyRow.track.id)}>Delete</button>
                          </div>
                        </div>

                        <p class="muted tiny">
                          Live value at playhead: <code>{propertyRow.currentValue}</code>
                          <span class="muted-divider">|</span>
                          Keyframes: {propertyRow.keyframeCount}
                        </p>

                        <div class="track-lane-shell">
                          <div
                            class="track-lane"
                            role="button"
                            tabindex="0"
                            data-tadpole-track-lane={propertyRow.track.id}
                            data-tadpole-target-id={propertyRow.track.targetId}
                            data-tadpole-property={propertyRow.track.property}
                            data-tadpole-keyframe-count={propertyRow.keyframeCount}
                            data-tadpole-selected-track={selectedTrackId === propertyRow.track.id ? "true" : "false"}
                            aria-label={`Timeline lane for ${propertyRow.targetLabel} ${propertyRow.track.property}. Press Enter or Space to add a keyframe at ${currentTime}ms.`}
                            aria-keyshortcuts="Enter Space K ArrowLeft ArrowRight Home End PageUp PageDown"
                            on:click={(event) => addKeyframeFromLane(propertyRow.track.id, event)}
                            on:keydown={(event) => {
                              if (event.key === " " || event.key === "Enter") {
                                event.preventDefault();
                                addKeyframeAtTimeForTrack(propertyRow.track.id, currentTime);
                              }
                            }}
                          >
                            <span class={`track-line ${propertyRow.track.muted ? "is-muted" : ""}`}></span>
                            {#each propertyRow.spans as span (span.id)}
                              <span
                                class="animation-span"
                                data-tadpole-animation-span={span.id}
                                data-tadpole-span-start={span.startTime}
                                data-tadpole-span-end={span.endTime}
                                style={`left:${trackPercent(span.startTime)}%; width:${spanWidthPercent(span.startTime, span.endTime)}%;`}
                              ></span>
                            {/each}
                            {#each propertyRow.sortedKeyframes as keyframe}
                              <button
                                type="button"
                                class={`keyframe-marker ${
                                  keyframe.id === selectedKeyframeId && propertyRow.track.id === selectedTrackId ? "is-selected" : ""
                                } ${
                                  draggingKeyframe?.trackId === propertyRow.track.id && draggingKeyframe?.keyframeId === keyframe.id
                                    ? "is-dragging"
                                    : ""
                                }`}
                                data-keyframe-id={keyframe.id}
                                data-tadpole-keyframe-track-id={propertyRow.track.id}
                                data-tadpole-keyframe-time={keyframe.time}
                                data-tadpole-keyframe-value={keyframe.value}
                                data-tadpole-target-id={propertyRow.track.targetId}
                                data-tadpole-property={propertyRow.track.property}
                                aria-label={`${propertyRow.targetLabel} ${propertyRow.track.property} keyframe ${keyframe.id} at ${keyframe.time}ms value ${keyframe.value}`}
                                aria-keyshortcuts="Enter Space ArrowLeft ArrowRight Delete Backspace"
                                style={`left:${trackPercent(keyframe.time)}%;`}
                                on:mousedown={(event) => startKeyframeDrag(propertyRow.track.id, event)}
                                on:click|stopPropagation={() => selectKeyframe(propertyRow.track.id, keyframe.id, keyframe.time)}
                                on:keydown={(event) => handleKeyframeKeyboard(propertyRow.track.id, keyframe.id, keyframe.time, event)}
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
                            <button type="button" on:click={() => addKeyframeAtTimeForTrack(propertyRow.track.id, currentTime)}>
                              + Drop keyframe at {currentTime}ms
                            </button>
                          </div>
                          <ul>
                            {#each propertyRow.sortedKeyframes as keyframe}
                              <li class:selected={selectedKeyframeId === keyframe.id && selectedTrackId === propertyRow.track.id}>
                                <button
                                  type="button"
                                  class="key-id-button"
                                  data-tadpole-keyframe-list-button={keyframe.id}
                                  data-tadpole-keyframe-track-id={propertyRow.track.id}
                                  data-tadpole-keyframe-time={keyframe.time}
                                  data-tadpole-keyframe-value={keyframe.value}
                                  data-tadpole-target-id={propertyRow.track.targetId}
                                  data-tadpole-property={propertyRow.track.property}
                                  aria-label={`${propertyRow.targetLabel} ${propertyRow.track.property} keyframe ${keyframe.id} at ${keyframe.time}ms value ${keyframe.value}`}
                                  aria-keyshortcuts="Enter Space ArrowLeft ArrowRight Delete Backspace"
                                  on:click={() => selectKeyframe(propertyRow.track.id, keyframe.id, keyframe.time)}
                                  on:keydown={(event) => handleKeyframeKeyboard(propertyRow.track.id, keyframe.id, keyframe.time, event)}
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
                                    on:input={(event) => updateKeyframeTime(propertyRow.track.id, keyframe.id, event)}
                                  />
                                </label>
                                <label class="inline-label">
                                  <span>value</span>
                                  <input
                                    type={isNumericProperty(propertyRow.track.property) ? "number" : "text"}
                                    min={isNumericProperty(propertyRow.track.property)
                                      ? `${propertySpec(propertyRow.track.property).min ?? 0}`
                                      : undefined}
                                    max={isNumericProperty(propertyRow.track.property)
                                      ? `${propertySpec(propertyRow.track.property).max ?? 0}`
                                      : undefined}
                                    step={isNumericProperty(propertyRow.track.property)
                                      ? `${propertySpec(propertyRow.track.property).step ?? 1}`
                                      : undefined}
                                    value={keyframe.value}
                                    on:input={(event) => updateKeyframeValue(propertyRow.track.id, keyframe.id, event)}
                                  />
                                </label>
                                <label class="inline-label">
                                  <span>ease</span>
                                  <select
                                    value={keyframe.easing}
                                    on:change={(event) => updateKeyframeEasing(propertyRow.track.id, keyframe.id, event)}
                                  >
                                    {#each easingModes as easing}
                                      <option value={easing}>{easing}</option>
                                    {/each}
                                  </select>
                                </label>
                                <button type="button" on:click={() => removeKeyframe(propertyRow.track.id, keyframe.id)}>
                                  Delete
                                </button>
                              </li>
                            {/each}
                          </ul>
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </section>
            {/each}
          </div>
        </div>

        <div class="add-track">
          <h3>New Track</h3>
          <div class="toolbar">
            <label class="inline-label">
              <span>Target</span>
              <select bind:value={newTrackTargetId} disabled={availableTargets.length === 0}>
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
            <button type="button" on:click={addTrack} disabled={availableTargets.length === 0}>Create Track</button>
          </div>
          <p class="muted tiny">
            Tip: click a timeline lane or use + Drop keyframe at playhead on any selected track.
          </p>
        </div>

      </section>

      <section class="panel panel-preview" data-tadpole-canvas-stage tabindex="-1" aria-label="SVG canvas stage">
        <div class="panel-heading">
          <div>
            <h2>Live Preview</h2>
            <p class="muted">
              Animate the logo targets in-place as the playhead moves.
              {#if activeTrack}
                Targeting <strong>{targetNameById.get(activeTrack.targetId) ?? activeTrack.targetId}</strong>:{activeTrack.property}
              {/if}
            </p>
            <div class="preview-selected-target-chip" aria-live="polite">
              {#if selectedTarget}
                Selected target: {selectedTarget.name} #{selectedTarget.id}
              {:else}
                No selected SVG target
              {/if}
            </div>
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
          <div class="preview-stage">
            <div
              class="preview-svg-host"
              bind:this={previewSvgHostElement}
              role="group"
              aria-label={`Source SVG Animation Preview${selectedTarget ? `, selected target ${selectedTarget.name}` : ""}`}
              on:pointerup={selectPreviewTarget}
            >
              {@html svgMarkup}
            </div>
          </div>
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
        </div>
      </section>
    </div>
  </section>
</main>

<style>
  .shell {
    width: 100%;
    min-height: 100vh;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    background: color-mix(in oklab, var(--color-15) 88%, black);
    overflow: hidden;
  }

  .editor-menubar {
    min-height: 4.75rem;
    display: grid;
    grid-template-columns: auto minmax(18rem, 1fr) auto;
    gap: var(--size-3);
    align-items: center;
    padding: var(--size-2) var(--size-4);
    border-bottom: 1px solid var(--tadpole-border);
    background: color-mix(in oklab, var(--color-14) 92%, black);
  }

  .editor-brand {
    display: flex;
    align-items: center;
    gap: var(--size-2);
    min-width: 11rem;
  }

  .brand-mark {
    width: 2.25rem;
    aspect-ratio: 1;
    border: 1px solid color-mix(in oklab, var(--tadpole-accent) 45%, var(--tadpole-border));
    border-radius: var(--radius-2);
    display: grid;
    place-items: center;
    background: color-mix(in oklab, var(--color-8) 20%, var(--color-13));
    color: var(--tadpole-text);
    font-weight: var(--font-weight-7);
  }

  .menu-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-2);
    align-items: center;
    position: relative;
  }

  .menu-group {
    position: relative;
  }

  .menu-actions button,
  .menu-popover button,
  .dialog-actions button,
  .dialog-close {
    border: 1px solid var(--tadpole-border);
    border-radius: var(--radius-2);
    background: color-mix(in oklab, var(--color-12) 78%, transparent);
    color: var(--tadpole-text);
    min-height: 2rem;
    padding: 0.4rem 0.62rem;
    cursor: pointer;
    font-weight: var(--font-weight-5);
  }

  .menu-actions button:hover,
  .menu-actions button.is-active,
  .menu-popover button:hover,
  .menu-popover button:focus-visible,
  .dialog-actions button:hover,
  .dialog-close:hover {
    border-color: color-mix(in oklab, var(--tadpole-accent) 48%, var(--tadpole-border));
    background: color-mix(in oklab, var(--color-8) 18%, var(--color-12));
  }

  .menu-popover button:disabled,
  .dialog-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .menu-popover {
    position: absolute;
    z-index: 40;
    top: calc(100% + var(--size-1));
    left: 0;
    min-width: 13rem;
    display: grid;
    gap: 1px;
    padding: var(--size-1);
    border: 1px solid var(--tadpole-border);
    border-radius: var(--radius-2);
    background: color-mix(in oklab, var(--color-14) 96%, black);
    box-shadow: var(--shadow-4);
  }

  .menu-popover.align-end {
    left: auto;
    right: 0;
  }

  .menu-popover button {
    width: 100%;
    justify-content: start;
    text-align: left;
    background: transparent;
    border-color: transparent;
  }

  .menu-popover button[role="menuitemcheckbox"]::before {
    content: " ";
    width: 0.75rem;
    display: inline-block;
  }

  .menu-popover button[role="menuitemcheckbox"][aria-checked="true"]::before {
    content: "✓";
  }

  .dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: start center;
    padding: min(8vh, 5rem) var(--size-4) var(--size-4);
    background: color-mix(in oklab, black 42%, transparent);
  }

  .document-dialog {
    width: min(44rem, calc(100vw - var(--size-4) * 2));
    max-height: min(78vh, 48rem);
    overflow: auto;
    display: grid;
    gap: var(--size-3);
    padding: var(--size-4);
    border: 1px solid var(--tadpole-border);
    border-radius: var(--radius-2);
    background: color-mix(in oklab, var(--color-14) 96%, black);
    box-shadow: var(--shadow-5);
  }

  .dialog-heading {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: var(--size-3);
    border-bottom: 1px solid var(--tadpole-border);
    padding-bottom: var(--size-2);
  }

  .dialog-heading h2 {
    margin: 0;
    font-size: var(--font-size-4);
  }

  .dialog-body,
  .dialog-actions {
    display: grid;
    gap: var(--size-3);
  }

  .dialog-actions {
    grid-template-columns: repeat(auto-fit, minmax(10rem, max-content));
    align-items: center;
  }

  .dialog-code,
  .panel-debug pre {
    margin: 0;
    border: 1px solid var(--tadpole-border);
    background: color-mix(in oklab, var(--color-13) 82%, transparent);
    border-radius: var(--radius-2);
    padding: var(--size-2);
    overflow: auto;
    max-height: 18rem;
    font-size: 12px;
  }

  .document-status {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-2);
    justify-content: flex-end;
    max-width: 34rem;
  }

  .editor-layout {
    display: grid;
    grid-template-columns: var(--tadpole-drawer-width, 3.25rem) var(--size-1) minmax(0, 1fr);
    gap: 0;
    align-items: stretch;
    min-height: 0;
    height: 100%;
  }

  .editor-layout.dock-right {
    grid-template-columns: minmax(0, 1fr) var(--size-1) var(--tadpole-drawer-width, 3.25rem);
  }

  .editor-layout.dock-right .workbench {
    grid-column: 1;
    grid-row: 1;
  }

  .editor-layout.dock-right .layout-resizer {
    grid-column: 2;
    grid-row: 1;
  }

  .editor-layout.dock-right .drawer {
    grid-column: 3;
    grid-row: 1;
    border-right: 0;
    border-left: 1px solid var(--tadpole-border);
  }

  .drawer {
    display: grid;
    gap: var(--size-2);
    width: var(--tadpole-drawer-width, 24rem);
    min-width: var(--tadpole-drawer-width, 24rem);
    max-width: var(--tadpole-drawer-width, 24rem);
    overflow: auto;
    transition: width 0.1s ease;
    border-right: 1px solid var(--tadpole-border);
    background: color-mix(in oklab, var(--color-14) 90%, black);
    padding: var(--size-2);
    align-content: start;
  }

  .drawer-content {
    display: grid;
    gap: var(--size-2);
    min-width: 0;
  }

  .panel-state-ledger {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  .panel-host-heading {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: var(--size-2);
    border: 1px solid color-mix(in oklab, var(--tadpole-border), black 10%);
    border-radius: var(--radius-2);
    background: color-mix(in oklab, var(--color-13) 76%, transparent);
    padding: var(--size-2);
  }

  .dock-panel-actions {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: var(--size-1);
  }

  .dock-panel-actions [data-tadpole-dock-active="true"] {
    border-color: color-mix(in oklab, var(--tadpole-accent) 58%, var(--tadpole-border));
    background: color-mix(in oklab, var(--color-8) 24%, var(--color-12));
  }

  .panel-host-heading h2 {
    margin: 0;
    font-size: var(--font-size-3);
  }

  .panel-host-heading button {
    border: 1px solid var(--tadpole-border);
    border-radius: var(--radius-2);
    min-height: 2rem;
    padding: 0.35rem 0.6rem;
    color: var(--tadpole-text);
    background: var(--color-10);
    cursor: pointer;
    font-weight: var(--font-weight-5);
  }

  .panel-host-heading button:hover,
  .panel-host-heading button:focus-visible {
    border-color: color-mix(in oklab, var(--tadpole-accent) 48%, var(--tadpole-border));
    background: color-mix(in oklab, var(--color-8) 18%, var(--color-12));
  }

  .drawer-collapsed .drawer-content {
    display: none;
  }

  .drawer-toggle-wrap {
    display: flex;
    justify-content: center;
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
    width: var(--size-1);
    border: 0;
    border-radius: 0;
    background: color-mix(in oklab, var(--tadpole-border), black 18%);
    padding: 0;
    cursor: col-resize;
    height: 100%;
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
    gap: 0;
    min-width: 0;
    min-height: 0;
    height: 100%;
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(0, 1fr) minmax(16rem, 32vh);
    grid-template-areas:
      "toolbar"
      "preview"
      "timeline";
  }

  .workbench-toolbar {
    grid-area: toolbar;
    border-bottom: 1px solid var(--tadpole-border);
    background: color-mix(in oklab, var(--color-14) 82%, black);
    padding: var(--size-2) var(--size-4);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--size-3);
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

  .status-chip.warning {
    color: var(--yellow-3);
    border-color: color-mix(in oklab, var(--yellow-3) 58%, var(--tadpole-border));
  }

  .status-button {
    cursor: pointer;
    font: inherit;
    min-height: 1.65rem;
  }

  .status-button:hover,
  .status-button:focus-visible {
    color: var(--tadpole-text);
    border-color: color-mix(in oklab, var(--tadpole-accent) 48%, var(--tadpole-border));
    background: color-mix(in oklab, var(--color-8) 18%, var(--color-13));
  }

  .status-warning {
    color: var(--yellow-3);
    border-color: color-mix(in oklab, var(--yellow-3) 56%, var(--tadpole-border));
  }

  .status-strong {
    color: var(--tadpole-text);
    border-color: color-mix(in oklab, var(--tadpole-accent) 42%, var(--tadpole-border));
  }

  .panel-timeline {
    grid-area: timeline;
    border-radius: 0;
    border-inline: 0;
    border-bottom: 0;
    border-color: color-mix(in oklab, var(--tadpole-border), black 12%);
    background: color-mix(in oklab, var(--color-14) 90%, black);
    min-height: 0;
    overflow: hidden;
    display: grid;
    grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  }

  .panel-preview {
    grid-area: preview;
    min-height: 0;
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
    font-size: clamp(1.45rem, 2.4vw, 2rem);
    line-height: 1.1;
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: clamp(1.25rem, 2vw, 1.75rem);
    line-height: 1.08;
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
    height: 100%;
    min-height: 0;
    max-height: none;
    display: grid;
    grid-template-rows: auto auto minmax(0, 1fr);
    border: 0;
    border-radius: 0;
    padding: var(--size-3) var(--size-4) var(--size-4);
    background:
      linear-gradient(color-mix(in oklab, var(--color-13) 14%, transparent) 1px, transparent 1px),
      linear-gradient(90deg, color-mix(in oklab, var(--color-13) 14%, transparent) 1px, transparent 1px),
      color-mix(in oklab, var(--color-15) 92%, black);
    background-size: 2rem 2rem;
  }

  .muted {
    color: var(--tadpole-text-muted);
  }

  .tiny {
    font-size: var(--font-size-0);
  }

  .empty-state {
    margin: 0;
    border: 1px dashed color-mix(in oklab, var(--tadpole-border), var(--color-10));
    border-radius: var(--radius-2);
    padding: var(--size-2);
    color: var(--tadpole-text-muted);
    background: color-mix(in oklab, var(--color-13) 72%, transparent);
  }

  .preview-controls {
    display: none;
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

  .preview-selected-target-chip {
    display: inline-flex;
    margin-top: var(--size-2);
    border: 1px solid color-mix(in oklab, var(--tadpole-accent) 36%, var(--tadpole-border));
    border-radius: var(--radius-2);
    padding: 0.25rem 0.55rem;
    color: var(--tadpole-text);
    background: color-mix(in oklab, var(--color-8) 14%, transparent);
    font-size: var(--font-size-0);
    font-weight: var(--font-weight-5);
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
  .timeline-playback-compact button,
  .timeline-stack-controls button,
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
  .timeline-playback-compact button:hover,
  .timeline-stack-controls button:hover,
  .palette-actions button:hover,
  .track-meta button:hover {
    background: color-mix(in oklab, var(--color-10) 88%, white);
  }

  .preset-row button.active,
  .preset-row button.is-active,
  .inline-label button.is-active {
    border-color: color-mix(in oklab, var(--tadpole-accent) 45%, var(--tadpole-border));
    background: color-mix(in oklab, var(--color-8) 22%, var(--color-10));
  }

  .toolbar button.is-active,
  .timeline-playback-compact button.is-active {
    border-color: color-mix(in oklab, var(--tadpole-accent) 45%, var(--tadpole-border));
    background: color-mix(in oklab, var(--color-8) 22%, var(--color-10));
  }

  .toolbar button:disabled,
  .timeline-playback-compact button:disabled,
  .timeline-stack-controls button:disabled,
  .track-meta button:disabled,
  .inline-label select:disabled {
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
  .inline-label select,
  .inline-label textarea {
    border: 1px solid var(--tadpole-border);
    background: var(--color-13);
    border-radius: var(--radius-2);
    padding: 0.35rem 0.5rem;
    color: var(--tadpole-text);
  }

  .inline-label textarea {
    width: 100%;
    min-height: 8rem;
    resize: vertical;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    font-size: 12px;
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

  .panel-svg-source {
    display: grid;
    gap: var(--size-3);
  }

  .svg-source-summary {
    display: flex;
    flex-wrap: wrap;
    gap: var(--size-2);
  }

  .source-actions {
    justify-content: flex-start;
  }

  .animation-import-warnings ul {
    margin: var(--size-1) 0 0;
    padding-left: var(--size-4);
  }

  .warning-row-list {
    display: grid;
    gap: var(--size-2);
    margin: var(--size-2) 0 0;
    padding: 0;
    list-style: none;
  }

  .warning-row-list button {
    display: grid;
    width: 100%;
    gap: 0.15rem;
    border: 1px solid color-mix(in oklab, var(--yellow-3) 36%, var(--tadpole-border));
    border-radius: var(--radius-2);
    padding: var(--size-2);
    color: var(--tadpole-text);
    background: color-mix(in oklab, var(--yellow-3) 8%, var(--color-13));
    cursor: pointer;
    text-align: left;
  }

  .warning-row-list button:hover,
  .warning-row-list button:focus-visible,
  .warning-row-list button.selected {
    border-color: color-mix(in oklab, var(--yellow-3) 72%, var(--tadpole-border));
    background: color-mix(in oklab, var(--yellow-3) 14%, var(--color-13));
  }

  .warning-row-list strong {
    color: var(--yellow-3);
  }

  .warning-row-list span {
    color: var(--tadpole-text-muted);
    font-size: var(--font-size-0);
  }

  .quick-track-actions {
    justify-content: flex-start;
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

  .work-area-controls {
    align-items: center;
  }

  .work-area-summary {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--size-2);
  }

  .timeline-playback-compact {
    display: none;
    flex-wrap: wrap;
    gap: var(--size-2);
    margin: var(--size-2) 0 var(--size-3);
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

  .work-area-range {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 1;
    border-inline: 1px solid color-mix(in oklab, var(--color-8) 72%, var(--tadpole-border));
    background: color-mix(in oklab, var(--color-8) 18%, transparent);
    pointer-events: none;
  }

  .work-area-marker {
    position: absolute;
    top: 0.2rem;
    z-index: 4;
    min-width: 3.2rem;
    transform: translateX(-50%);
    border: 1px solid color-mix(in oklab, var(--color-8) 64%, var(--tadpole-border));
    border-radius: var(--radius-2);
    padding: 0.1rem 0.32rem;
    color: var(--color-0);
    background: var(--color-8);
    font-size: var(--font-size-0);
    font-weight: var(--font-weight-6);
    line-height: 1.2;
    text-align: center;
    pointer-events: none;
  }

  .work-area-marker-out {
    background: color-mix(in oklab, var(--color-8) 78%, var(--color-10));
  }

  .track-list {
    margin-top: var(--size-4);
    display: grid;
    gap: var(--size-3);
  }

  .starter-timeline-suggestions {
    display: grid;
    gap: var(--size-3);
    border: 1px solid color-mix(in oklab, var(--tadpole-accent) 34%, var(--tadpole-border));
    border-radius: var(--radius-2);
    padding: var(--size-3);
    background: color-mix(in oklab, var(--color-13) 88%, transparent);
  }

  .starter-suggestion-heading,
  .starter-suggestion-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--size-2);
  }

  .starter-suggestion-heading h3 {
    margin: 0;
    font-size: var(--font-size-3);
  }

  .starter-suggestion-list {
    display: grid;
    gap: var(--size-2);
  }

  .starter-suggestion-row {
    display: grid;
    gap: var(--size-2);
    border: 1px solid var(--tadpole-border);
    border-radius: var(--radius-2);
    padding: var(--size-2);
    background: color-mix(in oklab, var(--color-14) 80%, black);
  }

  .starter-suggestion-toggle {
    display: flex;
    align-items: center;
    gap: var(--size-2);
    min-width: 0;
  }

  .starter-suggestion-toggle input {
    width: 1rem;
    height: 1rem;
    flex: 0 0 auto;
  }

  .starter-keyframes {
    display: grid;
    gap: var(--size-2);
    grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  }

  .track-scroll {
    max-height: 100%;
    overflow: auto;
    padding-right: var(--size-2);
    padding-bottom: var(--size-1);
  }

  .timeline-tracks-collapsed .track-scroll {
    display: none;
  }

  .track-scroll::-webkit-scrollbar {
    width: 0.5rem;
  }

  .track-scroll::-webkit-scrollbar-thumb {
    background: color-mix(in oklab, var(--tadpole-border), white);
    border-radius: var(--radius-2);
  }

  .timeline-stack-controls {
    margin-top: var(--size-3);
    display: flex;
    align-items: center;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: var(--size-2);
  }

  .target-stack {
    display: grid;
    gap: var(--size-2);
    padding-top: var(--size-3);
    border-top: 1px solid color-mix(in oklab, var(--tadpole-border) 82%, transparent);
  }

  .target-stack:first-child {
    padding-top: 0;
    border-top: 0;
  }

  .target-stack-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--size-3);
    align-items: center;
  }

  .target-stack-toggle {
    display: inline-flex;
    align-items: center;
    justify-self: start;
    max-width: 100%;
    gap: var(--size-2);
    min-height: 2rem;
    padding: 0.25rem 0.45rem;
    border: 1px solid transparent;
    border-radius: var(--radius-2);
    color: var(--tadpole-text);
    background: transparent;
    cursor: pointer;
    text-align: left;
  }

  .target-stack-toggle:hover,
  .target-stack-toggle:focus-visible {
    border-color: color-mix(in oklab, var(--tadpole-accent) 36%, var(--tadpole-border));
    background: color-mix(in oklab, var(--color-8) 12%, transparent);
  }

  .target-stack-disclosure {
    display: grid;
    width: 1rem;
    place-items: center;
    color: var(--tadpole-text-muted);
  }

  .target-stack-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: var(--font-weight-6);
  }

  .target-stack-facts {
    display: flex;
    justify-content: flex-end;
    flex-wrap: wrap;
    gap: var(--size-2);
  }

  .target-summary-lane {
    position: relative;
    min-height: 2rem;
    border: 1px solid color-mix(in oklab, var(--tadpole-border) 78%, transparent);
    border-radius: var(--radius-2);
    background: color-mix(in oklab, var(--color-12) 66%, transparent);
  }

  .target-stack.collapsed .target-summary-lane {
    background: color-mix(in oklab, var(--color-9) 9%, var(--color-13));
  }

  .summary-key-dot {
    position: absolute;
    top: 50%;
    z-index: 3;
    width: 0.85rem;
    aspect-ratio: 1;
    overflow: hidden;
    transform: translate(-50%, -50%);
    border: 1px solid var(--color-0);
    border-radius: 999px;
    color: transparent;
    background: var(--color-8);
    cursor: pointer;
  }

  .summary-key-dot:hover,
  .summary-key-dot:focus-visible {
    background: var(--color-6);
    outline: 2px solid color-mix(in oklab, var(--tadpole-accent) 52%, transparent);
    outline-offset: 2px;
  }

  .property-row-list {
    display: grid;
    gap: var(--size-2);
    padding-left: var(--size-5);
    border-left: 1px solid color-mix(in oklab, var(--tadpole-border) 72%, transparent);
  }

  .property-row-card {
    background: color-mix(in oklab, var(--color-12) 78%, transparent);
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
    z-index: 0;
    height: 2px;
    background: var(--color-9);
    transform: translateY(-50%);
  }

  .track-line.is-muted {
    opacity: 0.2;
  }

  .animation-span {
    position: absolute;
    top: 50%;
    z-index: 1;
    height: 0.54rem;
    transform: translateY(-50%);
    border: 1px solid color-mix(in oklab, var(--color-8) 68%, var(--color-0));
    border-radius: 999px;
    background: color-mix(in oklab, var(--color-8) 48%, transparent);
    pointer-events: none;
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

  .selected-target-summary {
    display: grid;
    gap: var(--size-2);
    border: 1px solid color-mix(in oklab, var(--tadpole-accent) 34%, var(--tadpole-border));
    border-radius: var(--radius-2);
    background: color-mix(in oklab, var(--color-8) 12%, transparent);
    padding: var(--size-3);
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

  .export-block pre.runnable-export-output {
    max-height: 16rem;
  }

  .preview-shell {
    margin-top: var(--size-3);
    display: grid;
    gap: var(--size-3);
    align-content: start;
    min-height: 0;
    height: 100%;
    grid-template-rows: minmax(0, 1fr) auto;
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
    min-height: 18rem;
    border-radius: var(--radius-2);
    border: 1px solid color-mix(in oklab, var(--tadpole-border), white 12%);
    background:
      linear-gradient(135deg, color-mix(in oklab, var(--color-13) 74%, black), color-mix(in oklab, var(--color-12) 84%, black));
    overflow: hidden;
    display: grid;
    place-items: center;
    height: 100%;
    box-shadow: inset 0 0 0 1px color-mix(in oklab, white 4%, transparent);
  }

  .preview-svg-host {
    width: min(760px, 92%);
    max-width: 100%;
    display: grid;
    place-items: center;
    border: 0;
    padding: 0;
    background: transparent;
    color: inherit;
    cursor: crosshair;
  }

  .preview-svg,
  .preview-svg-host :global(svg) {
    width: min(760px, 100%);
    max-width: 100%;
    max-height: min(52vh, 32rem);
    height: auto;
    display: block;
  }

  .preview-text,
  .preview-svg-host :global(.preview-text) {
    letter-spacing: 0.02em;
  }

  .preview-svg-host :global([data-tadpole-target="true"]) {
    cursor: pointer;
  }

  .preview-svg-host :global(.tadpole-selected-target) {
    filter: drop-shadow(0 0 0.35rem color-mix(in oklab, var(--tadpole-accent) 68%, transparent));
    outline: 2px solid color-mix(in oklab, var(--tadpole-accent) 72%, white);
    outline-offset: 2px;
  }

  .font-list {
    margin: var(--size-3) 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--size-2);
  }

  .layer-list {
    margin: var(--size-3) 0 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: var(--size-1);
  }

  .layer-list li {
    min-width: 0;
  }

  .layer-batch-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: var(--size-2);
    align-items: end;
    margin-block-start: var(--size-3);
  }

  .layer-batch-toolbar button {
    min-height: 2.3rem;
  }

  .layer-row-shell {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--size-1);
    align-items: stretch;
  }

  .layer-batch-toggle {
    display: grid;
    place-items: center;
    min-width: 1.75rem;
    min-height: 2.25rem;
    border: 1px solid transparent;
    border-radius: var(--radius-2);
    background: color-mix(in oklab, var(--color-13) 52%, transparent);
  }

  .layer-batch-toggle input {
    margin: 0;
  }

  .layer-row {
    width: 100%;
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--size-2);
    align-items: center;
    border: 1px solid transparent;
    border-radius: var(--radius-2);
    background: color-mix(in oklab, var(--color-13) 64%, transparent);
    color: inherit;
    font: inherit;
    text-align: left;
    padding: var(--size-1) var(--size-2);
    cursor: pointer;
  }

  .layer-row:hover,
  .layer-row:focus-visible,
  .layer-row.selected {
    border-color: color-mix(in oklab, var(--tadpole-accent) 42%, var(--tadpole-border));
    background: color-mix(in oklab, var(--color-8) 12%, transparent);
  }

  .layer-row-main {
    min-width: 0;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: 0.2rem var(--size-1);
    align-items: center;
    padding-inline-start: calc(var(--layer-depth, 0) * 1rem);
  }

  .layer-row-disclosure {
    color: var(--tadpole-text-muted);
    font-size: var(--font-size-0);
  }

  .layer-row-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .layer-row-facts {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--size-1);
  }

  .layer-list code {
    grid-column: 2;
    color: var(--tadpole-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
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

  .warning {
    color: var(--yellow-3);
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

  .chip.warning {
    color: var(--color-3);
  }

  @media (max-width: 960px) {
    .editor-layout {
      grid-template-columns: var(--tadpole-drawer-width, 3.25rem) minmax(0, 1fr);
    }

    .editor-layout.dock-right {
      grid-template-columns: minmax(0, 1fr) var(--tadpole-drawer-width, 3.25rem);
    }

    .editor-layout.dock-right .workbench {
      grid-column: 1;
    }

    .editor-layout.dock-right .drawer {
      grid-column: 2;
    }

    .layout-resizer {
      display: none;
    }

    .drawer {
      width: var(--tadpole-drawer-width, 3.25rem);
      min-width: var(--tadpole-drawer-width, 3.25rem);
      max-width: var(--tadpole-drawer-width, 3.25rem);
    }

    .workbench {
      min-width: 0;
    }

    .drawer-collapsed .drawer-content {
      display: none;
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
        "preview"
        "timeline";
    }

    .workbench-toolbar {
      display: none;
    }

    .timeline-playback-compact {
      display: flex;
    }

    .editor-menubar {
      grid-template-columns: 1fr;
      align-items: stretch;
    }

    .document-status {
      justify-content: flex-start;
      max-width: none;
    }

    .menu-actions {
      overflow-x: auto;
      flex-wrap: nowrap;
      padding-bottom: var(--size-1);
    }

    .menu-actions button {
      white-space: nowrap;
    }

    .preview-tick,
    .ruler-stop span {
      display: none;
    }
  }

  @media (max-width: 720px) {
    .editor-layout {
      grid-template-columns: minmax(0, 1fr);
    }

    .editor-layout.dock-right {
      grid-template-columns: minmax(0, 1fr);
    }

    .drawer {
      position: fixed;
      z-index: 50;
      inset: auto var(--size-2) var(--size-2) var(--size-2);
      width: auto;
      min-width: 0;
      max-width: none;
      max-height: min(72vh, 40rem);
      border: 1px solid var(--tadpole-border);
      border-radius: var(--radius-2);
      box-shadow: var(--shadow-5);
    }

    .drawer.drawer-collapsed {
      display: none;
    }

    .drawer-toggle-wrap {
      justify-content: flex-end;
    }
  }

  @media (min-width: 1200px) {
    .workbench {
      grid-template-columns: 1fr;
      grid-template-rows: auto minmax(0, 1fr) minmax(16rem, 30vh);
      grid-template-areas:
        "toolbar"
        "preview"
        "timeline";
      align-items: stretch;
    }

    .panel-preview {
      min-height: 0;
      height: 100%;
      max-height: none;
    }

    .panel-timeline {
      max-height: none;
      overflow: hidden;
    }
  }
</style>
