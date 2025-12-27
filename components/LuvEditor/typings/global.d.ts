import { BaseEditor } from "slate";
import { ReactEditor } from "slate-react";
import { CustomElement, CustomText } from "../Editor/types";
import { Commands } from "../Editor/commands";

declare module "slate" {
  interface CustomTypes {
    Editor: BaseEditor &
      ReactEditor & {
        commands: Commands;
      };
    Element: CustomElement;
    Text: CustomText;
  }
}
