import { proxy, ref } from "valtio";
import { subscribeKey } from "valtio/utils";
import { isBrowser } from "@/utils/env";
import MoaTone, { MoaSynth } from "@/utils/MoaTone";
import { rhythmGenerator } from "@/utils/rhythmGenerator";
import type {
  RhythmNote,
  RhythmPattern,
  DifficultyConfig,
} from "@/types/rhythm";

// 预定义的节奏模式
export const RHYTHM_PATTERNS: RhythmPattern[] = [
  // 基础模式 (难度: 1)
  {
    name: "四分音符",
    totalDuration: 1,
    notes: [{ duration: 1, type: "note" }],
  },
  {
    name: "八分音符",
    totalDuration: 0.5,
    notes: [{ duration: 0.5, type: "note" }],
  },
  {
    name: "十六分音符",
    totalDuration: 0.25,
    notes: [{ duration: 0.25, type: "note" }],
  },
  {
    name: "二分音符",
    totalDuration: 2,
    notes: [{ duration: 2, type: "note" }],
  },

  // 休止符模式 (难度: 1)
  {
    name: "四分休止符",
    totalDuration: 1,
    notes: [{ duration: 1, type: "rest" }],
  },
  {
    name: "八分休止符",
    totalDuration: 0.5,
    notes: [{ duration: 0.5, type: "rest" }],
  },
  {
    name: "十六分休止符",
    totalDuration: 0.25,
    notes: [{ duration: 0.25, type: "rest" }],
  },

  // 附点音符模式 (难度: 2)
  {
    name: "附点四分音符",
    totalDuration: 1.5,
    notes: [{ duration: 1.5, isDotted: true, type: "note" }],
  },
  {
    name: "附点八分音符",
    totalDuration: 0.75,
    notes: [{ duration: 0.75, isDotted: true, type: "note" }],
  },

  // 三连音模式 (难度: 3)
  {
    name: "八分三连音",
    totalDuration: 1, // 占一拍的时间
    notes: [
      { duration: 1 / 3, isTriplet: true, tripletGroupId: 1, type: "note" },
      { duration: 1 / 3, isTriplet: true, tripletGroupId: 1, type: "note" },
      { duration: 1 / 3, isTriplet: true, tripletGroupId: 1, type: "note" },
    ],
  },

  // 三连音模式 (难度: 4)
  {
    name: "四分三连音",
    totalDuration: 2, // 占两拍的时间
    notes: [
      { duration: 2 / 3, isTriplet: true, tripletGroupId: 2, type: "note" },
      { duration: 2 / 3, isTriplet: true, tripletGroupId: 2, type: "note" },
      { duration: 2 / 3, isTriplet: true, tripletGroupId: 2, type: "note" },
    ],
  },

  // 混合三连音模式 (难度: 3)
  {
    name: "八分三连音含休止符",
    totalDuration: 1,
    notes: [
      { duration: 1 / 3, isTriplet: true, tripletGroupId: 3, type: "note" },
      { duration: 1 / 3, isTriplet: true, tripletGroupId: 3, type: "rest" },
      { duration: 1 / 3, isTriplet: true, tripletGroupId: 3, type: "note" },
    ],
  },

  // 组合模式 (难度: 2)
  {
    name: "八分+十六分组合",
    totalDuration: 1,
    notes: [
      { duration: 0.5, type: "note" },
      { duration: 0.25, type: "note" },
      { duration: 0.25, type: "note" },
    ],
  },

  {
    name: "附点八分+十六分",
    totalDuration: 1,
    notes: [
      { duration: 0.75, isDotted: true, type: "note" },
      { duration: 0.25, type: "note" },
    ],
  },
];

// 难度级别配置
export const DIFFICULTY_LEVELS: Record<string, DifficultyConfig> = {
  beginner: {
    name: "初级",
    patternWeights: {
      四分音符: 30,
      八分音符: 20,
      四分休止符: 10,
      八分休止符: 10,
    },
  },

  intermediate: {
    name: "中级",
    patternWeights: {
      四分音符: 20,
      八分音符: 20,
      十六分音符: 10,
      二分音符: 10,
      四分休止符: 10,
      八分休止符: 10,
      十六分休止符: 10,
      附点四分音符: 10,
      附点八分音符: 10,
      "八分+十六分组合": 20,
      "附点八分+十六分": 10,
    },
  },

  advanced: {
    name: "高级",
    patternWeights: {
      四分音符: 20,
      八分音符: 20,
      十六分音符: 10,
      二分音符: 10,
      四分休止符: 10,
      八分休止符: 10,
      十六分休止符: 10,
      附点四分音符: 10,
      附点八分音符: 10,
      八分三连音: 20,
      八分三连音含休止符: 2,
      "八分+十六分组合": 10,
      "附点八分+十六分": 10,
    },
  },

  expert: {
    name: "专家",
    patternWeights: {
      四分音符: 10,
      八分音符: 20,
      十六分音符: 10,
      二分音符: 10,
      四分休止符: 10,
      八分休止符: 10,
      十六分休止符: 10,
      附点四分音符: 10,
      附点八分音符: 10,
      八分三连音: 20,
      四分三连音: 10,
      八分三连音含休止符: 2,
      "八分+十六分组合": 10,
      "附点八分+十六分": 10,
    },
  },
};

