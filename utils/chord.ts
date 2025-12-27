import { ChordCollection, InstrumentData } from "@/typings/chordEditor";

// 定义和弦类型及其音程结构
export const CHORDS = [
  // 三和弦
  { name: "maj", intervals: [0, 4, 7], canOmit: [7] }, // 大三和弦
  { name: "min", intervals: [0, 3, 7], canOmit: [7] }, // 小三和弦
  // 七和弦
  { name: "maj7", intervals: [0, 4, 7, 11], canOmit: [7, 4] }, // 大七和弦
  { name: "7", intervals: [0, 4, 7, 10], canOmit: [7, 4] }, // 属七和弦
  { name: "min7", intervals: [0, 3, 7, 10], canOmit: [7] }, // 小七和弦
  { name: "dim7", intervals: [0, 3, 6, 9] }, // 减七和弦
  { name: "m7b5", intervals: [0, 3, 6, 10] }, // 半减七和弦
  { name: "mMaj7", intervals: [0, 3, 7, 11], canOmit: [7] }, // 小大七和弦

  { name: "dim", intervals: [0, 3, 6] }, // 减三和弦
  { name: "aug", intervals: [0, 4, 8] }, // 增三和弦
  { name: "sus2", intervals: [0, 2, 7], canOmit: [7, 11, 10] }, // sus2
  { name: "sus4", intervals: [0, 5, 7], canOmit: [7, 11, 10] }, // sus4

  // 九和弦
  { name: "maj7add9", intervals: [0, 2, 4, 7, 11], canOmit: [7] }, // 大七加九和弦
  { name: "maj9", intervals: [0, 2, 4, 7, 11], canOmit: [7] }, // 大九和弦
  { name: "9", intervals: [0, 2, 4, 7, 10], canOmit: [7] }, // 属九和弦
  { name: "m9", intervals: [0, 2, 3, 7, 10], canOmit: [7] }, // 小九和弦
];

export function getCollectionInstrument(
  collection: ChordCollection,
  favorites: InstrumentData[]
) {
  if (!collection) {
    return "piano"; // 默认返回钢琴
  }

  // 如果合集有instrument字段，直接返回
  if (collection.instrument) {
    return collection.instrument;
  }

  // 如果没有instrument字段，尝试从第一个block获取
  if (collection.ids.length > 0) {
    const firstChordId = collection.ids[0];
    const firstChord = favorites.find((f) => f.id === firstChordId);

    // 这里需要兼容旧的InstrumentData，如果存在instrument字段则使用它
    if (firstChord && (firstChord as any).instrument) {
      return (firstChord as any).instrument;
    }
  }

  return "piano"; // 默认返回钢琴
}
