import { describe, test, expect } from "vitest";
import { convertToAbc } from "../utils/abcConverter";

describe("abcConverter 八度修复测试", () => {
  describe("基本根音转调测试", () => {
    test("C4 根音转调测试", () => {
      const result = convertToAbc("C4", "123");
      expect(result).toBe("C D E");
    });

    test("D4 根音转调测试", () => {
      const result = convertToAbc("D4", "123");
      expect(result).toBe("D E ^F");
    });

    test("G4 根音转调测试", () => {
      const result = convertToAbc("G4", "123");
      expect(result).toBe("G A B");
    });

    test("F4 根音转调测试", () => {
      const result = convertToAbc("F4", "123");
      expect(result).toBe("F G A");
    });

    test("升降号根音转调测试", () => {
      const result1 = convertToAbc("F#4", "123");
      expect(result1).toBe("^F ^G ^A");

      const result2 = convertToAbc("Bb4", "123");
      expect(result2).toBe("^A c d");
    });
  });

  describe("八度处理测试", () => {
    test("高八度转调测试", () => {
      const result = convertToAbc("C4", "1'2'3'");
      expect(result).toBe("c d e");
    });

    test("低八度转调测试", () => {
      const result = convertToAbc("C4", "1,2,3,");
      expect(result).toBe("C, D, E,");
    });

    test("极高八度测试", () => {
      const result = convertToAbc("C4", "1''2''3''");
      expect(result).toBe("c' d' e'");
    });

    test("极低八度测试", () => {
      const result = convertToAbc("C4", "1,,2,,3,,");
      expect(result).toBe("C,, D,, E,,");
    });

    test("混合八度测试", () => {
      const result = convertToAbc("C4", "1'2,3");
      expect(result).toBe("c D, E");
    });
  });

  describe("复杂音符序列测试", () => {
    test("完整音阶测试", () => {
      const result = convertToAbc("C4", "1234567");
      expect(result).toBe("C D E F G A B");
    });

    test("带升降号的音阶测试", () => {
      const result = convertToAbc("G4", "1234567");
      expect(result).toBe("G A B c d e ^f");
    });

    test("休止符混合测试", () => {
      const result = convertToAbc("C4", "1 0 2 0 3");
      expect(result).toBe("C z D z E");
    });

    test("长序列测试", () => {
      const result = convertToAbc("C4", "12345671234567");
      expect(result).toBe("C D E F G A B C D E F G A B");
    });
  });

  describe("三连音测试", () => {
    test("基本三连音测试", () => {
      const result = convertToAbc("C4", "(123)");
      expect(result).toBe("C D E");
    });

    test("多个三连音测试", () => {
      const result = convertToAbc("C4", "(123)(456)");
      expect(result).toBe("C D E F G A");
    });

    test("三连音与普通音符混合测试", () => {
      const result = convertToAbc("C4", "1(234)5");
      expect(result).toBe("C D E F G");
    });
  });

  describe("边界情况和错误处理测试", () => {
    test("空字符串测试", () => {
      const result = convertToAbc("C4", "");
      expect(result).toBe("");
    });

    test("只有休止符测试", () => {
      const result = convertToAbc("C4", "000");
      expect(result).toBe("z3");
    });

    test("无效音符测试", () => {
      const result = convertToAbc("C4", "189");
      expect(result).toBe("C"); // 只有1是有效的，8和9被忽略
    });

    test("无效根音测试", () => {
      // 测试无效根音是否能正常处理
      const result = convertToAbc("X4", "123");
      expect(result).toBe("C D E"); // 应该回退到默认处理
    });
  });

  describe("不同根音八度测试", () => {
    test("C3 根音测试", () => {
      const result = convertToAbc("C3", "123");
      expect(result).toBe("C, D, E,");
    });

    test("C5 根音测试", () => {
      const result = convertToAbc("C5", "123");
      expect(result).toBe("c d e");
    });

    test("C2 根音测试", () => {
      const result = convertToAbc("C2", "123");
      expect(result).toBe("C,, D,, E,,");
    });

    test("C6 根音测试", () => {
      const result = convertToAbc("C6", "123");
      expect(result).toBe("c' d' e'");
    });
  });

  describe("特殊符号处理测试", () => {
    test("带空格的输入测试", () => {
      const result = convertToAbc("C4", "1 2 3");
      expect(result).toBe("C D E");
    });

    test("多余空格处理测试", () => {
      const result = convertToAbc("C4", "  1   2   3  ");
      expect(result).toBe("C D E");
    });

    test("混合符号测试", () => {
      const result = convertToAbc("C4", "1'2,3");
      expect(result).toBe("c D, E");
    });
  });
});
