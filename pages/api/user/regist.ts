import { AUTH_SECRET } from "@/services/constants";
import { client } from "@/services/client";
import { response } from "@/services/utils";
import { genHash } from "@/utils/crypto";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  switch (req.method) {
    case "POST":
      return regist(req, res);
    default:
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

const regist = async (req, res) => {
  const { password, name, invitationCode } = req.body;

  if (!password || !name || !invitationCode) {
    return res.status(400).json({ error: "用户名、密码和邀请码都是必填项" });
  }

  try {
    // 验证邀请码
    const { data: invitation, error: invitationError } = await client
      .from("invitation")
      .select("*")
      .eq("code", invitationCode)
      .eq("used", false)
      .single();

    if (invitationError || !invitation) {
      return res.status(400).json({ error: "邀请码无效或已被使用" });
    }

    // 检查用户名是否已存在
    const { data: existingUser, error: userCheckError } = await client
      .from("user")
      .select("*")
      .eq("name", name)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: "用户名已存在" });
    }

    // 创建新用户
    const hashedPassword = genHash(password);
    const { data: newUser, error: createError } = await client
      .from("user")
      .insert({
        name,
        password: hashedPassword,
      })
      .select()
      .single();

    if (createError) {
      throw createError;
    }

    // 标记邀请码为已使用
    const { error: updateInvitationError } = await client
      .from("invitation")
      .update({ used: true })
      .eq("code", invitationCode);

    if (updateInvitationError) {
      console.error("Failed to update invitation:", updateInvitationError);
    }

    // 生成JWT token
    const { id } = newUser;
    const headers = { alg: "HS256", sign_type: "SIGN" };
    const payload = {
      id,
      timestamp: Date.now(),
    };

    const token = jwt.sign(payload, AUTH_SECRET, {
      header: headers,
      expiresIn: "5d",
    });

    response(res, {
      token,
      name,
      id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "注册失败，请稍后重试" });
  }
};
