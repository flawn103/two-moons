import { Midi } from "@tonejs/midi";
import { ChordCollection, InstrumentData, Note } from "@/typings/chordEditor";
import { getNoteByStringAndFret, GUITAR_TUNING } from "@/utils/calc";
import { noteMap } from "rad.js";

/**
 * 将和弦集合导出为MIDI文件
 * @param collection 和弦集合
 * @param chords 和弦数据列表
 * @returns Blob MIDI文件的Blob对象
 */
export function exportCollectionToMidi(
  collection: ChordCollection,
  chords: InstrumentData[]
): Blob {
  // 创建一个新的MIDI文件
  const midi = new Midi();
  // 添加一个音轨
  const track = midi.addTrack();

  // 设置音轨名称为合集名称
  track.name = collection.name;

  let currentTime = 0;

  // 遍历合集中的每个和弦ID
  collection.ids
    .filter((id) => chords.find((c) => c.id === id))
    .forEach((id, index) => {
      // 查找对应的和弦数据
      const chord = chords.find((c) => c.id === id);
      if (!chord) return;

      // 获取和弦长度，默认为1拍
      const length = collection.lengths?.[index] || 1;

      // 获取和弦中的音符
      let notes: Note[] = [];

      // 使用合集中的乐器类型，如果没有则从chord对象获取
      const instrumentType =
        collection.instrument || (chord as any).instrument || "piano";

      if (instrumentType === "piano" && chord.notes) {
        notes = chord.notes;
      } else if (instrumentType === "guitar" && (chord as any).guitarData) {
        // 对于吉他数据，需要转换为音符
        notes = (chord as any).guitarData.map((gd: any) => {
          return getNoteByStringAndFret(gd.string, gd.fret);
        });
      }

      // 将音符添加到音轨
      notes.forEach((note) => {
        // 将音符名称转换为MIDI音符编号
        const midiNote = noteToMidi(note);

        console.log({ length });
        // 添加音符到音轨
        track.addNote({
          midi: midiNote,
          time: currentTime,
          duration: length,
          velocity: 0.8, // 音量，范围0-1
        });
      });

      // 更新当前时间
      currentTime += length;
    });

  console.log(midi);

  // 将MIDI数据转换为Blob
  return new Blob([midi.toArray()], { type: "audio/midi" });
}

/**
 * 将音符转换为MIDI音符编号
 * @param note 音符对象
 * @returns MIDI音符编号
 */
function noteToMidi(note: Note): number {
  // 计算MIDI音符编号：八度*12 + 音名对应的数字
  // MIDI中，中央C (C4) 是60
  return (note.octave + 1) * 12 + (noteMap[note.name] || 0);
}
