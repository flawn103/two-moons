/**
 * 节奏音乐理论常量
 * 包含音乐性验证的核心规则和配置
 */

// 音乐性验证规则配置
export const MUSICALITY_RULES = {
  // 休止符相关规则
  REST_RULES: {
    MAX_RATIO: 0.4, // 最大休止符比例 (40%)
    MAX_CONSECUTIVE_DURATION: 1.0, // 最大连续休止符时长 (1拍)
    ALLOW_START_WITH_REST: false, // 是否允许以休止符开始
    ALLOW_END_WITH_REST: false, // 是否允许以休止符结束
  },

  // 节奏生成规则
  GENERATION_RULES: {
    TARGET_DURATION: 4, // 目标小节时长 (4拍)
    MIN_FILL_DURATION: 0.25, // 最小填充时长 (十六分音符)
    MAX_GENERATION_ATTEMPTS: 3, // 最大生成尝试次数
    REST_PROBABILITY_REDUCTION: 0.5, // 连续休止符概率降低系数
  },
} as const;

// 音符时值常量
export const NOTE_DURATIONS = {
  WHOLE: 4,
  HALF: 2,
  QUARTER: 1,
  EIGHTH: 0.5,
  SIXTEENTH: 0.25,
  THIRTY_SECOND: 0.125,
} as const;
