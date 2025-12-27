import React from "react";
import Link from "next/link";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";
import TypewriterText from "@/components/TypewriterText";
import { Button, Divider } from "antd";
import { OneSong } from "@/components/OneSong";
import { useSnapshot } from "valtio";
import { appStore } from "@/stores/store";
import { useMemo } from "react";
import { planStore, ModuleGoal, ModuleType } from "@/stores/planStore";
import { Card } from "antd";
import { useRouter } from "next/router";
import { isMobile } from "@/utils/env";

export default function Home() {
  const { t, i18n } = useTranslation("common");
  const locale = i18n.language;
  const { user } = useSnapshot(appStore);
  const router = useRouter();
  const snap = useSnapshot(planStore);

  const currentPlan = useMemo(() => {
    return snap.plans.find((p) => p.id === (snap.currentPlanId || "")) || null;
  }, [snap.plans, snap.currentPlanId]);
  console.log(currentPlan, snap.plans, snap.currentPlanId);

  const goToModule = (type: ModuleType) => {
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

  return (
    <div>
      {/* {locale === "zh" && <OneSong />} */}
      <main className="bg-white pt-12 flex flex-col items-center justify-start md:justify-center">
        {/* 主标题 */}
        <div
          className="text-center"
          style={{
            marginTop: isMobile() ? 0 : "10vh",
          }}
        >
          <div className="relative">
            <div className="flex justify-center">
              <h1 className="text-5xl break-all text-left md:text-8xl font-bold text-primary mb-8 tracking-tight relative bg-white px-8 break-words">
                {`Hi, ${user.name || t("今天学点什么？")}`}
              </h1>
            </div>

            {/* 今日练习 */}
            {currentPlan && (
              <div>
                <h2 className="text-center">今日练习🌙</h2>
                <div className="mt-4 mb-8 flex flex-wrap gap-4 justify-center">
                  {currentPlan.modules.map((m: ModuleGoal) => (
                    <Card
                      key={`${currentPlan.id}-${m.type}`}
                      onClick={() => goToModule(m.type)}
                      style={{
                        backgroundColor: currentPlan?.progress[m.type]
                          ?.completed
                          ? "#e6ffed"
                          : "#f5f5f5",
                        border: "none",
                        cursor: "pointer",
                        minWidth: 220,
                      }}
                    >
                      <div className="flex flex-col">
                        <span>
                          {m.type === "guitar.note"
                            ? "指板音符"
                            : m.type === "guitar.interval"
                              ? "指板音程"
                              : m.type === "sings.chord"
                                ? "和弦辨认"
                                : m.type === "sings.interval"
                                  ? "音程辨认"
                                  : m.type === "sings.staff"
                                    ? "五线谱"
                                    : m.type === "sings.progression"
                                      ? "和弦进行"
                                      : "旋律辨认"}
                        </span>
                        <span className="text-gray-500 text-sm">{`${m.questions}题 / ${m.accuracy}%`}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* <h2 className="text-primar">{t("你可以在月盒")}</h2> */}
          </div>

          {/* 打字效果区域 */}
          <div className="h-20 md:h-32 flex items-center justify-center">
            <TypewriterText className="text-center" />
          </div>
        </div>

        {/* 分隔线 */}
        <div className="mb-6 md:mb-6"></div>

        {/* 行动按钮 */}
        <div
          className={`flex ${currentPlan ? "flex-row" : "flex-col"} flex-wrap justify-center md:flex-row gap-6`}
        >
          {(() => {
            const baseButtonClass =
              "px-10 py-4 h-auto text-lg font-medium border-2 border-black transition-all duration-300";
            const primaryButtonClass = `${baseButtonClass}`;
            const secondaryButtonClass = `${baseButtonClass}`;

            const buttons = [
              { href: "/post/basic/a-song", key: "教程", isPrimary: true },
              { href: "/practice", key: "练习", isPrimary: false },
              { href: "/chord", key: "和弦", isPrimary: false },
              { href: "/market", key: "市场", isPrimary: false },
            ];

            return buttons.map(({ href, key, isPrimary }) => (
              <Link key={key} href={href}>
                <Button
                  type={isPrimary ? "primary" : undefined}
                  className={
                    isPrimary ? primaryButtonClass : secondaryButtonClass
                  }
                >
                  {t(key)}
                </Button>
              </Link>
            ));
          })()}
        </div>

        {/* 副标题 */}
        {/* <p className="mt-12 px-10 max-w-3xl text-lg md:text-xl text-gray-500 font-normal">
          {t("让热爱在此回响")}
        </p> */}
      </main>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "zh", ["common"])),
    },
  };
};
