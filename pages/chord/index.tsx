import { ChordEditor } from "@/components/ChordEditor";
import Head from "next/head";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";

export default function ChordEditorPage() {
  const { t } = useTranslation('chord');
  
  return (
    <>
      <Head>
        <title>{t("和弦编辑器 - 吉他钢琴和弦图表生成器")}</title>
        <meta
          name="description"
          content={t("在线和弦编辑器，支持吉他和钢琴两种模式，自定义调弦、和弦识别、音阶显示等功能。生成专业的和弦图表，适合音乐学习和创作。")}
        />
        <meta
          name="keywords"
          content={t("和弦编辑器,吉他和弦,钢琴和弦,和弦图表,音乐理论,音乐学习")}
        />
      </Head>
      <div className="flex flex-col gap-8">
        <ChordEditor />
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'zh', ['chord', 'common'])),
    },
  };
};
