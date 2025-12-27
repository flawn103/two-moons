import { useIntervalLabels } from "@/constants/intervals";
import { convertIntervalToAbc } from "@/utils/abcConverter";
import MoaTone, { MoaTime } from "@/utils/MoaTone";
import { getRootAndOctave } from "@/utils/note";
import { getRandom } from "@/utils/number";
import { Radio, Select } from "antd";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import {
  MultiSelect,
  PracticeComponent,
  RootInput,
  usePlanProgressTracker,
  usePracticeState,
} from "./components";
import { noteMap } from "rad.js";
import { semitonePairToNotes } from "@/utils/interval";
import { sample } from "lodash";
import styles from "./index.module.scss";
import { appStore } from "@/stores/store";

export const Interval = () => {
  const { t } = useTranslation("practice");
  const { state, synthRef, resetStats } = usePracticeState(
    () => ({
      intervals: [3, 4],
      direction: "ascending", // "ascending" 上行, "descending" 下行
      pass: 0,
      root: "",
      all: 0,
      current: { base: "", interval: 0, answer: 0, notes: [] },
    }),
    "PRACTICE_INTERVAL_CONFIG",
    ["intervals", "root", "direction"]
  );
  usePlanProgressTracker("sings.interval", state);

  const { intervals, current, direction } = useSnapshot(state);
  const { root } = useSnapshot(state, { sync: true });

  // 获取国际化的音程标签
  const intervalLabels = useIntervalLabels();

  // 兜底处理：确保 intervals 至少有一个选项
  const safeIntervals = intervals && intervals.length > 0 ? intervals : [3, 4];
  const intervalOpts = intervalLabels.filter((i) =>
    safeIntervals.includes(i.value)
  );

  const newNotes = () => {
    MoaTone.Transport.cancel();
    const distance = sample(safeIntervals);
    let rootInterval = getRandom(0, 11);
    let octave = getRandom(3, 4);
    if (root) {
      const value = getRootAndOctave(root);
      const mapped = noteMap[value.root];
      rootInterval = typeof mapped === "number" ? mapped : 0;
      octave = Number.isFinite(value.octave) ? value.octave : octave;
    }

    // 根据方向计算音程
    let notes: string[];
    if (direction === "descending") {
      // 下行：第二个音比第一个音低
      notes = semitonePairToNotes(
        [rootInterval, rootInterval - distance],
        octave
      );
    } else {
      // 上行：第二个音比第一个音高（默认行为）
      notes = semitonePairToNotes(
        [rootInterval, rootInterval + distance],
        octave
      );
    }

    state.current.interval = distance;
    state.current.notes = notes;
    state.current.answer = 0;
    state.all += 1;
  };

  const play = async () => {
    if (!synthRef.current)
      synthRef.current = new MoaTone.Synth({
        preset: appStore.audioPreset.piano,
      }).toDestination();
    const { notes } = state.current;

    // 兜底处理：确保 notes 数组有效
    if (!notes || notes.length < 2) {
      console.warn("音程练习：notes 数组无效，重新生成");
      newNotes();
      return;
    }

    await MoaTone.start();
    synthRef.current.triggerAttackRelease(
      notes[0],
      MoaTone.Time.toSeconds("8n")
    );
    MoaTone.schedule(
      (t) =>
        synthRef.current.triggerAttackRelease(
          notes[1],
          MoaTone.Time.toSeconds("8n"),
          t
        ),
      MoaTone.now() + 0.9
    );
  };

  const playOption = async (intervalValue) => {
    if (!synthRef.current)
      synthRef.current = new MoaTone.Synth().toDestination();
    const { notes } = state.current;

    // 兜底处理：确保 notes 数组有效
    if (!notes || notes.length < 1) {
      console.warn("音程练习：notes 数组无效，无法播放选项");
      return;
    }

    const baseNote = notes[0];
    const baseNoteValue = noteMap[baseNote.slice(0, -1)] || 0;

    // 根据方向计算目标音符
    let targetNoteValue;
    if (direction === "descending") {
      // 下行：目标音比基础音低
      targetNoteValue = baseNoteValue - intervalValue;
    } else {
      // 上行：目标音比基础音高（默认行为）
      targetNoteValue = baseNoteValue + intervalValue;
    }

    const targetNote = semitonePairToNotes(
      [baseNoteValue, targetNoteValue],
      parseInt(baseNote.slice(-1))
    )[1];

    await MoaTone.start();
    synthRef.current.triggerAttackRelease(
      baseNote,
      MoaTone.Time.toSeconds("8n")
    );
    MoaTone.schedule(
      (t) =>
        synthRef.current.triggerAttackRelease(
          targetNote,
          MoaTone.Time.toSeconds("8n"),
          t
        ),
      MoaTone.now() + 0.9
    );
  };

  useEffect(() => {
    resetStats();
    newNotes();
  }, [intervals, root, direction]);

  return (
    <PracticeComponent
      title={t("音程辨认")}
      imageSrc="/pics/interval.png"
      imageAlt="sing"
      state={state}
      onPlay={play}
      onNewQuestion={newNotes}
      onOptionPlay={playOption}
      getCorrectAnswer={() => current.interval}
      getCurrentAnswer={() => current.answer}
      onAnswerChange={(value) => {
        state.current.answer = value;
      }}
      staffNotationWidth={126}
      getStaffNotationData={(correctAnswer) => {
        if (current.notes && current.notes.length >= 2) {
          const abcNotation = convertIntervalToAbc(current.notes);
          return {
            abcNotation,
          };
        }
        return null;
      }}
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
            onClick={() => onOptionPlay && onOptionPlay(i.value)}
          >
            {i.label}
          </Radio.Button>
        ));
      }}
      renderExtra={() => (
        <span className="flex gap-2">
          <RootInput
            value={root}
            onChange={(val) => (state.root = val)}
            tooltip={t(
              '根音为空时随机生成根音，请按照形如"C4"、"Bb4"、"C#4"来填写音名'
            )}
          />
          <div className="flex-col flex md:inline-block">
            {t("方向")}{" "}
            <Select
              value={direction}
              onChange={(val) => (state.direction = val)}
              options={[
                { value: "ascending", label: t("上行") },
                { value: "descending", label: t("下行") },
              ]}
            />
          </div>
          <MultiSelect
            label={t("音程")}
            value={intervals}
            onChange={(val) => (state.intervals = val)}
            options={intervalLabels}
          />
        </span>
      )}
      customTitle={undefined}
    />
  );
};
