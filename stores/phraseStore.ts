import { proxy, useSnapshot, subscribe, ref } from "valtio";
import { v4 as uuid } from "uuid";
import { MoaTone } from "@/utils/MoaTone";
import { message } from "antd";
import { db } from "@/utils/indexedDB";
import { appStore } from "./store";
import { MusicParser } from "@/utils/musicParser";

// 音符时长常量 - 4/4拍，每个音符1/8拍
const DEFAULT_NOTE_DURATION = 0.5;

export interface PhraseBlock {
  id: string;
  name: string;
  content: string;
  baseNote: string;
  bpm: number;
  showStaffNotation: boolean;
}

export interface PhraseCollection {
  id: string;
  name: string;
  ids: string[]; // 乐句块的id列表
}

interface PhraseState {
  isInit?: boolean;
  blocks: PhraseBlock[];
  isPlaying: string | null;
  synthRef: { current: any };
  currentPlayingIndex: number | null;
  currentPlayingEndIndex: number | null;
  currentPlayingBlockId: string | null;
  autoEditBlockId: string | null;
  playingTimeouts: NodeJS.Timeout[];
  // 合集相关状态
  collections: PhraseCollection[];
  currentCollectionId: string | null; // null表示"全部"
  showCollectionModal: boolean;
  selectedBlockIndex: number | null;
  // 搜索相关状态
  searchTerm: string;
}

// 创建phrase状态
export const phraseStore = proxy<PhraseState>({
  blocks: [
    {
      id: Date.now().toString(),
      name: "GoodBye",
      content: "37--3-2-3-5-3-6,-",
      baseNote: "C4",
      bpm: 110,
      showStaffNotation: true, // 默认开启五线谱显示
    },
    {
      id: (Date.now() + 1).toString(),
      name: "嘘月",
      content: "t61'6 5- t353 2- t121 6,-",
      baseNote: "C4",
      bpm: 130,
      showStaffNotation: true,
    },
  ],
  isPlaying: null,
  synthRef: ref({ current: null }),
  currentPlayingIndex: null,
  currentPlayingEndIndex: null,
  currentPlayingBlockId: null,
  autoEditBlockId: null,
  playingTimeouts: [],
  // 合集相关状态
  collections: [],
  currentCollectionId: null,
  showCollectionModal: false,
  selectedBlockIndex: null,
  // 搜索相关状态
  searchTerm: "",
});

const staticRef = {
  isInit: false,
};

// 解析乐句文本，使用统一解析器
const parsePhrase = (content: string, baseNote: string) => {
  const parseResult = MusicParser.parsePhrase(content, baseNote);

  // 输出警告信息
  if (parseResult.warnings.length > 0) {
    console.warn("解析警告:", parseResult.warnings);
  }

  // 输出错误信息
  if (parseResult.errors.length > 0) {
    console.error("解析错误:", parseResult.errors);
  }

  const playableNotes = MusicParser.toPlayableNotes(parseResult.notes);

  return playableNotes;
};

