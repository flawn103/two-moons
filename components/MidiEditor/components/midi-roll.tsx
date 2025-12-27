"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { proxy, ref, useSnapshot } from "valtio";
import cn from "classnames";
import { Button } from "antd";
import { MidiData, MidiNote } from "@/typings/midi";
import { isMobile } from "@/utils/env";
import { MoaTone } from "@/utils/MoaTone";
import type { MoaSynth } from "@/utils/MoaTone";
import { appStore } from "@/stores/store";

const PIANO_KEYS = [
  { note: "C", isBlack: false },
  { note: "C#", isBlack: true },
  { note: "D", isBlack: false },
  { note: "D#", isBlack: true },
  { note: "E", isBlack: false },
  { note: "F", isBlack: false },
  { note: "F#", isBlack: true },
  { note: "G", isBlack: false },
  { note: "G#", isBlack: true },
  { note: "A", isBlack: false },
  { note: "A#", isBlack: true },
  { note: "B", isBlack: false },
];

interface MidiPianoRollProps {
  id: string;
  data: MidiData;
}

interface DragState {
  isDragging: boolean;
  dragType: "move" | "resize-left" | "resize-right" | null;
  noteIndex: number | null;
  startX: number;
  startY: number;
  originalNote: any;
  hasMoved: boolean;
  tempNote?: any;
  lastPlayedPitch?: number; // 记录上次播放的音高
}

interface MidiStore {
  midiData: MidiData;
  isPlaying: boolean;
  currentTime: number;
  synth: MoaSynth;
  onMidiChange?: (data: MidiData) => void;
  updateMidiData: (data: MidiData) => void;
  setCurrentTime: (time: number) => void;
  addNote: (note: MidiNote) => void;
  removeNote: (noteId: string) => void;
  updateNote: (noteId: string, updates: Partial<MidiNote>) => void;
  play: () => void;
  stop: () => void;
  togglePlayback: () => void;
}

