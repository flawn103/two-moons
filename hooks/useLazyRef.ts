import { useEffect, useRef } from "react";

export const useLazyRef = (instanceCtor: any) => {
  const instanceRef = useRef();

  useEffect(() => {
    instanceRef.current = instanceCtor();
  }, []);

  return instanceRef;
};