export interface RhythmState {
  // 节奏相关状态
  currentRhythm: RhythmNote[];
  bpm: number;
  isPlaying: boolean;
  isPracticing: boolean;
  difficulty: string; // 当前难度级别

  // 用户配置选项
  enableGuideAudio: boolean; // 是否启用练习时的指引音频

  // 播放高亮相关状态
  playbackStartTime: number | null;

  // 练习相关状态
  userTaps: number[];
  expectedTaps: number[];
  startTime: number | null;
  practiceStarted: boolean;

  // 预备拍相关状态
  isPreparationBeats: boolean; // 是否正在播放预备拍
  preparationBeatCount: number; // 当前预备拍计数 (1-4)

  // 结果相关状态
  accuracy: number | null;
  feedback: string;
  showResult: boolean;

  // 音频相关
  synth: MoaSynth | null;

  // 音符状态数组 - 用于标记正确/错误的音符
  noteStatus: import("@/types/rhythm").NoteStatus[];
}

// 创建节奏练习状态
export const rhythmStore = proxy<RhythmState>({
  currentRhythm: [],
  bpm: 90,
  isPlaying: false,
  isPracticing: false,
  difficulty: "intermediate", // 默认中级难度

  // 用户配置选项
  enableGuideAudio: false, // 默认关闭指引音频

  playbackStartTime: null,

  userTaps: [],
  expectedTaps: [],
  startTime: null,
  practiceStarted: false,

  // 预备拍状态初始化
  isPreparationBeats: false,
  preparationBeatCount: 0,

  accuracy: null,
  feedback: "",
  showResult: false,

  synth: null,

  // 音符状态数组初始化
  noteStatus: [],
});

