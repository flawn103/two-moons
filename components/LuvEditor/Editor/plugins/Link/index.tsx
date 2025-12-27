import { useContext, useEffect, useRef } from "react";
import PlayIcon from "/public/assets/toolbar/bold.svg";
import { Editor, Element, Transforms } from "slate";
import { useFocused, useSelected } from "slate-react";
import ReactDOM from "react-dom";
import React from "react";
import styles from "./style.module.scss";
import { color } from "../../../theme/style";
import { CommandsContext, ConfigContext } from "../../context";
import { Commands } from "../../commands";
import { MODE } from "../../constants";

export const withNote = (editor) => {
  const { isInline, isVoid, markableVoid } = editor;

  editor.isInline = (element) => {
    return element.type === "note" ? true : isInline(element);
  };

  editor.isVoid = (element) => {
    return element.type === "note" ? true : isVoid(element);
  };

  return editor;
};

export const Portal: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  return typeof document === "object"
    ? ReactDOM.createPortal(children, document.body)
    : null;
};

export const onKeyDown = (
  e: React.KeyboardEvent<HTMLDivElement>,
  commands: Commands
) => {
  const { editor } = commands;
  const { selection } = editor;

  if (e.key === "Enter") {
    const [node] = Editor.nodes(editor, {
      match: (n) => Element.isElement(n) && n.type === "note",
    });

    if (node) {
      Transforms.setNodes(
        editor,
        { editing: true },
        {
          match: (node) => {
            return Element.isElement(node) && node.type === "note";
          },
        }
      );
    }
  }
};
