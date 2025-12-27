import { Together } from "@/components/Together";
import { Divider } from "antd";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";

export default function EmptyPage() {
  const { t } = useTranslation('common');
  return (
    <div className="p-4 md:p-8 flex flex-col items-center">
      <h2 className="text-4xl font-thin">{t("内容建设中...")}</h2>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'zh', ['common'])),
    },
  };
};
