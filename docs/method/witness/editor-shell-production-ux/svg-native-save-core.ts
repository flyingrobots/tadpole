import {
  SvgNativeSaveRequest,
  SvgNativeSaveResult,
  type SvgNativeSaveTrack,
  SvgNativeSaveWarning,
} from "../../../../frontend/src/SvgNativeSave";

const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const keyframes = [
  { id: "opacity-0", time: 0, value: "0", easing: "linear" },
  { id: "opacity-1000", time: 1000, value: "1", easing: "linear" },
];

const track: SvgNativeSaveTrack = {
  id: "track-box-opacity",
  targetId: "box",
  property: "opacity",
  muted: false,
  keyframes,
};

const tracks: SvgNativeSaveTrack[] = [track];
const request = new SvgNativeSaveRequest("<svg xmlns=\"http://www.w3.org/2000/svg\" />", tracks, 1000, false);

tracks.length = 0;
keyframes[0].value = "1";

assert(request.tracks.length === 1, "request tracks changed when caller-owned tracks array mutated");
assert(request.tracks[0]?.keyframes[0]?.value === "0", "request keyframe changed when caller-owned keyframe mutated");

const warnings = [new SvgNativeSaveWarning("one", "warning", "one")];
const result = SvgNativeSaveResult.blocked(warnings);

warnings.push(new SvgNativeSaveWarning("two", "warning", "two"));

assert(result.warnings.length === 1, "result warnings changed when caller-owned warnings array mutated");

console.log("svg native save core witness passed");
