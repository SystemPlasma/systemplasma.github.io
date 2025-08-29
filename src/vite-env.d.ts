/// <reference types="vite/client" />

// Ensure editors recognize Vite's ImportMeta helpers in this project.
// This augments (doesn't replace) Vite's built-in definitions.
interface ImportMeta {
  glob: (
    pattern: string,
    options?: { eager?: boolean; query?: string; import?: string }
  ) => Record<string, unknown>;
  env: ImportMetaEnv;
}

// Allow importing raw CSV files via `?raw`
declare module '*.csv?raw' {
  const content: string;
  export default content;
}

// Image modules not needed when using `new URL(..., import.meta.url)`
