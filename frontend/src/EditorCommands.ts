export type EditorCommandProperty =
  | "x"
  | "y"
  | "scale"
  | "rotation"
  | "opacity"
  | "fillOpacity"
  | "fill"
  | "stroke"
  | "strokeWidth"
  | "strokeDashoffset";

export type EditorCommandEasing = "linear" | "power1.inOut" | "power2.out" | "power3.inOut" | "expo.out" | "back.inOut";

export type EditorCommandId =
  | "target.select"
  | "track.add"
  | "track.addMany"
  | "track.remove"
  | "keyframe.set"
  | "keyframe.move"
  | "keyframe.delete"
  | "edit.undo"
  | "edit.redo"
  | "timeline.seek";

export type EditorCommandKeyframe = {
  readonly id: string;
  readonly time: number;
  readonly value: string;
  readonly easing: EditorCommandEasing;
};

export type EditorCommandTrack = {
  readonly id: string;
  readonly targetId: string;
  readonly property: EditorCommandProperty;
  readonly keyframes: readonly EditorCommandKeyframe[];
  readonly muted: boolean;
};

const cloneKeyframe = (keyframe: EditorCommandKeyframe): EditorCommandKeyframe =>
  Object.freeze({
    id: keyframe.id,
    time: keyframe.time,
    value: keyframe.value,
    easing: keyframe.easing,
  });

const cloneTrack = (track: EditorCommandTrack): EditorCommandTrack =>
  Object.freeze({
    id: track.id,
    targetId: track.targetId,
    property: track.property,
    muted: track.muted,
    keyframes: Object.freeze(track.keyframes.map(cloneKeyframe)),
  });

const cloneTracks = (tracks: readonly EditorCommandTrack[]): readonly EditorCommandTrack[] =>
  Object.freeze(tracks.map(cloneTrack));

const sortKeyframes = (keyframes: readonly EditorCommandKeyframe[]): readonly EditorCommandKeyframe[] =>
  [...keyframes].sort((left, right) => left.time - right.time);

const sameKeyframe = (left: EditorCommandKeyframe, right: EditorCommandKeyframe): boolean =>
  left.id === right.id && left.time === right.time && left.value === right.value && left.easing === right.easing;

const sameTrack = (left: EditorCommandTrack, right: EditorCommandTrack): boolean =>
  left.id === right.id &&
  left.targetId === right.targetId &&
  left.property === right.property &&
  left.muted === right.muted &&
  left.keyframes.length === right.keyframes.length &&
  left.keyframes.every((keyframe, index) => {
    const rightKeyframe = right.keyframes.at(index);
    return rightKeyframe !== undefined && sameKeyframe(keyframe, rightKeyframe);
  });

export class EditorCommandStateSnapshot {
  readonly tracks: readonly EditorCommandTrack[];
  readonly selectedTargetId: string;
  readonly selectedTrackId: string;
  readonly selectedKeyframeId: string;
  readonly currentTime: number;

  constructor(
    tracks: readonly EditorCommandTrack[],
    selectedTargetId: string,
    selectedTrackId: string,
    selectedKeyframeId: string,
    currentTime: number,
  ) {
    this.tracks = cloneTracks(tracks);
    this.selectedTargetId = selectedTargetId;
    this.selectedTrackId = selectedTrackId;
    this.selectedKeyframeId = selectedKeyframeId;
    this.currentTime = currentTime;
    Object.freeze(this);
  }

  equals(other: EditorCommandStateSnapshot): boolean {
    return (
      this.selectedTargetId === other.selectedTargetId &&
      this.selectedTrackId === other.selectedTrackId &&
      this.selectedKeyframeId === other.selectedKeyframeId &&
      this.currentTime === other.currentTime &&
      this.tracks.length === other.tracks.length &&
      this.tracks.every((track, index) => {
        const otherTrack = other.tracks.at(index);
        return otherTrack !== undefined && sameTrack(track, otherTrack);
      })
    );
  }
}

export abstract class EditorCommandIntent {
  readonly id: EditorCommandId;

  protected constructor(id: EditorCommandId) {
    this.id = id;
  }

  abstract apply(state: EditorCommandStateSnapshot): EditorCommandStateSnapshot;
}

