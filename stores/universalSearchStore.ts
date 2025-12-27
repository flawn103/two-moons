import { proxy } from "valtio";

// 创建结果接口
export interface CreatorResult {
  type: "phrase" | "chord" | "NOT_SUPPORT";
  value?: string[] | string[][];
  desc?: string;
}

// UniversalSearch状态接口
interface UniversalSearchState {
  searchText: string;
  createText: string;
  mode: "search" | "create" | "qa";
  isCreating: boolean;
  creatorResult: CreatorResult | null;
  streamProgress: number;
  streamMessage: string;
}

// 创建universalSearch状态
export const universalSearchStore = proxy<UniversalSearchState>({
  searchText: "",
  createText: "",
  mode: "search",
  isCreating: false,
  creatorResult: null,
  streamProgress: 0,
  streamMessage: "",
});

// Actions
export const universalSearchActions = {
  // 设置搜索文本
  setSearchText(text: string) {
    universalSearchStore.searchText = text;
  },

  // 设置创建文本
  setCreateText(text: string) {
    universalSearchStore.createText = text;
  },

  // 设置模式
  setMode(mode: "search" | "create" | "qa") {
    universalSearchStore.mode = mode;
  },

  // 设置创建状态
  setIsCreating(isCreating: boolean) {
    universalSearchStore.isCreating = isCreating;
  },

  // 设置创建结果
  setCreatorResult(result: CreatorResult | null) {
    universalSearchStore.creatorResult = result;
  },

  // 设置流进度
  setStreamProgress(progress: number) {
    universalSearchStore.streamProgress = progress;
  },

  // 设置流消息
  setStreamMessage(message: string) {
    universalSearchStore.streamMessage = message;
  },

  // 重置所有状态
  reset() {
    universalSearchStore.searchText = "";
    universalSearchStore.createText = "";
    universalSearchStore.mode = "search";
    universalSearchStore.isCreating = false;
    universalSearchStore.creatorResult = null;
    universalSearchStore.streamProgress = 0;
    universalSearchStore.streamMessage = "";
  },

  // 重置创建相关状态
  resetCreation() {
    universalSearchStore.isCreating = false;
    universalSearchStore.creatorResult = null;
    universalSearchStore.streamProgress = 0;
    universalSearchStore.streamMessage = "";
  },

  // 清空搜索
  clearSearch() {
    universalSearchStore.searchText = "";
  },
};