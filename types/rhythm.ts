// 节奏相关的类型定义

export interface RhythmGenerationConfig {
  targetDuration: number;
  difficulty: string;
  allowDottedNotes: boolean;
  allowTriplets: boolean;
}

export interface RhythmValidationResult {
  isValid: boolean;
  issues: string[];
  fixedRhythm?: RhythmNote[];
}

export interface RhythmNote {
  duration: number;
  isDotted?: boolean;
  isTriplet?: boolean;
  tripletGroupId?: number;
  type: "note" | "rest";
}

export interface RhythmPattern {
  name: string;
  totalDuration: number;
  notes: RhythmNote[];
}

export interface DifficultyConfig {
  name: string;
  patternWeights: Record<string, number>;
}

export type DifficultyLevel =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert";

// 音符状态类型
export type NoteStatus = "unplayed" | "correct" | "incorrect" | "playing";

// 错误类型定义
export class RhythmGenerationError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = "RhythmGenerationError";
  }
}

export class RhythmValidationError extends Error {
  constructor(
    message: string,
    public issues: string[]
  ) {
    super(message);
    this.name = "RhythmValidationError";
  }
}
