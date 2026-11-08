import { spawn, type ChildProcessWithoutNullStreams } from 'child_process';
import { normalizeProcessName } from '../../src/lib/weaponSlots/profileMatching';

/**
 * Foreground-application tracking.
 *
 * Scope, stated plainly: crshhx asks the operating system which executable owns
 * the foreground window. That is ordinary window-management information, the
 * same thing a taskbar or Alt-Tab switcher reads. It is **not** game detection:
 *
 *   - no game memory is read
 *   - nothing is injected into any process
 *   - no game files are touched
 *   - no anti-cheat interface is called
 *
 * The result is only ever compared against process names the *user* typed into a
 * profile, and it is used solely to pick which slot profile is live. Because
 * that lookup costs a round-trip to the OS, it runs on its own slow poll and is
 * cached — it is never on the key-press hot path, so it cannot add input delay.
 *
 * Automatic selection is OFF by default. Without it, profiles are chosen
 * manually and everything still works.
 */

export interface ForegroundAppProvider {
  readonly id: string;
  /** False when this platform has no provider, or it failed to start. */
  isAvailable(): boolean;
  start(): void;
  stop(): void;
  /** Last known foreground executable name, lower-cased. `null` when unknown. */
  current(): string | null;
}

/** Used when the platform is unsupported or the user disabled auto-selection. */
export class NullForegroundProvider implements ForegroundAppProvider {
  readonly id = 'none';
  isAvailable(): boolean {
    return false;
  }
  start(): void {
    /* no-op */
  }
  stop(): void {
    /* no-op */
  }
  current(): string | null {
    return null;
  }
}

/**
 * Persistent PowerShell worker.
 *
 * A one-shot `powershell -Command ...` per poll would pay ~200 ms of process
 * start-up plus a C# `Add-Type` compile every time. Instead crshhx keeps a
 * single long-lived worker that compiles the P/Invoke shim once and then answers
 * one-line requests over stdin/stdout. The worker is started lazily, restarted
 * with back-off if it dies, and killed on quit.
 */
const WORKER_SCRIPT = [
  "$ErrorActionPreference='SilentlyContinue'",
  "Add-Type -TypeDefinition @'",
  'using System;',
  'using System.Runtime.InteropServices;',
  'using System.Text;',
  'public static class CrshhxForeground {',
  '  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();',
  '  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);',
  '  [DllImport("kernel32.dll")] public static extern IntPtr OpenProcess(uint a, bool i, uint pid);',
  '  [DllImport("kernel32.dll")] public static extern bool QueryFullProcessImageName(IntPtr h, uint f, StringBuilder n, ref uint s);',
  '  [DllImport("kernel32.dll")] public static extern bool CloseHandle(IntPtr h);',
  '}',
  "'@",
  'while ($true) {',
  '  $line = [Console]::In.ReadLine()',
  '  if ($null -eq $line) { break }',
  '  $name = ""',
  '  $h = [CrshhxForeground]::GetForegroundWindow()',
  '  $procId = [uint32]0',
  '  [CrshhxForeground]::GetWindowThreadProcessId($h, [ref]$procId) | Out-Null',
  '  $ph = [CrshhxForeground]::OpenProcess(0x1000, $false, $procId)',
  '  if ($ph -ne [IntPtr]::Zero) {',
  '    $sb = New-Object System.Text.StringBuilder 1024',
  '    $len = [uint32]1024',
  '    if ([CrshhxForeground]::QueryFullProcessImageName($ph, 0, $sb, [ref]$len)) { $name = $sb.ToString() }',
  '    [CrshhxForeground]::CloseHandle($ph) | Out-Null',
  '  }',
  '  [Console]::Out.WriteLine($name)',
  '  [Console]::Out.Flush()',
  '}',
].join('\n');

export interface WindowsForegroundOptions {
  /** Poll interval in milliseconds. Deliberately slow — this is not latency-critical. */
  intervalMs?: number;
  /** Maximum consecutive worker failures before giving up until restart. */
  maxFailures?: number;
  now?: () => number;
}

