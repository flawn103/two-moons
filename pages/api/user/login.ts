import { AUTH_SECRET } from "@/services/constants";
import { client } from "@/services/client";
import { response } from "@/services/utils";
import { genHash } from "@/utils/crypto";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  switch (req.method) {
    case "POST":
      return login(req, res);
    default:
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

const login = async (req, res) => {
  const { password, name } = req.body;

  const hash = genHash(password);
  try {
    const { data, error } = await client
      .from("user")
      .select("*")
      .eq("password", hash)
      .eq("name", name)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    const re = data;
    if (re) {
      const { id } = re;
      const headers = { alg: "HS256", sign_type: "SIGN" };
      const payload = {
        id,
        timestamp: Date.now(),
      };

      // 设置过期时间
      const token = jwt.sign(payload, AUTH_SECRET, {
        header: headers,
        expiresIn: "5d",
      });

      response(res, {
        token,
        name,
        id,
      });
    } else {
      res.status(403).json({ error: "WRONG PASSWORD" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error.message });
  }
};
