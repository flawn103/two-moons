import { absoluteIntervalToNote } from "@/utils/calc";

/**
 * 将半音索引对与八度转换为音名字符串数组（如 ["C4", "E4"]）
 * - 支持跨八度的升降（target 可为负或大于 11）
 * - 对输入做兜底，非法时返回空数组
 */
export function semitonePairToNotes(
  semitones: [number, number],
  octave: number
): string[] {
  const [base, target] = semitones;

  if (!Number.isFinite(octave)) octave = 4;
  if (!Number.isFinite(base) || !Number.isFinite(target)) return [];

  const baseMidi = octave * 12 + base;
  const targetMidi = octave * 12 + target;

  const baseNote = absoluteIntervalToNote(baseMidi);
  const targetNote = absoluteIntervalToNote(targetMidi);

  return [
    `${baseNote.name}${baseNote.octave}`,
    `${targetNote.name}${targetNote.octave}`,
  ];
}
