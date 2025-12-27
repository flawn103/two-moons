import { Divider, Input, Select, Space, Tabs, Tag } from "antd";
import Head from "next/head";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";
import { useEffect, useState } from "react";
import _ from "lodash";
import styles from "./index.module.scss";
import classNames from "classnames";
import { Roll } from "@/components/MoaRoll";
import { isMobile } from "@/utils/env";
import { useRouter } from "next/router";
import { scaleChords } from "rad.js";
import { SCALE_TYPES } from "@/utils/music";
import { ChordEditor as NewChordEditor } from "@/components/ChordEditor";

export const RollWrapper = () => {
  return (
    <div className={classNames(styles["tab-single"], styles["roll-wrapper"])}>
      <Roll
        keyboardPiano={isMobile() ? false : true}
        showController
        controllers={{
          bpm: true,
          // clear: true,
          octave: false,
          length: true,
        }}
        data={{
          timeLength: 16,
          currentTrack: "piano",
          bpm: 120,
          keyboardOctave: 3,
          tracks: [
            {
              range: ["C3", "C4"],
              instrument: "piano",
              notes: [],
            },
            {
              instrument: "drum",
              notes: [],
            },
            {
              range: ["C2", "C3"],
              instrument: "bass",
              notes: [],
            },
          ],
        }}
      />
    </div>
  );
};

const Note = ({ note }: { note: string }) => {
  if (note.endsWith("dim"))
    return (
      <Tag bordered={false} color="purple">
        {note}
      </Tag>
    );
  if (note.endsWith("m"))
    return (
      <Tag bordered={false} color="blue">
        {note}
      </Tag>
    );
  return (
    <Tag bordered={false} color="orange">
      {note}
    </Tag>
  );
};
export const GenScaleChords = () => {
  const [root, setRoot] = useState("C");
  const [type, setType] = useState("ionian");
  const genChords = () => {
    try {
      return scaleChords({ root, type });
    } catch {
      return [];
    }
  };

  return (
    <div className={classNames(styles["tab-single"])}>
      <Space>
        <Input
          size="large"
          onChange={(v) => setRoot(v.target.value)}
          value={root}
          style={{
            width: 60,
            height: 40,
            textAlign: "center",
          }}
        ></Input>
        <Select
          virtual={false}
          popupMatchSelectWidth={false}
          size="large"
          options={SCALE_TYPES.map((value) => ({
            value: value,
            label: value,
          }))}
          onChange={(v) => setType(v)}
          value={type}
        ></Select>
      </Space>

      <div>
        {genChords().map((n) => (
          <Note note={n} key={n} />
        ))}
      </div>
    </div>
  );
};

export const ChordEditor = () => {
  return (
    <div className={classNames(styles["tab-single"])}>
      <NewChordEditor />
    </div>
  );
};

const Tool = () => {
  const { t } = useTranslation("common");
  const router = useRouter();
  const { query } = router;
  const { mod } = query;
  const [activeKey, setActiveKey] = useState("genScaleChords");

  const setMod = (v) => {
    router.push("/tool?mod=" + v);
  };

  useEffect(() => {
    if (!_.isUndefined(mod)) {
      setActiveKey(mod as string);
    }
  }, [mod]);

  return (
    <div className={classNames("pt-4 md:p-12", styles.tab)}>
      <Head>
        <title>{t("工具箱")}</title>
      </Head>
      <Tabs
        type="card"
        centered
        onChange={(e) => setMod(e)}
        activeKey={activeKey}
        items={[
          {
            label: t("音阶和弦"),
            key: "genScaleChords",
            children: <GenScaleChords />,
          },
          {
            label: t("钢琴窗"),
            key: "roll",
            children: <RollWrapper />,
          },
          // {
          //   label: "和弦编辑",
          //   key: "chord",
          //   children: <ChordEditor />,
          // },
        ]}
      />
    </div>
  );
};

export default Tool;

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "zh", ["common"])),
    },
  };
};
