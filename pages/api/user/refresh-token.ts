import { AUTH_SECRET } from "@/services/constants";
import { client } from "@/services/client";
import { response } from "@/services/utils";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  switch (req.method) {
    case "POST":
      return refreshToken(req, res);
    default:
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

const refreshToken = async (req, res) => {
  const tokenHeaderKey = "authorization-auth";
  const token = req.headers[tokenHeaderKey] as string;

  if (!token) {
    return res.status(401).json({ error: "NO TOKEN PROVIDED" });
  }

  try {
    // 验证当前token（即使过期也要能解析出用户信息）
    const decoded = jwt.verify(token, AUTH_SECRET, {
      ignoreExpiration: true,
    }) as any;

    // // 检查token是否真的过期了
    // const now = Math.floor(Date.now() / 1000);
    // if (decoded.exp && decoded.exp > now) {
    //   // token还没过期，直接返回原token
    //   return response(res, { token, refreshed: false });
    // }

    // 验证用户是否仍然存在
    const { data: user, error } = await client
      .from("user")
      .select("id, name")
      .eq("id", decoded.id)
      .single();

    console.log("decoded", decoded, decoded.id);

    if (error || !user) {
      return res.status(401).json({ error: "USER NOT FOUND" });
    }

    // 生成新的token
    const headers = { alg: "HS256", sign_type: "SIGN" };
    const payload = {
      id: user.id,
      timestamp: Date.now(),
    };

    const newToken = jwt.sign(payload, AUTH_SECRET, {
      header: headers,
      expiresIn: "5d",
    });

    response(res, {
      token: newToken,
      name: user.name,
      id: user.id,
      refreshed: true,
    });
  } catch (error) {
    console.log("Token refresh error:", error);
    res.status(401).json({ error: "INVALID TOKEN" });
  }
};
