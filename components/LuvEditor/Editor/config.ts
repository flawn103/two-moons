import { Descendant } from "slate";

export const theme = {
  primary: "#3a4f61",
};

export const initialValue: Descendant[] = [
  {
    type: "paragraph",
    children: [{ text: "Let's make " }, { text: "music ", italic: true }],
  },
  {
    type: "paragraph",
    children: [
      {
        text: "Since it's rich text, you can do things like turn a selection of text ",
      },
      { text: "bold", bold: true },
      {
        text: ", or add a semantically rendered block quote in the middle of the page, like this:",
      },
    ],
  },
  {
    type: "roll",
    data: {
      timeLength: 16,
      currentTrack: "piano",
      tracks: [
        {
          range: ["C4", "C5"],
          instrument: "piano",
          notes: [],
        },
        {
          instrument: "drum",
          notes: [],
        },
      ],
    },
    children: [{ text: "" }],
  },
  {
    type: "paragraph",
    children: [{ text: "And you can also insert a piano roll" }],
  },

  {
    type: "img",
    url: "https://source.unsplash.com/kFrdX5IeQzI",
    children: [{ text: "" }],
  },
  {
    type: "paragraph",
    children: [{ text: "Try it out for yourself!" }],
  },
];

[
  {
    type: "paragraph",
    children: [
      {
        text: "Since the editor is based on a recursive tree model, similar to an HTML document, you can create complex nested structures, like tables:",
      },
    ],
  },
  {
    type: "paragraph",
    children: [
      {
        text: "This table is just a basic example of rendering a table, and it doesn't have fancy functionality. But you could augment it to add support for navigating with arrow keys, displaying table headers, adding column and rows, or even formulas if you wanted to get really crazy!",
      },
    ],
  },
];

export const INSERT_NODE_INIT_VALUES = {
  roll: {
    data: {
      timeLength: 12,
      currentTrack: "piano",
      tracks: [
        {
          range: ["C4", "C5"],
          instrument: "piano",
          notes: [],
        },
        {
          instrument: "drum",
          notes: [],
        },
      ],
    },
  },
  note: {
    noteStr: "Bb4",
    editing: true,
  },
};
