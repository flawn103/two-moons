export function offsetXToClass(e: any, cls: string): number {
  const targetEl = (e.currentTarget as Element).closest(`.${cls}`);
  if (!targetEl) return -1;

  const rect = targetEl.getBoundingClientRect();
  // 统一取 clientX： PointerEvent/MouseEvent 直接读，TouchEvent 用 changedTouches[0]
  const clientX =
    "clientX" in e ? e.clientX : (e.changedTouches[0]?.clientX ?? -1);
  return clientX < 0 ? -1 : clientX - rect.left;
}
