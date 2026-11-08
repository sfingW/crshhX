/**
 * Reading and writing export files from the renderer.
 *
 * This uses the plain DOM file APIs rather than an Electron save dialog, so it
 * behaves identically in the packaged app and in a browser. The trade-off is
 * honest and worth stating: a download lands in the user's default download
 * folder instead of a chosen path, and a save dialog would need an IPC round
 * trip to the main process. Everything else — validation, preview, confirmation
 * — happens in the app, so the file itself is never trusted.
 */

/** Offers `text` to the user as a downloadable file. */
export function downloadTextFile(fileName: string, text: string, mime = 'application/json'): void {
  const blob = new Blob([text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in some engines, so wait a beat.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export interface FileReadResult {
  fileName: string;
  text: string;
  sizeBytes: number;
}

/**
 * Opens a file picker and reads one file as text.
 *
 * Resolves with `null` when the user cancels. Rejects with a message safe to
 * show, rather than a raw DOM exception.
 */
export function pickAndReadTextFile(accept = '.json,application/json'): Promise<FileReadResult | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';

    const cleanup = () => {
      input.remove();
      window.removeEventListener('focus', onFocus);
    };
    // A cancelled picker fires no event in some engines; regaining focus after
    // the dialog closes is the reliable signal that nothing was chosen.
    let settled = false;
    const onFocus = () => {
      setTimeout(() => {
        if (!settled && !input.files?.length) {
          settled = true;
          cleanup();
          resolve(null);
        }
      }, 600);
    };

    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        settled = true;
        cleanup();
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        settled = true;
        cleanup();
        resolve({
          fileName: file.name,
          text: String(reader.result ?? ''),
          sizeBytes: file.size,
        });
      };
      reader.onerror = () => {
        settled = true;
        cleanup();
        reject(new Error(`“${file.name}” could not be read. It may be locked by another program.`));
      };
      reader.readAsText(file);
    };

    document.body.appendChild(input);
    window.addEventListener('focus', onFocus);
    input.click();
  });
}

/** Refuses to treat an absurdly large file as a crosshair export. */
export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;

export function isTooLarge(sizeBytes: number): boolean {
  return sizeBytes > MAX_IMPORT_BYTES;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
