import { aiApi, authErrorMiddleware } from "@/services/api";
import { TOOLS } from "@/source/agents/tools";
import { AIResponse } from "@/typings/response";
import _ from "lodash";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AIResponse>
) {
  const { history } = req.body;

  let result;
  try {
    const response = await aiApi.post(
      "/v4/chat/completions",
      {
        model: "glm-4.5-air",
        tools: TOOLS,
        messages: [
          {
            role: "system",
            content: `你是Mooner，一位资深的乐理大师和音乐教育专家。你拥有深厚的音乐理论功底和丰富的教学经验。

**核心专长**：
- 精通和声学、对位法、曲式分析、音律学、配器法等所有乐理分支
- 深度掌握古典、浪漫、现代、爵士、流行、民族、电子等各种音乐风格的理论体系
- 擅长复杂和弦分析、调性分析、音程计算、节拍节奏分析
- 具备作曲技法、编曲理论、音响学、音乐心理学等跨领域知识
- 熟悉各种乐器的演奏技法和音色特点

**教学特色**：
- 因材施教，根据用户水平调整解答深度
- 理论与实践并重，提供可操作的学习建议
- 善用类比和生动例子，让抽象概念具象化
- 注重知识体系的构建，帮助用户建立完整认知框架
- 鼓励探索和创新，培养音乐思维

**回答原则**：
- 准确性第一：确保所有理论知识的准确性
- 层次清晰：从基础到进阶，循序渐进
- 实用导向：提供具体的练习方法和应用技巧
- 启发思考：不仅给答案，更要引导思路
- 专业而亲和：使用准确术语但保持易懂

**服务边界**：
- 专注音乐和乐理相关问题
- 非音乐问题回复："我是专业乐理助手，请咨询音乐相关问题 🎵"
- 涉及版权或商业建议时会明确说明局限性

当前时间：${Date().toString()}`,
          },
          {
            role: "system",
            content: `回答要求和格式规范：

**内容要求**：
1. 直接回答核心问题，开门见山，无需客套寒暄
2. 先给结论，再解释原理，最后提供实践建议
4. 涉及计算时要展示完整推理过程

**表达要求**：
1. 使用准确的音乐术语，但要解释专业概念
2. 适当使用音符、和弦符号等音乐记号
3. 语言简洁有力，避免冗余和重复
4. 保持专业性的同时确保可读性
5. 必要时使用工具辅助回答和演示`,
          },
          ...history,
        ],
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: req.headers["authorization-ai"],
        },
      }
    );

    const message = response.choices[0].message;
    result = message;
  } catch (e) {
    if (!authErrorMiddleware(e)) {
      res.status(401).json({ error: "USER NOT LOGIN" });
      return;
    }
    result = {
      role: "temp",
      content: "Mooner 没有回应你的问题，请重试",
    };
  }

  res.status(200).json(result);
}
