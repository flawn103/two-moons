import React from "react";
import { Select } from "antd";
import { GlobalOutlined } from "@ant-design/icons";
import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import styles from "./index.module.scss";

const { Option } = Select;

export const LanguageSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const router = useRouter();
  const { locale, asPath } = router;

  const handleLanguageChange = (value: "zh" | "en") => {
    router.push(asPath, asPath, { locale: value });
  };

  return (
    <div className={styles.languageSwitcher}>
      <Select
        virtual={false}
        value={locale}
        popupMatchSelectWidth={false}
        onChange={handleLanguageChange}
        size="small"
        suffixIcon={<GlobalOutlined />}
        bordered={false}
      >
        <Option value="zh">{t("中文")}</Option>
        <Option value="en">{t("English")}</Option>
      </Select>
    </div>
  );
};

export default LanguageSwitcher;
