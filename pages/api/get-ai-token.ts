// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import _ from "lodash";
import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";

type AIResponse = {
  token: string;
};

const API_KEY = process.env.AI_API_KEY!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AIResponse>
) {
  const headers = { alg: "HS256", sign_type: "SIGN" };
  const [id, secret] = API_KEY.split(".");
  const payload = {
    api_key: id,
    exp: Date.now() + 1000 * 60 * 60 * 1,
    timestamp: Date.now(),
  };

  // 设置过期时间
  const token = jwt.sign(payload, secret, {
    header: headers,
  }); // 1h

  res.status(200).json({ token });
}
