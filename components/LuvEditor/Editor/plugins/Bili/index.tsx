import { useContext, useEffect, useRef, useState } from "react";
import { Editor, Element, Range, Transforms } from "slate";
import React from "react";
import { CommandsContext, ConfigContext } from "../../context";
import { Commands } from "../../commands";
import { BlockWrapper } from "../../nodes";
import { isUndefined } from "lodash";
import styles from "./style.module.scss";

export const withBili = (editor: Editor) => {
  const { isVoid } = editor;

  editor.isVoid = (element) => {
    return element.type === "bili" ? true : isVoid(element);
  };

  return editor;
};

const getUrl = (iframeStr: string) => {
  const regex = /src="([^"]+)"/;
  const match = iframeStr.match(regex);

  return match?.[1] + "&autoplay=0"; // 输出提取到的src属性值
};

export const BiliBlock = (config) => {
  const { url } = config.element;
  const inputRef = useRef(null);
  const { editor, refocus } = useContext(CommandsContext);
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <BlockWrapper config={config}>
      {isUndefined(url) ? (
        <textarea
          ref={inputRef}
          style={{
            maxWidth: "100%",
            display: "block",
          }}
          placeholder="input bilibili embed code here"
          data-ignore-slate
          onCompositionStart={(e) => {
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              e.preventDefault();

              const newUrl = getUrl((e.target as any).value);
              if (newUrl) {
                Transforms.setNodes(
                  editor,
                  { url: newUrl },
                  {
                    match: (node) => {
                      return Element.isElement(node) && node.type === "bili";
                    },
                  }
                );
              }

              refocus(editor);
            }
          }}
        />
      ) : (
        <iframe
          className={styles.iframe}
          src={url}
          scrolling="no"
          // @ts-ignore
          border="0"
          frameborder="no"
          framespacing="0"
          autoplay="0"
          muted="0"
          allowfullscreen="true"
        />
      )}
    </BlockWrapper>
  );
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
