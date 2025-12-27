import { client } from "@/services/client";
import { response } from "@/services/utils";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      return getShare(req, res);
    default:
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

const getShare = async (req: NextApiRequest, res: NextApiResponse) => {
  const { uuid } = req.query;

  if (!uuid || typeof uuid !== "string") {
    return res.status(400).json({ error: "无效的分享码" });
  }

  try {
    const { data, error } = await client
      .from("share")
      .select("content, name")
      .eq("uuid", uuid)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "分享码不存在或已过期" });
      }
      throw error;
    }

    response(res, data, 200);
  } catch (error) {
    console.error("获取分享数据失败:", error);
    res.status(500).json({ error: "获取分享数据失败" });
  }
};
