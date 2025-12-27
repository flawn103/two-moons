export const CHORDS = [
  {
    label: "min",
    value: "m",
  },
  {
    label: "min7",
    value: "m7",
  },
  {
    label: "min9",
    value: "m9",
  },
  {
    label: "min11",
    value: "m11",
  },
  {
    label: "maj",
    value: "M",
  },
  {
    label: "maj7",
    value: "M7",
  },
  {
    label: "maj9",
    value: "M9",
  },
  {
    label: "maj11",
    value: "M11",
  },
  ...[7, 9, 11].map((i) => ({ value: i, label: i })),
  ...["sus2", "sus4", "aug", "dim"].map((i) => ({ value: i, label: i })),
];
