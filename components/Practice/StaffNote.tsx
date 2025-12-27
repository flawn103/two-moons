import { useEffect } from "react";
import { Radio, Select } from "antd";
import { useTranslation } from "react-i18next";
import { useSnapshot } from "valtio";
import MoaTone from "@/utils/MoaTone";
import {
  PracticeComponent,
  usePracticeState,
  usePlanProgressTracker,
} from "./components";
import styles from "./index.module.scss";
import { appStore } from "@/stores/store";
import { noteToAbcStr } from "@/utils/abcConverter";
import AbcStaffNotation from "@/components/StaffNotation";
import { getRandom } from "@/utils/number";

export const StaffNote = () => {
  const { t } = useTranslation("practice");
  const { state, synthRef, resetStats } = usePracticeState(
    () => ({
      pass: 0,
      all: 0,
      current: {
        options: [] as Array<{ label: string; value: string }>,
        note: "",
        answer: "",
        noteName: "",
        octave: 4,
      },
      clef: "treble",
    }),
    "PRACTICE_STAFF_NOTE_CONFIG",
    ["clef"]
  );

  usePlanProgressTracker("sings.staff", state);

  const { current, clef } = useSnapshot(state);

  const NOTE_SET = ["C", "D", "E", "F", "G", "A", "B"];

  const generateNewNote = () => {
    const noteName = NOTE_SET[getRandom(0, NOTE_SET.length - 1)];
    const octave = state.clef === "bass" ? getRandom(2, 3) : getRandom(4, 5);
    const note = `${noteName}${octave}`;
    const options = NOTE_SET.map((n) => ({ label: n, value: n })).sort(
      () => Math.random() - 0.5
    );

    state.current.options = options;
    state.current.note = note;
    state.current.noteName = noteName;
    state.current.octave = octave;
    state.current.answer = "";
    state.all += 1;
  };

  const nextQuestion = () => {
    generateNewNote();
  };

  useEffect(() => {
    resetStats();
    generateNewNote();
  }, [clef]);

  return (
    <PracticeComponent
      title={t("五线谱")}
      imageAlt="staff note practice"
      state={state}
      renderExtra={() => (
        <span className="flex gap-2">
          <span className="flex-col flex md:inline-block">
            {t("谱号")}{" "}
            <Select
              value={clef}
              onChange={(val) => (state.clef = val)}
              options={[
                { value: "treble", label: t("高音谱号") },
                { value: "bass", label: t("低音谱号") },
              ]}
            />
          </span>
        </span>
      )}
      onNewQuestion={nextQuestion}
      getCorrectAnswer={() => current.noteName}
      getCurrentAnswer={() => current.answer}
      onAnswerChange={(answer) => {
        state.current.answer = answer;
      }}
      onOptionPlay={(option) => {
        if (!synthRef.current)
          synthRef.current = new MoaTone.Synth({
            preset: appStore.audioPreset["piano"],
          }).toDestination();

        const noteToPlay = `${option.value}${current.octave}`;
        MoaTone.start();
        synthRef.current.triggerAttackRelease(
          noteToPlay,
          MoaTone.Time.toSeconds("4n")
        );
      }}
      staffNotationWidth={126}
      getStaffNotationData={() => {
        const base = noteToAbcStr(current.note, 0);
        const abc = state.clef === "bass" ? `K: C clef=bass\n${base}` : base;
        return { abcNotation: abc };
      }}
      customTitle={
        <div style={{ margin: "0 auto" }}>
          <h2>{t("选择正确的音符名称")}</h2>
          {current.note && (
            <AbcStaffNotation
              str={
                state.clef === "bass"
                  ? `K: C clef=bass\n${noteToAbcStr(current.note, 0)}`
                  : noteToAbcStr(current.note, 0)
              }
              concise={true}
            />
          )}
        </div>
      }
      renderOptions={(hasAnswered, onOptionPlay) => {
        return current.options.map((opt) => (
          <Radio.Button
            key={opt.value}
            value={opt.value}
            className={
              hasAnswered && opt.value === current.noteName
                ? styles["checkbox--right"]
                : ""
            }
            onClick={() => onOptionPlay && onOptionPlay(opt)}
          >
            {opt.label}
          </Radio.Button>
        ));
      }}
    />
  );
};
