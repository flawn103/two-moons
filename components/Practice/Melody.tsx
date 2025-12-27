import { Radio } from "antd";
import MoaTone from "@/utils/MoaTone";
import { useEffect, useState } from "react";
import { useSnapshot } from "valtio";
import { useTranslation } from "next-i18next";
import _, { sample, sampleSize, shuffle } from "lodash";
import styles from "./index.module.scss";
import { NOTES } from "@/utils/calc";
import { scale, singNameMap } from "rad.js";

import { getRootAndOctave, parseInterval } from "@/utils/note";
import { SCALE_TYPES } from "@/utils/music";
import { convertMelodyToAbc } from "@/utils/abcConverter";
import {
  usePracticeState,
  PracticeComponent,
  RootInput,
  MultiSelect,
  usePlanProgressTracker,
} from "./components";

const commonStyles = {
  body: {
    paddingBottom: 0,
  },
  title: {
    overflow: "visible",
    flexShrink: 0,
    marginRight: 8,
  },
};

const MELODY_OCTIVE_RANGE = [0];
const MELODY_LEN = 5;

// 使用统一的数据库实例

function getRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const genMelody = (root, scaleName) => {
  const { root: rootName, octave } = getRootAndOctave(root);
  const octiveRange = [];
  const notes = [];

  MELODY_OCTIVE_RANGE.forEach((i) => {
    octiveRange.push(octave + i);
  });
  octiveRange.forEach((o) => {
    const scaleNotes = scale({ type: scaleName, root: rootName }, o).slice(
      0,
      -1
    );
    scaleNotes.forEach((note) => {
      const index = scaleNotes.indexOf(note);
      notes.push({
        singName: singNameMap[scaleName][index],
        value: note,
      });
    });
  });

  const picked = sampleSize(notes, MELODY_LEN);
  let time = 8;
  const notesWithTime = picked.map((note) => {
    const duration = sample([1, 2]);
    const noteWithTime = { duration, time, ...note };
    time += duration;
    return noteWithTime;
  });

  return { notesWithTime, notes };
};

export const CorrectStatus = ({ all, pass }) => {
  const { t } = useTranslation("practice");
  const percentage = (pass / (all || 1)) * 100;
  return (
    <span className="font-thin text-sm">
      <span className="hidden md:inline-block">
        {t("共{all}个问题，正确率").replace("{all}", all)}{" "}
      </span>
      <span
        style={{
          color: percentage > 80 ? "#8bc34a" : "#f44336",
          fontWeight: "bold",
        }}
      >
        <span className="hidden md:inline-block">{percentage.toFixed(0)}%</span>
        <span className="inline-block md:hidden">
          {pass}/{all}
        </span>
      </span>
    </span>
  );
};

