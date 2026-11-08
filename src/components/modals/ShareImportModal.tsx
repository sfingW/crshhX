import React, { useState } from 'react';
import { CrosshairConfig } from '../../types/crosshair';
import { exportValorantCode, parseValorantCode } from '../../lib/valorantParser';
import { exportCS2Commands, parseCS2Commands } from '../../lib/cs2Parser';
import { X, Copy, Check } from 'lucide-react';

interface ShareImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CrosshairConfig;
  onImport: (newConfig: CrosshairConfig) => void;
  initialMode?: 'share' | 'import';
}

export const ShareImportModal: React.FC<ShareImportModalProps> = ({
  isOpen,
  onClose,
  config,
  onImport,
  initialMode = 'share',
}) => {
  const [mode, setMode] = useState<'share' | 'import'>(initialMode);
  const [importText, setImportText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const valorantCode = exportValorantCode(config);
  const cs2Commands = exportCS2Commands(config);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleImport = () => {
    setErrorMsg(null);
    const trimmed = importText.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('0;')) {
      const parsed = parseValorantCode(trimmed, config);
      if (parsed) {
        onImport(parsed);
        onClose();
        return;
      }
    }

    if (trimmed.toLowerCase().includes('cl_crosshair')) {
      const parsed = parseCS2Commands(trimmed, config);
      if (parsed) {
        onImport(parsed);
        onClose();
        return;
      }
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && (parsed.topology || parsed.primaryColor)) {
        onImport({ ...config, ...parsed, id: `imported-${Date.now()}` });
        onClose();
        return;
      }
    } catch {}

    setErrorMsg('Unrecognized format. Paste a Valorant code (0;P;...), CS2 commands (cl_crosshair...), or JSON.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm select-none">
      <div className="w-full max-w-lg bg-[#161618] border border-[#27272b] rounded-xl shadow-2xl overflow-hidden text-zinc-100 text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#26262a] bg-[#1a1a1d]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMode('share')}
              className={`font-semibold pb-0.5 border-b-2 transition-all ${
                mode === 'share' ? 'text-zinc-100' : 'text-zinc-400 border-transparent'
              }`}
              style={{
                borderColor: mode === 'share' ? 'var(--brand-accent)' : 'transparent',
                color: mode === 'share' ? 'var(--brand-accent)' : undefined,
              }}
            >
              Share Crosshair
            </button>
            <button
              onClick={() => setMode('import')}
              className={`font-semibold pb-0.5 border-b-2 transition-all ${
                mode === 'import' ? 'text-zinc-100' : 'text-zinc-400 border-transparent'
              }`}
              style={{
                borderColor: mode === 'import' ? 'var(--brand-accent)' : 'transparent',
                color: mode === 'import' ? 'var(--brand-accent)' : undefined,
              }}
            >
              Import Code
            </button>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {mode === 'share' ? (
            <div className="space-y-4">
              {/* Valorant Code */}
              <div className="p-3 bg-[#121214] border border-[#222226] rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-300">Valorant Share Code</span>
                  <button
                    onClick={() => handleCopy(valorantCode, 'val')}
                    className="hover:underline flex items-center gap-1 font-mono text-[11px]"
                    style={{ color: 'var(--brand-accent)' }}
                  >
                    {copiedKey === 'val' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'val' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-zinc-400 truncate bg-[#18181b] p-2 rounded select-all">
                  {valorantCode}
                </div>
              </div>

              {/* CS2 Commands */}
              <div className="p-3 bg-[#121214] border border-[#222226] rounded-lg space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-300">CS2 Console Commands</span>
                  <button
                    onClick={() => handleCopy(cs2Commands, 'cs2')}
                    className="hover:underline flex items-center gap-1 font-mono text-[11px]"
                    style={{ color: 'var(--brand-accent)' }}
                  >
                    {copiedKey === 'cs2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === 'cs2' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] text-zinc-400 truncate bg-[#18181b] p-2 rounded select-all">
                  {cs2Commands}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-zinc-400 text-xs">
                Paste any official Valorant crosshair code (0;P;...), CS2 console snippet (cl_crosshair...), or JSON to load it:
              </p>
              <p className="text-zinc-500 text-[10.5px] leading-relaxed">
                This applies one crosshair to what you are currently editing. To bring in a crshhx
                file with many crosshairs, folders, settings or weapon-slot profiles, use
                Preset Manager → Import file — that route previews the whole file before changing
                anything.
              </p>
              <textarea
                rows={4}
                value={importText}
                onChange={(e) => {
                  setImportText(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Paste code here..."
                className="w-full bg-[#121214] border border-[#27272b] rounded-lg p-3 font-mono text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-[#ff6400]"
              />
              {errorMsg && <p className="text-rose-400 text-[11px] font-mono">{errorMsg}</p>}
              <button
                onClick={handleImport}
                className="w-full py-2 text-black font-bold rounded-lg text-xs transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--brand-accent)' }}
              >
                Apply Crosshair
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
