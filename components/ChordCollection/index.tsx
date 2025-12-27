import {
  AutoAccompanimentConfig,
  InstrumentData,
  Note,
  RhythmEvent,
} from "@/typings/chordEditor";
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  HolderOutlined,
  EditOutlined,
  FolderOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  SettingOutlined,
} from "@ant-design/icons";
import {
  DndContext,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "next-i18next";
import { Button, Modal, InputNumber, Select, Space } from "antd";
import { playChord, getNoteByStringAndFret, getNoteNumber } from "@/utils/calc";
import { MoaTone } from "@/utils/MoaTone";
import { proxy } from "valtio";
import { useProxy } from "valtio/utils";
import { isMobile } from "@/utils/env";

// 预设节奏型 - 使用键名以便国际化
const RHYTHM_PRESETS: Record<
  number,
  { nameKey: string; pattern: RhythmEvent[] }[]
> = {
  3: [
    {
      nameKey: "全拍",
      pattern: [
        { type: "full", time: 0 },
        { type: "full", time: 0.33 },
        { type: "full", time: 0.66 },
      ],
    },
    {
      nameKey: "单次演奏",
      pattern: [
        { type: "full", time: 0 },
        { type: "empty", time: 0.33 },
        { type: "empty", time: 0.66 },
      ],
    },
    {
      nameKey: "高低交替",
      pattern: [
        { type: "low", time: 0 },
        { type: "high", time: 0.33 },
        { type: "high", time: 0.66 },
      ],
    },
    {
      nameKey: "根音强调",
      pattern: [
        { type: "root", time: 0 },
        { type: "high", time: 0.33 },
        { type: "high", time: 0.66 },
      ],
    },
  ],
  4: [
    {
      nameKey: "全拍",
      pattern: [
        { type: "full", time: 0 },
        { type: "full", time: 0.25 },
        { type: "full", time: 0.5 },
        { type: "full", time: 0.75 },
      ],
    },
    {
      nameKey: "单次演奏",
      pattern: [
        { type: "full", time: 0 },
        { type: "empty", time: 0.25 },
        { type: "empty", time: 0.5 },
        { type: "empty", time: 0.75 },
      ],
    },
    {
      nameKey: "间隔演奏",
      pattern: [
        { type: "full", time: 0 },
        { type: "empty", time: 0.25 },
        { type: "full", time: 0.5 },
        { type: "empty", time: 0.75 },
      ],
    },
    {
      nameKey: "高低交替",
      pattern: [
        { type: "low", time: 0 },
        { type: "high", time: 0.25 },
        { type: "low", time: 0.5 },
        { type: "high", time: 0.75 },
      ],
    },
    {
      nameKey: "根音强调",
      pattern: [
        { type: "root", time: 0 },
        { type: "high", time: 0.25 },
        { type: "high", time: 0.5 },
        { type: "high", time: 0.75 },
      ],
    },
    {
      nameKey: "Bossa Nova",
      pattern: [
        { type: "root", time: 0 }, // 第1拍：根音
        { type: "high", time: 0.25 }, // 第1拍后半拍：高音和弦
        { type: "root", time: 0.25 + 0.125 }, // 第2拍：根音
        { type: "root", time: 0.5 }, // 第2拍后半拍：高音和弦
        { type: "high", time: 0.5 + 0.125 }, // 第2拍后半拍：高音和弦
        { type: "root", time: 0.75 + 0.125 }, // 第2拍后半拍：高音和弦
      ],
    },
  ],
  5: [
    {
      nameKey: "全拍",
      pattern: [
        { type: "full", time: 0 },
        { type: "full", time: 0.2 },
        { type: "full", time: 0.4 },
        { type: "full", time: 0.6 },
        { type: "full", time: 0.8 },
      ],
    },
    {
      nameKey: "单次演奏",
      pattern: [
        { type: "full", time: 0 },
        { type: "empty", time: 0.2 },
        { type: "empty", time: 0.4 },
        { type: "empty", time: 0.6 },
        { type: "empty", time: 0.8 },
      ],
    },
    {
      nameKey: "高低交替",
      pattern: [
        { type: "low", time: 0 },
        { type: "high", time: 0.2 },
        { type: "high", time: 0.4 },
        { type: "low", time: 0.6 },
        { type: "high", time: 0.8 },
      ],
    },
    {
      nameKey: "根音强调",
      pattern: [
        { type: "root", time: 0 },
        { type: "high", time: 0.2 },
        { type: "high", time: 0.4 },
        { type: "high", time: 0.6 },
        { type: "high", time: 0.8 },
      ],
    },
  ],
};

// 长度拖拽 Handler 组件
function LengthDragHandle({
  length,
  index,
  onLengthChange,
}: {
  length: number;
  index: number;
  onLengthChange: (index: number, length: number) => void;
}) {
  const { t } = useTranslation("chord");
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startLength, setStartLength] = useState(length);
  const dragRef = useRef<HTMLDivElement>(null);

  // 只支持这三个固定值
  const ALLOWED_LENGTHS = [0.5, 1, 2];

  // 处理拖动逻辑的通用函数
  const handleDragMove = (clientX: number) => {
    if (!isDragging) return;

    const deltaX = clientX - startX;
    const sensitivity = isMobile() ? 60 : 120; // 每60px切换到下一个值

    if (Math.abs(deltaX) > sensitivity) {
      const currentIndex = ALLOWED_LENGTHS.indexOf(startLength);
      let newIndex;

      if (deltaX > 0) {
        // 向右拖拽，增加长度
        newIndex = Math.min(currentIndex + 1, ALLOWED_LENGTHS.length - 1);
      } else {
        // 向左拖拽，减少长度
        newIndex = Math.max(currentIndex - 1, 0);
      }

      const newLength = ALLOWED_LENGTHS[newIndex];
      if (newLength !== length) {
        onLengthChange(index, newLength);
        setStartX(clientX); // 重置起始位置
        setStartLength(newLength);
      }
    }
  };

  // 鼠标事件处理
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setStartX(e.clientX);
    setStartLength(length);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleDragMove(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 触摸事件处理
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
    setStartLength(length);
  };

  const handleTouchMove = (e: TouchEvent) => {
    handleDragMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      // 添加鼠标事件监听
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      // 添加触摸事件监听
      document.addEventListener("touchmove", handleTouchMove);
      document.addEventListener("touchend", handleTouchEnd);
      document.addEventListener("touchcancel", handleTouchEnd);

      return () => {
        // 移除鼠标事件监听
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        // 移除触摸事件监听
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
        document.removeEventListener("touchcancel", handleTouchEnd);
      };
    }
  }, [isDragging, startX, startLength, length]);

  return (
    <div
      ref={dragRef}
      className={`w-4 h-4 cursor-ew-resize flex items-center justify-center text-gray-400 hover:text-gray-600 ${
        isDragging ? "text-blue-500" : ""
      }`}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      title={t("chordEditor.dragToAdjustLength")}
      style={{
        transform: "translateY(-2px)",
        touchAction: "none", // 防止触摸事件被浏览器处理为滚动
      }}
    >
      ⟷
    </div>
  );
}

