export interface MidiNote {
  id?: string; // 添加可选的id字段用于唯一标识音符
  pitch: number; // MIDI音高 (0-127)
  start: number; // 开始时间 (beat数)
  duration: number; // 持续时间 (beat数)
  velocity: number; // 力度 (0-127)
}

// export interface MidiData {
//   name: string;
//   tracks: {
//     preset: string;
//     notes: MidiNote[];
//   }[];
//   tempo: number; // BPM
// }

export interface MidiData {
  name: string;
  id: string;
  notes: MidiNote[];
  total: number;
  tempo: number; // BPM
}
