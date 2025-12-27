import { NOISE_VALUES } from "../constants";
// note 相关命名规范
// noteStr: 形如 'C4#/D5b'
// noteValue: 原始的用户输入的noteValue，形如 'C4#'

export const OCTIVE_NAMES = [
  "C",
  "C#/Db",
  "D",
  "D#/Eb",
  "E",
  "F",
  "F#/Gb",
  "G",
  "G#/Ab",
  "A",
  "A#/Bb",
  "B",
];

export const normalizeName = (name: string) => {
  return OCTIVE_NAMES.find((nameOrArr) => {
    if (name.length === 2 && nameOrArr.length === 5)
      return nameOrArr.includes(name);
    else return nameOrArr === name;
  });
};

export const getNoteWithOctave = (name: string, octave: number) => {
  if (name.length === 5)
    return name
      .split("/")
      .map((name) => name + octave)
      .join("/");
  else return name + octave;
};

export const getFullNoteStr = (noteStr: string) => {
  if (NOISE_VALUES.includes(noteStr)) return noteStr;
  if (noteStr.includes("/")) return noteStr;
  const { octave, name } = separateNoteStr(noteStr);
  const fullName = normalizeName(name);
  return composeNoteStr(fullName as string, octave);
};

// noteValues 格式："G#4/Ab4"
export const sortNoteValues = (noteValues: string[]) => {
  return noteValues.sort((a, b) => {
    let noteA = a;
    let noteB = b;

    // 如果是复合音符名称，取第一个音符名称但保留八度信息
    if (a.includes("/")) {
      const noteName = a.split("/")[0];
      noteA = noteName;
    }

    if (b.includes("/")) {
      const noteName = b.split("/")[0];
      noteB = noteName;
    }

    return compareNoteStr(noteA, noteB);
  });
};

export const normalizeNoteValues = (noteValues: string[]) => {
  return noteValues.map((value) => {
    const { octave, name } = separateNoteStr(value);

    return (normalizeName(name) as string) + octave;
  });
};

type PitchSign = "#" | "b";
const comparePitch = (a: PitchSign, b: PitchSign) => {
  const sortOrder = ["b", 0, "#"];
  return sortOrder.indexOf(a) - sortOrder.indexOf(b);
};

export const separateNoteStr = (noteStr: string) => {
  if (noteStr.includes("/")) noteStr = noteStr.split("/")[0];

  const name = noteStr.slice(0, -1);
  const octave = noteStr.slice(-1);

  return { octave, name };
};

export const composeNoteStr = (name: string, octave: string) => {
  if (name.length === 5) {
    return name
      .split("/")
      .map((name) => name + octave)
      .join("/");
  } else return name + octave;
};

export const genKeys = (noteValues: string[], range?: string[]) => {
  let re: string[] = [];

  if (noteValues.length === 0 && !range) return [];
  const sortedNoteStrs = normalizeNoteValues(
    sortNoteValues(noteValues.slice().concat(range ?? []))
  );

  const { name: lowesetName, octave: lowestOctave } = separateNoteStr(
    sortedNoteStrs[0]
  );
  const { name: highestName, octave: hightestOctave } = separateNoteStr(
    sortedNoteStrs[sortedNoteStrs.length - 1]
  );

  // 获取最低音与最高音之前的八度个数
  const octiveDistance = Number(hightestOctave) - Number(lowestOctave);

  // 如果最高音和最低音在同一个八度，就不再填充中间的八度音
  if (octiveDistance === 0) {
    re = OCTIVE_NAMES.slice(
      OCTIVE_NAMES.indexOf(lowesetName),
      OCTIVE_NAMES.indexOf(highestName) + 1
    ).map((name) => composeNoteStr(name, lowestOctave));
  } else {
    const headNotes = OCTIVE_NAMES.slice(OCTIVE_NAMES.indexOf(lowesetName)).map(
      (name) => composeNoteStr(name, lowestOctave)
    );
    const tailNotes = OCTIVE_NAMES.slice(
      0,
      OCTIVE_NAMES.indexOf(highestName) + 1
    ).map((name) => composeNoteStr(name, hightestOctave));

    re.push(...headNotes);

    for (
      let octave = Number(lowestOctave) + 1;
      octave <= Number(hightestOctave) - 1;
      octave++
    ) {
      re.push(
        ...OCTIVE_NAMES.map((name) => composeNoteStr(name, String(octave)))
      );
    }
    re.push(...tailNotes);
  }

  return re.reverse();
};

export function compareNoteStr(note1: string, note2: string) {
  // 将音符转换为对应的数值
  const noteValues = {
    C: 0,
    D: 2,
    E: 4,
    F: 5,
    G: 7,
    A: 9,
    B: 11,
  };

  // 提取音符的音名和音高
  const regex = /^([A-G])(#|b)?(\d)$/;
  const match1 = note1.match(regex);
  const match2 = note2.match(regex);

  if (!match1 || !match2) {
    console.log("Invalid note format.");
    return 0;
  }

  const [, noteName1, acc1, octave1] = match1;
  const [, noteName2, acc2, octave2] = match2;

  // 计算音符的数值
  const value1 =
    noteValues[noteName1] +
    (acc1 === "#" ? 1 : acc1 === "b" ? -1 : 0) +
    (parseInt(octave1) - 4) * 12;
  const value2 =
    noteValues[noteName2] +
    (acc2 === "#" ? 1 : acc2 === "b" ? -1 : 0) +
    (parseInt(octave2) - 4) * 12;

  // 比较音高
  return value1 - value2;
}
