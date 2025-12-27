"use client";

import React, { useState, useRef } from "react";
import _ from "lodash";
import { Button } from "antd";

import { Note } from "./index";
import { InstrumentData } from "@/typings/chordEditor";
import {
  getNoteByStringAndFret,
  getScaleDegree,
  playChord,
} from "@/utils/calc";
import { DownOutlined, UpOutlined } from "@ant-design/icons";
import { isMobile } from "@/utils/env";

// 定义吉他标准调弦（带八度信息）
const GUITAR_TUNING: Note[] = [
  { name: "E", octave: 2 }, // 6弦（最低音）
  { name: "A", octave: 2 }, // 5弦
  { name: "D", octave: 3 }, // 4弦
  { name: "G", octave: 3 }, // 3弦
  { name: "B", octave: 3 }, // 2弦
  { name: "E", octave: 4 }, // 1弦（最高音）
];

// 获取最低音弦索引
const getLowestNoteIndex = (notes: Array<{ string: number; fret: number }>) => {
  if (notes.length === 0) return null;
  return notes.reduce((lowest, current) =>
    current.string < lowest.string ? current : lowest
  ).string;
};

interface GuitarEditorProps {
  instrumentData: InstrumentData;
  onDataChange: (data: Partial<InstrumentData>) => void;
  fretRange: { start: number; end: number };
  showNoteName?: boolean;
  showInterval?: boolean;
  showFretBtn?: boolean;
  onDownFret?: () => void;
  onUpFret?: () => void;
}

interface GuitarNoteButtonProps {
  stringIndex: number;
  isRoot: boolean;
  text: string;
  onRootSelection: (stringIndex: number) => void;
  onPlay: (stringIndex: number) => void;
}

const GuitarNoteButton: React.FC<GuitarNoteButtonProps> = ({
  stringIndex,
  isRoot,
  text,
  onRootSelection,
  onPlay,
}) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const start = () => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onRootSelection(stringIndex);
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
      className="flex-1 select-none touch-manipulation"
      size="small"
      onMouseDown={start}
      onMouseUp={end}
      onMouseLeave={end}
      onTouchStart={start}
      onTouchEnd={end}
      onTouchCancel={end}
      onClick={(e) => {
        if (isLongPress.current) return;
        onPlay(stringIndex);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
      }}
    >
      {text}
    </Button>
  );
};

