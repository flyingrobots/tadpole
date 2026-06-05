import { InvalidSvgLayerRow } from "./InvalidSvgLayerRow";
import { isSvgTargetKind, type SvgTargetKind } from "./SvgTargetMetadata";

const targetIdPartPattern = /\s/u;

const validateTargetId = (value: string, field: string): string => {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed !== value || targetIdPartPattern.test(value)) {
    throw new InvalidSvgLayerRow(field, value);
  }
  return value;
};

const validateParentTargetId = (value: string): string => {
  if (value === "") {
    return value;
  }
  return validateTargetId(value, "parentTargetId");
};

const validateLabel = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed === "") {
    throw new InvalidSvgLayerRow("label", value);
  }
  return trimmed;
};

const validateDepth = (value: number): number => {
  if (!Number.isInteger(value) || value < 0) {
    throw new InvalidSvgLayerRow("depth", String(value));
  }
  return value;
};

export class SvgLayerRow {
  readonly targetId: string;
  readonly parentTargetId: string;
  readonly label: string;
  readonly kind: SvgTargetKind;
  readonly depth: number;

  constructor(targetId: string, parentTargetId: string, label: string, kind: SvgTargetKind, depth: number) {
    if (!isSvgTargetKind(kind)) {
      throw new InvalidSvgLayerRow("kind", kind);
    }

    this.targetId = validateTargetId(targetId, "targetId");
    this.parentTargetId = validateParentTargetId(parentTargetId);
    this.label = validateLabel(label);
    this.kind = kind;
    this.depth = validateDepth(depth);
    Object.freeze(this);
  }

  matches(query: string): boolean {
    const normalized = query.trim().toLowerCase();
    if (normalized === "") {
      return true;
    }

    return (
      this.targetId.toLowerCase().includes(normalized) ||
      this.parentTargetId.toLowerCase().includes(normalized) ||
      this.label.toLowerCase().includes(normalized) ||
      this.kind.toLowerCase().includes(normalized)
    );
  }
}