export class SelectTargetCommand extends EditorCommandIntent {
  readonly targetId: string;
  readonly syncedTrackId: string;

  constructor(targetId: string, syncedTrackId = "") {
    super("target.select");
    this.targetId = targetId;
    this.syncedTrackId = syncedTrackId;
    Object.freeze(this);
  }

  apply(state: EditorCommandStateSnapshot): EditorCommandStateSnapshot {
    const track = this.syncedTrackId ? state.tracks.find((candidate) => candidate.id === this.syncedTrackId) : null;
    return new EditorCommandStateSnapshot(
      state.tracks,
      this.targetId,
      track?.id ?? (this.syncedTrackId ? "" : state.selectedTrackId),
      track ? "" : state.selectedKeyframeId,
      state.currentTime,
    );
  }
}

export class SeekTimelineCommand extends EditorCommandIntent {
  readonly time: number;

  constructor(time: number) {
    super("timeline.seek");
    this.time = time;
    Object.freeze(this);
  }

  apply(state: EditorCommandStateSnapshot): EditorCommandStateSnapshot {
    return new EditorCommandStateSnapshot(
      state.tracks,
      state.selectedTargetId,
      state.selectedTrackId,
      state.selectedKeyframeId,
      this.time,
    );
  }
}

export class AddTrackCommand extends EditorCommandIntent {
  readonly track: EditorCommandTrack;

  constructor(track: EditorCommandTrack) {
    super("track.add");
    this.track = cloneTrack(track);
    Object.freeze(this);
  }

  apply(state: EditorCommandStateSnapshot): EditorCommandStateSnapshot {
    return new EditorCommandStateSnapshot(
      [...state.tracks, this.track],
      this.track.targetId,
      this.track.id,
      "",
      state.currentTime,
    );
  }
}

export class AddTracksCommand extends EditorCommandIntent {
  readonly tracks: readonly EditorCommandTrack[];

  constructor(tracks: readonly EditorCommandTrack[]) {
    super("track.addMany");
    this.tracks = cloneTracks(tracks);
    Object.freeze(this);
  }

  apply(state: EditorCommandStateSnapshot): EditorCommandStateSnapshot {
    const lastTrack = this.tracks.at(-1);
    if (lastTrack === undefined) {
      return state;
    }
    return new EditorCommandStateSnapshot(
      [...state.tracks, ...this.tracks],
      lastTrack.targetId,
      lastTrack.id,
      "",
      state.currentTime,
    );
  }
}

export class RemoveTrackCommand extends EditorCommandIntent {
  readonly trackId: string;

  constructor(trackId: string) {
    super("track.remove");
    this.trackId = trackId;
    Object.freeze(this);
  }

  apply(state: EditorCommandStateSnapshot): EditorCommandStateSnapshot {
    const nextTracks = state.tracks.filter((track) => track.id !== this.trackId);
    const removedSelectedTrack = state.selectedTrackId === this.trackId;
    const nextSelectedTrack = removedSelectedTrack ? nextTracks[0] : state.tracks.find((track) => track.id === state.selectedTrackId);
    return new EditorCommandStateSnapshot(
      nextTracks,
      nextSelectedTrack?.targetId ?? state.selectedTargetId,
      nextSelectedTrack?.id ?? "",
      removedSelectedTrack ? "" : state.selectedKeyframeId,
      state.currentTime,
    );
  }
}

export class AddKeyframeCommand extends EditorCommandIntent {
  readonly trackId: string;
  readonly keyframe: EditorCommandKeyframe;

  constructor(trackId: string, keyframe: EditorCommandKeyframe) {
    super("keyframe.set");
    this.trackId = trackId;
    this.keyframe = cloneKeyframe(keyframe);
    Object.freeze(this);
  }

