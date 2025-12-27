import React, { useState, useEffect } from "react";
import { useTranslation } from "next-i18next";

interface TypewriterTextProps {
  className?: string;
}

const TypewriterText: React.FC<TypewriterTextProps> = ({ className = "" }) => {
  const { t } = useTranslation("common");
  const [currentText, setCurrentText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const texts = [t("视唱练耳..."), t("记录和弦..."), t("学习乐理...")];

  useEffect(() => {
    const currentFullText = texts[currentIndex];

    if (isPaused) {
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        setIsDeleting(true);
      }, 2000); // 暂停2秒
      return () => clearTimeout(pauseTimer);
    }

    const timer = setTimeout(
      () => {
        if (!isDeleting) {
          // 打字阶段
          if (currentText.length < currentFullText.length) {
            setCurrentText(currentFullText.slice(0, currentText.length + 1));
          } else {
            // 完成打字，开始暂停
            setIsPaused(true);
          }
        } else {
          // 删除阶段
          if (currentText.length > 0) {
            setCurrentText(currentText.slice(0, -1));
          } else {
            // 删除完成，切换到下一个文本
            setIsDeleting(false);
            setCurrentIndex((prev) => (prev + 1) % texts.length);
          }
        }
      },
      isDeleting ? 50 : 120
    ); // 删除速度更快

    return () => clearTimeout(timer);
  }, [currentText, currentIndex, isDeleting, isPaused, texts]);

  return (
    <div className={`${className}`}>
      <span className="text-4xl md:text-6xl font-light text-primary tracking-wider">
        {currentText}
        <span className="animate-pulse font-thin">|</span>
      </span>
    </div>
  );
};

export default TypewriterText;
