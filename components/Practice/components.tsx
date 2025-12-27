import {
  Button,
  Card,
  Input,
  Radio,
  Select,
  Space,
  Tooltip,
  Modal,
} from "antd";
import { QuestionCircleOutlined, SettingOutlined } from "@ant-design/icons";
import { useEffect, useRef, useState, useLayoutEffect } from "react";
import { proxy, subscribe, useSnapshot } from "valtio";
import { useTranslation } from "next-i18next";
import _ from "lodash";
import styles from "./index.module.scss";
import classNames from "classnames";
import { appStore } from "@/stores/store";
import { isMobile } from "@/utils/env";

import AbcStaffNotation from "@/components/StaffNotation";
import { planActions, planStore } from "@/stores/planStore";

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

const resolvePracticeImageSrc = (src: string, skin: string) => {
  if (!src || !src.startsWith("/pics/")) return src;
  if (!skin || skin === "default") return src;
  const filename = src.split("/").pop() as string;
  return `/pics/${skin}/${filename}`;
};

export const CorrectStatus = ({ all, pass }) => {
  const { t } = useTranslation("practice");
  const percentage = (pass / (all || 1)) * 100;
  return (
    <span className="font-thin text-sm">
      <span>{t("共{all}个问题，正确率").replace("{all}", all)} </span>
      <span
        style={{
          color: percentage > 80 ? "#8bc34a" : "#f44336",
          fontWeight: "bold",
        }}
      >
        <span>{percentage.toFixed(0)}%</span>
      </span>
    </span>
  );
};

// 通用练习状态管理Hook
export const usePracticeState = (
  defaultConfig,
  localStorageKey,
  persistKeys
) => {
  const [state] = useState(proxy(defaultConfig()));
  const synthRef = useRef(null);

  useEffect(() => {
    const savedData = JSON.parse(localStorage.getItem(localStorageKey)) ?? {};

    // 兜底处理：确保关键数据有效
    if (localStorageKey === "PRACTICE_INTERVAL_CONFIG") {
      if (
        !savedData.intervals ||
        !Array.isArray(savedData.intervals) ||
        savedData.intervals.length === 0
      ) {
        savedData.intervals = [3, 4]; // 默认小三度和大三度
      }
    }
    if (localStorageKey === "PRACTICE_HARMONY_CONFIG") {
      if (
        !savedData.chords ||
        !Array.isArray(savedData.chords) ||
        savedData.chords.length === 0
      ) {
        savedData.chords = ["m", "M"]; // 默认小调和大调
      }
    }
    if (localStorageKey === "PRACTICE_MELODY_CONFIG") {
      if (
        !savedData.scales ||
        !Array.isArray(savedData.scales) ||
        savedData.scales.length === 0
      ) {
        savedData.scales = ["ionian"]; // 默认自然大调
      }
    }

    Object.assign(state, savedData);

    const off = subscribe(state, () => {
      localStorage.setItem(
        localStorageKey,
        JSON.stringify(_.pick(state, persistKeys))
      );
    });

    return () => off();
  }, []);

  const resetStats = () => {
    state.pass = 0;
    state.all = 0;
  };

  return { state, synthRef, resetStats };
};

export const usePlanProgressTracker = (moduleType, state) => {
  useEffect(() => {
    const off = subscribe(state, () => {
      if (!planStore.currentPlanId) return;

      const plan = planStore.plans.find(
        (p) => p.id === planStore.currentPlanId
      );

      const progress = plan?.progress?.[moduleType];
      if (progress?.completed) {
        // 如果是今天完成的，不再记录
        const today = new Date().toDateString();
        const completedDate = progress.completedAt
          ? new Date(progress.completedAt).toDateString()
          : "";
        if (today === completedDate) return;
      }

      planActions.recordProgress(moduleType, state.all || 0, state.pass || 0);
    });
    return () => off();
  }, [moduleType, state]);
};