  apply(state: EditorCommandStateSnapshot): EditorCommandStateSnapshot {
    const nextTracks = state.tracks.map((track) => {
      if (track.id !== this.trackId) {
        return track;
      }
      const existing = track.keyframes.find((keyframe) => keyframe.time === this.keyframe.time);
      const nextKeyframes = existing
        ? track.keyframes.map((keyframe) => (keyframe.id === existing.id ? { ...keyframe, value: this.keyframe.value } : keyframe))
        : [...track.keyframes, this.keyframe];
      return { ...track, keyframes: sortKeyframes(nextKeyframes) };
    });
    const nextTrack = nextTracks.find((track) => track.id === this.trackId);
    const selectedKeyframe = nextTrack?.keyframes.find((keyframe) => keyframe.time === this.keyframe.time);
    return new EditorCommandStateSnapshot(
      nextTracks,
      nextTrack?.targetId ?? state.selectedTargetId,
      nextTrack?.id ?? state.selectedTrackId,
      selectedKeyframe?.id ?? state.selectedKeyframeId,
      this.keyframe.time,
    );
  }
}

export class MoveKeyframeCommand extends EditorCommandIntent {
  readonly trackId: string;
  readonly keyframeId: string;
  readonly time: number;

  constructor(trackId: string, keyframeId: string, time: number) {
    super("keyframe.move");
    this.trackId = trackId;
    this.keyframeId = keyframeId;
    this.time = time;
    Object.freeze(this);
  }

  apply(state: EditorCommandStateSnapshot): EditorCommandStateSnapshot {
    const nextTracks = state.tracks.map((track) =>
      track.id === this.trackId
        ? {
            ...track,
            keyframes: sortKeyframes(
              track.keyframes.map((keyframe) => (keyframe.id === this.keyframeId ? { ...keyframe, time: this.time } : keyframe)),
            ),
          }
        : track,
    );
    return new EditorCommandStateSnapshot(
      nextTracks,
      state.selectedTargetId,
      state.selectedTrackId,
      state.selectedKeyframeId,
      state.selectedTrackId === this.trackId && state.selectedKeyframeId === this.keyframeId ? this.time : state.currentTime,
    );
  }
}

export class SetKeyframeValueCommand extends EditorCommandIntent {
  readonly trackId: string;
  readonly keyframeId: string;
  readonly value: string;

  constructor(trackId: string, keyframeId: string, value: string) {
    super("keyframe.set");
    this.trackId = trackId;
    this.keyframeId = keyframeId;
    this.value = value;
    Object.freeze(this);
  }

  apply(state: EditorCommandStateSnapshot): EditorCommandStateSnapshot {
    const nextTracks = state.tracks.map((track) =>
      track.id === this.trackId
        ? {
            ...track,
            keyframes: track.keyframes.map((keyframe) =>
              keyframe.id === this.keyframeId ? { ...keyframe, value: this.value } : keyframe,
            ),
          }
        : track,
    );
    return new EditorCommandStateSnapshot(
      nextTracks,
      state.selectedTargetId,
      state.selectedTrackId,
      state.selectedKeyframeId,
      state.currentTime,
    );
  }
}

export class SetKeyframeEasingCommand extends EditorCommandIntent {
  readonly trackId: string;
  readonly keyframeId: string;
  readonly easing: EditorCommandEasing;

  constructor(trackId: string, keyframeId: string, easing: EditorCommandEasing) {
    super("keyframe.set");
    this.trackId = trackId;
    this.keyframeId = keyframeId;
    this.easing = easing;
    Object.freeze(this);
  }

  apply(state: EditorCommandStateSnapshot): EditorCommandStateSnapshot {
    const nextTracks = state.tracks.map((track) =>
      track.id === this.trackId
        ? {
            ...track,
            keyframes: track.keyframes.map((keyframe) =>
              keyframe.id === this.keyframeId ? { ...keyframe, easing: this.easing } : keyframe,
            ),
          }
        : track,
    );
    return new EditorCommandStateSnapshot(
      nextTracks,
      state.selectedTargetId,
      state.selectedTrackId,
      state.selectedKeyframeId,
      state.currentTime,
    );
  }
}

export class DeleteKeyframeCommand extends EditorCommandIntent {
  readonly trackId: string;
  readonly keyframeId: string;

  constructor(trackId: string, keyframeId: string) {
    super("keyframe.delete");
    this.trackId = trackId;
    this.keyframeId = keyframeId;
    Object.freeze(this);
  }

