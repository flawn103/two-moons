export type Note = {
  value: string; // note name, e.g. "C4",
  time: number; // time in seconds
  duration?: number;
  tip?: string; // optional annotation text
};

export type NoteOnlyValue = Omit<Note, "time" | "duration">;

export enum PITCH_MOD {
  SHARP = "sharp",
  FLAT = "flat",
}
