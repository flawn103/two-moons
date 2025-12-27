export const isBrowser = () => {
  return typeof window !== "undefined";
};

export const isMobile = () => {
  if (typeof window === "undefined") return false;
  return "ontouchstart" in document.documentElement;
};

export const checkPWA = () => {
  if (typeof window === "undefined") return false;
  // 检查是否在standalone模式下运行（PWA已安装）
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
  // 检查是否通过navigator.standalone（iOS Safari）
  const isIOSStandalone = (window.navigator as any).standalone === true;
  // 检查URL参数或其他PWA标识
  const hasStandaloneParam = window.location.search.includes("standalone=true");

  return isStandalone || isIOSStandalone || hasStandaloneParam;
};
