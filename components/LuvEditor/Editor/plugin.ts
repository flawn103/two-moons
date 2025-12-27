import { Editor } from "slate";
import { withReact } from "slate-react";
import { withHistory } from "slate-history";
import { flow } from "lodash";
import { withNote } from "./plugins/Note";
import { withBili } from "./plugins/Bili";

export const withImg = (editor: Editor) => {
  const { isVoid } = editor;

  editor.isVoid = (element) => {
    return element.type === "img" ? true : isVoid(element);
  };

  return editor;
};

export const withRoll = (editor: Editor) => {
  const { isVoid } = editor;

  editor.isVoid = (element) => {
    return element.type === "roll" ? true : isVoid(element);
  };

  return editor;
};

export const withPlugins = (editor: Editor) => {
  return flow([withHistory, withReact, withRoll, withBili, withNote, withImg])(
    editor
  );
};
