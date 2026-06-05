import { StarterTimelineKeyframe } from "./StarterTimelineKeyframe";
import { StarterTimelinePlan } from "./StarterTimelinePlan";
import { StarterTimelineSuggestion } from "./StarterTimelineSuggestion";
import { StarterTimelineTargetFact } from "./StarterTimelineTargetFact";
import { StarterProfile } from "./StarterProfile";

const starterSuggestionLimit = 4;
const starterDurationMs = 1200;
const starterMidpointMs = 600;
const starterSettleMs = 900;
const labelMatchScore = 1000;
const accentMatchScore = 900;
const arrowMatchScore = 850;
const textKindScore = 800;
const groupKindScore = 200;
const pathKindScore = 150;
const shapeKindScore = 100;
const sourceOrderWeight = 20;

const logoWords = ["logo", "mark", "hero", "main", "title"];
const accentWords = ["dot", "accent", "spark", "pulse", "signal"];
const arrowWords = ["arrow", "connector", "line", "path"];

export class StarterTimelinePlanner {
  plan(targets: readonly StarterTimelineTargetFact[], existingTrackCount: number): StarterTimelinePlan {
    if (targets.length === 0 || existingTrackCount > 0) {
      return StarterTimelinePlan.empty();
    }

    const rankedTargets = [...targets].sort((left, right) => {
      const scoreDelta = this.scoreTarget(right) - this.scoreTarget(left);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return left.sourceIndex - right.sourceIndex;
    });

    const suggestions: StarterTimelineSuggestion[] = [];
    for (const target of rankedTargets) {
      if (suggestions.length >= starterSuggestionLimit) {
        break;
      }
      suggestions.push(this.suggestForTarget(target));
    }

    return new StarterTimelinePlan(suggestions);
  }

  private scoreTarget(target: StarterTimelineTargetFact): number {
    let score = Math.max(0, 400 - target.sourceIndex * sourceOrderWeight);
    if (target.includesAny(logoWords)) {
      score += labelMatchScore;
    }
    if (target.includesAny(accentWords)) {
      score += accentMatchScore;
    }
    if (target.includesAny(arrowWords)) {
      score += arrowMatchScore;
    }
    if (target.kind === "text") {
      score += textKindScore;
    }
    if (target.kind === "group") {
      score += groupKindScore;
    }
    if (target.kind === "path") {
      score += pathKindScore;
    }
    if (target.kind === "shape") {
      score += shapeKindScore;
    }
    return score;
  }

  private suggestForTarget(target: StarterTimelineTargetFact): StarterTimelineSuggestion {
    const profile = this.profileForTarget(target);
    return new StarterTimelineSuggestion(
      `starter-${target.targetId}-${profile.property}`,
      target.targetId,
      target.label,
      target.kind,
      profile.property,
      profile.propertyLabel,
      `${profile.reason}; ${target.sourceDescription()}`,
      profile.keyframes,
    );
  }

  private profileForTarget(target: StarterTimelineTargetFact): StarterProfile {
    if (target.includesAny(logoWords) || target.kind === "group") {
      return this.opacityProfile("label match: logo, mark, hero, main, title, or group target");
    }
    if (target.includesAny(accentWords)) {
      return this.scaleProfile("label match: dot, accent, spark, pulse, or signal");
    }
    if (target.includesAny(arrowWords) || target.kind === "path") {
      return this.translateXProfile("label match: arrow, connector, line, path, or path target");
    }
    if (target.kind === "text") {
      return this.translateYProfile("text target");
    }
    return this.translateYProfile("shape target");
  }

  private opacityProfile(reason: string): StarterProfile {
    return new StarterProfile("opacity", "Opacity", reason, [
      new StarterTimelineKeyframe(0, "0", "linear"),
      new StarterTimelineKeyframe(starterSettleMs, "1", "power2.out"),
    ]);
  }

  private scaleProfile(reason: string): StarterProfile {
    return new StarterProfile("scale", "Scale", reason, [
      new StarterTimelineKeyframe(0, "0.85", "linear"),
      new StarterTimelineKeyframe(starterMidpointMs, "1.12", "power2.out"),
      new StarterTimelineKeyframe(starterDurationMs, "1", "power1.inOut"),
    ]);
  }

  private translateXProfile(reason: string): StarterProfile {
    return new StarterProfile("x", "Translate X", reason, [
      new StarterTimelineKeyframe(0, "-18", "linear"),
      new StarterTimelineKeyframe(starterSettleMs, "0", "power2.out"),
    ]);
  }

  private translateYProfile(reason: string): StarterProfile {
    return new StarterProfile("y", "Translate Y", reason, [
      new StarterTimelineKeyframe(0, "12", "linear"),
      new StarterTimelineKeyframe(starterSettleMs, "0", "power2.out"),
    ]);
  }
}
