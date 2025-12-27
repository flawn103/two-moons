import { GuitarEditor } from "@/components/ChordEditor/GuitarEditor";
import { getNoteByStringAndFret, NOTES } from "@/utils/calc";
import { useEffect, useMemo } from "react";
import { getRandom } from "@/utils/number";
import { Slider, Radio } from "antd";
import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import MoaTone from "@/utils/MoaTone";
import {
  usePracticeState,
  PracticeComponent,
  MultiSelect,
  usePlanProgressTracker,
} from "./components";
import styles from "./index.module.scss";
import { appStore } from "@/stores/store";
import { noteToAbcStr } from "@/utils/abcConverter";

export const NoteIdentification = () => {
  const { t } = useTranslation("practice");
  const { state, synthRef, resetStats } = usePracticeState(
    () => ({
      fretRange: [2, 5], // 默认把位范围0-12品
      pass: 0,
      all: 0,
      current: {
        options: [],
        note: "",
        answer: "",
        noteName: "",
        octave: 0,
        string: 0,
        fret: 0,
      },
    }),
    "NOTE_IDENTIFICATION_PRACTICE",
    ["fretRange"]
  );

  const { fretRange, current } = useSnapshot(state);
  usePlanProgressTracker("guitar.note", state);

  // 获取所有可能的音符选项
  const noteOptions = NOTES.map((note) => ({
    label: note,
    value: note,
  }));

  const generateNewNote = () => {
    // 根据把位范围随机选位置
    const string = getRandom(0, 5); // 6根弦 0-5
    const fret = getRandom(fretRange[0], fretRange[1]); // 使用设置的把位范围

    // 用现有函数转为音符
    const noteObj = getNoteByStringAndFret(string, fret);
    const note = `${noteObj.name}${noteObj.octave}`;

    const correctAnswer = noteObj.name;
    // 获取正确音符的选项
    const correctOption = noteOptions.find(
      (note) => note.value === correctAnswer
    );

    // 从剩余音符中随机选择两个额外选项
    const otherNotes = noteOptions.filter(
      (note) => note.value !== correctAnswer
    );
    const extraOptions = [];

    // 确保有足够多的其他音符可选
    if (otherNotes.length > 0) {
      const shuffled = [...otherNotes].sort(() => Math.random() - 0.5);
      extraOptions.push(...shuffled.slice(0, 2));
    }

    // 合并正确选项和额外选项并随机排序
    const displayOptions = [correctOption, ...extraOptions].filter(Boolean);
    const options = [...displayOptions].sort(() => Math.random() - 0.5);

    state.current.options = options;
    state.current.note = note;
    state.current.noteName = noteObj.name;
    state.current.octave = noteObj.octave;
    state.current.string = string;
    state.current.fret = fret;
    state.current.answer = "";
    state.all += 1;
  };

  // 将音符转换为吉他指板位置的辅助函数

  const guitarPosition = current.note
    ? { string: current.string, fret: current.fret }
    : null;

  const renderGuitarFretboard = () => {
    if (!guitarPosition) return null;

    // 计算显示范围
    const minFret = Math.max(guitarPosition.fret - 3, 0);
    const maxFret = guitarPosition.fret + 2;

    // 创建 InstrumentData 对象
    const instrumentData = {
      instrument: "guitar" as const,
      range: {
        start: minFret,
        end: maxFret,
      },
      guitarData: [guitarPosition],
      userSelectedRoot: null,
    };

    return (
      <div className="guitar-display text-center">
        <h2>{t("识别指板上的音符")}</h2>
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

  const nextQuestion = () => {
    generateNewNote();
  };

  useEffect(() => {
    resetStats();
    generateNewNote();
  }, [fretRange]);

  return (
    <PracticeComponent
      title={t("音符识别")}
      imageAlt="note identification practice"
      state={state}
      answerTip={t("选择正确的音符名称")}
      onNewQuestion={nextQuestion}
      getCorrectAnswer={() => current.noteName}
      getCurrentAnswer={() => current.answer}
      onAnswerChange={(answer) => {
        state.current.answer = answer;
      }}
      onOptionPlay={(option) => {
        // 播放选中音符的音频
        if (!synthRef.current)
          synthRef.current = new MoaTone.Synth({
            preset: appStore.audioPreset["guitar"],
          }).toDestination();

        const noteToPlay = `${option.value}${current.octave}`;
        MoaTone.start();
        synthRef.current.triggerAttackRelease(
          noteToPlay,
          MoaTone.Time.toSeconds("4n")
        );
      }}
      getStaffNotationData={() => {
        return {
          abcNotation: noteToAbcStr(current.note, 1),
        };
      }}
      customTitle={renderGuitarFretboard()}
      renderExtra={() => (
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <span className="text-sm">{t("把位范围")}</span>
            <Slider
              range
              min={0}
              max={12}
              value={fretRange}
              onChange={(val) => {
                state.fretRange = val;
              }}
              marks={{
                0: "0",
                1: "1",
                3: "3",
                5: "5",
                7: "7",
                9: "9",
                12: "12",
              }}
              style={{ width: 200 }}
              tooltip={{ formatter: (value) => `${value}${t("品")}` }}
            />
          </div>
        </div>
      )}
      renderOptions={(hasAnswered, onOptionPlay) => {
        return current.options.map((note) => (
          <Radio.Button
            key={note.value}
            value={note.value}
            className={
              hasAnswered && note.value === current.noteName
                ? styles["checkbox--right"]
                : ""
            }
            onClick={() => onOptionPlay && onOptionPlay(note)}
          >
            {note.label}
          </Radio.Button>
        ));
      }}
    />
  );
};
