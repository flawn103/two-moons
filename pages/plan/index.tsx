import { useMemo, useState, useEffect } from "react";
import Head from "next/head";
import { GetStaticProps } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { useTranslation } from "next-i18next";
import { useSnapshot } from "valtio";
import { Capacitor } from "@capacitor/core";
import {
  planActions,
  planStore,
  ModuleType,
  ModuleGoal,
} from "@/stores/planStore";
import { requestNotificationPermissions } from "@/utils/notification";
import {
  Card,
  Input,
  InputNumber,
  Select,
  Space,
  Button,
  Divider,
  message,
  Tooltip,
  Switch,
} from "antd";
import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import { useRouter } from "next/router";

const modLabel: Record<ModuleType, string> = {
  "guitar.note": "指板音符",
  "guitar.interval": "指板音程",
  "sings.chord": "和弦辨认",
  "sings.interval": "音程辨认",
  "sings.melody": "旋律辨认",
  "sings.staff": "五线谱",
  "sings.progression": "和弦进行",
};

const goToModule = (router, type: ModuleType) => {
  if (type === "guitar.note")
    router.push("/guitar-practice?mod=identification");
  else if (type === "guitar.interval")
    router.push("/guitar-practice?mod=interval");
  else if (type === "sings.chord") router.push("/practice#harmony");
  else if (type === "sings.interval") router.push("/practice#interval");
  else if (type === "sings.melody") router.push("/practice#melody");
  else if (type === "sings.staff") router.push("/practice#staff-note");
  else if (type === "sings.progression")
    router.push("/practice#chord-progression");
};

