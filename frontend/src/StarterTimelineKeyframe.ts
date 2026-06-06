import { InvalidStarterTimelineValue } from "./InvalidStarterTimelineValue";

const validateTime = (time: number): number => {
  if (!Number.isInteger(time) || time < 0) {
    throw new InvalidStarterTimelineValue("time", String(time));
  }
  return time;
};

const validateText = (field: string, value: string): string => {
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new InvalidStarterTimelineValue(field, value);
  }
  return trimmed;
};

export class StarterTimelineKeyframe {
  readonly time: number;
  readonly value: string;
  readonly easing: string;

  constructor(time: number, value: string, easing: string) {
    this.time = validateTime(time);
    this.value = validateText("value", value);
    this.easing = validateText("easing", easing);
    Object.freeze(this);
  }
}
