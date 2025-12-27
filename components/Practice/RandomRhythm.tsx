import {
  Button,
  Card,
  Progress,
  Space,
  Typography,
  Slider,
  Switch,
  Row,
  Col,
  Select,
  Input,
} from "antd";
import { useTranslation } from "next-i18next";
import {
  PlayCircleOutlined,
  RedoOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import classNames from "classnames";
import { useEffect } from "react";
import { useSnapshot } from "valtio";
import AbcStaffNotation from "@/components/StaffNotation";
import { MoaTone } from "@/utils/MoaTone";
import {
  rhythmStore,
  rhythmActions,
  DIFFICULTY_LEVELS,
} from "@/stores/rhythmStore";
import { RhythmNote } from "@/types/rhythm";
import styles from "@/components/Practice/index.module.scss";
import { token } from "@/theme/token";

const { Text } = Typography;

// 将节奏转换为ABC记谱法
function rhythmToAbc(rhythm: readonly RhythmNote[]): string {
  let abc = "X:1\nL:1/4\nK:C\n";

  let result = "";
  let i = 0;

  while (i < rhythm.length) {
    const note = rhythm[i];

    // 检查是否是三连音组的开始
    if (note.isTriplet && note.tripletGroupId) {
      // 找到同一三连音组的所有音符
      const tripletGroup = [];
      let j = i;
      while (
        j < rhythm.length &&
        rhythm[j].isTriplet &&
        rhythm[j].tripletGroupId === note.tripletGroupId
      ) {
        tripletGroup.push(rhythm[j]);
        j++;
      }

      // 生成三连音组的ABC记谱法
      const tripletNotes = tripletGroup.map((tripletNote) => {
        const baseSymbol = tripletNote.type === "rest" ? "z" : "C";

        // 三连音的时值处理
        let duration = tripletNote.duration;

        // 根据三连音的实际时值确定ABC表示
        const durationMap: Record<number, string> = {
          [1 / 3]: `${baseSymbol}1/2`, // 八分三连音中的每个音符
          [2 / 3]: `${baseSymbol}`, // 四分三连音中的每个音符
        };

        return durationMap[duration] || `${baseSymbol}`;
      });

      // 添加三连音标记 - 修复ABC格式
      result += `(3${tripletNotes.join("")} `;
      i = j; // 跳过已处理的三连音组
    } else {
      // 处理普通音符
      let { duration } = note;

      // 根据音符类型选择基础符号
      const baseSymbol = note.type === "rest" ? "z" : "C";

      // 转换为ABC记谱法
      const durationMap: Record<number, string> = {
        0.25: `${baseSymbol}/4`, // 十六分音符/休止符
        0.375: `${baseSymbol}3/8`, // 附点十六分音符/休止符
        0.5: `${baseSymbol}/2`, // 八分音符/休止符
        0.75: `${baseSymbol}3/4`, // 附点八分音符/休止符
        1: baseSymbol, // 四分音符/休止符
        1.5: `${baseSymbol}3/2`, // 附点四分音符/休止符
        2: `${baseSymbol}2`, // 二分音符/休止符
        3: `${baseSymbol}3`, // 附点二分音符/休止符
        4: `${baseSymbol}4`, // 全音符/休止符
      };

      const abcNote = durationMap[duration] || `${baseSymbol}${duration}`;
      result += abcNote + " ";
      i++;
    }
  }

  abc += result.trim() + " |";
  console.log({ abc });
  return abc;
}

export function RandomRhythm() {
  const { t } = useTranslation("practice");
  const {
    currentRhythm,
    bpm,
    isPlaying,
    isPracticing,
    userTaps,
    expectedTaps,
    practiceStarted,
    accuracy,
    feedback,
    showResult,
    enableGuideAudio,
    difficulty,
    isPreparationBeats,
    noteStatus,
    preparationBeatCount,
  } = useSnapshot(rhythmStore);

  // 初始化
  useEffect(() => {
    // 加载本地配置并初始化
    rhythmActions.loadConfigFromLocal();
    rhythmActions.initSynth();
    rhythmActions.generateRandomRhythm();
  }, []);

  // 处理拍击
  const handleTap = () => {
    const currentTime = MoaTone.now();
    rhythmActions.recordTap(currentTime);
  };

  // 开始练习
  const startPractice = async () => {
    try {
      await MoaTone.start();
      rhythmActions.startPractice();
    } catch (error) {
      console.error("Failed to start audio context:", error);
    }
  };

  // 退出练习
  const resetPractice = async () => {
    try {
      // 立即重新开始练习;
      rhythmActions.stopPractice();
    } catch (error) {
      console.error("Failed to reset practice:", error);
    }
  };

  // 播放示例
  const playExample = async () => {
    try {
      await MoaTone.start();
      rhythmActions.playRhythmExample();
    } catch (error) {
      console.error("Failed to play example:", error);
    }
  };

  // BPM变化处理
  const handleBpmChange = (value: number) => {
    rhythmActions.setBpm(value);
  };

  return (
    <div className={classNames("flex flex-col", styles["practice-single"])}>
      <Card
        className="w-full border-none"
        styles={{
          body: {},
          title: {
            overflow: "visible",
            flexShrink: 0,
            marginRight: 8,
          },
        }}
        headStyle={{
          paddingBottom: 12,
        }}
        title={
          <span>
            <span className="hidden md:inline">{t("随机节奏")}</span>
          </span>
        }
        extra={
          <div className="flex gap-2">
            {/* BPM控制 */}
            <div>
              <label htmlFor="bpm-input" className="block">
                BPM
              </label>
              <Input
                type="number"
                min={60}
                max={180}
                value={bpm}
                onChange={(e) => handleBpmChange(Number(e.target.value))}
                disabled={isPlaying || isPracticing || isPreparationBeats}
              />
            </div>

            {/* 节奏配置选项 */}
            <div className="flex flex-col">
              <Text>{t("难度等级")}</Text>
              <Select
                value={difficulty}
                onChange={(value) => {
                  rhythmActions.setDifficulty(value);
                  // 难度改变后重新生成节奏
                  if (!isPlaying && !isPracticing) {
                    rhythmActions.reset();
                    rhythmActions.generateRandomRhythm();
                  }
                }}
                disabled={isPlaying || isPracticing || isPreparationBeats}
                style={{ width: 120 }}
              >
                {Object.entries(DIFFICULTY_LEVELS).map(([key, config]) => (
                  <Select.Option key={key} value={key}>
                    {t(config.name)}
                  </Select.Option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col">
              <Text>{t("引导音")}</Text>
              <Switch
                checked={enableGuideAudio}
                disabled={isPlaying || isPracticing || isPreparationBeats}
                onChange={(checked) => {
                  rhythmStore.enableGuideAudio = checked;
                }}
              />
            </div>
          </div>
        }
      >
        {/* 节奏显示 */}
        {currentRhythm.length > 0 && (
          <div>
            <div className="text-center mb-2">
              <h2 className="mb-2">{t("请根据示例节奏进行拍击")}</h2>
              <Button
                className="mb-2"
                icon={<RedoOutlined />}
                onClick={() => {
                  rhythmActions.reset();
                  rhythmActions.generateRandomRhythm();
                }}
                disabled={isPlaying || isPracticing || isPreparationBeats}
                size="large"
              >
                {t("生成新节奏")}
              </Button>
            </div>
            <div className="flex justify-center mb-8">
              <AbcStaffNotation
                str={rhythmToAbc(currentRhythm)}
                noteStatus={noteStatus.slice()}
                options={{
                  paddingtop: 16,
                  paddingbottom: 16,
                }}
                concise
              />
            </div>

            {/* 调试信息 */}
            {/* <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
            <Text strong>节奏详情 (调试信息):</Text>
            <div className="mt-2 space-y-1">
              {currentRhythm.map((note, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-8 text-gray-500">#{index + 1}</span>
                  <span className="w-16">
                    {note.type === "rest" ? "休止符" : "音符"}
                  </span>
                  <span className="w-20">时值: {note.duration}</span>
                  {note.isDotted && (
                    <span className="text-orange-600">附点</span>
                  )}
                  {note.isTriplet && (
                    <span className="text-purple-600">
                      三连音 (组{note.tripletGroupId})
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 text-gray-600">
              ABC记谱: {rhythmToAbc(currentRhythm)}
            </div>
          </div> */}
          </div>
        )}

        {/* 控制按钮 */}
        <div className="text-center mb-6">
          <Space size="large">
            <Button
              icon={<PlayCircleOutlined />}
              onClick={playExample}
              loading={isPlaying}
              disabled={isPracticing || isPreparationBeats}
              size="large"
            >
              {t("示例")}
            </Button>

            {!isPracticing && !isPreparationBeats ? (
              <Button
                type="primary"
                icon={<SoundOutlined />}
                onClick={startPractice}
                disabled={isPlaying}
                size="large"
              >
                {t("练习")}
              </Button>
            ) : (
              <Button
                type="default"
                icon={<RedoOutlined />}
                onClick={resetPractice}
                size="large"
              >
                {t("退出")}
              </Button>
            )}
          </Space>
        </div>

        {/* 练习区域 */}
        {practiceStarted && !showResult && (
          <div className="text-center mb-6">
            {/* 正式练习显示 */}

            <div className="mb-4">
              <Text strong>{t("跟随节拍点击下方按钮：")}</Text>
            </div>

            <Button
              type="primary"
              size="large"
              onPointerDown={handleTap}
              className="w-32 h-16 text-xl"
            >
              {t("点击")}
            </Button>

            <div className="mt-4">
              <Text>
                {t("已拍击: {{current}} / {{total}}", {
                  current: userTaps.length,
                  total: expectedTaps.length,
                })}
              </Text>
              <Progress
                percent={(userTaps.length / expectedTaps.length) * 100}
                showInfo={false}
                className="mt-2"
                strokeColor={token.colorPrimary}
              />
            </div>
            {/* 预备拍显示 */}
            {isPreparationBeats && (
              <div className="mb-6">
                <div className="mb-4">
                  <Text strong className="text-lg">
                    {t("预备 - 开始！")}
                  </Text>
                </div>
                <div className="flex justify-center items-center space-x-4 mb-4">
                  {[1, 2, 3, 4].map((beat) => (
                    <div
                      key={beat}
                      className={`w-10 h-10 rounded-full border-4 flex items-center justify-center font-bold transition-all duration-200 ${
                        preparationBeatCount >= beat
                          ? "bg-primary text-white shadow-lg scale-110"
                          : "bg-white  text-gray-500"
                      }`}
                    >
                      {beat}
                    </div>
                  ))}
                </div>
                <Text type="secondary">
                  {t("跟随预备拍: {{count}}", {
                    count: preparationBeatCount,
                  })}
                </Text>
              </div>
            )}
          </div>
        )}

        {/* 结果显示 */}
        {showResult && (
          <div className="text-center">
            <Card>
              {t("准确率")}{" "}
              <span
                className={`text-xl font-bold ${
                  accuracy < 60
                    ? "text-red-500"
                    : accuracy < 80
                      ? "text-yellow-500"
                      : "text-green-600"
                }`}
              >
                {accuracy}%
              </span>
              <span>, {t(feedback)}</span>
            </Card>
          </div>
        )}
      </Card>
    </div>
  );
}