// Actions
export const phraseActions = {
  // 初始化数据
  // 更新步骤
  // 初始化/登录，user 改变触发 _app.ts appStore.init()
  // appStore.isInit 触发，此时远端数据合并到indexDB
  // isInit 触发 组件内 init，indexDB 数据合并到组件 store
  async init() {
    // if (staticRef.isInit) return;

    try {
      // 加载乐句块数据
      const savedBlocks = await db.getItem("phrase-notebook-blocks");

      staticRef.isInit = false;
      if (savedBlocks) {
        const blocks = JSON.parse(savedBlocks);
        // 为旧数据添加name字段和id的兼容性处理
        const updatedBlocks = blocks.map((block: any, index: number) => ({
          ...block,
          id: block.id || uuid(),
          name: block.name || `乐句 ${index + 1}`,
          showStaffNotation:
            block.showStaffNotation !== undefined
              ? block.showStaffNotation
              : true, // 为旧数据设置默认值
        }));
        phraseStore.blocks.splice(0, phraseStore.blocks.length);
        phraseStore.blocks.push(...updatedBlocks);
      } else {
        // 没有保存的数据，为默认乐句添加id
        phraseStore.blocks.forEach((block) => {
          if (!block.id) {
            block.id = uuid();
          }
        });
      }

      // 加载合集数据
      const savedCollections = await db.getItem("PHRASE_COLLECTIONS");
      if (savedCollections) {
        const collections = JSON.parse(savedCollections);
        phraseStore.collections.splice(0, phraseStore.collections.length);
        phraseStore.collections.push(...collections);
      }
    } catch (error) {
      console.error("Failed to load saved blocks:", error);
    } finally {
      staticRef.isInit = true;
    }
  },

  // 添加新乐句块
  addBlock(data?: PhraseBlock) {
    const blockNumber = phraseStore.blocks.length + 1;
    const newBlock: PhraseBlock = data ?? {
      id: uuid(),
      name: `乐句 ${blockNumber}`,
      content: "",
      baseNote: "C4",
      bpm: 110,
      showStaffNotation: true, // 默认开启五线谱显示
    };
    phraseStore.blocks.push(newBlock);
    phraseStore.autoEditBlockId = newBlock.id;

    // 如果当前选择了某个合集，自动将新乐句加入该合集
    if (phraseStore.currentCollectionId) {
      phraseActions.addToCollection(
        newBlock.id,
        phraseStore.currentCollectionId
      );
    }
  },

  // 添加随机乐句块
  addRandomBlock() {
    const blockNumber = phraseStore.blocks.length + 1;

    // 生成随机乐句内容
    const notes = ["1", "2", "3", "4", "5", "6", "7"];
    const octaveMarks = ["", "'", ","];
    const restSymbol = "-";

    // 生成8-16个音符的随机乐句
    const phraseLength = Math.floor(Math.random() * 9) + 8;
    let randomContent = "";

    for (let i = 0; i < phraseLength; i++) {
      if (Math.random() < 0.2) {
        // 20% 概率添加空拍
        randomContent += restSymbol;
      } else {
        // 随机选择音符
        const note = notes[Math.floor(Math.random() * notes.length)];
        // 随机选择八度标记（70%无标记，15%高八度，15%低八度）
        const rand = Math.random();
        let octaveMark = "";
        if (rand < 0.15) {
          octaveMark = "'";
        } else if (rand < 0.3) {
          octaveMark = ",";
        }
        randomContent += note + octaveMark;
      }

      // 添加空格分隔（除了最后一个音符）
      if (i < phraseLength - 1) {
        randomContent += "";
      }
    }

    // 随机选择基音和BPM
    const baseNotes = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"];
    const bpmOptions = [70, 80, 90, 100, 110, 120, 130, 140, 150];

    const newBlock: PhraseBlock = {
      id: uuid(),
      name: `随机乐句 ${blockNumber}`,
      content: randomContent,
      baseNote: baseNotes[Math.floor(Math.random() * baseNotes.length)],
      bpm: bpmOptions[Math.floor(Math.random() * bpmOptions.length)],
      showStaffNotation: true, // 默认开启五线谱显示
    };

    phraseStore.blocks.push(newBlock);

    // 如果当前选择了某个合集，自动将新乐句加入该合集
    if (phraseStore.currentCollectionId) {
      phraseActions.addToCollection(
        newBlock.id,
        phraseStore.currentCollectionId
      );
    }
  },

  // 删除文本块
  deleteBlock(id: string) {
    // 从所有合集中移除该乐句的ID
    phraseStore.collections.forEach((collection) => {
      collection.ids = collection.ids.filter((blockId) => blockId !== id);
    });

    // 删除乐句块
    phraseStore.blocks.splice(
      phraseStore.blocks.findIndex((block) => block.id === id),
      1
    );
  },

  // 更新文本块内容
  updateBlock(id: string, field: string, value: any) {
    const blockIndex = phraseStore.blocks.findIndex((block) => block.id === id);
    if (blockIndex !== -1) {
      phraseStore.blocks[blockIndex] = {
        ...phraseStore.blocks[blockIndex],
        [field]: value,
      };
    }
  },

  // 播放乐句
  async playPhrase(block: PhraseBlock) {
    phraseStore.playingTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    phraseStore.playingTimeouts = [];
    phraseStore.isPlaying = null;
    phraseStore.currentPlayingIndex = null;
    phraseStore.currentPlayingEndIndex = null;
    phraseStore.currentPlayingBlockId = null;
    if (phraseStore.synthRef.current) {
      phraseStore.synthRef.current = null;
    }

    await MoaTone.start();

    if (!block.content.trim()) {
      message.warning("请先输入乐句内容");
      return;
    }

    try {
      // 停止其他播放
      if (phraseStore.isPlaying) {
      }

      // 设置播放状态
      phraseStore.isPlaying = block.id;
      phraseStore.currentPlayingBlockId = block.id;

      // 初始化合成器
      if (!phraseStore.synthRef.current) {
        phraseStore.synthRef.current = new MoaTone.Synth({
          preset: "sine",
        }).toDestination();
      }

      // 解析乐句
      const notes = parsePhrase(block.content, block.baseNote);

      // 计算每个音符的时长（基于BPM）
      const beatDuration = 60 / block.bpm; // 一拍的秒数

      let currentTime = 0;

      for (let i = 0; i < notes.length; i++) {
        const noteData = notes[i];

        // 设置高亮时机
        const highlightTimeoutId = setTimeout(() => {
          if (phraseStore.isPlaying === block.id) {
            phraseStore.currentPlayingIndex = noteData.startIndex;
            phraseStore.currentPlayingEndIndex = noteData.endIndex;
          }
        }, currentTime * 1000);
        phraseStore.playingTimeouts.push(highlightTimeoutId);

        if (noteData.type === "note") {
          const playTimeoutId = setTimeout(() => {
            if (
              phraseStore.synthRef.current &&
              phraseStore.isPlaying === block.id
            ) {
              phraseStore.synthRef.current.triggerAttackRelease(
                noteData.note,
                noteData.duration * beatDuration
              );
            }
          }, currentTime * 1000);
          phraseStore.playingTimeouts.push(playTimeoutId);
        }
        currentTime += noteData.duration * beatDuration;
      }

      // 播放完成后重置状态
      const resetTimeoutId = setTimeout(
        () => {
          phraseStore.isPlaying = null;
          phraseStore.currentPlayingIndex = null;
          phraseStore.currentPlayingEndIndex = null;
          phraseStore.currentPlayingBlockId = null;
          phraseStore.playingTimeouts = [];
        },
        currentTime * 1000 + 500
      );
      phraseStore.playingTimeouts.push(resetTimeoutId);
    } catch (error) {
      console.error("播放失败:", error);
      message.error("播放失败，请检查乐句格式");
      phraseStore.isPlaying = null;
      phraseStore.currentPlayingIndex = null;
      phraseStore.currentPlayingBlockId = null;
    }
  },

  // 停止播放
  stopPlaying() {
    // 清除所有正在进行的 timeout
    phraseStore.playingTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    phraseStore.playingTimeouts = [];

    phraseStore.isPlaying = null;
    phraseStore.currentPlayingIndex = null;
    phraseStore.currentPlayingEndIndex = null;
    phraseStore.currentPlayingBlockId = null;
    if (phraseStore.synthRef.current) {
      phraseStore.synthRef.current = null;
    }
  },

  // 重新排序乐句块
  reorderBlocks(fromIndex: number, toIndex: number) {
    const blocks = phraseStore.blocks;
    const [movedBlock] = blocks.splice(fromIndex, 1);
    blocks.splice(toIndex, 0, movedBlock);
  },

  // 清除自动编辑标记
  clearAutoEdit() {
    phraseStore.autoEditBlockId = null;
  },

  // 合集相关方法
  setCurrentCollection(collectionId: string | null) {
    phraseStore.currentCollectionId = collectionId;
    phraseStore.selectedBlockIndex = null;
  },

  toggleCollectionModal() {
    phraseStore.showCollectionModal = !phraseStore.showCollectionModal;
  },

  addToCollection(blockId: string, collectionId: string) {
    const collection = phraseStore.collections.find(
      (c) => c.id === collectionId
    );
    if (collection && !collection.ids.includes(blockId)) {
      collection.ids.push(blockId);
    }
  },

  removeFromCollection(blockId: string, collectionId: string) {
    const collection = phraseStore.collections.find(
      (c) => c.id === collectionId
    );
    if (collection) {
      collection.ids = collection.ids.filter((id) => id !== blockId);
    }
  },

  createCollection(name: string) {
    const newCollection: PhraseCollection = {
      id: uuid(),
      name,
      ids: [],
    };
    phraseStore.collections.push(newCollection);
    return newCollection.id;
  },

  updateCollectionName(collectionId: string, newName: string) {
    const collection = phraseStore.collections.find(
      (c) => c.id === collectionId
    );
    if (collection) {
      collection.name = newName;
    }
  },

  deleteCollection(collectionId: string) {
    // 先找到合集
    const collection = phraseStore.collections.find(
      (c) => c.id === collectionId
    );
    if (collection) {
      const idsToDelete = collection.ids;
      for (let i = phraseStore.blocks.length - 1; i >= 0; i--) {
        const blockId = phraseStore.blocks[i].id;
        if (idsToDelete.includes(blockId)) {
          // 检查该乐句块是否只被当前合集引用
          let refCount = 0;
          for (const c of phraseStore.collections) {
            if (c.ids.includes(blockId)) refCount++;
          }
          if (refCount === 1) {
            phraseStore.blocks.splice(i, 1);
          }
        }
      }
    }
    // 删除合集本身
    phraseStore.collections.splice(
      phraseStore.collections.findIndex((c) => c.id === collectionId),
      1
    );

    phraseStore.currentCollectionId = null;
  },

  // 选择乐句块
  selectBlock(index: number) {
    phraseStore.selectedBlockIndex = index;
  },

  // 搜索相关方法
  setSearchTerm(term: string) {
    phraseStore.searchTerm = term;
  },

  // 获取过滤后的乐句块
  getFilteredBlocks() {
    let result = phraseStore.blocks;

    // 根据当前选择的合集过滤
    if (phraseStore.currentCollectionId) {
      const currentCollection = phraseStore.collections.find(
        (c) => c.id === phraseStore.currentCollectionId
      );
      if (currentCollection) {
        result = phraseStore.blocks.filter((block) =>
          currentCollection.ids.includes(block.id)
        );
      }
    }

    // 根据搜索词过滤
    if (phraseStore.searchTerm.trim()) {
      result = result.filter(
        (block) =>
          block.name
            .toLowerCase()
            .includes(phraseStore.searchTerm.toLowerCase()) ||
          block.content
            .toLowerCase()
            .includes(phraseStore.searchTerm.toLowerCase())
      );
    }

    return result;
  },
};

