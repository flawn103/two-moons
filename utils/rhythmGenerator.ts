import { RhythmNote, RhythmPattern, DifficultyConfig } from "@/types/rhythm";
import { MUSICALITY_RULES } from "@/constants/rhythm";

// 节奏时间比较精度
const TIME_EPSILON = 0.001;

/**
 * 节奏生成器
 * 负责生成符合音乐性要求的节奏序列
 */
export class RhythmGenerator {
  private readonly rules = MUSICALITY_RULES.GENERATION_RULES;
  private tripletGroupId = 1;

  /**
   * 生成随机节奏
   */
  generate(
    patterns: RhythmPattern[],
    config: DifficultyConfig,
    targetDuration: number = 4
  ): RhythmNote[] {
    this.validateInputs(patterns, config);
    this.tripletGroupId = 1;

    const rhythm = this.generateAttempt(patterns, config, targetDuration);

    return rhythm;
  }

  /**
   * 验证输入参数
   */
  private validateInputs(
    patterns: RhythmPattern[],
    config: DifficultyConfig
  ): void {
    if (!Array.isArray(patterns) || patterns.length === 0) {
      throw new Error("节奏模式数组不能为空");
    }

    if (!config) {
      throw new Error("难度配置不能为空");
    }
  }

  private generateAttempt(
    patterns: RhythmPattern[],
    config: DifficultyConfig,
    targetDuration: number
  ): RhythmNote[] {
    const rhythm: RhythmNote[] = [];
    let totalDuration = 0;

    while (totalDuration < targetDuration) {
      const remainingDuration = targetDuration - totalDuration;

      const availablePatterns = this.getAvailablePatterns(
        patterns,
        config,
        remainingDuration,
        rhythm
      );

      if (availablePatterns.length === 0) {
        const fillNotes = this.smartFill(
          rhythm,
          remainingDuration,
          config,
          patterns
        );
        rhythm.push(...fillNotes);
        totalDuration += fillNotes.reduce(
          (sum, note) => sum + (note.duration || 0),
          0
        );
        continue;
      }

      const selectedPattern = this.selectPatternByWeight(
        availablePatterns,
        config
      );
      const patternToUse = this.clonePatternWithNewTripletId(selectedPattern);

      rhythm.push(...patternToUse.notes.map((note) => ({ ...note })));
      totalDuration += patternToUse.totalDuration;
    }

    return rhythm;
  }

  /**
   * 获取可用的节奏模式
   */
  private getAvailablePatterns(
    patterns: RhythmPattern[],
    config: DifficultyConfig,
    remainingDuration: number,
    currentRhythm: RhythmNote[]
  ): RhythmPattern[] {
    try {
      return patterns.filter((pattern) => {
        try {
          // 检查模式是否有效
          if (!pattern || !pattern.name || !Array.isArray(pattern.notes)) {
            return false;
          }

          // 权重为 0 或未配置则视为禁用
          const weight = Math.max(
            0,
            config.patternWeights?.[pattern.name] ?? 0
          );
          if (weight <= 0) {
            return false;
          }

          // 检查时长是否合适 (use epsilon for float comparison)
          if (pattern.totalDuration > remainingDuration + TIME_EPSILON) {
            return false;
          }

          // 检查是否会产生连续休止符
          if (this.wouldCreateConsecutiveRests(currentRhythm, pattern)) {
            return false;
          }

          // 检查是否是最后一个模式且以休止符结束
          if (this.isApproxEqual(pattern.totalDuration, remainingDuration)) {
            const lastNote = pattern.notes[pattern.notes.length - 1];
            if (lastNote.type === "rest") {
              return false;
            }
          }

          return true;
        } catch (error) {
          console.warn("筛选单个模式时出错:", error);
          return false;
        }
      });
    } catch (error) {
      console.error("筛选可用模式时出错:", error);
      return [];
    }
  }

  /**
   * 检查模式是否会导致连续休止符
   */
  private wouldCreateConsecutiveRests(
    currentRhythm: RhythmNote[],
    pattern: RhythmPattern
  ): boolean {
    try {
      if (!Array.isArray(currentRhythm) || currentRhythm.length === 0) {
        return false;
      }

      if (
        !pattern ||
        !Array.isArray(pattern.notes) ||
        pattern.notes.length === 0
      ) {
        return false;
      }

      const lastNote = currentRhythm[currentRhythm.length - 1];
      const firstNoteOfPattern = pattern.notes[0];

      return lastNote?.type === "rest" && firstNoteOfPattern?.type === "rest";
    } catch (error) {
      console.error("检查连续休止符时出错:", error);
      return true; // 出错时保守处理，认为会产生连续休止符
    }
  }

