import { Together } from "@/components/Together";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Card, Divider, Button, Modal, message, Select, Switch } from "antd";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";
import { dbManager } from "@/utils/indexedDB";
import { useState } from "react";
import { useSnapshot } from "valtio";
import { appStore } from "@/stores/store";
import { Preset } from "@/components/Preset";

export default function SettingPage() {
  const { t } = useTranslation("common");
  const [isForceModalVisible, setIsForceModalVisible] = useState(false);
  const [isForcing, setIsForcing] = useState(false);
  const [isClearModalVisible, setIsClearModalVisible] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const { practiceSkin, nightMode } = useSnapshot(appStore);

  // 强制推送版本功能
  const handleForcePushVersion = async () => {
    setIsForcing(true);
    try {
      // 获取所有本地数据
      const allLocalData = await dbManager.getAllItems();

      // 更新所有数据的时间戳为当前时间
      const currentTimestamp = Date.now();
      const updatedData = {};

      for (const item of allLocalData) {
        updatedData[item.key] = {
          value: item.value,
          timestamp: currentTimestamp,
        };
      }

      // 推送到服务器
      await dbManager.updateRemoteUserData(updatedData);

      message.success(t("强制推送成功"));
    } catch (error) {
      console.error("Force push failed:", error);
      message.error(t("强制推送失败"));
    } finally {
      setIsForcing(false);
      setIsForceModalVisible(false);
    }
  };

  const { user } = useSnapshot(appStore);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {process.env.NEXT_PUBLIC_BUILD_MODE !== "EXPORT" && (
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <span>{t("语言 / Language")}</span>
            <LanguageSwitcher />
          </div>
        </Card>
      )}

      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div>{t("关灯")}</div>
            <div className="text-sm text-gray-500 mt-1 pr-4">
              {t("开启后整体变暗")}
            </div>
          </div>
          <Switch
            checked={nightMode}
            onChange={(v) => (appStore.nightMode = v)}
          />
        </div>
      </Card>

      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div>{t("练习皮肤")}</div>
            <div className="text-sm text-gray-500 mt-1 pr-4">
              {t("用于练习界面外观切换")}
            </div>
          </div>
          <Select
            value={practiceSkin}
            onChange={(v) => (appStore.practiceSkin = v as any)}
            options={[
              { value: "default", label: t("默认") },
              { value: "roshengy", label: "roshengy" },
            ]}
            style={{ width: 160 }}
          />
        </div>
      </Card>

      {user.token && (
        <Card className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div>{t("一键推送版本")}</div>
              <div className="text-sm text-gray-500 mt-1 pr-4">
                {t(
                  "常用于新设备登录，推送所有本地数据到服务器并标记为最新，防止新设备数据覆盖当前数据"
                )}
              </div>
            </div>
            <Button
              type="primary"
              danger
              onClick={() => setIsForceModalVisible(true)}
            >
              {t("推送")}
            </Button>
          </div>
        </Card>
      )}

      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div>{t("清空本地数据")}</div>
            <div className="text-sm text-gray-500 mt-1 pr-4">
              {t("清空本地数据后将自动重载页面")}
            </div>
          </div>
          <Button
            type="primary"
            danger
            onClick={() => setIsClearModalVisible(true)}
          >
            {t("清空")}
          </Button>
        </div>
      </Card>

      <Preset />

      {/* 版本信息 */}
      {process.env.NEXT_PUBLIC_VERSION && (
        <div className="text-sm text-gray-500 mt-4 pr-4 flex justify-end">
          {t(`当前版本：V${process.env.NEXT_PUBLIC_VERSION}`)}
        </div>
      )}

      <Divider />

      <Together />

      <Modal
        title={t("确认强制推送")}
        open={isForceModalVisible}
        onOk={handleForcePushVersion}
        onCancel={() => setIsForceModalVisible(false)}
        confirmLoading={isForcing}
        okText={t("确认")}
        cancelText={t("取消")}
        okButtonProps={{ danger: true }}
      >
        <p>
          {t(
            "此操作将更新所有本地数据的时间戳并推送到服务器，确保您的数据不会被其他设备覆盖。是否继续？"
          )}
        </p>
      </Modal>

      <Modal
        title={t("确认清空本地数据")}
        open={isClearModalVisible}
        onOk={async () => {
          setIsClearing(true);
          try {
            localStorage.clear();
            await dbManager.clear();
            message.success(t("已清空本地数据"));
            window.location.reload();
          } catch (error) {
            console.error("Clear local data failed:", error);
            message.error(t("清空失败"));
          } finally {
            setIsClearing(false);
            setIsClearModalVisible(false);
          }
        }}
        onCancel={() => setIsClearModalVisible(false)}
        confirmLoading={isClearing}
        okText={t("确认")}
        cancelText={t("取消")}
        okButtonProps={{ danger: true }}
      >
        <p>{t("清空后无法恢复，是否继续？")}</p>
      </Modal>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "zh", ["common", "user"])),
    },
  };
};
