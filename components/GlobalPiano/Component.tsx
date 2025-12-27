"use client";

import React, { useEffect, useRef, useState } from "react";
import _ from "lodash";
import { Button } from "antd";
import { useTranslation } from "next-i18next";

import {
  Note,
  getAbsoluteInterval,
  playChord,
  getScaleDegree,
  getNoteNumber,
  NOTES,
} from "@/utils/calc";
import { InstrumentData } from "@/typings/chordEditor";
import { isMobile } from "@/utils/env";
import { MoaTone } from "@/utils/MoaTone";
import { appStore } from "@/stores/store";
import { useSnapshot } from "valtio";

// 钢琴键盘布局 - 黑键位置
const BLACK_KEYS = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#

// 检查是否为黑键
const isBlackKey = (noteIndex: number) => BLACK_KEYS.includes(noteIndex);

// 键盘映射（与 MoaRoll 键盘保持一致）
const KEYBOARD_CODES: { code: string; label: string }[] = [
  { code: "KeyQ", label: "Q" },
  { code: "Digit2", label: "2" },
  { code: "KeyW", label: "W" },
  { code: "Digit3", label: "3" },
  { code: "KeyE", label: "E" },
  { code: "KeyR", label: "R" },
  { code: "Digit5", label: "5" },
  { code: "KeyT", label: "T" },
  { code: "Digit6", label: "6" },
  { code: "KeyY", label: "Y" },
  { code: "Digit7", label: "7" },
  { code: "KeyU", label: "U" },
  { code: "KeyI", label: "I" },
  { code: "Digit9", label: "9" },
  { code: "KeyO", label: "O" },
  { code: "Digit0", label: "0" },
  { code: "KeyP", label: "P" },
  { code: "BracketLeft", label: "[" },
  { code: "Equal", label: "=" },
  { code: "BracketRight", label: "]" },
];
const KEYBOARD_NAMES: string[] = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

interface PianoEditorProps {
  instrumentData?: InstrumentData;
  noteDisplayMode?: "octave" | "CDEFG" | "12345";
  onDataChange: (data: Partial<InstrumentData>) => void;
  fretRange?: { start: number; end: number };
  keyboardEnabled?: boolean;
  keyboardOctave?: number; // 来自外层设置的键盘八度 —— 同步到本地状态
  noteRetain?: boolean;
}

