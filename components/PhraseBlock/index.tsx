import React, { useState, useEffect, useRef } from "react";
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  DeleteOutlined,
  SettingOutlined,
  EditOutlined,
  HolderOutlined,
  FileTextOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import { Button, Card, Select, InputNumber, Input } from "antd";
import classNames from "classnames";
import { isMobile } from "@/utils/env";
import { NOTES } from "@/utils/calc";
import StaffNotation from "@/components/StaffNotation";
import CustomTextInput from "@/components/CustomTextInput";
import { useTranslation } from "next-i18next";
import { phraseStore, phraseActions } from "@/stores/phraseStore";
import { useSnapshot } from "valtio";
import styles from "../../pages/phrase/index.module.scss";
import { convertChordToAbc, convertToAbc } from "@/utils/abcConverter";

type PhraseBlockProps = {
  setNodeRef: (ref: any) => void;
  isDragging: boolean;
  onCollect: () => void;
  block: any;
  style: any;
  showTitle?: boolean;
  isEdit?: boolean;
  onDelete: (id: string) => void;
  onUpdate: (id: string, key: string, value: any) => void;
  dragHandleProps?: any;
};

// 高亮显示组件
const HighlightedText = ({ content, blockId, onChange }) => {
  const {
    currentPlayingIndex,
    currentPlayingEndIndex,
    currentPlayingBlockId,
    autoEditBlockId,
  } = useSnapshot(phraseStore, { sync: true });
  const isCurrentBlock = currentPlayingBlockId === blockId;
  const [isEditing, setIsEditing] = useState(false);
  const textAreaRef = useRef(null);
  const justStartedEditing = useRef(false);

  // 检查是否需要自动进入编辑状态
  useEffect(() => {
    if (autoEditBlockId === blockId && !isEditing) {
      justStartedEditing.current = true;
      setIsEditing(true);
      // 清除自动编辑标记
      phraseActions.clearAutoEdit();
    }
  }, [autoEditBlockId, blockId, isEditing]);

  useEffect(() => {
    if (isEditing && textAreaRef.current && justStartedEditing.current) {
      const textArea = textAreaRef.current.resizableTextArea.textArea;
      textArea.focus();
      textArea.setSelectionRange(content.length, content.length);
      justStartedEditing.current = false;
    }
  }, [isEditing, content.length]);

  const handleStartEditing = () => {
    justStartedEditing.current = true;
    setIsEditing(true);
    // 确保在下一个渲染周期后聚焦
    setTimeout(() => {
      if (textAreaRef.current) {
        const textArea =
          textAreaRef.current.resizableTextArea?.textArea ||
          textAreaRef.current;
        if (textArea) {
          textArea.focus();
        }
      }
    }, 0);
  };

  const renderHighlightedContent = () => {
    if (!isCurrentBlock || currentPlayingIndex === null || isEditing) {
      return content;
    }

    return content.split("").map((char, index) => {
      const isInHighlightRange =
        currentPlayingIndex !== null &&
        currentPlayingEndIndex !== null &&
        index >= currentPlayingIndex &&
        index <= currentPlayingEndIndex;
      const isValidChar = /[1-7\-',#bt]/.test(char);

      return (
        <span
          key={index}
          className={classNames({
            "bg-gray-800 text-white": isInHighlightRange && isValidChar,
            "bg-gray-400 text-white": isInHighlightRange && !isValidChar,
          })}
        >
          {char}
        </span>
      );
    });
  };

  if (isEditing) {
    return (
      <CustomTextInput
        ref={textAreaRef}
        value={content}
        onChange={onChange}
        onBlur={() => setIsEditing(false)}
        autoSize={{ minRows: isMobile() ? 1 : 2, maxRows: 6 }}
        className="text-lg"
      />
    );
  }

  return (
    <div
      className="text-xl font-thin min-h-7 border border-gray-300 rounded break-all cursor-text whitespace-pre-wrap"
      onClick={handleStartEditing}
    >
      {renderHighlightedContent()}
    </div>
  );
};

export const PhraseBlock: React.FC<PhraseBlockProps> = ({
  setNodeRef,
  isDragging,
  onCollect,
  isEdit = true,
  block,
  style,
  onDelete,
  onUpdate,
  dragHandleProps,
  showTitle = true,
}) => {
  const { t } = useTranslation("phrase");
  const { isPlaying } = useSnapshot(phraseStore);

  // 组件内部状态
  const [expandedSettings, setExpandedSettings] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState("");

  const toggleSettings = () => {
    setExpandedSettings(!expandedSettings);
  };

  const startEditName = (block: any) => {
    setEditingName(true);
    setTempName(block.name);
  };

  const saveName = (id: string) => {
    if (tempName.trim()) {
      onUpdate(id, "name", tempName.trim());
    }
    setEditingName(false);
    setTempName("");
  };

  const cancelEditName = () => {
    setEditingName(false);
    setTempName("");
  };

  const handlePlayPhrase = () => {
    phraseActions.playPhrase(block);
  };

  const handleStopPlaying = () => {
    phraseActions.stopPlaying();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={isEdit ? "py-4" : ""}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <Card
        className={classNames(
          "shadow-md hover:shadow-lg transition-all duration-200",
          styles.phraseCard,
          {
            "shadow-xl": isDragging,
          }
        )}
        bodyStyle={{
          padding: isMobile() ? "12px" : "18px",
          margin: isEdit ? "0 8px" : "0",
        }}
      >
        <div className="relative flex flex-col gap-2">
          {/* 操作按钮 - 右上角 */}
          {isEdit && (
            <div className="absolute -top-6 -right-6 z-10 flex gap-1">
              <Button
                icon={<FolderOutlined />}
                onClick={onCollect}
                size="small"
                className="shadow-md"
                title={t("添加到合集")}
              />
              <Button
                icon={<SettingOutlined />}
                onClick={toggleSettings}
                size="small"
                className="shadow-md"
                type={expandedSettings ? "primary" : "default"}
              />
              <Button
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(block.id)}
                size="small"
                className="shadow-md"
              />
            </div>
          )}

          {/* 可折叠的设置区域 - 移到顶部 */}
          {expandedSettings && (
            <div className="bg-gray-50 p-2 rounded-lg border">
              <div className="flex flex-row items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    {t("基音")}:
                  </span>
                  <Select
                    virtual={false}
                    popupMatchSelectWidth={false}
                    value={block.baseNote}
                    onChange={(value) => onUpdate(block.id, "baseNote", value)}
                    style={{
                      height: isMobile() && 24,
                    }}
                    className="w-18"
                    size={isMobile() ? "small" : "middle"}
                  >
                    {[3, 4, 5].map((octave) =>
                      NOTES.map((note) => (
                        <Select.Option
                          key={`${note}${octave}`}
                          value={`${note}${octave}`}
                        >
                          {note}
                          {octave}
                        </Select.Option>
                      ))
                    )}
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap">
                    {t("BPM")}:
                  </span>
                  <InputNumber
                    inputMode="numeric"
                    value={block.bpm}
                    onChange={(value) => {
                      const bpmValue = value;
                      onUpdate(block.id, "bpm", bpmValue);
                    }}
                    onBlur={(e) => {
                      const inputValue = e.target.value;
                      if (
                        !inputValue ||
                        inputValue.trim() === "" ||
                        isNaN(Number(inputValue))
                      ) {
                        onUpdate(block.id, "bpm", 60);
                      }
                    }}
                    min={60}
                    max={200}
                    size={isMobile() ? "small" : "middle"}
                    className="w-14"
                    style={{
                      height: isMobile() && 24,
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 乐句名称 */}
          <div className="flex items-center gap-2">
            {/* 拖拽手柄 */}
            {isEdit && (
              <div
                {...dragHandleProps}
                className="text-gray-500 text-lg cursor-grab"
              >
                <HolderOutlined />
              </div>
            )}

            {editingName && isEdit ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={tempName}
                  autoFocus
                  onChange={(e) => setTempName(e.target.value)}
                  onPressEnter={() => saveName(block.id)}
                  onBlur={() => saveName(block.id)}
                  size="small"
                  className="flex-1"
                />
                <Button size="small" type="text" onClick={cancelEditName}>
                  {t("取消")}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-1">
                {showTitle && (
                  <h3
                    className="font-semibold text-gray-800"
                    style={{
                      fontSize: isEdit ? 16 : 14,
                    }}
                  >
                    {block.name}
                  </h3>
                )}
                {isEdit && (
                  <Button
                    size="small"
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => startEditName(block)}
                    className="opacity-60 hover:opacity-100"
                  />
                )}
              </div>
            )}
          </div>

          {/* 文本输入区 - 播放按钮在左侧 */}
          <div className="flex items-center gap-3">
            {isPlaying === block.id ? (
              <Button
                icon={<PauseCircleOutlined />}
                onClick={handleStopPlaying}
                className="flex-shrink-0"
                type="primary"
              ></Button>
            ) : (
              <Button
                icon={<PlayCircleOutlined />}
                onClick={handlePlayPhrase}
                className="flex-shrink-0"
              ></Button>
            )}
            {isEdit && (
              <Button
                type={block.showStaffNotation ? "primary" : "default"}
                icon={<FileTextOutlined />}
                onClick={() =>
                  onUpdate(
                    block.id,
                    "showStaffNotation",
                    !block.showStaffNotation
                  )
                }
                className="flex-shrink-0"
                title={t("显示五线谱")}
              ></Button>
            )}
            <div className={`${styles.phraseInput} flex-1`}>
              <HighlightedText
                content={block.content}
                blockId={block.id}
                onChange={(e) => onUpdate(block.id, "content", e.target.value)}
              />
            </div>
          </div>

          {/* 五线谱显示区域 */}
          {block.showStaffNotation && (
            <StaffNotation
              root={block.baseNote}
              str={convertToAbc(block.baseNote, block.content)}
            />
          )}
        </div>
      </Card>
    </div>
  );
};
