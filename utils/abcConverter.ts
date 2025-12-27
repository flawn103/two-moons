// 将练习数据转换为ABC记谱法格式的工具函数

import {
  normalizeSharpToFlat,
  NOTES,
  parseNote,
  parseRootNote,
} from "@/utils/calc";
import { MusicParser, ParsedNote } from "./musicParser";

// 音名映射
const NOTE_MAP: { [key: string]: string } = {
  C: "C",
  "C#": "^C",
  Db: "_D",
  D: "D",
  "D#": "^D",
  Eb: "_E",
  E: "E",
  "E#": "F",
  F: "F",
  "F#": "^F",
  Gb: "_G",
  G: "G",
  "G#": "^G",
  Ab: "_A",
  A: "A",
  "A#": "^A",
  Bb: "_B",
  B: "B",
};

export function noteToAbcStr(
  noteStr: string,
  offset = 0,
  duration?: number
): string {
  if (noteStr === "rest") return "z" + (duration === 0.5 ? "" : duration * 2);

  const { note, octave } = parseNote(noteStr);
  const abcNote = NOTE_MAP[note] || "C";

  // ABC八度表示法：
  // C,,, = 第0八度, C,, = 第1八度, C, = 第2八度
  // C = 第3八度, c = 第4八度, c' = 第5八度, c'' = 第6八度

  const BASE = 4 - offset;

  if (octave <= BASE - 1) {
    const commaCount = BASE - octave;
    return abcNote.toUpperCase() + ",".repeat(Math.max(0, commaCount));
  } else if (octave === BASE) {
    return abcNote.toUpperCase();
  } else if (octave === BASE + 1) {
    return abcNote.toLowerCase();
  } else {
    return abcNote.toLowerCase() + "'".repeat(octave - BASE - 1);
  }
}

// 转换音程数据为字符串格式
export function convertIntervalToAbc(notes: string[], offset = 0): string {
  if (!notes || notes.length < 2) return "";

  const note1 = noteToAbcStr(notes[0], offset);
  const note2 = noteToAbcStr(notes[1], offset);

  // 音程显示为两个音符，用空格分隔
  return `${note1} ${note2}`;
}

// 栈元素类型定义
interface StackItem {
  type: "note" | "rest" | "triplet";
  content: string;
  count?: number;
}

// 辅助函数：处理三连音组
function processTripletGroup(
  stack: StackItem[],
  parsedNotes: Array<ParsedNote>,
  startIndex: number
): number {
  const tripletGroup = parsedNotes[startIndex].tripletGroup;
  const tripletNotes: string[] = [];

  let j = startIndex;

  while (
    j < parsedNotes.length &&
    parsedNotes[j].isTriplet &&
    parsedNotes[j].tripletGroup === tripletGroup
  ) {
    {
      tripletNotes.push(parsedNotes[j].note);
    }
    j++;
  }

  if (tripletNotes.length > 0) {
    stack.push({
      type: "triplet",
      content: `(3${tripletNotes.join("")}`,
    });
  }

  return j; // 返回下一个处理位置
}

// 辅助函数：格式化栈元素
function formatStackItem(item: StackItem): string {
  switch (item.type) {
    case "rest":
      return item.count === 1 ? "z" : `z${item.count}`;
    case "note":
    case "triplet":
      return item.content;
    default:
      return "";
  }
}

// 双指针合并相邻休止符
export function mergeAdjacentRests(stack: ParsedNote[]) {
  const result: ParsedNote[] = [];

  let back = 0;
  let forward = 1;

  let curr = { ...stack[back] };

  while (back <= stack.length - 1) {
    if (curr.note === "rest" && stack[forward]?.note === "rest") {
      curr.duration = (curr.duration || 0) + (stack[forward].duration || 0);
    } else {
      back = forward;
      result.push(curr);
      curr = { ...stack[forward] };
    }

    forward++;
  }

  return result;
}