// 节奏练习相关的操作
export const rhythmActions = {
  // 从本地存储加载配置
  loadConfigFromLocal: () => {
    if (!isBrowser()) return;
    try {
      const raw = localStorage.getItem("PRACTICE_RANDOM_RHYTHM_CONFIG");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (typeof parsed?.bpm === "number") {
        // 限制到 60-180 区间
        rhythmStore.bpm = Math.min(180, Math.max(60, parsed.bpm));
      }
      if (
        typeof parsed?.difficulty === "string" &&
        DIFFICULTY_LEVELS[parsed.difficulty]
      ) {
        rhythmStore.difficulty = parsed.difficulty;
      }
      if (typeof parsed?.enableGuideAudio === "boolean") {
        rhythmStore.enableGuideAudio = parsed.enableGuideAudio;
      }
    } catch (error) {
      console.warn("Failed to load random rhythm config:", error);
    }
  },
  // 生成随机节奏
  generateRandomRhythm: (difficultyLevel?: string) => {
    const difficulty = difficultyLevel || rhythmStore.difficulty;
    const targetDuration = 4; // 4拍

    // 使用模块化的节奏生成器
    const difficultyConfig = DIFFICULTY_LEVELS[difficulty];
    const generatedRhythm = rhythmGenerator.generate(
      RHYTHM_PATTERNS,
      difficultyConfig,
      targetDuration
    );

    rhythmStore.currentRhythm = generatedRhythm;
    // 初始化音符状态数组
    rhythmStore.noteStatus = new Array(generatedRhythm.length).fill("unplayed");
    rhythmActions.calculateExpectedTaps();
  },

  // 设置难度级别
  setDifficulty: (level: string) => {
    if (DIFFICULTY_LEVELS[level]) {
      rhythmStore.difficulty = level;
      // 重新生成节奏以应用新难度
      rhythmActions.generateRandomRhythm();
    }
  },

  // 计算期望的拍击时间
  calculateExpectedTaps: () => {
    const { currentRhythm, bpm } = rhythmStore;
    const beatDuration = 60 / bpm; // 每拍的秒数
    const expectedTaps: number[] = [];
    let currentTime = 0;

    currentRhythm.forEach((note) => {
      // 只有音符才需要拍击，休止符不需要
      if (note.type === "note") {
        expectedTaps.push(currentTime);
      }

      let noteDuration = note.duration * beatDuration;

      currentTime += noteDuration;
    });

    rhythmStore.expectedTaps = expectedTaps;
  },

  // 设置BPM
  setBpm: (bpm: number) => {
    rhythmStore.bpm = bpm;
    rhythmActions.calculateExpectedTaps();
  },

  // 初始化合成器
  initSynth: () => {
    if (!rhythmStore.synth) {
      rhythmStore.synth = ref(new MoaSynth());
    }
  },

  // 播放预备拍
  playPreAndPracticeNotes: async () => {
    const { synth, bpm } = rhythmStore;
    if (!synth) return;
    rhythmStore.isPreparationBeats = true;
    rhythmStore.preparationBeatCount = 0;

    const beatDuration = 60 / bpm; // 每拍的秒数
    let currentTime = MoaTone.now();

    // 播放四个预备拍
    for (let i = 1; i <= 4; i++) {
      MoaTone.schedule((t) => {
        rhythmStore.preparationBeatCount = i;
        // 播放节拍器声音，使用更高的音调来区分预备拍
        synth.triggerAttackRelease("C5", "16n", t);
      }, currentTime);

      currentTime += beatDuration;
    }

    MoaTone.schedule((t) => {
      rhythmStore.isPreparationBeats = false;
      rhythmStore.preparationBeatCount = 0;
      rhythmStore.isPracticing = true;
      // 设置练习开始时间为预备拍结束的精确时间
      rhythmStore.startTime = MoaTone.now();

      // 如果启用了指引音频，播放正确的节奏音
      if (rhythmStore.enableGuideAudio) {
        rhythmActions.playGuideAudio(t);
      }
    }, currentTime);
  },

  // 开始练习
  startPractice: () => {
    // 重置所有练习相关状态
    rhythmStore.userTaps = [];
    rhythmStore.startTime = null;
    rhythmStore.showResult = false;
    rhythmStore.accuracy = null;
    rhythmStore.feedback = "";
    rhythmStore.practiceStarted = true;
    rhythmStore.isPracticing = false; // 将在预备拍结束后设置为true
    rhythmStore.isPreparationBeats = false;
    rhythmStore.preparationBeatCount = 0;
    // 重置音符状态为未播放
    rhythmStore.noteStatus = new Array(rhythmStore.currentRhythm.length).fill(
      "unplayed"
    );

    // 播放预备拍（预备拍结束后会自动开始练习）
    rhythmActions.playPreAndPracticeNotes();
  },

  // 停止练习
  stopPractice: () => {
    rhythmStore.userTaps = [];
    rhythmStore.isPracticing = false;
    rhythmStore.practiceStarted = false;
    rhythmStore.isPreparationBeats = false;
    rhythmStore.preparationBeatCount = 0;
  },

  // 工具函数：计算单个敲击的准确度
  calculateTapAccuracy: (actualTime: number, expectedTime: number): boolean => {
    const tolerance = 0.1;
    const timeDiff = Math.abs(actualTime - expectedTime);
    return timeDiff <= tolerance;
  },

  // 记录用户拍击
  recordTap: (tapTime: number) => {
    // 播放拍击声音反馈
    if (rhythmStore.synth) {
      rhythmStore.synth.triggerAttackRelease("C5", "16n", tapTime);
    }

    // 计算相对于练习开始时间的时间差
    const relativeTime = tapTime - rhythmStore.startTime;
    rhythmStore.userTaps = [...rhythmStore.userTaps, relativeTime];

    // 更新当前音符的状态
    const currentTapIndex = rhythmStore.userTaps.length - 1;
    if (currentTapIndex < rhythmStore.expectedTaps.length) {
      const expectedTime = rhythmStore.expectedTaps[currentTapIndex];

      // 更新音符状态
      const newNoteStatus = [...rhythmStore.noteStatus];

      // 找到对应的音符索引（跳过休止符）
      let noteIndex = 0;
      let tapCount = 0;
      for (let i = 0; i < rhythmStore.currentRhythm.length; i++) {
        if (rhythmStore.currentRhythm[i].type === "note") {
          if (tapCount === currentTapIndex) {
            noteIndex = i;
            break;
          }
          tapCount++;
        }
      }

      // 使用工具函数计算准确度
      const isCorrect = rhythmActions.calculateTapAccuracy(
        relativeTime,
        expectedTime
      );
      newNoteStatus[noteIndex] = isCorrect ? "correct" : "incorrect";

      rhythmStore.noteStatus = newNoteStatus;
    }

    // 如果拍击次数达到期望次数，计算准确度
    if (rhythmStore.userTaps.length >= rhythmStore.expectedTaps.length) {
      rhythmActions.calculateAccuracy();
    }
  },

  // 计算准确度
  calculateAccuracy: () => {
    const { userTaps, expectedTaps } = rhythmStore;
    let correctTaps = 0;

    for (let i = 0; i < Math.min(userTaps.length, expectedTaps.length); i++) {
      if (rhythmActions.calculateTapAccuracy(userTaps[i], expectedTaps[i])) {
        correctTaps++;
      }
    }

    const accuracy = (correctTaps / expectedTaps.length) * 100;
    rhythmStore.accuracy = Math.round(accuracy);

    // 生成反馈
    if (rhythmStore.accuracy >= 90) {
      rhythmStore.feedback = "优秀！节奏感很好！";
    } else if (rhythmStore.accuracy >= 80) {
      rhythmStore.feedback = "不错！继续加油！";
    } else if (rhythmStore.accuracy >= 60) {
      rhythmStore.feedback = "还需要多加练习，注意节拍！";
    } else {
      rhythmStore.feedback = "多听听示例，找找感觉！";
    }

    rhythmStore.showResult = true;
    rhythmStore.isPracticing = false;
  },

  // 播放节奏示例
  playRhythmExample: async () => {
    const { synth, currentRhythm, bpm } = rhythmStore;
    if (!synth || rhythmStore.isPlaying) return;

    rhythmStore.isPlaying = true;
    rhythmStore.playbackStartTime = MoaTone.now();
    // 重置音符状态为未播放
    rhythmStore.noteStatus = new Array(currentRhythm.length).fill("unplayed");

    const beatDuration = 60 / bpm;
    let currentTime = MoaTone.now();

    currentRhythm.forEach((note, index) => {
      let noteDuration = note.duration * beatDuration;

      MoaTone.schedule(() => {
        rhythmStore.noteStatus[index] = "playing";
      }, currentTime);

      MoaTone.schedule(() => {
        const newNoteStatus = [...rhythmStore.noteStatus];
        newNoteStatus[index] = "unplayed";
        rhythmStore.noteStatus = newNoteStatus;
      }, currentTime + noteDuration);

      // 只有音符才播放声音，休止符静音
      if (note.type === "note") {
        synth.triggerAttackRelease("C4", "8n", currentTime);
      }

      currentTime += noteDuration;
    });

    // 播放结束后重置状态
    MoaTone.schedule(() => {
      rhythmStore.isPlaying = false;
      rhythmStore.playbackStartTime = null;
      // 重置音符状态为未播放
      rhythmStore.noteStatus = new Array(currentRhythm.length).fill("unplayed");
    }, currentTime);
  },

  // 播放指引音频
  playGuideAudio: (t: number) => {
    const { currentRhythm, synth, bpm } = rhythmStore;
    if (!synth || !currentRhythm) return;

    const beatDuration = 60 / bpm; // 每拍的秒数
    let currentTime = t;

    currentRhythm.forEach((note) => {
      // 只有音符才播放声音，休止符静音
      if (note.type === "note") {
        // 使用不同的音调来区分指引音和用户拍击音
        synth.triggerAttackRelease("G4", "16n", currentTime);
      }

      let noteDuration = note.duration * beatDuration;

      currentTime += noteDuration;
    });
  },

  // 重置所有状态
  reset: () => {
    rhythmStore.userTaps = [];
    rhythmStore.expectedTaps = [];
    rhythmStore.startTime = null;
    rhythmStore.practiceStarted = false;
    rhythmStore.isPracticing = false;
    rhythmStore.isPreparationBeats = false;
    rhythmStore.preparationBeatCount = 0;
    rhythmStore.accuracy = null;
    rhythmStore.feedback = "";
    rhythmStore.showResult = false;
    rhythmStore.isPlaying = false;
    rhythmStore.playbackStartTime = null;
    // 重置音符状态
    rhythmStore.noteStatus = new Array(rhythmStore.currentRhythm.length).fill(
      "unplayed"
    );
  },
};

// 简单的本地持久化（仅在浏览器环境）
const persistRandomRhythmConfig = () => {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(
      "PRACTICE_RANDOM_RHYTHM_CONFIG",
      JSON.stringify({
        bpm: rhythmStore.bpm,
        difficulty: rhythmStore.difficulty,
        enableGuideAudio: rhythmStore.enableGuideAudio,
      })
    );
  } catch (error) {
    console.warn("Failed to persist random rhythm config:", error);
  }
};

// 订阅关键配置项变更，统一持久化
subscribeKey(rhythmStore, "bpm", persistRandomRhythmConfig);
subscribeKey(rhythmStore, "difficulty", persistRandomRhythmConfig);
subscribeKey(rhythmStore, "enableGuideAudio", persistRandomRhythmConfig);
