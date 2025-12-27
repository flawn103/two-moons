import { useState } from "react";
import {
  Button,
  Card,
  Input,
  message,
  Typography,
  Space,
  List,
  Modal,
} from "antd";
import { api } from "@/services/api";

const { Title, Text } = Typography;

const TestInvitationPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [count, setCount] = useState(100);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);

  const generateInvitations = async () => {
    if (count <= 0 || count > 1000) {
      message.error("请输入1-1000之间的数字");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/invitation/generate", { count });
      
      setGeneratedCodes(response.codes);
      setModalVisible(true);
      message.success(`成功生成${response.count}个邀请码`);
    } catch (error: any) {
      console.error("生成邀请码失败:", error);
      
      // 处理不同类型的错误
      if (error.response?.status === 401) {
        message.error("请先登录后再试");
      } else if (error.response?.status === 403) {
        message.error("权限不足，仅管理员可生成邀请码");
      } else if (error.response?.data?.error) {
        message.error(error.response.data.error);
      } else {
        message.error("生成邀请码失败，请重试");
      }
    } finally {
      setLoading(false);
    }
  };

  const copyAllCodes = () => {
    const codesText = generatedCodes.join("\n");
    navigator.clipboard
      .writeText(codesText)
      .then(() => {
        message.success("所有邀请码已复制到剪贴板");
      })
      .catch(() => {
        message.error("复制失败");
      });
  };

  const downloadCodes = () => {
    const codesText = generatedCodes.join("\n");
    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invitation-codes-${
      new Date().toISOString().split("T")[0]
    }.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success("邀请码文件已下载");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "40px 20px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 500,
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Title level={2} style={{ color: "#1890ff", marginBottom: 8 }}>
            🎫 邀请码生成器
          </Title>
          <Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
            临时测试工具 - 批量生成邀请码
          </Text>
          <Text type="warning" style={{ fontSize: 12 }}>
            ⚠️ 仅管理员（ID为0的用户）可使用此功能
          </Text>
        </div>

        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <Text strong style={{ display: "block", marginBottom: 8 }}>
              生成数量：
            </Text>
            <Input
              type="number"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 100)}
              placeholder="请输入要生成的邀请码数量"
              min={1}
              max={1000}
              style={{ borderRadius: 8 }}
            />
            <Text
              type="secondary"
              style={{ fontSize: 12, marginTop: 4, display: "block" }}
            >
              最多可生成1000个邀请码
            </Text>
          </div>

          <Button
            type="primary"
            size="large"
            loading={loading}
            onClick={generateInvitations}
            style={{
              width: "100%",
              height: 48,
              borderRadius: 8,
              fontSize: 16,
              fontWeight: "bold",
            }}
          >
            {loading ? "生成中..." : `生成 ${count} 个邀请码`}
          </Button>

          {generatedCodes.length > 0 && (
            <div style={{ textAlign: "center" }}>
              <Text type="success" strong>
                ✅ 已生成 {generatedCodes.length} 个邀请码
              </Text>
              <br />
              <Button
                type="link"
                onClick={() => setModalVisible(true)}
                style={{ padding: 0, marginTop: 8 }}
              >
                查看详情
              </Button>
            </div>
          )}
        </Space>
      </Card>

      <Modal
        title={`生成的邀请码 (${generatedCodes.length}个)`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={600}
        footer={[
          <Button key="copy" onClick={copyAllCodes}>
            复制全部
          </Button>,
          <Button key="download" type="primary" onClick={downloadCodes}>
            下载文件
          </Button>,
          <Button key="close" onClick={() => setModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <List
          size="small"
          dataSource={generatedCodes}
          renderItem={(code, index) => (
            <List.Item>
              <Text code copyable>
                {code}
              </Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                #{index + 1}
              </Text>
            </List.Item>
          )}
          style={{ maxHeight: 400, overflow: "auto" }}
        />
      </Modal>
    </div>
  );
};

export default TestInvitationPage;
