import { Tabs } from "antd";
import Head from "next/head";
import { useEffect, useState } from "react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";
import _ from "lodash";
import styles from "./index.module.scss";
import classNames from "classnames";
import { Melody } from "@/components/Practice/Melody";
import { Harmony } from "@/components/Practice/Harmony";
import { Interval } from "@/components/Practice/Interval";
import { Beat } from "@/components/Practice/Beat";
import { RandomRhythm } from "@/components/Practice/RandomRhythm";
import { StaffNote } from "@/components/Practice/StaffNote";
import { ChordProgression } from "@/components/Practice/ChordProgression";

const Practice = () => {
  const { t } = useTranslation("practice");
  const [activeKey, setActiveKey] = useState("harmony");

  const setMod = (v) => {
    location.hash = v;
    setActiveKey(v);
  };

  useEffect(() => {
    const mod = location.hash.slice(1) || "harmony";
    if (!_.isUndefined(mod)) {
      setActiveKey(mod as string);
    }
  }, []);

  return (
    <div className={classNames("pt-4 md:p-12", styles.practice)}>
      <Head>
        <title>{t("视唱练耳")}</title>
      </Head>
      <Tabs
        type="card"
        centered
        onChange={setMod}
        activeKey={activeKey}
        items={[
          { label: t("和弦辨认"), key: "harmony", children: <Harmony /> },
          {
            label: t("和弦进行"),
            key: "chord-progression",
            children: <ChordProgression />,
          },
          { label: t("音程辨认"), key: "interval", children: <Interval /> },
          { label: t("旋律辨认"), key: "melody", children: <Melody /> },
          // { label: t("拍号"), key: "beat", children: <Beat /> },
          { label: t("五线谱"), key: "staff-note", children: <StaffNote /> },
          { label: t("随机节奏"), key: "rhythm", children: <RandomRhythm /> },
          // { label: t("指板音程"), key: "fretboard", children: <Fretboard /> },
        ]}
      />
    </div>
  );
};

export default Practice;

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "zh", ["practice", "common"])),
    },
  };
};
