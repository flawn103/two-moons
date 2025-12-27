/**
 * 路由记忆工具
 * 用于记录用户上次访问的页面，并在下次进入根路由时自动跳转
 */

export const LAST_ROUTE_KEY = "luv-club-last-route";

// 需要记忆的路由列表（排除首页和一些特殊页面）
// const MEMORABLE_ROUTES = [
//   "/phrase",
//   "/chord",
//   "/practice",
//   "/tool",
//   "/note",
//   "/post/list",
//   "/post/edit",
// ];

/**
 * 检查路由是否需要被记忆
 */
export const isMemorableRoute = (route: string): boolean => {
  return route !== "/";
  // return MEMORABLE_ROUTES.some((memorableRoute) =>
  //   route.startsWith(memorableRoute)
  // );
};

/**
 * 保存当前路由到本地存储
 */
export const saveLastRoute = (route: string): void => {
  // if (isMemorableRoute(route)) {
  try {
    localStorage.setItem(LAST_ROUTE_KEY, route);
  } catch (error) {
    console.warn("Failed to save last route:", error);
  }
  // }
};

/**
 * 获取上次访问的路由
 */
export const getLastRoute = (): string | null => {
  try {
    const lastRoute = localStorage.getItem(LAST_ROUTE_KEY);
    return lastRoute && isMemorableRoute(lastRoute) ? lastRoute : null;
  } catch (error) {
    console.warn("Failed to get last route:", error);
    return null;
  }
};

/**
 * 清除保存的路由记录
 */
export const clearLastRoute = (): void => {
  try {
    localStorage.removeItem(LAST_ROUTE_KEY);
  } catch (error) {
    console.warn("Failed to clear last route:", error);
  }
};

/**
 * 检查是否应该重定向到上次访问的页面
 * @param currentRoute 当前路由
 * @returns 应该重定向到的路由，如果不需要重定向则返回null
 */
export const shouldRedirectToLastRoute = (
  currentRoute: string
): string | null => {
  // 只有在访问根路由时才考虑重定向
  if (currentRoute !== "/") {
    return null;
  }

  return getLastRoute();
};
