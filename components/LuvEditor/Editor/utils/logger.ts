const ERROR_PREFIX = "[luv-editor]";
export const log = {
  warn(info: string) {
    console.warn(`${ERROR_PREFIX} ${info}`);
  },
  error(info: string) {
    throw new Error(`${ERROR_PREFIX} ${info}`);
  },
};
