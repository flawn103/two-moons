/** @deprecated */

import React, { useState, useEffect } from "react";
import { Button, Card, Tag, message, Spin } from "antd";
import { ImportOutlined, DownOutlined, RightOutlined } from "@ant-design/icons";
import { proxy, useSnapshot } from "valtio";
import { api } from "@/services/api";
import { useTranslation } from "next-i18next";
import { importShareData } from "@/utils/importUtils";
import { playChord, playInstrumentData } from "@/utils/calc";
import { getNoteByStringAndFret } from "@/components/ChordEditor/GuitarEditor";
import { ChordCollection } from "@/components/ChordCollection";
import { PhraseBlock } from "@/components/PhraseBlock";
import { getCollectionInstrument } from "@/utils/chord";

interface Collection {
  id: string;
  name: string;
  type: "chord" | "phrase";
  count: number;
}

interface ShareItem {
  uuid: string;
  createdAt: string;
  name: string;
  collections: Collection[];
}

interface CollectionCardProps {
  shareUuid: string;
  showImportButton?: boolean;
  onImport?: (uuid: string) => void;
}

export function CollectionCard({
  shareUuid,
  showImportButton = true,
  onImport,
}: CollectionCardProps) {
  const { t } = useTranslation("market");
  const [state] = useState(
    proxy({
      shareData: null as ShareItem | null,
      previewData: null as any,
      loading: false,
      importing: false,
      expandedCollections: {} as Record<string, boolean>,
    })
  );

  const { shareData, previewData, loading, importing, expandedCollections } =
    useSnapshot(state, { sync: true });

  // 切换collection展开状态
  const toggleCollectionExpanded = (collectionId: string) => {
    state.expandedCollections[collectionId] =
      !state.expandedCollections[collectionId];
  };

  // 加载分享数据
  const loadShareData = async () => {
    state.loading = true;
    try {
      // 获取分享基本信息
      const shareResponse = await api.get(`/share/${shareUuid}`);
      if (!shareResponse) {
        throw new Error("分享数据不存在");
      }

      // 解析分享内容
      const content = JSON.parse(shareResponse.content);
      state.previewData = content;

      // 构建ShareItem格式的数据
      const chordCollections = content.CHORD_COLLECTIONS?.value || [];
      const phraseCollections = content.PHRASE_COLLECTIONS?.value || [];

      const collections: Collection[] = [
        ...chordCollections.map((c: any) => ({
          id: c.id,
          name: c.name,
          type: "chord" as const,
          count: c.ids?.length || 0,
        })),
        ...phraseCollections.map((c: any) => ({
          id: c.id,
          name: c.name,
          type: "phrase" as const,
          count: c.ids?.length || 0,
        })),
      ];

      state.shareData = {
        uuid: shareUuid,
        createdAt: shareResponse.createdAt || "",
        name: shareResponse.name || "未命名分享",
        collections,
      };
    } catch (error) {
      console.error("加载分享数据失败:", error);
      message.error("加载分享数据失败");
    } finally {
      state.loading = false;
    }
  };

  // 处理导入
  const handleImport = async () => {
    if (onImport) {
      onImport(shareUuid);
      return;
    }

    state.importing = true;
    try {
      await importShareData(shareUuid, t);
    } catch (error) {
      console.error("导入失败:", error);
    } finally {
      state.importing = false;
    }
  };

  // 获取和弦合集数据用于ChordCollection组件
  const getChordCollectionData = (collection: Collection) => {
    if (!previewData) return [];

    const allChords = previewData.CHORD_FAVORITES?.value || [];
    const targetCollection = (previewData.CHORD_COLLECTIONS?.value || []).find(
      (c: any) => c.id === collection.id
    );

    if (!targetCollection) return [];

    return targetCollection.ids
      .map((chordId: string) => allChords.find((c: any) => c.id === chordId))
      .filter(Boolean);
  };

  const getInstrument = (collection: Collection) => {
    if (!previewData) return "piano";

    const targetCollection = (previewData.CHORD_COLLECTIONS?.value || []).find(
      (c: any) => c.id === collection.id
    );

    return getCollectionInstrument(
      targetCollection,
      previewData.CHORD_FAVORITES?.value || []
    );
  };

  // 获取乐句合集数据用于PhraseBlock组件
  const getPhraseCollectionData = (collection: Collection) => {
    if (!previewData) return [];

    const allPhrases = previewData["phrase-notebook-blocks"]?.value || [];
    const targetCollection = (previewData.PHRASE_COLLECTIONS?.value || []).find(
      (c: any) => c.id === collection.id
    );

    if (!targetCollection) return [];

    return targetCollection.ids
      .map((phraseId: string) => allPhrases.find((p: any) => p.id === phraseId))
      .filter(Boolean);
  };

  const getRoot = (collection: Collection) => {
    if (!previewData) return [];

    const targetCollection = (previewData.CHORD_COLLECTIONS?.value || []).find(
      (c: any) => c.id === collection.id
    );

    if (!targetCollection) return [];

    return targetCollection.rootNote;
  };

  // 获取合集的 playConfig
  const getPlayConfig = (collection: Collection) => {
    if (!previewData) return null;

    const targetCollection = (previewData.CHORD_COLLECTIONS?.value || []).find(
      (c: any) => c.id === collection.id
    );

    if (!targetCollection || !targetCollection.playConfig) return null;

    return targetCollection.playConfig;
  };

  // 获取合集类型标签颜色
  const getCollectionTagColor = (type: "chord" | "phrase") => {
    return type === "chord" ? "blue" : "green";
  };

  useEffect(() => {
    if (shareUuid) {
      loadShareData();
    }
  }, [shareUuid]);

  if (loading) {
    return (
      <Card className="shadow-md">
        <Spin spinning={true}>
          <div className="h-32"></div>
        </Spin>
      </Card>
    );
  }

  if (!shareData) {
    return (
      <Card className="shadow-md">
        <div className="text-center text-gray-500 py-8">
          加载失败或数据不存在
        </div>
      </Card>
    );
  }

  return (
    <Card
      bodyStyle={{
        padding: 8,
      }}
      className="shadow-md hover:shadow-lg transition-shadow"
      title={
        <div className="flex items-center justify-between">
          <span>{shareData.name}</span>
          {showImportButton && (
            <Button
              type="primary"
              icon={<ImportOutlined />}
              loading={importing}
              onClick={handleImport}
            >
              {t("导入")}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-2">
        {shareData.collections.map((collection) => {
          const blockData = getChordCollectionData(collection);
          const root = getRoot(collection);
          const playConfig = getPlayConfig(collection);

          return (
            <div key={collection.id} className="rounded-lg p-2 shadow-sm">
              <div
                className="flex items-center justify-between mb-3 cursor-pointer"
                onClick={() => toggleCollectionExpanded(collection.id)}
              >
                <div className="flex items-center space-x-2">
                  <Button
                    type="text"
                    size="small"
                    icon={
                      expandedCollections[collection.id] ? (
                        <DownOutlined />
                      ) : (
                        <RightOutlined />
                      )
                    }
                    className="p-0 min-w-0 h-auto"
                  />
                  <span className="font-medium">{collection.name}</span>
                  <Tag color={getCollectionTagColor(collection.type)}>
                    {collection.type === "chord" ? t("和弦") : t("乐句")}
                  </Tag>
                </div>
                <span className="text-sm text-gray-500">
                  {collection.count} {t("项")}
                </span>
              </div>
              {collection.type === "chord" &&
                previewData &&
                expandedCollections[collection.id] && (
                  <div className="mt-2">
                    <ChordCollection
                      root={root}
                      isEdit={false}
                      showAutoAccompaniment={true}
                      blocks={blockData}
                      instrument={getInstrument(collection)}
                      lengths={
                        previewData?.CHORD_COLLECTIONS?.value?.find(
                          (c: any) => c.id === collection.id
                        )?.lengths
                      }
                      playConfig={playConfig}
                      onSelect={(id, isTriggeredByClick = true) => {
                        if (!isTriggeredByClick) return;

                        // 播放选中的和弦
                        const chords = blockData;
                        const chord = chords.find((c) => c.id === id);
                        if (chord) {
                          playInstrumentData(
                            chord,
                            0.1,
                            getInstrument(collection)
                          );
                        }
                      }}
                      onSort={() => {}} // 预览模式不允许排序
                      onDelete={() => {}} // 预览模式不允许删除
                      onRename={() => {}} // 预览模式不允许重命名
                      onCollect={() => {}} // 预览模式不允许收藏操作
                      onLengthChange={() => {}} // 预览模式不允许修改长度
                    />
                  </div>
                )}
              {collection.type === "phrase" &&
                previewData &&
                expandedCollections[collection.id] && (
                  <div className="mt-2 space-y-2">
                    {getPhraseCollectionData(collection).map((phrase) => (
                      <PhraseBlock
                        isEdit={false}
                        key={phrase.id}
                        setNodeRef={() => {}}
                        isDragging={false}
                        onCollect={() => {}}
                        block={phrase}
                        style={{}}
                        onDelete={() => {}} // 预览模式不允许删除
                        onUpdate={() => {}} // 预览模式不允许编辑
                        dragHandleProps={{}}
                      />
                    ))}
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default CollectionCard;