type CollectionProps = {
  root: string | null;
  isEdit: boolean;
  instrument: string;
  blocks: InstrumentData[]; // 和弦块的具体数据，已经按照需要的顺序排列
  lengths?: number[]; // 和弦块长度数组
  onSelect: (id: string, isTriggeredByClick?: boolean) => void; // 当切换和弦块时的回调
  onSort: (active: string, over: string) => void; // 拖动排序回调
  onDelete: (id: string) => void; // 点击某个和弦块的删除icon
  onRename: (id: string, newName: string) => void; // 点击某个和弦块的编辑icon并重命名
  onCollect: (id: string) => void; // 点击某个和弦块的合集icon
  onLengthChange?: (index: number, length: number) => void; // 长度变化回调
  selectedId?: string | null; // 外部传入的选中ID
  showAutoAccompaniment?: boolean; // 是否显示自动伴奏控制器，默认为 false
  playConfig?: AutoAccompanimentConfig; // 外部传入的播放配置
  onConfigChange?: (config: AutoAccompanimentConfig) => void; // 配置变化回调
};

// 将和弦名称转换为级数显示
const convertChordToRomanNumeral = (
  chordName: string,
  rootNote: string
): string => {
  if (!chordName || !rootNote) return chordName;

  // 提取和弦根音（第一个或两个字母）
  const chordRootMatch = chordName.match(/^([A-G][#b]?)/);
  if (!chordRootMatch) return chordName;

  const chordRoot = chordRootMatch[1];
  const chordSuffix = chordName.slice(chordRoot.length);

  // 使用新的函数获取音符的半音数
  const rootIndex = getNoteNumber(rootNote);
  const chordRootIndex = getNoteNumber(chordRoot);

  if (rootIndex === -1 || chordRootIndex === -1) return chordName;

  // 计算级数（从根音开始的半音数）
  let interval = (chordRootIndex - rootIndex + 12) % 12;

  // 映射到十二个半音级数，包括变化音
  const chromaticRomanNumerals = [
    "I", // 0 - 根音
    "#I", // 1 - 升一级
    "II", // 2 - 二级
    "#II", // 3 - 升二级
    "III", // 4 - 三级
    "IV", // 5 - 四级
    "#IV", // 6 - 升四级
    "V", // 7 - 五级
    "#V", // 8 - 升五级
    "VI", // 9 - 六级
    "#VI", // 10 - 升六级
    "VII", // 11 - 七级
  ];

  const romanNumeral = chromaticRomanNumerals[interval];
  return romanNumeral + chordSuffix;
};

// 可排序的收藏项组件
function CollectionItem({
  block,
  isEdit,
  selectedId,
  editingId,
  onSelect,
  onEdit,
  onRename,
  onDelete,
  onCollect,
  style: styleProps,
  root,
  length,
  index,
  onLengthChange,
  instrument,
}: {
  block: InstrumentData;
  isEdit: boolean;
  selectedId: string | null;
  editingId: string | null;
  onSelect: (id: string) => void;
  onEdit: (id: string) => void;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
  onCollect: (id: string) => void;
  root: string | null;
  length?: number;
  index: number;
  style?: React.CSSProperties;
  onLengthChange?: (index: number, length: number) => void;
  instrument: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id! });

  const chordBlockRef = useRef<HTMLDivElement>(null);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0 });

  // 计算编辑按钮的位置
  useEffect(() => {
    if (isEdit && selectedId === block.id && chordBlockRef.current) {
      const rect = chordBlockRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.top - 35, // 按钮组高度的一半向上偏移
        left: rect.right - 90, // 和弦块右边缘向右偏移
      });
    }
  }, [isEdit, selectedId, block.id]);

  // 根据长度计算宽度，严格对应 0.5、1、2 三个值，使用CSS变量
  const getWidthByLength = (length: number) => {
    switch (length) {
      case 0.5:
        return "var(--chord-width-half, 25%)"; // 0.5 拍
      case 1:
        return "var(--chord-width-full, 50%)"; // 1 拍
      case 2:
        return "var(--chord-width-double, 100%)"; // 2 拍
      default:
        return "var(--chord-width-full, 50%)"; // 默认 1 拍
    }
  };
  const calculatedWidth = getWidthByLength(length || 1);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderRight: "2px solid #212937",
    opacity: isDragging ? 0.5 : 1,
    outlineOffset: -2,
    width: calculatedWidth,
    // minWidth: `${calculatedWidth}px`,
    ...styleProps,
  };

  return (
    <>
      <div
        ref={(node) => {
          setNodeRef(node);
          chordBlockRef.current = node;
        }}
        style={style}
        className={`favorite-chord hover:bg-slate-200 relative px-2 bg-gray-100 py-2 cursor-pointer flex items-center gap-1 ${
          selectedId === block.id && isEdit
            ? "outline-primary outline-2 outline shadow-lg"
            : ""
        }`}
        onClick={() => onSelect(block.id!)}
      >
        {/* 编辑按钮组 - fixed 定位在和弦块右上角 */}
        {isEdit && selectedId === block.id && (
          <div
            className="fixed flex gap-1 bg-white border rounded-lg shadow-lg p-1 z-50"
            style={{
              top: `${buttonPosition.top}px`,
              left: `${buttonPosition.left}px`,
            }}
          >
            <EditOutlined
              className="text-gray-600 hover:text-gray-800 cursor-pointer p-1"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(block.id!);
              }}
            />
            <FolderOutlined
              className="text-gray-600 hover:text-gray-800 cursor-pointer p-1"
              onClick={(e) => {
                e.stopPropagation();
                onCollect(block.id!);
              }}
            />
            <DeleteOutlined
              className="text-gray-600 hover:text-gray-800 cursor-pointer p-1"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(block.id!);
              }}
            />
          </div>
        )}

        {/* 拖拽手柄 - 仅在编辑模式下显示 */}
        {isEdit && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
            style={{ touchAction: "none" }}
          >
            <HolderOutlined />
          </div>
        )}

        {/* 乐器标识 */}
        <div className="flex items-center flex-1 min-w-0">
          <span className="mr-1 flex-shrink-0">
            {instrument === "guitar" ? "🎸" : "🎹"}
          </span>

          {editingId === block.id ? (
            <input
              type="text"
              defaultValue={block.name}
              className="text-sm font-medium bg-transparent border-none outline-none flex-1 min-w-0"
              autoFocus
              onBlur={(e) => onRename(block.id!, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onRename(block.id!, e.currentTarget.value);
                } else if (e.key === "Escape") {
                  onEdit(""); // 取消编辑
                }
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span
              title={block.name}
              className="text-sm font-medium truncate flex-1 min-w-0 text-center"
            >
              {root
                ? convertChordToRomanNumeral(block.name || "", root)
                : block.name}
            </span>
          )}
        </div>

        {/* 长度显示和调节 */}
        {length !== undefined && onLengthChange && isEdit && (
          <LengthDragHandle
            length={length}
            index={index}
            onLengthChange={onLengthChange}
          />
        )}
      </div>
    </>
  );
}

