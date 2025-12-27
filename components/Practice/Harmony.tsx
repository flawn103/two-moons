import { NOTES } from "@/utils/calc";

import { convertChordToAbc } from "@/utils/abcConverter";
import MoaTone from "@/utils/MoaTone";
import { getRootAndOctave, parseInterval } from "@/utils/note";
import { getRandom } from "@/utils/number";
import {
  Slider,
  Radio,
  Button,
  Input,
  message,
  Modal,
  Select,
  Space,
} from "antd";
import { useCallback, useEffect, useState } from "react";
import { sample } from "lodash";
import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import { noteMap, chord as genChord } from "rad.js";
import {
  usePracticeState,
  PracticeComponent,
  RootInput,
  MultiSelect,
  usePlanProgressTracker,
} from "./components";
import styles from "./index.module.scss";
import { CHORDS } from "@/constants/harmony";
import { appStore } from "@/stores/store";
import { db } from "@/utils/indexedDB";
import { DeleteOutlined } from "@ant-design/icons";

// 自定义和弦数据结构
interface CustomChord {
  id: string;
  label: string;
  value: string;
  intervals: (string | number)[];
}

// 根据音程关系生成自定义和弦音符
const generateCustomChordNotes = (
  base: string,
  octave: number,
  intervals: (string | number)[]
) => {
  const baseNote = noteMap[base] || 0;
  const notes = intervals.map((interval) => {
    let semitones;
    if (typeof interval === "string") {
      semitones = parseInterval(interval);
    } else {
      // 向后兼容：如果是数字，直接使用
      semitones = interval;
    }
    const noteIndex = (baseNote + semitones) % 12;
    const noteOctave = octave + Math.floor((baseNote + semitones) / 12);
    const noteName =
      Object.keys(noteMap).find((key) => noteMap[key] === noteIndex) || "C";
    return `${noteName}${noteOctave}`;
  });
  return notes;
};

