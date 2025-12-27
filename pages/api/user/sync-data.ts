import { withLogging } from "@/services/apiLogging";
import { jwtAuth } from "@/services/auth";
import { client } from "@/services/client";
import { response } from "@/services/utils";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case "GET":
      return jwtAuth(getUserData)(req, res);
    case "PUT":
      return withLogging(jwtAuth(updateUserData))(req, res);
    default:
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// 获取用户的 user_data
const getUserData = async (req: any, res: NextApiResponse) => {
  try {
    const userId = req.user.id; // 从JWT中获取用户ID

    const { data, error } = await client
      .from("user")
      .select("user_data")
      .eq("id", userId)
      .single();

    if (error) throw error;

    // 如果user_data为空，返回空对象
    const userData = data?.user_data || {};
    response(res, userData);
  } catch (error) {
    console.error("Error getting user data:", error);
    res.status(500).json({ error: error.message });
  }
};

// 更新用户的 user_data
const updateUserData = async (req: any, res: NextApiResponse) => {
  try {
    const userId = req.user.id; // 从JWT中获取用户ID
    const { userData, field } = req.body;

    if (!userData || typeof userData !== "object") {
      return res.status(400).json({ error: "Invalid userData format" });
    }

    // 构建更新对象
    const updateData: any = {
      [field || "user_data"]: userData,
    };

    const { data, error } = await client
      .from("user")
      .update(updateData)
      .eq("id", userId)
      .select(field || "user_data")
      .single();

    if (error) throw error;

    response(res, { success: true });
  } catch (error) {
    console.error("Error updating user data:", error);
    res.status(500).json({ error: error.message });
  }
};