export const Melody = () => {
  const { t } = useTranslation("practice");
  const { state, resetStats } = usePracticeState(
    () => ({
      scales: ["ionian"],
      pass: 0,
      all: 0,
      root: "C4",
      current: {
        notes: [],
        options: [],
        base: "",
        root: "",
        chord: "",
        answer: "",
      },
    }),
    "PRACTICE_MELODY_CONFIG",
    ["scales", "root"]
  );

  const { scales, current } = useSnapshot(state);
  const { root: staticRoot } = useSnapshot(state, { sync: true });
  usePlanProgressTracker("sings.melody", state);
  const optionStr = current.notes.map((note) => note.singName).join(",");

  const newMelody = () => {
    let root = staticRoot || `${sample(NOTES)}${getRandom(3, 4)}`;
    const sclaeName = sample(scales);
    const { notes, notesWithTime } = genMelody(root, sclaeName);
    const notesSingNames = notesWithTime.map((note) => note.singName);
    const allNotesSingNames = notes.map((note) => note.singName);
    const wrongOptions = Array(3)
      .fill(0)
      .map(() => sampleSize(allNotesSingNames, 5));
    const options = shuffle(
      [...wrongOptions, notesSingNames].map((arr) => arr.join(","))
    );

    state.current.notes = notesWithTime;
    state.current.options = options;
    state.current.root = root;
    state.current.answer = "";
    state.all += 1;
  };

  const [moaPlayer] = useState(() => new MoaTone.Player());

  const play = async () => {
    const notes = [
      { time: 0, value: state.root || state.current.root, duration: 2 },
      ..._.cloneDeep(state.current.notes),
    ];
    const timeLength =
      notes[notes.length - 1].time + notes[notes.length - 1].duration;

    moaPlayer.setData({
      bpm: 160,
      timeLength,
      notes,
    });
    moaPlayer.stop();
    await moaPlayer.play();
  };

  const playOption = async (optionValue) => {
    const singNames = optionValue.split(",");
    const { notes: allNotes } = genMelody(state.current.root, sample(scales));
    const selectedNotes = singNames
      .map((singName) => allNotes.find((note) => note.singName === singName))
      .filter(Boolean);

    if (selectedNotes.length === 0) return;

    let notesWithTime;
    if (selectedNotes.map((note) => note.singName).join(",") === optionStr)
      notesWithTime = current.notes;
    else {
      let time = 8;
      notesWithTime = selectedNotes.map((note) => {
        const duration = sample([1, 2]);
        const noteWithTime = { duration, time, ...note };
        time += duration;
        return noteWithTime;
      });
    }
    const notes = [
      { time: 0, value: state.root || state.current.root, duration: 2 },
      ...notesWithTime,
    ];
    const timeLength =
      notes[notes.length - 1].time + notes[notes.length - 1].duration;

    moaPlayer.stop();
    moaPlayer.setData({
      bpm: 160,
      timeLength,
      notes,
    });
    await moaPlayer.play();
  };

  useEffect(() => {
    resetStats();
    try {
      newMelody();
    } catch (error) {
      console.error(error);
    }
  }, [scales, staticRoot]);

  return (
    <PracticeComponent
      title={t("旋律辨认")}
      imageSrc="/pics/melody.png"
      imageAlt="sing"
      state={state}
      onPlay={play}
      onNewQuestion={newMelody}
      onOptionPlay={playOption}
      getCorrectAnswer={() => optionStr}
      getCurrentAnswer={() => current.answer}
      onAnswerChange={(value) => {
        state.current.answer = value;
      }}
      staffNotationWidth={240}
      getStaffNotationData={(correctAnswer) => {
        if (current.notes && current.notes.length > 0) {
          const abcNotation = convertMelodyToAbc(current.notes);
          return {
            abcNotation: abcNotation,
          };
        }
        return null;
      }}
      isVerticalRadio={true}
      customTitle={
        <div className="text-center">
          <h2>{t("选择你听到的旋律")}</h2>
          <span>{t("第一个音为基音1，后面的音为旋律")}</span>
        </div>
      }
      renderOptions={(hasAnswered, onOptionPlay) => {
        const correctAnswer = optionStr;
        return current.options.map((i) => (
          <Radio
            key={i}
            value={i}
            className={
              hasAnswered && i === correctAnswer
                ? styles["checkbox--right"]
                : ""
            }
            onClick={() => hasAnswered && onOptionPlay && onOptionPlay(i)}
          >
            {i}
          </Radio>
        ));
      }}
      renderExtra={() => (
        <span className="flex gap-2 ">
          <RootInput
            value={staticRoot}
            onChange={(val) => (state.root = val)}
            tooltip={t(
              '根音为空时随机生成根音，请按照形如"C4"、"Bb4"、"C#4"来填写音名'
            )}
          />
          <MultiSelect
            label={t("音阶")}
            value={scales}
            onChange={(val) => (state.scales = val)}
            options={SCALE_TYPES.map((value) => ({ value, label: value }))}
          />
        </span>
      )}
    />
  );
};