const createMidiStore = (data: MidiData) => {
  // 将beat转换为毫秒（基于tempo）
  const beatsToMs = (beats: number) => {
    const beatsPerSecond = data.tempo / 60;
    return (beats / beatsPerSecond) * 1000;
  };

  // 将毫秒转换为beat（基于tempo）
  const msToBeats = (ms: number) => {
    const beatsPerSecond = data.tempo / 60;
    return (ms / 1000) * beatsPerSecond;
  };

  const store = proxy<MidiStore>({
    midiData: data,
    isPlaying: false,
    currentTime: 0, // 初始化currentTime为0而不是-1，避免时间计算错误
    onMidiChange: undefined,
    synth: ref(
      new MoaTone.Synth({
        preset: appStore.audioPreset?.piano || "sine",
      })
    ),

    updateMidiData: (data: MidiData) => {
      store.midiData = data;
      store.onMidiChange?.(data);
    },

    setCurrentTime: (time: number) => {
      store.currentTime = time;
    },

    addNote: (note: MidiNote) => {
      store.midiData.notes.push(note);
      store.onMidiChange?.(store.midiData);
    },

    removeNote: (noteId: string) => {
      store.midiData.notes = store.midiData.notes.filter(
        (note) => note.id !== noteId
      );
      store.onMidiChange?.(store.midiData);
    },

    updateNote: (noteId: string, updates: Partial<MidiNote>) => {
      const noteIndex = store.midiData.notes.findIndex(
        (note) => note.id === noteId
      );
      if (noteIndex !== -1) {
        store.midiData.notes[noteIndex] = {
          ...store.midiData.notes[noteIndex],
          ...updates,
        };
        store.onMidiChange?.(store.midiData);
      }
    },

    play: () => {
      store.isPlaying = true;
    },

    stop: () => {
      store.isPlaying = false;
    },

    togglePlayback: () => {
      store.isPlaying = !store.isPlaying;
    },
  });

  let animationFrameId: number | null = null;
  let startTime = 0;
  let pausedTime = 0;
  let scheduledNotes = new Set<string>(); // 记录已调度的音符ID

  // lookAhead 参数
  const SCHEDULE_AHEAD_TIME = 0.025; // 25ms 调度窗口

  const scheduleNote = (note: MidiNote, when: number) => {
    // 创建 MoaTone 合成器
    const synth = store.synth;

    // 将 MIDI pitch 转换为音符名称
    const noteNames = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];
    const octave = Math.floor(note.pitch / 12) - 1;
    const noteIndex = note.pitch % 12;
    const noteName = `${noteNames[noteIndex]}${octave}`;

    const durationInSeconds = beatsToMs(note.duration) / 1000;

    synth.triggerAttackRelease(noteName, durationInSeconds, when);
  };

  const scheduler = () => {
    if (!store.isPlaying) return;

    const currentAudioTime = MoaTone.now();
    const currentPlayTime = (currentAudioTime - startTime) * 1000 + pausedTime;

    // 更新显示时间
    store.currentTime = currentPlayTime;

    const scheduleTime = currentPlayTime + SCHEDULE_AHEAD_TIME * 1000;

    store.midiData.notes.forEach((note) => {
      const noteStartMs = beatsToMs(note.start);
      const noteKey = `${note.id}-${noteStartMs}`; // 使用音符ID和开始时间作为唯一标识

      if (
        noteStartMs >= currentPlayTime &&
        noteStartMs <= scheduleTime &&
        !scheduledNotes.has(noteKey)
      ) {
        const audioScheduleTime = startTime + (noteStartMs - pausedTime) / 1000;
        if (audioScheduleTime >= currentAudioTime - 0.05) {
          // 允许轻微的负延迟
          scheduleNote(note, Math.max(audioScheduleTime, currentAudioTime));
          scheduledNotes.add(noteKey); // 标记为已调度
        }
      }
    });

    const maxTime = Math.max(
      ...store.midiData.notes.map((note) =>
        beatsToMs(note.start + note.duration)
      ),
      0
    );
    if (currentPlayTime >= maxTime) {
      store.isPlaying = false;
      store.currentTime = 0;
      stopPlayback();
      return;
    }

    // 继续调度
    if (store.isPlaying) {
      animationFrameId = requestAnimationFrame(scheduler);
    }
  };

  const startPlayback = async () => {
    await MoaTone.start();

    startTime = MoaTone.now();
    pausedTime = Math.max(0, store.currentTime); // 确保pausedTime不会是负数，从0开始播放

    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    scheduler();
  };

  const stopPlayback = () => {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }

    store.currentTime = 0; // 播放停止时重置currentTime为0
    scheduledNotes.clear(); // 清除已调度音符记录
  };

  // 监听播放状态变化
  let prevIsPlaying = store.isPlaying;
  const checkPlayState = () => {
    if (store.isPlaying !== prevIsPlaying) {
      if (store.isPlaying) {
        startPlayback();
      } else {
        stopPlayback();
      }
      prevIsPlaying = store.isPlaying;
    }
    requestAnimationFrame(checkPlayState);
  };
  checkPlayState();

  return store;
};

const midiStoresMap = new Map<string, ReturnType<typeof createMidiStore>>();

export const useMidiStore = (id: string, initialData: MidiData) => {
  if (!midiStoresMap.has(id)) {
    midiStoresMap.set(id, createMidiStore(initialData));
  }

  const store = midiStoresMap.get(id)!;
  const snapshot = useSnapshot(store);

  return {
    snapshot,
    store,
  };
};

