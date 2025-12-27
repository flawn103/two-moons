"use client";

import {
  Button,
  Card,
  Progress,
  Space,
  Typography,
  message,
  Tooltip,
  Radio,
} from "antd";
import { useSnapshot } from "valtio";
import { appStore } from "@/stores/store";
import { useTranslation } from "next-i18next";
import { useState, useEffect } from "react";
import {
  PlayCircleOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
} from "@ant-design/icons";
import { soundPresets } from "@/utils/soundPresets";

const { Text } = Typography;

// 共享的预设显示名称函数
const getPresetDisplayName = (key: string, t: (key: string) => string) => {
  const names: { [key: string]: string } = {
    sine: t("合成器"),
    piano: t("钢琴"),
    guitar: t("钢弦吉他"),
    "jazz-guitar": t("爵士吉他"),
    marimba: t("马林巴"),
    "8bit": t("2000s"),
  };
  return names[key] || key;
};

// 共享的预设显示名称函数
const getInstrumentDisplayName = (key: string, t: (key: string) => string) => {
  const names: { [key: string]: string } = {
    piano: t("钢琴"),
    guitar: t("吉他"),
  };
  return names[key] || key;
};

interface PresetCardProps {
  presetKey: string;
  preset: any;
  isSelected: boolean;
  onSelect: (presetKey: string) => void;
  onTest: (presetKey: string) => void;
}

type Instrument = "guitar" | "piano" | "marimba";

