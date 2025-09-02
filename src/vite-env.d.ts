/// <reference types="vite/client" />

// Allow importing raw CSV files via `?raw`
declare module '*.csv?raw' {
  const content: string;
  export default content;
}

// Image modules not needed when using `new URL(..., import.meta.url)`
