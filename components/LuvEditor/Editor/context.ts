import { createContext } from "react";
import { Commands } from "./commands";
import { MODE } from "./constants";

export const CommandsContext = createContext<Commands>(null);
export const ConfigContext = createContext<
  Partial<{
    theme: {
      primary: string;
    };
    mode: MODE;
    linkComp: React.FC;
  }>
>({});
