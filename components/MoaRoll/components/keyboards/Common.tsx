import React, { useCallback } from "react";
import { Note, PITCH_MOD } from "../../typings/common";
import styles from "./index.module.scss";
import classNames from "classnames";
import { getFullNoteStr, separateNoteStr } from "../../utils/note";
import { observer } from "mobx-react";
import { useContext, useEffect, useState, useRef } from "react";
import { RollContext } from "../../Roll";
import { KeyboardStore, genKeysFnMap } from "./Store";
import { ITEM_WIDTH } from "./constants";
import { isMobile } from "@/utils/env";
import { singNameMap } from "rad.js";
import _ from "lodash";
import { Tooltip } from "antd";
import { offsetXToClass } from "@/utils/dom";

const getSingleNoteStr = (str: string, mod: PITCH_MOD = PITCH_MOD.FLAT) => {
  const retainIndexMap = {
    sharp: 0,
    flat: 1,
  };
  if (str.includes("/")) {
    if (!_.isUndefined(retainIndexMap[mod])) {
      return str.split("/")[retainIndexMap[mod]];
    } else return str;
  } else return str;
};

export const CommonKeyboard: React.FC<{
  instrument: string;
  notes: Note[];
  activeKeys: string[];
  range?: [string, string];
  squash: boolean;
  width: number;
  keyboardPiano?: boolean;
  scales?: string[];
  scaleType?: string;
}> = observer(
  ({
    notes,
    squash,
    keyboardPiano,
    scales,
    scaleType,
    range,
    activeKeys,
    width,
    instrument,
  }) => {
    const genKeysFn =
      genKeysFnMap[instrument as keyof typeof genKeysFnMap] ||
      genKeysFnMap.default;

    // 获取纵向的音符
    const keys = genKeysFn(
      notes.map((note) => note.value),
      range
    );

    const store = useContext(RollContext);
    const [keyboardStore] = useState(new KeyboardStore(store, instrument));

    useEffect(() => {
      if (keyboardPiano) {
        keyboardStore.mountKeyboardEvent();
        return () => keyboardStore.unmountKeyboardEvents();
      }
    }, [store.keyboardOctave, keyboardPiano]);

    // 添加 window mouseup 事件监听
    useEffect(() => {
      const handleWindowMouseUp = () => {
        if (keyboardStore.isActive) {
          keyboardStore.stopCurrentNotes();
          keyboardStore.setPreviewActive(false);
        }
      };

      window.addEventListener("mouseup", handleWindowMouseUp);
      window.addEventListener("touchend", handleWindowMouseUp);
      return () => {
        window.removeEventListener("mouseup", handleWindowMouseUp);
        window.removeEventListener("touchend", handleWindowMouseUp);
      };
    }, []);

    if (
      !notes.length &&
      !(store.timeLength && range) &&
      !store.ctrs[instrument].isNoise
    )
      return <div className={styles.empty}>NO DATA</div>;

    // 最上方导航器，点击可以播放这一列的音符
    const PlayNotesRow = useCallback(
      observer(() => {
        const length = store.keyboardLength;

        return (
          <div className={styles["notes-play"]}>
            <div
              className={styles["item-grid-row"]}
              style={{
                width: squash ? "100%" : "",
              }}
            >
              {Array(length)
                .fill("grid")
                .map((_, index) => {
                  return (
                    <div
                      className={classNames(
                        styles.item,
                        (index === store.step ||
                          keyboardStore.currentPreviewIndex === index) &&
                          styles["item-grid--active"]
                      )}
                      key={index}
                      onPointerDown={() => {
                        keyboardStore.setPreviewActive(true, index);
                        keyboardStore.playNotesAtIndex(index);
                      }}
                      onPointerEnter={() => {
                        if (keyboardStore.isActive) {
                          keyboardStore.setPreviewActive(true, index);
                          keyboardStore.playNotesAtIndex(index);
                        }
                      }}
                      style={{
                        width: ITEM_WIDTH,
                      }}
                    >
                      {isMobile() ? "" : index + 1}
                    </div>
                  );
                })}
            </div>
          </div>
        );
      }),
      []
    );

    const Notes: React.FC<{ notes: Note[]; value: string }> = useCallback(
      observer(({ notes, value }) => {
        const length = store.keyboardLength;
        const touchRef = useRef({
          startX: 0,
          startY: 0,
          isScrolling: false,
          startNote: null as any,
        });

        const items = [];
        let index = 0;
        while (index < length) {
          const currentActiveNote = notes.find((note) => note.time === index);

          if (currentActiveNote) {
            const { duration } = currentActiveNote;
            items.push({
              type: "note",
              length: duration || 1,
              index: [index, index + (duration || 1) - 1],
            });
            index += duration || 1;
          } else {
            items.push({
              type: "empty",
              length: 1,
              index: [index, index],
            });
            index += 1;
          }
        }

        const { setStartNote, setEndNote } = keyboardStore;
        const { name } = separateNoteStr(value);
        const isRoot = scales?.indexOf(name) === 0;

        return (
          <div className={styles["notes-row"]}>
            {/* grid层主要用作交互，上层的item-notes只负责展示 */}
            <div
              className={styles["item-grid-row"]}
              style={{
                width: squash ? "100%" : "",
              }}
              onTouchStart={(e) => {
                // e.preventDefault();
                const itemWidth =
                  (document.querySelector(`.${styles.item}`) as HTMLElement)
                    ?.offsetWidth || 0;
                const col = Math.floor(
                  offsetXToClass(e, styles["item-grid-row"]) / itemWidth
                );

                const touch = e.touches[0];
                touchRef.current = {
                  startX: touch.clientX,
                  startY: touch.clientY,
                  isScrolling: false,
                  startNote: { value, time: col },
                };
              }}
              onTouchMove={(e) => {
                const touch = e.touches[0];
                const dy = touch.clientY - touchRef.current.startY;
                if (Math.abs(dy) > 10) {
                  touchRef.current.isScrolling = true;
                }
              }}
              onTouchEnd={(e) => {
                if (touchRef.current.isScrolling) return;
                e.preventDefault();
                const { startNote } = touchRef.current;
                if (startNote) {
                  setStartNote(startNote);
                  const itemWidth =
                    (document.querySelector(`.${styles.item}`) as HTMLElement)
                      ?.offsetWidth || 0;
                  const col = Math.floor(
                    offsetXToClass(e, styles["item-grid-row"]) / itemWidth
                  );
                  setEndNote({ value, time: col });
                }
              }}
            >
              {Array(length)
                .fill("grid")
                .map((_, index) => {
                  const currNote = {
                    value,
                    time: index,
                  };
                  return (
                    <div
                      className={classNames(
                        styles.item,
                        (index === store.step ||
                          keyboardStore.currentPreviewIndex === index) &&
                          styles["item-grid--active"]
                      )}
                      key={index}
                      // 这里mousedown之后，dom会消失，可能造成外层不能触发click
                      onMouseDown={() => {
                        !isMobile() && setStartNote(currNote);
                      }}
                      onMouseUp={() => {
                        !isMobile() && setEndNote(currNote);
                      }}
                      style={{
                        width: ITEM_WIDTH,
                      }}
                    ></div>
                  );
                })}
            </div>

            {/* 上层的item-notes只负责展示 */}
            <div
              className={styles["item-notes"]}
              style={{
                width: squash ? "100%" : "",
              }}
            >
              {items.map((item, index) => {
                const currentNote = notes.find(
                  (note) => note.time === item.index[0]
                );
                return (
                  <div
                    key={index}
                    className={classNames(
                      styles.note,
                      item.type === "note" && styles["item-note"],
                      item.index[0] <= store.step &&
                        store.step <= item.index[1] &&
                        styles["item-note--active"],
                      keyboardStore.isActive &&
                        keyboardStore.currentPreviewIndex !== null &&
                        item.index[0] <= keyboardStore.currentPreviewIndex &&
                        keyboardStore.currentPreviewIndex <= item.index[1] &&
                        styles["item-note--preview"],
                      currentNote?.tip && styles["item-note--has-tip"]
                    )}
                    style={{
                      width: (item.length ? item.length : 1) * ITEM_WIDTH,
                    }}
                    onClick={(e) => {
                      // Handle note deletion on click
                      if (item.type === "note" && currentNote) {
                        keyboardStore.clearExistNote(currentNote);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (item.type === "note" && currentNote) {
                        keyboardStore.handleNoteRightClick(
                          e,
                          currentNote,
                          value
                        );
                      }
                    }}
                  >
                    {currentNote?.tip && (
                      <Tooltip title={currentNote.tip} placement="top">
                        <div className={styles["tip-indicator"]}></div>
                      </Tooltip>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 上层的item-notes只负责展示 */}
            <div
              className={styles["row-hightlight"]}
              style={{
                backgroundColor: scales?.includes(name)
                  ? `rgba(255,87,34,${isRoot ? 0.3 : 0.08})`
                  : "",
              }}
            ></div>
          </div>
        );
      }),
      []
    );

    // 左侧键盘
    return (
      <div className={styles.container}>
        <div
          className={styles.keys}
          style={{
            marginTop: 26,
          }}
          onMouseLeave={() => {
            keyboardStore.isPressing = false;
          }}
        >
          {keys?.map((keyName) => {
            const { name } = separateNoteStr(keyName);
            const singName = scaleType
              ? singNameMap[scaleType][scales?.indexOf(name)]
              : "";
            const isRoot = scales?.indexOf(name) === 0;

            return (
              <div
                key={keyName}
                onTouchStart={() => {
                  keyboardStore.isPressing = true;
                  store.attackNote(store.currentTrack, {
                    value: getSingleNoteStr(keyName),
                  });
                }}
                onTouchEnd={() => {
                  store.releaseNote(store.currentTrack, {
                    value: getSingleNoteStr(keyName),
                  });
                  keyboardStore.isPressing = false;
                }}
                onMouseDown={() => {
                  if (isMobile()) return;
                  keyboardStore.isPressing = true;
                  store.attackNote(store.currentTrack, {
                    value: getSingleNoteStr(keyName),
                  });
                }}
                onMouseUp={() => {
                  if (isMobile()) return;
                  store.releaseNote(store.currentTrack, {
                    value: getSingleNoteStr(keyName),
                  });
                  keyboardStore.isPressing = false;
                }}
                onMouseLeave={() => {
                  store.releaseNote(store.currentTrack, {
                    value: getSingleNoteStr(keyName),
                  });
                }}
                onMouseMove={(e) => {
                  e.preventDefault();
                  if (keyboardStore.isPressing === true) {
                    store.attackNote(store.currentTrack, {
                      value: getSingleNoteStr(keyName),
                    });
                  }
                }}
                className={classNames(
                  styles.key,
                  activeKeys.includes(keyName) && styles["key--active"],
                  (keyName.includes("b") || keyName.includes("#")) &&
                    styles["key--pitch"]
                )}
              >
                {keyboardPiano ? (
                  <span className={styles["key-code"]}>
                    {keyboardStore.noteToKeyMap[keyName]?.slice(-1)}
                  </span>
                ) : (
                  <div />
                )}
                <span>{getSingleNoteStr(keyName)}</span>
                <span
                  style={{
                    fontSize: 10,
                    marginLeft: 2,
                    color: isRoot ? "#ff5722" : "#ffc2af",
                  }}
                >
                  {singName}
                </span>
              </div>
            );
          })}
        </div>

        <div
          className={classNames(styles.notes, "roll-notes")}
          style={{
            maxWidth: width,
          }}
        >
          <PlayNotesRow />
          {keys?.map((keyName) => {
            return (
              <Notes
                key={keyName}
                value={keyName}
                notes={notes.filter((note) => {
                  const currentInstrument = store.ctrs[instrument];
                  let fullNoteStr;
                  if (currentInstrument.isNoise) fullNoteStr = note.value;
                  else fullNoteStr = getFullNoteStr(note.value);

                  return fullNoteStr === keyName;
                })}
              />
            );
          })}
        </div>
      </div>
    );
  }
);
