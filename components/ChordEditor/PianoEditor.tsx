"use client";

import React, { useEffect, useRef, useState } from "react";
import _ from "lodash";
import { Button } from "antd";

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

// 钢琴键盘布局 - 黑键位置
const BLACK_KEYS = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#

// 检查是否为黑键
const isBlackKey = (noteIndex: number) => BLACK_KEYS.includes(noteIndex);

interface PianoEditorProps {
  instrumentData?: InstrumentData;
  noteDisplayMode?: "octave" | "CDEFG" | "12345";
  onDataChange: (data: Partial<InstrumentData>) => void;
  fretRange?: { start: number; end: number };
}

interface PianoNoteButtonProps {
  note: Note;
  isRoot: boolean;
  degree: string;
  onRootSelection: (note: Note) => void;
  onPlay: (note: Note) => void;
}

const PianoNoteButton: React.FC<PianoNoteButtonProps> = ({
  note,
  isRoot,
  degree,
  onRootSelection,
  onPlay,
}) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const start = () => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onRootSelection(note);
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
  };

  const end = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  return (
    <Button
      type={isRoot ? "primary" : "default"}
      size="small"
      className="select-none touch-manipulation"
      onMouseDown={start}
      onMouseUp={end}
      onMouseLeave={end}
      onTouchStart={start}
      onTouchEnd={end}
      onTouchCancel={end}
      onClick={(e) => {
        if (isLongPress.current) return;
        onPlay(note);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      {note.name}
      {note.octave} ({degree})
    </Button>
  );
};

export function PianoEditor({
  instrumentData = {},
  noteDisplayMode = "octave",
  onDataChange,
  fretRange = { start: 2, end: 6 },
}: PianoEditorProps) {
  // 从instrumentData中提取钢琴特定数据
  const selectedNotes = instrumentData.notes || [];
  const userSelectedRoot = (instrumentData.pianoUserSelectedRoot ||
    null) as Note | null;

  const setUserSelectedRoot = (root: Note | null) => {
    onDataChange({ pianoUserSelectedRoot: root });
  };
  const [showNoteName, setShowNoteName] = useState<boolean>(true);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const isScrollingRef = useRef<boolean>(false);

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

    // 重置用户选择的根音
    setUserSelectedRoot(null);

    // 通知父组件数据变化
    onDataChange({
      notes: updatedNotes,
      pianoUserSelectedRoot: null,
    });
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
  const displayNoteName = (note: Note) => {
    if (noteDisplayMode === "12345") {
      const noteMap: Record<string, string> = {
        C: "1",
        D: "2",
        E: "3",
        F: "4",
        G: "5",
        A: "6",
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
    }
    return note.name; // CDEFG 模式
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
    const whiteKeys = [];
    const blackKeys = [];

    // 渲染白键
    for (let i = 0; i < 12; i++) {
      if (!isBlackKey(i)) {
        const note: Note = { name: NOTES[i], octave };
        const selected = isNoteSelected(note);
        const isRoot = isRootNote(note);
        const degree = getNoteDegree(note);
        const isC = note.name === "C"; // 判断是否为C键

        whiteKeys.push(
          <div
            key={`${note.name}-${octave}`}
            className={`
              relative w-8 h-32 border-solid border border-gray-300 cursor-pointer transition-all
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
            // onDoubleClick={() => handleRootSelection(note)}
          >
            {/* 选中状态显示 ——Lusia */}
            {selected && (
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
                {noteDisplayMode !== "octave" && (
                  <div className="text-xs font-bold">
                    {displayNoteName(note)}
                  </div>
                )}
                <div style={{ fontSize: 10 }}>{degree}</div>
              </div>
            )}

            {/* 未选中状态显示 ——Lusia */}
            {!selected && noteDisplayMode !== "octave" && (
              <div className="absolute bottom-0 left-0 right-0 flex justify-center pb-1">
                <div className="text-xs font-medium text-gray-600">
                  {displayNoteName(note)}
                </div>
              </div>
            )}
            {selected && (
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-3">
                {showNoteName && (
                  <div className="text-xs font-bold">
                    {displayNoteName(note)}
                  </div>
                )}
                <div style={{ fontSize: 10 }}>{degree}</div>
              </div>
            )}
            {/* 在C键上显示八度标签 */}
            {isC &&
              noteDisplayMode === "octave" && ( // 仅在 octave 模式下显示 ——Lusia
                <div
                  style={{
                    bottom: 0,
                  }}
                  className="absolute left-2 text-xs text-gray-500 font-medium"
                >
                  C{octave}
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
              absolute w-5 h-20 cursor-pointer transition-all z-10
              ${
                selected
                  ? "bg-gray-400 text-white outline-white outline"
                  : "bg-gray-800 hover:bg-gray-700"
              }
              ${isRoot ? "ring-2 ring-red-500" : ""}
            `}
            style={{ left: `${position * 2}rem` }}
            onClick={() => (isMobile() ? _.noop : toggleNote(note))}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={() => handleTouchEnd(note)}
            // onDoubleClick={() => handleRootSelection(note)}
          >
            {selected && (
              <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                {showNoteName && (
                  <div className="text-xs font-bold text-white">
                    {displayNoteName(note)}
                  </div>
                )}
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
    const dom = pianoDomRef.current;
    if (dom) {
      const x = dom.scrollWidth; //获取页面最大宽度
      dom.scrollLeft = x / 2 - document.body.clientWidth / 2; //设置滚动条最左方位置
    }
  }, []);

  return (
    <div className="editor select-none flex flex-col justify-center items-center">
      <div className="piano-panel bg-white mx-auto">
        {/* 钢琴键盘 - 支持横向滚动 */}
        <div
          className="overflow-x-scroll piano-overflow"
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
                    <PianoNoteButton
                      key={`${note.name}-${note.octave}-${index}`}
                      note={note}
                      isRoot={isRoot}
                      degree={degree}
                      onRootSelection={handleRootSelection}
                      onPlay={playNote}
                    />
                  );
                })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
