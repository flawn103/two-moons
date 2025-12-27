import { Bass, Piano, Drum } from "../instruments";
import _, { split } from "lodash";
import {
  action,
  makeObservable,
  observable,
  computed,
  autorun,
  IReactionDisposer,
} from "mobx";
import { MoaTone, MoaSynth, MoaTimeType } from "../../../utils/MoaTone";
import { Note, NoteOnlyValue } from "../typings/common";
import { compareNoteStr, getFullNoteStr } from "../utils/note";
import { CommonKeyboard } from "../components/keyboards";
import { BaseInstrument } from "../instruments/base";
import { isFunction } from "lodash";
import { OBSERVER_FIELDS } from "./constants";
import { isBrowser } from "../utils/env";

export type Status = "stop" | "playing";
export type Track = {
  instrument: string;
  notes: Note[];
  range?: [string, string];
};

export interface RollState {
  currentTrack: string;
  keyboardOctave: number;
  step: number;
  timeLength: number | undefined;
  tracks: Track[];
  activeKeys: Record<string, string[]>;
  bpm: number;
  status: Status;
  squash: boolean;
  height?: number;
  width?: number;
  scale?: {
    root: string;
    type: string;
  };
  keyboards: Record<string, React.FC>;
  instrument: Record<string, MoaSynth>;
}

export class RollStore implements RollState {
  observeDisposer: IReactionDisposer;

  @observable squash: boolean = true;
  @observable scale: RollState["scale"] = undefined;
  @observable height: number = 300;
  @observable width: number = 300;
  @observable currentTrack = "piano";
  @observable step = -1;
  @observable keyboardOctave: number = 4;
  @observable timeLength: RollState["timeLength"] = undefined;
  @observable status: RollState["status"] = "stop";
  @observable tracks: RollState["tracks"] = [];
  @observable bpm: number = 90;
  @observable activeKeys: RollState["activeKeys"] = {};

  instrument = {};
  keyboards: Record<string, React.FC> = {};
  ctrs: Record<string, typeof BaseInstrument> = {};

  keyboardPiano?: boolean = false;

  // 添加实例级别的事件 ID 跟踪
  private scheduleRepeatEventId: string | null = null;
  private scheduledEventIds: Set<string> = new Set();

  events: Record<string, Function | undefined> = {
    onPlayEnd: undefined,
    onDataChange: undefined,
  };

  registInstrument = (
    name: string,
    {
      instrument,
      keyboard,
      ctr,
    }: {
      ctr?: typeof BaseInstrument;
      instrument?: BaseInstrument;
      keyboard?: React.FC;
    }
  ) => {
    instrument && (this.instrument[name] = instrument);
    ctr && (this.ctrs[name] = ctr);
    keyboard && (this.keyboards[name] = keyboard);
    this.activeKeys[name] = [];
  };

  constructor(initialState: Partial<RollState> | undefined) {
    makeObservable(this);
    this.setData(initialState);
    this.init();
  }

  @action changeTrack = (instrument: string) => {
    this.currentTrack = instrument;
  };

  @action changeCurrentTrackOctave = (
    position: "top" | "bottom",
    value: number
  ) => {
    const track = this.tracks.find(
      (track) => track.instrument === this.currentTrack
    );

    if (position === "top") {
      if (!track?.range?.[1]) return;
      const noteStr = track?.range[1] as string;
      const [name, octave] = noteStr?.split("");
      const newOctave = Number(octave) + value;
      const newStr = `${name}${newOctave <= 1 ? octave : newOctave}`;
      const bottomStr = track.range[0];
      if (compareNoteStr(newStr, bottomStr) <= 0) return;

      track.range[1] = newStr;
    }

    if (position === "bottom") {
      if (!track?.range?.[0]) return;
      const noteStr = track?.range[0] as string;
      const [name, octave] = noteStr?.split("");
      const newOctave = Number(octave) + value;
      const newStr = `${name}${newOctave <= 1 ? octave : newOctave}`;
      const topStr = track.range[1];
      if (compareNoteStr(newStr, topStr) >= 0) return;

      track.range[0] = newStr;
    }
  };

  @action
  setData = (data: Partial<RollState> | undefined) => {
    Object.assign(this, data);

    if (isBrowser()) {
      MoaTone.Transport.bpm = this.bpm;
    }
  };

  @action
  clearTrack = () => {
    this.tracks.forEach((track) => {
      track.notes = [];
    });
  };

  @action
  addOrUpdateNoteTip = (
    instrument: string,
    noteTime: number,
    noteValue: string,
    tip: string
  ) => {
    const track = this.tracks.find((track) => track.instrument === instrument);
    if (!track) return;

    const note = track.notes.find(
      (n) => n.time === noteTime && n.value === noteValue
    );
    if (note) {
      note.tip = tip;
    }
  };

  @action
  removeNoteTip = (instrument: string, noteTime: number, noteValue: string) => {
    const track = this.tracks.find((track) => track.instrument === instrument);
    if (!track) return;

    const note = track.notes.find(
      (n) => n.time === noteTime && n.value === noteValue
    );
    if (note) {
      delete note.tip;
    }
  };

  @action
  setKeyboardOctave = (value: number) => {
    this.keyboardOctave = value;
  };

