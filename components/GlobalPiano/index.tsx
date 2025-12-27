import { Button } from "antd";
import { useState } from "react";
import { proxy, useSnapshot } from "valtio";
import React from "react";
import { PianoEditor } from "./Component";
import _ from "lodash";
// 添加组件 ——Lusia
import {
  SettingOutlined,
  MinusOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { Slider, Space, Dropdown } from "antd";
import { isMobile } from "@/utils/env";
import { useTranslation } from "next-i18next";
import { useDrag } from "@/hooks/useDrag";

export const GlobalPiano: React.FC = () => {
  const [state] = useState(
    proxy({
      collapse: true,
      // 添加设置项存储 ——Lusia
      pianoSettings: {
        octaveRange: isMobile() ? [3, 5] : [2, 6], // [起始八度, 结束八度]
        noteDisplayMode: "octave" as "octave" | "CDEFG" | "12345",
        keyboardOctave: 4, // 键盘八度，默认居中 ——Lusia
      },
    })
  );

  const { collapse, pianoSettings } = useSnapshot(state); // 解构出 pianoSettings 以便使用 ——Lusia
  const { t } = useTranslation("common");
  const { onMouseDown, onTouchStart, distance, isTrigClick } = useDrag(
    10 * 16,
    "bottom",
    "GLOBAL_PIANO_DRAG_DISTANCE"
  );

  // 八度范围计算函数 ——Lusia
  const getFretRange = () => {
    return {
      start: pianoSettings.octaveRange[0],
      end: pianoSettings.octaveRange[1],
    };
  };

  // 设置菜单UI ——Lusia
  const settingsMenu = (
    <div className="bg-white p-4 rounded shadow-lg" style={{ width: 320 }}>
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        {/* 双滑块范围 */}
        <div>
          <div className="text-sm mb-2 font-medium">
            {t("显示范围")}: C{pianoSettings.octaveRange[0]} - B
            {pianoSettings.octaveRange[1]}
          </div>
          <Slider
            range
            min={0}
            max={8}
            step={1}
            value={pianoSettings.octaveRange as any}
            onChange={(val) => {
              state.pianoSettings.octaveRange = val as [number, number];
              const [start, end] = val as [number, number];
              const current =
                state.pianoSettings.keyboardOctave ??
                Math.floor((start + end) / 2);
              state.pianoSettings.keyboardOctave = Math.min(
                end,
                Math.max(start, current)
              );
            }}
            marks={{
              0: "C0",
              1: "C1",
              2: "C2",
              3: "C3",
              4: "C4",
              5: "C5",
              6: "C6",
              7: "C7",
              8: "C8",
            }}
          />
        </div>
        {/* 键盘八度调节 */}
        <div>
          <div className="text-sm mb-2 font-medium">{t("键盘八度")}</div>
          <Space>
            <Button
              size="small"
              onClick={() =>
                (state.pianoSettings.keyboardOctave = Math.max(
                  state.pianoSettings.octaveRange[0],
                  pianoSettings.keyboardOctave - 1
                ))
              }
              icon={<MinusOutlined />}
            />
            <span className="text-sm font-medium">
              {pianoSettings.keyboardOctave}
            </span>
            <Button
              size="small"
              onClick={() =>
                (state.pianoSettings.keyboardOctave = Math.min(
                  state.pianoSettings.octaveRange[1],
                  pianoSettings.keyboardOctave + 1
                ))
              }
              icon={<PlusOutlined />}
            />
          </Space>
        </div>
        {/* 音符显示模式 */}
        <div>
          <div className="text-sm mb-2 font-medium">{t("音符显示")}</div>
          <Space>
            <Button
              size="small"
              type={
                pianoSettings.noteDisplayMode === "octave"
                  ? "primary"
                  : "default"
              }
              onClick={() => (state.pianoSettings.noteDisplayMode = "octave")}
            >
              {t("八度")}
            </Button>
            <Button
              size="small"
              type={
                pianoSettings.noteDisplayMode === "CDEFG"
                  ? "primary"
                  : "default"
              }
              onClick={() => (state.pianoSettings.noteDisplayMode = "CDEFG")}
            >
              {t("音名")}
            </Button>
            <Button
              size="small"
              type={
                pianoSettings.noteDisplayMode === "12345"
                  ? "primary"
                  : "default"
              }
              onClick={() => (state.pianoSettings.noteDisplayMode = "12345")}
            >
              {t("简谱")}
            </Button>
          </Space>
        </div>
      </Space>
    </div>
  );

  return (
    <div
      className="fixed z-10 right-0 shadow-md transition-transform"
      style={{
        bottom: distance,
        transitionDuration: "450ms",
        transform: collapse ? "translateX(100%)" : "",
      }}
    >
      <Button
        size="large"
        className="absolute shadow-xl"
        shape="circle"
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={() => isTrigClick && (state.collapse = !collapse)}
        icon={
          <img
            src="/pics/piano.png"
            style={{
              pointerEvents: "none",
              width: 24,
              paddingTop: 3,
            }}
          ></img>
        }
        style={{
          left: collapse ? -46 : 10,
          top: collapse ? -122 : -48,
        }}
      />

      {/* 设置按钮 ——Lusia */}
      {!collapse && (
        <Dropdown
          overlay={settingsMenu}
          trigger={["click"]}
          placement="topLeft"
        >
          <Button
            size="large"
            className="absolute shadow-xl"
            shape="circle"
            icon={<SettingOutlined />}
            style={{
              left: 60, // 在钢琴按钮右侧 (10 + 60像素间距)
              top: -48,
            }}
          />
        </Dropdown>
      )}

      {/* 调整传参，包含配置内容 ——Lusia */}
      <PianoEditor
        noteDisplayMode={pianoSettings.noteDisplayMode}
        onDataChange={_.noop}
        noteRetain={isMobile() ? false : true}
        fretRange={getFretRange()}
        keyboardEnabled={!collapse}
        keyboardOctave={pianoSettings.keyboardOctave}
      />
    </div>
  );
};
