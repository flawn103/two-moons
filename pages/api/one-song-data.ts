import { client } from "@/services/client";
import { response } from "@/services/utils";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      return getOneSongData(req, res);
    default:
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

const getOneSongData = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // 并行获取 one_song = true 的 post 和 share 数据
    const [postResult, shareResult] = await Promise.all([
      client.from("post").select("*").eq("one_song", true).single(),
      client.from("share").select("*").eq("one_song", true).single(),
    ]);

    const { data: postData, error: postError } = postResult;
    const { data: shareData, error: shareError } = shareResult;

    if (postError && postError.code !== "PGRST116") {
      throw postError;
    }

    if (shareError && shareError.code !== "PGRST116") {
      throw shareError;
    }

    // 构建返回数据
    let result = {
      post: postData?.content || "",
      pkg: {},
    };

    // 如果有 share 数据，解析并设置为 pkg
    if (shareData?.content) {
      try {
        result.pkg = shareData.uuid;
      } catch (parseError) {
        console.error("解析分享内容失败:", parseError);
        result.pkg = "";
      }
    }

    response(res, result, 200);
  } catch (error) {
    console.error("获取OneSong数据失败:", error);
    res.status(500).json({ error: "获取OneSong数据失败" });
  }
};
