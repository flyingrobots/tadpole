export class InvalidStarterTimelineValue extends Error {
  readonly field: string;
  readonly value: string;

  constructor(field: string, value: string) {
    super(`Invalid starter timeline ${field}: ${value}`);
    this.name = "InvalidStarterTimelineValue";
    this.field = field;
    this.value = value;
    Object.freeze(this);
  }
}
