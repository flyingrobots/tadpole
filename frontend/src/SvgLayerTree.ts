import { SvgLayerRow } from "./SvgLayerRow";
import {
  isSelectableSvgTargetElement,
  svgTargetKindFromTag,
  svgTargetNameFromElement,
  type SvgTargetKind,
} from "./SvgTargetMetadata";

export { InvalidSvgLayerRow } from "./InvalidSvgLayerRow";
export { SvgLayerRow } from "./SvgLayerRow";
export type SvgLayerKind = SvgTargetKind;

export class SvgLayerTree {
  readonly rows: readonly SvgLayerRow[];

  constructor(rows: readonly SvgLayerRow[]) {
    this.rows = Object.freeze([...rows]);
    Object.freeze(this);
  }

  static empty(): SvgLayerTree {
    return new SvgLayerTree([]);
  }
}

const visitLayerElement = (
  element: Element,
  parentTargetId: string,
  depth: number,
  rows: SvgLayerRow[],
  seenTargetIds: Set<string>,
): void => {
  const targetId = element.getAttribute("id")?.trim() ?? "";
  const isSelectableTarget = isSelectableSvgTargetElement(element) && !seenTargetIds.has(targetId);
  const nextParentTargetId = isSelectableTarget ? targetId : parentTargetId;
  const nextDepth = isSelectableTarget ? depth + 1 : depth;

  if (isSelectableTarget) {
    seenTargetIds.add(targetId);
    rows.push(
      new SvgLayerRow(
        targetId,
        parentTargetId,
        svgTargetNameFromElement(element, targetId),
        svgTargetKindFromTag(element.tagName),
        depth,
      ),
    );
  }

  Array.from(element.children).forEach((child) => {
    visitLayerElement(child, nextParentTargetId, nextDepth, rows, seenTargetIds);
  });
};

export const buildSvgLayerTree = (source: string): SvgLayerTree => {
  if (typeof DOMParser === "undefined") {
    return SvgLayerTree.empty();
  }

  const document = new DOMParser().parseFromString(source, "image/svg+xml");
  if (document.querySelector("parsererror")) {
    return SvgLayerTree.empty();
  }

  const root = document.documentElement;
  if (root.tagName.toLowerCase() !== "svg") {
    return SvgLayerTree.empty();
  }

  const rows: SvgLayerRow[] = [];
  visitLayerElement(root, "", 0, rows, new Set<string>());
  return new SvgLayerTree(rows);
};
