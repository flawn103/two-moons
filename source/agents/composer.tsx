import { api } from "@/services/api";
import { Button } from "antd";
import { player } from "../roll";
import { CaretRightOutlined } from "@ant-design/icons";

export const genNotesPrompt = (features) => `
你是一个ai作曲助手，你要生成旋律并提供给 moa-roll 工具来播放
你生成的旋律总时长为24，旋律不要呆板，符合以下特征：${features}
Do not include any explanations, only provide a RFC8259 compliant JSON response following this format without deviation.
[{"value":"C4","time":0,"duration":1},{"value":"D4","time":2,"duration":2},{"value":"E4","time":4,"duration":1}]
`;

export const json = {
  type: "function",
  function: {
    name: "composer",
    description: "此工具可生成一个音符数组，当用户有旋律、动机编写需求时可调用",
    parameters: {
      type: "object",
      properties: {
        desc: {
          description: "用户对旋律的描述，如明快、jpop风、爵士等",
          type: "string",
        },
      },
      required: ["notes"],
    },
  },
};

export const use = async (args) => {
  const response = await api.post("/ai-proxy", {
    messages: [
      {
        role: "user",
        content: genNotesPrompt(args.desc),
      },
    ],
  });

  const str = response.replace(/```json|```|\n/g, "").replace(/>/g, "");
  const notes = JSON.parse(str);

  return {
    role: "tool_card",
    component: "composer",
    props: { notes },
  };
};

export const Component = ({ notes }) => {
  return (
    <div>
      <Button
        className="w-full"
        icon={<CaretRightOutlined />}
        onClick={() => {
          player.setData({
            bpm: 200,
            timeLength: 24,
            currentTrack: "piano",
            tracks: [
              {
                range: ["C4", "C6"],
                instrument: "piano",
                notes,
              },
            ],
          });
          player.play();
        }}
      >
        播放
      </Button>
    </div>
  );
};
