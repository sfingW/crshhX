"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowsForegroundProvider = exports.NullForegroundProvider = void 0;
exports.createForegroundProvider = createForegroundProvider;
const child_process_1 = require("child_process");
const profileMatching_1 = require("../../src/lib/weaponSlots/profileMatching");
/** Used when the platform is unsupported or the user disabled auto-selection. */
class NullForegroundProvider {
    id = 'none';
    isAvailable() {
        return false;
    }
    start() {
        /* no-op */
    }
    stop() {
        /* no-op */
    }
    current() {
        return null;
    }
}
exports.NullForegroundProvider = NullForegroundProvider;
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
class WindowsForegroundProvider {
    id = 'windows-powershell';
    worker = null;
    timer = null;
    pending = false;
    failures = 0;
    available = false;
    value = null;
    stopped = true;
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
    permanentlyDisabled = false;
    intervalMs;
    maxFailures;
    constructor(options = {}) {
        this.intervalMs = Math.max(500, options.intervalMs ?? 1500);
        this.maxFailures = options.maxFailures ?? 5;
    }
    isAvailable() {
        return this.available;
    }
    current() {
        return this.value;
    }
    start() {
        if (process.platform !== 'win32')
            return;
        if (!this.stopped)
            return;
        if (this.permanentlyDisabled)
            return;
        this.stopped = false;
        this.failures = 0;
        this.spawnWorker();
        this.timer = setInterval(() => this.poll(), this.intervalMs);
        // Poll immediately so the first profile match does not wait a full interval.
        this.poll();
    }
    stop() {
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
    spawnWorker() {
        try {
            const child = (0, child_process_1.spawn)('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', WORKER_SCRIPT], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
            child.on('error', (err) => {
                console.warn('[crshhx] foreground worker failed to spawn:', err.message);
                this.registerFailure();
            });
            child.on('exit', () => {
                this.worker = null;
                if (!this.stopped)
                    this.registerFailure();
            });
            child.stdout.setEncoding('utf8');
            child.stdout.on('data', (chunk) => {
                this.pending = false;
                // First successful answer proves the worker is usable.
                this.available = true;
                this.failures = 0;
                const line = chunk.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).pop();
                this.value = (0, profileMatching_1.normalizeProcessName)(line ?? '');
            });
            child.stderr.on('data', () => {
                /* ignored — the worker writes an empty line rather than failing hard */
            });
            this.worker = child;
        }
        catch (err) {
            console.warn('[crshhx] could not start foreground worker:', err);
            this.registerFailure();
        }
    }
    poll() {
        if (this.stopped || this.pending || !this.worker)
            return;
        try {
            this.pending = true;
            this.worker.stdin.write('q\n');
            // Never let a wedged worker block the poll loop.
            setTimeout(() => {
                this.pending = false;
            }, this.intervalMs);
        }
        catch {
            this.pending = false;
            this.registerFailure();
        }
    }
    registerFailure() {
        this.failures += 1;
        this.available = false;
        this.killWorker();
        if (this.stopped)
            return;
        if (this.failures >= this.maxFailures) {
            console.warn('[crshhx] foreground tracking disabled after repeated failures; '
                + 'profiles will stay on manual selection.');
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
            if (!this.stopped)
                this.spawnWorker();
        }, this.intervalMs * this.failures);
    }
    killWorker() {
        if (!this.worker)
            return;
        const child = this.worker;
        this.worker = null;
        try {
            child.stdin.end();
            child.kill();
        }
        catch {
            /* best effort */
        }
    }
}
exports.WindowsForegroundProvider = WindowsForegroundProvider;
/** Picks the right provider for the current platform. */
function createForegroundProvider() {
    if (process.platform === 'win32')
        return new WindowsForegroundProvider();
    return new NullForegroundProvider();
}
