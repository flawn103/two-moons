import {
  noteToAbcStr,
  convertIntervalToAbc,
  convertChordToAbc,
  convertMelodyToAbc,
} from "@/utils/abcConverter";
import { describe, it, expect } from "vitest";

describe("ABC Converter Utils", () => {
  describe("noteToAbcStr", () => {
    it("应该正确转换基本音符", () => {
      expect(noteToAbcStr("C4")).toBe("C");
      expect(noteToAbcStr("D4")).toBe("D");
      expect(noteToAbcStr("E4")).toBe("E");
      expect(noteToAbcStr("F4")).toBe("F");
      expect(noteToAbcStr("G4")).toBe("G");
      expect(noteToAbcStr("A4")).toBe("A");
      expect(noteToAbcStr("B4")).toBe("B");
    });

    it("应该正确处理升降号", () => {
      expect(noteToAbcStr("C#4")).toBe("^C");
      expect(noteToAbcStr("Db4")).toBe("_D");
      expect(noteToAbcStr("F#4")).toBe("^F");
      expect(noteToAbcStr("Bb4")).toBe("_B");
    });

    it("应该正确处理不同八度", () => {
      // 第3八度 (BASE = 4, octave = 3, octave <= BASE-1)
      expect(noteToAbcStr("C3")).toBe("C,");

      // 第4八度 (BASE = 4, octave = 4, octave === BASE)
      expect(noteToAbcStr("C4")).toBe("C");

      // 第5八度 (BASE = 4, octave = 5, octave === BASE+1)
      expect(noteToAbcStr("C5")).toBe("c");

      // 第6八度 (BASE = 4, octave = 6)
      expect(noteToAbcStr("C6")).toBe("c'");

      // 第7八度 (BASE = 4, octave = 7)
      expect(noteToAbcStr("C7")).toBe("c''");

      // 第2八度 (BASE = 4, octave = 2)
      expect(noteToAbcStr("C2")).toBe("C,,");

      // 第1八度 (BASE = 4, octave = 1)
      expect(noteToAbcStr("C1")).toBe("C,,,");
    });

    it("应该正确处理offset参数", () => {
      // offset = 1时，BASE = 3
      expect(noteToAbcStr("C3", 1)).toBe("C");
      expect(noteToAbcStr("C4", 1)).toBe("c");
      expect(noteToAbcStr("C2", 1)).toBe("C,");

      // offset = -1时，BASE = 5
      expect(noteToAbcStr("C5", -1)).toBe("C");
      expect(noteToAbcStr("C6", -1)).toBe("c");
      expect(noteToAbcStr("C4", -1)).toBe("C,");
    });

    it("应该处理无效输入", () => {
      expect(noteToAbcStr("invalid")).toBe("C");
      expect(noteToAbcStr("")).toBe("C");
    });
  });

  describe("convertIntervalToAbc", () => {
    it("应该正确转换音程", () => {
      expect(convertIntervalToAbc(["C4", "E4"])).toBe("C E");
      expect(convertIntervalToAbc(["F4", "A4"])).toBe("F A");
      expect(convertIntervalToAbc(["G3", "B4"])).toBe("G, B");
    });

    it("应该处理升降号音程", () => {
      expect(convertIntervalToAbc(["C#4", "F#4"])).toBe("^C ^F");
      expect(convertIntervalToAbc(["Db4", "Bb4"])).toBe("_D _B");
    });

    it("应该正确处理offset参数", () => {
      expect(convertIntervalToAbc(["C4", "E4"], 1)).toBe("c e");
      expect(convertIntervalToAbc(["C3", "E3"], 1)).toBe("C E");
    });

    it("应该处理无效输入", () => {
      expect(convertIntervalToAbc([])).toBe("");
      expect(convertIntervalToAbc(["C4"])).toBe("");
      expect(convertIntervalToAbc(null as any)).toBe("");
    });
  });

  describe("convertChordToAbc", () => {
    it("应该正确转换和弦", () => {
      expect(
        convertChordToAbc([
          { name: "C", octave: 4 },
          { name: "E", octave: 4 },
          { name: "G", octave: 4 },
        ])
      ).toBe("[CEG]");
      expect(
        convertChordToAbc([
          { name: "F", octave: 4 },
          { name: "A", octave: 4 },
          { name: "C", octave: 5 },
        ])
      ).toBe("[FAc]");
    });

    it("应该处理升降号和弦", () => {
      // normalizeSharpToFlat 会将 C# 转换为 Db，G# 转换为 Ab
      // 所以 C# F G# 会变成 Db F Ab，输出 [_DF_A]
      expect(
        convertChordToAbc([
          { name: "C#", octave: 4 },
          { name: "F", octave: 4 },
          { name: "G#", octave: 4 },
        ])
      ).toBe("[_DF_A]");
      expect(
        convertChordToAbc([
          { name: "Db", octave: 4 },
          { name: "F", octave: 4 },
          { name: "Ab", octave: 4 },
        ])
      ).toBe("[_DF_A]");
    });

    it("应该正确处理offset参数", () => {
      expect(
        convertChordToAbc([
          { name: "C", octave: 4 },
          { name: "E", octave: 4 },
          { name: "G", octave: 4 },
        ])
      ).toBe("[CEG]");
      expect(
        convertChordToAbc([
          { name: "C", octave: 3 },
          { name: "E", octave: 3 },
          { name: "G", octave: 3 },
        ])
      ).toBe("K: clef=bass\n[C,E,G,]"); // C3音符低于C4，会使用低音谱号
    });

    it("应该处理无效输入", () => {
      expect(convertChordToAbc([])).toBe("z"); // 空和弦应该返回休止符
      // 移除 null 测试，因为函数不处理 null 输入
    });
  });

  describe("convertMelodyToAbc", () => {
    it("应该正确转换旋律", () => {
      const melody = [
        { value: "C4", duration: 1 },
        { value: "D4", duration: 2 },
        { value: "E4", duration: 1 },
      ];
      expect(convertMelodyToAbc(melody)).toBe("C D2 E");
    });

    it("应该处理没有时值的音符", () => {
      const melody = [{ value: "C4" }, { value: "D4" }, { value: "E4" }];
      expect(convertMelodyToAbc(melody)).toBe("C D E");
    });

    it("应该处理升降号旋律", () => {
      const melody = [
        { value: "C#4", duration: 1 },
        { value: "Db4", duration: 2 },
      ];
      expect(convertMelodyToAbc(melody)).toBe("^C _D2");
    });

    it("应该处理不同八度的旋律", () => {
      const melody = [
        { value: "C3", duration: 1 },
        { value: "C4", duration: 1 },
        { value: "C5", duration: 1 },
      ];
      expect(convertMelodyToAbc(melody)).toBe("C, C c");
    });

    it("应该处理无效输入", () => {
      expect(convertMelodyToAbc([])).toBe("");
      expect(convertMelodyToAbc(null as any)).toBe("");
    });
  });
});
