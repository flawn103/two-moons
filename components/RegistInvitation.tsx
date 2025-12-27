import { StateContext } from "@/pages/_app";
import { api } from "@/services/api";
import { apiState } from "@/services/state";
import { Alert, Button, Form, Input, Modal, message } from "antd";
import { pick } from "lodash";
import { useContext, useState } from "react";
import { useSnapshot } from "valtio";

export const RegistInvitation: React.FC = () => {
  const state = useContext(StateContext);
  const { user } = useSnapshot(state);
  const [visible, setVisible] = useState(false);
  const [validating, setValidating] = useState(false);
  const [form] = Form.useForm();
  
  const onFinish = async (values: any) => {
    try {
      setValidating(true);

      const res = await api.post("/user/regist", values);
      state.user = pick(res, ["name", "id", "token"]);
      apiState.authToken = res.token;
      message.success("注册成功");
      localStorage.setItem("auth", JSON.stringify(res));

      setVisible(false);
    } catch (e) {
      message.error("注册失败，请检查邀请码或用户信息");
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="">
      {!user.name && (
        <Button
          loading={validating}
          type="text"
          size="small"
          onClick={() => setVisible(true)}
        >
          注册
        </Button>
      )}
      <Modal
        okButtonProps={{
          loading: validating,
        }}
        okText="注册"
        onOk={() => {
          form.validateFields().then((values) => {
            onFinish(values);
          });
        }}
        onCancel={() => setVisible(false)}
        title="注册邀请函"
        open={visible}
      >
        <Form form={form} onFinish={onFinish}>
          <Form.Item
            labelCol={{ span: 4 }}
            name="name"
            label="用户名"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input placeholder="用户名"></Input>
          </Form.Item>
          <Form.Item
            labelCol={{ span: 4 }}
            name="password"
            label="密码"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password placeholder="密码"></Input.Password>
          </Form.Item>
          <Form.Item
            labelCol={{ span: 4 }}
            name="invitationCode"
            label="邀请码"
            rules={[{ required: true, message: "请输入邀请码" }]}
          >
            <Input placeholder="邀请码"></Input>
          </Form.Item>
        </Form>

        <Alert
          showIcon
          type="info"
          message={
            <div className="text-sm">
              请确保邀请码有效且未被使用。注册成功后将自动登录。
            </div>
          }
        />
      </Modal>
    </div>
  );
};