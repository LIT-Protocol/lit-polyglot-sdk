declare module 'localstorage-memory' {
  interface LocalStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
    key(index: number): string | null;
    readonly length: number;
    [key: string]: any;
  }

  const localStorage: LocalStorage;
  export = localStorage;
}
