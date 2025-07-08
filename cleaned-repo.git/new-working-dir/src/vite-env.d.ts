/// <reference types="vite/client" />

declare global {
  interface Window {
    Capacitor?: {
      platform: string;
      isNative: boolean;
    };
  }
}

interface ImportMetaEnv {
  MODE: string;
  DEV: boolean;
  PROD: boolean;
  [key: string]: any;
}

interface ImportMeta {
  env: ImportMetaEnv;
}

export {};
