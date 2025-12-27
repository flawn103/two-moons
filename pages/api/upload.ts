// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";
import OSS from "ali-oss";
import { v4 } from "uuid";
import { IncomingForm } from "formidable";
import path from "path";
import { jwtAuth } from "@/services/auth";

const NEXT_PUBLIC_ACCESSKEY_ID = process.env.ACCESSKEY_ID!;
const NEXT_PUBLIC_ACCESSKEY_SECRET = process.env.ACCESSKEY_SECRET!;

type ImgResData = {
  url: string;
};

export const config = {
  api: {
    bodyParser: false,
  },
};

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ImgResData>
) {
  const data = await new Promise((resolve, reject) => {
    const form = new IncomingForm();
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err);
      resolve({ fields, files });
    });
  });

  const client = new OSS({
    region: "oss-cn-chengdu",
    accessKeyId: NEXT_PUBLIC_ACCESSKEY_ID,
    accessKeySecret: NEXT_PUBLIC_ACCESSKEY_SECRET,
    bucket: "luv-club",
  });

  const file = (data as any).files?.file?.[0];
  const { originalFilename, filepath } = file;
  const id = v4();
  const ossRes = await client.put(
    `${id}-${originalFilename}`,
    path.normalize(filepath)
  );

  res.status(200).json({
    url: ossRes.url,
  });
}

export default jwtAuth(handler);
