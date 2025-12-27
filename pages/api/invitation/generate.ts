import { NextApiRequest, NextApiResponse } from "next";
import { client } from "@/services/client";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { AUTH_SECRET } from "@/services/constants";

const generateInvitations = async (
  req: NextApiRequest,
  res: NextApiResponse
) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 验证用户身份
  const tokenHeaderKey = "authorization-auth";
  const token = req.headers[tokenHeaderKey] as string;

  if (!token) {
    return res.status(401).json({ error: "未登录，无权限访问" });
  }

  try {
    const decoded = jwt.verify(token, AUTH_SECRET) as any;
    // 检查用户ID是否为0（管理员权限）
    if (decoded.id !== 0) {
      return res.status(403).json({ error: "权限不足，仅管理员可生成邀请码" });
    }
  } catch (error) {
    return res.status(401).json({ error: "Token无效" });
  }

  const { count = 100 } = req.body;

  if (count > 1000) {
    return res.status(400).json({ error: "一次最多生成1000个邀请码" });
  }

  try {
    // 生成邀请码数据
    const invitations = [];
    for (let i = 0; i < count; i++) {
      invitations.push({
        code: uuidv4().replace(/-/g, "").substring(0, 12).toUpperCase(),
        used: false,
        created_at: new Date().toISOString(),
      });
    }

    // 批量插入到数据库
    const { data, error } = await client
      .from("invitation")
      .insert(invitations)
      .select();

    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: "生成邀请码失败" });
    }

    return res.status(200).json({
      message: `成功生成${count}个邀请码`,
      count: data.length,
      codes: data.map((item) => item.code),
    });
  } catch (error) {
    console.error("Generate invitations error:", error);
    return res.status(500).json({ error: "服务器错误" });
  }
};

export default generateInvitations;
