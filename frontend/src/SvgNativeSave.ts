export type SvgNativeSaveProperty =
  | "x"
  | "y"
  | "scale"
  | "rotation"
  | "opacity"
  | "fill"
  | "stroke"
  | "strokeWidth"
  | "strokeDashoffset";

export type SvgNativeSaveSeverity = "warning" | "error";

export type SvgNativeSaveKeyframe = {
  readonly id: string;
  readonly time: number;
  readonly value: string;
  readonly easing: string;
};

export type SvgNativeSaveTrack = {
  readonly id: string;
  readonly targetId: string;
  readonly property: SvgNativeSaveProperty;
  readonly keyframes: readonly SvgNativeSaveKeyframe[];
  readonly muted: boolean;
};

type NormalizedKeyframe = {
  readonly time: number;
  readonly value: string;
};

type NormalizedTrack = {
  readonly id: string;
  readonly targetId: string;
  readonly property: SvgNativeSaveProperty;
  readonly keyframes: readonly NormalizedKeyframe[];
};

const cloneKeyframe = (keyframe: SvgNativeSaveKeyframe): SvgNativeSaveKeyframe =>
  Object.freeze({
    id: keyframe.id,
    time: keyframe.time,
    value: keyframe.value,
    easing: keyframe.easing,
  });

const cloneTrack = (track: SvgNativeSaveTrack): SvgNativeSaveTrack =>
  Object.freeze({
    id: track.id,
    targetId: track.targetId,
    property: track.property,
    keyframes: Object.freeze(track.keyframes.map(cloneKeyframe)),
    muted: track.muted,
  });

export class SvgNativeSaveWarning {
  readonly code: string;
  readonly severity: SvgNativeSaveSeverity;
  readonly message: string;
  readonly trackId: string;

  constructor(code: string, severity: SvgNativeSaveSeverity, message: string, trackId = "") {
    this.code = code;
    this.severity = severity;
    this.message = message;
    this.trackId = trackId;
    Object.freeze(this);
  }

  isBlocking(): boolean {
    return this.severity === "error";
  }
}

export class SvgNativeSaveRequest {
  readonly source: string;
  readonly tracks: readonly SvgNativeSaveTrack[];
  readonly durationMs: number;
  readonly isLooping: boolean;

  constructor(source: string, tracks: readonly SvgNativeSaveTrack[], durationMs: number, isLooping: boolean) {
    this.source = source;
    this.tracks = Object.freeze(tracks.map(cloneTrack));
    this.durationMs = durationMs;
    this.isLooping = isLooping;
    Object.freeze(this);
  }
}

export class SvgNativeSaveResult {
  readonly ok: boolean;
  readonly svgText: string;
  readonly warnings: readonly SvgNativeSaveWarning[];
  readonly serializedTrackCount: number;

  private constructor(ok: boolean, svgText: string, warnings: readonly SvgNativeSaveWarning[], serializedTrackCount: number) {
    this.ok = ok;
    this.svgText = svgText;
    this.warnings = Object.freeze([...warnings]);
    this.serializedTrackCount = serializedTrackCount;
    Object.freeze(this);
  }

  static success(svgText: string, warnings: readonly SvgNativeSaveWarning[], serializedTrackCount: number): SvgNativeSaveResult {
    return new SvgNativeSaveResult(true, svgText, warnings, serializedTrackCount);
  }

  static blocked(warnings: readonly SvgNativeSaveWarning[]): SvgNativeSaveResult {
    return new SvgNativeSaveResult(false, "", warnings, 0);
  }

  blockingWarningCount(): number {
    return this.warnings.filter((warning) => warning.isBlocking()).length;
  }
}

