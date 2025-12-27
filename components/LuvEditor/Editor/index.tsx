import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { createEditor, Descendant, Editor } from "slate";
import { Slate, Editable } from "slate-react";
import { Commands } from "./commands";
import { CommandsContext, ConfigContext } from "./context";
import { EventHandler } from "./eventHandler";
import { DefaultElement, Leaf, nameToCompMap, NodeNames } from "./nodes";
import { withPlugins } from "./plugin";
import { Toolbar, ToolbarRefType } from "./plugins/Toolbar/index";
import _, { isFunction } from "lodash";
import { initialValue, theme } from "./config";
import styles from "./style.module.scss";
import { Uploader, UploadFn } from "./services/upload";
import { MODE } from "./constants";
import { onKeyDown } from "./plugins/Note";

const defaultProps = {
  mode: MODE.EDIT,
  initialValue,
};

export const LuvEditor: React.FC<{
  mode?: MODE;
  initialValue?: Descendant[];
  sticky?: number;
  onChange?: (data: Descendant[]) => void;
  upload?: UploadFn;
  editorRef?: React.RefObject<Editor>;
  linkComp?: React.FC;
}> = (props) => {
  props = Object.assign(defaultProps, props);

  const toolbarRef = useRef<ToolbarRefType>(null);
  const editor = useMemo(() => withPlugins(createEditor()), []);
  const uploader = useMemo(() => new Uploader(props.upload), []);

  const commands = useMemo(() => new Commands(editor), []);
  const eventHandler = useMemo(
    () =>
      new EventHandler(
        commands,
        {
          uploader,
        },
        {
          onChange: [],
          onKeyDown: [onKeyDown],
        },
        // @ts-ignore
        {
          mode: props.mode,
          toolbarRef,
        }
      ),
    [props.onChange, props.mode]
  );

  useEffect(() => {
    editor.commands = commands;
    if (props.editorRef && "current" in props.editorRef) {
      (props.editorRef as React.MutableRefObject<Editor>).current = editor;
    }
  }, []);

  const renderElement = useCallback((props) => {
    if (nameToCompMap[props.element.type as NodeNames]) {
      const CompConstructor = nameToCompMap[props.element.type as NodeNames];
      return React.createElement(CompConstructor, props);
    }
    return <DefaultElement {...props} />;
  }, []);
  const renderLeaf = useCallback((props) => {
    return <Leaf {...props} />;
  }, []);

  return (
    <Slate
      editor={editor}
      initialValue={props.initialValue as Descendant[]}
      onChange={eventHandler.onChange}
    >
      <CommandsContext.Provider value={commands}>
        <ConfigContext.Provider
          value={{
            theme,
            linkComp: props.linkComp,
            mode: props.mode,
          }}
        >
          {props.mode === MODE.EDIT && (
            <Toolbar ref={toolbarRef} sticky={props.sticky} />
          )}
          <Editable
            autoFocus
            readOnly={props.mode === MODE.VIEW}
            className={styles.editor}
            renderElement={renderElement}
            renderLeaf={renderLeaf}
            onKeyDown={eventHandler.onKeyDown}
            onPaste={eventHandler.onPasete}
            onKeyUp={eventHandler.onKeyUp}
          />
        </ConfigContext.Provider>
      </CommandsContext.Provider>
    </Slate>
  );
};
