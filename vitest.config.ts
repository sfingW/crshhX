import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Test configuration for crshhx.
 *
 * The Weapon Slot Crosshairs core (`src/lib/weaponSlots`) is deliberately free
 * of Electron/DOM/React dependencies, so the suite runs in a plain Node
 * environment. `electron` is aliased to a recording stub, which lets the tests
 * assert on the main-process side (which accelerators got registered, what was
 * sent to the overlay) without launching a real Electron binary.
 */
export default defineConfig({
  resolve: {
    alias: {
      electron: resolve(__dirname, 'tests/mocks/electron.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: [resolve(__dirname, 'tests/setup.ts')],
    globals: false,
    restoreMocks: true,
  },
});
