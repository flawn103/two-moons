import React, { useState, useRef, useEffect } from "react";
import { Input } from "antd";
import { isMobile } from "@/utils/env";
import styles from "./index.module.scss";

const { TextArea } = Input;

interface CustomTextInputProps {
  value: string;
  onChange: (e: { target: { value: string } }) => void;
  onBlur?: () => void;
  autoSize?: { minRows: number; maxRows: number };
  className?: string;
  placeholder?: string;
}

const CustomTextInput = React.forwardRef<any, CustomTextInputProps>(
  ({ value, onChange, onBlur, autoSize, className, placeholder }, ref) => {
    const [showCustomKeyboard, setShowCustomKeyboard] = useState(false);
    const [cursorPosition, setCursorPosition] = useState(0);
    const textAreaRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const deleteIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const deleteTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 合并外部ref和内部ref
    React.useImperativeHandle(ref, () => textAreaRef.current);

    // 键盘按键配置
    const keyboardKeys = [
      ["1", "2", "3", "4", "5", "6", "7"],
      [",", "'", "b", "#", , "-", "t", " "],
      ["⌫"],
    ];

    useEffect(() => {
      if (showCustomKeyboard && textAreaRef.current) {
        const textArea =
          textAreaRef.current.resizableTextArea?.textArea ||
          textAreaRef.current;
        textArea.focus();
        // 防止原生键盘弹出，但保持光标可见
        textArea.setAttribute("inputmode", "none");
      } else if (!showCustomKeyboard && textAreaRef.current) {
        const textArea =
          textAreaRef.current.resizableTextArea?.textArea ||
          textAreaRef.current;
        textArea.removeAttribute("inputmode");
      }
    }, [showCustomKeyboard]);

    // 点击外部区域关闭键盘
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          showCustomKeyboard &&
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setShowCustomKeyboard(false);
          const textArea =
            textAreaRef.current?.resizableTextArea?.textArea ||
            textAreaRef.current;
          if (textArea) {
            textArea.removeAttribute("inputmode");
          }
          if (onBlur) {
            onBlur();
          }
        }
      };

      if (showCustomKeyboard) {
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
          document.removeEventListener("mousedown", handleClickOutside);
        };
      }
    }, [showCustomKeyboard, onBlur]);

    // 清理定时器
    useEffect(() => {
      return () => {
        if (deleteTimeoutRef.current) {
          clearTimeout(deleteTimeoutRef.current);
        }
        if (deleteIntervalRef.current) {
          clearInterval(deleteIntervalRef.current);
        }
      };
    }, []);

    const handleFocus = () => {
      // 获取当前光标位置
      const textArea =
        textAreaRef.current?.resizableTextArea?.textArea || textAreaRef.current;
      if (textArea) {
        setCursorPosition(textArea.selectionStart || value.length);
      }

      // 移动端显示自定义键盘
      if (isMobile()) {
        setShowCustomKeyboard(true);
      }
    };

    const handleClick = () => {
      // 更新光标位置
      const textArea =
        textAreaRef.current?.resizableTextArea?.textArea || textAreaRef.current;
      if (textArea) {
        setTimeout(() => {
          setCursorPosition(textArea.selectionStart || 0);
        }, 0);
      }
    };

    const handleSelectionChange = () => {
      // 实时更新光标位置，处理拖动选择的情况
      const textArea =
        textAreaRef.current?.resizableTextArea?.textArea || textAreaRef.current;
      if (textArea && showCustomKeyboard) {
        setCursorPosition(textArea.selectionStart || 0);
      }
    };

    // 同步光标位置到DOM（仅在键盘显示状态变化时）
    useEffect(() => {
      if (showCustomKeyboard && textAreaRef.current) {
        const textArea =
          textAreaRef.current.resizableTextArea?.textArea ||
          textAreaRef.current;
        if (textArea) {
          setTimeout(() => {
            textArea.setSelectionRange(cursorPosition, cursorPosition);
          }, 0);
        }
      }
    }, [showCustomKeyboard]); // 移除value依赖，避免与手动设置冲突

    const handleKeyPress = (key: string) => {
      // 获取当前实际的光标位置
      const textArea =
        textAreaRef.current?.resizableTextArea?.textArea || textAreaRef.current;
      const actualCursorPosition = textArea
        ? textArea.selectionStart
        : cursorPosition;

      // 在光标位置插入字符
      const newValue =
        value.slice(0, actualCursorPosition) +
        key +
        value.slice(actualCursorPosition);
      onChange({ target: { value: newValue } });

      // 立即更新光标位置
      const newCursorPosition = actualCursorPosition + 1;
      setCursorPosition(newCursorPosition);

      // 使用requestAnimationFrame确保DOM更新后再设置光标
      requestAnimationFrame(() => {
        if (textArea) {
          textArea.focus();
          textArea.setSelectionRange(newCursorPosition, newCursorPosition);
        }
      });
    };

    const handleBackspace = () => {
      // 删除光标前的字符
      const textArea =
        textAreaRef.current?.resizableTextArea?.textArea || textAreaRef.current;
      const actualCursorPosition = textArea
        ? textArea.selectionStart
        : cursorPosition;

      if (textArea && actualCursorPosition > 0) {
        const newValue =
          value.slice(0, actualCursorPosition - 1) +
          value.slice(actualCursorPosition);
        onChange({ target: { value: newValue } });

        // 立即更新光标位置
        const newCursorPosition = actualCursorPosition - 1;
        setCursorPosition(newCursorPosition);

        // 使用requestAnimationFrame确保DOM更新后再设置光标
        requestAnimationFrame(() => {
          if (textArea) {
            textArea.focus();
            textArea.setSelectionRange(newCursorPosition, newCursorPosition);
          }
        });
      }
    };

    const refocus = () => {
      const textArea =
        textAreaRef.current?.resizableTextArea?.textArea || textAreaRef.current;

      if (textArea) {
        textArea.focus();
      }
    };

    const handleBackspaceStart = () => {
      // 立即执行一次删除
      handleBackspace();

      // 设置延迟后开始连续删除
      deleteTimeoutRef.current = setTimeout(() => {
        deleteIntervalRef.current = setInterval(() => {
          // 获取当前实际的光标位置和值
          const textArea =
            textAreaRef.current?.resizableTextArea?.textArea ||
            textAreaRef.current;
          if (textArea && textArea.selectionStart > 0) {
            const currentValue = textArea.value;
            const currentCursor = textArea.selectionStart;
            const newValue =
              currentValue.slice(0, currentCursor - 1) +
              currentValue.slice(currentCursor);
            onChange({ target: { value: newValue } });
            setCursorPosition(currentCursor - 1);
          }
        }, 100); // 每100ms删除一次
      }, 500); // 500ms后开始连续删除
    };

    const handleBackspaceEnd = () => {
      // 清除所有定时器
      if (deleteTimeoutRef.current) {
        clearTimeout(deleteTimeoutRef.current);
        deleteTimeoutRef.current = null;
      }
      if (deleteIntervalRef.current) {
        clearInterval(deleteIntervalRef.current);
        deleteIntervalRef.current = null;
      }
    };

    const handleBlur = (e: React.FocusEvent) => {
      // 如果点击的是自定义键盘，不要失焦
      if (containerRef.current?.contains(e.relatedTarget as Node)) {
        e.preventDefault();
        const textArea =
          textAreaRef.current?.resizableTextArea?.textArea ||
          textAreaRef.current;
        if (textArea) {
          textArea.focus();
        }
        return;
      }

      if (!isMobile() || !showCustomKeyboard) {
        if (onBlur) {
          onBlur();
        }
      }
    };

    return (
      <div
        ref={containerRef}
        className={styles.container}
        onClick={() => {
          refocus();
        }}
      >
        <TextArea
          ref={textAreaRef}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={handleClick}
          onSelect={handleSelectionChange}
          autoSize={autoSize}
          className={`${className} font-thin`}
          placeholder={placeholder}
          style={{
            caretColor: "auto",
          }}
        />

        {showCustomKeyboard && (
          <div className={styles.customKeyboard}>
            <div className={styles.keyboardHeader}>
              <span className={styles.title}>乐句输入</span>
              <span className="font-thin text-white">
                「,」低八度, 「'」高八度,「-」空拍,「t」连音
              </span>
            </div>
            <div className={styles.keyboardBody}>
              {keyboardKeys.map((row, rowIndex) => {
                if (rowIndex === 2) {
                  // 第二行分组布局
                  return (
                    <div
                      key={rowIndex}
                      className={`${styles.keyRow} ${styles.spacedRow} mt-4`}
                      style={{
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        className={`${styles.key} ${styles.backspaceKey}`}
                        style={{
                          maxWidth: 80,
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          // 只在非触摸设备上处理鼠标事件
                          if (!("ontouchstart" in window)) {
                            handleBackspaceStart();
                          }
                        }}
                        onMouseUp={(e) => {
                          if (!("ontouchstart" in window)) {
                            handleBackspaceEnd();
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!("ontouchstart" in window)) {
                            handleBackspaceEnd();
                          }
                        }}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          // 只在触摸设备上处理触摸事件
                          if ("ontouchstart" in window) {
                            handleBackspaceStart();
                          }
                        }}
                        onTouchEnd={(e) => {
                          if ("ontouchstart" in window) {
                            handleBackspaceEnd();
                          }
                        }}
                      >
                        ⌫
                      </button>
                    </div>
                  );
                } else {
                  // 第一行正常布局
                  return (
                    <div key={rowIndex} className={styles.keyRow}>
                      {row.map((key) => (
                        <button
                          key={key}
                          className={styles.key}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleKeyPress(key)}
                        >
                          {key}
                        </button>
                      ))}
                    </div>
                  );
                }
              })}
            </div>
          </div>
        )}
      </div>
    );
  }
);

CustomTextInput.displayName = "CustomTextInput";

export default CustomTextInput;