export const ChordCollection: React.FC<CollectionProps> = ({
  root,
  isEdit,
  blocks,
  lengths,
  instrument,
  onSelect,
  onSort,
  onDelete,
  onRename,
  onCollect,
  onLengthChange,
  selectedId: externalSelectedId,
  showAutoAccompaniment = false,
  playConfig,
  onConfigChange,
}) => {
  const { t } = useTranslation("common");
  const [editingId, setEditingId] = useState<string | null>(null);

  // 默认配置
  const defaultConfig: AutoAccompanimentConfig = {
    beats: 4,
    bpm: 110,
    rhythmPattern: [
      { type: "full", time: 0 },
      { type: "full", time: 0.25 },
      { type: "full", time: 0.5 },
      { type: "full", time: 0.75 },
    ],
  };

  // 使用外部传入的配置或默认配置
  const config = playConfig || defaultConfig;

  // 使用 useMemo 确保 proxy 对象只创建一次
  const _state = useMemo(
    () =>
      proxy({
        isPlaying: false,
        showConfigModal: false,
        currentChordIndex: 0,
      }),
    []
  );
  const state = useProxy(_state);

  const scheduleRepeatId = useRef<string | null>(null);
  const beatTimeoutRefs = useRef<string[]>([]);
  const wakeLockRef = useRef<any>(null);

  // 使用外部传入的selectedId，如果没有传入则为null
  const selectedId = isEdit ? externalSelectedId : null;

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 20,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 处理拖拽结束
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    onSort(active.id as string, over.id as string);
  };

  // 直接使用 blocks，不需要过滤
  const filteredBlocks = blocks;

  const handleSelect = (id: string) => {
    onSelect(id);
  };

  const handleEdit = (id: string) => {
    setEditingId(id === editingId ? null : id);
  };

  const handleRename = (id: string, newName: string) => {
    setEditingId(null);
    onRename(id, newName);
  };

  useEffect(() => {
    return () => {
      stopAutoAccompaniment();
    };
  }, []);

  // 清理定时器和Wake Lock
  useEffect(() => {
    return () => {
      // 停止 scheduleRepeat
      if (scheduleRepeatId.current) {
        MoaTone.Transport.clear(scheduleRepeatId.current);
        scheduleRepeatId.current = null;
      }
      beatTimeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
      releaseWakeLock();
    };
  }, []);

  // 监听页面可见性变化，应用进入后台时自动停止播放
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏且正在播放时，停止自动伴奏
        stopAutoAccompaniment();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // 将InstrumentData转换为标准Note数组
  const convertInstrumentDataToNotes = (
    instrumentData: InstrumentData,
    instrument: string
  ): Note[] => {
    let notesToPlay: Note[] = [];
    const currentInstrument = instrument;

    if (currentInstrument === "guitar" && (instrumentData as any).guitarData) {
      const sortedGuitarData = [...(instrumentData as any).guitarData].sort(
        (a, b) => a.string - b.string
      );
      notesToPlay = sortedGuitarData.map((guitarNote) =>
        getNoteByStringAndFret(guitarNote.string, guitarNote.fret)
      );
    } else if (currentInstrument === "piano" && instrumentData.notes) {
      notesToPlay = [...instrumentData.notes].sort(
        (a, b) =>
          a.octave * 12 +
          getNoteNumber(a.name) -
          (b.octave * 12 + getNoteNumber(b.name))
      );
    }
    return notesToPlay;
  };

  // 播放单个和弦的节奏型
  const playChordWithRhythm = ({
    chord,
    rhythmPattern,
    time,
    chordLength = 1,
    instrument,
  }: {
    chord: InstrumentData;
    rhythmPattern: RhythmEvent[];
    time?: number;
    chordLength?: number;
    instrument: string;
  }) => {
    const measureDuration = (60 / config.bpm) * config.beats; // 小节时长（秒）

    beatTimeoutRefs.current.forEach((eventId) =>
      MoaTone.Transport.clear(eventId)
    );
    beatTimeoutRefs.current = [];

    // 转换为标准Note数组
    const allNotes = convertInstrumentDataToNotes(chord, instrument);
    if (allNotes.length === 0) return;

    // 根据和弦长度重复播放节奏模式
    rhythmPattern.forEach((rhythmEvent) => {
      if (rhythmEvent.time >= chordLength) return;
      const scheduleTime = time + rhythmEvent.time * measureDuration;

      const eventId = MoaTone.schedule((time) => {
        switch (rhythmEvent.type) {
          case "full":
            playChord(
              allNotes,
              0,
              instrument,
              MoaTone.Time.toSeconds("8n"),
              time
            );
            break;
          case "low":
            // 播放低音部分（音符的下半部分）
            const lowNotes = allNotes.slice(0, Math.ceil(allNotes.length / 2));
            playChord(
              lowNotes,
              0,
              instrument,
              MoaTone.Time.toSeconds("8n"),
              time
            );
            break;
          case "high":
            // 播放高音部分（音符的上半部分）
            const highNotes = allNotes.slice(Math.ceil(allNotes.length / 2));
            playChord(
              highNotes,
              0,
              instrument,
              MoaTone.Time.toSeconds("8n"),
              time
            );
            break;
          case "root":
            // 只播放根音（第一个音符）
            if (allNotes.length > 0) {
              playChord([allNotes[0]], 0, instrument, undefined, time);
            }
            break;
          case "empty":
            // 不播放
            break;
        }
      }, scheduleTime);
      beatTimeoutRefs.current.push(eventId);
    });
  };

  // 获取音符编号的辅助函数已移动到文件顶部

  // 请求屏幕常亮
  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request("screen");
        console.log("Wake Lock activated");
      }
    } catch (err) {
      console.warn("Wake Lock request failed:", err);
    }
  };

  // 释放屏幕常亮
  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
      console.log("Wake Lock released");
    }
  };

  // 开始自动伴奏
  const startAutoAccompaniment = async () => {
    if (filteredBlocks.length === 0) return;

    // 请求屏幕常亮（在设置状态之前）
    await requestWakeLock();

    state.isPlaying = true;
    state.currentChordIndex = -1;

    const baseDuration = (60000 / config.bpm) * config.beats; // 基础小节时长（毫秒）
    let nextTime = MoaTone.now();

    const scheduleNextChord = () => {
      state.currentChordIndex += 1;
      state.currentChordIndex = state.currentChordIndex % filteredBlocks.length;
      const block = filteredBlocks[state.currentChordIndex];
      const chordLength = lengths?.[state.currentChordIndex] || 1; // 获取当前和弦的长度
      const chordDuration = (baseDuration * chordLength) / 1000; // 转换为秒

      // 播放当前和弦
      playChordWithRhythm({
        chord: block,
        rhythmPattern: config.rhythmPattern,
        time: nextTime,
        chordLength,
        instrument,
      });

      // 触发onSelect回调
      if (block.id) {
        onSelect(block.id, false);
      }

      // 计算下一个和弦的播放时间
      nextTime += chordDuration;

      // 调度下一个和弦
      if (state.isPlaying) {
        const timeoutId = MoaTone.schedule(() => {
          scheduleNextChord();
        }, nextTime);
        beatTimeoutRefs.current.push(timeoutId);
      }
    };

    // 开始播放第一个和弦
    scheduleNextChord();
  };

  // 停止自动伴奏
  const stopAutoAccompaniment = () => {
    state.isPlaying = false;
    state.currentChordIndex = 0;

    // 停止 scheduleRepeat
    if (scheduleRepeatId.current) {
      MoaTone.Transport.clear(scheduleRepeatId.current);
      scheduleRepeatId.current = null;
    }

    beatTimeoutRefs.current.forEach((eventId) =>
      MoaTone.Transport.clear(eventId)
    );
    beatTimeoutRefs.current = [];

    // 释放屏幕常亮
    releaseWakeLock();
  };

  // 暂停/恢复自动伴奏
  const toggleAutoAccompaniment = () => {
    if (state.isPlaying) {
      stopAutoAccompaniment();
    } else {
      startAutoAccompaniment();
    }
  };

  // 更新配置
  const updateConfig = (newConfig: Partial<AutoAccompanimentConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    onConfigChange?.(updatedConfig);
  };

  // 当拍子数改变时，重置节奏型为默认值
  const handleBeatsChange = (beats: number) => {
    const defaultPattern = RHYTHM_PRESETS[beats]?.[0]?.pattern || [
      { type: "full", time: 0 },
    ];
    updateConfig({ beats, rhythmPattern: defaultPattern });
  };

  if (filteredBlocks.length === 0) {
    return (
      <div className="text-center text-gray-500">
        <p>{t("当前合集中还没有和弦")}</p>
      </div>
    );
  }

  return (
    <div>
      <style jsx>{`
        :global(:root) {
          --chord-width-half: 25%;
          --chord-width-full: 50%;
          --chord-width-double: 100%;
        }

        @media (min-width: 1024px) {
          :global(:root) {
            --chord-width-half: 12.5%;
            --chord-width-full: 25%;
            --chord-width-double: 50%;
          }
        }

        @keyframes breathe-outline {
          0%,
          100% {
            box-shadow: 0 0 2px rgba(255, 255, 255, 0);
          }
          50% {
            box-shadow: 0 0 8px rgba(0, 0, 0, 0.4);
          }
        }
        .breathing-outline {
          border-radius: 8px;
        }
      `}</style>
      {/* 自动伴奏控制栏 - 仅在开启自动伴奏且有和弦数据时显示 */}
      {showAutoAccompaniment && filteredBlocks.length > 0 && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="inline-flex items-center gap-2 mr-4">
            <Button
              type={state.isPlaying ? "default" : "primary"}
              icon={
                state.isPlaying ? (
                  <PauseCircleOutlined />
                ) : (
                  <PlayCircleOutlined />
                )
              }
              onClick={toggleAutoAccompaniment}
              disabled={filteredBlocks.length === 0}
            ></Button>
            {/* 配置按钮仅在编辑模式下显示 */}
            {isEdit && (
              <Button
                icon={<SettingOutlined />}
                onClick={() => (state.showConfigModal = true)}
              ></Button>
            )}
          </div>
          <div className="inline-block mt-2 text-xs text-gray-500">
            {config.beats}
            {t("拍")} | {config.bpm} BPM | {t("节奏型")}:{" "}
            {(() => {
              const preset = RHYTHM_PRESETS[config.beats]?.find(
                (p) =>
                  JSON.stringify(p.pattern) ===
                  JSON.stringify(config.rhythmPattern)
              );
              return preset
                ? t(preset.nameKey)
                : config.rhythmPattern
                    .map(
                      (event) =>
                        `${event.type}@${(event.time * 100).toFixed(0)}`
                    )
                    .join("-");
            })()}
          </div>
        </div>
      )}

      {/* 配置弹窗 */}
      <Modal
        title={t("自动伴奏设置")}
        open={state.showConfigModal}
        onOk={() => (state.showConfigModal = false)}
        onCancel={() => (state.showConfigModal = false)}
        width={400}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <label className="block mb-2">{t("拍子")}:</label>
            <Select
              virtual={false}
              value={config.beats}
              onChange={handleBeatsChange}
              style={{ width: "100%" }}
            >
              <Select.Option value={3}>{t("3拍")}</Select.Option>
              <Select.Option value={4}>{t("4拍")}</Select.Option>
              <Select.Option value={5}>{t("5拍")}</Select.Option>
            </Select>
          </div>

          <div>
            <label className="block mb-2">{t("BPM (速度)")}:</label>
            <InputNumber
              value={config.bpm}
              onChange={(value) => updateConfig({ bpm: value || 120 })}
              min={60}
              max={200}
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label className="block mb-2">{t("节奏型预设")}:</label>
            <Select
              virtual={false}
              value={JSON.stringify(config.rhythmPattern)}
              onChange={(value) => {
                const pattern = JSON.parse(value) as RhythmEvent[];
                updateConfig({ rhythmPattern: pattern });
              }}
              style={{ width: "100%" }}
            >
              {RHYTHM_PRESETS[config.beats]?.map((preset, index) => (
                <Select.Option
                  key={index}
                  value={JSON.stringify(preset.pattern)}
                >
                  {t(preset.nameKey)}
                </Select.Option>
              ))}
            </Select>
          </div>
        </Space>
      </Modal>

      <div className="max-h-36 md:max-h-48 overflow-auto pt-1">
        {/* 和弦集合 */}
        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
          onDragEnd={handleDragEnd}
          autoScroll={false}
        >
          <SortableContext
            items={blocks.map((block) => block.id!)}
            strategy={rectSortingStrategy}
          >
            <div
              className="flex flex-wrap"
              style={{
                rowGap: 4,
              }}
            >
              {filteredBlocks.map((block, index) => (
                <CollectionItem
                  key={block.id}
                  style={{
                    ...(state.isPlaying &&
                      index === state.currentChordIndex && {
                        background: "#212937",
                        color: "white",
                      }),
                  }}
                  block={block}
                  isEdit={isEdit}
                  selectedId={selectedId}
                  editingId={editingId}
                  onSelect={handleSelect}
                  onEdit={handleEdit}
                  onRename={handleRename}
                  onDelete={onDelete}
                  onCollect={onCollect}
                  root={root}
                  length={lengths?.[index]}
                  index={index}
                  onLengthChange={onLengthChange}
                  instrument={instrument}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
};
