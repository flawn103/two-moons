import { action, computed, makeObservable, observable } from "mobx";
import { RollStore } from "../../Roll/Store";
import { getNoteWithOctave, genKeys, getFullNoteStr } from "../../utils/note";
import { isNumber } from "lodash";
import { Drum } from "../../instruments/drum";
import type { Note } from "../../typings/common";
import type { MouseEvent } from "react";

export type KeyboardState = {};
const CODES = ["Q", 2, "W", 3, "E", "R", 5, "T", 6, "Y", 7, "U", "I"];
const NAMES = [
  "C",
  "C#/Db",
  "D",
  "D#/Eb",
  "E",
  "F",
  "F#/Gb",
  "G",
  "G#/Ab",
  "A",
  "A#/Bb",
  "B",
  "C",
];

export const genKeysFnMap = {
  default(noteValues: string[], range?: string[]) {
    return genKeys(noteValues, range);
  },
  drum() {
    return Drum.getDrumKitKeys();
  },
};

export class KeyboardStore {
  contextStore: RollStore;

  instrument: string;
  constructor(context: RollStore, instrument: string) {
    Object.assign(this, {
      instrument,
    });
    this.contextStore = context;
    makeObservable(this);
    // Bind methods to ensure proper 'this' context
    this.handleNoteRightClick = this.handleNoteRightClick.bind(this);
  }

  keyStatusMap: Record<string, boolean> = {};

  @observable isPressing = false;

  // 预览功能相关状态
  @observable isActive = false;
  @observable currentPreviewIndex: number | null = null;
  private playingNotes: string[] = []; // 存储当前播放的音符

  @computed // note到键盘key的映射
  get noteToKeyMap() {
    const re: Record<string, string> = {};

    const context = this.contextStore;
    const contextOctave = context.keyboardOctave;

    NAMES.forEach((name, index) => {
      const code = CODES[index];
      // 最后一个C加一个八度
      const octave =
        index === NAMES.length - 1 ? contextOctave + 1 : contextOctave;
      re[getNoteWithOctave(name, octave)] = isNumber(code)
        ? `Digit${code}`
        : `Key${code}`;
    });

    return re;
  }

  @computed
  get keyToNoteMap() {
    const re: Record<string, string> = {};

    for (let note in this.noteToKeyMap) {
      re[this.noteToKeyMap[note]] = note;
    }

    return re;
  }

  @observable writeState = {
    startNote: <undefined | Note>undefined,
  };

  clearExistNote = (note: Note) => {
    const currNotes = this.contextStore.tracks.find(
      (track) => track.instrument === this.instrument
    )?.notes as Note[];

    let matchExistNote: Note | undefined;
    if (
      (matchExistNote = currNotes.find((currNote) => {
        if (getFullNoteStr(currNote.value).includes(note.value)) {
          if (currNote.duration) {
            if (
              currNote.time <= note.time &&
              note.time <= currNote.time + currNote.duration - 1
            )
              return true;
          } else return currNote.time === note.time;
        }
        return false;
      }))
    ) {
      return currNotes.splice(currNotes.indexOf(matchExistNote), 1);
    }
  };

  @action
  setStartNote = (note: Note) => {
    if (this.clearExistNote(note)) return;
    this.writeState.startNote = note;
  };

  @action
  setEndNote = (note: Note) => {
    const { startNote } = this.writeState;
    if (!startNote || note.value !== startNote.value) return;

    const currNotes = this.contextStore.tracks.find(
      (track) => track.instrument === this.instrument
    )?.notes as Note[];

    currNotes.splice(note.time, 0, {
      value: note.value,
      time: Math.min(note.time, startNote.time),
      duration: Math.abs(note.time - startNote.time) + 1,
    });
    this.writeState.startNote = undefined;
  };

  @action
  onKeydown = (event: KeyboardEvent) => {
    const code = event.code;
    if (this.keyStatusMap[code] === true) return;
    this.keyStatusMap[code] = true;

    const note = this.keyToNoteMap[code];
    if (!note) return;

    this.contextStore.attackNote(this.contextStore.currentTrack, {
      value: this.keyToNoteMap[code],
    });
  };

  onKeyup = (event: KeyboardEvent) => {
    const code = event.code;
    this.keyStatusMap[code] = false;
    const note = this.keyToNoteMap[code];
    if (!note) return;

    this.contextStore.releaseNote(this.contextStore.currentTrack, {
      value: this.keyToNoteMap[code],
    });
  };

  unmountKeyboardEvents = () => {
    window.removeEventListener("keyup", this.onKeyup);
    window.removeEventListener("keydown", this.onKeydown);
  };

  mountKeyboardEvent = () => {
    window.addEventListener("keyup", this.onKeyup);
    window.addEventListener("keydown", this.onKeydown);
  };

  @action
  handleNoteRightClick(event: MouseEvent, note: Note, noteValue: string) {
    event.preventDefault();

    // Create a custom context menu or trigger an annotation dialog
    const annotation = prompt("添加音符注释:", note.tip || "");

    if (annotation !== null) {
      if (annotation.trim() === "") {
        this.contextStore.removeNoteTip(this.instrument, note.time, noteValue);
      } else {
        this.contextStore.addOrUpdateNoteTip(
          this.instrument,
          note.time,
          noteValue,
          annotation.trim()
        );
      }
    }
  }

  // 预览功能方法
  @action
  setPreviewActive = (isActive: boolean, index?: number) => {
    this.isActive = isActive;
    this.currentPreviewIndex = isActive ? (index ?? null) : null;
  };

  @action
  playNotesAtIndex = (timeIndex: number) => {
    // 获取所有轨道在该时间索引的音符
    const allNotes: string[] = [];
    Object.values(this.contextStore.tracks).forEach((track) => {
      const notes = track.notes.filter((note) => {
        const startTime = note.time;
        const endTime = startTime + (note.duration || 1) - 1;
        return timeIndex >= startTime && timeIndex <= endTime;
      });
      notes.forEach((note) => {
        allNotes.push(note.value);
      });
    });

    // 找出需要停止的音符（之前播放但现在不需要的）
    const notesToStop = this.playingNotes.filter(
      (note) => !allNotes.includes(note)
    );
    // 找出需要开始的音符（现在需要但之前没有播放的）
    const notesToStart = allNotes.filter(
      (note) => !this.playingNotes.includes(note)
    );

    // 停止不再需要的音符
    notesToStop.forEach((noteValue) => {
      this.contextStore.releaseNote(this.instrument, { value: noteValue });
    });

    // 播放新的音符
    notesToStart.forEach((noteValue) => {
      this.contextStore.attackNote(this.instrument, { value: noteValue });
    });

    // 记录当前播放的音符
    this.playingNotes = allNotes;
  };

  @action
  stopCurrentNotes = () => {
    // 停止当前播放的音符并清除钢琴键高亮
    this.playingNotes.forEach((noteValue) => {
      this.contextStore.releaseNote(this.instrument, { value: noteValue });
    });
    this.playingNotes = [];
  };
}
