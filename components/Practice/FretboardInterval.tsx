import { GuitarEditor } from "@/components/ChordEditor/GuitarEditor";
import {
  getAbsoluteInterval,
  absoluteIntervalToNote,
  GUITAR_TUNING,
} from "@/utils/calc";
import { useIntervalLabels } from "@/constants/intervals";
import { convertIntervalToAbc } from "@/utils/abcConverter";
import MoaTone from "@/utils/MoaTone";
import { getRandom } from "@/utils/number";
import { Slider, Radio } from "antd";
import { useEffect, useMemo, useState } from "react";
import { sample } from "lodash";
import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import { noteMap, intervalArrToNotesO } from "rad.js";
import {
  usePracticeState,
  PracticeComponent,
  RootInput,
  MultiSelect,
  usePlanProgressTracker,
} from "./components";
import styles from "./index.module.scss";
import { appStore } from "@/stores/store";

export const Fretboard = () => {
  const { t } = useTranslation("practice");
  const { state, synthRef, resetStats } = usePracticeState(
    () => ({
      intervals: [3, 4, 5, 7, 10, 11], // 默认选择小三、纯五、小七
      octaveRange: [0, 0], // 默认八度范围[0,2]
      pass: 0,
      root: "",
      all: 0,
      current: {
        base: "",
        interval: 0,
        answer: 0,
        notes: [],
      },
    }),
    "FRETBOARD_PRACTICE",
    ["intervals", "root", "octaveRange"]
  );

  const { intervals, current, octaveRange } = useSnapshot(state);
  const { root } = useSnapshot(state, { sync: true });
  usePlanProgressTracker("guitar.interval", state);

  const MAX_FRET = 15;
  const MIN_FRET = 0;

  // 获取国际化的音程标签
  const intervalLabels = useIntervalLabels();

  // 兜底处理：确保 intervals 至少有一个选项
  const safeIntervals = intervals;
  const intervalOpts = intervalLabels.filter((i) =>
    safeIntervals.includes(i.value)
  );

  const newNotes = () => {
    // 定义吉他有效音域范围（E2-E5）
    const minValidInterval = getAbsoluteInterval({ name: "E", octave: 2 });
    const maxValidInterval = getAbsoluteInterval({ name: "G", octave: 5 });
    let lowInterval;
    let highInterval;
    let interval;
    let genByUserRoot = false;

    if (root) {
      const rootInterval = getAbsoluteInterval(root);
      // 枚举所有可能的 octave 与 interval 组合，filter 为一个 sample 池子
      // 从 sample 抽取一个
      const safeCollection = [];

      // 枚举所有可能的音程和八度组合
      for (const distance of safeIntervals) {
        for (const addOctave of octaveRange) {
          const totalSpan = distance + addOctave * 12;
          const highInterval = rootInterval + totalSpan;

          // 检查是否在有效音域范围内
          if (
            rootInterval >= minValidInterval &&
            highInterval <= maxValidInterval
          ) {
            safeCollection.push({ addOctave, distance });
          }
        }
      }

      // 如果没有有效组合，走老逻辑
      if (safeCollection.length === 0) {
        genByUserRoot = false;
      } else {
        const { addOctave, distance } = sample(safeCollection);
        state.current.addOctave = addOctave;

        // 计算音程位置
        lowInterval = rootInterval;
        highInterval = rootInterval + distance + addOctave * 12;
        interval = distance;
        genByUserRoot = true;
      }
    }

    // 如果不是从用户配置生成，走普通生成逻辑
    if (!genByUserRoot) {
      const distance = sample(safeIntervals);
      state.current.addOctave = sample(state.octaveRange);
      // 计算总跨度
      const totalSpan = distance + state.current.addOctave * 12;

      const calculateOptimalInterval = () => {
        // 计算低音的理论范围
        const lowMax = maxValidInterval - totalSpan;
        const low = getRandom(minValidInterval, lowMax);
        const high = low + totalSpan;

        return { low, high };
      };

      const { low, high } = calculateOptimalInterval();
      lowInterval = low;
      highInterval = high;
      interval = distance;
    }

    // 生成两个音符
    const lowNote = absoluteIntervalToNote(lowInterval);
    const highNote = absoluteIntervalToNote(highInterval);

    // 转换为字符串格式
    const notes = [
      `${lowNote.name}${lowNote.octave}`,
      `${highNote.name}${highNote.octave}`,
    ];

    state.current.interval = interval;
    state.current.notes = notes;
    state.current.answer = 0;
    state.all += 1;
  };

  const [_, update] = useState({});

  const playOption = async (option) => {
    if (!synthRef.current)
      synthRef.current = new MoaTone.Synth({
        preset: appStore.audioPreset["guitar"],
      }).toDestination();
    const { notes } = state.current;

    const intervalValue = option.value + state.current.addOctave * 12;
    const baseNote = notes[0];

    if (!baseNote || typeof baseNote !== "string") {
      return;
    }

    const baseNoteName = baseNote.slice(0, -1);
    const baseOctave = parseInt(baseNote.slice(-1));
    const baseInterval = noteMap[baseNoteName];

    if (baseInterval === undefined || isNaN(baseOctave)) {
      return;
    }

    const targetIntervalArr = [baseInterval, baseInterval + intervalValue];
    const targetNotes = intervalArrToNotesO(targetIntervalArr, baseOctave, "#");

    if (!targetNotes || targetNotes.length < 2) {
      return;
    }

    const targetNote = targetNotes[1];

    await MoaTone.start();
    synthRef.current.triggerAttackRelease(
      baseNote,
      MoaTone.Time.toSeconds("4n")
    );

    setTimeout(
      () =>
        synthRef.current.triggerAttackRelease(
          targetNote,
          MoaTone.Time.toSeconds("4n")
        ),
      500
    );
  };

  useEffect(() => {
    resetStats();
    newNotes();
  }, [intervals, root, octaveRange]);

  const nextQuestion = () => {
    newNotes();
  };

  // 将音符转换为吉他指板位置的辅助函数（支持单个音符）
  const noteToFretPosition = (note: {
    name: string;
    octave: number;
  }): { string: number; fret: number } => {
    const targetMidiO = getAbsoluteInterval(note);
    let bestString = 0;
    let minFretDistance = Infinity;
    let bestFret = 0;

    // 寻找最合适的弦和品
    for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
      const openNote = GUITAR_TUNING[stringIndex];
      const openIntervalO = getAbsoluteInterval(openNote);
      const fret = targetMidiO - openIntervalO;

      if (fret >= MIN_FRET && fret <= MAX_FRET) {
        // 优先选择品格较小的位置
        if (fret < minFretDistance) {
          minFretDistance = fret;
          bestString = stringIndex;
          bestFret = fret;
        }
      }
    }

    return { string: bestString, fret: bestFret };
  };

  // 计算多个音符的最优指法组合，选择纵向距离最小的
  const findOptimalPositions = (
    notes: string[]
  ): { string: number; fret: number }[] => {
    const notePositions = notes.map((note) => {
      const noteName = note.slice(0, -1);
      const octave = parseInt(note.slice(-1));
      const targetMidiO = getAbsoluteInterval({ name: noteName, octave });

      // 收集所有可能的弦和品组合
      const possiblePositions: { string: number; fret: number }[] = [];
      for (let stringIndex = 0; stringIndex < 6; stringIndex++) {
        const openNote = GUITAR_TUNING[stringIndex];
        const openIntervalO = getAbsoluteInterval(openNote);
        const fret = targetMidiO - openIntervalO;

        if (fret >= MIN_FRET && fret <= MAX_FRET) {
          possiblePositions.push({ string: stringIndex, fret });
        }
      }
      return possiblePositions;
    });

    // 如果没有有效位置，返回默认位置
    if (notePositions.some((positions) => positions.length === 0)) {
      return notes.map((note) =>
        noteToFretPosition({
          name: note.slice(0, -1),
          octave: parseInt(note.slice(-1)),
        })
      );
    }

    // 对于两个音符的情况，先过滤纵向距离 < 4 的组合进行 sample
    if (notePositions.length === 2) {
      const validCombinations: { string: number; fret: number }[][] = [];
      let minVerticalDistance = Infinity;
      let bestCombination: { string: number; fret: number }[] = [];

      // 穷举所有组合
      for (const pos1 of notePositions[0]) {
        for (const pos2 of notePositions[1]) {
          const distance =
            // Math.abs(pos1.string - pos2.string) +
            Math.abs(pos1.fret - pos2.fret);

          // 收集纵向距离 < 4 的组合
          if (distance < 4) {
            validCombinations.push([pos1, pos2]);
          }

          // 同时记录最小距离的组合作为兜底
          if (distance < minVerticalDistance) {
            minVerticalDistance = distance;
            bestCombination = [pos1, pos2];
          }
        }
      }

      if (validCombinations.length > 0) {
        return sample(validCombinations);
      }

      // 否则使用纵向距离最小的组合
      return bestCombination;
    } else {
      // 对于单个音符，使用原来的逻辑
      return notes.map((note) =>
        noteToFretPosition({
          name: note.slice(0, -1),
          octave: parseInt(note.slice(-1)),
        })
      );
    }
  };

  const guitarPositions = useMemo(
    () => findOptimalPositions(current.notes),
    [current.notes]
  );

  const renderGuitarFretboard = () => {
    // 计算最优指法组合，选择纵向距离最小的
    let minFret = Math.min(...guitarPositions.map((p) => p.fret)) - 1;
    minFret = minFret < 0 ? 0 : minFret;
    const maxFret = minFret + 5;

    // 创建 InstrumentData 对象
    const instrumentData = {
      instrument: "guitar" as const,
      range: {
        start: minFret,
        end: maxFret,
      },
      guitarData: guitarPositions,
      userSelectedRoot: null,
    };

    return (
      <div className="guitar-display text-center">
        <h2>{t("选择两个音的音程")}</h2>
        {/* <button onClick={() => update({})}>update</button> */}
        <div className="pr-4">
          <GuitarEditor
            instrumentData={instrumentData}
            onDataChange={() => {}} // 只读模式，不允许修改
            fretRange={instrumentData.range}
            showNoteName={!!current.answer}
            showInterval={false}
            showFretBtn={false}
          />
        </div>
        <div className="mb-4"></div>
      </div>
    );
  };

  return (
    <PracticeComponent
      title={t("指板音程")}
      // imageSrc="/pics/interval.jpg"
      imageAlt="fretboard practice"
      state={state}
      answerTip={t("点击选项/指板可以听对应的音频")}
      onNewQuestion={nextQuestion}
      staffNotationWidth={130}
      getCorrectAnswer={() => current.interval}
      getCurrentAnswer={() => current.answer}
      onAnswerChange={(answer) => {
        state.current.answer = answer;
      }}
      onOptionPlay={playOption}
      customTitle={renderGuitarFretboard()}
      getStaffNotationData={() => {
        if (current.notes && current.notes.length >= 2) {
          return {
            abcNotation: convertIntervalToAbc(current.notes, 1),
          };
        }
        return null;
      }}
      renderExtra={() => (
        <div className="space-y-3">
          <span className="flex gap-2">
            <RootInput
              value={root}
              onChange={(val) => {
                state.root = val;
              }}
              tooltip={t(
                '根音为空时随机生成根音和八度。按照形似"C4"、"Bb4"来填写。'
              )}
            />

            <MultiSelect
              label={t("音程选择")}
              value={intervals}
              onChange={(val) => {
                state.intervals = val;
              }}
              options={intervalLabels}
            />
          </span>
          <div className="flex items-center space-x-3">
            <span className="text-sm">{t("八度范围")}</span>
            <div className="flex-1 max-w-xs">
              <Slider
                range
                min={0}
                max={2}
                value={octaveRange}
                onChange={(value) => (state.octaveRange = value)}
                marks={{
                  0: "0",
                  1: "1",
                  2: "2",
                }}
              />
            </div>
          </div>
        </div>
      )}
      renderOptions={(hasAnswered, onOptionPlay) => {
        const correctAnswer = current.interval;
        return intervalOpts.map((i) => (
          <Radio.Button
            key={i.value}
            value={i.value}
            className={
              hasAnswered && i.value === correctAnswer
                ? styles["checkbox--right"]
                : ""
            }
            onClick={() => onOptionPlay && onOptionPlay(i)}
          >
            {i.label}
          </Radio.Button>
        ));
      }}
    />
  );
};
