// SVG icons as React components
import BoldIcon from "/public/assets/toolbar/bold.svg";
import H1Icon from "/public/assets/toolbar/heading-h1.svg";
import ItalicIcon from "/public/assets/toolbar/italic.svg";
import PianoIcon from "/public/assets/toolbar/piano.svg";
import BiliIcon from "/public/assets/toolbar/bilibili.svg";
import QuotesIcon from "/public/assets/toolbar/quotes.svg";
import NoteIcon from "/public/assets/toolbar/note.svg";
import LinkIcon from "/public/assets/toolbar/link.svg";

import React, {
  useContext,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { CommandsContext } from "../../context";
import { useUpdate } from "../../../hooks/useUpdte";
import styles from "./style.module.scss";
import classNames from "classnames";
import { isFunction, isNumber } from "lodash";
import { Commands } from "../../commands";

export const ToolButton: React.FC<
  React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLImageElement>,
    HTMLImageElement
  > & { active?: boolean; action: () => void; icon: React.ReactNode }
> = ({ active, icon, action, ...others }) => {
  return (
    <div
      className={classNames(
        styles[`icon-button`],
        active && styles["icon-button--active"]
      )}
      onMouseDown={(e) => {
        e.preventDefault();
        action();
      }}
      {...others}
    >
      {icon}
    </div>
  );
};

const BlockButton: React.FC<{ name: string; icon: React.ReactNode }> = ({
  name,
  icon,
}) => {
  const commands = useContext(CommandsContext);
  return (
    <ToolButton
      active={commands.isBlockActive(name)}
      action={() => {
        commands.toggleBlock(name);
      }}
      icon={icon}
    />
  );
};

const MarkButton: React.FC<{ format: string; icon: React.ReactNode }> = ({
  format,
  icon,
}) => {
  const commands = useContext(CommandsContext);
  return (
    <ToolButton
      active={commands.isMarkActive(format)}
      action={() => {
        commands.toggleMark(format);
      }}
      icon={icon}
    />
  );
};

const InsertBlockButton: React.FC<{
  name: string;
  icon: React.ReactNode;
  action?: ((commands: Commands) => void) | boolean;
}> = ({ name, icon, action }) => {
  const commands = useContext(CommandsContext);
  return (
    <ToolButton
      active={commands.isBlockActive(name)}
      action={() => {
        if (action === false) return;
        if (isFunction(action)) action(commands);
        else commands.insertBlock(name);
      }}
      icon={icon}
    />
  );
};

const Divider: React.FC = () => {
  return <div className={styles.divider}></div>;
};

export type ToolbarRefType = {
  update: () => void;
};

export const Toolbar = forwardRef<
  ToolbarRefType,
  {
    sticky?: number;
  }
>((props, ref) => {
  const update = useUpdate();
  useImperativeHandle(ref, () => ({
    update,
  }));

  return (
    <div
      className={classNames(
        styles.toolbar,
        isNumber(props.sticky) && styles["toolbar--sticky"]
      )}
      style={{
        top: props.sticky,
      }}
    >
      <BlockButton name="heading-one" icon={<H1Icon />} />
      {/* <BlockButton name="heading-two" icon={<H2Icon />} /> */}
      {/* <BlockButton name="bulleted-list" icon={<ListIcon />} /> */}
      <BlockButton name="block-quote" icon={<QuotesIcon />} />
      <MarkButton format="bold" icon={<BoldIcon />} />
      {/* <MarkButton format="underline" icon={<UnderlineIcon />} /> */}
      <MarkButton format="italic" icon={<ItalicIcon />} />
      <MarkButton format="link" icon={<LinkIcon />} />
      <Divider />
      <InsertBlockButton name="note" icon={<NoteIcon />} />
      <InsertBlockButton name="roll" icon={<PianoIcon />} />
      <Divider />
      <InsertBlockButton name="bili" icon={<BiliIcon />} />
    </div>
  );
});

Toolbar.displayName = "Toolbar";
