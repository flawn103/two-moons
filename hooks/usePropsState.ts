import { useRef, useState } from "react";
import { isUndefined } from "lodash";

export const usePropsState = <T>(
  value: T,
  initialState?: T
): [T, (value: T) => void] => {
  const stateRef = useRef(initialState);
  const [_, refresh] = useState({});

  if (!isUndefined(value) && value !== stateRef.current)
    stateRef.current = value;

  const setState = (newState: T) => {
    stateRef.current = newState;
    if (isUndefined(value)) refresh({});
  };

  return [stateRef.current, setState];
};
