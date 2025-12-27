import { RollData, RollStore } from "@/components/MoaRoll";

export const player = new RollStore({});
export const rollData: Record<string, RollData> = {
  suda: {
    timeLength: 7,
    currentTrack: "piano",
    tracks: [
      {
        range: ["F4", "G5"],
        instrument: "piano",
        notes: [
          {
            value: "F4",
            time: 0,
            duration: 1,
          },
          {
            value: "G4",
            time: 1,
            duration: 1,
          },
          {
            value: "C5",
            time: 2,
            duration: 1,
          },
          {
            value: "G4",
            time: 3,
            duration: 1,
          },
          {
            value: "G5",
            time: 4,
            duration: 1,
          },
          {
            value: "E5",
            time: 5,
            duration: 1,
          },
        ],
      },
      {
        range: ["C2", "G2"],
        instrument: "bass",
        notes: [
          {
            value: "F2",
            time: 0,
            duration: 3,
          },
          {
            value: "G2",
            time: 3,
            duration: 2,
          },
          {
            value: "C2",
            time: 5,
            duration: 1,
          },
        ],
      },
      {
        instrument: "drum",
        notes: [],
      },
    ],
  },
  test: {
    timeLength: 8,
    currentTrack: "piano",
    tracks: [
      {
        range: ["C4", "C5"],
        instrument: "piano",
        notes: [
          {
            value: "G#4/Ab4",
            time: 3,
            duration: 1,
          },
          {
            value: "F#4/Gb4",
            time: 2,
            duration: 1,
          },
          {
            value: "E4",
            time: 5,
            duration: 1,
          },
        ],
      },
      {
        range: ["C2", "C3"],
        instrument: "bass",
        notes: [],
      },
      {
        instrument: "drum",
        notes: [],
      },
    ],
  },
};
