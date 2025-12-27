import { proxy, subscribe } from "valtio";
import { subscribeKey } from "valtio/utils";
import { v4 as uuid } from "uuid";
import { arrayMove } from "@dnd-kit/sortable";
import { db } from "@/utils/indexedDB";
import { appStore } from "./store";
import {
  ChordState,
  InstrumentData,
  ChordCollection,
  AutoAccompanimentConfig,
} from "@/typings/chordEditor";
import { DEFAULT_FAVORITES, DEFAULT_COLLECTIONS } from "./default";
import { getCollectionInstrument } from "@/utils/chord";

// 创建chord状态
export const chordStore = proxy<ChordState>({
  currentInstrumentData: {
    notes: [
      { name: "C", octave: 4 },
      { name: "E", octave: 4 },
      { name: "G", octave: 4 },
      { name: "B", octave: 4 },
      { name: "D", octave: 5 },
    ],
    range: { start: 0, end: 5 },
    userSelectedRoot: null,
    rawData: null,
    guitarData: [
      { string: 1, fret: 3 },
      { string: 2, fret: 2 },
      { string: 4, fret: 3 },
      { string: 3, fret: 4 },
    ],
    pianoUserSelectedRoot: null,
  },
  arpeggioInterval: 0.1,
  favorites: DEFAULT_FAVORITES,
  showFavorites: true,
  selectedFavoriteIndex: null,
  editingFavoriteIndex: null,
  isEditMode: false,
  collections: DEFAULT_COLLECTIONS as any,
  currentCollectionId: "fly-me-to-the-moon",
  showCollectionModal: false,
  currentRootNote: null, // 当前选择的根音
  get currentInstrument() {
    if (!chordStore.currentCollectionId) {
      return "piano"; // 默认返回钢琴
    }

    const collection = chordStore.collections.find(
      (c) => c.id === chordStore.currentCollectionId
    );

    return getCollectionInstrument(collection, chordStore.favorites);
  },
});

const staticRef = {
  preSubscriptions: [],
};

