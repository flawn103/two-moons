import { GuitarEditor } from "@/components/ChordEditor/GuitarEditor";
import {
  getAbsoluteInterval,
  absoluteIntervalToNote,
  GUITAR_TUNING,
} from "@/utils/calc";
import { useIntervalLabels } from "@/constants/intervals";
import { convertIntervalToAbc } from "@/utils/abcConverter";
import { MoaNoiseSynth, MoaSynth, MoaTone } from "@/utils/MoaTone";
import { getRandom } from "@/utils/number";
import { Slider, Radio, Card, Select, Button } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { sample } from "lodash";
import { useTranslation } from "react-i18next";
import { ref, useSnapshot } from "valtio";
import { noteMap, intervalArrToNotesO } from "rad.js";
import {
  usePracticeState,
  PracticeComponent,
  RootInput,
  MultiSelect,
} from "./components";
import styles from "./index.module.scss";
import { appStore } from "@/stores/store";

export const Beat = () => {
  const { t } = useTranslation("practice");
  const { state } = usePracticeState(
    () => ({
      leftBeat: 4,
      rightBeat: 2,
      isPlaying: false,
      bpm: 60,
      leftEventId: null,
      rightEventId: null,
      leftRightTime: [],
      rightRightTime: [],
      // 新增状态
      leftFlash: false,
      rightFlash: false,
      userLeftPresses: [],
      userRightPresses: [],
      accuracy: { left: 0, right: 0, total: 0 },
      totalBeats: 0,
    }),
    "BEAT_PRACTICE",
    ["leftBeat", "rightBeat", "bpm"]
  );

  const refs = useRef({
    synth: new MoaSynth(),
    flashTimeouts: [] as NodeJS.Timeout[],
  });

  const beatOptions = [
    {
      label: t("禁用"),
      value: 0,
    },
    {
      label: 1,
      value: 1,
    },
    {
      label: 2,
      value: 2,
    },
    {
      label: 3,
      value: 3,
    },
    {
      label: 4,
      value: 4,
    },
    {
      label: 5,
      value: 5,
    },
    {
      label: 6,
      value: 6,
    },
    {
      label: 7,
      value: 7,
    },
    {
      label: 8,
      value: 8,
    },
    {
      label: 9,
      value: 9,
    },
    {
      label: 10,
      value: 10,
    },
    {
      label: 11,
      value: 11,
    },
  ];

  // 计算最大公约数
  const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
  };

  // 计算最小公倍数
  const lcm = (a: number, b: number): number => {
    if (a === 0 || b === 0) return Math.max(a, b);
    return Math.abs(a * b) / gcd(a, b);
  };

  const { synth, flashTimeouts } = refs.current;
  const {
    leftBeat,
    rightBeat,
    bpm,
    isPlaying,
    leftFlash,
    rightFlash,
    accuracy,
  } = useSnapshot(state);
  const root = "C4";

  // 计算正确率
  const calculateAccuracy = () => {
    const tolerance = 0.1; // 100ms 容差
    let leftCorrect = 0;
    let rightCorrect = 0;

    // 对用户按键时间进行排序
    const sortedLeftPresses = [...state.userLeftPresses].sort((a, b) => a - b);
    const sortedRightPresses = [...state.userRightPresses].sort(
      (a, b) => a - b
    );

    // 对节拍时间进行排序
    const sortedLeftBeats = [...state.leftRightTime].sort((a, b) => a - b);
    const sortedRightBeats = [...state.rightRightTime].sort((a, b) => a - b);

    // 计算左手正确率 - 按索引匹配
    const leftCount = Math.min(
      sortedLeftPresses.length,
      sortedLeftBeats.length
    );
    for (let i = 0; i < leftCount; i++) {
      const timeDiff = Math.abs(sortedLeftPresses[i] - sortedLeftBeats[i]);
      if (timeDiff <= tolerance) {
        leftCorrect++;
      }
    }

    // 计算右手正确率 - 按索引匹配
    const rightCount = Math.min(
      sortedRightPresses.length,
      sortedRightBeats.length
    );
    for (let i = 0; i < rightCount; i++) {
      const timeDiff = Math.abs(sortedRightPresses[i] - sortedRightBeats[i]);
      if (timeDiff <= tolerance) {
        rightCorrect++;
      }
    }

    // 计算正确率百分比
    const leftTotal = Math.max(
      sortedLeftPresses.length,
      sortedLeftBeats.length
    );
    const rightTotal = Math.max(
      sortedRightPresses.length,
      sortedRightBeats.length
    );
    const totalExpected = leftTotal + rightTotal;
    const totalCorrect = leftCorrect + rightCorrect;

    state.accuracy = {
      left: leftTotal > 0 ? Math.round((leftCorrect / leftTotal) * 100) : 0,
      right: rightTotal > 0 ? Math.round((rightCorrect / rightTotal) * 100) : 0,
      total:
        totalExpected > 0
          ? Math.round((totalCorrect / totalExpected) * 100)
          : 0,
    };
  };

  // 键盘事件处理
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!isPlaying) return;

      const currentTime = MoaTone.now();

      if (event.key.toLowerCase() === "q") {
        state.userLeftPresses.push(currentTime);
        // 触发左手闪烁
        state.leftFlash = true;
        const timeout = setTimeout(() => {
          state.leftFlash = false;
        }, 150);
        flashTimeouts.push(timeout);
        calculateAccuracy();
      } else if (event.key.toLowerCase() === "p") {
        state.userRightPresses.push(currentTime);
        // 触发右手闪烁
        state.rightFlash = true;
        const timeout = setTimeout(() => {
          state.rightFlash = false;
        }, 150);
        flashTimeouts.push(timeout);
        calculateAccuracy();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      // 清理所有定时器
      flashTimeouts.forEach((timeout) => clearTimeout(timeout));
      refs.current.flashTimeouts = [];
    };
  }, [isPlaying]);

  // 节拍闪烁效果
  const triggerFlash = (hand: "left" | "right") => {
    if (hand === "left") {
      state.leftFlash = true;
      const timeout = setTimeout(() => {
        state.leftFlash = false;
      }, 100);
      flashTimeouts.push(timeout);
    } else {
      state.rightFlash = true;
      const timeout = setTimeout(() => {
        state.rightFlash = false;
      }, 100);
      flashTimeouts.push(timeout);
    }
  };

  const startBeat = () => {
    const oneBeatTime = 60 / bpm;

    // 重置统计数据
    state.leftRightTime = [];
    state.rightRightTime = [];
    state.userLeftPresses = [];
    state.userRightPresses = [];
    state.accuracy = { left: 0, right: 0, total: 0 };
    state.totalBeats = 0;

    // 如果左右手都禁用，直接返回
    if (leftBeat === 0 && rightBeat === 0) return;

    // 计算最小公倍数
    const beatLcm =
      leftBeat === 0
        ? rightBeat
        : rightBeat === 0
          ? leftBeat
          : lcm(leftBeat, rightBeat);
    const baseInterval = oneBeatTime / beatLcm;

    let beatCount = 0;
    const preparatoryBeats = 4; // 四个预备拍

    // 使用统一的时间间隔进行调度
    state.leftEventId = MoaTone.scheduleRepeat((t) => {
      beatCount++;

      // 预备拍阶段，只播放预备音
      if (beatCount <= preparatoryBeats * beatLcm) {
        // 每个完整拍子播放预备音
        if ((beatCount - 1) % beatLcm === 0) {
          synth.triggerAttackRelease("G4", baseInterval * 0.8, t); // 预备拍使用不同音高
        }
        return;
      }

      // 正式节拍阶段
      const currentBeat =
        (beatCount - preparatoryBeats * beatLcm - 1) % beatLcm;

      // 左手触发时机
      if (leftBeat !== 0 && currentBeat % (beatLcm / leftBeat) === 0) {
        synth.triggerAttackRelease(root, baseInterval * 0.8, t);
        state.leftRightTime.push(t);
        // 触发左手闪烁效果
        setTimeout(() => triggerFlash("left"), (t - MoaTone.now()) * 1000);
      }

      // 右手触发时机
      if (rightBeat !== 0 && currentBeat % (beatLcm / rightBeat) === 0) {
        synth.triggerAttackRelease("E4", baseInterval * 0.8, t); // 右手使用不同音高区分
        state.rightRightTime.push(t);
        // 触发右手闪烁效果
        setTimeout(() => triggerFlash("right"), (t - MoaTone.now()) * 1000);
      }
    }, baseInterval);

    state.isPlaying = true;
  };

  const stopBeat = () => {
    if (state.leftEventId) {
      MoaTone.Transport.clear(state.leftEventId);
      state.leftEventId = null;
    }

    // 清理所有闪烁定时器
    flashTimeouts.forEach((timeout) => clearTimeout(timeout));
    refs.current.flashTimeouts = [];

    // 重置闪烁状态
    state.leftFlash = false;
    state.rightFlash = false;
    state.isPlaying = false;

    // 计算最终正确率
    calculateAccuracy();
  };

  return (
    <div className="relative">
      {/* 正确率显示 - 左上角 */}
      <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border">
        <div className="text-sm font-medium text-gray-700 mb-2">正确率统计</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-blue-600">左手 (Q):</span>
            <span className="font-mono font-bold">{accuracy.left}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-green-600">右手 (P):</span>
            <span className="font-mono font-bold">{accuracy.right}%</span>
          </div>
          <div className="flex justify-between items-center border-t pt-1">
            <span className="text-purple-600">总计:</span>
            <span className="font-mono font-bold">{accuracy.total}%</span>
          </div>
        </div>
      </div>

      <Card
        title={
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">{t("节奏对位")}</span>
            <div className="text-sm text-gray-500">
              按 Q 键 (左手) 和 P 键 (右手) 跟随节拍
            </div>
          </div>
        }
        extra={
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-1">左手节拍</span>
                <Select
                  className="w-20"
                  options={beatOptions}
                  value={leftBeat}
                  onChange={(value) => (state.leftBeat = value)}
                  placeholder="左手"
                />
              </div>
              <div className="text-2xl text-gray-300">:</div>
              <div className="flex flex-col items-center">
                <span className="text-xs text-gray-500 mb-1">右手节拍</span>
                <Select
                  className="w-20"
                  options={beatOptions}
                  value={rightBeat}
                  onChange={(value) => (state.rightBeat = value)}
                  placeholder="右手"
                />
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium">{t("bpm")}</span>
              <div className="flex-1 max-w-xs">
                <Slider
                  min={40}
                  max={300}
                  value={bpm}
                  onChange={(value) => (state.bpm = value)}
                  marks={{
                    40: "40",
                    60: "60",
                    90: "90",
                    110: "110",
                    150: "150",
                    200: "200",
                  }}
                />
              </div>
              <span className="text-sm font-mono font-bold w-12">{bpm}</span>
            </div>
          </div>
        }
        className="shadow-lg"
      >
        <div className="space-y-6">
          {/* 控制按钮 */}
          <div className="flex justify-center">
            {!isPlaying ? (
              <Button
                type="primary"
                size="large"
                onClick={startBeat}
                className="px-8 py-2 h-12 text-lg font-medium"
              >
                🎵 开始练习
              </Button>
            ) : (
              <Button
                danger
                size="large"
                onClick={stopBeat}
                className="px-8 py-2 h-12 text-lg font-medium"
              >
                ⏹️ 停止练习
              </Button>
            )}
          </div>

          {/* 节拍可视化区域 */}
          <div className="flex justify-center items-center space-x-12 py-8">
            {leftBeat !== 0 && (
              <div className="flex flex-col items-center space-y-3">
                <div className="text-sm font-medium text-gray-700">
                  左手 (Q键)
                </div>
                <div
                  className={`w-24 h-24 rounded-full border-4 flex items-center justify-center font-bold text-lg transition-all duration-150 ${
                    leftFlash
                      ? "bg-gray-800 border-gray-700 text-white shadow-lg shadow-gray-500/50 scale-110"
                      : "bg-gray-100 border-gray-300 text-gray-800"
                  }`}
                >
                  {leftBeat}
                </div>
                <div className="text-xs text-gray-500">每拍 {leftBeat} 次</div>
              </div>
            )}

            {rightBeat !== 0 && (
              <div className="flex flex-col items-center space-y-3">
                <div className="text-sm font-medium text-gray-700">
                  右手 (P键)
                </div>
                <div
                  className={`w-24 h-24 rounded-full border-4 flex items-center justify-center font-bold text-lg transition-all duration-150 ${
                    rightFlash
                      ? "bg-black border-gray-800 text-white shadow-lg shadow-gray-600/50 scale-110"
                      : "bg-white border-gray-400 text-gray-800"
                  }`}
                >
                  {rightBeat}
                </div>
                <div className="text-xs text-gray-500">每拍 {rightBeat} 次</div>
              </div>
            )}
          </div>

          {/* 说明文字 */}
          {isPlaying && (
            <div className="text-center text-sm text-gray-600 bg-gray-50 rounded-lg p-4">
              <div className="mb-2">🎯 跟随节拍按键练习</div>
              <div className="space-x-4">
                <span className="inline-flex items-center">
                  <kbd className="px-2 py-1 bg-gray-200 text-gray-800 rounded text-xs font-mono">
                    Q
                  </kbd>
                  <span className="ml-1">左手节拍</span>
                </span>
                <span className="inline-flex items-center">
                  <kbd className="px-2 py-1 bg-gray-800 text-white rounded text-xs font-mono">
                    P
                  </kbd>
                  <span className="ml-1">右手节拍</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
