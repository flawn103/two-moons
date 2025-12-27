import React, { useEffect, useMemo, useRef, useReducer } from "react";
import {
  Input,
  List,
  Modal,
  Button,
  Tag,
  Segmented,
  message,
  Spin,
  Progress,
} from "antd";
import { v4 } from "uuid";
import {
  SearchOutlined,
  BulbOutlined,
  PlusOutlined,
  BookOutlined,
} from "@ant-design/icons";
import { useRouter } from "next/router";
import { useSnapshot } from "valtio";
import { chordStore, chordActions } from "@/stores/chordStore";
import { phraseStore, phraseActions } from "@/stores/phraseStore";
import {
  universalSearchStore,
  universalSearchActions,
  type CreatorResult,
} from "@/stores/universalSearchStore";

// 导出CreatorResult接口供其他组件使用
export type { CreatorResult };
import { useTranslation } from "next-i18next";
import { PhraseBlock } from "@/components/PhraseBlock";
import { ChordCollection } from "@/components/ChordCollection";
import { convertNotesToGuitarData, playInstrumentData } from "@/utils/calc";
import { identifyChord } from "@/components/ChordEditor";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { apiState } from "@/services/state";
import { checkPWA } from "@/utils/env";
import { appStore } from "@/stores/store";
import { Mooner } from "../AIMooner";

interface SearchResult {
  id: string;
  type: "chord" | "chord-collection" | "phrase" | "phrase-collection";
  title: string;
  subtitle?: string;
  data?: any;
}

interface UniversalSearchProps {
  visible: boolean;
  onClose: () => void;
}