export class WindowsForegroundProvider implements ForegroundAppProvider {
  readonly id = 'windows-powershell';

  private worker: ChildProcessWithoutNullStreams | null = null;
  private timer: NodeJS.Timeout | null = null;
  private pending = false;
  private failures = 0;
  private available = false;
  private value: string | null = null;
  private stopped = true;
  /**
   * Set once the worker has failed `maxFailures` times in a row.
   *
   * Without this latch, giving up sets `stopped = true`, and any later
   * `start()` — which the service calls whenever the feature is wanted and the
   * provider reports unavailable — would reset the counter and respawn
   * PowerShell. On a machine where PowerShell is blocked that means a fresh
   * burst of process spawns on every settings change. The latch makes the
   * give-up sticky; only an explicit `stop()` (the user turning the option off)
   * clears it, so re-enabling is still a genuine retry.
   */
  private permanentlyDisabled = false;

  private readonly intervalMs: number;
  private readonly maxFailures: number;

  constructor(options: WindowsForegroundOptions = {}) {
    this.intervalMs = Math.max(500, options.intervalMs ?? 1500);
    this.maxFailures = options.maxFailures ?? 5;
  }

  isAvailable(): boolean {
    return this.available;
  }

  current(): string | null {
    return this.value;
  }

  start(): void {
    if (process.platform !== 'win32') return;
    if (!this.stopped) return;
    if (this.permanentlyDisabled) return;
    this.stopped = false;
    this.failures = 0;
    this.spawnWorker();
    this.timer = setInterval(() => this.poll(), this.intervalMs);
    // Poll immediately so the first profile match does not wait a full interval.
    this.poll();
  }

  stop(): void {
    this.stopped = true;
    // A deliberate stop is the user turning tracking off, so allow a retry.
    this.permanentlyDisabled = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.killWorker();
    this.available = false;
    this.value = null;
  }

  private spawnWorker(): void {
    try {
      const child = spawn(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', WORKER_SCRIPT],
        { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] },
      ) as ChildProcessWithoutNullStreams;

      child.on('error', (err) => {
        console.warn('[crshhx] foreground worker failed to spawn:', err.message);
        this.registerFailure();
      });

      child.on('exit', () => {
        this.worker = null;
        if (!this.stopped) this.registerFailure();
      });

      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk: string) => {
        this.pending = false;
        // First successful answer proves the worker is usable.
        this.available = true;
        this.failures = 0;
        const line = chunk.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).pop();
        this.value = normalizeProcessName(line ?? '');
      });

      child.stderr.on('data', () => {
        /* ignored — the worker writes an empty line rather than failing hard */
      });

      this.worker = child;
    } catch (err) {
      console.warn('[crshhx] could not start foreground worker:', err);
      this.registerFailure();
    }
  }

  private poll(): void {
    if (this.stopped || this.pending || !this.worker) return;
    try {
      this.pending = true;
      this.worker.stdin.write('q\n');
      // Never let a wedged worker block the poll loop.
      setTimeout(() => {
        this.pending = false;
      }, this.intervalMs);
    } catch {
      this.pending = false;
      this.registerFailure();
    }
  }

  private registerFailure(): void {
    this.failures += 1;
    this.available = false;
    this.killWorker();
    if (this.stopped) return;
    if (this.failures >= this.maxFailures) {
      console.warn(
        '[crshhx] foreground tracking disabled after repeated failures; '
        + 'profiles will stay on manual selection.',
      );
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
      this.stopped = true;
      this.permanentlyDisabled = true;
      return;
    }
    // Back off before trying again.
    setTimeout(() => {
      if (!this.stopped) this.spawnWorker();
    }, this.intervalMs * this.failures);
  }

  private killWorker(): void {
    if (!this.worker) return;
    const child = this.worker;
    this.worker = null;
    try {
      child.stdin.end();
      child.kill();
    } catch {
      /* best effort */
    }
  }
}

/** Picks the right provider for the current platform. */
export function createForegroundProvider(): ForegroundAppProvider {
  if (process.platform === 'win32') return new WindowsForegroundProvider();
  return new NullForegroundProvider();
}
