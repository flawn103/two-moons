import _ from "lodash";
import { MoaTone } from "./MoaTone";
// getNoteNumber is defined in this file
import { noteMap } from "rad.js";
import { InstrumentData } from "@/typings/chordEditor";
import { appStore } from "@/stores/store";
import { noteToAbcStr } from "./abcConverter";

// 解析根音
export function parseRootNote(root: string): { note: string; octave: number } {
  const match = root.match(/([A-G][#b]?)(\d+)/);
  if (!match) return { note: "C", octave: 4 };
  return { note: match[1], octave: Number.parseInt(match[2]) };
}

// 根据弦和品计算音符
const getNoteByStringAndFret = (
  stringIndex: number,
  fret: number,
  customTuning?: Note[]
): Note => {
  const openNote = customTuning
    ? customTuning[stringIndex]
    : GUITAR_TUNING[stringIndex];
  const midiNote = getAbsoluteInterval(openNote) + fret;
  return absoluteIntervalToNote(midiNote);
};

// 定义音符类型
export interface Note {
  name: string; // 音名
  octave: number; // 八度
}

// 将音符名称转换为半音数（支持升号和降号）
export const getNoteNumber = (noteName: string): number => {
  return noteMap[noteName];
};

// 通用的和弦播放函数
export const playInstrumentData = (
  instrumentData: InstrumentData,
  arpeggioInterval: number,
  instrument: string = "piano"
) => {
  // Determine instrument type based on available data
  let notesToPlay: Note[] = [];

  // Check if this is guitar data (has guitarData)
  if (instrument === "guitar") {
    const sortedGuitarData = [...instrumentData.guitarData].sort(
      (a, b) => a.string - b.string
    );
    notesToPlay = sortedGuitarData.map((guitarNote) =>
      getNoteByStringAndFret(guitarNote.string, guitarNote.fret)
    );
  } else {
    // This is piano data
    notesToPlay = [...instrumentData.notes].sort(
      (a, b) =>
        a.octave * 12 +
        getNoteNumber(a.name) -
        (b.octave * 12 + getNoteNumber(b.name))
    );
  }

  if (notesToPlay.length > 0) {
    playChord(notesToPlay, arpeggioInterval, instrument);
  }
};

export const NOTES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

// 计算频率（A4 = 440Hz）
export const getFrequency = (note: Note): number => {
  const midiNote = getAbsoluteInterval(note);
  const a4 = getAbsoluteInterval({ name: "A", octave: 4 });
  return 440 * Math.pow(2, (midiNote - a4) / 12);
};

// 解析音符字符串（如"C4"）
export function parseNote(noteStr: string): { note: string; octave: number } {
  const match = noteStr.match(/([A-G][#b]?)(\d+)/);
  if (!match) return { note: "C", octave: 4 };
  return { note: match[1], octave: parseInt(match[2]) };
}

export const getAbsoluteInterval = (note: Note | string): number => {
  if (typeof note === "string") {
    note = {
      name: parseNote(note).note,
      octave: parseNote(note).octave,
    };
  }
  const noteIndex = getNoteNumber(note.name);
  return noteIndex + note.octave * 12;
};

export const absoluteIntervalToNote = (midiNumber: number): Note => {
  const octave = Math.floor(midiNumber / 12);
  const noteIndex = midiNumber % 12;
  const noteName = NOTES[noteIndex];
  return { name: noteName, octave };
};

// 将升号音符转换为降号音符（如 G# -> Ab）
export const normalizeSharpToFlat = (noteName: string): string => {
  const sharpToFlatMap: { [key: string]: string } = {
    "C#": "Db",
    "D#": "Eb",
    "F#": "Gb",
    "G#": "Ab",
    "A#": "Bb",
  };

  return sharpToFlatMap[noteName] || noteName;
};

export const playChord = (
  chord: InstrumentData | Note[],
  interval: number,
  instrument?: string,
  duration?: number,
  time?: number
) => {
  // 使用传入的instrument参数，如果没有则尝试从chord对象获取
  let instrumentType = instrument || "piano";
  let notesToPlay: Note[] = [];

  // 如果传入的是InstrumentData对象
  if (Array.isArray(chord)) {
    // 直接传入的是Note数组
    notesToPlay = chord;
  } else {
    // 传入的是InstrumentData对象
    instrumentType = instrument || (chord as any).instrument || "piano";

    if (instrumentType === "guitar" && (chord as any).guitarData) {
      const sortedGuitarData = [...(chord as any).guitarData].sort(
        (a, b) => a.string - b.string
      );
      notesToPlay = sortedGuitarData.map((guitarNote) =>
        getNoteByStringAndFret(guitarNote.string, guitarNote.fret)
      );
    } else if (instrumentType === "piano" && chord.notes) {
      notesToPlay = chord.notes;
    }
  }

  // 播放音符
  if (notesToPlay.length > 0) {
    const sortedNotes = [...notesToPlay].sort(
      (a, b) =>
        a.octave * 12 +
        getNoteNumber(a.name) -
        (b.octave * 12 + getNoteNumber(b.name))
    );

    // Convert notes to string format for MoaTone
    const noteStrings = sortedNotes.map((note) => `${note.name}${note.octave}`);

    // Create synth and play based on instrument type
    const synth = new MoaTone.Synth({
      preset:
        instrumentType === "guitar"
          ? appStore.audioPreset.guitar
          : appStore.audioPreset.piano,
    });

    const actualDuration = duration || 0.5; // Default duration
    const actualTime = time || MoaTone.now();

    if (interval === 0) {
      // Play all notes simultaneously
      synth.triggerAttackRelease(noteStrings, actualDuration, actualTime);
    } else {
      // Play notes with arpeggio
      synth.triggerAttackReleaseArpeggio(noteStrings, interval, actualDuration);
    }
  }
};

// 音程计算函数
export const getInterval = (root: Note, note: Note): number => {
  const rootMidi = getAbsoluteInterval(root);
  const noteMidi = getAbsoluteInterval(note);
  let interval = noteMidi - rootMidi;

  // 如果音程为负，则通过增加八度使其为正
  while (interval < 0) {
    interval += 12; // 增加一个八度（12个半音）
  }

  return interval;
};

// 度数识别函数
export const getScaleDegree = (note: Note, rootNote: Note) => {
  const interval = getInterval(rootNote, note);
  const normalizedInterval = interval % 12;

  const degreeMap: Record<number, string> = {
    0: "R", // 根音
    1: "♭2", // 小二度
    2: "2", // 大二度
    3: "♭3", // 小三度
    4: "3", // 大三度
    5: "4", // 完全四度
    6: "♭5", // 减五度
    7: "5", // 完全五度
    8: "♯5", // 增五度
    9: "6", // 大六度
    10: "♭7", // 小七度
    11: "7", // 大七度
  };

  return degreeMap[normalizedInterval] || normalizedInterval.toString();
};
// 吉他标准调弦（带八度信息）
export const GUITAR_TUNING: Note[] = [
  { name: "E", octave: 2 }, // 6弦（最低音）
  { name: "A", octave: 2 }, // 5弦
  { name: "D", octave: 3 }, // 4弦
  { name: "G", octave: 3 }, // 3弦
  { name: "B", octave: 3 }, // 2弦
  { name: "E", octave: 4 }, // 1弦（最高音）
];

// 将音符数组转换为吉他把位数据
export const convertNotesToGuitarData = (
  notes: Note[],
  maxFret: number = 15,
  customTuning?: Note[],
  offset: number = 0
): Array<{ string: number; fret: number }> => {
  const tuning = customTuning || GUITAR_TUNING;

  // 如果没有音符，直接返回空数组
  if (notes.length === 0) {
    return [];
  }

  // 收集所有音符的所有可能把位
  const allPossiblePositions: Array<{
    noteIndex: number;
    string: number;
    fret: number;
    note: Note;
  }> = [];

  notes
    .map((n) => ({
      name: n.name,
      octave: n.octave - offset >= 2 ? n.octave - offset : 2,
    }))
    .forEach((note, noteIndex) => {
      const targetMidi = getAbsoluteInterval(note);

      // 为每个音符尝试原始八度和更高八度的把位
      const octavesToTry = noteIndex === 0 ? [0] : [0, 12]; // 根音(第一个音符)只用原始八度，其他音符可以高八度

      octavesToTry.forEach((octaveOffset) => {
        const adjustedMidi = targetMidi + octaveOffset;

        for (let stringIndex = 0; stringIndex < tuning.length; stringIndex++) {
          const openStringMidi = getAbsoluteInterval(tuning[stringIndex]);
          const requiredFret = adjustedMidi - openStringMidi;

          if (requiredFret >= 0 && requiredFret <= maxFret) {
            allPossiblePositions.push({
              noteIndex,
              string: stringIndex,
              fret: requiredFret,
              note:
                octaveOffset === 0
                  ? note
                  : { name: note.name, octave: note.octave + 1 },
            });
          }
        }
      });
    });

  // 尝试找到最佳的把位组合
  const bestCombination = findBestFretCombination(
    allPossiblePositions,
    notes.length
  );

  return bestCombination;
};

// 寻找最佳把位组合的辅助函数
function findBestFretCombination(
  allPositions: Array<{
    noteIndex: number;
    string: number;
    fret: number;
    note: Note;
  }>,
  noteCount: number
): Array<{ string: number; fret: number }> {
  // 按音符分组
  const positionsByNote: Array<
    Array<{
      string: number;
      fret: number;
    }>
  > = [];

  for (let i = 0; i < noteCount; i++) {
    positionsByNote[i] = allPositions
      .filter((pos) => pos.noteIndex === i)
      .map((pos) => ({ string: pos.string, fret: pos.fret }));
  }

  // 生成所有可能的组合
  const allCombinations = generateCombinations(positionsByNote);

  // 筛选出有效的组合（没有弦冲突）
  const validCombinations = allCombinations.filter((combination) => {
    const usedStrings = new Set<number>();
    for (const pos of combination) {
      if (usedStrings.has(pos.string)) {
        return false; // 弦冲突
      }
      usedStrings.add(pos.string);
    }
    return true;
  });

  if (validCombinations.length === 0) {
    // 如果没有有效组合，回退到简单策略
    return fallbackToSimpleStrategy(allPositions, noteCount);
  }

  // 评估每个组合的质量
  let bestCombination = validCombinations[0];
  let bestScore = evaluateCombination(bestCombination);

  for (const combination of validCombinations) {
    const score = evaluateCombination(combination);
    if (score < bestScore) {
      bestScore = score;
      bestCombination = combination;
    }
  }

  return bestCombination;
}

// 生成所有可能的把位组合
function generateCombinations(
  positionsByNote: Array<Array<{ string: number; fret: number }>>
): Array<Array<{ string: number; fret: number }>> {
  if (positionsByNote.length === 0) return [[]];
  if (positionsByNote.some((positions) => positions.length === 0)) return [];

  const [firstNotePositions, ...restNotePositions] = positionsByNote;
  const restCombinations = generateCombinations(restNotePositions);

  const allCombinations: Array<Array<{ string: number; fret: number }>> = [];

  for (const position of firstNotePositions) {
    for (const restCombination of restCombinations) {
      allCombinations.push([position, ...restCombination]);
    }
  }

  return allCombinations;
}

// 评估把位组合的质量（分数越低越好）
function evaluateCombination(
  combination: Array<{ string: number; fret: number }>
): number {
  if (combination.length === 0) return Infinity;

  const frets = combination.map((pos) => pos.fret);
  const minFret = Math.min(...frets);
  const maxFret = Math.max(...frets);
  const fretSpan = maxFret - minFret; // 品位跨度
  const avgFret = frets.reduce((sum, fret) => sum + fret, 0) / frets.length;

  // 如果品位跨度超过3，给予极高的惩罚分
  if (fretSpan > 3) {
    return fretSpan * 1000 + avgFret * 10 + maxFret;
  }

  // 评分标准：
  // 1. 品位跨度越小越好（权重最高）
  // 2. 平均品位越低越好
  // 3. 最高品位越低越好
  return fretSpan * 10 + avgFret * 2 + maxFret;
}

// 回退策略：当没有完美组合时，尽量选择低品位
function fallbackToSimpleStrategy(
  allPositions: Array<{
    noteIndex: number;
    string: number;
    fret: number;
    note: Note;
  }>,
  noteCount: number
): Array<{ string: number; fret: number }> {
  const result: Array<{ string: number; fret: number }> = [];
  const usedStrings = new Set<number>();

  // 按音符顺序处理
  for (let noteIndex = 0; noteIndex < noteCount; noteIndex++) {
    const notePositions = allPositions
      .filter(
        (pos) => pos.noteIndex === noteIndex && !usedStrings.has(pos.string)
      )
      .sort((a, b) => a.fret - b.fret || a.string - b.string);

    if (notePositions.length > 0) {
      const bestPos = notePositions[0];
      result.push({ string: bestPos.string, fret: bestPos.fret });
      usedStrings.add(bestPos.string);
    }
  }

  return result;
}

export { getNoteByStringAndFret };
