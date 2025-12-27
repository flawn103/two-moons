import { getRootAndOctave } from "@/utils/note";
import { scale, singNameMap, scaleMap } from "rad.js";
import { sample, sampleSize } from "lodash";

const MELODY_OCTIVE_RANGE = [0];
const MELODY_LEN = 5;

export const SCALE_TYPES = Object.keys(scaleMap).filter(
  (name) => !["major", "minor"].includes(name)
);

export const genMelody = (root, scaleName) => {
  const { root: rootName, octave } = getRootAndOctave(root);
  const octiveRange = [];
  const notes = [];

  MELODY_OCTIVE_RANGE.forEach((i) => {
    octiveRange.push(octave + i);
  });
  octiveRange.forEach((o) => {
    // 会有下一个八度音1，这里我们不需要
    const scaleNotes = scale({ type: scaleName, root: rootName }, o).slice(
      0,
      -1
    );

    scaleNotes.forEach((note) => {
      const index = scaleNotes.indexOf(note);
      notes.push({
        singName: singNameMap[scaleName][index],
        value: note,
      });
    });
  });

  const picked = sampleSize(notes, MELODY_LEN);

  // add time info
  let time = 8;
  const notesWithTime = picked.map((note) => {
    const duration = sample([1, 2, 3]);
    const noteWithTime = {
      duration,
      time,
      ...note,
    };
    time += duration;
    return noteWithTime;
  });

  return { notesWithTime, notes };
};
