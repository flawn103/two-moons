import { client } from "@/services/client";
import { response } from "@/services/utils";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return response(res, { error: "Method not allowed" }, 405);
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return response(res, { error: "Invalid ID" }, 400);
  }

  try {
    const { data, error } = await client
      .from("market")
      .select("id, created_at, content, created_by, type")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Not found code for single()
        return response(res, { error: "Item not found" }, 404);
      }
      throw error;
    }

    let content = data.content;
    try {
      if (typeof content === "string") content = JSON.parse(content);
    } catch (e) {}

    response(res, { ...data, content }, 200);
  } catch (error) {
    console.error("Failed to get market item:", error);
    res.status(500).json({ error: "Failed to get market item" });
  }
}