export function MidiPianoRoll({ id, data }: MidiPianoRollProps) {
  const { snapshot, store } = useMidiStore(id, data);
  const [selectedNote, setSelectedNote] = useState<number | null>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragType: null,
    noteIndex: null,
    startX: 0,
    startY: 0,
    originalNote: null,
    hasMoved: false,
    tempNote: undefined,
  });
  const rollRef = useRef<HTMLDivElement>(null);
  const pianoRef = useRef<HTMLDivElement>(null);

  const { midiData, currentTime, isPlaying } = snapshot;

  // 将beat转换为毫秒（基于tempo）
  const beatsToMs = (beats: number) => {
    const beatsPerSecond = midiData.tempo / 60;
    return (beats / beatsPerSecond) * 1000;
  };

  // 将毫秒转换为beat（基于tempo）
  const msToBeats = (ms: number) => {
    const beatsPerSecond = midiData.tempo / 60;
    return (ms / 1000) * beatsPerSecond;
  };

  const maxTimeBeats =
    midiData.total ??
    Math.max(
      ...midiData.notes.map((note) => note.start + note.duration),
      10 // 默认10拍
    );
  const maxTime = beatsToMs(maxTimeBeats); // 只在需要毫秒时才转换

  const pianoKeys = [];
  for (let octave = 0; octave <= 8; octave++) {
    PIANO_KEYS.forEach((key, keyIndex) => {
      const pitch = octave * 12 + keyIndex;
      if (pitch >= 12 && pitch <= 127) {
        pianoKeys.push({
          pitch,
          note: `${key.note}${octave}`,
          isBlack: key.isBlack,
        });
      }
    });
  }
  pianoKeys.reverse(); // 高音在上

  const keyHeight = isMobile() ? 20 : 24;
  const beatsPerSecond = midiData.tempo / 60;
  const timeScale = isMobile() ? 0.08 : 0.12; // px per ms
  const beatScale = timeScale * (1000 / beatsPerSecond); // px per beat

  const getNoteNameFromPitch = (pitch: number) => {
    const octave = Math.floor(pitch / 12);
    const noteIndex = pitch % 12;
    return `${PIANO_KEYS[noteIndex].note}${octave}`;
  };

  // 播放单个音符的函数
  const playNotePreview = (pitch: number, duration: number = 0.3) => {
    const noteName = getNoteNameFromPitch(pitch);
    store.synth.triggerAttackRelease(noteName, duration, MoaTone.now());
  };

  const handleMouseDown = (
    e: React.MouseEvent,
    noteIndex: number,
    dragType: "move" | "resize-left" | "resize-right"
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const note = midiData.notes[noteIndex];
    if (!note) return;

    setDragState({
      isDragging: true,
      dragType,
      noteIndex,
      startX: e.clientX,
      startY: e.clientY,
      originalNote: { ...note },
      hasMoved: false,
      tempNote: { ...note },
      lastPlayedPitch: note.pitch, // 初始化上次播放的音高
    });
    setSelectedNote(noteIndex);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (
      !dragState.isDragging ||
      dragState.noteIndex === null ||
      !rollRef.current
    )
      return;

    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    const dragThreshold = 2;
    if (
      !dragState.hasMoved &&
      Math.abs(deltaX) < dragThreshold &&
      Math.abs(deltaY) < dragThreshold
    ) {
      return;
    }

    if (!dragState.hasMoved) {
      setDragState((prev) => ({ ...prev, hasMoved: true }));
    }

    let deltaTimeBeats = deltaX / beatScale;
    const deltaPitch = Math.round(-deltaY / keyHeight);

    const note = midiData.notes[dragState.noteIndex];
    if (!note) return;

    const updatedNote = { ...dragState.tempNote };

    if (dragState.dragType === "move") {
      let newStart = dragState.originalNote.start + deltaTimeBeats;
      if (!isShiftPressed) {
        newStart = snapToGrid(newStart, 1);
      }
      updatedNote.start = Math.max(0, Math.round(newStart * 1000) / 1000);

      const newPitch = Math.max(
        12,
        Math.min(108, dragState.originalNote.pitch + deltaPitch)
      );
      updatedNote.pitch = newPitch;

      if (newPitch !== dragState.lastPlayedPitch) {
        playNotePreview(newPitch, 0.2);
        setDragState((prev) => ({ ...prev, lastPlayedPitch: newPitch }));
      }
    } else if (dragState.dragType === "resize-left") {
      let newStart = dragState.originalNote.start + deltaTimeBeats;
      if (!isShiftPressed) {
        newStart = snapToGrid(newStart, 1);
      }
      newStart = Math.max(0, Math.round(newStart * 1000) / 1000);
      updatedNote.start = newStart;
      updatedNote.duration = Math.max(
        0.1,
        dragState.originalNote.duration -
          (newStart - dragState.originalNote.start)
      );
    } else if (dragState.dragType === "resize-right") {
      let newEnd =
        dragState.originalNote.start +
        dragState.originalNote.duration +
        deltaTimeBeats;
      if (!isShiftPressed) {
        newEnd = snapToGrid(newEnd, 1);
      }
      updatedNote.duration = Math.max(
        0.1,
        Math.round((newEnd - dragState.originalNote.start) * 1000) / 1000
      );
    }

    setDragState((prev) => ({ ...prev, tempNote: updatedNote }));

    store.updateNote(note.id || `note-${dragState.noteIndex}`, {
      start: updatedNote.start,
      pitch: updatedNote.pitch,
      duration: updatedNote.duration,
    });
  };

  const handleMouseUp = () => {
    setDragState({
      isDragging: false,
      dragType: null,
      noteIndex: null,
      startX: 0,
      startY: 0,
      originalNote: null,
      hasMoved: false,
      tempNote: undefined,
      lastPlayedPitch: undefined,
    });
  };

  const handleAddNote = (pitch: number, startTimeBeats: number) => {
    const newNote = {
      id: `note-${Date.now()}-${Math.random()}`,
      pitch: pitch,
      start: startTimeBeats,
      duration: 1, // 默认1拍长度
      velocity: 0.8,
    };
    store.addNote(newNote);
    // 播放音符预览
    playNotePreview(pitch);
  };

  const handleNoteDelete = (noteIndex: number) => {
    const noteToRemove = midiData.notes[noteIndex];
    if (noteToRemove) {
      store.removeNote(noteToRemove.id || `note-${noteIndex}`);
    }
    setSelectedNote(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedNote !== null) {
          handleNoteDelete(selectedNote);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedNote]);

  useEffect(() => {
    if (dragState.isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [dragState.isDragging, handleMouseUp]);

  const handleNoteClick = (noteIndex: number) => {
    if (!dragState.isDragging && !dragState.hasMoved) {
      setSelectedNote(selectedNote === noteIndex ? null : noteIndex);
      // 播放点击的音符
      const note = midiData.notes[noteIndex];
      if (note) {
        playNotePreview(note.pitch);
      }
    }
  };

  const [isShiftPressed, setIsShiftPressed] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const snapToGrid = (value: number, gridSize: number = 1): number => {
    return Math.round(value / gridSize) * gridSize;
  };

  const handleRollMouseDown = (e: React.MouseEvent) => {
    if (dragState.isDragging) return;

    const rect = rollRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top + (rollRef.current?.scrollTop || 0);

    let clickTimeBeats = x / beatScale;
    if (!isShiftPressed) {
      clickTimeBeats = snapToGrid(clickTimeBeats, 1); // 吸附到1拍网格
    }
    clickTimeBeats = Math.max(0, clickTimeBeats);

    const keyIndex = Math.floor(y / keyHeight);

    if (keyIndex >= 0 && keyIndex < pianoKeys.length) {
      const pitch = pianoKeys[keyIndex].pitch;
      handleAddNote(pitch, clickTimeBeats);
    }
  };

  useEffect(() => {
    if (rollRef.current) {
      // 滚动到大约C5的位置（高音区）
      const targetPitch = 72; // C5
      const keyIndex = pianoKeys.findIndex((k) => k.pitch === targetPitch);
      if (keyIndex !== -1) {
        const scrollTop = keyIndex * keyHeight - 100; // 留一些上边距
        rollRef.current.scrollTop = scrollTop;
        if (pianoRef.current) {
          pianoRef.current.scrollTop = scrollTop;
        }
      }
    }
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (pianoRef.current && rollRef.current) {
      pianoRef.current.scrollTop = (e.target as HTMLDivElement).scrollTop;
    }
  };

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden bg-background">
      {/* 控制栏 */}
      <div className="flex items-center gap-2 p-3 border-b bg-muted/5">
        <Button
          onClick={() => store.togglePlayback()}
          type="primary"
          shape="circle"
          size="large"
          style={{
            backgroundColor: isPlaying ? "#ef4444" : "#22c55e",
            borderColor: isPlaying ? "#ef4444" : "#22c55e",
          }}
          icon={
            isPlaying ? (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )
          }
        />
        <div className="text-sm text-muted-foreground">
          {Math.floor(currentTime / 60000)}:
          {String(Math.floor((currentTime % 60000) / 1000)).padStart(2, "0")}.
          {String(Math.floor((currentTime % 1000) / 10)).padStart(2, "0")}
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="flex h-96 md:h-[500px]">
        <div className="w-20 md:w-24 bg-muted/10 border-r flex-shrink-0 relative z-20">
          <div
            ref={pianoRef}
            className="h-full overflow-hidden"
            style={{ overflowY: "hidden" }}
          >
            {pianoKeys.map((key) => (
              <div
                key={key.pitch}
                className={cn(
                  "border-b border-muted/20 flex items-center justify-end pr-2 text-xs font-mono cursor-pointer hover:bg-muted/30 transition-colors select-none",
                  key.isBlack
                    ? "bg-gray-900 text-white"
                    : "bg-background hover:bg-muted/20"
                )}
                style={{ height: `${keyHeight}px` }}
                onClick={() => {
                  // 只播放音符，不创建新note
                  playNotePreview(key.pitch);
                }}
              >
                <span className="text-[10px] md:text-xs font-medium">
                  {key.note}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-auto" onScroll={handleScroll}>
          <div
            ref={rollRef}
            style={{ width: `${maxTimeBeats * beatScale + 200}px` }}
            className="h-full bg-background relative"
            onMouseDown={handleRollMouseDown}
          >
            <div className="absolute inset-0 pointer-events-none">
              {pianoKeys.map(
                (key, index) =>
                  key.isBlack && (
                    <div
                      key={`black-bg-${key.pitch}`}
                      // 右侧黑键
                      className="absolute left-0 right-0 bg-gray-200"
                      style={{
                        top: `${index * keyHeight}px`,
                        height: `${keyHeight}px`,
                      }}
                    />
                  )
              )}
            </div>

            <div
              className="relative"
              style={{ minHeight: `${pianoKeys.length * keyHeight}px` }}
            >
              {/* 纵向Beat网格线 */}
              <div className="absolute inset-0 pointer-events-none">
                {Array.from({ length: Math.ceil(maxTimeBeats) + 1 }).map(
                  (_, i) => (
                    <div
                      key={`beat-line-${i}`}
                      className={cn(
                        "absolute top-0 bottom-0",
                        i % 4 === 0
                          ? "border-l-2 border-muted-foreground/30"
                          : "border-l border-muted-foreground/10"
                      )}
                      style={{ left: `${i * beatScale}px` }}
                    />
                  )
                )}
              </div>

              {midiData.notes.map((note, index) => {
                const keyIndex = pianoKeys.findIndex(
                  (k) => k.pitch === note.pitch
                );
                if (keyIndex === -1) return null;

                const left = note.start * beatScale;
                const width = Math.max(note.duration * beatScale, 30);
                const top = keyIndex * keyHeight + 2;
                const height = keyHeight - 4;

                const startMs = note.start * 1000;
                const endMs = startMs + note.duration * 1000;
                const isActive =
                  isPlaying && currentTime >= startMs && currentTime < endMs;
                const isSelected = selectedNote === index;
                const isDraggingThis =
                  dragState.isDragging && dragState.noteIndex === index;

                return (
                  <div
                    key={note.id || index}
                    className={cn(
                      "absolute border-2 group transition-all", // 移除borderRadius
                      isDraggingThis
                        ? "duration-0 shadow-2xl z-30 scale-105"
                        : "duration-150",
                      isActive && "ring-2 ring-primary/50 shadow-lg",
                      isSelected
                        ? "border-primary bg-primary/30 shadow-md"
                        : "border-primary/40 bg-primary/20 hover:bg-primary/30 hover:border-primary/60",
                      isDraggingThis ? "cursor-grabbing" : "cursor-grab"
                    )}
                    style={{
                      left: `${left}px`,
                      width: `${width}px`,
                      top: `${top}px`,
                      height: `${height}px`,
                      borderRadius: "0px", // 确保没有圆角
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNoteClick(index);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleNoteDelete(index);
                    }}
                    onMouseDown={(e) => handleMouseDown(e, index, "move")}
                  >
                    <div
                      className={cn(
                        "absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize bg-primary/60 transition-opacity",
                        isDraggingThis || isSelected
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      )}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleMouseDown(e, index, "resize-left");
                      }}
                    />

                    <div
                      className={cn(
                        "absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize bg-primary/60 transition-opacity",
                        isDraggingThis || isSelected
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100"
                      )}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleMouseDown(e, index, "resize-right");
                      }}
                    />

                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      {width > 40 && (
                        <span className="text-xs font-mono text-primary-foreground/90 font-medium">
                          {getNoteNameFromPitch(note.pitch)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {isPlaying && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-lg z-20 pointer-events-none"
                  style={{
                    left: `${(currentTime / 1000) * beatsPerSecond * beatScale}px`,
                  }}
                >
                  <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full shadow-md" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