  /**
   * 基于权重选择模式
   */
  private selectPatternByWeight(
    patterns: RhythmPattern[],
    config: DifficultyConfig
  ): RhythmPattern {
    try {
      if (!Array.isArray(patterns) || patterns.length === 0) {
        throw new Error("没有可用的节奏模式");
      }

      if (patterns.length === 1) {
        return patterns[0];
      }

      const weightedPatterns: RhythmPattern[] = [];

      patterns.forEach((pattern) => {
        try {
          const weight = Math.max(
            0,
            config.patternWeights?.[pattern.name] ?? 0
          );
          if (weight >= 1) {
            for (let i = 0; i < weight; i++) {
              weightedPatterns.push(pattern);
            }
          }
        } catch (error) {
          console.warn("处理模式权重时出错:", error);
          // 出错时不默认加入，避免意外参与
        }
      });

      if (weightedPatterns.length === 0) {
        // 无权重可用时，回退为第一个模式（理论上不应该发生，因为 getAvailablePatterns 已过滤）
        return patterns[0];
      }

      const randomIndex = Math.floor(Math.random() * weightedPatterns.length);
      return weightedPatterns[randomIndex];
    } catch (error) {
      console.error("选择节奏模式时出错:", error);
      return (
        patterns[0] || {
          name: "fallback",
          totalDuration: 0.25,
          notes: [{ duration: 0.25, type: "note" }],
        }
      );
    }
  }

  /**
   * 克隆模式并分配新的三连音组ID
   */
  private clonePatternWithNewTripletId(pattern: RhythmPattern): RhythmPattern {
    try {
      if (!pattern || !Array.isArray(pattern.notes)) {
        throw new Error("无效的节奏模式");
      }

      const hasTriplets = pattern.notes.some((note) => note.isTriplet);

      if (!hasTriplets) {
        return {
          ...pattern,
          notes: pattern.notes.map((note) => ({ ...note })),
        };
      }

      const currentTripletId = this.tripletGroupId++;
      return {
        ...pattern,
        notes: pattern.notes.map((note) => ({
          ...note,
          tripletGroupId: note.isTriplet
            ? currentTripletId
            : note.tripletGroupId,
        })),
      };
    } catch (error) {
      console.error("克隆节奏模式时出错:", error);
      return {
        name: "fallback",
        totalDuration: 0.25,
        notes: [{ duration: 0.25, type: "note" }],
      };
    }
  }

  /**
   * 智能填充剩余时间
   */
  private smartFill(
    currentRhythm: RhythmNote[],
    remainingDuration: number,
    config: DifficultyConfig,
    patterns: RhythmPattern[]
  ): RhythmNote[] {
    try {
      if (remainingDuration <= 0) {
        return [];
      }

      const fillDuration = Math.min(
        this.rules.MIN_FILL_DURATION || 0.25,
        remainingDuration
      );
      const lastNote =
        Array.isArray(currentRhythm) && currentRhythm.length > 0
          ? currentRhythm[currentRhythm.length - 1]
          : null;

      // 依据 allowedPatterns + patternWeights 决定填充类型，移除概率因素
      const preferRest = this.shouldPreferRestFill(config, patterns);

      // 如果是最后一段填充，强制为音符
      const isLastSegment = this.isApproxEqual(remainingDuration, fillDuration);

      // 如果上一个音符是休止符，则本次必须是音符，避免连续休止符
      // 如果是最后一段，也必须是音符
      const shouldBeRest =
        !isLastSegment && lastNote?.type !== "rest" && preferRest;

      return [
        {
          duration: fillDuration,
          type: shouldBeRest ? "rest" : "note",
        },
      ];
    } catch (error) {
      console.error("智能填充时出错:", error);
      return [
        {
          duration: Math.min(0.25, remainingDuration),
          type: "note",
        },
      ];
    }
  }

  /**
   * 判断在填充片段时是否偏向使用休止符
   * 基于权重：纯休止符模式的总权重 > 非纯休止符模式总权重 时偏向休止符
   */
  private shouldPreferRestFill(
    config: DifficultyConfig,
    patterns: RhythmPattern[]
  ): boolean {
    try {
      let restWeightSum = 0;
      let noteWeightSum = 0;

      patterns.forEach((p) => {
        const weight = Math.max(0, config.patternWeights?.[p.name] ?? 0);
        if (weight <= 0) return;
        const isRestOnly =
          Array.isArray(p.notes) &&
          p.notes.length > 0 &&
          p.notes.every((n) => n.type === "rest");
        if (isRestOnly) {
          restWeightSum += weight;
        } else {
          noteWeightSum += weight;
        }
      });

      // 如果休止符模式权重更高，则在填充时偏向休止符
      return restWeightSum > noteWeightSum;
    } catch (error) {
      console.warn("计算填充偏好时出错，默认偏向音符:", error);
      return false;
    }
  }

  /**
   * 辅助方法：比较两个时间值是否近似相等
   *
   * 为什么需要这个方法？
   * JavaScript 使用 IEEE 754 双精度浮点数，在处理节奏时值（如 1/3 拍的三连音）时会产生精度误差。
   * 例如：1/3 + 1/3 + 1/3 在计算机中可能等于 0.9999999999999999 而不完全等于 1。
   * 直接使用 === 比较会导致逻辑判断错误（比如判断小节是否填满时）。
   * 因此必须使用一个极小的阈值 (EPSILON) 来判断两个数值是否"足够接近"。
   */
  private isApproxEqual(a: number, b: number): boolean {
    return Math.abs(a - b) < TIME_EPSILON;
  }
}

// 导出单例实例
export const rhythmGenerator = new RhythmGenerator();
