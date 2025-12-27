import { apiState } from "@/services/state";
import { resolve } from "path";
import { proxy, ref, subscribe } from "valtio";
import {
  audioResourceManager,
  AudioResourceManager,
} from "@/utils/AudioResourceManager";
import { db } from "@/utils/indexedDB";
import { soundPresets } from "@/utils/soundPresets";
import { subscribeKey } from "valtio/utils";

export interface AppState {
  user: {
    id: string;
    name: string;
    token?: string;
  };
  isInit: boolean;
  isPresetInit: boolean;
  syncing: boolean;
  resourceManager: AudioResourceManager;
  audioPreset: {
    guitar: keyof typeof soundPresets;
    piano: keyof typeof soundPresets;
  };
  practiceSkin: "default" | "roshengy";
  nightMode: boolean;
}

const ISSERVER = typeof window === "undefined";
const auth = ISSERVER ? {} : (JSON.parse(localStorage.getItem("auth")) ?? {});
apiState.authToken = auth.token;

// 创建全局应用状态
export const appStore = proxy<AppState>({
  user: {
    id: auth?.id || "",
    name: auth?.name || "",
    token: auth?.token || "",
  },
  isInit: false,
  isPresetInit: false,
  syncing: false,
  resourceManager: ref(
    typeof window !== "undefined"
      ? audioResourceManager
      : new AudioResourceManager()
  ),
  audioPreset: {
    guitar: "sine",
    piano: "sine",
  },
  practiceSkin:
    typeof window !== "undefined"
      ? (localStorage.getItem("practiceSkin") as any) || "default"
      : "default",
  nightMode:
    typeof window !== "undefined"
      ? localStorage.getItem("nightMode") === "true"
      : false,
});

// 将状态暴露到全局，供API拦截器使用
if (typeof window !== "undefined") {
  (window as any).globalState = appStore;

  subscribeKey(appStore, "nightMode", (val) => {
    localStorage.setItem("nightMode", String(val));
  });
}

// 订阅audioPreset变化，保存到IndexedDB
if (typeof window !== "undefined") {
  subscribeKey(
    appStore,
    "audioPreset",
    () => {
      if (!appStore.isPresetInit) return;

      // 保存audioPreset到IndexedDB
      db.setItem("audioPreset", JSON.stringify(appStore.audioPreset)).catch(
        (error) => {
          console.error("Failed to save audioPreset to IndexedDB:", error);
        }
      );
    },
    true
  );
}

if (typeof window !== "undefined") {
  subscribeKey(
    appStore,
    "isInit",
    async () => {
      if (appStore.isInit) {
        try {
          appStore.isPresetInit = false;
          const savedPreset = await db.getItem("audioPreset");
          if (savedPreset) {
            const parsedPreset = JSON.parse(savedPreset);
            appStore.audioPreset = parsedPreset;
          }
        } catch (error) {
          console.error("Failed to load audioPreset from IndexedDB:", error);
        } finally {
          appStore.isPresetInit = true;
        }
      }
    },
    true
  );
}

if (typeof window !== "undefined") {
  subscribeKey(
    appStore,
    "practiceSkin",
    () => {
      try {
        localStorage.setItem("practiceSkin", appStore.practiceSkin);
      } catch {}
    },
    true
  );
}
