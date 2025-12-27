export type InstrumentType = "piano" | "guitar" | string;

export interface InstrumentSoundConfig {
  synthType: "poly" | "basic" | string;
  reverbLevel: number;
  volume: number;
}
