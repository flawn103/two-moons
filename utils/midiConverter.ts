/**
 * MIDI数据转换工具
 * 用于在Tonejs/Midi格式和时间数据格式之间转换
 */

import { Midi } from "@tonejs/midi";

export interface TimeDataNote {
  id: string;
  pitch: number;
  start: number; // beat 数
  duration: number; // beat 数
  velocity: number; // 0-100
}

export interface TimeData {
  ppq: number;
  name: string;
  duration: number; // beat 数
  tempo: number; // BPM
  notes: TimeDataNote[];
}

export interface TonejsNote {
  duration: number; // 秒 (用于 Tone.js)
  durationTicks: number;
  midi: number;
  name: string;
  ticks: number;
  time: number; // 秒 (用于 Tone.js)
  velocity: number; // 0-1
}

export interface TonejsTrack {
  channel: number;
  controlChanges: any;
  pitchBends: any[];
  instrument: {
    family: string;
    number: number;
    name: string;
  };
  name: string;
  notes: TonejsNote[];
  endOfTrackTicks: number;
}

export interface TonejsMidiData {
  header: {
    keySignatures: any[];
    meta: any[];
    name: string;
    ppq: number;
    tempos: Array<{
      bpm: number;
      ticks: number;
    }>;
    timeSignatures: any[];
  };
  tracks: TonejsTrack[];
}

/**
 * 将Tonejs/Midi格式转换为时间数据格式
 */
export function convertMidiToTimeData(
  midiData: Midi,
  name = "MIDI曲目"
): TimeData {
  const tempo = midiData.header.tempos[0]?.bpm || 120;
  const ppq = midiData.header.ppq || 480;

  // 将秒转换为 beat 数的函数
  const secondsToBeats = (seconds: number) => {
    const beatsPerSecond = tempo / 60;
    return seconds * beatsPerSecond;
  };

  // 合并所有音轨的音符
  const allNotes: TimeDataNote[] = [];
  let maxEndTime = 0;

  midiData.tracks.forEach((track, trackIndex) => {
    track.notes.forEach((note, noteIndex) => {
      const startBeats = secondsToBeats(note.time);
      const durationBeats = secondsToBeats(note.duration);
      const endTime = startBeats + durationBeats;

      if (endTime > maxEndTime) {
        maxEndTime = endTime;
      }

      allNotes.push({
        id: `note-${trackIndex}-${noteIndex}`,
        pitch: note.midi,
        start: Math.round(startBeats * 1000) / 1000, // 保留3位小数
        duration: Math.round(durationBeats * 1000) / 1000, // 保留3位小数
        velocity: Math.round(note.velocity * 100),
      });
    });
  });

  // 按开始时间排序
  allNotes.sort((a, b) => a.start - b.start);

  return {
    name,
    duration: Math.round(maxEndTime * 1000) / 1000, // 保留3位小数
    tempo,
    ppq,
    notes: allNotes,
  };
}

/**
 * 将时间数据格式转换为Tonejs/Midi格式
 */
export function convertTimeDataToMidi(timeData: TimeData): TonejsMidiData {
  const ppq = timeData.ppq ?? 480; // pulses per quarter note

  // 将 beat 数转换为秒数的函数
  const beatsToSeconds = (beats: number) => {
    const beatsPerSecond = timeData.tempo / 60;
    return beats / beatsPerSecond;
  };

  // 计算tick转换因子
  const ticksPerSecond = (timeData.tempo / 60) * ppq;

  const notes: TonejsNote[] = timeData.notes.map((note) => {
    const time = beatsToSeconds(note.start);
    const duration = beatsToSeconds(note.duration);
    const ticks = Math.round(time * ticksPerSecond);
    const durationTicks = Math.round(duration * ticksPerSecond);

    // 根据MIDI值获取音符名称
    const noteNames = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];
    const octave = Math.floor(note.pitch / 12) - 1;
    const noteName = noteNames[note.pitch % 12];

    return {
      duration,
      durationTicks,
      midi: note.pitch,
      name: `${noteName}${octave}`,
      ticks,
      time,
      velocity: note.velocity / 100,
    };
  });

  // 计算轨道结束时间
  const maxEndTime = Math.max(...notes.map((n) => n.time + n.duration), 0);
  const endOfTrackTicks = Math.round(maxEndTime * ticksPerSecond);

  return {
    header: {
      keySignatures: [],
      meta: [],
      name: timeData.name,
      ppq,
      tempos: [
        {
          bpm: timeData.tempo,
          ticks: 0,
        },
      ],
      timeSignatures: [],
    },
    tracks: [
      {
        channel: 0,
        controlChanges: {},
        pitchBends: [],
        instrument: {
          family: "piano",
          number: 0,
          name: "acoustic grand piano",
        },
        name: timeData.name,
        notes,
        endOfTrackTicks,
      },
    ],
  };
}

/**
 * 示例使用
 */
export function getExampleMidiData(): TonejsMidiData {
  return {
    header: {
      keySignatures: [],
      meta: [],
      name: "",
      ppq: 480,
      tempos: [
        {
          bpm: 120,
          ticks: 0,
        },
      ],
      timeSignatures: [],
    },
    tracks: [
      {
        channel: 0,
        controlChanges: {},
        pitchBends: [],
        instrument: {
          family: "piano",
          number: 4,
          name: "electric piano 1",
        },
        name: "",
        notes: [
          {
            duration: 0.34791666666666665,
            durationTicks: 334,
            midi: 48,
            name: "C3",
            ticks: 1527,
            time: 1.590625,
            velocity: 0.6929133858267716,
          },
          {
            duration: 0.2333333333333334,
            durationTicks: 224,
            midi: 50,
            name: "D3",
            ticks: 1884,
            time: 1.9625,
            velocity: 0.5905511811023622,
          },
        ],
        endOfTrackTicks: 5497,
      },
    ],
  };
}