const svgNamespace = "http://www.w3.org/2000/svg";
const authoredAttributeName = "data-tadpole-authored";
const metadataAttributeName = "data-tadpole-native-save-metadata";
const propertyOrder: SvgNativeSaveProperty[] = [
  "opacity",
  "fill",
  "stroke",
  "strokeWidth",
  "strokeDashoffset",
  "x",
  "y",
  "scale",
  "rotation",
];
const scalarProperties: SvgNativeSaveProperty[] = ["opacity", "fill", "stroke", "strokeWidth", "strokeDashoffset"];
const unsafeStyleValuePattern = /(?:url\s*\(|@import|expression\s*\(|(?:java|vb)script:|data:|https?:|\/\/|[;{}<>])/i;

const attributeNameForProperty = (property: SvgNativeSaveProperty): string => {
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

const formatNumber = (value: number): string => {
  const fixed = value.toFixed(6);
  return fixed.replace(/\.?0+$/u, "");
};

const formatKeyTime = (time: number, beginMs: number, durationMs: number): string => formatNumber((time - beginMs) / durationMs);

const propertyRank = (property: SvgNativeSaveProperty): number => {
  const index = propertyOrder.indexOf(property);
  return index === -1 ? propertyOrder.length : index;
};

const compareTracks = (left: SvgNativeSaveTrack, right: SvgNativeSaveTrack): number =>
  left.targetId.localeCompare(right.targetId) || propertyRank(left.property) - propertyRank(right.property) || left.id.localeCompare(right.id);

const compareNormalizedTracks = (left: NormalizedTrack, right: NormalizedTrack): number =>
  left.targetId.localeCompare(right.targetId) || propertyRank(left.property) - propertyRank(right.property) || left.id.localeCompare(right.id);

const parseSvgDocument = (source: string): Document | null => {
  if (typeof DOMParser === "undefined") {
    return null;
  }

  const document = new DOMParser().parseFromString(source, "image/svg+xml");
  return document.querySelector("parsererror") ? null : document;
};

const svgRootFor = (document: Document): Element | null => {
  const root = document.documentElement;
  return root.tagName.toLowerCase() === "svg" ? root : null;
};

const findElementById = (root: Element, id: string): Element | null =>
  Array.from(root.querySelectorAll("[id]")).find((element) => element.getAttribute("id") === id) ?? null;

const isFiniteNumberText = (value: string): boolean => {
  const numericValue = Number(value.trim());
  return Number.isFinite(numericValue);
};

const numberValue = (value: string): number | null => {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const isNumberInRange = (value: number, min: number, max: number): boolean => value >= min && value <= max;

const isValidNumericValue = (property: SvgNativeSaveProperty, value: string): boolean => {
  const parsed = numberValue(value);
  if (parsed === null) {
    return false;
  }

  switch (property) {
    case "opacity":
      return isNumberInRange(parsed, 0, 1);
    case "strokeWidth":
      return isNumberInRange(parsed, 0.5, 8);
    case "strokeDashoffset":
      return true;
    case "x":
      return isNumberInRange(parsed, -220, 220);
    case "y":
      return isNumberInRange(parsed, -220, 220);
    case "scale":
      return isNumberInRange(parsed, 0.2, 2.2);
    case "rotation":
      return isNumberInRange(parsed, -360, 360);
    case "fill":
      return false;
    case "stroke":
      return false;
  }
};

const isHexColor = (value: string): boolean => /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/iu.test(value.trim());

const isRgbColor = (value: string): boolean => {
  const match = /^rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)$/iu.exec(value.trim());
  if (!match) {
    return false;
  }

  const red = Number(match[1]);
  const green = Number(match[2]);
  const blue = Number(match[3]);
  return [red, green, blue].every((part) => Number.isInteger(part) && part >= 0 && part <= 255);
};

const isColorProperty = (property: SvgNativeSaveProperty): boolean => property === "fill" || property === "stroke";

const normalizeValue = (property: SvgNativeSaveProperty, value: string): string | null => {
  const trimmed = value.trim();
  if (trimmed === "" || unsafeStyleValuePattern.test(trimmed)) {
    return null;
  }

  if (isColorProperty(property)) {
    return isHexColor(trimmed) || isRgbColor(trimmed) ? trimmed : null;
  }

  return isFiniteNumberText(trimmed) && isValidNumericValue(property, trimmed) ? String(Number(trimmed)) : null;
};

const keyframeTimeSignature = (track: NormalizedTrack): string => track.keyframes.map((keyframe) => String(keyframe.time)).join(";");

const addWarning = (
  warnings: SvgNativeSaveWarning[],
  code: string,
  severity: SvgNativeSaveSeverity,
  message: string,
  trackId = "",
): void => {
  warnings.push(new SvgNativeSaveWarning(code, severity, message, trackId));
};

const normalizeTrack = (track: SvgNativeSaveTrack, durationMs: number, warnings: SvgNativeSaveWarning[]): NormalizedTrack | null => {
  if (track.muted) {
    addWarning(warnings, "muted-track-skipped", "warning", `Skipped muted track ${track.id}.`, track.id);
    return null;
  }

  if (track.keyframes.length < 2) {
    addWarning(warnings, "too-few-keyframes", "error", `Track ${track.id} needs at least two keyframes for SVG-native save.`, track.id);
    return null;
  }

  const sorted = [...track.keyframes].sort((left, right) => left.time - right.time);
  const normalizedKeyframes: NormalizedKeyframe[] = [];
  let previousTime = -1;

  for (const keyframe of sorted) {
    if (keyframe.easing !== "linear") {
      addWarning(
        warnings,
        "unsupported-easing",
        "error",
        `Track ${track.id} uses ${keyframe.easing} easing; SVG-native save supports linear keyframes only.`,
        track.id,
      );
      return null;
    }

    const time = Math.round(keyframe.time);
    if (!Number.isFinite(time) || time <= previousTime) {
      addWarning(warnings, "invalid-keyframe-time", "error", `Track ${track.id} has non-increasing keyframe times.`, track.id);
      return null;
    }

    const value = normalizeValue(track.property, keyframe.value);
    if (value === null) {
      addWarning(
        warnings,
        "unsupported-value",
        "error",
        `Track ${track.id} has an unsupported ${track.property} value: ${keyframe.value}.`,
        track.id,
      );
      return null;
    }

    previousTime = time;
    normalizedKeyframes.push({ time, value });
  }

  const firstKeyframe = normalizedKeyframes.at(0);
  const lastKeyframe = normalizedKeyframes.at(-1);
  if (firstKeyframe === undefined || lastKeyframe === undefined) {
    addWarning(warnings, "invalid-keyframe-time", "error", `Track ${track.id} has no normalized keyframe times.`, track.id);
    return null;
  }

  const firstTime = firstKeyframe.time;
  const lastTime = lastKeyframe.time;
  if (firstTime < 0 || lastTime > Math.round(durationMs)) {
    addWarning(
      warnings,
      "partial-track-duration",
      "error",
      `Track ${track.id} must stay within the 0ms to ${Math.round(durationMs)}ms timeline for SVG roundtrip save.`,
      track.id,
    );
    return null;
  }

  const normalizedTrack: NormalizedTrack = {
    id: track.id,
    targetId: track.targetId,
    property: track.property,
    keyframes: normalizedKeyframes,
  };

  return normalizedTrack;
};

const removePriorTadpoleNodes = (root: Element): void => {
  Array.from(root.querySelectorAll(`[${authoredAttributeName}="true"], [${metadataAttributeName}="true"]`)).forEach((element) => {
    element.remove();
  });
};

/**
 * Returns keyframes for SVG animation serialization.
 *
 * When isLooping is false, this returns track.keyframes unchanged. When
 * isLooping is true, it may prepend a time=0 hold keyframe or append a
 * time=timelineEndMs hold keyframe, where timelineEndMs is
 * Math.max(1, Math.round(timelineDurationMs)).
 *
 * The function never interpolates and never changes existing keyframe values or
 * times. Empty tracks and single-keyframe tracks are returned with only the
 * boundary padding that can be derived from their existing values.
 *
 * @param track Normalized track with sorted keyframes.
 * @param isLooping Whether the serialized animation repeats indefinitely.
 * @param timelineDurationMs Full timeline duration in milliseconds.
 * @returns The original keyframes for non-looping output, or boundary-padded
 * keyframes for looping output.
 */
const animationKeyframesFor = (
  track: NormalizedTrack,
  isLooping: boolean,
  timelineDurationMs: number,
): readonly NormalizedKeyframe[] => {
  if (!isLooping) {
    return track.keyframes;
  }

  const timelineEndMs = Math.max(1, Math.round(timelineDurationMs));
  const keyframes = [...track.keyframes];
  const firstKeyframe = keyframes.at(0);
  const lastKeyframe = keyframes.at(-1);
  if (firstKeyframe === undefined || lastKeyframe === undefined) {
    return keyframes;
  }
  if (firstKeyframe.time > 0) {
    keyframes.unshift({ time: 0, value: firstKeyframe.value });
  }
  if (lastKeyframe.time < timelineEndMs) {
    keyframes.push({ time: timelineEndMs, value: lastKeyframe.value });
  }
  return keyframes;
};

/**
 * Returns an exact or boundary value for a track without interpolation.
 *
 * The lookup returns the exact keyframe value at time, the first value when
 * time is before the first keyframe, the last value when time is after the last
 * keyframe, or fallback for gaps between keyframes. This is only appropriate
 * when the caller samples known aligned keyframe times.
 */
const exactValueAtTime = (track: NormalizedTrack | null, time: number, fallback: string): string => {
  if (track === null) {
    return fallback;
  }
  const exact = track.keyframes.find((keyframe) => keyframe.time === time);
  if (exact) {
    return exact.value;
  }
  const firstKeyframe = track.keyframes.at(0);
  const lastKeyframe = track.keyframes.at(-1);
  if (firstKeyframe === undefined || lastKeyframe === undefined) {
    return fallback;
  }
  if (time <= firstKeyframe.time) {
    return firstKeyframe.value;
  }
  if (time >= lastKeyframe.time) {
    return lastKeyframe.value;
  }
  return fallback;
};

const applyAnimationAttributes = (
  element: Element,
  track: NormalizedTrack,
  keyframes: readonly NormalizedKeyframe[],
  values: readonly string[],
  isLooping: boolean,
  timelineDurationMs: number,
): void => {
  const beginMs = isLooping ? 0 : keyframes[0]?.time ?? 0;
  const endMs = keyframes[keyframes.length - 1]?.time ?? beginMs;
  const durationMs = isLooping ? Math.max(1, Math.round(timelineDurationMs)) : Math.max(1, endMs - beginMs);
  element.setAttribute("begin", `${Math.round(beginMs)}ms`);
  element.setAttribute("dur", `${Math.round(durationMs)}ms`);
  element.setAttribute("calcMode", "linear");
  element.setAttribute("fill", "freeze");
  element.setAttribute("values", values.join(";"));
  element.setAttribute("keyTimes", keyframes.map((keyframe) => formatKeyTime(keyframe.time, beginMs, durationMs)).join(";"));
  element.setAttribute(authoredAttributeName, "true");
  element.setAttribute("data-tadpole-track-id", track.id);
  element.setAttribute("data-tadpole-property", track.property);
  if (isLooping) {
    element.setAttribute("repeatCount", "indefinite");
  }
};

const appendScalarAnimation = (
  document: Document,
  target: Element,
  track: NormalizedTrack,
  isLooping: boolean,
  timelineDurationMs: number,
): void => {
  const element = document.createElementNS(svgNamespace, "animate");
  const attributeName = attributeNameForProperty(track.property);
  const keyframes = animationKeyframesFor(track, isLooping, timelineDurationMs);
  element.setAttribute("attributeName", attributeName);
  target.setAttribute(attributeName, keyframes[0]?.value ?? "");
  applyAnimationAttributes(
    element,
    track,
    keyframes,
    keyframes.map((keyframe) => keyframe.value),
    isLooping,
    timelineDurationMs,
  );
  target.append(element);
};

const appendTranslateAnimation = (
  document: Document,
  target: Element,
  referenceTrack: NormalizedTrack,
  xTrack: NormalizedTrack | null,
  yTrack: NormalizedTrack | null,
  isLooping: boolean,
  timelineDurationMs: number,
): void => {
  const element = document.createElementNS(svgNamespace, "animateTransform");
  const keyframes = animationKeyframesFor(referenceTrack, isLooping, timelineDurationMs);
  element.setAttribute("attributeName", "transform");
  element.setAttribute("type", "translate");
  applyAnimationAttributes(
    element,
    referenceTrack,
    keyframes,
    keyframes.map((keyframe) => `${exactValueAtTime(xTrack, keyframe.time, "0")} ${exactValueAtTime(yTrack, keyframe.time, "0")}`),
    isLooping,
    timelineDurationMs,
  );
  target.append(element);
};

const appendSingleTransformAnimation = (
  document: Document,
  target: Element,
  track: NormalizedTrack,
  transformType: string,
  isLooping: boolean,
  timelineDurationMs: number,
): void => {
  const element = document.createElementNS(svgNamespace, "animateTransform");
  const keyframes = animationKeyframesFor(track, isLooping, timelineDurationMs);
  element.setAttribute("attributeName", "transform");
  element.setAttribute("type", transformType);
  applyAnimationAttributes(
    element,
    track,
    keyframes,
    keyframes.map((keyframe) => keyframe.value),
    isLooping,
    timelineDurationMs,
  );
  target.append(element);
};

const createMetadataElement = (document: Document, durationMs: number, serializedTrackCount: number): Element => {
  const element = document.createElementNS(svgNamespace, "metadata");
  element.setAttribute(metadataAttributeName, "true");
  element.textContent = JSON.stringify({
    version: "tadpole-svg-native-save-1",
    durationMs: Math.round(durationMs),
    serializedTrackCount,
  });
  return element;
};

const trackFor = (tracks: readonly NormalizedTrack[], targetId: string, property: SvgNativeSaveProperty): NormalizedTrack | null =>
  tracks.find((track) => track.targetId === targetId && track.property === property) ?? null;

const validateDuplicateTracks = (tracks: readonly SvgNativeSaveTrack[], warnings: SvgNativeSaveWarning[]): void => {
  const seen = new Set<string>();
  for (const track of tracks) {
    if (track.muted) {
      continue;
    }

    const key = `${track.targetId}:${track.property}`;
    if (seen.has(key)) {
      addWarning(
        warnings,
        "duplicate-track",
        "error",
        `Target #${track.targetId} has duplicate ${track.property} tracks; SVG-native save needs one track per property.`,
        track.id,
      );
      continue;
    }

    seen.add(key);
  }
};

const validateTransformAlignment = (tracks: readonly NormalizedTrack[], warnings: SvgNativeSaveWarning[]): void => {
  const targetIds = Array.from(new Set(tracks.map((track) => track.targetId))).sort();
  for (const targetId of targetIds) {
    const xTrack = trackFor(tracks, targetId, "x");
    const yTrack = trackFor(tracks, targetId, "y");
    if (!xTrack || !yTrack) {
      continue;
    }
    if (keyframeTimeSignature(xTrack) !== keyframeTimeSignature(yTrack)) {
      addWarning(
        warnings,
        "unaligned-translate-tracks",
        "error",
        `Target #${targetId} translate x/y tracks must share keyframe times for SVG-native save.`,
        `${xTrack.id},${yTrack.id}`,
      );
    }
  }
};

const hasBlockingWarnings = (warnings: readonly SvgNativeSaveWarning[]): boolean => warnings.some((warning) => warning.isBlocking());

const appendAnimations = (
  document: Document,
  root: Element,
  tracks: readonly NormalizedTrack[],
  isLooping: boolean,
  timelineDurationMs: number,
): number => {
  const sortedTargets = Array.from(new Set(tracks.map((track) => track.targetId))).sort();
  let serializedTrackCount = 0;

  for (const targetId of sortedTargets) {
    const target = findElementById(root, targetId);
    if (!target) {
      continue;
    }

    for (const property of scalarProperties) {
      const track = trackFor(tracks, targetId, property);
      if (track) {
        appendScalarAnimation(document, target, track, isLooping, timelineDurationMs);
        serializedTrackCount += 1;
      }
    }

    const xTrack = trackFor(tracks, targetId, "x");
    const yTrack = trackFor(tracks, targetId, "y");
    const translateTrack = xTrack ?? yTrack;
    if (translateTrack) {
      appendTranslateAnimation(document, target, translateTrack, xTrack, yTrack, isLooping, timelineDurationMs);
      serializedTrackCount += (xTrack ? 1 : 0) + (yTrack ? 1 : 0);
    }

    const scaleTrack = trackFor(tracks, targetId, "scale");
    if (scaleTrack) {
      appendSingleTransformAnimation(document, target, scaleTrack, "scale", isLooping, timelineDurationMs);
      serializedTrackCount += 1;
    }

    const rotationTrack = trackFor(tracks, targetId, "rotation");
    if (rotationTrack) {
      appendSingleTransformAnimation(document, target, rotationTrack, "rotate", isLooping, timelineDurationMs);
      serializedTrackCount += 1;
    }
  }

  return serializedTrackCount;
};

export const serializeSvgNativeSave = (request: SvgNativeSaveRequest): SvgNativeSaveResult => {
  const document = parseSvgDocument(request.source);
  if (!document) {
    return SvgNativeSaveResult.blocked([
      new SvgNativeSaveWarning("invalid-svg", "error", "SVG-native save failed because the current SVG could not be parsed."),
    ]);
  }

  const root = svgRootFor(document);
  if (!root) {
    return SvgNativeSaveResult.blocked([
      new SvgNativeSaveWarning("missing-svg-root", "error", "SVG-native save failed because the document root is not an SVG element."),
    ]);
  }

  const durationMs = Math.round(request.durationMs);
  const warnings: SvgNativeSaveWarning[] = [];
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    addWarning(warnings, "invalid-duration", "error", "SVG-native save requires a positive timeline duration.");
  }

  validateDuplicateTracks(request.tracks, warnings);

  const normalizedTracks: NormalizedTrack[] = [];
  for (const track of [...request.tracks].sort(compareTracks)) {
    if (track.muted) {
      addWarning(warnings, "muted-track-skipped", "warning", `Skipped muted track ${track.id}.`, track.id);
      continue;
    }

    if (!findElementById(root, track.targetId)) {
      addWarning(warnings, "missing-target", "error", `Track ${track.id} targets missing SVG element #${track.targetId}.`, track.id);
      continue;
    }

    const normalizedTrack = normalizeTrack(track, durationMs, warnings);
    if (normalizedTrack) {
      normalizedTracks.push(normalizedTrack);
    }
  }

  validateTransformAlignment(normalizedTracks, warnings);

  if (hasBlockingWarnings(warnings)) {
    return SvgNativeSaveResult.blocked(warnings);
  }

  removePriorTadpoleNodes(root);
  const sortedTracks = [...normalizedTracks].sort(compareNormalizedTracks);
  const serializedTrackCount = appendAnimations(document, root, sortedTracks, request.isLooping, durationMs);
  root.insertBefore(createMetadataElement(document, durationMs, serializedTrackCount), root.firstChild);
  const svgText = new XMLSerializer().serializeToString(root);
  return SvgNativeSaveResult.success(svgText, warnings, serializedTrackCount);
};
