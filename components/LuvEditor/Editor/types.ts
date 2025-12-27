import { RollState } from "@/components/MoaRoll";

export type CustomElement = {
  type: string;
  id?: string;
  children: CustomText[];
  data?: Partial<RollState>;
  url?: string;
  pre?: boolean;
  noteStr?: string;
  editing?: boolean;
};
export type CustomText = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  note?: boolean;
};