export const Harmony = () => {
  const { t } = useTranslation("practice");
  const { state, synthRef, resetStats } = usePracticeState(
    () => ({
      chords: ["m", "M"],
      shuffleTime: 1,
      root: "",
      octaveRange: [3, 4],
      pass: 0,
      all: 0,
      current: { octave: 0, base: "", chord: "", answer: "", notes: [] },
      customChords: [],
      showCustomChordModal: false,
      customChordIntervals: "",
    }),
    "PRACTICE_HARMONY_CONFIG",
    ["chords", "shuffleTime", "root", "octaveRange"]
  );
  usePlanProgressTracker("sings.chord", state);

  const [allChords, setAllChords] = useState([...CHORDS]);

  const {
    chords,
    shuffleTime,
    current,
    customChords,
    showCustomChordModal,
    octaveRange,
  } = useSnapshot(state);
  const { root: staticRoot, customChordIntervals } = useSnapshot(state, {
    sync: true,
  });

  // 加载自定义和弦
  const loadCustomChords = useCallback(async () => {
    try {
      const savedChords = await db.getItem("CUSTOM_CHORDS");
      if (savedChords) {
        const parsedChords = JSON.parse(savedChords);
        if (Array.isArray(parsedChords)) {
          state.customChords = parsedChords;
          setAllChords([...CHORDS, ...parsedChords]);
        }
      }
    } catch (error) {
      console.error("Failed to load custom chords:", error);
    }
  }, []);

  // 保存自定义和弦
  const saveCustomChords = useCallback(async (newChords: CustomChord[]) => {
    try {
      await db.setItem("CUSTOM_CHORDS", JSON.stringify(newChords));
    } catch (error) {
      console.error("Failed to save custom chords:", error);
    }
  }, []);

  // 添加自定义和弦
  const addCustomChord = useCallback(async () => {
    const intervals = state.customChordIntervals.trim();
    if (!intervals) {
      message.error(t("请输入音程关系"));
      return;
    }

    try {
      // 解析音程关系
      const intervalArray = intervals
        .split(/[\s,]+/)
        .map((str) => {
          const trimmed = str.trim();
          if (!trimmed) return null;

          // 验证音程是否有效
          try {
            parseInterval(trimmed); // 这里会抛出错误如果音程无效
            return trimmed; // 保存原始音程字符串
          } catch (error) {
            throw new Error(`无效的音程: ${trimmed}`);
          }
        })
        .filter(Boolean);

      // 确保包含根音（1）
      if (!intervalArray.includes("1")) {
        intervalArray.unshift("1");
      }

      // 按半音数排序
      intervalArray.sort((a, b) => parseInterval(a) - parseInterval(b));

      const customChordId = `custom_${Date.now()}`;
      const customChordLabel = `${intervals}`;

      const newCustomChord: CustomChord = {
        id: customChordId,
        label: customChordLabel,
        value: customChordId,
        intervals: intervalArray,
      };

      const updatedCustomChords = [...state.customChords, newCustomChord];
      state.customChords = updatedCustomChords;
      await saveCustomChords(updatedCustomChords);

      setAllChords([...CHORDS, ...updatedCustomChords]);

      // 自动将新增的自定义和弦加入到当前选择的和弦列表中
      if (!state.chords.includes(customChordId)) {
        state.chords = [...state.chords, customChordId];
      }

      state.showCustomChordModal = false;
      state.customChordIntervals = "";
      message.success(t("自定义和弦添加成功"));
    } catch (error) {
      message.error(t('音程格式错误，请输入如"3 5 7"的格式'));
    }
  }, [saveCustomChords, t]);

  const { isInit } = useSnapshot(appStore);

  // 初始化时加载自定义和弦
  useEffect(() => {
    if (!isInit) return;
    loadCustomChords();
  }, [isInit]);

  const newChord = () => {
    const chord = sample(chords);
    state.current.chord = chord;
    // 如果设置了根音，使用设置的根音，否则随机生成
    if (staticRoot && staticRoot.trim()) {
      // 解析根音，提取音名和八度部分
      const rootMatch = staticRoot.match(/^([A-G][#b]?)(\d+)?/);
      if (rootMatch) {
        state.current.base = rootMatch[1];
        // 如果用户指定了八度，使用用户的八度，否则在选择的八度范围内随机生成
        state.current.octave = rootMatch[2]
          ? parseInt(rootMatch[2])
          : getRandom(octaveRange[0], octaveRange[1]);
      } else {
        state.current.base = sample(NOTES);
        state.current.octave = getRandom(3, 5);
      }
    } else {
      state.current.base = sample(NOTES);
      state.current.octave = getRandom(octaveRange[0], octaveRange[1]);
    }
    state.current.answer = "";
    state.all += 1;
  };

  const play = async () => {
    if (!synthRef.current)
      synthRef.current = new MoaTone.Synth({
        preset: appStore.audioPreset.piano,
      }).toDestination();

    let notes;
    const currentChord = state.current.chord;

    // 检查是否为自定义和弦
    const customChord = customChords.find((c) => c.value === currentChord);
    if (customChord) {
      notes = generateCustomChordNotes(
        state.current.base,
        state.current.octave,
        customChord.intervals
      );
    } else {
      notes = genChord(state.current.base + currentChord, state.current.octave);
    }

    await MoaTone.start();

    // 使用 triggerAttackReleaseArpeggio 的琶音功能
    const arpeggioInterval = shuffleTime * 0.05; // 转换为秒
    synthRef.current.triggerAttackReleaseArpeggio(
      notes,
      arpeggioInterval,
      MoaTone.Time.toSeconds("2n")
    );
  };

  const playOption = async (chordType) => {
    if (!synthRef.current)
      synthRef.current = new MoaTone.Synth({
        preset: "sine",
      }).toDestination();

    let notes;

    // 检查是否为自定义和弦
    const customChord = customChords.find((c) => c.value === chordType);
    if (customChord) {
      notes = generateCustomChordNotes(
        state.current.base,
        state.current.octave,
        customChord.intervals
      );
    } else {
      notes = genChord(state.current.base + chordType, state.current.octave);
    }

    await MoaTone.start();

    // 使用 triggerAttackReleaseArpeggio 的琶音功能
    const arpeggioInterval = shuffleTime * 0.05; // 转换为秒
    synthRef.current.triggerAttackReleaseArpeggio(
      notes,
      arpeggioInterval,
      MoaTone.Time.toSeconds("2n")
    );
  };

  useEffect(() => {
    resetStats();
    newChord();
  }, [chords, shuffleTime, staticRoot, octaveRange]);

  return (
    <>
      <PracticeComponent
        title={t("和弦辨认")}
        imageSrc="/pics/harmony.png"
        imageAlt="harmony"
        state={state}
        onPlay={play}
        onNewQuestion={newChord}
        onOptionPlay={playOption}
        staffNotationWidth={120}
        getCorrectAnswer={() => current.chord}
        getCurrentAnswer={() => current.answer}
        onAnswerChange={(value) => {
          state.current.answer = value;
        }}
        getStaffNotationData={(correctAnswer) => {
          let notes;

          // 检查是否为自定义和弦
          const customChord = customChords.find(
            (c) => c.value === correctAnswer
          );
          if (customChord) {
            notes = generateCustomChordNotes(
              state.current.base,
              state.current.octave,
              customChord.intervals
            );
          } else {
            notes = genChord(
              state.current.base + correctAnswer,
              state.current.octave,
              "b"
            );
          }

          if (notes && notes.length > 0) {
            const abcNotation = convertChordToAbc(
              notes.map((n) => {
                const { root, octave } = getRootAndOctave(n);
                return {
                  name: root,
                  octave: octave,
                };
              })
            );
            return {
              abcNotation: abcNotation,
            };
          }
          return null;
        }}
        renderOptions={(hasAnswered, onOptionPlay) => {
          const correctAnswer = current.chord;
          return chords.map((i) => {
            // 查找和弦标签
            let chordLabel;
            const standardChord = CHORDS.find((c) => i === c.value);
            if (standardChord) {
              chordLabel = standardChord.label;
            } else {
              const customChord = customChords.find((c) => i === c.value);
              chordLabel = customChord ? customChord.label : i;
            }

            return (
              <Radio.Button
                key={i}
                value={i}
                className={
                  hasAnswered && i === correctAnswer
                    ? styles["checkbox--right"]
                    : ""
                }
                onClick={() => onOptionPlay && onOptionPlay(i)}
              >
                {chordLabel}
              </Radio.Button>
            );
          });
        }}
        renderExtra={() => (
          <div className="space-y-3">
            <Space align="start">
              <RootInput
                value={staticRoot}
                onChange={(val) => (state.root = val)}
                tooltip={t(
                  '根音为空时随机生成根音和八度。按照形似"C4"、"Bb4"来填写。如果只填写音名"C"，则八度随机生成'
                )}
              />
              <MultiSelect
                label={t("和弦")}
                value={chords}
                onChange={(val) => {
                  // 检查是否选择了"自定义和弦+"
                  if (val.includes("custom_add")) {
                    state.showCustomChordModal = true;
                    // 移除"自定义和弦+"选项，因为它不是真正的和弦
                    const filteredVal = val.filter((v) => v !== "custom_add");
                    state.chords = filteredVal;
                  } else {
                    state.chords = val;
                  }
                }}
                options={[
                  ...allChords,
                  { label: t("自定义+"), value: "custom_add" },
                ]}
              />
              <span className="flex flex-col md:inline-block">
                {t("速度")}{" "}
                <Select
                  virtual={false}
                  options={[0, 1, 2, 3, 4, 5].map((i) => ({
                    label: i,
                    value: i,
                  }))}
                  value={shuffleTime}
                  onChange={(v) => (state.shuffleTime = v)}
                />
              </span>
            </Space>
            <div className="flex items-center space-x-3">
              <span className="text-sm">{t("八度范围")}</span>
              <div className="flex-1 max-w-xs">
                <Slider
                  range
                  min={2}
                  max={6}
                  value={octaveRange}
                  onChange={(value) => (state.octaveRange = value)}
                  marks={{
                    2: "2",
                    3: "3",
                    4: "4",
                    5: "5",
                    6: "6",
                  }}
                />
              </div>
            </div>
          </div>
        )}
        customTitle={undefined}
      />

      <Modal
        title={t("自定义和弦")}
        open={showCustomChordModal}
        footer={null}
        onCancel={() => {
          state.showCustomChordModal = false;
          state.customChordIntervals = "";
        }}
        width={600}
      >
        <div className="space-y-4">
          {/* 已有自定义和弦列表 */}
          {customChords.length > 0 && (
            <div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {customChords.map((chord) => (
                  <div
                    key={chord.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <span>{chord.label}</span>
                    <Button
                      type="text"
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={async () => {
                        const updatedCustomChords = customChords.filter(
                          (c) => c.id !== chord.id
                        );
                        state.customChords = updatedCustomChords;
                        await saveCustomChords(updatedCustomChords);
                        setAllChords([...CHORDS, ...updatedCustomChords]);

                        // 从当前选择的和弦列表中移除被删除的自定义和弦
                        const updatedChords = chords.filter(
                          (c) => c !== chord.value
                        );
                        state.chords = updatedChords;

                        // 检查当前选择的和弦是否被删除，如果是则清理并重新生成
                        if (current.chord === chord.value) {
                          // 清理当前选择的和弦
                          state.current.chord = "";
                          state.current.answer = "";
                          // 重新生成新的和弦
                          newChord();
                        }

                        message.success(t("删除成功"));
                      }}
                    ></Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 添加新和弦 */}
          <div>
            <div className="text-sm text-gray-500 mb-2">
              {t("请输入与根音的音程关系(空格分隔)：")}
            </div>
            <span className="flex items-center gap-1">
              <Input
                addonBefore={"1"}
                placeholder={t("3 5 b7")}
                value={customChordIntervals}
                onChange={(e) => (state.customChordIntervals = e.target.value)}
                onPressEnter={addCustomChord}
              />
              <Button onClick={addCustomChord} type="primary">
                {t("添加")}
              </Button>
            </span>
          </div>
        </div>
      </Modal>
    </>
  );
};
