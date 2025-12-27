import { chordActions } from "@/stores/chordStore";
import { phraseActions } from "@/stores/phraseStore";
import { message } from "antd";
import { dataCorrector, mergeDataToLocal } from "./importUtils";
import { api } from "@/services/api";

export const importMarketItem = async (
  item: any,
  t: (key: string) => string
) => {
  try {
    const { type, content } = item;
    let importPayload: any = {};

    if (type === "chord") {
      const { collection, chords } = content;
      importPayload = {
        CHORD_COLLECTIONS: { value: [collection] },
        CHORD_FAVORITES: { value: chords },
      };
    } else if (type === "phrase") {
      const block = content;
      importPayload = {
        "phrase-notebook-blocks": { value: [block] },
      };
    }

    // 1. Correct IDs and references (Data correction)
    // dataCorrector expects the structure { KEY: { value: [...] } }
    const correctedData = dataCorrector(importPayload);

    // 2. Merge to local IndexedDB
    await mergeDataToLocal(correctedData, t);

    // 3. Reload stores to reflect changes
    if (type === "chord") {
      await chordActions.init();
      // Switch to the newly imported collection if available
      if (correctedData.CHORD_COLLECTIONS?.value?.length > 0) {
        const newCollectionId = correctedData.CHORD_COLLECTIONS.value[0].id;
        chordActions.setCurrentCollection(newCollectionId);
      }
    } else {
      await phraseActions.init();
      // For phrases, we just reload. Optionally could scroll to it or highlight it.
    }
    message.success("导入成功，可在「和弦」查看");
  } catch (error) {
    console.error("Import failed:", error);
    throw error; // Re-throw so caller knows it failed
  }
};

export const importMarketItemById = async (
  id: string,
  t: (key: string) => string
) => {
  try {
    const item = await api.get(`/market/${id}`);
    if (item) {
      await importMarketItem(item, t);
    } else {
      throw new Error("Item not found");
    }
  } catch (error) {
    console.error("Failed to import market item by ID:", error);
    throw error;
  }
};
