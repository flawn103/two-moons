import { BaseRange, Editor, Location, Path, Range, Transforms } from "slate";
import { v4 } from "uuid";
import { CustomElement } from "./types";
import { ReactEditor } from "slate-react";
import { BLOCK_TYPES, DIVIDER_POS, INLINE_CARD_MARKS } from "./constants";
import { INSERT_NODE_INIT_VALUES } from "./config";
import { assign } from "lodash";

const LIST_TYPES = ["numbered-list", "bulleted-list"];

class Commands {
  editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  // utils
  isBlockActive = (format: string) => {
    const { editor } = this;
    const [match] = Editor.nodes(editor, {
      // @ts-ignore
      match: (n) => n.type === format,
    });

    return !!match;
  };
  isMarkActive = (format: string) => {
    const { editor } = this;
    const marks = Editor.marks(editor);
    return marks ? marks[format] === true : false;
  };

  // actions
  removeAllMarks() {
    const { editor } = this;
    const marks = Editor.marks(editor);

    Object.keys(marks).forEach((format) => {
      console.log({ format });
      Editor.removeMark(editor, format);
    });
  }
  toggleBlock(format: string) {
    const { editor, isBlockActive } = this;
    const isActive = isBlockActive(format);
    const isList = LIST_TYPES.includes(format);

    Transforms.unwrapNodes(editor, {
      // @ts-ignore
      match: (n) => LIST_TYPES.includes(n.type),
      split: true,
    });

    Transforms.setNodes(editor, {
      type: isActive ? "paragraph" : isList ? "list-item" : format,
    });

    if (!isActive && isList) {
      const block = { type: format, children: [] };
      Transforms.wrapNodes(editor, block);
    }
  }
  toggleMark = (format: string) => {
    const { editor, isMarkActive } = this;
    const isActive = isMarkActive(format);

    this.removeAllMarks();
    if (!isActive) {
      Editor.addMark(editor, format, true);
    }
  };
  getData() {
    return this.editor.children;
  }
  findNode(id: string) {
    const { editor } = this;
    const [node] = Editor.nodes(editor, {
      // @ts-ignore
      match: (n) => n.id === id,
    });

    return node;
  }
  deleteInlineCards() {}
  insertInline(name: string, config: any = {}) {
    const assignConfig = assign(INSERT_NODE_INIT_VALUES[name] ?? {}, config);
    const { editor } = this;
    const id = v4();
    const element = [
      {
        type: name,
        [name]: true,
        id,
        ...assignConfig,
        children: [{ text: "" }],
      },
    ];
    Transforms.insertNodes(editor, element);

    return;
  }
  insertBlock(name: string, config: any = {}) {
    const assignConfig = assign(INSERT_NODE_INIT_VALUES[name] ?? {}, config);
    const { editor } = this;
    const blockId = v4();
    const element = [
      { type: name, id: blockId, ...assignConfig, children: [{ text: "" }] },
    ];
    Transforms.insertNodes(editor, element);

    return blockId;
  }
  setBlockData(id: string, data: any) {
    const { editor } = this;

    Transforms.setNodes(editor, data, {
      match: (node) => {
        // @ts-ignore
        return node.id === id;
      },
    });
  }
  refocus = (editor: Editor, path?: Location) => {
    const { selection } = editor;
    if (path) {
      ReactEditor.focus(editor);
      Transforms.select(editor, path);
      return;
    }
    if (!selection || !selection.anchor || !selection.focus) {
      return;
    }
    // 这里不知道为啥，块级元素的 el.getSelection 会指向第一个元素
    ReactEditor.focus(editor);
    setTimeout(() => {
      Transforms.select(editor, selection.focus);
    }, 20);
  };
  focusNextInline = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const { editor } = this;
    const { selection } = editor;

    event.preventDefault();
    const nextIndex = selection.anchor.path[1] + 1;
    this.refocus(editor, {
      path: [selection.anchor.path[0], nextIndex],
      offset: 0,
    });
  };
  focusNextBlock = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const { editor } = this;
    const { selection } = editor;

    event.preventDefault();
    const nextIndex = selection.anchor.path[0] + 1;
    const next = editor.children[nextIndex] as CustomElement | undefined;
    if (next) {
      this.refocus(editor, [nextIndex]);
      return;
    }

    // if no node after element node, insert a new paragraph.
    const emptyElement = {
      type: "paragraph",
      children: [{ text: "" }],
    };
    Transforms.insertNodes(editor, emptyElement, {
      at: [editor.children.length],
    });
    const last = Editor.last(editor, []);
    this.refocus(editor, last[1]);
    return;
  };
}

export { Commands };
