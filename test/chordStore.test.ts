import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock IndexedDB
vi.mock("../utils/indexedDB", () => ({
  db: {
    getItem: vi.fn(),
    setItem: vi.fn(),
  },
}));

// Mock appStore
vi.mock("../stores/store", () => ({
  appStore: {
    isInit: true,
  },
}));

import { chordStore, chordActions } from "../stores/chordStore";
import { InstrumentData, ChordCollection } from "../typings/chordEditor";

describe("chordStore - cleanupUnusedFavorites", () => {
  beforeEach(() => {
    // 重置 store 状态
    chordStore.favorites.splice(0, chordStore.favorites.length);
    chordStore.collections.splice(0, chordStore.collections.length);
    chordStore.selectedFavoriteIndex = null;
    chordStore.currentCollectionId = null;

    // 重置 mock
    vi.clearAllMocks();
  });

  it("应该删除没有被任何合集引用的收藏", () => {
    // 准备测试数据
    const favorites: InstrumentData[] = [
      {
        id: "chord1",
        name: "C Major",
        range: { start: 0, end: 5 },
        notes: [{ name: "C", octave: 4 }],
      },
      {
        id: "chord2",
        name: "D Minor",
        range: { start: 0, end: 5 },
        notes: [{ name: "D", octave: 4 }],
      },
      {
        id: "chord3",
        name: "E Major",
        range: { start: 0, end: 5 },
        notes: [{ name: "E", octave: 4 }],
      },
    ];

    const collections: ChordCollection[] = [
      {
        id: "collection1",
        name: "Test Collection 1",
        ids: ["chord1", "chord2"], // 只引用 chord1 和 chord2
        lengths: [1, 1],
      },
    ];

    // 设置初始状态
    chordStore.favorites.push(...favorites);
    chordStore.collections.push(...collections);

    // 执行清理
    const result = chordActions.cleanupUnusedFavorites();

    // 验证结果
    expect(result.count).toBe(1);
    expect(result.names).toEqual(["E Major"]);
    expect(chordStore.favorites).toHaveLength(2);
    expect(chordStore.favorites.map((f) => f.id)).toEqual(["chord1", "chord2"]);
  });

  it("应该在没有无用收藏时返回空结果", () => {
    // 准备测试数据 - 所有收藏都被引用
    const favorites: InstrumentData[] = [
      {
        id: "chord1",
        name: "C Major",
        range: { start: 0, end: 5 },
        notes: [{ name: "C", octave: 4 }],
      },
      {
        id: "chord2",
        name: "D Minor",
        range: { start: 0, end: 5 },
        notes: [{ name: "D", octave: 4 }],
      },
    ];

    const collections: ChordCollection[] = [
      {
        id: "collection1",
        name: "Test Collection 1",
        ids: ["chord1", "chord2"], // 引用所有收藏
        lengths: [1, 1],
      },
    ];

    // 设置初始状态
    chordStore.favorites.push(...favorites);
    chordStore.collections.push(...collections);

    // 执行清理
    const result = chordActions.cleanupUnusedFavorites();

    // 验证结果
    expect(result.count).toBe(0);
    expect(result.names).toEqual([]);
    expect(chordStore.favorites).toHaveLength(2);
  });

  it("应该正确处理多个合集引用同一个收藏的情况", () => {
    // 准备测试数据
    const favorites: InstrumentData[] = [
      {
        id: "chord1",
        name: "C Major",
        range: { start: 0, end: 5 },
        notes: [{ name: "C", octave: 4 }],
      },
      {
        id: "chord2",
        name: "D Minor",
        range: { start: 0, end: 5 },
        notes: [{ name: "D", octave: 4 }],
      },
      {
        id: "chord3",
        name: "E Major",
        range: { start: 0, end: 5 },
        notes: [{ name: "E", octave: 4 }],
      },
    ];

    const collections: ChordCollection[] = [
      {
        id: "collection1",
        name: "Test Collection 1",
        ids: ["chord1", "chord2"],
        lengths: [1, 1],
      },
      {
        id: "collection2",
        name: "Test Collection 2",
        ids: ["chord1"], // chord1 被两个合集引用
        lengths: [1],
      },
    ];

    // 设置初始状态
    chordStore.favorites.push(...favorites);
    chordStore.collections.push(...collections);

    // 执行清理
    const result = chordActions.cleanupUnusedFavorites();

    // 验证结果 - chord1 和 chord2 被保留，chord3 被删除
    expect(result.count).toBe(1);
    expect(result.names).toEqual(["E Major"]);
    expect(chordStore.favorites).toHaveLength(2);
    expect(chordStore.favorites.map((f) => f.id)).toEqual(["chord1", "chord2"]);
  });

  it("应该正确调整选中索引当删除选中的收藏时", () => {
    // 准备测试数据
    const favorites: InstrumentData[] = [
      {
        id: "chord1",
        name: "C Major",
        range: { start: 0, end: 5 },
        notes: [{ name: "C", octave: 4 }],
      },
      {
        id: "chord2",
        name: "D Minor",
        range: { start: 0, end: 5 },
        notes: [{ name: "D", octave: 4 }],
      },
      {
        id: "chord3",
        name: "E Major",
        range: { start: 0, end: 5 },
        notes: [{ name: "E", octave: 4 }],
      },
    ];

    const collections: ChordCollection[] = [
      {
        id: "collection1",
        name: "Test Collection 1",
        ids: ["chord1"], // 只引用 chord1
        lengths: [1],
      },
    ];

    // 设置初始状态
    chordStore.favorites.push(...favorites);
    chordStore.collections.push(...collections);
    chordStore.selectedFavoriteIndex = 2; // 选中 chord3（将被删除）

    // 执行清理
    const result = chordActions.cleanupUnusedFavorites();

    // 验证结果
    expect(result.count).toBe(2);
    expect(chordStore.selectedFavoriteIndex).toBe(null); // 选中状态被清除
  });

  it("应该正确调整选中索引当删除选中收藏前面的收藏时", () => {
    // 准备测试数据
    const favorites: InstrumentData[] = [
      {
        id: "chord1",
        name: "C Major",
        range: { start: 0, end: 5 },
        notes: [{ name: "C", octave: 4 }],
      },
      {
        id: "chord2",
        name: "D Minor",
        range: { start: 0, end: 5 },
        notes: [{ name: "D", octave: 4 }],
      },
      {
        id: "chord3",
        name: "E Major",
        range: { start: 0, end: 5 },
        notes: [{ name: "E", octave: 4 }],
      },
    ];

    const collections: ChordCollection[] = [
      {
        id: "collection1",
        name: "Test Collection 1",
        ids: ["chord3"], // 只引用 chord3
        lengths: [1],
      },
    ];

    // 设置初始状态
    chordStore.favorites.push(...favorites);
    chordStore.collections.push(...collections);
    chordStore.selectedFavoriteIndex = 2; // 选中 chord3

    // 执行清理
    const result = chordActions.cleanupUnusedFavorites();

    // 验证结果 - chord1 和 chord2 被删除，chord3 保留，索引调整为 0
    expect(result.count).toBe(2);
    expect(chordStore.selectedFavoriteIndex).toBe(0);
    expect(chordStore.favorites).toHaveLength(1);
    expect(chordStore.favorites[0].id).toBe("chord3");
  });

  it("应该处理没有 id 的收藏", () => {
    // 准备测试数据
    const favorites: InstrumentData[] = [
      {
        id: "chord1",
        name: "C Major",
        range: { start: 0, end: 5 },
        notes: [{ name: "C", octave: 4 }],
      },
      {
        // 没有 id 的收藏
        name: "D Minor",
        range: { start: 0, end: 5 },
        notes: [{ name: "D", octave: 4 }],
      },
    ];

    const collections: ChordCollection[] = [
      {
        id: "collection1",
        name: "Test Collection 1",
        ids: ["chord1"],
        lengths: [1],
      },
    ];

    // 设置初始状态
    chordStore.favorites.push(...favorites);
    chordStore.collections.push(...collections);

    // 执行清理
    const result = chordActions.cleanupUnusedFavorites();

    // 验证结果 - 没有 id 的收藏不会被删除
    expect(result.count).toBe(0);
    expect(chordStore.favorites).toHaveLength(2);
  });
});
