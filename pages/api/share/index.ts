import { client } from "@/services/client";
import { response } from "@/services/utils";
import { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuid } from "uuid";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "POST":
      return createShare(req, res);
    default:
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

const createShare = async (req: NextApiRequest, res: NextApiResponse) => {
  const { content, name, updateExisting, existingUuid } = req.body;

  if (!content) {
    return res.status(400).json({ error: "NO_SHARE_CONTENT" });
  }

  try {
    let shareUuid: string;
    let operation: string;

    if (updateExisting && existingUuid) {
      // 更新现有合集
      shareUuid = existingUuid;
      operation = "update";

      // 首先检查现有合集是否存在
      const { data: existingShare, error: checkError } = await client
        .from("share")
        .select("uuid, content")
        .eq("uuid", existingUuid)
        .single();

      if (checkError || !existingShare) {
        return res.status(404).json({ error: "EXISTING_SHARE_NOT_FOUND" });
      }

      // 合并内容：将新内容与现有内容合并
      let mergedContent = content;
      try {
        const existingContent = JSON.parse(existingShare.content);
        mergedContent = mergeShareContent(existingContent, content);
      } catch (parseError) {
        console.error("解析现有内容失败:", parseError);
        // 如果解析失败，使用新内容覆盖
      }

      // 更新现有记录
      const { error: updateError } = await client
        .from("share")
        .update({
          content: mergedContent,
          updated_at: new Date().toISOString(),
        })
        .eq("uuid", existingUuid);

      if (updateError) throw updateError;
    } else {
      // 创建新合集
      shareUuid = uuid();
      operation = "create";

      // 构建插入数据
      const insertData: any = {
        uuid: shareUuid,
        content: content,
      };

      // 如果分享到市场，添加相关字段
      if (name) {
        insertData.name = name.trim();
      }

      const { error: insertError } = await client
        .from("share")
        .insert(insertData)
        .select("uuid")
        .single();

      if (insertError) throw insertError;
    }

    response(res, { uuid: shareUuid, operation }, 200);
  } catch (error) {
    console.error("处理分享失败:", error);
    res.status(500).json({ error: "SHARE_OPERATION_FAILED" });
  }
};

// 合并分享内容的辅助函数
const mergeShareContent = (existingContent: any, newContent: any) => {
  const merged = { ...existingContent };

  // 合并和弦合集
  if (newContent.CHORD_COLLECTIONS?.value) {
    if (!merged.CHORD_COLLECTIONS) {
      merged.CHORD_COLLECTIONS = { value: [] };
    }

    const existingChordCollections = merged.CHORD_COLLECTIONS.value || [];
    const newChordCollections = newContent.CHORD_COLLECTIONS.value;

    // 合并和弦合集，避免重复
    const mergedChordCollections = [...existingChordCollections];
    newChordCollections.forEach((newCollection: any) => {
      const existingIndex = mergedChordCollections.findIndex(
        (existing: any) => existing.id === newCollection.id
      );
      if (existingIndex >= 0) {
        // 更新现有合集
        mergedChordCollections[existingIndex] = newCollection;
      } else {
        // 添加新合集
        mergedChordCollections.push(newCollection);
      }
    });
    merged.CHORD_COLLECTIONS.value = mergedChordCollections;
  }

  // 合并和弦收藏
  if (newContent.CHORD_FAVORITES?.value) {
    if (!merged.CHORD_FAVORITES) {
      merged.CHORD_FAVORITES = { value: [] };
    }

    const existingChords = merged.CHORD_FAVORITES.value || [];
    const newChords = newContent.CHORD_FAVORITES.value;

    // 合并和弦，避免重复
    const mergedChords = [...existingChords];
    newChords.forEach((newChord: any) => {
      const existingIndex = mergedChords.findIndex(
        (existing: any) => existing.id === newChord.id
      );
      if (existingIndex >= 0) {
        // 更新现有和弦
        mergedChords[existingIndex] = newChord;
      } else {
        // 添加新和弦
        mergedChords.push(newChord);
      }
    });
    merged.CHORD_FAVORITES.value = mergedChords;
  }

  // 合并乐句合集
  if (newContent.PHRASE_COLLECTIONS?.value) {
    if (!merged.PHRASE_COLLECTIONS) {
      merged.PHRASE_COLLECTIONS = { value: [] };
    }

    const existingPhraseCollections = merged.PHRASE_COLLECTIONS.value || [];
    const newPhraseCollections = newContent.PHRASE_COLLECTIONS.value;

    // 合并乐句合集，避免重复
    const mergedPhraseCollections = [...existingPhraseCollections];
    newPhraseCollections.forEach((newCollection: any) => {
      const existingIndex = mergedPhraseCollections.findIndex(
        (existing: any) => existing.id === newCollection.id
      );
      if (existingIndex >= 0) {
        // 更新现有合集
        mergedPhraseCollections[existingIndex] = newCollection;
      } else {
        // 添加新合集
        mergedPhraseCollections.push(newCollection);
      }
    });
    merged.PHRASE_COLLECTIONS.value = mergedPhraseCollections;
  }

  // 合并乐句块
  if (newContent["phrase-notebook-blocks"]?.value) {
    if (!merged["phrase-notebook-blocks"]) {
      merged["phrase-notebook-blocks"] = { value: [] };
    }

    const existingPhrases = merged["phrase-notebook-blocks"].value || [];
    const newPhrases = newContent["phrase-notebook-blocks"].value;

    // 合并乐句，避免重复
    const mergedPhrases = [...existingPhrases];
    newPhrases.forEach((newPhrase: any) => {
      const existingIndex = mergedPhrases.findIndex(
        (existing: any) => existing.id === newPhrase.id
      );
      if (existingIndex >= 0) {
        // 更新现有乐句
        mergedPhrases[existingIndex] = newPhrase;
      } else {
        // 添加新乐句
        mergedPhrases.push(newPhrase);
      }
    });
    merged["phrase-notebook-blocks"].value = mergedPhrases;
  }

  return merged;
};
