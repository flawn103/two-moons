import React, { useState, useEffect, useRef } from "react";
import {
  Button,
  Select,
  message,
  Tabs,
  Input,
  Divider,
  Checkbox,
  Space,
} from "antd";
import { ShareAltOutlined } from "@ant-design/icons";
import { proxy, useSnapshot } from "valtio";
import { useTranslation } from "next-i18next";
import { api } from "@/services/api";
import { appStore } from "@/stores/store";
import { chordStore } from "@/stores/chordStore";
import { useDrag } from "@/hooks/useDrag";
import { importMarketItemById } from "@/utils/marketImport";

import { db } from "@/utils/indexedDB";

export const GlobalShare: React.FC = () => {
  const { t } = useTranslation("common");
  const containerRef = useRef<HTMLDivElement>(null);
  const [state] = useState(
    proxy({
      collapse: true,
      activeTab: "chord",
      importId: "",
      selectedIds: [] as string[],
      isSharing: false,
      isImporting: false,
      isPublic: false,
      sharedResults: [] as { id: string; type: string; name: string }[],
      options: [] as { label: string; value: string; data: any }[], // Local options state
    })
  );

  const {
    collapse,
    activeTab,
    selectedIds,
    isSharing,
    importId,
    isImporting,
    sharedResults,
    isPublic,
    options,
  } = useSnapshot(state, {
    sync: true,
  });
  const { user, isInit } = useSnapshot(appStore);
  // Keep using store for favorites as they are needed for referenced chords
  const { favorites: chordFavorites } = useSnapshot(chordStore, { sync: true });

  // Load options from IndexedDB when panel opens or tab changes
  useEffect(() => {
    const loadOptions = async () => {
      if (collapse) return;

      try {
        let items: any[] = [];
        const raw = await db.getItem("CHORD_COLLECTIONS");
        if (raw) {
          // raw is JSON string of array
          try {
            // The getItem in utils/indexedDB.ts returns JSON.parse(result.value)
            items = typeof raw === "string" ? JSON.parse(raw) : raw;
          } catch (e) {
            console.error("Failed to parse chord collections", e);
          }
        }

        state.options = Array.isArray(items)
          ? items.map((item: any) => ({
              label: item.name || "Untitled",
              value: item.id,
              data: item, // Store full item data for sharing
            }))
          : [];
      } catch (error) {
        console.error("Failed to load options from DB:", error);
        message.error(t("加载选项失败"));
      }
    };

    loadOptions();
  }, [activeTab, collapse]);

  const { onMouseDown, onTouchStart, distance, isTrigClick } = useDrag(
    12.1 * 16,
    "bottom",
    "GLOBAL_SHARE_DRAG_DISTANCE"
  );

  // 当切换标签时，重置选择
  useEffect(() => {
    state.selectedIds = [];
  }, [activeTab]);

  // 解析URL参数并处理自动导入
  useEffect(() => {
    const handleUrlImport = async () => {
      if (typeof window === "undefined") return;

      const urlParams = new URLSearchParams(window.location.search);
      const shareParam = urlParams.get("share");

      if (shareParam && isInit) {
        try {
          state.isImporting = true;
          await importMarketItemById(shareParam, t);
          message.success(t("自动导入成功"));
        } catch (error) {
          console.error(error);
          message.error(t("导入失败，请检查链接是否有效"));
        } finally {
          state.isImporting = false;
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("share");
          window.history.replaceState({}, "", newUrl.toString());
        }
      }
    };

    handleUrlImport();
  }, [isInit]);

  const handleShare = async () => {
    if (!selectedIds || selectedIds.length === 0) {
      message.warning(t("请先选择要分享的内容"));
      return;
    }

    state.isSharing = true;
    state.sharedResults = [];
    try {
      const sharePromises = selectedIds.map(async (id) => {
        let content: any = null;
        let type = "";
        let name = "";

        const selectedOption = state.options.find((opt) => opt.value === id);
        if (!selectedOption) {
          throw new Error(t("找不到选中的项目"));
        }

        const collection = selectedOption.data;
        name = collection.name;

        // 找到该合集引用的所有和弦
        const referencedChords = chordFavorites.filter((chord) =>
          collection.ids.includes(chord.id)
        );

        content = {
          collection,
          chords: referencedChords,
        };
        type = "chord";

        const res = await api.post("/market", {
          content,
          type,
          userId: JSON.parse(localStorage.getItem("auth") || "{}")?.id ?? null,
          isPublic: state.isPublic,
        });

        return { id: res.id, type, name };
      });

      const results = await Promise.all(sharePromises);
      state.sharedResults = results.filter((r) => r.id);

      if (state.sharedResults.length > 0) {
        message.success(t("分享成功！"));
        state.selectedIds = [];
        // Keep panel open to show results
      } else {
        message.warning(t("未获取到分享码"));
      }
    } catch (error) {
      console.error("Share failed:", error);
      message.error(t("分享失败，请重试"));
    } finally {
      state.isSharing = false;
    }
  };

  const handleImport = async () => {
    if (!importId) return;
    state.isImporting = true;
    try {
      await importMarketItemById(importId, t);
      state.importId = "";
    } catch (error) {
      console.error(error);
      message.error(t("导入失败，请检查ID是否正确"));
    } finally {
      state.isImporting = false;
    }
  };

  const renderContent = () => {
    return (
      <div className="flex flex-col mt-4">
        <Select
          mode="multiple"
          optionFilterProp="label"
          style={{ width: "100%" }}
          placeholder={t("选择分享内容")}
          value={[...selectedIds]}
          onChange={(val: string[]) => (state.selectedIds = val)}
          options={[...options]}
        />
        <Space className="mt-2 justify-end">
          <Checkbox
            checked={isPublic}
            onChange={(e) => (state.isPublic = e.target.checked)}
          >
            {t("发布到市场")}
          </Checkbox>
          <Button
            type="primary"
            loading={isSharing}
            onClick={handleShare}
            block
          >
            {t("分享")}
          </Button>
        </Space>

        {sharedResults.length > 0 && (
          <div className="mt-4 flex flex-col gap-4">
            {sharedResults.map((result, index) => (
              <div key={index} className="border rounded-lg p-3 bg-gray-50">
                <div className="font-medium mb-2 text-sm">{result.name}</div>
                <Tabs
                  size="small"
                  items={[
                    {
                      key: "url",
                      label: t("分享链接"),
                      children: (
                        <div>
                          <div className="text-gray-400 mb-2 text-xs">
                            {t("将分享链接发送给朋友，打开即可导入")}
                          </div>
                          <div
                            onMouseDown={() => {
                              const path = "chord";
                              const url = `${window.location.protocol}//${window.location.host}/${path}?share=${result.id}`;
                              navigator.clipboard.writeText(url);
                              message.success(t("已复制链接"));
                            }}
                            className="p-2 bg-white rounded border flex justify-between items-center cursor-pointer hover:bg-gray-50"
                          >
                            <span className="font-mono break-all text-xs truncate mr-2">
                              {`${window.location.host}/chord?share=${result.id}`}
                            </span>
                            <span className="text-xs text-blue-500 flex-shrink-0">
                              {t("复制")}
                            </span>
                          </div>
                        </div>
                      ),
                    },
                    {
                      key: "code",
                      label: t("分享码"),
                      children: (
                        <div>
                          <div className="text-gray-400 mb-2 text-xs">
                            {t("将分享码发给朋友，在下方「导入」")}
                          </div>
                          <div
                            onMouseDown={() => {
                              navigator.clipboard.writeText(result.id);
                              message.success(t("已复制分享码"));
                            }}
                            className="p-2 bg-white rounded border flex justify-between items-center cursor-pointer hover:bg-gray-50"
                          >
                            <span className="font-mono break-all text-xs">
                              {result.id}
                            </span>
                            <span className="text-xs text-blue-500 flex-shrink-0">
                              {t("复制")}
                            </span>
                          </div>
                        </div>
                      ),
                    },
                  ]}
                />
              </div>
            ))}
          </div>
        )}

        <Divider />
        <div className="border-t flex gap-2">
          <Input
            placeholder={t("输入ID导入")}
            value={importId}
            onChange={(e) => (state.importId = e.target.value)}
          />
          <Button type="primary" onClick={handleImport} loading={isImporting}>
            {t("导入")}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="fixed z-50 right-0 shadow-lg transition-transform duration-300 ease-in-out bg-white rounded-l-xl border border-r-0 border-gray-200"
      style={{
        bottom: distance,
        transitionDuration: "450ms",
        transform: collapse ? "translateX(100%)" : "",
      }}
    >
      <Button
        className="absolute shadow-xl flex items-center justify-center bg-white"
        shape="circle"
        size="large"
        icon={
          <ShareAltOutlined
            style={{ fontSize: 20, paddingTop: 2, paddingRight: 2 }}
          />
        }
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
        onClick={() => {
          if (isTrigClick) {
            state.collapse = !state.collapse;
          }
        }}
        style={{
          left: collapse ? -46 : -30,
          bottom: 130,
          opacity: isInit ? 1 : 0.5,
        }}
      />

      <div className="p-4 h-full overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold m-0">{t("分享与导入")}</h3>
        </div>
        {renderContent()}
      </div>
    </div>
  );
};
