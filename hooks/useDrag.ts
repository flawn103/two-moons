import { useState, useEffect, useRef } from "react";

export const useDrag = (
  initDistance = 128,
  mode: "bottom" | "top" = "bottom",
  key?: string
) => {
  const dir = mode === "bottom" ? 1 : -1;

  const getInitDistance = () => {
    if (key && typeof window !== "undefined") {
      const saved = localStorage.getItem(key);
      if (saved) return parseFloat(saved);
    }
    return initDistance;
  };

  const [isTrigClick, setIsTrigClick] = useState(true);
  const [distance, setDistance] = useState(initDistance);

  const storageRef = useRef({
    isDrag: false,
    moveLength: 0,
    startDistance: initDistance,
    currentDistance: initDistance,
    startY: 0,
  });

  // Load from localstorage on mount
  useEffect(() => {
    const d = getInitDistance();
    setDistance(d);
    storageRef.current.currentDistance = d;
    storageRef.current.startDistance = d;
  }, []);

  const onStart = (clientY: number) => {
    const storage = storageRef.current;
    storage.moveLength = 0;
    storage.isDrag = true;
    storage.startY = clientY;
    storage.startDistance = storage.currentDistance;
    setIsTrigClick(true);
  };

  const onMouseDown = (e: any) => {
    // Prevent default to avoid text selection, but might interfere with click?
    // In React, onClick fires after onMouseUp.
    // We'll rely on isTrigClick to filter actions.
    onStart(e.clientY);
  };

  const onTouchStart = (e: any) => {
    onStart(e.touches[0].clientY);
  };

  const onMove = (clientY: number) => {
    const storage = storageRef.current;
    if (storage.isDrag) {
      const deltaY = clientY - storage.startY;
      storage.moveLength = deltaY;
      // mode=bottom: drag down (positive delta) -> decrease distance
      const newDist = storage.startDistance - dir * deltaY;
      storage.currentDistance = newDist;
      setDistance(newDist);
    }
  };

  const onMouseMove = (e: any) => {
    if (storageRef.current.isDrag) {
      e.preventDefault();
      onMove(e.clientY);
    }
  };

  const onTouchMove = (e: any) => {
    if (storageRef.current.isDrag) {
      // Prevent scrolling while dragging
      if (e.cancelable) e.preventDefault();
      onMove(e.touches[0].clientY);
    }
  };

  const onEnd = () => {
    const storage = storageRef.current;
    if (storage.isDrag) {
      storage.isDrag = false;
      if (Math.abs(storage.moveLength) > 5) {
        setIsTrigClick(false);
        if (key) {
          localStorage.setItem(key, String(storage.currentDistance));
        }
      }
    }
  };

  useEffect(() => {
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchend", onEnd);
    // Passive: false is needed for preventDefault on touchmove
    window.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  return { onMouseDown, onTouchStart, distance, isTrigClick };
};
