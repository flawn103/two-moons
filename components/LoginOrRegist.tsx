import { StateContext } from "@/pages/_app";
import { api } from "@/services/api";
import { apiState } from "@/services/state";
import { useTranslation } from "next-i18next";
import { Alert, Button, Form, Input, Modal, message } from "antd";
import { pick } from "lodash";
import { useContext, useState } from "react";
import { useSnapshot } from "valtio";

export const LoginOrRegist: React.FC = () => {
  const { t } = useTranslation("user");
  const state = useContext(StateContext);
  const { user } = useSnapshot(state);
  const [visible, setVisible] = useState(false);
  const [validating, setValidating] = useState(false);
  const [form] = Form.useForm();
  const onFinish = async (values: any) => {
    try {
      setValidating(true);

      const res = await api.post("/user/login", values);
      state.user = pick(res, ["name", "id", "token"]);
      apiState.authToken = res.token;
      message.success(t("登录成功"));
      localStorage.setItem("auth", JSON.stringify(res));

      setVisible(false);
    } catch (e) {
      message.error(t("登录失败，请检查用户名或密码"));
    } finally {
      setValidating(false);
    }
  };

  return (
    <div>
      {user.name ? (
        <Button
          className="w-full"
          loading={validating}
          type="primary"
          onClick={() => {
            state.user = {};
            apiState.authToken = "";
            localStorage.removeItem("auth");
          }}
        >
          {t("登出")}
        </Button>
      ) : (
        <Button
          className="w-full"
          loading={validating}
          type="primary"
          onClick={() => setVisible(true)}
        >
          {t("登录")}
        </Button>
      )}
      <Modal
        okButtonProps={{
          loading: validating,
        }}
        okText={t("登录")}
        onOk={() => {
          form.validateFields().then((values) => {
            onFinish(values);
          });
        }}
        onCancel={() => setVisible(false)}
        title={t("登录")}
        open={visible}
      >
        <Form form={form} onFinish={onFinish}>
          <Form.Item
            labelCol={{ span: 4 }}
            name="name"
            label={t("用户名")}
            rules={[{ required: true }]}
          >
            <Input placeholder={t("用户名")}></Input>
          </Form.Item>
          <Form.Item
            labelCol={{ span: 4 }}
            name="password"
            label={t("密码")}
            rules={[{ required: true }]}
          >
            <Input placeholder={t("密码")}></Input>
          </Form.Item>
        </Form>

        <Alert
          showIcon
          type="warning"
          message={
            <div className="text-sm">
              {t(
                "多设备中最后一次编辑的数据将会覆盖云端。如果你不希望本机数据覆盖云端，请触发一次最新设备的数据更新，再进行登录。"
              )}
            </div>
          }
        />
      </Modal>
    </div>
  );
};
