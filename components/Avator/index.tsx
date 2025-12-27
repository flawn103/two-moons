import React from "react";
import { Tooltip } from "antd";

export const Avator: React.FC<{
  img: string;
  rollId?: string;
  label: React.ReactNode;
  slogan?: React.ReactNode;
  labelStyle?: React.CSSProperties;
}> = ({ img, rollId, label, slogan, labelStyle }) => {
  return (
    <div
      style={{
        transition: "height .4s",
        transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      className={`flex h-20 w-32 hover:h-32 relative font-thin font-mono cursor-pointer flex-col overflow-hidden rounded-lg border-2 border-solid border-primary text-xs shadow-xl transition-shadow`}
    >
      <Tooltip title={slogan}>
        <img
          roll-id={rollId}
          auto-close="1"
          src={img}
          onClick={() => {}}
          alt=""
          className={`w-full h-full object-cover transition`}
        />
      </Tooltip>
      <div
        style={Object.assign(
          {
            backgroundColor: "rgba(255, 255, 255, 0.6)",
            backdropFilter: "blur(1px)",
          },
          labelStyle
        )}
        className="absolute bottom-0 w-full border-t border-gray-300 px-2 pb-0 text-center text-xs"
      >
        {label}
      </div>
    </div>
  );
};
