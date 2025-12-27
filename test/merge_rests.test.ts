import { describe, test, expect } from "vitest";
import { convertToAbc, mergeAdjacentRests } from "../utils/abcConverter";

describe("合并休止符测试", () => {
  test("单个休止符", () => {
    const result = convertToAbc("C4", "1-2");
    console.log('单个休止符 "1-2":', result);
    expect(result).toBe("C z D");
  });

  test("连续休止符合并", () => {
    const result = convertToAbc("C4", "1--2");
    console.log('连续休止符 "1--2":', result);
    expect(result).toBe("C z2 D");
  });

  test("多个连续休止符合并", () => {
    const result = convertToAbc("C4", "1---2");
    console.log('多个连续休止符 "1---2":', result);
    expect(result).toBe("C z3 D");
  });

  test("分离的休止符不合并", () => {
    const result = convertToAbc("C4", "1-2-3");
    console.log('分离的休止符 "1-2-3":', result);
    expect(result).toBe("C z D z E");
  });

  test("只有休止符", () => {
    const result = convertToAbc("C4", "---");
    console.log('只有休止符 "---":', result);
    expect(result).toBe("z3");
  });

  describe("合并相邻休止符测试", () => {
    test("基本合并测试", () => {
      const result = mergeAdjacentRests([
        {
          note: "rest",
          octave: 0,
          duration: 1,
          startIndex: 0,
          endIndex: 1,
        },
        {
          note: "rest",
          octave: 0,
          duration: 1,
          startIndex: 1,
          endIndex: 2,
        },
        {
          note: "C",
          octave: 4,
          duration: 1,
          startIndex: 2,
          endIndex: 3,
        },
      ]);
      expect(result).toEqual([
        {
          note: "rest",
          octave: 0,
          duration: 2,
          startIndex: 0,
          endIndex: 1,
        },
        {
          note: "C",
          octave: 4,
          duration: 1,
          startIndex: 2,
          endIndex: 3,
        },
      ]);
    });
  });
});
