export type SvgTargetKind = "group" | "path" | "text" | "shape";

const selectableSvgTargetTags = ["svg", "g", "path", "text", "rect", "circle", "ellipse", "line", "polyline", "polygon"];
const selectableSvgTargetTagSet = new Set(selectableSvgTargetTags);

export const selectableSvgTargetSelector = selectableSvgTargetTags.join(",");

export const isSvgTargetKind = (value: string): value is SvgTargetKind =>
  value === "group" || value === "path" || value === "text" || value === "shape";

export const isSelectableSvgTargetElement = (element: Element): boolean => {
  const id = element.getAttribute("id")?.trim() ?? "";
  return id !== "" && selectableSvgTargetTagSet.has(element.tagName.toLowerCase());
};

export const svgTargetKindFromTag = (tagName: string): SvgTargetKind => {
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

export const svgTargetNameFromElement = (element: Element, id: string): string => {
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
