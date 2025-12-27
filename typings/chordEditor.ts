// 定义音符类型
export interface Note {
  name: string; // 音名
  octave: number; // 八度
}

// 节奏型类型定义
export type RhythmBeatType = "full" | "empty" | "low" | "high" | "root";

// 节奏型时间点定义
export interface RhythmEvent {
  type: RhythmBeatType;
  time: number; // 0-1 之间，表示在小节中的相对时间位置
}

export type AutoAccompanimentConfig = {
  bpm: number;
  beats: number;
  rhythmPattern: RhythmEvent[];
};

export interface ChordCollection {
  id: string;
  name: string;
  ids: string[]; // 收藏和弦的id列表
  lengths?: number[]; // 每个和弦块的长度，与ids数组一一对应，支持1、0.5、2
  rootNote?: string; // 根音配置，用于和弦级数显示
  instrument?: string; // 乐器类型，可选，如果没有则使用第一个block的instrument或默认'piano'
  playConfig?: AutoAccompanimentConfig; // 自动伴奏配置
}

export interface ChordState {
  // 当前编辑器的统一数据
  currentInstrumentData: InstrumentData;
  // 琶音间隔
  arpeggioInterval: number;
  // 收藏相关状态
  favorites: InstrumentData[];
  showFavorites: boolean;
  selectedFavoriteIndex: number | null;
  editingFavoriteIndex: number | null;
  isEditMode: boolean;
  // 合集相关状态
  collections: ChordCollection[];
  currentCollectionId: string | null; // null表示"全部"
  showCollectionModal: boolean;
  currentRootNote: string | null; // 当前选择的根音
  currentInstrument: string; // 当前选择的乐器
}

export interface GuitarNote {
  string: number;
  fret: number;
}

export interface InstrumentData {
  id?: string;
  name?: string;
  notes?: Note[]; // 钢琴模式使用，吉他模式不设置
  range?: { start: number; end: number };
  userSelectedRoot?: number | null; // 吉他使用的根音索引
  pianoUserSelectedRoot?: Note | null; // 钢琴使用的根音
  guitarData?: GuitarNote[]; // 吉他特定数据
  rawData?: any; // 保存其他原始数据
}
