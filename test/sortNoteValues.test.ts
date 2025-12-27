import { describe, test, expect } from "vitest";
import { sortNoteValues } from "../components/MoaRoll/utils/note";

describe("sortNoteValues", () => {
  test("should sort notes correctly by pitch", () => {
    const input = ["C#4/Db4", "C4", "C5"];
    const result = sortNoteValues(input);

    // C4 应该在 C#4/Db4 之前，因为 C 的音高比 C# 低
    expect(result).toEqual(["C4", "C#4/Db4", "C5"]);
  });

  test("should handle mixed note formats", () => {
    const input = ["D5", "C#4", "C4", "Eb4"];
    const result = sortNoteValues(input);

    expect(result).toEqual(["C4", "C#4", "Eb4", "D5"]);
  });

  test("should handle compound note names with slash", () => {
    const input = ["F#4/Gb4", "F4", "G4"];
    const result = sortNoteValues(input);

    expect(result).toEqual(["F4", "F#4/Gb4", "G4"]);
  });

  test("should correctly sort sharp and flat notes", () => {
    const input = ["C#4", "Db4", "C4", "D4"];
    const result = sortNoteValues(input);

    // C4 < C#4 = Db4 < D4
    expect(result).toEqual(["C4", "C#4", "Db4", "D4"]);
  });

  test("should handle complex mixed sharp/flat compound names", () => {
    const input = ["A#4/Bb4", "A4", "B4", "G#4/Ab4", "G4"];
    const result = sortNoteValues(input);

    expect(result).toEqual(["G4", "G#4/Ab4", "A4", "A#4/Bb4", "B4"]);
  });

  test("should sort across different octaves", () => {
    const input = ["C5", "B4", "C#5/Db5", "A#4/Bb4"];
    const result = sortNoteValues(input);

    expect(result).toEqual(["A#4/Bb4", "B4", "C5", "C#5/Db5"]);
  });

  test("should handle edge case with same pitch different notation", () => {
    const input = ["C#4", "Db4"];
    const result = sortNoteValues(input);

    // C# 和 Db 是同一个音，但 C# 应该排在前面（按字母顺序）
    expect(result).toEqual(["C#4", "Db4"]);
  });
});
