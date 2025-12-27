import { useState } from "react";

export const useUpdate = () => {
  const [flag, setState] = useState(true);
  const update = () => {
    setState(!flag);
  };
  return update;
};
