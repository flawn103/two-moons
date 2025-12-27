import {
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";

/**
 * 移动端友好的拖拽传感器配置 Hook
 * 解决移动端拖拽与滚动冲突的问题
 */
export const useMobileFriendlySensors = () => {
  return useSensors(
    // 鼠标和触控板传感器
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 需要移动8像素才开始拖拽
      },
    }),
    // 触摸传感器 - 专门处理移动端触摸
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // 长按250ms后开始拖拽
        tolerance: 5, // 允许5像素的移动容差
      },
    }),
    // 键盘传感器
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
};

/**
 * 拖拽手柄的通用样式配置
 */
export const dragHandleStyles = {
  touchAction: "none" as const,
  userSelect: "none" as const,
  WebkitUserSelect: "none" as const,
  WebkitTouchCallout: "none" as const,
};

/**
 * 拖拽手柄的通用类名
 */
export const dragHandleClassName = "cursor-grab active:cursor-grabbing p-1 -m-1"; 