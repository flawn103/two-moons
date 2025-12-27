export const PROGRESSIONS = [
  { label: "I - IV - V - I", degrees: ["I", "IV", "V", "I"] },
  { label: "I - vi - IV - V", degrees: ["I", "vi", "IV", "V"] }, // 1645
  { label: "I - V - vi - IV", degrees: ["I", "V", "vi", "IV"] }, // 1564
  { label: "I - IV - I - V", degrees: ["I", "IV", "I", "V"] }, // 1415
  { label: "vi - IV - I - V", degrees: ["vi", "IV", "I", "V"] }, // 6415
  { label: "IV - V - iii - vi", degrees: ["IV", "V", "iii", "vi"] }, // 4536
  { label: "ii - V - I - vi", degrees: ["ii", "V", "I", "vi"] }, // 2516
  { label: "IV - V - I - vi", degrees: ["IV", "V", "I", "vi"] }, // 4516
  { label: "IV - iii - ii - I", degrees: ["IV", "iii", "ii", "I"] }, // 4321
];

export const DEGREE_TO_CHORD_OFFSET = {
  I: { semitones: 0, type: "M" },
  ii: { semitones: 2, type: "m" },
  iii: { semitones: 4, type: "m" },
  IV: { semitones: 5, type: "M" },
  V: { semitones: 7, type: "M" },
  vi: { semitones: 9, type: "m" },
  vii: { semitones: 11, type: "dim" },
};
