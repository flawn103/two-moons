import { api } from "@/services/api";
import { parseLvText } from "@/services/utils";
import { Button, Card, Space, Spin, message } from "antd";
import Link from "next/link";
import { useEffect, useState } from "react";
import { proxy, useSnapshot } from "valtio";
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { GetStaticProps } from 'next';

function PostList() {
  const { t } = useTranslation('common');
  const [state] = useState(
    proxy({
      list: [],
      loading: false,
    })
  );
  const { loading, list } = useSnapshot(state);

  const actions = {
    getList: async () => {
      state.loading = true;
      const res = await api.get("/post");
      state.list = res;
      state.loading = false;
    },
    delete: async (id) => {
      await api.delete("/post", {
        params: {
          id,
        },
      });
      message.success(t("删除成功"));
      await actions.getList();
    },
  };

  useEffect(() => {
    actions.getList();
  }, []);

  return (
    <Spin spinning={loading}>
      <div className="p-10">
        <header className="font-thin text-3xl mb-6">{t("文章列表")}</header>
        <div className="flex-col flex gap-4">
          {list.map((post) => {
            const { title, id } = post;
            return (
              <Card
                extra={
                  <Space>
                    <Link legacyBehavior prefetch href={`/post/edit?id=${id}`}>
                      <Button>{t("编辑")}</Button>
                    </Link>
                    <Button danger onClick={() => actions.delete(id)}>
                      {t("删除")}
                    </Button>
                  </Space>
                }
                className="shadow-md"
                title={title}
                key={post.id}
              >
                postId: {id}
              </Card>
            );
          })}
        </div>
      </div>
    </Spin>
  );
}

export default PostList;

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'zh', ['common'])),
    },
  };
};
