import { jwtAuth } from "@/services/auth";
import { client } from "@/services/client";
import { response } from "@/services/utils";

export default async function handler(req, res) {
  switch (req.method) {
    case "GET":
      return jwtAuth(getUser)(req, res);
    case "POST":
      return jwtAuth(deleUser)(req, res);
    default:
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

const getUser = async (req, res) => {
  try {
    const { data, error } = await client
      .from('user')
      .select('*')
      .eq('id', req.query.body);
    
    if (error) throw error;
    response(res, data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const deleUser = async (req, res) => {
  const { id } = req.body;
  try {
    const { data, error } = await client
      .from('user')
      .delete()
      .eq('id', id)
      .select();
    
    if (error) throw error;
    response(res, data, 200);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
