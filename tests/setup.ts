import { beforeEach } from 'vitest';
import { __resetElectronMock } from './mocks/electron';

/**
 * Global test environment.
 *
 * Most of the suite runs in plain Node, so the two browser facilities
 * `src/lib/storage.ts` touches are provided here: `localStorage` and a minimal
 * `window`. Both are reset before every test so persistence tests cannot leak
 * into each other.
 *
 * The component tests opt into jsdom with a `@vitest-environment` docblock.
 * jsdom already provides a real `window` and `localStorage`, so the Node
 * shims below must not replace them — overwriting `window` would destroy the
 * DOM the tests are rendering into.
 */

class MemoryStorage {
  private map = new Map<string, string>();

  getItem(key: string): string | null {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }

  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }

  removeItem(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }

  get length(): number {
    return this.map.size;
  }

  /** Test helper: every key currently stored. */
  keys(): string[] {
    return [...this.map.keys()];
  }
}

const storage = new MemoryStorage();

const g = globalThis as unknown as Record<string, unknown>;

const hasDom = typeof g.document !== 'undefined';

if (!hasDom) {
  g.localStorage = storage;
  g.window = {
    electronAPI: undefined,
    setTimeout: (...args: Parameters<typeof setTimeout>) => setTimeout(...args),
    clearTimeout: (...args: Parameters<typeof clearTimeout>) => clearTimeout(...args),
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    location: { search: '' },
  };
}

beforeEach(() => {
  storage.clear();
  if (hasDom) (g.localStorage as Storage).clear();
  __resetElectronMock();
});

export { storage as memoryStorage };