// 旋律str转abc，用在乐句中
export function convertToAbc(root: string, str: string): string {
  const parsedNotes = mergeAdjacentRests(
    MusicParser.parsePhrase(str, root).notes
  ).map((note) => ({
    ...note,
    note: noteToAbcStr(note.note, 0, note.duration),
  }));

  // 统一的音符栈，包含所有元素（音符、休止符、三连音）
  const noteStack: StackItem[] = [];

  let i = 0;
  while (i < parsedNotes.length) {
    const current = parsedNotes[i];

    if (current.isTriplet) {
      // 栈式处理三连音组
      i = processTripletGroup(noteStack, parsedNotes, i);
    } else {
      // 普通音符 - 直接使用解析后的音符，不再进行转调
      noteStack.push({
        type: "note",
        content: current.note,
      });
      i++;
    }
  }

  // 构建ABC记谱法字符串
  return noteStack.map(formatStackItem).join(" ");
}

// 将和弦音符转换为ABC记谱法格式，支持高低音谱号
export const convertChordToAbc = (
  sortedNotes: Array<{ name: string; octave: number }>,
  instrument: string = "piano"
): string => {
  sortedNotes = sortedNotes.map((note) => ({
    name: normalizeSharpToFlat(note.name),
    octave: note.octave,
  }));

  if (sortedNotes.length === 0) {
    return "z"; // 空和弦返回休止符
  }

  // 按 C4 分离高音和低音音符
  const trebleNotes: typeof sortedNotes = [];
  const bassNotes: typeof sortedNotes = [];

  sortedNotes.forEach((note) => {
    const noteValue = note.octave * 12 + NOTES.indexOf(note.name);
    const c4Value = 4 * 12 + 0; // C4 的值

    if (noteValue >= c4Value) {
      trebleNotes.push(note);
    } else {
      bassNotes.push(note);
    }
  });

  // 如果只有高音或只有低音，使用单谱号
  if (trebleNotes.length > 0 && bassNotes.length === 0) {
    const trebleAbcNotes = trebleNotes.map((note) => {
      return noteToAbcStr(
        note.name + note.octave
        // instrument === "guitar" ? 1 : 0
      );
    });
    return `[${trebleAbcNotes.join("")}]`;
  }

  if (bassNotes.length > 0 && trebleNotes.length === 0) {
    const bassAbcNotes = bassNotes.map((note) => {
      return noteToAbcStr(
        note.name + note.octave
        // instrument === "guitar" ? 1 : 0
      );
    });
    return `K: clef=bass\n[${bassAbcNotes.join("")}]`;
  }

  // 如果同时有高音和低音，使用双谱号格式
  if (trebleNotes.length > 0 && bassNotes.length > 0) {
    const trebleAbcNotes = trebleNotes.map((note) => {
      return noteToAbcStr(
        note.name + note.octave
        // instrument === "guitar" ? 1 : 0
      );
    });

    const bassAbcNotes = bassNotes.map((note) => {
      return noteToAbcStr(
        note.name + note.octave
        // instrument === "guitar" ? 1 : 0
      );
    });

    return `V:1 clef=treble\n[${trebleAbcNotes.join("")}]\nV:2 clef=bass\n[${bassAbcNotes.join("")}]`;
  }

  return "z"; // 默认返回休止符
};

// 转换和弦数据为ABC格式
export function convertChordToAbcHigh(notes: string[], offset = 0): string {
  if (!notes || notes.length === 0) return "";

  const abcNotes = notes.map((note) => noteToAbcStr(note, offset));

  // 和弦显示为同时发声的音符，用方括号包围
  return `[${abcNotes.join("")}]`;
}

// 转换旋律数据为ABC格式，用在练习中
export function convertMelodyToAbc(
  notes: Array<{ value: string; duration?: number }>
): string {
  if (!notes || notes.length === 0) return "";

  const abcNotes = notes.map((note) => {
    const abcNote = noteToAbcStr(note.value);

    // 根据时值添加长度标记
    if (note.duration) {
      if (note.duration === 1) {
        return abcNote; // 八分
      } else if (note.duration === 2) {
        return abcNote + "2"; // 四分音符（默认）
      }
    }

    return abcNote;
  });

  return abcNotes.join(" ");
}
