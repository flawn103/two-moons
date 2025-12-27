export async function getImgFromClipboard(): Promise<File | null> {
  if (!navigator.clipboard) {
    // 如果浏览器不支持 clipboard API，则直接返回 null
    return null;
  }

  const clipboardItems = await navigator.clipboard.read();

  // 遍历剪贴板中的所有项
  for (const clipboardItem of clipboardItems) {
    // 如果该项是文件类型
    if (
      clipboardItem.types.includes("image/png") ||
      clipboardItem.types.includes("image/jpeg")
    ) {
      const blob = await clipboardItem.getType("image/png");
      // 将 blob 转换为 File 对象
      const file = new File([blob], "image.png", {
        type: blob.type,
      });
      return file;
    }
  }
  return null;
}
