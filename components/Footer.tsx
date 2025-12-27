import { checkPWA } from "@/utils/env";
import { Alert, Button, Drawer, message } from "antd";
import { useEffect, useState } from "react";
import { useTranslation } from "next-i18next";
import { AndroidFilled } from "@ant-design/icons";

export const Footer = () => {
  const [isPWA, setIsPWA] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { t, i18n } = useTranslation("common");
  const locale = i18n.language;

  // 检测设备类型
  const getDeviceType = () => {
    if (typeof navigator === "undefined") {
      return "pc";
    }
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;

    // 检测iOS设备（包括桌面模式）
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      return "ios";
    }

    // iOS 13+ 桌面模式检测：用户代理显示为Mac但平台仍为iOS设备
    // 或者检测触摸支持 + Mac平台（可能是iPad桌面模式）
    if (
      (platform && /iPhone|iPod|iPad/.test(platform)) ||
      (userAgent.includes("Mac OS X") &&
        "maxTouchPoints" in navigator &&
        navigator.maxTouchPoints > 0)
    ) {
      return "ios";
    }

    if (/Android/.test(userAgent)) {
      return "android";
    }

    return "pc";
  };

  // 根据设备类型获取对应的文档信息
  const getDocumentInfo = () => {
    const deviceType = getDeviceType();
    switch (deviceType) {
      case "ios":
        return {
          url: "https://docs.qq.com/doc/DV2FHS2NKSUFBWEFF",
        };
      case "android":
        return {
          url: "https://docs.qq.com/doc/DV3Nmd1pjUGtYa0dF",
        };
      case "pc":
      default:
        return {
          url: "https://docs.qq.com/doc/DV0tsUmRxcXBHQVpG",
        };
    }
  };

  useEffect(() => {
    // 初始检测PWA状态
    setIsPWA(checkPWA());

    // 监听display-mode变化
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleChange = () => setIsPWA(checkPWA());

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleChange);
    } else {
      // 兼容旧版浏览器
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", handleChange);
      } else {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return (
    <div className="flex px-4 flex-col items-center justify-center">
      <div
        style={{
          fontSize: 13,
          textAlign: "center",
        }}
        className="text-gray-500"
      >
        <div>
          <span>{t("有任何疑问/建议，可以联系")} </span>
          <a
            href="mailto:874706277@qq.com"
            onClick={(e) => {
              navigator.clipboard.writeText("874706277@qq.com");
              message.success(t("邮箱已复制到剪贴板"));
            }}
            className="text-primary"
            style={{ cursor: "pointer" }}
          >
            {t("邮箱")}
          </a>{" "}
          {t("或")}{" "}
          <a
            className="text-primary"
            target="__blank"
            href="https://qm.qq.com/q/pg9r0NBoYK"
          >
            {t("群聊")}
          </a>
        </div>
        {!process.env.NEXT_PUBLIC_BUILD_MODE && (
          <div className="mt-4">
            <div>
              {t("学习进阶的系统乐理，可尝试")}{" "}
              <a
                target="_blank"
                className="text-primary"
                href="https://music-theory.aizcutei.com/"
              >
                自由派音乐理论
              </a>
            </div>
            <div>
              {t("学习和讨论编曲知识，可尝试")}{" "}
              <a
                className="text-primary"
                target="_blank"
                href="https://dtmwiki.cn/"
              >
                DTMwiki
              </a>
            </div>
          </div>
        )}
      </div>

      {!process.env.NEXT_PUBLIC_BUILD_MODE && !isPWA && (
        <div className="text-center mt-4 mb-2 flex justify-center gap-4">
          <Button onClick={() => setDrawerVisible(true)}>
            {t("添加到桌面")}
          </Button>
          <Button
            href="https://hk.gh-proxy.org/https://raw.githubusercontent.com/moayuisuda/two-moons-release/refs/heads/main/moonbox-latest.apk"
            target="_blank"
            icon={<AndroidFilled />}
          >
            {t("APK 下载")}
          </Button>
        </div>
      )}

      <Drawer
        title={t("安装")}
        placement="bottom"
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        height="80vh"
        className="add-to-desktop-drawer"
        bodyStyle={{
          padding: 0,
        }}
      >
        <iframe
          src={getDocumentInfo().url}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
        />
      </Drawer>

      <span className="mt-2 mb-4 text-gray-500 font-thin text-sm">
        Copyright © 2025 moayuisuda. All rights reserved.
      </span>
    </div>
  );
};
