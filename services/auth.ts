import { NextApiRequest } from "next";
import { AUTH_SECRET } from "./constants";
import jwt from "jsonwebtoken";

async function verify(req: NextApiRequest, res) {
  const tokenHeaderKey = "authorization-auth";
  const token = req.headers[tokenHeaderKey] as string;

  if (!token) {
    res.status(401).json({ error: "USER NOT LOGIN" });
    return null;
  }

  try {
    const decoded = jwt.verify(token, AUTH_SECRET) as any;
    return decoded;
  } catch {
    console.log("TOKEN NOT VALID");
    res.status(401).json({ error: "TOKEN NOT VALID" });
    return null;
  }
}

export function jwtAuth(handler) {
  return async (req: NextApiRequest & { user?: any }, res) => {
    const user = await verify(req, res);
    if (user) {
      req.user = user;
      await handler(req, res);
    }
  };
}