const PresetCard = ({
  presetKey,
  preset,
  isSelected,
  onSelect,
  onTest,
}: PresetCardProps) => {
  const { t } = useTranslation(["common"]);
  const { resourceManager } = useSnapshot(appStore);
  const [loadingStatus, setLoadingStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [loadingProgress, setLoadingProgress] = useState(0);

  const requiredResources = preset.requiredResources || [];
  const hasRequiredResources = requiredResources.length > 0;

  // 检查资源状态
  const checkResourceStatus = () => {
    if (!hasRequiredResources) {
      setLoadingStatus("ready");
      return;
    }

    const allReady = requiredResources.every((resourceId: string) => {
      const status = resourceManager.getStatus(resourceId);
      return status.ready;
    });

    const anyLoading = requiredResources.some((resourceId: string) => {
      const status = resourceManager.getStatus(resourceId);
      return status.loading;
    });

    const anyError = requiredResources.some((resourceId: string) => {
      const status = resourceManager.getStatus(resourceId);
      return status.error;
    });

    if (allReady) {
      setLoadingStatus("ready");
      setLoadingProgress(100);
    } else if (anyLoading) {
      setLoadingStatus("loading");
      // 简单的进度估算
      const readyCount = requiredResources.filter((resourceId: string) => {
        const status = resourceManager.getStatus(resourceId);
        return status.ready;
      }).length;
      setLoadingProgress((readyCount / requiredResources.length) * 100);
    } else if (anyError) {
      setLoadingStatus("error");
    } else {
      setLoadingStatus("idle");
    }
  };

  useEffect(() => {
    checkResourceStatus();
    // 定期检查状态更新
    const interval = setInterval(checkResourceStatus, 500);
    return () => clearInterval(interval);
  }, [resourceManager, requiredResources]);

  const handleLoadResources = async () => {
    if (!hasRequiredResources) return;

    try {
      setLoadingStatus("loading");
      await resourceManager.loadResources(requiredResources);
      message.success(t("资源加载成功"));
    } catch (error) {
      console.error("Failed to load resources:", error);
      message.error(t("资源加载失败"));
      setLoadingStatus("error");
    }
  };

  const getStatusIcon = () => {
    switch (loadingStatus) {
      case "loading":
        return <LoadingOutlined className="text-blue-500" />;
      case "ready":
        return <CheckCircleOutlined className="text-green-500" />;
      case "error":
        return <InfoCircleOutlined className="text-red-500" />;
      default:
        return null;
    }
  };

  const canSelect = loadingStatus === "ready";
  const canTest = loadingStatus === "ready";

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 ${
        isSelected ? "border-gray-900 shadow-md" : "hover:border-gray-400"
      } ${!canSelect ? "opacity-60" : ""}`}
      onClick={() => canSelect && onSelect(presetKey)}
      styles={{
        body: {
          padding: "8px",
        },
      }}
      size="small"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <Text strong>{getPresetDisplayName(presetKey, t)}</Text>
        </div>

        <div className="flex items-center space-x-2">
          {loadingStatus === "loading" && (
            <Progress
              type="circle"
              size={24}
              percent={loadingProgress}
              showInfo={false}
            />
          )}

          {loadingStatus === "idle" && hasRequiredResources && (
            <Button
              size="small"
              className="ml-2"
              type="primary"
              icon={<DownloadOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                handleLoadResources();
              }}
            ></Button>
          )}

          {canTest && (
            <Tooltip title={t("试听")}>
              <Button
                size="small"
                className="ml-2"
                icon={<PlayCircleOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  onTest(presetKey);
                }}
              />
            </Tooltip>
          )}
        </div>
      </div>
    </Card>
  );
};

export const Preset = () => {
  const { audioPreset } = useSnapshot(appStore);
  const { t } = useTranslation(["common"]);
  const [selectedInstrument, setSelectedInstrument] =
    useState<Instrument>("piano");
  const [cacheInfo, setCacheInfo] = useState<{
    totalEntries: number;
    totalSize: number;
    oldestEntry?: number;
    newestEntry?: number;
  }>({ totalEntries: 0, totalSize: 0 });

  useEffect(() => {
    // 获取缓存信息
    const updateCacheInfo = async () => {
      try {
        const info = await appStore.resourceManager.getCacheInfo();
        setCacheInfo(info);
      } catch (error) {
        console.error("Failed to get cache info:", error);
      }
    };

    updateCacheInfo();
    const interval = setInterval(updateCacheInfo, 5000); // 每5秒更新一次
    return () => clearInterval(interval);
  }, []);

  const handlePresetSelect = (presetKey: string) => {
    appStore.audioPreset = {
      ...appStore.audioPreset,
      [selectedInstrument]: presetKey as keyof typeof soundPresets,
    };
  };

  const handlePresetTest = async (presetKey: string) => {
    try {
      // 创建临时合成器进行试听
      const { MoaTone } = await import("@/utils/MoaTone");
      const synth = new MoaTone.Synth({
        preset: presetKey as keyof typeof soundPresets,
      });
      synth.toDestination();

      // 播放一个简单的和弦
      synth.triggerAttackReleaseArpeggio(["C4", "E4", "G4"], 0.2, 1.2);
    } catch (error) {
      console.error("Failed to test preset:", error);
      message.error(t("试听失败"));
    }
  };

  const handleClearCache = async () => {
    try {
      await appStore.resourceManager.clearCache();
      message.success(t("缓存已清除"));

      // 清除缓存后，重新获取缓存信息以确保界面更新
      const updatedInfo = await appStore.resourceManager.getCacheInfo();

      setCacheInfo(updatedInfo);
    } catch (error) {
      console.error("Failed to clear cache:", error);
      message.error(t("清除缓存失败"));
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <Card
      title={t("音色设置")}
      styles={{
        header: {
          fontSize: 14,
          fontWeight: "normal",
        },
      }}
    >
      {/* 乐器选择 */}
      <div className="inline-flex gap-2 mb-4">
        <Radio.Group
          value={selectedInstrument}
          onChange={(e) => setSelectedInstrument(e.target.value)}
          optionType="button"
          buttonStyle="solid"
          options={[
            {
              label: getInstrumentDisplayName("piano", t),
              value: "piano",
            },
            {
              label: getInstrumentDisplayName("guitar", t),
              value: "guitar",
            },
          ]}
        ></Radio.Group>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        {Object.entries(soundPresets).map(([presetKey, preset]) => (
          <PresetCard
            key={presetKey}
            presetKey={presetKey}
            preset={preset}
            isSelected={audioPreset[selectedInstrument] === presetKey}
            onSelect={handlePresetSelect}
            onTest={handlePresetTest}
          />
        ))}
      </div>

      {/* 缓存管理区域 */}
      <Space direction="vertical" className="w-full">
        <div className="flex justify-between items-center">
          <span>
            <Text>
              {t("缓存大小")}: {formatBytes(cacheInfo.totalSize)}
            </Text>
            <Button
              icon={<DeleteOutlined />}
              onClick={handleClearCache}
              className="ml-2"
              disabled={cacheInfo.totalEntries === 0}
              size="small"
              danger
            >
              {t("清除")}
            </Button>
          </span>
        </div>
      </Space>
    </Card>
  );
};