// 通用练习组件
export const PracticeComponent = ({
  title,
  imageSrc = undefined,
  imageAlt = undefined,
  state,
  onPlay = undefined,
  onNewQuestion,
  renderOptions,
  answerTip = undefined,
  renderExtra,
  getCorrectAnswer,
  getCurrentAnswer,
  onAnswerChange,
  onOptionPlay,
  isVerticalRadio = false,
  customTitle,
  getStaffNotationData,
  staffNotationWidth = 96,
}) => {
  const { t, i18n } = useTranslation("practice");
  const locale = i18n.language;
  const { all, pass, current } = useSnapshot(state);
  const { practiceSkin } = useSnapshot(appStore);
  const [imgSrc, setImgSrc] = useState<string>("");
  const [settingsVisible, setSettingsVisible] = useState(false);
  const correctAnswer = getCorrectAnswer();
  const currentAnswer = getCurrentAnswer();

  const isCorrect = correctAnswer === currentAnswer;
  const hasAnswered =
    currentAnswer !== null &&
    currentAnswer !== undefined &&
    currentAnswer !== "" &&
    currentAnswer !== 0;
  useLayoutEffect(() => {
    setImgSrc(resolvePracticeImageSrc(imageSrc, practiceSkin));
  }, [imageSrc, practiceSkin]);
  return (
    <div className={classNames("flex flex-col", styles["practice-single"])}>
      <Card
        className="w-full border-none"
        styles={commonStyles}
        headStyle={{
          paddingBottom: 12,
        }}
        title={
          <span>
            <span>{title} </span>
            <CorrectStatus all={all} pass={pass}></CorrectStatus>
          </span>
        }
        extra={
          isMobile() ? (
            <Button
              icon={<SettingOutlined />}
              onClick={() => setSettingsVisible(true)}
            ></Button>
          ) : (
            renderExtra()
          )
        }
      >
        <div className="w-full">
          {current && Object.keys(current).length > 0 ? (
            <Space direction="vertical" className="w-full items-center">
              {onPlay && (
                <Button className="w-48" onClick={onPlay}>
                  {t("播放")}
                </Button>
              )}
              {customTitle || (
                <h2>
                  {title === "和弦辨认"
                    ? t("选择你听到的和弦")
                    : title === "音程辨认"
                      ? t("选择你听到的音程")
                      : t("选择你听到的{title}").replace(
                          "{title}",
                          title.replace("辨认", "")
                        )}
                </h2>
              )}
              <Radio.Group
                value={currentAnswer}
                className={classNames({
                  [styles.checkbox]: true,
                  [styles["checkbox--vertical"]]: isVerticalRadio,
                  [styles["checkbox--wrong"]]: hasAnswered && !isCorrect,
                  [styles["checkbox--right"]]: hasAnswered && isCorrect,
                })}
                onChange={(e) => {
                  if (!hasAnswered) {
                    onAnswerChange(e.target.value);
                    if (e.target.value === correctAnswer) {
                      state.pass += 1;
                    }
                  }
                }}
              >
                {renderOptions(hasAnswered, onOptionPlay)}
              </Radio.Group>
              {hasAnswered ? (
                <div className="text-center">
                  {isCorrect ? (
                    <div className="text-green-600 mb-2">
                      {t("✓ 回答正确！")}
                    </div>
                  ) : (
                    <div className="text-red-600 mb-2">
                      {t("✗ 回答错误，正确答案已标出")}
                    </div>
                  )}
                  <div className="text-gray-600 text-sm mb-3">
                    {answerTip ? answerTip : t("点击选项可以听对应的音频")}
                  </div>
                  {getStaffNotationData && (
                    <div
                      className="m-auto mb-4"
                      style={{
                        width: staffNotationWidth,
                      }}
                    >
                      <AbcStaffNotation
                        str={getStaffNotationData(correctAnswer).abcNotation}
                        concise={true}
                      />
                    </div>
                  )}
                  <Button
                    className="w-48"
                    onClick={() => {
                      onNewQuestion();
                      if (onPlay) {
                        onPlay();
                      }
                    }}
                  >
                    {t("下一题")}
                  </Button>
                </div>
              ) : null}
            </Space>
          ) : null}
        </div>
        {imageSrc && (
          <div
            style={
              {
                // marginBottom: -24,
              }
            }
            className={classNames("flex justify-center mt-8", {
              [styles.imageFeather]: practiceSkin !== "default",
            })}
          >
            <img
              className="block"
              src={imgSrc || ""}
              onError={(e) => {
                if (imgSrc !== imageSrc) setImgSrc(imageSrc as string);
              }}
              height={300}
              alt={imageAlt}
            />
          </div>
        )}
      </Card>
      {isMobile() && (
        <Modal
          title={t("设置")}
          open={settingsVisible}
          footer={null}
          onCancel={() => setSettingsVisible(false)}
          destroyOnClose
        >
          {renderExtra()}
        </Modal>
      )}
    </div>
  );
};

// 根音输入组件
export const RootInput = ({ value, onChange, tooltip }) => {
  const { t } = useTranslation("practice");
  return (
    <span>
      <div className="block md:inline-block md:mr-1">
        {t("根音")}{" "}
        <Tooltip title={tooltip}>
          <QuestionCircleOutlined />
        </Tooltip>{" "}
      </div>
      <Input
        // allowClear
        className="w-12"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </span>
  );
};

// 多选下拉组件
export const MultiSelect = ({
  label,
  value,
  onChange,
  options,
  className = `w-auto ${styles.select}`,
  ...others
}) => {
  const handleChange = (val) => {
    // 确保至少保留一个选项
    if (val.length === 0) {
      return;
    }
    onChange([...val]);
  };

  return (
    <span className="flex-col flex md:inline-block">
      {label}{" "}
      <Select
        virtual={false}
        popupMatchSelectWidth={false}
        showSearch={false}
        className={className}
        mode="multiple"
        onChange={handleChange}
        options={options}
        value={value}
        removeIcon={value.length <= 1 ? null : undefined}
        {...others}
      />
    </span>
  );
};
