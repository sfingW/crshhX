/**
 * Recording stub for the `electron` module.
 *
 * Aliased in `vitest.config.ts`. It exists so the tests can drive and assert on
 * main-process behaviour — which accelerators were registered, what payloads
 * were sent to which window — without a real Electron binary, which cannot run
 * headless in CI.
 */

export interface ShortcutRecord {
  accelerator: string;
  callback: () => void;
}

const registry = new Map<string, ShortcutRecord>();

export const shortcutLog = {
  registerCalls: [] as string[],
  unregisterCalls: [] as string[],
  unregisterAllCalls: 0,
  /** Accelerators whose registration was made to fail. */
  failing: new Set<string>(),
};

export const globalShortcut = {
  register(accelerator: string, callback: () => void): boolean {
    shortcutLog.registerCalls.push(accelerator);
    if (shortcutLog.failing.has(accelerator)) return false;
    registry.set(accelerator, { accelerator, callback });
    return true;
  },
  unregister(accelerator: string): void {
    shortcutLog.unregisterCalls.push(accelerator);
    registry.delete(accelerator);
  },
  unregisterAll(): void {
    shortcutLog.unregisterAllCalls += 1;
    registry.clear();
  },
  isRegistered(accelerator: string): boolean {
    return registry.has(accelerator);
  },
};

/** Test helper: fire a registered accelerator as the OS would. */
export function __triggerShortcut(accelerator: string): boolean {
  const record = registry.get(accelerator);
  if (!record) return false;
  record.callback();
  return true;
}

export function __registeredAccelerators(): string[] {
  return [...registry.keys()];
}

export function __resetElectronMock(): void {
  registry.clear();
  shortcutLog.registerCalls.length = 0;
  shortcutLog.unregisterCalls.length = 0;
  shortcutLog.unregisterAllCalls = 0;
  shortcutLog.failing.clear();
  ipcMainStub.__handlers.clear();
  ipcRendererStub.__sent.length = 0;
}

/* ---------------- remaining modules, stubbed minimally ---------------- */

const ipcMainStub = {
  __handlers: new Map<string, (...args: unknown[]) => unknown>(),
  on(channel: string, handler: (...args: unknown[]) => unknown): void {
    this.__handlers.set(channel, handler);
  },
  handle(channel: string, handler: (...args: unknown[]) => unknown): void {
    this.__handlers.set(channel, handler);
  },
  removeHandler(channel: string): void {
    this.__handlers.delete(channel);
  },
};

const ipcRendererStub = {
  __sent: [] as Array<{ channel: string; payload: unknown }>,
  send(channel: string, payload?: unknown): void {
    this.__sent.push({ channel, payload });
  },
  on(): void {
    /* no-op */
  },
  removeListener(): void {
    /* no-op */
  },
  invoke(channel: string, ...args: unknown[]): Promise<unknown> {
    const handler = ipcMainStub.__handlers.get(channel);
    return Promise.resolve(handler ? handler({}, ...args) : null);
  },
};

export const ipcMain = ipcMainStub;
export const ipcRenderer = ipcRendererStub;

export const contextBridge = {
  exposeInMainWorld(): void {
    /* no-op */
  },
};

const appListeners = new Map<string, Array<(...args: unknown[]) => void>>();

export const app = {
  whenReady(): Promise<void> {
    return Promise.resolve();
  },
  on(event: string, listener: (...args: unknown[]) => void): void {
    const list = appListeners.get(event) ?? [];
    list.push(listener);
    appListeners.set(event, list);
  },
  quit(): void {
    for (const l of appListeners.get('will-quit') ?? []) l();
  },
  getName(): string {
    return 'crshhx';
  },
};

export class BrowserWindow {
  static getAllWindows(): BrowserWindow[] {
    return [];
  }
  isDestroyed(): boolean {
    return false;
  }
  webContents = {
    isDestroyed: () => false,
    send: () => undefined,
    on: () => undefined,
  };
  on(): void {
    /* no-op */
  }
}

export const screen = {
  getPrimaryDisplay(): { bounds: { x: number; y: number; width: number; height: number } } {
    return { bounds: { x: 0, y: 0, width: 1920, height: 1080 } };
  },
  getAllDisplays(): unknown[] {
    return [];
  },
};

export default {
  app,
  BrowserWindow,
  ipcMain,
  ipcRenderer,
  globalShortcut,
  screen,
  contextBridge,
};
