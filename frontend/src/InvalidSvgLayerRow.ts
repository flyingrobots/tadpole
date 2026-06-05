export class InvalidSvgLayerRow extends Error {
  readonly field: string;
  readonly value: string;

  constructor(field: string, value: string) {
    super(`Invalid SVG layer row ${field}: ${value}`);
    this.name = "InvalidSvgLayerRow";
    this.field = field;
    this.value = value;
    Object.freeze(this);
  }
}
