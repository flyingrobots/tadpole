export type SvgLayerKind = "group" | "path" | "text" | "shape";

export class SvgLayerRow {
  readonly targetId: string;
  readonly parentTargetId: string;
  readonly label: string;
  readonly kind: SvgLayerKind;
  readonly depth: number;

  constructor(targetId: string, parentTargetId: string, label: string, kind: SvgLayerKind, depth: number) {
    this.targetId = targetId;
    this.parentTargetId = parentTargetId;
    this.label = label;
    this.kind = kind;
    this.depth = depth;
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

const selectableTags = new Set(["svg", "g", "path", "text", "rect", "circle", "ellipse", "line", "polyline", "polygon"]);

const svgKindFromTag = (tagName: string): SvgLayerKind => {
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
    .replace(/[-_]+/gu, " ")
    .replace(/([a-z])([A-Z])/gu, "$1 $2")
    .trim()
    .replace(/\b\w/gu, (letter) => letter.toUpperCase());

const directChildText = (element: Element, tagName: string): string => {
  const child = Array.from(element.children).find((candidate) => candidate.tagName.toLowerCase() === tagName);
  if (!child) {
    return "";
  }
  return child.textContent.trim();
};

const referencedLabelText = (element: Element): string => {
  const labelIds = element.getAttribute("aria-labelledby")?.trim();
  if (!labelIds) {
    return "";
  }

  return labelIds
    .split(/\s+/u)
    .map((id) => {
      const labelElement = element.ownerDocument.getElementById(id);
      return labelElement ? labelElement.textContent.trim() : "";
    })
    .filter(Boolean)
    .join(" ");
};

const nameFromSvgElement = (element: Element, id: string): string => {
  const explicitName = element.getAttribute("data-tadpole-name") ?? element.getAttribute("aria-label");
  if (explicitName?.trim()) {
    return explicitName.trim();
  }

  const referencedLabel = referencedLabelText(element);
  if (referencedLabel) {
    return referencedLabel;
  }

  const titleLabel = directChildText(element, "title");
  if (titleLabel) {
    return titleLabel;
  }

  const descriptionLabel = directChildText(element, "desc");
  if (descriptionLabel) {
    return descriptionLabel;
  }

  if (element.tagName.toLowerCase() === "text") {
    const textLabel = element.textContent.trim();
    if (textLabel) {
      return `${textLabel} Text`;
    }
  }

  return nameFromId(id) || id;
};

const visitLayerElement = (
  element: Element,
  parentTargetId: string,
  depth: number,
  rows: SvgLayerRow[],
  seenTargetIds: Set<string>,
): void => {
  const tagName = element.tagName.toLowerCase();
  const targetId = element.getAttribute("id")?.trim() ?? "";
  const isSelectableTarget = targetId !== "" && selectableTags.has(tagName) && !seenTargetIds.has(targetId);
  const nextParentTargetId = isSelectableTarget ? targetId : parentTargetId;
  const nextDepth = isSelectableTarget ? depth + 1 : depth;

  if (isSelectableTarget) {
    seenTargetIds.add(targetId);
    rows.push(new SvgLayerRow(targetId, parentTargetId, nameFromSvgElement(element, targetId), svgKindFromTag(tagName), depth));
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
