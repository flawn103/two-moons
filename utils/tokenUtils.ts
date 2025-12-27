import jwt from "jsonwebtoken";

/**
 * 检查token是否即将过期
 * @param token JWT token
 * @param bufferMinutes 提前多少分钟判断为即将过期，默认5分钟
 * @returns boolean
 */
export const isTokenExpiringSoon = (
  token: string,
  bufferMinutes: number = 60 * 24 * 2
): boolean => {
  if (!token) return true;

  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    const bufferSeconds = bufferMinutes * 60;

    return decoded.exp - now < bufferSeconds;
  } catch (error) {
    return true;
  }
};

/**
 * 检查token是否已过期
 * @param token JWT token
 * @returns boolean
 */
export const isTokenExpired = (token: string): boolean => {
  if (!token) return true;

  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) return true;

    const now = Math.floor(Date.now() / 1000);
    return decoded.exp < now;
  } catch (error) {
    return true;
  }
};

/**
 * 获取token的剩余有效时间（秒）
 * @param token JWT token
 * @returns number 剩余秒数，如果token无效返回0
 */
export const getTokenRemainingTime = (token: string): number => {
  if (!token) return 0;

  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) return 0;

    const now = Math.floor(Date.now() / 1000);
    const remaining = decoded.exp - now;

    return Math.max(0, remaining);
  } catch (error) {
    return 0;
  }
};