const PlanPage = () => {
  const { t } = useTranslation("practice");
  const router = useRouter();
  const snap = useSnapshot(planStore);
  const [newType, setNewType] = useState<ModuleType | null>("sings.interval");
  const [newQuestions, setNewQuestions] = useState<number>(10);
  const [newAccuracy, setNewAccuracy] = useState<number>(80);
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.getPlatform() !== "web");
  }, []);

  const editingTemplate = useMemo(() => {
    return snap.templates.find((t) => t.id === snap.currentTemplateId) || null;
  }, [snap.templates, snap.currentTemplateId]);

  return (
    <div className="pt-4 md:p-12">
      <Head>
        <title>{t("计划")}</title>
      </Head>
      <Space direction="vertical" className="w-full">
        <Card
          title={t("计划")}
          bodyStyle={{
            padding: 16,
          }}
          extra={
            isNative && (
              <Space>
                <Switch
                  checkedChildren={t("通知")}
                  unCheckedChildren={t("通知")}
                  checked={snap.notificationEnabled}
                  onChange={async (val) => {
                    if (val) {
                      await requestNotificationPermissions();
                    }
                    planActions.setNotificationEnabled(val);
                  }}
                />
                {snap.notificationEnabled && (
                  <Select
                    value={snap.notificationTime}
                    onChange={(val) => planActions.setNotificationTime(val)}
                    options={Array.from({ length: 24 }).map((_, i) => ({
                      value: `${i.toString().padStart(2, "0")}:00`,
                      label: t("{{val}} 时", { val: i }),
                    }))}
                  />
                )}
              </Space>
            )
          }
        >
          <Space wrap>
            <Select
              value={snap.currentTemplateId ?? "__none__"}
              onChange={(val) => {
                if (val === "__create__") {
                  planActions.addTemplate({ name: t("新模板"), modules: [] });
                  const lastId =
                    planStore.templates[planStore.templates.length - 1]?.id;
                  if (lastId) planActions.setSelectedTemplate(lastId);
                  return;
                }
                if (val === "__none__") {
                  planActions.setSelectedTemplate(null);
                  return;
                }
                planActions.setSelectedTemplate(val);
              }}
              options={[
                { value: "__none__", label: t("无计划") },
                ...snap.templates.map((tItem) => ({
                  value: tItem.id,
                  label: (
                    <div className="flex items-center justify-between">
                      <span>{t(tItem.name)}</span>
                      <Tooltip title={t("重命名")}>
                        <EditOutlined
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            planActions.setSelectedTemplate(tItem.id);
                            const next = window.prompt(
                              t("输入新名称"),
                              t(tItem.name)
                            );
                            if (typeof next === "string" && next.trim()) {
                              planActions.updateTemplate(tItem.id, {
                                name: next.trim(),
                              });
                            }
                          }}
                        />
                      </Tooltip>
                    </div>
                  ),
                })),
                { value: "__create__", label: t("+新模板") },
              ]}
              style={{ minWidth: 100 }}
            />
            <Button
              type="primary"
              onClick={() => {
                const tplId = snap.currentTemplateId ?? null;
                planActions.setCurrentTemplate(tplId);
                if (tplId) {
                  message.success(t("计划已应用"));
                } else {
                  message.success(t("已取消计划"));
                }
              }}
            >
              {t("应用")}
            </Button>
            {editingTemplate && (
              <Button
                danger
                onClick={() => {
                  const id = editingTemplate.id;
                  planActions.removeTemplate(id);
                  planActions.setSelectedTemplate(
                    planStore.templates[0]?.id || null
                  );
                }}
              >
                {t("删除")}
              </Button>
            )}
          </Space>

          <div className="p-4 mt-4 rounded-md bg-gray-100">
            {editingTemplate && (
              <Space
                className="w-full justify-center"
                style={{ marginBottom: 12 }}
              >
                <span className="font-bold">{t("计划名称")}</span>
                <Input
                  style={{ maxWidth: 240 }}
                  value={t(editingTemplate.name)}
                  onChange={(e) =>
                    planActions.updateTemplate(editingTemplate.id, {
                      name: e.target.value,
                    })
                  }
                />
              </Space>
            )}
            {editingTemplate && (
              <>
                <Space direction="vertical" className="w-full">
                  {editingTemplate.modules.map((m: ModuleGoal, idx) => (
                    <Space
                      size="middle"
                      key={idx}
                      className="flex-wrap border border-solid border-gray-200 p-4 rounded-md"
                    >
                      <span className="font-bold mr-4">
                        {t(modLabel[m.type])}
                      </span>
                      <div className="flex gap-4 flex-wrap items-center">
                        <span>{t("题目数")}</span>
                        <InputNumber
                          min={1}
                          max={999}
                          value={m.questions}
                          onChange={(v) => {
                            const tm = editingTemplate.modules.slice();
                            tm[idx] = { ...m, questions: Number(v || 0) };
                            planActions.updateTemplate(editingTemplate.id, {
                              modules: tm,
                            });
                          }}
                        />
                        <span>{t("正确率")}</span>
                        <InputNumber
                          min={0}
                          max={100}
                          formatter={(value) => `${value}%`}
                          parser={(value) =>
                            Number(String(value || "0").replace("%", ""))
                          }
                          value={m.accuracy}
                          onChange={(v) => {
                            const tm = editingTemplate.modules.slice();
                            tm[idx] = { ...m, accuracy: Number(v || 0) };
                            planActions.updateTemplate(editingTemplate.id, {
                              modules: tm,
                            });
                          }}
                        />
                        <Button
                          type="primary"
                          onClick={() => goToModule(router, m.type)}
                        >
                          {t("开始练习")}
                        </Button>
                        <Button
                          danger
                          onClick={() =>
                            planActions.removeModuleFromTemplate(
                              editingTemplate.id,
                              idx
                            )
                          }
                        >
                          {t("删除")}
                        </Button>
                      </div>
                    </Space>
                  ))}
                </Space>
                <Space
                  wrap
                  className="mt-2 gap-4 border border-dashed p-4 border-gray-300 rounded-md"
                >
                  <span className="font-bold mr-4">{t("新增项目")}</span>
                  <div className="flex gap-4 flex-wrap items-center">
                    <Select
                      value={newType || undefined}
                      style={{ minWidth: 136 }}
                      onChange={(val) => setNewType(val)}
                      options={
                        [
                          {
                            value: "sings.chord",
                            label: t(modLabel["sings.chord"]),
                          },
                          {
                            value: "sings.progression",
                            label: t(modLabel["sings.progression"]),
                          },

                          {
                            value: "sings.interval",
                            label: t(modLabel["sings.interval"]),
                          },
                          {
                            value: "sings.melody",
                            label: t(modLabel["sings.melody"]),
                          },
                          {
                            value: "sings.staff",
                            label: t(modLabel["sings.staff"]),
                          },

                          {
                            value: "guitar.note",
                            label: t(modLabel["guitar.note"]),
                          },
                          {
                            value: "guitar.interval",
                            label: t(modLabel["guitar.interval"]),
                          },
                        ] as { value: ModuleType; label: string }[]
                      }
                    />
                    <span>{t("题目数")}</span>
                    <InputNumber
                      min={1}
                      max={999}
                      value={newQuestions}
                      onChange={(v) => setNewQuestions(Number(v || 1))}
                    />
                    <span>{t("正确率")}</span>
                    <InputNumber
                      min={0}
                      max={100}
                      formatter={(value) => `${value}%`}
                      parser={(value) =>
                        Number(String(value || "0").replace("%", ""))
                      }
                      value={newAccuracy}
                      onChange={(v) => setNewAccuracy(Number(v || 0))}
                    />
                    <Button
                      type="primary"
                      onClick={() => {
                        if (!newType) return;
                        planActions.addModuleToTemplate(editingTemplate.id, {
                          type: newType,
                          questions: newQuestions,
                          accuracy: newAccuracy,
                        });
                      }}
                    >
                      {t("添加")}
                    </Button>
                  </div>
                </Space>
              </>
            )}
          </div>
        </Card>
      </Space>
    </div>
  );
};

export default PlanPage;

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "zh", ["practice", "common"])),
    },
  };
};
