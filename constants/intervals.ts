import { useTranslation } from "next-i18next";

// 获取国际化的音程标签
export const useIntervalLabels = () => {
  const { t } = useTranslation("practice");
  return [
    {
      label: t("b2"),
      value: 1,
    },
    {
      label: t("2"),
      value: 2,
    },
    {
      label: t("b3"),
      value: 3,
    },
    {
      label: t("3"),
      value: 4,
    },
    {
      label: t("4"),
      value: 5,
    },
    {
      label: t("#4/b5"),
      value: 6,
    },
    {
      label: t("5"),
      value: 7,
    },
    {
      label: t("b6"),
      value: 8,
    },
    {
      label: t("6"),
      value: 9,
    },
    {
      label: t("b7"),
      value: 10,
    },
    {
      label: t("7"),
      value: 11,
    },
    {
      label: t("8"),
      value: 12,
    },
  ];
};

// 保留原始的INTERVALS常量用于值匹配
export const INTERVALS = [
  {
    label: "小二",
    value: 1,
  },
  {
    label: "大二",
    value: 2,
  },
  {
    label: "小三",
    value: 3,
  },
  {
    label: "大三",
    value: 4,
  },
  {
    label: "纯四",
    value: 5,
  },
  {
    label: "增四/减五",
    value: 6,
  },
  {
    label: "纯五",
    value: 7,
  },
  {
    label: "小六",
    value: 8,
  },
  {
    label: "大六",
    value: 9,
  },
  {
    label: "小七",
    value: 10,
  },
  {
    label: "大七",
    value: 11,
  },
  {
    label: "八度",
    value: 12,
  },
];