  initChangeObserver = () => {
    this.observeDisposer = autorun(() => {
      const newData = _.cloneDeep(_.pick(this, OBSERVER_FIELDS));
      isFunction(this.events.onDataChange) && this.events.onDataChange(newData);
    });
  };

  init = () => {
    this.initChangeObserver();

    this.registInstrument("piano", { keyboard: CommonKeyboard, ctr: Piano });
    this.registInstrument("bass", { keyboard: CommonKeyboard, ctr: Bass });
    this.registInstrument("drum", { keyboard: CommonKeyboard, ctr: Drum });

    if (isBrowser()) {
      this.registInstrument("piano", { instrument: new Piano() });
      this.registInstrument("bass", { instrument: new Bass() });
      this.registInstrument("drum", { instrument: new Drum() });
    }
  };

  @computed get defaultTimeLength() {
    const maxValues: number[] = [];
    this.tracks.forEach((track) => {
      const notes = track.notes as { time: number }[];
      if (!notes.length) return;
      maxValues.push(
        notes.slice().sort((a, b) => a.time - b.time)[notes.length - 1].time + 1
      );
    });

    return maxValues.sort((a, b) => a - b)[maxValues.length - 1] || 0;
  }

  @computed get keyboardLength() {
    return this.timeLength || this.defaultTimeLength;
  }

  @action
  start = () => {
    MoaTone.start();
    MoaTone.Transport.start();
  };

  @action
  play = () => {
    this.stop(false);
    // if (this.status === "playing") return;
    this.start();

    this.status = "playing";
    // 保存 scheduleRepeat 返回的事件 ID
    this.scheduleRepeatEventId = MoaTone.Transport.scheduleRepeat(
      this.trigInstruments,
      "8n"
    );
  };

  @action
  stop = (triggerPlayEnd = true) => {
    if (triggerPlayEnd) {
      this.events.onPlayEnd && this.events.onPlayEnd();
    }

    this.status = "stop";
    this.step = -1;

    // 停止所有乐器的声音
    Object.values(this.instrument).forEach((instrument: any) => {
      if (isFunction(instrument.releaseAll)) {
        instrument.releaseAll();
      }
    });
    for (let name in this.activeKeys) {
      this.activeKeys[name] = [];
    }

    // 取消当前实例的 scheduleRepeat 事件
    if (this.scheduleRepeatEventId) {
      MoaTone.Transport.clear(this.scheduleRepeatEventId);
      this.scheduleRepeatEventId = null;
    }

    // 取消当前实例的所有 schedule 事件
    this.scheduledEventIds.forEach((eventId) => {
      MoaTone.Transport.clear(eventId);
    });
    this.scheduledEventIds.clear();
  };

  trigNote = (name: string, note: Note, time: MoaTimeType) => {
    this.attackNote(name, note, time);

    const { duration = 1 } = note;

    // 保存 schedule 事件的 ID
    const eventId = MoaTone.Transport.schedule(
      (time) => this.releaseNote(name, note, time),
      MoaTone.now() +
        MoaTone.Time.toSeconds("8n") * duration -
        // 上面的加法可能有精度问题，减去 32n 保险点
        MoaTone.Time.toSeconds("32n")
    );
    this.scheduledEventIds.add(eventId);
  };

  @action
  attackNote = (name: string, note: NoteOnlyValue, time?: MoaTimeType) => {
    const currentInstrument = this.instrument[name];
    let fullNoteStr;
    if (currentInstrument.isNoise) fullNoteStr = note.value;
    else fullNoteStr = getFullNoteStr(note.value);

    const { activeKeys } = this;
    if (activeKeys[name].includes(fullNoteStr)) return;

    const instrument = this.instrument[name];
    this.activeKeys[name] = _.union(this.activeKeys[name], [fullNoteStr]);
    instrument.triggerAttack(note.value, time || MoaTone.now());
  };

  @action
  releaseNote = (name: string, note: NoteOnlyValue, time?: MoaTimeType) => {
    const currentInstrument = this.instrument[name];
    let fullNoteStr;
    if (currentInstrument.isNoise) fullNoteStr = note.value;
    else fullNoteStr = getFullNoteStr(note.value);

    const { activeKeys } = this;
    if (!activeKeys[name].includes(fullNoteStr)) return;

    const instrument = this.instrument[name];
    this.activeKeys[name].splice(this.activeKeys[name].indexOf(fullNoteStr), 1);
    instrument.triggerRelease(note.value, time || MoaTone.now());
  };

  @action setBpm = (value: number) => {
    this.bpm = value;
    MoaTone.Transport.bpm = value;
  };
  @action setTimeLenth = (value: number) => {
    if (value < 0) return;
    this.timeLength = value;
  };

  @action
  trigInstruments = (time: MoaTimeType) => {
    const handleStep = this.step + 1;

    for (let name in this.instrument) {
      const trackData = this.tracks.find(
        (track) => track.instrument === name
      ) as Track;
      if (trackData) {
        const notes = trackData.notes.filter(
          (note) => note.time === handleStep
        );
        if (notes.length) {
          notes.forEach((note) => {
            this.trigNote(name, note, time);
          });
        }
      }
    }

    const { step, keyboardLength } = this;
    if (step === keyboardLength) {
      this.stop();
    } else {
      this.step += 1;
    }
  };
}
