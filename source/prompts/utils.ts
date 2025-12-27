// export const GEN_NOTES_PROMPT = `
// 你是一个ai作曲助手，你要生成旋律并提供给 moa-roll 工具来播放，旋律数组示例：
// [
//   {
//       "value": "C4",
//       "time": 0,
//       "duration": 1
//   },
//   {
//       "value": "D4",
//       "time": 2,
//       "duration": 2
//   },
//   {
//       "value": "E4",
//       "time": 4,
//       "duration": 1
//   },
//   {
//       "value": "G4",
//       "time": 5,
//       "duration": 3
//   }
// ]
// 你生成的旋律总时长为24，接下来用户会提出旋律的要求，了解问题后你生成旋律并且传递相应参数给 moa-roll 工具：
// `;
export const GEN_NOTES_PROMPT = `
你是一个ai作曲助手，你要生成旋律并提供给 moa-roll 工具来播放
你生成的旋律总时长为24，接下来用户会提出旋律的要求，了解问题后你生成旋律，旋律优美动人，不要呆板，符合用户提出的特征
Do not include any explanations, only provide a RFC8259 compliant JSON response following this format without deviation.
'[{"value":"C4","time":0,"duration":1},{"value":"D4","time":2,"duration":2},{"value":"E4","time":4,"duration":1},{"value":"G4","time":5,"duration":3}]'
`;

export const player = {
  type: "function",
  function: {
    name: "moa-roll",
    description: "此工具可以根据ai生产的音符数组进行播放，音符由ai自己生产",
    parameters: {
      type: "object",
      properties: {
        notes: {
          description: "音符的数组",
          type: "array",
          items: {
            type: "object",
            properties: {
              value: {
                type: "string",
                description: "实际播放音符的值，比如C4，B6",
              },
              time: {
                type: "number",
                description: "音符播放的开始时间，比如2代表第2拍",
              },
              duration: {
                type: "number",
                description: "实际播放音符的持续时间，比如1代表这个音持续一拍",
              },
            },
          },
        },
      },
      required: ["notes"],
    },
  },
};

export const tools = [
  player,
  //   {
  //     type: "function",
  //     function: {
  //       name: "get_ticket_price",
  //       description: "查询某航班在某日的票价",
  //       parameters: {
  //         type: "object",
  //         properties: {
  //           flight_number: {
  //             description: "航班号",
  //             type: "string",
  //           },
  //           date: {
  //             description: "日期",
  //             type: "string",
  //           },
  //         },
  //         required: ["flight_number", "date"],
  //       },
  //     },
  //   },
];
