import { Menu, MenuProps } from "antd";
import Head from "next/head";
import styles from "./practice.module.scss";
import classNames from "classnames";
import { useEffect, useState } from "react";
import _ from "lodash";
import { useRouter } from "next/router";

const PRACTICE_PATH_PREFIX = "/practice";

export default function PracticeLayout({ children }) {
  const [current, setCurrent] = useState("harmony");
  const router = useRouter();
  const { query } = router;
  const { mod } = query;

  const onClick: MenuProps["onClick"] = (e) => {
    router.push(PRACTICE_PATH_PREFIX + e.key);
  };

  return (
    <div className={classNames("pt-4 md:p-12", styles.practice)}>
      <Head>
        <title>视唱练耳</title>
      </Head>
      <Menu
        onClick={onClick}
        selectedKeys={[router.asPath]}
        mode="horizontal"
        items={[
          { label: "和弦辨认", key: "/practice/harmony" },
          { label: "音程辨认", key: "/practice/interval" },
          { label: "旋律辨认", key: "/practice/melody" },
          {
            label: "钢琴窗",
            key: "/utils/roll",
          },
        ]}
      />
      {children}
    </div>
  );
}
