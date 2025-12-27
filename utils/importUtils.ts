import { message } from "antd";
import { api } from "@/services/api";
import { chordActions } from "@/stores/chordStore";
import { phraseActions } from "@/stores/phraseStore";
import { dbManager } from "@/utils/indexedDB";
import { v4 as uuid } from "uuid";

// 数据订正函数：重新生成ID并更新引用关系
export const dataCorrector = (data: any) => {
  if (!data || typeof data !== "object") {
    return data;
  }

  const correctedData = { ...data };
  const idMapping = new Map(); // 旧ID -> 新ID的映射

  // 第一步：为CHORD_FAVORITES中的每一项生成新ID，并建立映射关系
  if (correctedData.CHORD_FAVORITES && correctedData.CHORD_FAVORITES.value) {
    correctedData.CHORD_FAVORITES.value =
      correctedData.CHORD_FAVORITES.value.map((item: any) => {
        if (item.id) {
          const newId = uuid();
          idMapping.set(item.id, newId);
          return { ...item, id: newId };
        }
        return item;
      });
  }

  // 处理乐句块数据
  if (
    correctedData["phrase-notebook-blocks"] &&
    correctedData["phrase-notebook-blocks"].value
  ) {
    correctedData["phrase-notebook-blocks"].value = correctedData[
      "phrase-notebook-blocks"
    ].value.map((item: any) => {
      if (item.id) {
        const newId = uuid();
        idMapping.set(item.id, newId);
        return { ...item, id: newId };
      }
      return item;
    });
  }

  // 第二步：为CHORD_COLLECTIONS中的每一项生成新ID，并更新其ids数组中的引用
  if (
    correctedData.CHORD_COLLECTIONS &&
    correctedData.CHORD_COLLECTIONS.value
  ) {
    correctedData.CHORD_COLLECTIONS.value =
      correctedData.CHORD_COLLECTIONS.value.map((collection: any) => {
        const newCollection = { ...collection };

        // 生成新的collection ID
        if (newCollection.id) {
          newCollection.id = uuid();
        }

        // 更新ids数组中的引用
        if (newCollection.ids && Array.isArray(newCollection.ids)) {
          newCollection.ids = newCollection.ids.map((oldId: string) => {
            return idMapping.get(oldId) || oldId; // 如果找到映射就用新ID，否则保持原ID
          });
        }

        return newCollection;
      });
  }

  // 处理乐句合集数据
  if (
    correctedData.PHRASE_COLLECTIONS &&
    correctedData.PHRASE_COLLECTIONS.value
  ) {
    correctedData.PHRASE_COLLECTIONS.value =
      correctedData.PHRASE_COLLECTIONS.value.map((collection: any) => {
        const newCollection = { ...collection };

        // 生成新的collection ID
        if (newCollection.id) {
          newCollection.id = uuid();
        }

        // 更新ids数组中的引用
        if (newCollection.ids && Array.isArray(newCollection.ids)) {
          newCollection.ids = newCollection.ids.map((oldId: string) => {
            return idMapping.get(oldId) || oldId; // 如果找到映射就用新ID，否则保持原ID
          });
        }

        return newCollection;
      });
  }

  return correctedData;
};

// 合并数据到本地
export const mergeDataToLocal = async (importedData: any, t?: (key: string) => string) => {
  try {
    // 获取所有本地数据
    const allLocalData = await dbManager.getAllItems();

    // 将本地数据转换为键值对映射
    const localDataMap = new Map();
    allLocalData.forEach((item) => {
      localDataMap.set(item.key, item.value);
    });

    // 合并导入的数据
    const updates = new Map();

    // 处理导入数据中的每个键
    Object.entries(importedData).forEach(
      ([dataKey, dataValue]: [string, any]) => {
        const { value: remoteData } = dataValue;
        const localData = localDataMap.get(dataKey) || [];
        const merged = [...(remoteData ?? []), ...(localData ?? [])];
        updates.set(dataKey, merged);
      }
    );

    // 批量保存更新的数据
    for (const [key, value] of updates) {
      await dbManager.setItem(key, value);
    }
  } catch (error) {
    const errorMsg = t ? t("合并数据失败:") : "合并数据失败:";
    console.error(errorMsg, error);
    throw error;
  }
};

// 导入分享数据
export const importShareData = async (shareUuid: string, t?: (key: string) => string) => {
  if (!shareUuid.trim()) {
    const warningMsg = t ? t("分享码无效") : "分享码无效";
    message.warning(warningMsg);
    return false;
  }

  try {
    const response = await api.get(`/share/${shareUuid}`);

    if (response && response.content) {
      const importedData = dataCorrector(JSON.parse(response.content));

      // 合并数据到本地 IndexedDB
      await mergeDataToLocal(importedData, t);

      // 触发重新初始化
      await chordActions.init();
      await phraseActions.init();

      // 自动选择到导入的最后一个和弦合集和最后一个乐句合集
      if (
        importedData.CHORD_COLLECTIONS &&
        importedData.CHORD_COLLECTIONS.value
      ) {
        const chordCollections = importedData.CHORD_COLLECTIONS.value;
        if (chordCollections.length > 0) {
          const lastChordCollection =
            chordCollections[chordCollections.length - 1];
          chordActions.setCurrentCollection(lastChordCollection.id);
        }
      }

      if (
        importedData.PHRASE_COLLECTIONS &&
        importedData.PHRASE_COLLECTIONS.value
      ) {
        const phraseCollections = importedData.PHRASE_COLLECTIONS.value;
        if (phraseCollections.length > 0) {
          const lastPhraseCollection =
            phraseCollections[phraseCollections.length - 1];
          phraseActions.setCurrentCollection(lastPhraseCollection.id);
        }
      }

      const successMsg = t ? t("导入成功！") : "导入成功！";
      message.success(successMsg);
      return true;
    } else {
      const errorMsg = t ? t("分享码无效或已过期") : "分享码无效或已过期";
      message.error(errorMsg);
      return false;
    }
  } catch (error) {
    const errorMsg = t ? t("导入失败:") : "导入失败:";
    console.error(errorMsg, error);
    const userErrorMsg = t ? t("导入失败，请检查分享码是否正确") : "导入失败，请检查分享码是否正确";
    message.error(userErrorMsg);
    return false;
  }
};