// Actions
export const chordActions = {
  // 初始化数据
  async init() {
    try {
      // 取消之前的订阅
      staticRef.preSubscriptions.forEach((unsubscribe) => unsubscribe());
      staticRef.preSubscriptions = [];

      // 并行加载所有数据
      const [savedFavorites, savedCollections, savedCurrentCollectionId] =
        await Promise.all([
          db.getItem("CHORD_FAVORITES"),
          db.getItem("CHORD_COLLECTIONS"),
          db.getItem("CURRENT_COLLECTION_ID"),
        ]);

      // 统一设置收藏数据
      if (savedFavorites) {
        const favorites = JSON.parse(savedFavorites);
        // 确保每个收藏项都有id
        const favoritesWithId = favorites.map((favorite: InstrumentData) => ({
          ...favorite,
          id: favorite.id || uuid(),
        }));
        chordStore.favorites.splice(0, chordStore.favorites.length);
        chordStore.favorites.push(...favoritesWithId);
      }

      // 统一设置合集数据
      if (savedCollections) {
        const collections = JSON.parse(savedCollections);
        // 向后兼容：为没有 lengths 字段的合集添加默认长度
        const collectionsWithLengths = collections.map(
          (collection: ChordCollection) => {
            if (!collection.lengths && collection.ids.length > 0) {
              collection.lengths = new Array(collection.ids.length).fill(1);
            }
            return collection;
          }
        );
        chordStore.collections.splice(0, chordStore.collections.length);
        chordStore.collections.push(...collectionsWithLengths);
      }

      // 统一设置当前合集ID
      if (savedCurrentCollectionId) {
        const collectionId = JSON.parse(savedCurrentCollectionId);
        // 验证合集是否仍然存在
        if (
          collectionId === null ||
          chordStore.collections.find((c) => c.id === collectionId)
        ) {
          chordStore.currentCollectionId = collectionId;
          // 如果选择了具体合集，加载该合集保存的根音配置
          if (collectionId) {
            const collection = chordStore.collections.find(
              (c) => c.id === collectionId
            );
            if (collection && collection.rootNote) {
              chordStore.currentRootNote = collection.rootNote;
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to load chord data:", error);
    } finally {
      subscibeAll();
    }
  },

  // 更新当前乐器数据
  updateInstrumentData(data: Partial<InstrumentData>) {
    const updated = {
      ...chordStore.currentInstrumentData,
      ...data,
    };
    chordStore.currentInstrumentData = updated;

    // 如果有选中的收藏项，同时更新收藏项
    if (chordStore.selectedFavoriteIndex !== null && chordStore.isEditMode) {
      chordActions.updateSelectedFavorite(updated);
    }
  },

  // 设置琶音间隔
  setArpeggioInterval(interval: number) {
    chordStore.arpeggioInterval = interval;
  },

  // 清除音符
  clearNotes() {
    // 清除选中的收藏项状态
    // chordStore.selectedFavoriteIndex = null;

    let update;
    const currentInstrument = chordStore.currentInstrument;

    if (currentInstrument === "guitar") {
      update = {
        guitarData: [],
        userSelectedRoot: null,
      };
    } else {
      update = {
        ...chordStore.currentInstrumentData,
        notes: [],
        pianoUserSelectedRoot: null,
      };
    }

    Object.assign(chordStore.currentInstrumentData, update);
    const currFavorite = chordStore.favorites[chordStore.selectedFavoriteIndex];
    if (currFavorite && chordStore.isEditMode) {
      Object.assign(currFavorite, update);
    }
  },

  // 添加到收藏
  addToFavorites({
    chordName,
    data,
    addToCurrentCollection = true,
  }: {
    chordName: string;
    data?: InstrumentData;
    addToCurrentCollection?: boolean;
  }) {
    const favoriteToAdd: InstrumentData = data ?? {
      ...chordStore.currentInstrumentData,
      id: uuid(),
      name: chordName,
    };

    chordStore.favorites.push(favoriteToAdd);
    // 添加新的收藏后，清除之前的选中状态，避免用户困惑
    chordStore.selectedFavoriteIndex = null;

    // 如果当前选择了某个合集，自动将新收藏加入该合集
    if (addToCurrentCollection && chordStore.currentCollectionId) {
      chordActions.addToCollection(
        favoriteToAdd.id,
        chordStore.currentCollectionId
      );
    }
  },

  // 删除收藏
  removeFavorite(index: number) {
    const currFavorite = chordStore.favorites[index];
    chordStore.favorites.splice(index, 1);

    // 如果删除的是当前选中的收藏，清除选中状态
    if (chordStore.selectedFavoriteIndex === index) {
      chordStore.selectedFavoriteIndex = null;
    } else if (
      chordStore.selectedFavoriteIndex !== null &&
      chordStore.selectedFavoriteIndex > index
    ) {
      // 如果删除的收藏在当前选中的前面，需要调整选中索引
      chordStore.selectedFavoriteIndex = chordStore.selectedFavoriteIndex - 1;
    }

    if (chordStore.currentCollectionId)
      chordActions.removeFromCollection(
        currFavorite.id,
        chordStore.currentCollectionId
      );
  },

  // 选择收藏
  selectFavorite(index: number) {
    const favorite = chordStore.favorites[index];

    if (chordStore.selectedFavoriteIndex === index) {
      chordStore.selectedFavoriteIndex = null;
    } else {
      chordStore.selectedFavoriteIndex = index;
      chordStore.currentInstrumentData = { ...favorite };
    }
  },

  selectFavoriteById(id: string) {
    const index = chordStore.favorites.findIndex((item) => item.id === id);
    if (index !== -1) {
      chordStore.selectedFavoriteIndex = index;
      chordStore.currentInstrumentData = { ...chordStore.favorites[index] };
    }
  },

  // 更新收藏名称
  updateFavoriteName(index: number, newName: string) {
    if (chordStore.favorites[index]) {
      chordStore.favorites[index] = {
        ...chordStore.favorites[index],
        name: newName,
      };
      // 如果当前选中的收藏是被更新的收藏，同步更新名称
      if (chordStore.selectedFavoriteIndex === index) {
        chordStore.currentInstrumentData.name = newName;
      }
    }
    chordStore.editingFavoriteIndex = null;
  },

  // 设置编辑收藏索引
  setEditingFavoriteIndex(index: number | null) {
    chordStore.editingFavoriteIndex = index;
  },

  // 切换收藏显示
  toggleShowFavorites() {
    chordStore.showFavorites = !chordStore.showFavorites;
  },

  // 更新选中的收藏项
  updateSelectedFavorite(updated: InstrumentData) {
    if (chordStore.selectedFavoriteIndex !== null) {
      const index = chordStore.selectedFavoriteIndex;
      if (chordStore.favorites[index]) {
        chordStore.favorites[index] = {
          ...chordStore.favorites[index],
          ...updated,
        };
      }
    }
  },

  // 切换编辑模式
  toggleEditMode() {
    chordStore.isEditMode = !chordStore.isEditMode;
    // 退出编辑模式时清除选中状态
    if (!chordStore.isEditMode) {
      chordStore.selectedFavoriteIndex = null;
      chordStore.editingFavoriteIndex = null;
    }
  },

  // 重新排序收藏
  reorderFavorites(activeId: string, overId: string) {
    // 获取当前选中的合集
    const currentCollection = chordStore.collections.find(
      (c) => c.id === chordStore.currentCollectionId
    );

    if (!currentCollection) {
      return; // 如果没有选中合集，不执行排序
    }

    const validIds = currentCollection.ids.filter((id) =>
      chordStore.favorites.some((f) => f.id === id)
    );
    const validLengths = currentCollection.lengths.splice(0, validIds.length);

    const oldIndex = validIds.indexOf(activeId);
    const newIndex = validIds.indexOf(overId);

    if (oldIndex !== -1 && newIndex !== -1) {
      // 重新排序 ids
      const newIds = arrayMove(validIds, oldIndex, newIndex);
      currentCollection.ids.splice(0, currentCollection.ids.length, ...newIds);

      // 同步重新排序 lengths
      if (currentCollection.lengths) {
        const newLengths = arrayMove(validLengths, oldIndex, newIndex);
        currentCollection.lengths.splice(
          0,
          currentCollection.lengths.length,
          ...newLengths
        );
      }

      // 更新选中索引（基于当前合集中的位置）
      if (chordStore.selectedFavoriteIndex === oldIndex) {
        chordStore.selectedFavoriteIndex = newIndex;
      } else if (chordStore.selectedFavoriteIndex !== null) {
        if (oldIndex < newIndex) {
          if (
            chordStore.selectedFavoriteIndex > oldIndex &&
            chordStore.selectedFavoriteIndex <= newIndex
          ) {
            chordStore.selectedFavoriteIndex--;
          }
        } else {
          if (
            chordStore.selectedFavoriteIndex >= newIndex &&
            chordStore.selectedFavoriteIndex < oldIndex
          ) {
            chordStore.selectedFavoriteIndex++;
          }
        }
      }
    }
  },

  // 合集相关方法
  setCurrentCollection(collectionId: string | null) {
    chordStore.currentCollectionId = collectionId;
    chordStore.selectedFavoriteIndex = null;

    if (collectionId) {
      const collection = chordStore.collections.find(
        (c) => c.id === collectionId
      );
      if (collection) {
        if (collection.rootNote)
          chordStore.currentRootNote = collection.rootNote;
        else {
          chordStore.currentRootNote = null;
        }
      }
    } else {
      // 如果选择"全部"，清除根音选择
      chordStore.currentRootNote = null;
    }
  },

  toggleCollectionModal() {
    chordStore.showCollectionModal = !chordStore.showCollectionModal;
  },

  addToCollection(chordId: string, collectionId: string) {
    const collection = chordStore.collections.find(
      (c) => c.id === collectionId
    );
    if (collection && !collection.ids.includes(chordId)) {
      collection.ids.push(chordId);
      // 同步添加默认长度
      if (!collection.lengths) {
        collection.lengths = [];
      }
      collection.lengths.push(1); // 默认长度为1
    }
  },

  removeFromCollection(chordId: string, collectionId: string) {
    const collection = chordStore.collections.find(
      (c) => c.id === collectionId
    );
    if (collection) {
      const index = collection.ids.indexOf(chordId);
      if (index !== -1) {
        collection.ids.splice(index, 1);
        // 同步删除对应的长度
        if (collection.lengths && collection.lengths.length > index) {
          collection.lengths.splice(index, 1);
        }
      }
    }
  },

  createCollection(name: string) {
    const newCollection: ChordCollection = {
      id: uuid(),
      // instrument: "guitar",
      name,
      ids: [],
      lengths: [], // 初始化长度数组
    };
    chordStore.collections.push(newCollection);
    return newCollection.id;
  },

  updateCollectionName(collectionId: string, newName: string) {
    const collection = chordStore.collections.find(
      (c) => c.id === collectionId
    );
    if (collection) {
      collection.name = newName;
    }
  },

  deleteCollection(collectionId: string) {
    // 先找到合集
    const collection = chordStore.collections.find(
      (c) => c.id === collectionId
    );
    if (collection) {
      const idsToDelete = collection.ids;
      for (let i = chordStore.favorites.length - 1; i >= 0; i--) {
        const favId = chordStore.favorites[i].id;
        if (idsToDelete.includes(favId)) {
          // 检查该和弦是否只被当前合集引用
          let refCount = 0;
          for (const c of chordStore.collections) {
            if (c.ids.includes(favId)) refCount++;
          }
          if (refCount === 1) {
            chordStore.favorites.splice(i, 1);
          }
        }
      }
    }
    // 删除合集本身
    chordStore.collections.splice(
      chordStore.collections.findIndex((c) => c.id === collectionId),
      1
    );

    chordStore.currentCollectionId = chordStore.collections[0]?.id ?? null;
  },

  // 更新合集中和弦块的长度
  updateChordLength(collectionId: string, chordIndex: number, length: number) {
    const collection = chordStore.collections.find(
      (c) => c.id === collectionId
    );
    if (collection) {
      if (!collection.lengths) {
        collection.lengths = new Array(collection.ids.length).fill(1);
      }
      if (chordIndex >= 0 && chordIndex < collection.lengths.length) {
        collection.lengths[chordIndex] = length;
      }
    }
  },

  // 重新排序合集中的和弦（同时更新长度数组）
  reorderCollectionChords(
    collectionId: string,
    activeId: string,
    overId: string
  ) {
    const collection = chordStore.collections.find(
      (c) => c.id === collectionId
    );
    if (collection) {
      const oldIndex = collection.ids.indexOf(activeId);
      const newIndex = collection.ids.indexOf(overId);

      if (oldIndex !== -1 && newIndex !== -1) {
        // 重新排序 ids
        const newIds = arrayMove(collection.ids, oldIndex, newIndex);
        collection.ids.splice(0, collection.ids.length, ...newIds);

        // 同步重新排序 lengths
        if (
          collection.lengths &&
          collection.lengths.length === collection.ids.length
        ) {
          const newLengths = arrayMove(collection.lengths, oldIndex, newIndex);
          collection.lengths.splice(
            0,
            collection.lengths.length,
            ...newLengths
          );
        }
      }
    }
  },

  // 根音相关方法
  setCurrentRootNote(rootNote: string | null) {
    chordStore.currentRootNote = rootNote;
    // 如果选择的不是"全部"，将根音配置保存到当前合集，并确保 collections 引用变化
    if (chordStore.currentCollectionId) {
      const idx = chordStore.collections.findIndex(
        (c) => c.id === chordStore.currentCollectionId
      );
      if (idx !== -1) {
        // 重新赋值，确保 collections 引用变化
        chordStore.collections[idx] = {
          ...chordStore.collections[idx],
          rootNote,
        };
      }
    }
  },

  // 设置当前合集的乐器类型
  setCurrentCollectionInstrument(instrument: string) {
    if (!chordStore.currentCollectionId) {
      return;
    }

    const idx = chordStore.collections.findIndex(
      (c) => c.id === chordStore.currentCollectionId
    );
    if (idx !== -1) {
      // 重新赋值，确保 collections 引用变化
      chordStore.collections[idx] = {
        ...chordStore.collections[idx],
        instrument,
      };
    }
  },

  // 更新合集的 playConfig
  updateCollectionPlayConfig(
    collectionId: string,
    playConfig: AutoAccompanimentConfig
  ) {
    const idx = chordStore.collections.findIndex((c) => c.id === collectionId);
    if (idx !== -1) {
      // 重新赋值，确保 collections 引用变化
      chordStore.collections[idx] = {
        ...chordStore.collections[idx],
        playConfig,
      };
    }
  },

  // 清除无用的收藏（没有被任何合集引用的收藏）
  cleanupUnusedFavorites() {
    // 收集所有合集中引用的收藏ID
    const referencedIds = new Set<string>();
    chordStore.collections.forEach((collection) => {
      collection.ids.forEach((id) => {
        referencedIds.add(id);
      });
    });

    // 找出没有被引用的收藏
    const unusedFavorites: string[] = [];
    chordStore.favorites.forEach((favorite) => {
      if (favorite.id && !referencedIds.has(favorite.id)) {
        unusedFavorites.push(favorite.name || favorite.id);
      }
    });

    // 删除没有被引用的收藏
    for (let i = chordStore.favorites.length - 1; i >= 0; i--) {
      const favorite = chordStore.favorites[i];
      if (favorite.id && !referencedIds.has(favorite.id)) {
        chordStore.favorites.splice(i, 1);

        // 如果删除的是当前选中的收藏，清除选中状态
        if (chordStore.selectedFavoriteIndex === i) {
          chordStore.selectedFavoriteIndex = null;
        } else if (
          chordStore.selectedFavoriteIndex !== null &&
          chordStore.selectedFavoriteIndex > i
        ) {
          // 如果删除的收藏在当前选中的前面，需要调整选中索引
          chordStore.selectedFavoriteIndex =
            chordStore.selectedFavoriteIndex - 1;
        }
      }
    }

    return {
      count: unusedFavorites.length,
      names: unusedFavorites,
    };
  },
};

const DB_KEY_MAP = {
  favorites: "CHORD_FAVORITES",
  collections: "CHORD_COLLECTIONS",
};
const subscibeAttr = (key: string) => {
  return subscribe(chordStore[key], async () => {
    try {
      await db.setItem(DB_KEY_MAP[key], JSON.stringify(chordStore[key]));
    } catch (error) {
      console.error(`Failed to save ${key} to IndexedDB:`, error);
    }
  });
};

const subscibeAll = () => {
  // 订阅状态变化，自动保存到IndexedDB
  const unsubscribeFavorites = subscibeAttr("favorites");
  // 订阅合集变化，自动保存到IndexedDB
  const unsubscribeCollections = subscibeAttr("collections");
  // 订阅当前选择的合集变化，自动保存到IndexedDB
  const unsubscribeCurrentCollectionId = subscribeKey(
    chordStore,
    "currentCollectionId",
    async () => {
      try {
        await db.setItem(
          "CURRENT_COLLECTION_ID",
          JSON.stringify(chordStore.currentCollectionId)
        );
      } catch (error) {
        console.error(
          "Failed to save current collection ID to IndexedDB:",
          error
        );
      }
    }
  );

  return [
    unsubscribeFavorites,
    unsubscribeCollections,
    unsubscribeCurrentCollectionId,
  ];
};
