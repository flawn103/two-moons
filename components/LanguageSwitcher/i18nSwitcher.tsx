import React from "react";
import { useTranslation } from "next-i18next";
import { useRouter } from "next/router";
import { Select } from "antd";
import styles from "./index.module.scss";

const { Option } = Select;

export const I18nLanguageSwitcher: React.FC = () => {
  const { t, i18n } = useTranslation("common");
  const router = useRouter();
  const { locale, locales, asPath } = router;

  const handleLanguageChange = (newLocale: string) => {
    // 使用 Next.js 的路由切换语言
    router.push(asPath, asPath, { locale: newLocale });
  };

  return (
    <div className={styles.languageSwitcher}>
      <Select
        virtual={false}
        value={locale}
        onChange={handleLanguageChange}
        className={styles.select}
        size="small"
        bordered={false}
      >
        <Option value="zh">{t("中文")}</Option>
        <Option value="en">{t("English")}</Option>
      </Select>
    </div>
  );
};
