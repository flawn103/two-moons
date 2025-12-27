import { SingNameNote } from "@/typings/note";
import { scaleMap, scale, singNameMap, noteMap } from "rad.js";
import _ from "lodash";
import { NOTES } from "./calc";

function getRoot(str) {
  let result = str.match(/[A-G](#|b)?/);
  if (result) return result[0];
  throw `[Chord] Can't resolve the root note for "${str}"`;
}

function getNumber(str) {
  return Number(str.match(/\d/)[0]);
}

function getSign(str) {
  return str.match(/(#|b)/)?.[0];
}

export function getRootAndOctave(str) {
  try {
    return {
      root: getRoot(str),
      octave: getNumber(str),
    };
  } catch {
    return {
      root: "C",
      octave: 4,
    };
  }
}

export function isValidSingName(str) {
  return /^\d(b|#)?$/.test(str);
}

// 定义音名和它们对应的半音数
const singNameDistanceMap = {
  "1": 0, // Do
  "#1": 1, // 升Do
  b2: 1, // 降Re
  "2": 2, // Re
  "#2": 3, // 升Re
  b3: 3, // 降Mi
  "3": 4, // Mi
  "4": 5, // Fa
  "#4": 6, // 升Fa
  b5: 6, // 降So
  "5": 7, // So
  "#5": 8, // 升So
  b6: 8, // 降La
  "6": 9, // La
  "#6": 10, // 升La
  b7: 10, // 降Ti
  "7": 11, // Ti
  "8": 12, // 高八度Do
  b9: 13, // 降九度
  "9": 14, // 九度
  "#9": 15, // 升九度
  b10: 15, // 降十度
  "10": 16, // 十度
  "11": 17, // 十一度
  "#11": 18, // 升十一度
  b11: 16, // 降十一度
  b12: 18, // 降十二度
  "12": 19, // 十二度
  b13: 20, // 降十三度
  "13": 21, // 十三度
};

// 解析音程字符串为半音数的函数
export const parseInterval = (intervalStr: string): number => {
  const trimmed = intervalStr.trim();
  // 使用singNameDistanceMap查找
  if (singNameDistanceMap.hasOwnProperty(trimmed)) {
    return singNameDistanceMap[trimmed];
  }
  // 如果是纯数字，当作半音数处理（向后兼容）
  const num = parseInt(trimmed);
  if (!isNaN(num)) {
    return num;
  }
  throw new Error(`无效的音程: ${trimmed}`);
};

const MELODY_OCTIVE_RANGE = [-2, -1, 0, 1, 2];
export const singNameNoteToNoteNameNote = ({
  note,
  octave,
  root,
}: {
  note: SingNameNote;
  octave: number;
  root: string;
}) => {
  const allNotes = [];
  const sign = getSign(note.value);
  const num = getNumber(note.value);
  const signOffset = sign ? (sign === "b" ? -1 : 1) : 0;
  const indexOffset =
    (note.offset || 0) * 12 + singNameDistanceMap[num] + signOffset;

  MELODY_OCTIVE_RANGE.forEach((o) => {
    NOTES.forEach((note) => {
      allNotes.push(note + (octave + o));
    });
  });
  // 生成前后三个八度的音名数组，用来寻址
  const rootIndex = allNotes.indexOf(root + octave);
  return allNotes[rootIndex + indexOffset];
};

const OPACITY_RANGE = [0.4, 0.1];
export const singNamesToColor = (
  notes: SingNameNote[],
  rgb: [number, number, number] = [0, 0, 0]
) => {
  const { min, max } = findMinMaxNotes(notes);
  const halfLength = calculateSemitoneDistance(min, max);
  const step = (OPACITY_RANGE[0] - OPACITY_RANGE[1]) / halfLength; // caculate each step opacity

  return _.map(notes, (note) => {
    if (!isValidSingName(note.value)) return "rgba(255,255,255,1)";
    const distance = calculateSemitoneDistance(note, max);
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${
      OPACITY_RANGE[1] + distance * step
    })`;
  });
};

function calculateSemitoneDistance(note1, note2) {
  // 提取音符的半音数和八度偏移
  const semitone1 = singNameDistanceMap[note1.value];
  const semitone2 = singNameDistanceMap[note2.value];
  const octaveOffset1 = note1.offset || 0;
  const octaveOffset2 = note2.offset || 0;

  // 计算两个音符之间的总半音数，考虑八度偏移
  const totalSemitone1 = semitone1 + octaveOffset1 * 12;
  const totalSemitone2 = semitone2 + octaveOffset2 * 12;

  // 返回两个音符之间的半音差
  return totalSemitone2 - totalSemitone1;
}

function findMinMaxNotes(notes) {
  // 计算每个音符的绝对半音值（含八度偏移）
  const calculateSemitoneValue = (note) => {
    const semitone = singNameDistanceMap[note.value];
    const octaveOffset = note.offset || 0;
    return semitone + octaveOffset * 12;
  };

  // 初始化最低音和最高音
  let minNote = notes[0];
  let maxNote = notes[0];
  let minSemitoneValue = calculateSemitoneValue(minNote);
  let maxSemitoneValue = calculateSemitoneValue(maxNote);

  // 遍历音符数组，找出最低音和最高音
  for (let i = 1; i < notes.length; i++) {
    const currentSemitoneValue = calculateSemitoneValue(notes[i]);

    if (currentSemitoneValue < minSemitoneValue) {
      minSemitoneValue = currentSemitoneValue;
      minNote = notes[i];
    }

    if (currentSemitoneValue > maxSemitoneValue) {
      maxSemitoneValue = currentSemitoneValue;
      maxNote = notes[i];
    }
  }

  // 返回最低音和最高音
  return {
    min: minNote,
    max: maxNote,
  };
}

export function generateMelody(
  scaleName,
  octaves,
  length = 6,
  restProbability = 0.2
) {
  const availableNotes = singNameMap[scaleName];
  // Helper function to get random element from an array
  const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Helper function to calculate the interval between two notes
  const calculateInterval = (prevNote, nextNote) => {
    const prevIndex = availableNotes.indexOf(prevNote.value);
    const nextIndex = availableNotes.indexOf(nextNote.value);
    const octaveDifference =
      (nextNote.offset - prevNote.offset) * availableNotes.length;
    return Math.abs(nextIndex - prevIndex + octaveDifference);
  };

  // Initialize the melody array
  let melody = [];
  let previousNote = {
    value: getRandomElement(availableNotes),
    offset: getRandomElement(octaves),
  };
  melody.push(previousNote);

  for (let i = 1; i < length; i++) {
    let nextNote;
    let jumpProbability = Math.random(); // Probability to decide if we make a jump

    if (Math.random() < restProbability) {
      // Insert a rest
      nextNote = { value: "", offset: 0 };
    } else {
      if (jumpProbability < 0.8) {
        // Favor small steps (for continuity)
        let candidates = availableNotes.map((value) => ({
          value,
          offset: previousNote.offset,
        }));
        candidates = candidates.filter(
          (note) => calculateInterval(previousNote, note) <= 2
        );
        if (candidates.length === 0) {
          nextNote = {
            value: getRandomElement(availableNotes),
            offset: previousNote.offset,
          };
        } else {
          nextNote = getRandomElement(candidates);
        }
      } else {
        // Make a larger jump (for novelty)
        nextNote = {
          value: getRandomElement(availableNotes),
          offset: getRandomElement(octaves),
        };
      }
    }

    melody.push(nextNote);
    previousNote = nextNote.value !== "" ? nextNote : previousNote; // Don't update if it's a rest
  }

  return melody;
}