  apply(state: EditorCommandStateSnapshot): EditorCommandStateSnapshot {
    const nextTracks = state.tracks.map((track) =>
      track.id === this.trackId ? { ...track, keyframes: track.keyframes.filter((keyframe) => keyframe.id !== this.keyframeId) } : track,
    );
    return new EditorCommandStateSnapshot(
      nextTracks,
      state.selectedTargetId,
      state.selectedTrackId,
      state.selectedTrackId === this.trackId && state.selectedKeyframeId === this.keyframeId ? "" : state.selectedKeyframeId,
      state.currentTime,
    );
  }
}

export class EditorHistoryEntry {
  readonly commandId: EditorCommandId;
  readonly before: EditorCommandStateSnapshot;
  readonly after: EditorCommandStateSnapshot;

  constructor(commandId: EditorCommandId, before: EditorCommandStateSnapshot, after: EditorCommandStateSnapshot) {
    this.commandId = commandId;
    this.before = before;
    this.after = after;
    Object.freeze(this);
  }
}

export class EditorCommandHistory {
  readonly undoStack: readonly EditorHistoryEntry[];
  readonly redoStack: readonly EditorHistoryEntry[];

  constructor(undoStack: readonly EditorHistoryEntry[], redoStack: readonly EditorHistoryEntry[]) {
    this.undoStack = Object.freeze([...undoStack]);
    this.redoStack = Object.freeze([...redoStack]);
    Object.freeze(this);
  }

  static empty(): EditorCommandHistory {
    return new EditorCommandHistory([], []);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  record(entry: EditorHistoryEntry): EditorCommandHistory {
    return new EditorCommandHistory([...this.undoStack, entry], []);
  }

  undo(): EditorHistoryMove {
    if (this.undoStack.length === 0) {
      return EditorHistoryMove.idle(this);
    }
    const entry = this.undoStack.at(-1);
    if (entry === undefined) {
      return EditorHistoryMove.idle(this);
    }
    return EditorHistoryMove.changed(
      entry.before,
      new EditorCommandHistory(this.undoStack.slice(0, -1), [...this.redoStack, entry]),
      entry.commandId,
    );
  }

  redo(): EditorHistoryMove {
    if (this.redoStack.length === 0) {
      return EditorHistoryMove.idle(this);
    }
    const entry = this.redoStack.at(-1);
    if (entry === undefined) {
      return EditorHistoryMove.idle(this);
    }
    return EditorHistoryMove.changed(
      entry.after,
      new EditorCommandHistory([...this.undoStack, entry], this.redoStack.slice(0, -1)),
      entry.commandId,
    );
  }
}

export class EditorCommandDispatch {
  readonly state: EditorCommandStateSnapshot;
  readonly history: EditorCommandHistory;
  readonly changed: boolean;
  readonly commandId: EditorCommandId;

  constructor(state: EditorCommandStateSnapshot, history: EditorCommandHistory, changed: boolean, commandId: EditorCommandId) {
    this.state = state;
    this.history = history;
    this.changed = changed;
    this.commandId = commandId;
    Object.freeze(this);
  }
}

export class EditorHistoryMove {
  readonly state: EditorCommandStateSnapshot | null;
  readonly history: EditorCommandHistory;
  readonly changed: boolean;
  readonly commandId: EditorCommandId | null;

  private constructor(
    state: EditorCommandStateSnapshot | null,
    history: EditorCommandHistory,
    changed: boolean,
    commandId: EditorCommandId | null,
  ) {
    this.state = state;
    this.history = history;
    this.changed = changed;
    this.commandId = commandId;
    Object.freeze(this);
  }

  static idle(history: EditorCommandHistory): EditorHistoryMove {
    return new EditorHistoryMove(null, history, false, null);
  }

  static changed(state: EditorCommandStateSnapshot, history: EditorCommandHistory, commandId: EditorCommandId): EditorHistoryMove {
    return new EditorHistoryMove(state, history, true, commandId);
  }
}

export const dispatchEditorCommand = (
  state: EditorCommandStateSnapshot,
  history: EditorCommandHistory,
  command: EditorCommandIntent,
  recordHistory: boolean,
): EditorCommandDispatch => {
  const nextState = command.apply(state);
  if (state.equals(nextState)) {
    return new EditorCommandDispatch(state, history, false, command.id);
  }

  const nextHistory = recordHistory ? history.record(new EditorHistoryEntry(command.id, state, nextState)) : history;
  return new EditorCommandDispatch(nextState, nextHistory, true, command.id);
};
