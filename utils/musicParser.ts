// 各种东西转为可播放的音符
import { noteMap, scaleMap } from "rad.js";

export interface ParsedNote {
  note: string;
  octave: number;
  accidental?: string;
  duration: number;
  startIndex: number;
  endIndex: number;
  isTriplet?: boolean;
  tripletGroup?: number;
}

export interface PlayableNote {
  type: "note" | "rest";
  note?: string;
  duration: number;
  startIndex: number;
  endIndex: number;
}

export interface StaffNote {
  note: string;
  octaveOffset: number;
  accidental: string | null;
  isRest: boolean;
  isTriplet?: boolean;
  tripletGroup?: number;
}

export interface ParseResult {
  notes: ParsedNote[];
  errors: string[];
  warnings: string[];
}

export class MusicParser {
  private static readonly NOTE_MAP: Record<string, string> = {
    "1": "C",
    "2": "D",
    "3": "E",
    "4": "F",
    "5": "G",
    "6": "A",
    "7": "B",
  };

  // 半音数到音名的映射
  private static readonly SEMITONE_TO_NOTE: string[] = [
    "C",
    "C#",
    "D",
    "D#",
    "E",
    "F",
    "F#",
    "G",
    "G#",
    "A",
    "A#",
    "B",
  ];

  private static readonly DEFAULT_NOTE_DURATION = 0.5;
  private static readonly TRIPLET_NOTE_DURATION =
    MusicParser.DEFAULT_NOTE_DURATION * (2 / 3);
  private static readonly DEFAULT_OCTAVE = 4;

