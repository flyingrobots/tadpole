import { StarterTimelineSuggestion } from "./StarterTimelineSuggestion";

export class StarterTimelinePlan {
  readonly suggestions: readonly StarterTimelineSuggestion[];

  constructor(suggestions: readonly StarterTimelineSuggestion[]) {
    this.suggestions = Object.freeze([...suggestions]);
    Object.freeze(this);
  }

  static empty(): StarterTimelinePlan {
    return new StarterTimelinePlan([]);
  }
}
