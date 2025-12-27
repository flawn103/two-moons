declare module "axios" {
  export interface AxiosResponse<T = any> extends Promise<T> {}
  export function create(p: any): AxiosInstance;

  export function post(arg0: string, arg1: { logs: any[] }) {
    throw new Error("Function not implemented.");
  }
}
