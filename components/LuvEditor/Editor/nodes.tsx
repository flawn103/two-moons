import React, { useContext, useEffect, useRef } from "react";
import { useSelected } from "slate-react";
import { ConfigContext, CommandsContext } from "./context";
import styles from "./style.module.scss";
import { Roll } from "@/components/MoaRoll";
import classNames from "classnames";
import { Element, Transforms } from "slate";
import { Note } from "./plugins/Note";
import { MODE } from "./constants";
import { BiliBlock } from "./plugins/Bili";

export const DefaultElement = (props) => {
  return <p {...props.attributes}>{props.children}</p>;
};

// block
export const BlockQuote = ({ attributes, children }) => {
  return (
    <blockquote className={styles.quote} {...attributes}>
      {children}
    </blockquote>
  );
};
export const BulletedList = ({ attributes, children }) => {
  return <ul {...attributes}>{children}</ul>;
};
export const HeadingOne = ({ attributes, children, element }) => {
  const id = element.children?.[0]?.id || undefined;
  return (
    <h1
      style={{
        marginBottom: 12,
      }}
      {...attributes}
      id={id}
    >
      {children}
    </h1>
  );
};
export const HeadingTwo = ({ attributes, children, element }) => {
  const id = element.children?.[0]?.id || undefined;
  return (
    <h2 {...attributes} id={id}>
      {children}
    </h2>
  );
};
export const ListItem = ({ attributes, children }) => {
  return <li {...attributes}>{children}</li>;
};
export const BlockWrapper = ({ config, children }) => {
  const { attributes, children: placeHolder } = config;
  const selected = useSelected();
  const { mode } = useContext(ConfigContext);

  return (
    <div
      {...attributes}
      contentEditable={false}
      className={classNames(styles.block, selected && styles["block--active"])}
    >
      {placeHolder}
      <div
        style={{
          pointerEvents: selected || mode === MODE.VIEW ? "auto" : "none",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export const RollBlock = (config) => {
  const { data } = config.element;
  const { editor } = useContext(CommandsContext);
  const { mode } = useContext(ConfigContext);
  const isView = mode === MODE.VIEW;

  return (
    <BlockWrapper config={config}>
      <Roll
        keyboardPiano={false}
        controllers={{
          length: isView ? false : true,
          octave: isView ? false : true,
          clear: isView ? false : true,
          bpm: isView ? false : true,
        }}
        onDataChange={(newData) => {
          console.log("[luv] roll change", newData.bpm);

          // 当未focus时，mousedown到input会找不到node
          // 此时设置node失败，data依然是旧数据
          // 触发select事件，此时内外状态不统一
          Transforms.setNodes(
            editor,
            { data: newData },
            {
              match: (node) => {
                return Element.isElement(node) && node.type === "roll";
              },
            }
          );
        }}
        showController
        data={data}
      />
    </BlockWrapper>
  );
};
const ImageBlock = (config) => {
  const { url, error } = config.element;

  return (
    <BlockWrapper config={config}>
      {error ? (
        <div
          style={{
            padding: "24px 36px",
          }}
        >
          <h3>error</h3>
        </div>
      ) : url ? (
        <img
          style={{
            maxHeight: 480,
          }}
          src={url}
        />
      ) : (
        <div
          style={{
            padding: "24px 36px",
          }}
        >
          <h3>uploading...</h3>
        </div>
      )}
    </BlockWrapper>
  );
};

// Define a React component to render leaves with bold text.
export const Leaf = ({ attributes, children, leaf }) => {
  if (leaf.bold) {
    children = <strong>{children}</strong>;
  }

  const config = useContext(ConfigContext);
  if (leaf.link) {
    if (config.linkComp) {
      children = React.createElement(
        config.linkComp,
        {
          href: leaf.text,
          ...leaf,
        },
        children
      );
    } else
      children = (
        <a target="_blank" href={leaf.text}>
          {children}
        </a>
      );
  }

  if (leaf.code) {
    children = <code>{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  // children就是String
  return <span {...attributes}>{children}</span>;
};

export const nameToCompMap = {
  bili: BiliBlock,
  roll: RollBlock,
  img: ImageBlock,
  note: Note,
  "block-quote": BlockQuote,
  "bulleted-list": BulletedList,
  "heading-one": HeadingOne,
  "heading-two": HeadingTwo,
  "list-item": ListItem,
};
export type NodeNames = keyof typeof nameToCompMap;
