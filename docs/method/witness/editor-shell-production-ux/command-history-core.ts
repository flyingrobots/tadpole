import {
  AddKeyframeCommand,
  AddTrackCommand,
  DeleteKeyframeCommand,
  dispatchEditorCommand,
  EditorCommandHistory,
  type EditorCommandIntent,
  EditorCommandStateSnapshot,
  type EditorCommandTrack,
  EditorHistoryEntry,
  MoveKeyframeCommand,
  RemoveTrackCommand,
  SetKeyframeValueCommand,
} from "../../../../frontend/src/EditorCommands";

const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

const track: EditorCommandTrack = {
  id: "track-box-opacity",
  targetId: "box",
  property: "opacity",
  muted: false,
  keyframes: [
    { id: "key-0", time: 0, value: "0", easing: "linear" },
    { id: "key-1000", time: 1000, value: "1", easing: "linear" },
  ],
};

let state = new EditorCommandStateSnapshot([track], "box", track.id, "key-0", 0);
let history = EditorCommandHistory.empty();

const assertFrozenSnapshot = (snapshot: EditorCommandStateSnapshot, label: string): void => {
  assert(Object.isFrozen(snapshot), `${label} snapshot wrapper was not frozen`);
  assert(Object.isFrozen(snapshot.tracks), `${label} track list was not frozen`);
  const firstTrack = snapshot.tracks.at(0);
  if (firstTrack === undefined) {
    return;
  }
  assert(Object.isFrozen(firstTrack), `${label} first track was not frozen`);
  assert(
    Object.isFrozen(firstTrack.keyframes),
    `${label} first track keyframes were not frozen`,
  );
  const firstKeyframe = firstTrack.keyframes.at(0);
  assert(firstKeyframe !== undefined, `${label} first track missing first keyframe`);
  assert(Object.isFrozen(firstKeyframe), `${label} first keyframe was not frozen`);
};

const assertFrozenHistory = (candidate: EditorCommandHistory, label: string): void => {
  assert(Object.isFrozen(candidate), `${label} history wrapper was not frozen`);
  assert(Object.isFrozen(candidate.undoStack), `${label} undo stack was not frozen`);
  assert(Object.isFrozen(candidate.redoStack), `${label} redo stack was not frozen`);
  const firstEntry = candidate.undoStack.at(0);
  if (firstEntry) {
    assert(Object.isFrozen(firstEntry), `${label} first undo entry was not frozen`);
    assertFrozenSnapshot(firstEntry.before, `${label} first undo entry before`);
    assertFrozenSnapshot(firstEntry.after, `${label} first undo entry after`);
  }
};

assertFrozenSnapshot(state, "initial");
assertFrozenHistory(history, "initial");

const record = (command: EditorCommandIntent): void => {
  const dispatch = dispatchEditorCommand(state, history, command, true);
  assert(dispatch.changed, `${command.id} did not change state`);
  state = dispatch.state;
  history = dispatch.history;
  assertFrozenSnapshot(state, command.id);
  assertFrozenHistory(history, command.id);
};

const applyWithoutHistory = (command: EditorCommandIntent): void => {
  const dispatch = dispatchEditorCommand(state, history, command, false);
  assert(dispatch.changed, `${command.id} did not change state`);
  state = dispatch.state;
  history = dispatch.history;
};

const currentTrack = () => {
  const foundTrack = state.tracks.find((candidate) => candidate.id === track.id);
  assert(foundTrack !== undefined, "track missing");
  return foundTrack;
};

const keyframeSignature = (): string => currentTrack().keyframes.map((keyframe) => `${keyframe.time}:${keyframe.value}`).join("|");

record(new AddKeyframeCommand(track.id, { id: "key-500", time: 500, value: "0.5", easing: "linear" }));
assert(keyframeSignature() === "0:0|500:0.5|1000:1", `add keyframe failed: ${keyframeSignature()}`);
assert(history.undoStack.length === 1 && history.redoStack.length === 0, "add keyframe history shape mismatch");

record(new SetKeyframeValueCommand(track.id, "key-500", "0.75"));
assert(keyframeSignature() === "0:0|500:0.75|1000:1", `set value failed: ${keyframeSignature()}`);

const dragStartState = state;
const historyBeforeDrag = history;
applyWithoutHistory(new MoveKeyframeCommand(track.id, "key-500", 600));
assert(keyframeSignature() === "0:0|600:0.75|1000:1", `non-history move failed: ${keyframeSignature()}`);
assert(history === historyBeforeDrag, "non-history drag mutation changed history object");
history = history.record(new EditorHistoryEntry("keyframe.move", dragStartState, state));
assert(history.undoStack.length === 3 && history.redoStack.length === 0, "committed drag history shape mismatch");

record(new DeleteKeyframeCommand(track.id, "key-500"));
assert(keyframeSignature() === "0:0|1000:1", `delete keyframe failed: ${keyframeSignature()}`);
assert(history.undoStack.length === 4 && history.redoStack.length === 0, "delete keyframe history shape mismatch");

let move = history.undo();
assert(move.changed && move.state !== null, "undo delete did not produce state");
state = move.state;
history = move.history;
assert(keyframeSignature() === "0:0|600:0.75|1000:1", `undo delete failed: ${keyframeSignature()}`);

move = history.undo();
assert(move.changed && move.state !== null, "undo drag move did not produce state");
state = move.state;
history = move.history;
assert(keyframeSignature() === "0:0|500:0.75|1000:1", `undo drag move failed: ${keyframeSignature()}`);

move = history.redo();
assert(move.changed && move.state !== null, "redo drag move did not produce state");
state = move.state;
history = move.history;
assert(keyframeSignature() === "0:0|600:0.75|1000:1", `redo drag move failed: ${keyframeSignature()}`);

record(new RemoveTrackCommand(track.id));
assert(state.tracks.length === 0, "remove track failed");

move = history.undo();
assert(move.changed && move.state !== null, "undo remove track did not produce state");
state = move.state;
history = move.history;
assert(state.tracks.length === 1 && currentTrack().id === track.id, "undo remove track failed");

record(
  new AddTrackCommand({
    id: "track-box-fill",
    targetId: "box",
    property: "fill",
    muted: false,
    keyframes: [{ id: "fill-0", time: 0, value: "#2563eb", easing: "linear" }],
  }),
);
assert(state.tracks.length === 2, "add track failed after undo");
assert(history.redoStack.length === 0, "new command did not clear redo stack");

const idleUndo = EditorCommandHistory.empty().undo();
assert(!idleUndo.changed && idleUndo.state === null, "empty undo was not idle");

console.log("command history core witness passed");
