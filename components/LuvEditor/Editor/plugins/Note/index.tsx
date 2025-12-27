import { useContext, useEffect, useRef } from "react";
import PlayIcon from "/public/assets/toolbar/play.svg";
import { Editor, Element, Transforms } from "slate";
import { useFocused, useSelected } from "slate-react";
import ReactDOM from "react-dom";
import React from "react";
import styles from "./style.module.scss";
import { color } from "../../../theme/style";
import { CommandsContext, ConfigContext } from "../../context";
import { Commands } from "../../commands";
import { MODE } from "../../constants";
import { MoaSynth } from "@/utils/MoaTone";
import { appStore } from "@/stores/store";

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

export const Portal: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return typeof document === "object"
    ? ReactDOM.createPortal(children, document.body)
    : null;
};

export const Note = ({ attributes, children, element }) => {
  const { editor, refocus } = useContext(CommandsContext);
  const config = useContext(ConfigContext);
  const inputRef = useRef(null);
  const { editing } = element;

  const selected = useSelected();
  const focused = useFocused();
  const style: React.CSSProperties = {
    display: "inline-block",
    borderRadius: "2px",
    boxShadow: selected && focused ? `0 0 0 2px ${color.primary}` : "none",
  };

  useEffect(() => {
    if (editing) inputRef.current.focus();
  }, [editing]);

  return (
    <span
      {...attributes}
      data-cy={`note-${element.noteStr.replace(" ", "-")}`}
      style={style}
      className={styles.note}
      onClick={() => {
        if (config.mode === MODE.VIEW) {
          const synth = new MoaSynth({
            preset: appStore.audioPreset["piano"],
          }).toDestination();
          synth.triggerAttackRelease(element.noteStr, "4n");
        }
      }}
    >
      <PlayIcon
        onClick={() => {
          if (!(config.mode === MODE.VIEW)) {
            const synth = new MoaSynth({
              preset: appStore.audioPreset["piano"],
            }).toDestination();
            synth.triggerAttackRelease(element.noteStr, "4n");
          }
        }}
      />
      {editing ? (
        <input
          ref={inputRef}
          onCompositionStart={(e) => {
            e.stopPropagation();
          }}
          defaultValue={element.noteStr}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.stopPropagation();
              e.preventDefault();

              Transforms.setNodes(
                editor,
                {
                  editing: false,
                  noteStr: (e.target as HTMLInputElement).value,
                },
                {
                  match: (node) => {
                    console.log(node);
                    return Element.isElement(node) && node.type === "note";
                  },
                }
              );

              refocus(editor);
            }

            if (!/[CDEFGABb#2-8]/.test(e.key)) e.preventDefault();
          }}
        />
      ) : (
        <span
          onDoubleClick={() => {
            if (config.mode === MODE.VIEW) return;
            Transforms.setNodes(
              editor,
              { editing: true },
              {
                match: (node) => {
                  return Element.isElement(node) && node.type === "note";
                },
              }
            );
          }}
        >
          {element.noteStr}
        </span>
      )}
      {children}
    </span>
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
