import { InvalidStarterTimelineValue } from "./InvalidStarterTimelineValue";
import { StarterTimelineKeyframe } from "./StarterTimelineKeyframe";
import { isSvgTargetKind, type SvgTargetKind } from "./SvgTargetMetadata";

const targetIdPattern = /\s/u;

const validateText = (field: string, value: string): string => {
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new InvalidStarterTimelineValue(field, value);
  }
  return trimmed;
};

const validateTargetId = (field: string, value: string): string => {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed !== value || targetIdPattern.test(value)) {
    throw new InvalidStarterTimelineValue(field, value);
  }
  return value;
};

export class StarterTimelineSuggestion {
  readonly id: string;
  readonly targetId: string;
  readonly targetLabel: string;
  readonly targetKind: SvgTargetKind;
  readonly property: string;
  readonly propertyLabel: string;
  readonly reason: string;
  readonly keyframes: readonly StarterTimelineKeyframe[];

  constructor(
    id: string,
    targetId: string,
    targetLabel: string,
    targetKind: string,
    property: string,
    propertyLabel: string,
    reason: string,
    keyframes: readonly StarterTimelineKeyframe[],
  ) {
    if (!isSvgTargetKind(targetKind)) {
      throw new InvalidStarterTimelineValue("targetKind", targetKind);
    }
    if (keyframes.length < 2) {
      throw new InvalidStarterTimelineValue("keyframes", String(keyframes.length));
    }
    this.id = validateTargetId("id", id);
    this.targetId = validateTargetId("targetId", targetId);
    this.targetLabel = validateText("targetLabel", targetLabel);
    this.targetKind = targetKind;
    this.property = validateText("property", property);
    this.propertyLabel = validateText("propertyLabel", propertyLabel);
    this.reason = validateText("reason", reason);
    this.keyframes = Object.freeze([...keyframes]);
    Object.freeze(this);
  }

  withKeyframeValue(index: number, value: string): StarterTimelineSuggestion {
    if (!Number.isInteger(index) || index < 0 || index >= this.keyframes.length) {
      throw new InvalidStarterTimelineValue("keyframeIndex", String(index));
    }
    const nextKeyframes = this.keyframes.map((keyframe, currentIndex) =>
      currentIndex === index ? new StarterTimelineKeyframe(keyframe.time, value, keyframe.easing) : keyframe,
    );
    return new StarterTimelineSuggestion(
      this.id,
      this.targetId,
      this.targetLabel,
      this.targetKind,
      this.property,
      this.propertyLabel,
      this.reason,
      nextKeyframes,
    );
  }
}
