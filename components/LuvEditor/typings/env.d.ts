interface ImportMetaEnv {
  readonly VITE_ACCESSKEY_ID: string;
  readonly VITE_ACCESSKEY_SECRET: string;
  // more env variables...
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