export function PianoEditor({
  instrumentData = {},
  noteDisplayMode = "octave",
  onDataChange,
  noteRetain = true,
  fretRange = { start: 2, end: 6 },
  keyboardEnabled = true,
  keyboardOctave: keyboardOctaveFromProps,
}: PianoEditorProps) {
  const { t } = useTranslation("common");
  // 从instrumentData中提取钢琴特定数据
  const [selectedNotes, setSelectedNotes] = useState<Note[]>(
    instrumentData.notes || []
  );
  const userSelectedRoot = (instrumentData.pianoUserSelectedRoot ||
    null) as Note | null;

  const setUserSelectedRoot = (root: Note | null) => {
    onDataChange({ pianoUserSelectedRoot: root });
  };

  const { audioPreset } = useSnapshot(appStore);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isScrollingRef = useRef<boolean>(false);

  // 键盘演奏相关
  // 键盘八度由外层控制，内部不再同步或夹取
  const keyboardOctave =
    typeof keyboardOctaveFromProps === "number"
      ? keyboardOctaveFromProps
      : Math.floor((fretRange.start + fretRange.end) / 2);

  const synthRef = useRef<any>(null);
  const pressedCodesRef = useRef<Map<string, string>>(new Map());
  const baseSelectedSetRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    baseSelectedSetRef.current = new Set(
      (instrumentData.notes || []).map((n) => `${n.name}${n.octave}`)
    );
    setSelectedNotes(instrumentData.notes || []);
  }, [instrumentData.notes]);

  useEffect(() => {
    // 初始化合成器
    synthRef.current = new MoaTone.Synth({
      preset: appStore.audioPreset.piano,
    });

    return () => {
      // 释放所有按下的键（使用按下时记录的音符）
      pressedCodesRef.current.forEach((note) => {
        try {
          synthRef.current?.triggerRelease(note, MoaTone.now());
        } catch {}
      });
      pressedCodesRef.current.clear();
      synthRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioPreset.piano]);

  // 键盘八度范围维护由外层负责 —— 内部不再处理

  const keyCodeToNote = (code: string): string | null => {
    // 根据当前 keyboardOctave 生成映射：从 C 开始，按半音序列跨越多个八度
    for (let i = 0; i < KEYBOARD_CODES.length; i++) {
      const { code: mappedCode } = KEYBOARD_CODES[i];
      if (mappedCode === code) {
        const nameIndex = i % KEYBOARD_NAMES.length;
        const octaveShift = Math.floor(i / KEYBOARD_NAMES.length);
        const baseOct = keyboardOctave + octaveShift;
        const name = KEYBOARD_NAMES[nameIndex];
        return `${name}${baseOct}`;
      }
    }
    return null;
  };

  // 基于当前 keyboardOctave 构造映射：noteStr -> { code, label }
  const getKeyboardMappings = () => {
    return KEYBOARD_CODES.map((item, i) => {
      const code = item.code;
      const label = item.label;
      const nameIndex = i % KEYBOARD_NAMES.length;
      const octaveShift = Math.floor(i / KEYBOARD_NAMES.length);
      const baseOct = keyboardOctave + octaveShift;
      const name = KEYBOARD_NAMES[nameIndex];
      const noteStr = `${name}${baseOct}`;
      return { code, label, noteStr };
    });
  };

  // 查找某个音符对应的键盘标签与编码（若存在映射）
  const findMappingForNote = (
    note: Note
  ): { code: string; label: string } | null => {
    const noteStr = `${note.name}${note.octave}`;
    const mappings = getKeyboardMappings();
    const found = mappings.find((m) => m.noteStr === noteStr);
    return found ? { code: found.code, label: found.label } : null;
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const code = event.code;
    const noteStr = keyCodeToNote(code);
    if (!noteStr) return;
    if (pressedCodesRef.current.has(code)) return;
    pressedCodesRef.current.set(code, noteStr);
    // 使用 selectedNotes 作为高亮源：按下时临时添加
    const [name, octaveStr] = [noteStr.slice(0, -1), noteStr.slice(-1)];
    const octave = Number(octaveStr);
    setSelectedNotes((prev) => {
      const exists = prev.some(
        (n) =>
          getNoteNumber(n.name) === getNoteNumber(name) && n.octave === octave
      );
      return exists
        ? prev
        : [...prev, { name: name as Note["name"], octave } as Note];
    });
    try {
      synthRef.current?.triggerAttack(noteStr, MoaTone.now());
    } catch {}
  };

  useEffect(() => {
    // 注意：键盘事件只在非可编辑上下文中生效（判断在 handler 内）
    // 同时依据 keyboardEnabled 控制是否挂载全局事件 —— 折叠时自动卸载
    if (!keyboardEnabled) return;
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [keyboardOctave, keyboardEnabled]);

  // 当禁用键盘（例如折叠关闭）时，主动释放所有已按下的音符，避免粘滞状态
  useEffect(() => {
    if (!keyboardEnabled) {
      pressedCodesRef.current.forEach((note) => {
        try {
          synthRef.current?.triggerRelease(note, MoaTone.now());
        } catch {}
      });
      pressedCodesRef.current.clear();
    }
  }, [keyboardEnabled]);

  const handleKeyUp = (event: KeyboardEvent) => {
    const code = event.code;
    const noteStr = pressedCodesRef.current.get(code);
    if (!noteStr) return;
    pressedCodesRef.current.delete(code);
    // 使用 selectedNotes 作为高亮源：松开时移除（但保留用户基础选择）
    const [name, octaveStr] = [noteStr.slice(0, -1), noteStr.slice(-1)];
    const octave = Number(octaveStr);
    const key = `${name}${octave}`;
    setSelectedNotes((prev) => {
      if (baseSelectedSetRef.current.has(key)) return prev; // 用户持久选择不移除
      return prev.filter(
        (n) =>
          !(
            getNoteNumber(n.name) === getNoteNumber(name) && n.octave === octave
          )
      );
    });
    try {
      synthRef.current?.triggerRelease(noteStr, MoaTone.now());
    } catch {}
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobile()) return;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
    isScrollingRef.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isMobile() || !touchStartRef.current) return;
    if (isScrollingRef.current) return; // Already determined it's a scroll

    const deltaX = Math.abs(e.touches[0].clientX - touchStartRef.current.x);
    const deltaY = Math.abs(e.touches[0].clientY - touchStartRef.current.y);

    if (deltaX > 10 && deltaX > deltaY) {
      isScrollingRef.current = true;
    }
  };

  const handleTouchEnd = (note: Note) => {
    if (!isMobile()) return;

    if (!isScrollingRef.current) {
      toggleNote(note);
    }
    // Reset for the next touch
    touchStartRef.current = null;
    isScrollingRef.current = false;
  };

  // 键盘范围（使用fretRange作为八度范围）
  const startOctave = fretRange.start;
  const endOctave = fretRange.end;

  // 处理音符选择
  const toggleNote = (note: Note) => {
    const existingNoteIndex = selectedNotes.findIndex(
      (n) =>
        getNoteNumber(n.name) === getNoteNumber(note.name) &&
        n.octave === note.octave
    );
    let updatedNotes;

    if (existingNoteIndex >= 0) {
      // 如果已选中则移除
      updatedNotes = selectedNotes.filter(
        (_, index) => index !== existingNoteIndex
      );
    } else {
      // 添加新音符
      updatedNotes = [...selectedNotes, note];
    }

    // 播放点击的音符
    playNote(note);

    if (noteRetain) {
      // 重置用户选择的根音
      setUserSelectedRoot(null);
      // 更新本地状态
      setSelectedNotes(updatedNotes);
      // 通知父组件数据变化
      onDataChange({
        notes: updatedNotes,
        pianoUserSelectedRoot: null,
      });
    }
  };

  // 处理根音选择
  const handleRootSelection = (note: Note) => {
    const isSameNote =
      userSelectedRoot &&
      getNoteNumber(userSelectedRoot.name) === getNoteNumber(note.name) &&
      userSelectedRoot.octave === note.octave;
    const newRoot = isSameNote ? null : note;
    setUserSelectedRoot(newRoot);
  };

  // 播放单个音符
  const playNote = (note: Note) => {
    playChord([note], 0, "piano");
  };

  // 显示音名 ——Lusia（该函数内全是）
  const noteSign = (note: Note) => {
    const { octave } = note;
    if (noteDisplayMode === "12345") {
      const noteMap: Record<string, string> = {
        C: "1",
        Db: "b2",
        D: "2",
        Eb: "b3",
        E: "3",
        F: "4",
        Gb: "b5",
        G: "5",
        Ab: "b6",
        A: "6",
        Bb: "b7",
        B: "7",
      };

      const baseNote = noteMap[note.name] || note.name;

      // 以 C4 为中央音区基准
      const octaveDiff = note.octave - 4;

      if (octaveDiff > 0) {
        // 高音：在上方加点
        const dots = Array(octaveDiff).fill("•");
        return (
          <div style={{ position: "relative", display: "inline-block" }}>
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "8px",
                lineHeight: "6px",
                marginBottom: "2px",
                display: "flex",
                flexDirection: "column-reverse",
                alignItems: "center",
              }}
            >
              {dots.map((dot, i) => (
                <div key={i}>{dot}</div>
              ))}
            </div>
            {baseNote}
          </div>
        );
      } else if (octaveDiff < 0) {
        // 低音：在下方加点，数字需要上移
        const dots = Array(Math.abs(octaveDiff)).fill("•");
        const upwardOffset = Math.abs(octaveDiff) * 8; // 每个点需要 8px 空间
        return (
          <div
            style={{
              position: "relative",
              display: "inline-block",
              transform: `translateY(-${upwardOffset}px)`, // 整体上移
            }}
          >
            {baseNote}
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "8px",
                lineHeight: "6px",
                marginTop: "2px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              {dots.map((dot, i) => (
                <div key={i}>{dot}</div>
              ))}
            </div>
          </div>
        );
      } else {
        // 中音（C4）：不加点
        return baseNote;
      }
    } else if (noteDisplayMode === "CDEFG") {
      return note.name;
    } else {
      const isC = note.name === "C"; // 判断是否为C键
      if (isC) {
        return `C${octave}`;
      }
    }
  };

  // 获取音符的度数
  const getNoteDegree = (note: Note) => {
    if (selectedNotes.length === 0) return "";

    const rootNote =
      userSelectedRoot ||
      [...selectedNotes].sort(
        (a, b) => getAbsoluteInterval(a) - getAbsoluteInterval(b)
      )[0];
    return getScaleDegree(note, rootNote);
  };

  // 检查音符是否被选中
  const isNoteSelected = (note: Note) => {
    return selectedNotes.some(
      (n) =>
        getNoteNumber(n.name) === getNoteNumber(note.name) &&
        n.octave === note.octave
    );
  };

  // 检查音符是否为根音
  const isRootNote = (note: Note) => {
    if (!userSelectedRoot) {
      const sortedNotes = [...selectedNotes].sort(
        (a, b) => getAbsoluteInterval(a) - getAbsoluteInterval(b)
      );
      const autoRoot = sortedNotes[0];
      return (
        autoRoot &&
        getNoteNumber(autoRoot.name) === getNoteNumber(note.name) &&
        autoRoot.octave === note.octave
      );
    }
    return (
      getNoteNumber(userSelectedRoot.name) === getNoteNumber(note.name) &&
      userSelectedRoot.octave === note.octave
    );
  };

  // 渲染单个八度的键盘
  const renderOctave = (octave: number) => {
    const isMobileDevice = isMobile();
    const whiteKeyWidthRem = isMobileDevice ? 3 : 2;
    const whiteKeyClass = isMobileDevice ? "w-12" : "w-8";
    const blackKeyWidthRem = isMobileDevice ? 1.875 : 1.25;

    const whiteKeys = [];
    const blackKeys = [];

    // 渲染白键
    for (let i = 0; i < 12; i++) {
      if (!isBlackKey(i)) {
        const note: Note = { name: NOTES[i], octave };
        const isC = note.name === "C"; // 判断是否为C键
        const selected = isNoteSelected(note);
        const isRoot = isRootNote(note);
        const degree = getNoteDegree(note);
        const mapping = findMappingForNote(note);

        whiteKeys.push(
          <div
            key={`${note.name}-${octave}`}
            className={`
              relative ${whiteKeyClass} h-32 border-solid border border-gray-300 cursor-pointer transition-all flex flex-col
              ${
                selected
                  ? "bg-gray-400 text-white"
                  : "bg-white hover:bg-gray-100"
              }
              ${isRoot ? "ring-2 ring-red-500" : ""}
            `}
            onClick={() => (isMobile() ? _.noop : toggleNote(note))}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => handleTouchEnd(note)}
          >
            {/* 键盘键位标签 */}
            {/* {!isMobile() && mapping && (
              <div className="mt-auto text-gray-500 relative -top-4 text-center pb-1 text-[8px] select-none">
                {mapping.label}
              </div>
            )} */}

            {selected && (
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                <div className="text-xs font-bold">{noteSign(note)}</div>
                <div style={{ fontSize: 10 }}>{degree}</div>
                {!isMobile() && mapping && (
                  <div
                    className="text-gray-500"
                    style={{
                      fontSize: 8,
                    }}
                  >
                    {mapping.label}
                  </div>
                )}
              </div>
            )}

            {!selected && (
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                <div className="text-xs font-medium text-gray-500">
                  {noteSign(note)}
                </div>
                {!isMobile() && mapping && (
                  <div
                    className="text-gray-500"
                    style={{
                      fontSize: 8,
                    }}
                  >
                    {mapping.label}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }
    }

    // 渲染黑键
    const blackKeyPositions = [0.5, 1.5, 3.5, 4.5, 5.5]; // 相对于白键的位置
    let blackKeyIndex = 0;

    for (let i = 0; i < 12; i++) {
      if (isBlackKey(i)) {
        const note: Note = { name: NOTES[i], octave };
        const selected = isNoteSelected(note);
        const isRoot = isRootNote(note);
        const degree = getNoteDegree(note);
        const position = blackKeyPositions[blackKeyIndex];

        blackKeys.push(
          <div
            key={`${note.name}-${octave}-black`}
            className={`
              absolute h-20 cursor-pointer transition-all z-10 flex flex-col
              ${
                selected
                  ? "bg-gray-400 text-white outline-white outline"
                  : "bg-gray-800 hover:bg-gray-700"
              }
              ${isRoot ? "ring-2 ring-red-500" : ""}
            `}
            style={{
              left: `${position * whiteKeyWidthRem}rem`,
              width: `${blackKeyWidthRem}rem`,
            }}
            onClick={() => (isMobile() ? _.noop : toggleNote(note))}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => handleTouchEnd(note)}
          >
            {selected && (
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                {
                  <div className="text-xs font-bold text-white">
                    {noteSign(note)}
                  </div>
                }
                <div className="text-xs text-white">{degree}</div>
              </div>
            )}
          </div>
        );
        blackKeyIndex++;
      }
    }

    return (
      <div className="relative flex" key={octave}>
        {whiteKeys}
        {blackKeys}
      </div>
    );
  };

  const pianoDomRef = useRef(null);

  useEffect(() => {
    const dom = pianoDomRef.current as any;
    if (dom) {
      const x = dom.scrollWidth; //获取页面最大宽度
      dom.scrollLeft = x / 2 - document.body.clientWidth / 2; //设置滚动条最左方位置
    }
  }, []);

  return (
    <div className="editor select-none flex flex-col justify-center items-center">
      <div className="piano-panel mx-auto">
        {/* 钢琴键盘 - 支持横向滚动 */}
        <div
          className="overflow-auto piano-overflow"
          style={{
            maxWidth: "100vw",
          }}
          ref={pianoDomRef}
        >
          <div className="flex items-end min-w-max">
            {Array.from({ length: endOctave - startOctave + 1 }, (_, i) =>
              renderOctave(startOctave + i)
            )}
          </div>
        </div>

        {/* 选中音符显示区域 */}
        {instrumentData.notes && (
          <div className="p-4 flex justify-center border border-gray-200 rounded-md min-h-16 do-not-screenshot">
            <div className="flex flex-wrap gap-2">
              {[...selectedNotes]
                .sort((a, b) => getAbsoluteInterval(a) - getAbsoluteInterval(b))
                .map((note, index) => {
                  const degree = getNoteDegree(note);
                  const isRoot = isRootNote(note);
                  return (
                    <Button
                      key={`${note.name}-${note.octave}-${index}`}
                      type={isRoot ? "primary" : "default"}
                      size="small"
                      onDoubleClick={() => handleRootSelection(note)}
                      onClick={() => playNote(note)}
                    >
                      {note.name}
                      {note.octave} ({degree})
                    </Button>
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