export function GuitarEditor({
  instrumentData,
  onDataChange,
  fretRange,
  showNoteName = true,
  showFretBtn = true,
  showInterval = true,
  onDownFret,
  onUpFret,
}: GuitarEditorProps) {
  // 从instrumentData中提取吉他特定数据
  const selectedNotes = (instrumentData.guitarData || []) as Array<{
    string: number;
    fret: number;
  }>;
  const userSelectedRoot = instrumentData.userSelectedRoot || null;

  const setUserSelectedRoot = (root: number | null) => {
    onDataChange({ userSelectedRoot: root });
  };
  const [customTuning, setCustomTuning] = useState<Note[]>(GUITAR_TUNING);
  const [editingString, setEditingString] = useState<number | null>(null);

  const startFret = fretRange.start;
  // 注意这里历史原因，有点坑，start 3 end 4 将会只有 1 行，且展示索引是 + 1的，要 start - 1，才会展示 3 - 4 品
  const fretCount = fretRange.end - fretRange.start;

  // 处理音符选择
  const toggleNote = (stringIndex: number, fret: number) => {
    const existingNoteIndex = selectedNotes.findIndex(
      (note) => note.string === stringIndex && note.fret === fret
    );
    let updatedNotes;

    // 播放点击的音符
    const noteToPlay = getNoteByStringAndFret(stringIndex, fret, customTuning);
    playChord([noteToPlay], 0, "guitar");

    if (existingNoteIndex >= 0) {
      // 如果已选中则移除
      updatedNotes = selectedNotes.filter(
        (_, index) => index !== existingNoteIndex
      );
    } else {
      // 添加新音符，替换同一弦上的现有音符
      const filteredNotes = selectedNotes.filter(
        (note) => note.string !== stringIndex
      );
      updatedNotes = [...filteredNotes, { string: stringIndex, fret }];
    }

    // 重置用户选择的根音
    setUserSelectedRoot(null);

    // 通知父组件数据变化 - 吉他模式只保存guitarData，不设置notes
    onDataChange({
      guitarData: updatedNotes,
      userSelectedRoot: null,
    });
  };

  // 处理根音选择
  const handleRootSelection = (stringIndex: number) => {
    const newRoot = userSelectedRoot === stringIndex ? null : stringIndex;
    setUserSelectedRoot(newRoot);
  };

  // 播放单个弦
  const playString = (stringIndex: number) => {
    const selectedNote = selectedNotes.find(
      (note) => note.string === stringIndex
    );
    if (selectedNote) {
      const noteToPlay = getNoteByStringAndFret(
        stringIndex,
        selectedNote.fret,
        customTuning
      );
      playChord([noteToPlay], 0, "guitar");
    }
  };

  // 显示音名（不显示八度）
  const displayNoteName = (note: Note) => note.name;

  // 获取弦的度数
  const getStringDegree = (stringIndex: number) => {
    if (selectedNotes.length === 0) return "";

    const rootStringIndex =
      userSelectedRoot !== null
        ? userSelectedRoot
        : getLowestNoteIndex(selectedNotes);
    if (rootStringIndex === null) return "";

    const selectedNote = selectedNotes.find(
      (note) => note.string === stringIndex
    );
    if (!selectedNote) return "";

    const rootNote = getNoteByStringAndFret(
      rootStringIndex,
      selectedNotes.find((n) => n.string === rootStringIndex)!.fret + startFret
    );

    const currentNote = getNoteByStringAndFret(
      stringIndex,
      selectedNote.fret + startFret
    );

    return getScaleDegree(currentNote, rootNote);
  };

  // 左侧操作按钮
  const getFretItem = (fretIndex) => {
    if (fretIndex === 0)
      return (
        <div
          key={fretIndex}
          className="h-12 flex items-center justify-center text-sm font-medium"
        >
          {showFretBtn && (
            <Button
              style={{
                marginBottom: -40,
              }}
              className="do-not-screenshot"
              onClick={onUpFret}
              size="small"
              icon={<UpOutlined />}
            ></Button>
          )}
        </div>
      );
    if (fretIndex === fretCount + 1)
      return (
        <div
          key={fretIndex}
          className="h-0 flex items-center justify-center text-sm font-medium"
        >
          {showFretBtn && (
            <Button
              style={{
                marginTop: 10,
              }}
              className="do-not-screenshot"
              onClick={onDownFret}
              size="small"
              icon={<DownOutlined />}
            ></Button>
          )}
        </div>
      );
    return (
      <div
        key={fretIndex}
        className="h-12 flex items-center justify-center text-sm font-medium text-amber-800"
      >
        {fretIndex + startFret}
      </div>
    );
  };

  return (
    <div className="editor flex flex-col justify-center items-center">
      <div className="fret-panel bg-white w-80 mx-auto px-8">
        {/* 指板 - 垂直布局 */}
        <div className="flex relative">
          {/* 品位数字 - 现在在左侧 */}
          <div className="flex flex-col border-r border-amber-300 w-10">
            {Array.from({ length: fretCount + 2 }).map((_, fretIndex) =>
              getFretItem(fretIndex)
            )}
          </div>

          {/* 弦 - 现在作为列 */}
          <div className="fretboard w-40 border border-amber-200 rounded-md flex-1 flex">
            {customTuning.map((string, stringIndex) => (
              <div
                key={stringIndex}
                className="flex-1 flex flex-col border-r border-amber-200 last:border-r-0"
              >
                {/* 空弦（0品） */}
                <div
                  className="relative h-12 border-t-0 border-l-0 border-r-0 border-b-2 border-solid"
                  onClick={() =>
                    isMobile() ? _.noop : toggleNote(stringIndex, 0)
                  }
                  onTouchEnd={() => toggleNote(stringIndex, 0)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditingString(stringIndex);
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    {editingString === stringIndex ? (
                      <input
                        className="w-8 h-8 text-center border border-amber-500 rounded-md text-sm"
                        value={customTuning[stringIndex].name}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const newTuning = [...customTuning];
                          newTuning[stringIndex] = {
                            ...newTuning[stringIndex],
                            name: e.target.value.toUpperCase().substring(0, 2),
                          };
                          setCustomTuning(newTuning);
                        }}
                        onBlur={() => setEditingString(null)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setEditingString(null);
                          }
                        }}
                      />
                    ) : selectedNotes.some(
                        (note) => note.string === stringIndex && note.fret === 0
                      ) ? (
                      <div className="absolute z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs">
                        {displayNoteName(
                          getNoteByStringAndFret(stringIndex, 0, customTuning)
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 font-bold">
                        {displayNoteName(
                          getNoteByStringAndFret(stringIndex, 0, customTuning)
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 其他品位 */}
                {Array.from({ length: fretCount }).map((_v, fretIndex) => {
                  const actualFret = fretIndex + startFret + 1;
                  const isSelected = selectedNotes.some(
                    (note) =>
                      note.string === stringIndex && note.fret === actualFret
                  );

                  return (
                    <div
                      key={fretIndex}
                      className={`relative h-12`}
                      onClick={() =>
                        isMobile()
                          ? _.noop
                          : toggleNote(stringIndex, actualFret)
                      }
                      onTouchEnd={() => toggleNote(stringIndex, actualFret)}
                    >
                      <div className="absolute border-l-0 border-r-0 border-t-0 border-solid border-primary inset-0 flex items-center justify-center">
                        <>
                          <div className="absolute h-full w-[2px] bg-amber-700 opacity-30"></div>
                          {isSelected ? (
                            <div className="absolute z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs">
                              {showNoteName
                                ? displayNoteName(
                                    getNoteByStringAndFret(
                                      stringIndex,
                                      actualFret,
                                      customTuning
                                    )
                                  )
                                : ""}
                            </div>
                          ) : null}
                        </>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* 品位标记图层 - 独立于弦的图层 */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="flex">
              {/* 占位品位数字区域 */}
              <div className="w-10"></div>

              {/* 品位标记区域 */}
              <div className="flex-1 flex flex-col">
                {/* 空弦区域占位 */}
                <div className="h-12"></div>

                {/* 品位标记 */}
                {Array.from({ length: fretCount }).map((_v, fretIndex) => {
                  const actualFret = fretIndex + startFret + 1;

                  return (
                    <div
                      key={fretIndex}
                      className="relative h-12 flex items-center justify-center"
                    >
                      {/* 3、5、7品单点 */}
                      {[3, 5, 7, 9].includes(actualFret) && (
                        <div className="w-3 h-3 rounded-full bg-amber-600 opacity-50"></div>
                      )}

                      {/* 9品双点 */}
                      {actualFret === 12 && (
                        <div className="flex gap-24">
                          <div className="w-3 h-3 rounded-full bg-amber-600 opacity-50"></div>
                          <div className="w-3 h-3 rounded-full bg-amber-600 opacity-50"></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 度数显示区域 - 底部 */}
        <div className="flex mt-1 border border-amber-200 rounded-md">
          {/* 占位 */}
          {showInterval && (
            <div className="w-10 flex items-center justify-center border-r border-amber-300 text-sm font-medium text-amber-800"></div>
          )}

          {showInterval && (
            <div className="flex-1 flex">
              {customTuning.map((_, stringIndex) => {
                const currNote = selectedNotes.find(
                  (note) => note.string === stringIndex
                );

                if (currNote)
                  return (
                    <div className="p-1 text-center flex-1" key={stringIndex}>
                      {getStringDegree(stringIndex)}
                    </div>
                  );
                else
                  return <div className="p-1 flex-1" key={stringIndex}></div>;
              })}
            </div>
          )}
        </div>
      </div>

      {/* 度数显示区域 - 底部 */}
      {showInterval && (
        <div className="w-full flex gap-2 do-not-screenshot mt-4">
          {customTuning
            .map((_, stringIndex) => {
              const degree = getStringDegree(stringIndex);
              const currNote = selectedNotes.find(
                (note) => note.string === stringIndex
              ) ?? {
                string: stringIndex,
                fret: 0,
              };
              const note = getNoteByStringAndFret(
                stringIndex,
                currNote.fret,
                customTuning
              );

              return (
                <GuitarNoteButton
                  key={stringIndex}
                  stringIndex={stringIndex}
                  isRoot={degree === "R"}
                  text={`${note.name + note.octave}(${getStringDegree(
                    stringIndex
                  )})`}
                  onRootSelection={handleRootSelection}
                  onPlay={playString}
                />
              );
            })
            .filter((_, i) => selectedNotes.find((note) => note.string === i))}
        </div>
      )}
    </div>
  );
}

// 导出getNoteByStringAndFret函数供其他组件使用
export { getNoteByStringAndFret };