// 订阅状态变化，自动保存到IndexedDB
subscribe(
  phraseStore.blocks,
  async () => {
    if (!appStore.isInit || !staticRef.isInit) return;
    try {
      await db.setItem(
        "phrase-notebook-blocks",
        JSON.stringify(phraseStore.blocks)
      );
    } catch (error) {
      console.error("Failed to save blocks to IndexedDB:", error);
      // 降级到localStorage作为备份
      try {
        localStorage.setItem(
          "phrase-notebook-blocks",
          JSON.stringify(phraseStore.blocks)
        );
      } catch (localStorageError) {
        console.error(
          "Failed to save to localStorage as fallback:",
          localStorageError
        );
      }
    }
  },
  true
);

// 自动保存合集数据
subscribe(
  phraseStore.collections,
  async () => {
    if (!appStore.isInit || !staticRef.isInit) return;
    try {
      await db.setItem(
        "PHRASE_COLLECTIONS",
        JSON.stringify(phraseStore.collections)
      );
    } catch (error) {
      console.error("Failed to save collections to IndexedDB:", error);
      // 降级到localStorage作为备份
      try {
        localStorage.setItem(
          "PHRASE_COLLECTIONS",
          JSON.stringify(phraseStore.collections)
        );
      } catch (localStorageError) {
        console.error(
          "Failed to save collections to localStorage as fallback:",
          localStorageError
        );
      }
    }
  },
  true
);
