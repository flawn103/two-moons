import { client } from "@/services/client";
import { response } from "@/services/utils";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      return getMarketList(req, res);
    case "POST":
      return createMarketItem(req, res);
    default:
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

const getMarketList = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { page = 1, pageSize = 10, type, search } = req.query;

    const pageNum = parseInt(page as string);
    const limit = parseInt(pageSize as string);
    const offset = (pageNum - 1) * limit;

    let query = client
      .from("market")
      .select(
        "id, created_at, content, created_by, type, user:created_by(name)",
        {
          count: "exact",
        }
      )
      .eq("is_public", true)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq("type", type);
    }

    if (search) {
      query = query.ilike("content", `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    // Process content if it's a string, though we'll send it as is mostly
    const list = data.map((item: any) => {
      let content = item.content;
      try {
        if (typeof content === "string") {
          content = JSON.parse(content);
        }
      } catch (e) {
        // ignore parse error
      }
      return {
        ...item,
        content,
        created_by: item.user?.name,
      };
    });

    response(
      res,
      {
        list,
        total: count || 0,
        page: pageNum,
        pageSize: limit,
      },
      200
    );
  } catch (error) {
    console.error("Failed to get market list:", error);
    res.status(500).json({ error: "Failed to get market list" });
  }
};

const createMarketItem = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { content, type, userId, isPublic } = req.body;

    if (!content || !type) {
      return res.status(400).json({ error: "Missing content or type" });
    }

    const insertData = {
      content: typeof content === "string" ? content : JSON.stringify(content),
      type,
      created_by: userId ?? null, // Assuming userId is passed or null
      is_public: isPublic ?? false,
    };

    const { data, error } = await client
      .from("market")
      .insert(insertData)
      .select("id")
      .single();

    if (error) throw error;

    response(res, { id: data.id }, 200);
  } catch (error) {
    console.error("Failed to create market item:", error);
    res.status(500).json({ error: "Failed to create market item" });
  }
};
