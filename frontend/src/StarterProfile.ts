import { StarterTimelineKeyframe } from "./StarterTimelineKeyframe";

export class StarterProfile {
  readonly property: string;
  readonly propertyLabel: string;
  readonly reason: string;
  readonly keyframes: readonly StarterTimelineKeyframe[];

  constructor(property: string, propertyLabel: string, reason: string, keyframes: readonly StarterTimelineKeyframe[]) {
    this.property = property;
    this.propertyLabel = propertyLabel;
    this.reason = reason;
    this.keyframes = Object.freeze([...keyframes]);
    Object.freeze(this);
  }
}
