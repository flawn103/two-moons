import { jwtAuth } from "@/services/auth";
import { client } from "@/services/client";
import { response } from "@/services/utils";
import { NextApiRequest } from "next";

export default async function handler(req, res) {
  switch (req.method) {
    case "GET":
      return getPost(req, res);
    case "POST":
      return jwtAuth(addPost)(req, res);
    case "PUT":
      return jwtAuth(editPost)(req, res);
    case "DELETE":
      return jwtAuth(delePost)(req, res);
    default:
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

const editPost = async (req: NextApiRequest, res) => {
  const { content, title, id } = req.body;
  try {
    const { data, error } = await client
      .from('post')
      .update({ content, title })
      .eq('id', id)
      .select();
    
    if (error) throw error;
    response(res, data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const getPost = async (req: NextApiRequest, res) => {
  try {
    const id = req.query.id;
    let re;

    // all
    if (!id) {
      const { data, error } = await client
        .from('post')
        .select('id, title')
        .order('id', { ascending: false });
      
      if (error) throw error;
      re = data;
    } else {
      const { data, error } = await client
        .from('post')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      re = data;
    }
    response(res, re);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const addPost = async (req, res) => {
  const { content, userId = 0, title } = req.body;
  try {
    const { data, error } = await client
      .from('post')
      .insert({ content, title, user_id: userId })
      .select('id')
      .single();
    
    if (error) throw error;
    
    response(
      res,
      {
        id: data.id,
      },
      201
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
const delePost = async (req, res) => {
  const { id } = req.query;
  try {
    const { data, error } = await client
      .from('post')
      .delete()
      .eq('id', id)
      .select();
    
    if (error) throw error;
    response(res, data, 200);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
