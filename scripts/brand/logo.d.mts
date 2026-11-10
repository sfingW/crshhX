/**
 * Type shim for `scripts/brand/logo.mjs`, the generated-brand pipeline.
 *
 * The generator is plain JavaScript on purpose — it runs with bare Node, no
 * build step, no dependencies — but the TypeScript test suites import it to
 * re-run generation and byte-compare the checked-in assets. Without this shim
 * `tsc` reports TS7016 for the untyped `.mjs` module.
 *
 * Values are `string` for text assets (SVG, generated TS) and a PNG/ICO buffer
 * for binary ones; `any` keeps the shim honest about that split without
 * dragging Node's Buffer type into the website's browser-oriented tsconfig.
 * Extend this file only when a typed consumer needs another export.
 */

export declare function generateAll(options?: {
  /** Repository root to write into. Defaults to the checkout containing the script. */
  outRoot?: string;
  /** When false, return the asset map without touching disk. */
  write?: boolean;
}): Record<string, any>;
