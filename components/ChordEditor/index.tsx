"use client";

import React, { useEffect, useRef, useState } from "react";
import _ from "lodash";

import { Button, Select, message, Radio, Switch, Modal, Input } from "antd";
import { useTranslation } from "next-i18next";
import {
  CaretRightOutlined,
  ClearOutlined,
  CameraOutlined,
  HeartOutlined,
  EditOutlined,
  FolderOutlined,
  DeleteOutlined,
  CheckOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
// dnd-kit 相关导入已移动到 ChordCollection 组件中
import { domToBlob } from "modern-screenshot";
import { Filesystem, FilesystemDirectory } from "@capacitor/filesystem";
import AbcStaffNotation from "../StaffNotation";

import { chordStore, chordActions } from "@/stores/chordStore";
import { useSnapshot } from "valtio";

import { GuitarEditor, getNoteByStringAndFret } from "./GuitarEditor";
import { PianoEditor } from "./PianoEditor";
import { appStore } from "@/stores/store";
import { InstrumentData, AutoAccompanimentConfig } from "@/typings/chordEditor";
import {
  NOTES,
  getInterval,
  getAbsoluteInterval,
  absoluteIntervalToNote,
  playInstrumentData,
  convertNotesToGuitarData,
} from "@/utils/calc";
import { ChordCollection } from "../ChordCollection";
import { isMobile } from "@/utils/env";
import { convertChordToAbc, noteToAbcStr } from "@/utils/abcConverter";
import { CHORDS } from "@/utils/chord";

const getSortedNotes = (
  currentInstrumentData: InstrumentData,
  instrument: string
) => {
  let notes: readonly Note[] = [];

  // 使用当前合集的乐器类型
  const currentInstrument = instrument;

  if (
    currentInstrument === "guitar" &&
    (currentInstrumentData as any).guitarData
  ) {
    // 吉他模式：从品位数据获取音符
    notes = (currentInstrumentData as any).guitarData.map((guitarNote: any) =>
      getNoteByStringAndFret(guitarNote.string, guitarNote.fret)
    );
  } else if (currentInstrument === "piano" && currentInstrumentData.notes) {
    // 钢琴模式：直接使用音符数据
    notes = currentInstrumentData.notes;
  }

  // 将音符按音高排序（从低到高）
  const sortedNotes = [...notes].sort((a, b) => {
    const aMidi = getAbsoluteInterval(a);
    const bMidi = getAbsoluteInterval(b);
    return aMidi - bMidi;
  });

  return sortedNotes;
};

// 定义音符类型
export interface Note {
  name: string; // 音名
  octave: number; // 八度
}

// 定义序列类型（直接使用InstrumentData，移除了冗余的ChordSequenceItem）
export interface ChordSequence {
  id: string;
  name: string;
  chords: InstrumentData[];
}

// 和弦识别逻辑
export const identifyChord = (
  notes: readonly Note[],
  userSelectedRoot: Note | null
) => {
  if (notes.length === 0) return "";

  // 当没有用户选择的根音时，使用最低音作为根音
  const rootNote =
    userSelectedRoot ||
    [...notes].sort(
      (a, b) => getAbsoluteInterval(a) - getAbsoluteInterval(b)
    )[0];
  if (notes.length === 1) return rootNote.name;

  // 计算相对于根音的所有音程
  const intervals = notes
    .map((note) => getInterval(rootNote, note))
    .sort((a, b) => a - b);

  // 首先尝试完全匹配
  const matchedChord = CHORDS.find((chord) => {
    const requiredIntervals = chord.intervals.filter(
      (interval) => !(chord.canOmit || []).includes(interval)
    );

    const hasAllRequired = requiredIntervals.every((req) =>
      intervals.some((interval) => interval % 12 === req % 12)
    );

    const allIntervalsValid = intervals.every((interval) =>
      chord.intervals.some(
        (chordInterval) => interval % 12 === chordInterval % 12
      )
    );

    return hasAllRequired && allIntervalsValid;
  });

  if (matchedChord) {
    return rootNote.name + matchedChord.name;
  }

  // 如果没有完全匹配，尝试部分匹配
  const partialMatches = CHORDS.map((chord) => {
    const requiredIntervals = chord.intervals.filter(
      (interval) => !(chord.canOmit || []).includes(interval)
    );

    // 计算匹配的必需音程数量
    const matchedRequired = requiredIntervals.filter((req) =>
      intervals.some((interval) => interval % 12 === req % 12)
    ).length;

    // 计算总匹配的音程数量
    const totalMatched = chord.intervals.filter((chordInterval) =>
      intervals.some((interval) => interval % 12 === chordInterval % 12)
    ).length;

    // 计算不匹配的音程（额外的音程）
    const extraIntervals = intervals.filter(
      (interval) =>
        !chord.intervals.some(
          (chordInterval) => interval % 12 === chordInterval % 12
        )
    );

    return {
      chord,
      matchedRequired,
      totalMatched,
      extraIntervals,
      requiredCount: requiredIntervals.length,
      score: matchedRequired / requiredIntervals.length + totalMatched * 0.1,
    };
  }).filter(
    (match) => match.matchedRequired >= Math.min(3, match.requiredCount)
  ); // 至少匹配3个音或所有必需音

  if (partialMatches.length > 0) {
    // 选择得分最高的匹配
    const bestMatch = partialMatches.sort((a, b) => b.score - a.score)[0];

    let chordName = rootNote.name + bestMatch.chord.name;

    // 为额外的音程添加标记
    if (bestMatch.extraIntervals.length > 0) {
      const addedNotes = bestMatch.extraIntervals
        .map((interval) => {
          const degreeMap: Record<number, string> = {
            1: "♭2",
            2: "2",
            3: "♭3",
            4: "3",
            5: "4",
            6: "♭5",
            7: "5",
            8: "♯5",
            9: "6",
            10: "♭7",
            11: "7",
            0: "R",
          };
          return degreeMap[interval % 12] || `${interval}`;
        })
        .filter((note) => note !== "R"); // 过滤掉根音

      if (addedNotes.length > 0) {
        // 特殊处理常见的add音程
        const addedNotesStr = addedNotes.join("");
        if (addedNotesStr === "6") {
          chordName += "add6";
        } else if (addedNotesStr === "2") {
          chordName += "add9";
        } else if (addedNotesStr === "4") {
          chordName += "add11";
        } else {
          chordName += "add" + addedNotesStr;
        }
      }
    }

    return chordName;
  }

  return `${rootNote.name}(${notes.map((n) => n.name).join("-")})`;
};

// 获取当前和弦名称
const getCurrentChordName = (
  currentInstrumentData: InstrumentData,
  currentInstrument: string
): string => {
  let notes: readonly Note[] = [];
  let userSelectedRoot: Note | null = null;

  if (
    currentInstrument === "guitar" &&
    (currentInstrumentData as any).guitarData
  ) {
    // 吉他模式
    notes = (currentInstrumentData as any).guitarData.map((guitarNote: any) =>
      getNoteByStringAndFret(guitarNote.string, guitarNote.fret)
    );
    // 吉他的根音选择逻辑
    if ((currentInstrumentData as any).userSelectedRoot !== null) {
      const rootGuitarNote = (currentInstrumentData as any).guitarData.find(
        (n: any) => n.string === (currentInstrumentData as any).userSelectedRoot
      );
      if (rootGuitarNote) {
        userSelectedRoot = getNoteByStringAndFret(
          rootGuitarNote.string,
          rootGuitarNote.fret
        );
      }
    }
  } else if (currentInstrument === "piano" && currentInstrumentData.notes) {
    // 钢琴模式
    notes = currentInstrumentData.notes;
    userSelectedRoot = currentInstrumentData.pianoUserSelectedRoot || null;
  }

  return identifyChord(notes, userSelectedRoot);
};

// SortableFavoriteItem 组件已移动到 ChordCollection 组件中

export function ChordEditor() {
  const { t } = useTranslation("common");

  // 本地状态
  const [newCollectionName, setNewCollectionName] = useState("");
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(
    null
  );
  const [editingCollectionName, setEditingCollectionName] = useState("");
  const [selectedChordType, setSelectedChordType] = useState<string>("maj7");

  // 使用 valtio 状态
  const {
    currentInstrumentData,
    arpeggioInterval,
    favorites,
    showFavorites,
    selectedFavoriteIndex,
    isEditMode,
    collections,
    currentCollectionId,
    showCollectionModal,
    currentRootNote,
    currentInstrument,
  } = useSnapshot(chordStore) as typeof chordStore;

  // 获取当前合集的 playConfig
  const currentCollection = currentCollectionId
    ? collections.find((c) => c.id === currentCollectionId)
    : null;

  const defaultPlayConfig: AutoAccompanimentConfig = {
    beats: 4,
    bpm: 110,
    rhythmPattern: [
      { type: "full", time: 0 },
      { type: "full", time: 0.25 },
      { type: "full", time: 0.5 },
      { type: "full", time: 0.75 },
    ],
  };

  const playConfig = currentCollection?.playConfig || defaultPlayConfig;

  // 更新合集的 playConfig
  const updatePlayConfig = (newConfig: AutoAccompanimentConfig) => {
    if (currentCollectionId) {
      chordActions.updateCollectionPlayConfig(currentCollectionId, newConfig);
    }
  };

  // 拖拽功能已移动到 ChordCollection 组件中

  const handleDragEnd = (active: string, over: string) => {
    if (over && active !== over) {
      chordActions.reorderFavorites(active as string, over as string);
    }
  };

  // 统一的数据变化处理函数
  const handleInstrumentDataChange = (data: Partial<InstrumentData>) => {
    chordActions.updateInstrumentData({
      ...data,
      name: getCurrentChordName(
        { ...currentInstrumentData, ...data },
        currentInstrument
      ),
    });
  };

  // 通用按钮处理函数
  const handleClearNotes = () => {
    chordActions.clearNotes();
  };

  const handlePlayChord = () => {
    playInstrumentData(
      currentInstrumentData,
      arpeggioInterval,
      currentInstrument
    );
  };

  // 辅助函数：获取音名对应的数字（用于排序）

  const handleScreenshot = () => {
    const selector = ".chord-panel";

    const panel = document.querySelector(selector) as HTMLDivElement;
    const pianoOverflow = document.querySelector(
      ".piano-overflow"
    ) as HTMLDivElement;

    const filename =
      currentInstrument === "guitar" ? "guitar-chord.png" : "piano-chord.png";

    if (panel) {
      // 临时隐藏do-not-screenshot元素
      const elementsToHide = panel.querySelectorAll(".do-not-screenshot");
      const originalStyles: string[] = [];

      elementsToHide.forEach((element, index) => {
        const htmlElement = element as HTMLElement;
        originalStyles[index] = htmlElement.style.display;
        htmlElement.style.display = "none";
      });
      panel.style.paddingBottom = "16px";
      const scrollX = pianoOverflow?.scrollLeft;

      if (pianoOverflow) {
        pianoOverflow.style.maxWidth = "";
        pianoOverflow.style.overflowX = "";
      }

      domToBlob(panel as HTMLElement, {
        scale: 2,
      })
        .then((blob) => {
          // 恢复元素显示
          elementsToHide.forEach((element, index) => {
            const htmlElement = element as HTMLElement;
            htmlElement.style.display = originalStyles[index];
          });
          panel.style.paddingBottom = "";
          if (pianoOverflow) {
            pianoOverflow.style.maxWidth = "100vw";
            pianoOverflow.style.overflowX = "scroll";
            pianoOverflow.scrollLeft = scrollX || 0;
          }

          if (blob) {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            const img = new Image();

            img.onload = () => {
              canvas.width = img.width;
              canvas.height = img.height;
              ctx?.drawImage(img, 0, 0);

              const isCapacitor =
                typeof window !== "undefined" && (window as any).Capacitor;
              const platform = isCapacitor
                ? (window as any).Capacitor.getPlatform?.()
                : undefined;

              if (isCapacitor && platform === "android") {
                const reader = new FileReader();
                reader.onloadend = async () => {
                  const base64 = String(reader.result).split(",")[1] || "";
                  const ts = Date.now();
                  const path = `Pictures/LuvClub/chord-${ts}.png`;
                  try {
                    await Filesystem.writeFile({
                      path,
                      data: base64,
                      directory: FilesystemDirectory.ExternalStorage,
                      recursive: true,
                    });
                    message.success(t("和弦图已保存到相册"));
                  } catch (e) {
                    message.error(t("保存图片失败"));
                  }
                };
                reader.readAsDataURL(blob);
              } else if (
                navigator.clipboard &&
                navigator.clipboard.write &&
                !isMobile()
              ) {
                const item = new ClipboardItem({ "image/png": blob });
                navigator.clipboard
                  .write([item])
                  .then(() => {
                    message.success(t("和弦图已复制到剪贴板"));
                  })
                  .catch(() => {
                    canvas.toBlob((canvasBlob) => {
                      if (canvasBlob) {
                        const url = URL.createObjectURL(canvasBlob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = filename;
                        a.click();
                        message.success(t("和弦图已保存为图片"));
                      } else {
                        message.error(t("保存图片失败"));
                      }
                    });
                  });
              } else {
                canvas.toBlob((canvasBlob) => {
                  if (canvasBlob) {
                    const url = URL.createObjectURL(canvasBlob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = filename;
                    a.click();
                    message.success(t("和弦图已保存为图片"));
                  } else {
                    message.error(t("保存图片失败"));
                  }
                });
              }
            };

            img.src = URL.createObjectURL(blob);
          }
        })
        .catch((error) => {
          // 截图失败时也要恢复元素显示
          elementsToHide.forEach((element, index) => {
            const htmlElement = element as HTMLElement;
            htmlElement.style.display = originalStyles[index];
          });
          console.error("Screenshot failed:", error);
          message.error(t("截图失败"));
        });
    }
  };

  // 将当前和弦音符转换为ABC记谱法格式，支持高低音谱号
  const convertChordToAbcLocal = (): string => {
    const sortedNotes = getSortedNotes(
      currentInstrumentData,
      currentInstrument
    );

    return convertChordToAbc(sortedNotes, currentInstrument);
  };

  const handleAddToFavorites = () => {
    const hasData =
      currentInstrument === "guitar"
        ? (currentInstrumentData as any).guitarData &&
          (currentInstrumentData as any).guitarData.length >= 0
        : currentInstrumentData.notes &&
          currentInstrumentData.notes.length >= 0;

    if (!hasData) {
      const instrumentName =
        currentInstrument === "guitar" ? t("品位") : t("音符");
      message.warning(
        t("请先在编辑器中选择一些{{instrumentName}}", { instrumentName })
      );
      return;
    }

    // 根据乐器类型自动识别和弦名称
    let chordName = t("未知和弦");
    if (
      currentInstrument === "guitar" &&
      (currentInstrumentData as any).guitarData
    ) {
      const notes = (currentInstrumentData as any).guitarData.map(
        (guitarNote) =>
          getNoteByStringAndFret(guitarNote.string, guitarNote.fret)
      );
      // 收藏功能中也考虑用户选择的根音
      const rootNote =
        (currentInstrumentData as any).userSelectedRoot !== null &&
        (currentInstrumentData as any).userSelectedRoot !== undefined
          ? getNoteByStringAndFret(
              (currentInstrumentData as any).userSelectedRoot,
              (currentInstrumentData as any).guitarData.find(
                (n) =>
                  n.string === (currentInstrumentData as any).userSelectedRoot
              )?.fret || 0
            )
          : null;
      chordName = identifyChord(notes, rootNote) || t("未知和弦");
    } else if (currentInstrument === "piano" && currentInstrumentData.notes) {
      chordName =
        identifyChord(
          currentInstrumentData.notes,
          currentInstrumentData.pianoUserSelectedRoot as Note | null
        ) || t("未知和弦");
    }

    chordActions.addToFavorites({ chordName });
    message.success(t("和弦已添加到收藏"));
  };

  // 收藏相关函数已移动到 ChordCollection 组件中

  const { isInit } = useSnapshot(appStore);

  // 初始化 chordStore
  useEffect(() => {
    if (!isInit) return;
    chordActions.init();
  }, [isInit]);

  return (
    <div className="flex flex-col justify-center items-center pt-4">
      {/* 收藏区域 */}
      <div
        className="px-4 py-2 pb-8 md:pb-2 w-full fixed bottom-0 z-20 bg-white max-w-6xl rounded-lg"
        style={{
          boxShadow: "0 0 4px rgba(0, 0, 0, 0.1)",
        }}
        onClick={(e) => {
          // 检查点击的是否是容器本身（空白区域）
          if (!(e.target instanceof HTMLElement)) return;

          // 检查点击元素的父祖先是否包含 editor 或 favorite-chord 类
          let element = e.target as HTMLElement;
          let hasTargetClass = false;

          while (element && element !== e.currentTarget) {
            if (
              element.classList &&
              (element.classList.contains("favorite-chord") ||
                element.classList.contains("edit-switcher"))
            ) {
              hasTargetClass = true;
              break;
            }
            element = element.parentElement as HTMLElement;
          }

          // 如果没有找到目标类名且点击的是容器本身（空白区域），则取消选中态
          if (!hasTargetClass) {
            if (selectedFavoriteIndex !== null) {
              chordStore.selectedFavoriteIndex = null;
            }
          }

          e.stopPropagation();
        }}
      >
        <div className="inline-flex items-center cursor-pointer gap-1 md:gap-2">
          <Button
            onClick={() => chordActions.toggleShowFavorites()}
            type="text"
            icon={
              showFavorites ? (
                <CaretRightOutlined style={{ transform: "rotate(90deg)" }} />
              ) : (
                <CaretRightOutlined />
              )
            }
            className="p-0"
          >
            <span className="text-base">{t("收藏")}</span>
          </Button>

          <Switch
            className="edit-switcher"
            checked={isEditMode}
            onChange={() => chordActions.toggleEditMode()}
            unCheckedChildren={t("编辑")}
          />

          {false && (
            <Button
              icon={<ClearOutlined />}
              onClick={() => {
                Modal.confirm({
                  title: t("cleanUnusedFavoritesConfirmTitle"),
                  content: t("cleanUnusedFavoritesConfirmContent"),
                  onOk: () => {
                    const result = chordActions.cleanupUnusedFavorites();
                    if (result.count > 0) {
                      message.success(
                        t("cleanedUnusedFavorites", { count: result.count })
                      );
                    } else {
                      message.info(t("noUnusedFavoritesFound"));
                    }
                  },
                });
              }}
              className="w-8 md:w-auto"
            ></Button>
          )}

          <Select
            virtual={false}
            showSearch={isMobile() ? false : true}
            className="max-w-32 md:max-w-none"
            value={currentCollectionId}
            onChange={(value) => chordActions.setCurrentCollection(value)}
            placeholder={t("选择合集")}
            popupMatchSelectWidth={false}
            filterOption={(input, option) =>
              (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
            }
            options={[
              ...collections.map((collection) => ({
                value: collection.id,
                label: collection.name,
              })),
            ]}
            dropdownRender={(menu) => (
              <>
                {menu}
                <div className="border-t border-gray-200 p-2">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() => {
                      chordActions.toggleCollectionModal();
                    }}
                    className="w-full text-left"
                  >
                    {t("编辑合集")}
                  </Button>
                </div>
              </>
            )}
          />

          <Select
            virtual={false}
            value={currentRootNote}
            onChange={(value) => chordActions.setCurrentRootNote(value)}
            placeholder={t("根音")}
            allowClear
            popupMatchSelectWidth={false}
            options={[
              ...NOTES.map((note) => ({
                value: note,
                label: note,
              })).concat([
                {
                  label: t("无"),
                  value: "",
                },
              ]),
            ]}
          />
          {/* 导出MIDI按钮 */}
          {!isMobile() && currentCollectionId && (
            <Button
              icon={<DownloadOutlined />}
              className="w-8 md:w-auto"
              onClick={() => {
                if (!currentCollectionId) {
                  message.warning(t("请先选择一个合集"));
                  return;
                }

                const collection = chordStore.collections.find(
                  (c) => c.id === currentCollectionId
                );
                if (!collection) {
                  message.warning(t("未找到合集"));
                  return;
                }

                // 导入midiExporter
                import("@/utils/midiExporter").then(
                  ({ exportCollectionToMidi }) => {
                    // 导出MIDI
                    const midiBlob = exportCollectionToMidi(
                      collection,
                      favorites
                    );

                    // 创建下载链接
                    const url = URL.createObjectURL(midiBlob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `${collection.name}.mid`;
                    document.body.appendChild(a);
                    a.click();

                    // 清理
                    setTimeout(() => {
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }, 0);

                    message.success(t("MIDI文件导出成功"));
                  }
                );
              }}
            >
              <span className="md:block hidden">{t("MIDI")}</span>
            </Button>
          )}
        </div>

        {showFavorites && (
          <div className="mt-2">
            <ChordCollection
              root={currentRootNote}
              isEdit={isEditMode}
              instrument={currentInstrument}
              blocks={
                currentCollectionId
                  ? currentCollection?.ids
                      .map((id) => favorites.find((f) => f.id === id))
                      .filter((i) => !!i) || []
                  : favorites
              }
              lengths={
                currentCollectionId ? currentCollection?.lengths : undefined
              }
              selectedId={
                selectedFavoriteIndex !== null &&
                favorites[selectedFavoriteIndex]
                  ? favorites[selectedFavoriteIndex].id
                  : null
              }
              showAutoAccompaniment={true}
              playConfig={playConfig}
              onConfigChange={updatePlayConfig}
              onSelect={(id, isTriggeredByClick = true) => {
                const favorite = favorites.find((f) => f.id === id);
                const index = favorites.findIndex((f) => f.id === id);
                if (favorite && index !== -1) {
                  chordActions.selectFavorite(index);
                  // 播放收藏的和弦
                  if (isTriggeredByClick) {
                    playInstrumentData(
                      favorite,
                      arpeggioInterval,
                      currentInstrument
                    );
                  }
                }
              }}
              onSort={handleDragEnd}
              onDelete={(id) => {
                const index = favorites.findIndex((f) => f.id === id);
                if (index !== -1) {
                  chordActions.removeFavorite(index);
                }
              }}
              onRename={(id, newName) => {
                const index = favorites.findIndex((f) => f.id === id);
                if (index !== -1) {
                  chordActions.updateFavoriteName(index, newName);
                }
              }}
              onCollect={(id) => {
                chordActions.toggleCollectionModal();
              }}
              onLengthChange={(index, length) => {
                if (currentCollectionId) {
                  chordActions.updateChordLength(
                    currentCollectionId,
                    index,
                    length
                  );
                }
              }}
            />
          </div>
        )}
      </div>

      {/* 共享的配置区域 */}
      <div className="px-4 gap-4 header flex justify-between mb-4">
        {/* 第一行：乐器选择、琶音间隔和位置控制 */}
        <Select
          className="flex items-center gap-2"
          value={currentInstrument}
          onChange={(v) => {
            chordActions.setCurrentCollectionInstrument(v);
          }}
          style={{
            width: 82,
          }}
          options={[
            { value: "guitar", label: t("吉他") },
            { value: "piano", label: t("钢琴") },
          ]}
        ></Select>

        {/* <div className="flex items-center gap-1">
            <span className="text-sm font-medium">{t("速度")}</span>
            <Select
              virtual={false}
              popupMatchSelectWidth={false}
              value={arpeggioInterval.toString()}
              onChange={(value) =>
                chordActions.setArpeggioInterval(Number(value))
              }
              options={[
                { value: "0", label: t("齐奏") },
                { value: "0.1", label: t("快") },
                { value: "0.2", label: t("中等") },
                { value: "0.3", label: t("慢") },
              ]}
            />
          </div> */}

        {/* 清除 & 收藏 */}
        <div className="flex items-center justify-center gap-4">
          <Button icon={<ClearOutlined />} onClick={handleClearNotes}>
            {t("清除")}
          </Button>
          <Button
            type="primary"
            icon={<HeartOutlined />}
            onClick={handleAddToFavorites}
          >
            {t("收藏")}
          </Button>
        </div>
      </div>

      <div className="chord-panel bg-white">
        {/* 根据当前合集的乐器类型渲染对应的编辑器 */}
        {currentInstrument === "guitar" ? (
          <GuitarEditor
            instrumentData={currentInstrumentData}
            onDataChange={handleInstrumentDataChange}
            fretRange={currentInstrumentData.range}
            onDownFret={() => {
              chordActions.updateInstrumentData({
                range: {
                  start: (currentInstrumentData?.range?.start ?? 0) + 1,
                  end: (currentInstrumentData?.range?.end ?? 5) + 1,
                },
              });
            }}
            onUpFret={() => {
              chordActions.updateInstrumentData({
                range: {
                  start: (currentInstrumentData?.range?.start ?? 0) - 1,
                  end: (currentInstrumentData?.range?.end ?? 5) - 1,
                },
              });
            }}
          />
        ) : (
          <>
            <div className="h-4"></div>
            <PianoEditor
              instrumentData={currentInstrumentData}
              onDataChange={handleInstrumentDataChange}
            />
          </>
        )}

        {/* ABC记谱法渲染区域 */}
        <div className="flex items-center gap-4 w-full justify-center">
          {/* 和弦名称显示 */}
          <div className="font-mono text-2xl font-bold">
            {currentInstrumentData.name ??
              getCurrentChordName(currentInstrumentData, currentInstrument) ??
              "--"}
          </div>

          {/* 五线谱 */}
          <div className="w-28">
            <AbcStaffNotation
              root="C4"
              concise={true}
              str={convertChordToAbcLocal()}
            />
          </div>
        </div>

        {/* 和弦生成器 */}
        <div className="flex items-center justify-center gap-2 mt-3 do-not-screenshot">
          <Select
            virtual={false}
            style={{ width: 120 }}
            placeholder={t("和弦类型")}
            options={CHORDS.map((chord) => ({
              value: chord.name,
              label: chord.name,
            }))}
            value={selectedChordType || undefined}
            onChange={(value) => setSelectedChordType(value)}
          />
          <Button
            type="primary"
            onClick={() => {
              if (!selectedChordType) {
                message.warning(t("请选择和弦类型"));
                return;
              }

              const chordType = selectedChordType;

              // 查找选择的和弦类型
              const selectedChord = CHORDS.find(
                (chord) => chord.name === chordType
              );

              if (!selectedChord) {
                message.error(t("未找到和弦类型"));
                return;
              }
              const rootNote = getSortedNotes(
                currentInstrumentData,
                currentInstrument
              )[0];

              if (!rootNote) {
                message.warning(t("请先选择根音"));
                return;
              }

              // 计算根音的绝对音程
              const rootAbsoluteInterval = getAbsoluteInterval(rootNote);
              // 根据音程计算其他音符
              const notes: Note[] = selectedChord.intervals.map((interval) => {
                // 计算绝对音程
                const absoluteInterval = rootAbsoluteInterval + interval;
                // 转换为音符
                return absoluteIntervalToNote(absoluteInterval);
              });

              // 根据乐器类型更新数据
              // 将音符转换为吉他数据
              const guitarData = convertNotesToGuitarData(
                notes,
                undefined,
                undefined,
                0
              );

              // 计算最低品位
              const lowestFret = Math.max(
                0,
                Math.min(...guitarData.map((note) => note.fret)) - 2
              );

              handleInstrumentDataChange({
                guitarData,
                notes,
                name: rootNote + selectedChord.name,
                range: {
                  start: lowestFret,
                  end: lowestFret + 5,
                },
              });

              // 播放生成的和弦
              // 使用更新后的数据直接播放，而不是通过setTimeout
              const updatedData = {
                ...currentInstrumentData,
                ...(currentInstrument === "guitar"
                  ? { guitarData }
                  : { notes }),
              };
              playInstrumentData(
                updatedData,
                arpeggioInterval,
                currentInstrument
              );
            }}
          >
            {t("生成")}
          </Button>
        </div>
      </div>

      {/* 公共控制按钮区域 */}
      <div className="flex justify-center gap-4 items-center mt-6">
        <Button
          type="primary"
          icon={<CaretRightOutlined />}
          onClick={handlePlayChord}
        >
          {t("播放")}
        </Button>
        <Button
          type="primary"
          icon={<CameraOutlined />}
          onClick={handleScreenshot}
        >
          {t("截图")}
        </Button>
      </div>

      {/* 合集选择弹框 */}
      <Modal
        title={
          selectedFavoriteIndex !== null
            ? t("将「{{name}}」添加到合集", {
                name: favorites[selectedFavoriteIndex]?.name,
              })
            : t("管理和弦合集")
        }
        open={showCollectionModal}
        onCancel={() => chordActions.toggleCollectionModal()}
        footer={null}
        width={500}
      >
        <div className="space-y-4">
          {/* 创建新合集 */}
          <div className="border rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">{t("创建新合集")}</h4>
            <div className="flex gap-2">
              <Input
                placeholder={t("输入合集名称")}
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onPressEnter={() => {
                  if (newCollectionName.trim()) {
                    const id = chordActions.createCollection(
                      newCollectionName.trim()
                    );
                    chordActions.setCurrentCollection(id);
                    chordActions.toggleCollectionModal();
                    setNewCollectionName("");
                    message.success(t("合集创建成功"));
                  }
                }}
              />
              <Button
                type="primary"
                onClick={() => {
                  if (newCollectionName.trim()) {
                    const id = chordActions.createCollection(
                      newCollectionName.trim()
                    );
                    chordActions.setCurrentCollection(id);
                    chordActions.toggleCollectionModal();
                    setNewCollectionName("");
                    message.success(t("合集创建成功"));
                  }
                }}
                disabled={!newCollectionName.trim()}
              >
                {t("创建")}
              </Button>
            </div>
          </div>

          {/* 现有合集列表 */}
          {collections.length > 0 && (
            <div className="border rounded-lg p-4">
              <h4 className="text-sm font-medium mb-2">
                {selectedFavoriteIndex !== null
                  ? t("添加到现有合集")
                  : t("现有合集")}
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {collections.map((collection) => {
                  const selectedFavorite =
                    selectedFavoriteIndex !== null
                      ? favorites[selectedFavoriteIndex]
                      : null;
                  const isCurrentChordInCollection =
                    selectedFavorite &&
                    collection.ids.includes(selectedFavorite.id);

                  return (
                    <div
                      key={collection.id}
                      className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        if (selectedFavoriteIndex !== null) {
                          const selectedFavorite =
                            favorites[selectedFavoriteIndex];
                          if (collection.ids.includes(selectedFavorite.id)) {
                            chordActions.removeFromCollection(
                              selectedFavorite.id,
                              collection.id
                            );
                            message.success(
                              t("已从「{{name}}」中移除", {
                                name: collection.name,
                              })
                            );
                          } else {
                            chordActions.addToCollection(
                              selectedFavorite.id,
                              collection.id
                            );
                            message.success(
                              t("已添加到「{{name}}」", {
                                name: collection.name,
                              })
                            );
                          }
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <FolderOutlined />
                        {editingCollectionId === collection.id ? (
                          <Input
                            value={editingCollectionName}
                            onChange={(e) =>
                              setEditingCollectionName(e.target.value)
                            }
                            onPressEnter={() => {
                              const newName = editingCollectionName.trim();
                              if (newName && newName !== collection.name) {
                                chordActions.updateCollectionName(
                                  collection.id,
                                  newName
                                );
                                message.success(t("合集名称已更新"));
                              }
                              setEditingCollectionId(null);
                              setEditingCollectionName("");
                            }}
                            onBlur={() => {
                              const newName = editingCollectionName.trim();
                              if (newName && newName !== collection.name) {
                                chordActions.updateCollectionName(
                                  collection.id,
                                  newName
                                );
                                message.success(t("合集名称已更新"));
                              }
                              setEditingCollectionId(null);
                              setEditingCollectionName("");
                            }}
                            autoFocus
                            size="small"
                            className="flex-1"
                          />
                        ) : (
                          <span>{collection.name}</span>
                        )}
                        <span className="text-gray-400 text-xs">
                          ({collection.ids.length})
                        </span>
                        {selectedFavoriteIndex !== null &&
                          collection.ids.includes(
                            favorites[selectedFavoriteIndex].id
                          ) && <CheckOutlined className="text-green-500" />}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="small"
                          type="text"
                          icon={<EditOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCollectionId(collection.id);
                            setEditingCollectionName(collection.name);
                          }}
                        />
                        <Button
                          size="small"
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (chordStore.collections.length === 1) {
                              message.error(t("至少保留一个合集"));
                              return;
                            }
                            if (
                              confirm(
                                t("确定要删除合集「{{name}}」吗？", {
                                  name: collection.name,
                                })
                              )
                            ) {
                              chordActions.deleteCollection(collection.id);
                              message.success(t("合集已删除"));
                            }
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {collections.length === 0 && (
            <div className="text-center text-gray-400 py-4">
              {t("还没有创建任何合集")}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
export { getNoteByStringAndFret };
