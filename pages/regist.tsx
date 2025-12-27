import { StateContext } from "@/pages/_app";
import { api } from "@/services/api";
import { apiState } from "@/services/state";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { GetStaticProps } from "next";
import { Alert, Button, Card, Form, Input, message } from "antd";
import { pick } from "lodash";
import { useContext, useState, useEffect } from "react";
import { useSnapshot } from "valtio";
import { useRouter } from "next/router";
import Link from "next/link";

const RegistPage: React.FC = () => {
  const { t } = useTranslation("user");
  const state = useContext(StateContext);
  const { user } = useSnapshot(state);
  const [validating, setValidating] = useState(false);
  const [form] = Form.useForm();
  const router = useRouter();

  // 监听URL参数变化，自动填入邀请码
  useEffect(() => {
    if (router.isReady && router.query.code) {
      form.setFieldsValue({
        invitationCode: router.query.code,
      });
    }
  }, [router.isReady, router.query.code, form]);

  const onFinish = async (values: any) => {
    try {
      setValidating(true);

      const res = await api.post("/user/regist", values);
      state.user = pick(res, ["name", "id", "token"]);
      apiState.authToken = res.token;
      message.success(t("注册成功，正在跳转..."));
      localStorage.setItem("auth", JSON.stringify(res));

      // 注册成功后跳转到首页
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (e) {
      message.error(t("注册失败，请检查邀请码或用户信息"));
    } finally {
      setValidating(false);
    }
  };

  // 如果已登录，显示提示信息
  if (user?.name) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card className="text-center">
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                {t("您已登录")}
              </h2>
              <p className="mt-2 text-gray-600">
                {t("当前用户")}：{user.name}
              </p>
            </div>
            <Link legacyBehavior href="/">
              <Button type="primary" size="large">
                {t("返回首页")}
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link legacyBehavior href="/">
            <img
              className="mx-auto h-12 w-auto cursor-pointer"
              src="/pics/logo.svg"
              alt="Logo"
            />
          </Link>
          <p className="text-sm">{t("让热爱回响于此")}</p>
          <img className="my-8" src="/pics/invite.jpg" alt="" height={400} />
          <h2 className="text-3xl font-thin text-gray-900">
            {t("注册邀请函")}
          </h2>
        </div>

        <Card className="mt-8 shadow">
          <Form form={form} onFinish={onFinish} layout="vertical" size="large">
            <Form.Item
              name="name"
              label={t("用户名")}
              rules={[
                { required: true, message: t("请输入用户名") },
                { min: 2, message: t("用户名至少2个字符") },
                { max: 20, message: t("用户名最多20个字符") },
                {
                  pattern: /^[a-zA-Z0-9_\u4e00-\u9fa5]+$/,
                  message: t("用户名只能包含字母、数字、下划线和中文"),
                },
              ]}
            >
              <Input placeholder={t("请输入用户名")} />
            </Form.Item>

            <Form.Item
              name="password"
              label={t("密码")}
              rules={[
                { required: true, message: t("请输入密码") },
                { min: 6, message: t("密码至少6个字符") },
                { max: 50, message: t("密码最多50个字符") },
              ]}
            >
              <Input.Password placeholder={t("请输入密码")} />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={t("确认密码")}
              dependencies={["password"]}
              rules={[
                { required: true, message: t("请确认密码") },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue("password") === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error(t("两次输入的密码不一致")));
                  },
                }),
              ]}
            >
              <Input.Password placeholder={t("请再次输入密码")} />
            </Form.Item>

            <Form.Item
              name="invitationCode"
              label={t("邀请码")}
              rules={[
                { required: true, message: t("请输入邀请码") },
                { min: 1, message: t("请输入有效的邀请码") },
              ]}
            >
              <Input placeholder={t("请输入邀请码")} />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={validating}
                className="w-full"
                size="large"
              >
                {validating ? t("注册中...") : t("立即注册")}
              </Button>
            </Form.Item>

            <Alert
              className="mt-4"
              showIcon
              type="info"
              description={
                <div className="text-sm">
                  <p>
                    • {t("登录后部分配置会进行云端同步，其他功能没有任何差异")}
                  </p>
                  <p>
                    •{" "}
                    {t(
                      "邀请码需要分享一个你自己的有效合集到市场或其他贡献，截图发送邮箱获取。大部分情况下你不会用到登录后的功能"
                    )}
                  </p>
                </div>
              }
            />
          </Form>
        </Card>
      </div>
    </div>
  );
};

export default RegistPage;

export const getStaticProps: GetStaticProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? "zh", ["user", "common"])),
    },
  };
};
