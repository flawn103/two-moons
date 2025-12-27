import {
  absoluteIntervalToNote,
  getAbsoluteInterval,
  getFrequency,
  getInterval,
  getScaleDegree,
  convertNotesToGuitarData,
  GUITAR_TUNING,
} from "@/utils/calc";
import { describe, it, expect } from "vitest";

describe("ChordEditor Utils", () => {
  describe("getAbsoluteInterval", () => {
    it("应该正确计算绝对音程值", () => {
      expect(getAbsoluteInterval({ name: "C", octave: 4 })).toBe(48);
      expect(getAbsoluteInterval({ name: "C#", octave: 4 })).toBe(49);
      expect(getAbsoluteInterval({ name: "A", octave: 0 })).toBe(9);
    });

    it("应该处理带升降号的音符", () => {
      expect(getAbsoluteInterval({ name: "F#", octave: 3 })).toBe(42);
      expect(getAbsoluteInterval({ name: "Db", octave: 3 })).toBe(37);
      expect(getAbsoluteInterval({ name: "Bb", octave: 4 })).toBe(58);
      expect(getAbsoluteInterval({ name: "A#", octave: 3 })).toBe(46);
    });

    it("应该处理低音和高音", () => {
      expect(getAbsoluteInterval({ name: "C", octave: 1 })).toBe(12);
      expect(getAbsoluteInterval({ name: "C", octave: 8 })).toBe(96);
    });
  });

  describe("absoluteIntervalToNote", () => {
    it("应该正确转换绝对音程值到音符对象", () => {
      expect(absoluteIntervalToNote(60)).toEqual({ name: "C", octave: 5 });
      expect(absoluteIntervalToNote(61)).toEqual({ name: "Db", octave: 5 });
      expect(absoluteIntervalToNote(64)).toEqual({ name: "E", octave: 5 });
      expect(absoluteIntervalToNote(79)).toEqual({ name: "G", octave: 6 });
    });

    it("应该处理边界值", () => {
      expect(absoluteIntervalToNote(0)).toEqual({ name: "C", octave: 0 });
      expect(absoluteIntervalToNote(21)).toEqual({ name: "A", octave: 1 });
      expect(absoluteIntervalToNote(127)).toEqual({ name: "G", octave: 10 });
    });

    it("应该与getAbsoluteInterval互为逆运算", () => {
      const testNotes = [
        { name: "C", octave: 4 },
        { name: "Db", octave: 4 },
        { name: "E", octave: 4 },
        { name: "G", octave: 5 },
        { name: "A", octave: 0 },
        { name: "Gb", octave: 3 },
        { name: "Bb", octave: 4 },
        { name: "Db", octave: 3 },
        { name: "Bb", octave: 3 },
      ];

      testNotes.forEach((note) => {
        const interval = getAbsoluteInterval(note);
        const convertedBack = absoluteIntervalToNote(interval);
        expect(convertedBack).toEqual(note);
      });

      // 反向测试：从MIDI数值到音符再到MIDI数值
      const testMidiNumbers = [48, 54, 58, 60, 66, 72, 21, 79];
      testMidiNumbers.forEach((midiNumber) => {
        const note = absoluteIntervalToNote(midiNumber);
        const convertedBack = getAbsoluteInterval(note);
        expect(convertedBack).toBe(midiNumber);
      });
    });
  });

  describe("getFrequency", () => {
    it("应该计算正确的频率", () => {
      expect(getFrequency({ name: "A", octave: 4 })).toBeCloseTo(440, 1);
      expect(getFrequency({ name: "C", octave: 4 })).toBeCloseTo(261.63, 1);
      expect(getFrequency({ name: "C", octave: 5 })).toBeCloseTo(523.25, 1);
    });
  });

  describe("getInterval", () => {
    it("应该计算正确的音程", () => {
      expect(
        getInterval({ name: "C", octave: 4 }, { name: "E", octave: 4 })
      ).toBe(4);
      expect(
        getInterval({ name: "C", octave: 4 }, { name: "G", octave: 4 })
      ).toBe(7);
      expect(
        getInterval({ name: "C", octave: 4 }, { name: "C", octave: 5 })
      ).toBe(12);
      expect(
        getInterval({ name: "E", octave: 4 }, { name: "C", octave: 4 })
      ).toBe(8);
    });
  });

  describe("getScaleDegree", () => {
    it("应该识别正确的度数", () => {
      expect(
        getScaleDegree({ name: "C", octave: 4 }, { name: "C", octave: 4 })
      ).toBe("R");
      expect(
        getScaleDegree({ name: "D", octave: 4 }, { name: "C", octave: 4 })
      ).toBe("2");
      expect(
        getScaleDegree({ name: "E", octave: 4 }, { name: "C", octave: 4 })
      ).toBe("3");
      expect(
        getScaleDegree({ name: "G", octave: 4 }, { name: "C", octave: 4 })
      ).toBe("5");
      expect(
        getScaleDegree({ name: "C", octave: 5 }, { name: "C", octave: 4 })
      ).toBe("R");
    });
  });
});