export default function UniversalSearch({
  visible,
  onClose,
}: UniversalSearchProps) {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { user } = useSnapshot(appStore);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [, forceUpdate] = useReducer((x) => x + 1, 0);

  const chordState = useSnapshot(chordStore);
  const phraseState = useSnapshot(phraseStore);
  const { mode, isCreating, creatorResult, streamProgress, streamMessage } =
    useSnapshot(universalSearchStore);
  const { searchText, createText } = useSnapshot(universalSearchStore, {
    sync: true,
  });

  // 生成和弦预览数据
  const chordBlocks = useMemo(() => {
    if (creatorResult?.type !== "chord" || !creatorResult.value) return [];

    return (creatorResult.value as string[][]).map((chordNotes, index) => {
      const notes = chordNotes.map((note) => {
        const match = note.match(/([A-G][#b]?)(\d+)/);
        if (match) {
          return {
            name: match[1],
            octave: parseInt(match[2]),
          };
        }
        return { name: "C", octave: 4 };
      });

      // 使用identifyChord函数识别和弦名称
      const chordName = identifyChord(notes, null) || `Chord_${index + 1}`;

      return {
        id: v4(),
        name: chordName,
        instrument: "piano" as const,
        notes: notes,
        range: { start: 0, end: notes.length },
        userSelectedRoot: null,
        rawData: null,
        guitarData: [],
        pianoUserSelectedRoot: null,
      };
    });
  }, [creatorResult]);

  // 检查未登录用户的创建次数限制
  const checkCreateLimit = () => {
    // 如果用户已登录，不限制创建次数
    if (user?.token) {
      return true;
    }

    // 未登录用户检查本地存储的创建次数
    if (typeof window === "undefined") {
      return true; // 服务器端渲染时不限制
    }

    const today = new Date().toDateString();
    const storageKey = `universal_create_count_${today}`;
    const createCount = parseInt(localStorage.getItem(storageKey) || "0");

    if (createCount >= 3) {
      message.warning(t("未登录用户每日最多创建3次"));

      return false;
    }

    return true;
  };

  // 增加未登录用户的创建次数
  const incrementCreateCount = () => {
    if (typeof window !== "undefined" && !user?.token) {
      const today = new Date().toDateString();
      const storageKey = `universal_create_count_${today}`;
      const createCount = parseInt(localStorage.getItem(storageKey) || "0");
      localStorage.setItem(storageKey, (createCount + 1).toString());
    }
  };

  // 获取未登录用户剩余创建次数
  const getRemainingCreateCount = () => {
    if (user?.token) {
      return null; // 已登录用户不限制
    }

    if (typeof window === "undefined") {
      return null; // 服务器端渲染时不显示限制
    }

    const today = new Date().toDateString();
    const storageKey = `universal_create_count_${today}`;
    const createCount = parseInt(localStorage.getItem(storageKey) || "0");
    return Math.max(0, 3 - createCount);
  };

  // 调用创造API - 流式处理
  const handleCreate = async () => {
    // 检查创建次数限制
    if (!checkCreateLimit()) {
      return;
    }

    universalSearchActions.setIsCreating(true);
    universalSearchActions.setCreatorResult(null);
    universalSearchActions.setStreamProgress(0);
    universalSearchActions.setStreamMessage("");

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController();

    try {
      await fetchEventSource(
        process.env.NEXT_PUBLIC_SERVER_BASE + "/api/ai-creator",
        {
          method: "POST",
          headers: {
            "Content-Type": "text/event-stream",
            "authorization-ai": apiState.moonToken,
          },
          body: JSON.stringify({ prompt: createText }),
          signal: abortControllerRef.current.signal,
          async onopen(response) {
            if (response.ok) {
              universalSearchActions.setStreamMessage(t("容我想想..."));
              return; // everything's good
            } else {
              message.error(t("当前服务繁忙，请稍后重试"));
              console.error(
                "HTTP error:",
                response.status,
                response.statusText
              );
            }
          },
          onmessage(event) {
            try {
              const data = JSON.parse(event.data);

              switch (data.type) {
                case "not_login":
                  message.error(t("无权限，请尝试刷新"));
                case "start":
                  universalSearchActions.setStreamMessage(data.message);
                  universalSearchActions.setStreamProgress(
                    Math.min(universalSearchStore.streamProgress + 10, 90)
                  );
                  break;
                case "progress":
                  universalSearchActions.setStreamMessage(data.message);
                  universalSearchActions.setStreamProgress(
                    Math.min(universalSearchStore.streamProgress + 5, 90)
                  );
                  break;
                case "too_many_requests":
                  // message.error(t("当前服务繁忙，请稍后重试"));
                  break;
                case "result":
                  universalSearchActions.setStreamProgress(100);
                  universalSearchActions.setStreamMessage(t("创作完成！"));
                  universalSearchActions.setCreatorResult(data.data);

                  if (data.data.type === "NOT_SUPPORT") {
                    message.error(
                      t("抱歉不支持此命令😭，当前支持：和弦进行、和弦、乐句")
                    );
                  } else {
                    // 创建成功，增加未登录用户的创建次数
                    incrementCreateCount();
                    // 触发重新渲染以更新剩余次数显示
                    forceUpdate();
                  }
                  break;
                case "error":
              }
            } catch (parseError) {
              message.error(t("当前服务繁忙，请稍后重试"));
              console.error("Parse error:", parseError);
            }
          },
          onerror(error) {
            message.error(t("当前服务繁忙，请稍后重试"));
            console.error("Stream error:", error);
          },
          onclose() {
            if (universalSearchStore.streamProgress !== 100) {
              message.error(t("发生错误，可尝试稍后重试"));
            }
            universalSearchActions.setIsCreating(false);
          },
        }
      );
    } catch (error) {
      message.error(t("当前服务繁忙，请稍后重试"));
      console.error("Creator API error:", error);
      universalSearchActions.setIsCreating(false);
      universalSearchActions.setStreamProgress(0);
      universalSearchActions.setStreamMessage("");
    }
  };

  // 取消创作
  const handleCancelCreate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    universalSearchActions.setIsCreating(false);
    universalSearchActions.setStreamProgress(0);
    universalSearchActions.setStreamMessage("");
  };

  // 搜索结果
  const searchResults = useMemo(() => {
    if (!searchText.trim()) return [];

    const results: SearchResult[] = [];
    const query = searchText.toLowerCase();

    // 搜索和弦
    chordState.favorites.forEach((chord, index) => {
      if (chord.name?.toLowerCase().includes(query)) {
        results.push({
          id: chord.id || index.toString(),
          type: "chord",
          title: chord.name || t("未命名和弦"),
          subtitle: `${t("和弦")}`,
          data: { chord, index },
        });
      }
    });

    // 搜索和弦合集
    chordState.collections.forEach((collection) => {
      if (collection.name.toLowerCase().includes(query)) {
        results.push({
          id: collection.id,
          type: "chord-collection",
          title: collection.name,
          subtitle: t("和弦合集"),
          data: collection,
        });
      }
    });

    // 搜索乐句
    phraseState.blocks.forEach((block, index) => {
      if (
        block.name.toLowerCase().includes(query) ||
        block.content.toLowerCase().includes(query)
      ) {
        results.push({
          id: block.id,
          type: "phrase",
          title: block.name,
          subtitle: `${t("乐句")} - ${block.content.substring(0, 20)}${
            block.content.length > 20 ? "..." : ""
          }`,
          data: { block, index },
        });
      }
    });

    // 搜索乐句合集
    phraseState.collections.forEach((collection) => {
      if (collection.name.toLowerCase().includes(query)) {
        results.push({
          id: collection.id,
          type: "phrase-collection",
          title: collection.name,
          subtitle: t("乐句合集"),
          data: collection,
        });
      }
    });

    return results;
  }, [
    searchText,
    chordState.favorites,
    chordState.collections,
    phraseState.blocks,
    phraseState.collections,
    t,
  ]);

  // 处理搜索结果点击
  const handleResultClick = (result: SearchResult) => {
    switch (result.type) {
      case "chord":
        // 跳转到和弦页面，选择全部合集，并selectFavorite
        chordActions.setCurrentCollection(null); // 选择全部合集
        chordActions.selectFavorite(result.data.index);
        router.push("/chord");
        break;

      case "chord-collection":
        // 跳转到和弦页面，切换到对应合集
        chordActions.setCurrentCollection(result.data.id);
        router.push("/chord");
        break;

      case "phrase":
        // 跳转到乐句页面，使用URL查询参数
        phraseActions.setSearchTerm(result.title);
        router.push("/phrase");
        break;

      case "phrase-collection":
        // 跳转到乐句页面，切换到对应合集
        phraseActions.setCurrentCollection(result.data.id);
        router.push("/phrase");
        break;
    }

    onClose();
    universalSearchActions.setSearchText("");
  };

  // 获取标签文本和颜色
  const getTag = (type: SearchResult["type"]) => {
    switch (type) {
      case "chord":
        return { text: t("和弦") };
      case "chord-collection":
        return { text: t("和弦合集") };
      case "phrase":
        return { text: t("乐句") };
      case "phrase-collection":
        return { text: t("乐句合集") };
      default:
        return { text: t("未知") };
    }
  };

  // 添加创造结果到合集
  const handleAddToCollection = async () => {
    if (!creatorResult) return;

    if (creatorResult.type === "phrase" && creatorResult.value) {
      await phraseActions.init();

      // 添加乐句
      const phraseContent = Array.isArray(creatorResult.value)
        ? creatorResult.value[0]
        : "";

      const name =
        createText.substring(0, 20) + (createText.length > 20 ? "..." : "");

      // 直接调用addBlock，不传参数
      phraseActions.addBlock();
      // 获取最后添加的块并更新其内容
      const lastBlock = phraseStore.blocks[phraseStore.blocks.length - 1];
      if (lastBlock) {
        phraseActions.updateBlock(
          lastBlock.id,
          "name",
          createText.substring(0, 20) + (createText.length > 20 ? "..." : "")
        );
        phraseActions.updateBlock(lastBlock.id, "content", phraseContent);
        phraseActions.updateBlock(lastBlock.id, "bpm", 110);
        phraseActions.updateBlock(lastBlock.id, "showStaffNotation", true);
      }

      message.success(t("乐句已添加"));
      phraseActions.setSearchTerm(name);
      if (router.asPath !== "/phrase") {
        router.push("/phrase");
      }
    } else if (creatorResult.type === "chord" && creatorResult.value) {
      await chordActions.init();

      // 添加和弦进行 - 先创建合集
      const collectionName =
        createText.substring(0, 20) + (createText.length > 20 ? "..." : "");
      const collectionId = chordActions.createCollection(collectionName);

      // 生成多个和弦数据并添加到合集
      const chords = creatorResult.value as string[][];
      const datas = [];
      chords.forEach((chordNotes, index) => {
        const notes = chordNotes.map((note) => {
          const match = note.match(/([A-G][#b]?)(\d+)/);
          if (match) {
            return {
              name: match[1],
              octave: parseInt(match[2]),
            };
          }
          return { name: "C", octave: 4 };
        });

        // 使用identifyChord函数识别和弦名称
        const chordName =
          identifyChord(notes, null) || `${collectionName}_${index + 1}`;

        const guitarData = convertNotesToGuitarData(notes);
        const lowFret = Math.min(...guitarData.map((item) => item.fret));
        const instrumentData = {
          id: v4(), // 这里其实可以不用
          name: chordName, // 这里其实可以不用
          instrument: "piano" as const,
          notes: notes,
          range: { start: lowFret - 1, end: lowFret + 4 },
          userSelectedRoot: null,
          rawData: null,
          guitarData,
          pianoUserSelectedRoot: null,
        };

        datas.push(instrumentData);
        // 先更新当前乐器数据，然后添加到收藏
        chordActions.addToFavorites({
          chordName,
          data: instrumentData,
          addToCurrentCollection: false,
        });
        chordActions.addToCollection(instrumentData.id, collectionId);
      });

      // 切换到新创建的合集
      chordActions.setCurrentCollection(collectionId);
      if (datas[0].id) chordActions.selectFavoriteById(datas[0].id);

      message.success(t("和弦进行已添加"));
      if (router.asPath !== "/chord") {
        router.push("/chord");
      }
    }

    onClose();
    universalSearchActions.setSearchText("");
    universalSearchActions.setCreatorResult(null);
  };

  // 初始化默认创建文本
  useEffect(() => {
    if (!createText) {
      universalSearchActions.setCreateText(t("浮游感的和弦进行"));
    }
  }, []);

  // 组件卸载时清理
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // 当组件关闭时重置搜索状态
  useEffect(() => {
    if (!visible) {
      universalSearchActions.clearSearch();
    }
  }, [visible]);

  return (
    <Modal
      title={t("全能助手 Mooner🌙")}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <div className="space-y-4">
        {/* 模式切换 */}
        <Segmented
          value={mode}
          onChange={(v) =>
            universalSearchActions.setMode(v as "search" | "create" | "qa")
          }
          options={[
            {
              label: t("搜索"),
              value: "search",
              icon: <SearchOutlined />,
            },
            {
              label: t("创造"),
              value: "create",
              icon: <BulbOutlined />,
            },
            {
              label: t("问答"),
              value: "qa",
              icon: <BookOutlined />,
            },
          ]}
          block
        />

        {/* 输入框 */}
        <div className="flex gap-2">
          {mode !== "qa" && (
            <Input
              allowClear
              prefix={mode === "search" ? <SearchOutlined /> : <BulbOutlined />}
              value={mode === "search" ? searchText : createText}
              onChange={(e) =>
                mode === "search"
                  ? universalSearchActions.setSearchText(e.target.value)
                  : universalSearchActions.setCreateText(e.target.value)
              }
              onPressEnter={mode === "create" ? handleCreate : undefined}
              placeholder={
                mode === "search"
                  ? t("输入关键词开始搜索")
                  : t("描述你想要的音乐内容，当前支持和弦、和弦进行")
              }
              size="large"
              autoFocus
            />
          )}
          {mode === "create" && (
            <>
              {!isCreating ? (
                <Button
                  type="primary"
                  size="large"
                  onClick={handleCreate}
                  disabled={!createText.trim()}
                >
                  {t("创作")}
                </Button>
              ) : (
                <Button size="large" onClick={handleCancelCreate} danger>
                  {t("取消")}
                </Button>
              )}
            </>
          )}

          {mode === "qa" && (
            <div className="w-full">
              <Mooner />
              <div className="text-center text-gray-400 py-8">
                {t("描述你想询问的乐理相关问题，点击「发送」")}
              </div>
            </div>
          )}
        </div>

        {/* 内容区域 */}
        {mode === "search" &&
          // 搜索
          (searchResults.length > 0 ? (
            <List
              dataSource={searchResults}
              renderItem={(item) => {
                const tag = getTag(item.type);
                return (
                  <List.Item
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleResultClick(item)}
                  >
                    <div className="w-full">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-gray-900">
                          {item.title}
                        </span>
                        <Tag>{tag.text}</Tag>
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.subtitle}
                      </div>
                    </div>
                  </List.Item>
                );
              }}
              style={{ maxHeight: "400px", overflow: "auto" }}
            />
          ) : searchText.trim() ? (
            <div className="text-center text-gray-500 py-8">
              {t("未找到相关结果")}
            </div>
          ) : (
            <div className="text-center text-gray-400 py-8">
              {t("搜索保存到本地的和弦、合集")}
            </div>
          ))}

        {mode === "create" && (
          // 创造
          <div>
            {isCreating ? (
              <div className="text-center py-8">
                <Spin size="large" />
                <div className="mt-4 text-gray-500">
                  {streamMessage || t("正在创作中...")}
                </div>
                {streamProgress > 0 && (
                  <div className="mt-4 px-4">
                    <Progress
                      percent={streamProgress}
                      status={streamProgress === 100 ? "success" : "active"}
                      strokeColor={{
                        "0%": "#4a4a4a",
                        "100%": "#2a2a2a",
                      }}
                    />
                  </div>
                )}
              </div>
            ) : creatorResult ? (
              <div className="space-y-4">
                {creatorResult.type === "NOT_SUPPORT" ? (
                  <div className="text-center text-gray-500 py-8">
                    {t("抱歉不支持此命令😭，当前支持：和弦进行、和弦、乐句")}
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      {creatorResult.desc && (
                        <div className="text-sm flex justify-between gap-4 text-gray-600 mb-3">
                          {creatorResult.desc}

                          <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleAddToCollection}
                          >
                            {t("导入")}
                          </Button>
                        </div>
                      )}

                      {/* 预览区域 */}
                      <div className="bg-white p-3 rounded border">
                        {creatorResult.type === "phrase" ? (
                          <div>
                            <div className="mb-3 text-sm text-gray-600">
                              {t("预览")}
                            </div>
                            <PhraseBlock
                              setNodeRef={() => {}}
                              isDragging={false}
                              onCollect={() => {}}
                              block={{
                                id: "preview",
                                name:
                                  searchText.substring(0, 20) +
                                  (searchText.length > 20 ? "..." : ""),
                                content: Array.isArray(creatorResult.value)
                                  ? creatorResult.value[0]
                                  : "",
                                baseNote: "C4",
                                bpm: 120,
                                showStaffNotation: true,
                              }}
                              style={{}}
                              isEdit={true}
                              onDelete={() => {}}
                              onUpdate={() => {}}
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="mb-3 text-sm text-gray-600">
                              {t("预览")}
                            </div>
                            <ChordCollection
                              root={null}
                              instrument={"piano"}
                              showAutoAccompaniment={true}
                              isEdit={false}
                              blocks={chordBlocks}
                              lengths={undefined}
                              onSelect={(id, isTriggeredByClick = true) => {
                                if (!isTriggeredByClick) return;
                                const chord = chordBlocks.find(
                                  (c) => c.id === id
                                );
                                if (chord) {
                                  playInstrumentData(chord, 0.2, "piano");
                                }
                              }}
                              onSort={() => {}}
                              onDelete={() => {}}
                              onRename={() => {}}
                              onCollect={() => {}}
                              onLengthChange={() => {}}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-8">
                {t("描述你想要的音乐内容，当前支持和弦、和弦进行")}
                <br />
                {t("✳️ AI 不会使用用户上传数据进行训练")}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
