import { client } from "@/services/client";
import { response } from "@/services/utils";
import { NextApiRequest, NextApiResponse } from "next";

// 分享白名单ID数组
const SHARE_WHITELIST = [
  // 这里可以添加允许展示的分享ID
  // 例如: "uuid1", "uuid2", "uuid3"
];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      return getShareList(req, res);
    default:
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

const getShareList = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { page = 1, pageSize = 6, search = "" } = req.query;

    const pageNum = parseInt(page as string);
    const limit = parseInt(pageSize as string);
    const offset = (pageNum - 1) * limit;

    // 构建优化的查询条件
    const searchTerm = search?.toString().trim() || "";

    let query = client
      .from("share")
      .select("uuid, content, created_at, name", { count: "exact" })
      .not("name", "is", null)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // 应用搜索过滤
    if (searchTerm) {
      query = query.or(
        `name.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`
      );
    }

    // 执行查询
    const { data, error: fetchError, count } = await query;

    if (fetchError) throw fetchError;

    // 处理数据
    const processedShares = data
      .map((share) => {
        try {
          const content = JSON.parse(share.content);
          const shareInfo = {
            uuid: share.uuid,
            name: share.name,
            createdAt: share.created_at,
            collections: [],
          };

          // 提取合集信息
          if (content.CHORD_COLLECTIONS?.value) {
            shareInfo.collections.push(
              ...content.CHORD_COLLECTIONS.value.map((collection: any) => ({
                id: collection.id,
                name: collection.name,
                type: "chord",
                count: collection.ids?.length || 0,
              }))
            );
          }

          if (content.PHRASE_COLLECTIONS?.value) {
            shareInfo.collections.push(
              ...content.PHRASE_COLLECTIONS.value.map((collection: any) => ({
                id: collection.id,
                name: collection.name,
                type: "phrase",
                count: collection.ids?.length || 0,
              }))
            );
          }

          return shareInfo;
        } catch (parseError) {
          console.error("解析分享内容失败:", parseError);
          return null;
        }
      })
      .filter(Boolean);

    response(
      res,
      {
        list: processedShares,
        total: count || 0,
        page: pageNum,
        pageSize: limit,
      },
      200
    );
  } catch (error) {
    console.error("获取分享列表失败:", error);
    res.status(500).json({ error: "获取分享列表失败" });
  }
};
