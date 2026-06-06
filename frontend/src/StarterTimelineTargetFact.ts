import { InvalidStarterTimelineValue } from "./InvalidStarterTimelineValue";
import { isSvgTargetKind, type SvgTargetKind } from "./SvgTargetMetadata";

const targetIdPattern = /\s/u;

const validateTargetId = (field: string, value: string): string => {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed !== value || targetIdPattern.test(value)) {
    throw new InvalidStarterTimelineValue(field, value);
  }
  return value;
};

const validateParentTargetId = (value: string): string => {
  if (value === "") {
    return value;
  }
  return validateTargetId("parentTargetId", value);
};

const validateLabel = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new InvalidStarterTimelineValue("label", value);
  }
  return trimmed;
};

const validateIndex = (field: string, value: number): number => {
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidStarterTimelineValue(field, String(value));
  }
  return value;
};

export class StarterTimelineTargetFact {
  readonly targetId: string;
  readonly label: string;
  readonly kind: SvgTargetKind;
  readonly parentTargetId: string;
  readonly depth: number;
  readonly sourceIndex: number;

  constructor(targetId: string, label: string, kind: string, parentTargetId: string, depth: number, sourceIndex: number) {
    if (!isSvgTargetKind(kind)) {
      throw new InvalidStarterTimelineValue("kind", kind);
    }
    this.targetId = validateTargetId("targetId", targetId);
    this.label = validateLabel(label);
    this.kind = kind;
    this.parentTargetId = validateParentTargetId(parentTargetId);
    this.depth = validateIndex("depth", depth);
    this.sourceIndex = validateIndex("sourceIndex", sourceIndex);
    Object.freeze(this);
  }

  includesAny(words: readonly string[]): boolean {
    const haystack = `${this.targetId} ${this.label}`.toLowerCase();
    return words.some((word) => haystack.includes(word));
  }

  sourceDescription(): string {
    const parent = this.parentTargetId === "" ? "root target" : `child of #${this.parentTargetId}`;
    return `${this.kind} ${parent}, depth ${this.depth}, source order ${this.sourceIndex + 1}`;
  }
}