  /**
   * 从基音字符串中提取音名和八度信息
   */
  private static parseBaseNote(baseNote?: string): {
    noteName: string;
    octave: number;
  } {
    if (!baseNote) {
      return { noteName: "C", octave: MusicParser.DEFAULT_OCTAVE };
    }

    const match = baseNote.match(/^([A-G][#b]?)(\d+)$/);
    if (match) {
      return {
        noteName: match[1],
        octave: parseInt(match[2], 10),
      };
    }
    return { noteName: "C", octave: MusicParser.DEFAULT_OCTAVE };
  }

  /**
   * 计算移调后的音符
   */
  private static transposeNote(
    noteNumber: string,
    baseNoteName: string,
    baseOctave: number
  ): { noteName: string; octave: number } {
    // 获取基音的半音数
    const baseSemitone = noteMap[baseNoteName];
    if (baseSemitone === undefined) {
      throw new Error(`无效的基音: ${baseNoteName}`);
    }

    // 简谱音符对应的半音偏移（相对于基音）
    const scaleOffsets: Record<string, number> = {
      "1": 0, // 主音
      "2": 2, // 大二度
      "3": 4, // 大三度
      "4": 5, // 纯四度
      "5": 7, // 纯五度
      "6": 9, // 大六度
      "7": 11, // 大七度
    };

    const offset = scaleOffsets[noteNumber];
    if (offset === undefined) {
      throw new Error(`无效的简谱音符: ${noteNumber}`);
    }

    // 计算最终的半音数
    let finalSemitone = (baseSemitone + offset) % 12;
    let finalOctave = baseOctave;

    // 处理八度变化
    if (baseSemitone + offset >= 12) {
      finalOctave += Math.floor((baseSemitone + offset) / 12);
    }

    const finalNoteName = MusicParser.SEMITONE_TO_NOTE[finalSemitone];
    return { noteName: finalNoteName, octave: finalOctave };
  }

  /**
   * 解析单个音符
   */
  private static parseNote(params: {
    content: string;
    startPos: number;
    duration: number;
    isTriplet?: boolean;
    tripletGroup?: number;
    baseNoteName: string;
    baseOctave: number;
  }): { note: ParsedNote; nextIndex: number } | null {
    const {
      content,
      startPos,
      duration,
      isTriplet = false,
      tripletGroup,
      baseNoteName,
      baseOctave,
    } = params;
    let pos = startPos;
    let accidental = "";
    const noteStartIndex = pos;

    // 检查升降号
    if (content[pos] === "#" || content[pos] === "b") {
      accidental = content[pos];
      pos++;
    }

    // 跳过空格
    while (pos < content.length && content[pos] === " ") {
      pos++;
    }

    // 检查是否是有效音符
    if (pos >= content.length || !MusicParser.NOTE_MAP[content[pos]]) {
      return null;
    }

    const noteChar = content[pos];
    let noteEndIndex = pos + 1;
    let octaveOffset = 0;

    // 检查紧跟的八度标记
    while (noteEndIndex < content.length) {
      if (content[noteEndIndex] === ",") {
        octaveOffset--;
        noteEndIndex++;
      } else if (content[noteEndIndex] === "'") {
        octaveOffset++;
        noteEndIndex++;
      } else {
        break;
      }
    }

    // 使用移调逻辑计算实际音符
    const transposed = MusicParser.transposeNote(
      noteChar,
      baseNoteName,
      baseOctave + octaveOffset
    );

    // 处理升降号
    let finalNoteName = transposed.noteName;
    if (accidental) {
      const baseSemitone = noteMap[transposed.noteName];
      let modifiedSemitone = baseSemitone;

      if (accidental === "#") {
        modifiedSemitone = (baseSemitone + 1) % 12;
      } else if (accidental === "b") {
        modifiedSemitone = (baseSemitone - 1 + 12) % 12;
      }

      finalNoteName = MusicParser.SEMITONE_TO_NOTE[modifiedSemitone];
    }

    return {
      note: {
        note: `${finalNoteName}${transposed.octave}`,
        octave: transposed.octave,
        accidental,
        duration,
        startIndex: noteStartIndex,
        endIndex: noteEndIndex - 1,
        isTriplet,
        tripletGroup,
      },
      nextIndex: noteEndIndex,
    };
  }

  /**
   * 解析音乐短语
   */
  static parsePhrase(content: string, baseNote?: string): ParseResult {
    const notes: ParsedNote[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];
    let tripletGroupId = 0;
    const { noteName: baseNoteName, octave: baseOctave } =
      MusicParser.parseBaseNote(baseNote);

    let i = 0;
    while (i < content.length) {
      const char = content[i];

      if (char === "t") {
        // 三连音处理
        tripletGroupId++;
        let tripletIndex = i + 1;
        const tripletNotes: ParsedNote[] = [];

        // 解析三连音中的音符，遇到空格或非音符字符时停止
        while (tripletIndex < content.length) {
          // 如果遇到空格，停止三连音解析
          if (content[tripletIndex] === " ") {
            break;
          }

          const result = MusicParser.parseNote({
            content,
            startPos: tripletIndex,
            duration: MusicParser.TRIPLET_NOTE_DURATION,
            isTriplet: true,
            tripletGroup: tripletGroupId,
            baseNoteName,
            baseOctave,
          });
          if (!result) {
            break;
          }

          tripletNotes.push(result.note);
          tripletIndex = result.nextIndex;
        }

        if (tripletNotes.length === 0) {
          warnings.push(`三连音标记 't' 后没有找到有效音符，位置: ${i}`);
        }

        notes.push(...tripletNotes);
        i = tripletIndex;
      } else if (char === "-" || char === "0") {
        // 休止符
        notes.push({
          note: "rest",
          octave: 0,
          duration: MusicParser.DEFAULT_NOTE_DURATION,
          startIndex: i,
          endIndex: i,
        });
        i++;
      } else if (char === "#" || char === "b" || MusicParser.NOTE_MAP[char]) {
        // 升降号或音符
        const result = MusicParser.parseNote({
          content,
          startPos: i,
          duration: MusicParser.DEFAULT_NOTE_DURATION,
          isTriplet: false,
          tripletGroup: undefined,
          baseNoteName,
          baseOctave,
        });
        if (result) {
          notes.push(result.note);
          i = result.nextIndex;
        } else {
          // 升降号后面没有音符
          warnings.push(`升降号 '${char}' 后没有找到有效音符，位置: ${i}`);
          i++;
        }
      } else {
        // 忽略其他字符
        i++;
      }
    }

    return { notes, errors, warnings };
  }

  /**
   * 转换为播放格式
   */
  static toPlayableNotes(notes: ParsedNote[]): PlayableNote[] {
    return notes.map((note) => {
      if (note.note === "rest") {
        return {
          type: "rest" as const,
          duration: note.duration,
          startIndex: note.startIndex,
          endIndex: note.endIndex,
        };
      } else {
        return {
          type: "note" as const,
          note: note.note,
          duration: note.duration,
          startIndex: note.startIndex,
          endIndex: note.endIndex,
        };
      }
    });
  }

  /**
   * 转换为五线谱格式
   */
  static toStaffNotation(notes: ParsedNote[]): StaffNote[] {
    return notes.map((note) => {
      if (note.note === "rest") {
        return {
          note: "",
          octaveOffset: 0,
          accidental: null,
          isRest: true,
          isTriplet: note.isTriplet,
          tripletGroup: note.tripletGroup,
        };
      } else {
        // 从完整音符名称中提取信息
        const match = note.note.match(/^([A-G])([#b]?)([0-9]+)$/);
        if (!match) {
          throw new Error(`无效的音符格式: ${note.note}`);
        }

        const [, noteName, accidental, octaveStr] = match;
        const octave = parseInt(octaveStr, 10);
        const octaveOffset = octave - MusicParser.DEFAULT_OCTAVE;

        // 将音符名称转换回数字
        const noteNumber =
          Object.entries(MusicParser.NOTE_MAP).find(
            ([, name]) => name === noteName
          )?.[0] || "1";

        return {
          note: noteNumber,
          octaveOffset,
          accidental: accidental || null,
          isRest: false,
          isTriplet: note.isTriplet,
          tripletGroup: note.tripletGroup,
        };
      }
    });
  }
}
