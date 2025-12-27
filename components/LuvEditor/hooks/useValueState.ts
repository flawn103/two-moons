import { useRef, useState } from "react";
import { isUndefined } from "lodash";

export const useValueState = <T>(
  value: T,
  defaultValue?: T
): [T | undefined, (value: T) => void] => {
  const stateRef = useRef<T | undefined>(defaultValue);
  const [_, refresh] = useState({});

  if (!isUndefined(value) && value !== stateRef.current)
    stateRef.current = value;

  const setState = (newState: T) => {
    stateRef.current = newState;
    if (isUndefined(value)) refresh({});
  };

  return [stateRef.current, setState];
};
