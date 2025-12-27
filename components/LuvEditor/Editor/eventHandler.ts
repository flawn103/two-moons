import {
  Range,
  Transforms,
  Editor,
  Path,
  node,
  BaseSelection,
  BaseRange,
  Descendant,
} from "slate";
import { Commands } from "./commands";
import { Uploader } from "./services/upload";
import { getImgFromClipboard } from "./utils/clipboard";
import { CustomElement } from "./types";
import { BLOCK_TYPES, MODE } from "./constants";
import { isFunction } from "lodash";
import { ToolbarRefType } from "./plugins/Toolbar";

class EventHandler {
  commands: Commands;
  services: {
    uploader: Uploader;
  };

  extra: {
    mode: MODE;
    toolbarRef: React.RefObject<ToolbarRefType>;
    onChange: (data: Descendant[]) => void;
  };

  events: {
    onChange: ((data: Descendant[]) => void)[];
    onKeyDown: ((
      event: React.KeyboardEvent<HTMLDivElement>,
      editor: Commands
    ) => void)[];
  };

  constructor(
    commands: Commands,
    services: {
      uploader: Uploader;
    },
    events: {
      onChange: ((data: Descendant[]) => void)[];
      onKeyDown: ((
        event: React.KeyboardEvent<HTMLDivElement>,
        editor: Commands
      ) => void)[];
    },
    extra: {
      mode: MODE;
      toolbarRef: React.RefObject<ToolbarRefType>;
      onChange: (data: Descendant[]) => void;
    }
  ) {
    this.commands = commands;
    this.services = services;
    this.extra = extra;
    this.events = events;
  }

  keyStack: string[] = [];

  onChange = (newData: Descendant[]) => {
    this.events.onChange.forEach((event) => event(newData));

    const { mode, toolbarRef, onChange } = this.extra;
    // after content changed, refresh toolbar
    mode === MODE.EDIT && (toolbarRef.current as ToolbarRefType).update();

    isFunction(onChange) && onChange(newData);
  };

  onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    this.events.onKeyDown.forEach((event) => event(e, this.commands));

    // 检查是否是系统快捷键（如撤销），如果是则清空keyStack
    if ((e.metaKey || e.ctrlKey) && e.key === "z") {
      this.keyStack = [];
      return; // 让系统处理撤销操作
    }

    if (this.keyStack.includes(e.key)) return;

    this.keyStack.push(e.key);
    const keysStr = this.keyStack.join("-");
    const matchCallback = this.handlers[keysStr];

    console.log(keysStr);
    if (matchCallback) {
      this.keyStack = [];
      matchCallback(e);
    }
  };

  onKeyUp = (event: React.KeyboardEvent<HTMLDivElement>) => {
    console.log(event.key);
    event.preventDefault();
    const matchKeyIndex = this.keyStack.indexOf(event.key);
    this.keyStack.splice(matchKeyIndex, 1);
  };

  onPasete = (event: React.ClipboardEvent<HTMLDivElement>) => {
    var items = (event.clipboardData || (window as any).clipboardData).items;
    var file = null;
    if (items && items.length) {
      // 搜索剪切板items
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          file = items[i].getAsFile();
          break;
        }
      }
    }

    if (file) {
      this.actions.uploadImg(file);
    }
  };

  actions = {
    uploadImg: async (img: File) => {
      if (!this.services.uploader.upload) return;
      const id = this.commands.insertBlock("img", {
        url: "",
      });

      const uploadRes = await this.services.uploader.executeUpload(img);
      if (!uploadRes) {
        this.commands.setBlockData(id, { error: true });
      } else {
        this.commands.setBlockData(id, { url: uploadRes.url });
      }
    },
  };

  handlers: Record<
    string,
    (event: React.KeyboardEvent<HTMLDivElement>) => void
  > = {
    Enter: (event) => {
      const { editor } = this.commands;
      const { selection } = editor;
      if (selection && Range.isCollapsed(selection)) {
        const node = editor.children[selection.anchor.path[0]] as
          | CustomElement
          | undefined;
        if (node && BLOCK_TYPES.indexOf(node.type) > -1) {
          this.commands.focusNextBlock(event);
        }
      }

      setTimeout(() => {
        // 这里在回车的时候可能还在上一个block，延迟一下确保已经换行
        this.commands.removeAllMarks();
        this.commands.toggleBlock("paragraph");
      });
    },

    // remove all marks
    "Control-r": (event) => {
      event.preventDefault();
      this.commands.removeAllMarks();
      this.commands.toggleBlock("paragraph");
    },
    "Alt-r": (event) => {
      event.preventDefault();
      this.commands.removeAllMarks();
      this.commands.toggleBlock("paragraph");
    },

    // insert
    "Control-n": (event) => {
      event.preventDefault();
      this.commands.insertInline("note");
    },
    "Alt-n": (event) => {
      event.preventDefault();
      this.commands.insertInline("note");
    },

    // insert image
    // "Meta-v": async (event) => {
    //   this.actions.uploadImg();
    // },
    // "Control-v": async (event) => {
    //   this.actions.uploadImg();
    // },

    Tab: (e) => {
      e.preventDefault();
      Editor.insertNode(this.commands.editor, {
        text: "\u2003".toString(),
      });
    },
  };
}

export { EventHandler };
