import { Tabs } from "antd";
import Head from "next/head";
import { useEffect, useState } from "react";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";
import _ from "lodash";
import styles from "./index.module.scss";
import classNames from "classnames";
import { useRouter } from "next/router";
import { Fretboard } from "@/components/Practice/FretboardInterval";
import { NoteIdentification } from "@/components/Practice/NoteIdentification";

const Practice = () => {
  const { t } = useTranslation("practice");
  const router = useRouter();
  const { query } = router;
  const { mod } = query;
  const [activeKey, setActiveKey] = useState("interval");

  const setMod = (v) => router.push("/guitar-practice?mod=" + v);

  useEffect(() => {
    if (!_.isUndefined(mod)) {
      setActiveKey(mod as string);
    }
  }, [mod]);

  return (
    <div className={classNames("pt-4 md:p-12", styles.practice)}>
      <Head>
        <title>{t("指板练习")}</title>
      </Head>
      <Tabs
        type="card"
        centered
        onChange={setMod}
        activeKey={activeKey}
        items={[
          { label: t("指板音程"), key: "interval", children: <Fretboard /> },
          {
            label: t("指板音符"),
            key: "identification",
            children: <NoteIdentification />,
          },
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
