import React, { useState } from 'react';
import { CrosshairConfig } from '../types/crosshair';
import { parseValorantCode, exportValorantCode } from '../lib/valorantParser';
import { parseCS2Commands, exportCS2Commands } from '../lib/cs2Parser';
import { Copy, Check, Terminal, ArrowUpRight, AlertCircle } from 'lucide-react';

interface CodeImportExportProps {
  config: CrosshairConfig;
  onImport: (newConfig: CrosshairConfig) => void;
}

export const CodeImportExport: React.FC<CodeImportExportProps> = ({ config, onImport }) => {
  const [importInput, setImportInput] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const valorantCode = exportValorantCode(config);
  const cs2Commands = exportCS2Commands(config);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleImportSubmit = () => {
    setImportError(null);
    const trimmed = importInput.trim();
    if (!trimmed) return;

    if (trimmed.startsWith('0;')) {
      const parsed = parseValorantCode(trimmed, config);
      if (parsed) {
        onImport(parsed);
        setImportInput('');
        return;
      }
    }

    if (trimmed.toLowerCase().includes('cl_crosshair')) {
      const parsed = parseCS2Commands(trimmed, config);
      if (parsed) {
        onImport(parsed);
        setImportInput('');
        return;
      }
    }

    try {
      const parsedJson = JSON.parse(trimmed);
      if (parsedJson && (parsedJson.topology || parsedJson.primaryColor)) {
        onImport({ ...config, ...parsedJson, id: `custom-${Date.now()}` });
        setImportInput('');
        return;
      }
    } catch {}

    setImportError('Invalid syntax. Expected Valorant profile code (0;P;...), CS2 cvars (cl_crosshair...), or JSON.');
  };

  return (
    <div className="bg-panel-elevated border border-panel-border rounded-xl p-4 space-y-4 shadow-lg text-xs">
      {/* Universal Input Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-zinc-400" />
          <span className="font-semibold text-zinc-200 tracking-tight font-mono text-xs uppercase">
            Game Bridge & Console Exchange
          </span>
        </div>
        <span className="text-[10px] font-mono text-zinc-500">FORMATS: VALORANT HASH • CS2 CVARS</span>
      </div>

      {/* Universal Input Bar */}
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Paste Valorant code (0;P;...), CS2 console string (cl_crosshair...), or JSON"
              value={importInput}
              onChange={(e) => {
                setImportInput(e.target.value);
                setImportError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleImportSubmit()}
              className="w-full bg-panel-base border border-panel-border rounded-lg pl-3 pr-3 py-1.5 font-mono text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-500"
            />
          </div>
          <button
            onClick={handleImportSubmit}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 font-semibold font-mono text-xs hover:bg-white transition-all shadow-sm"
          >
            Import
          </button>
        </div>

        {importError && (
          <div className="flex items-center gap-1.5 text-rose-400 text-[11px] font-mono">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{importError}</span>
          </div>
        )}
      </div>

      {/* Export Output Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
        {/* Valorant Hash */}
        <div className="p-3 bg-panel-base rounded-lg border border-panel-border space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-zinc-400 font-medium">VALORANT SHARE CODE</span>
            <button
              onClick={() => handleCopy(valorantCode, 'val')}
              className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              {copiedKey === 'val' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'val' ? 'COPIED' : 'COPY'}</span>
            </button>
          </div>
          <div className="font-mono text-[11px] text-zinc-400 bg-panel-subtle p-2 rounded border border-panel-border truncate select-all">
            {valorantCode}
          </div>
        </div>

        {/* CS2 Console Snippet */}
        <div className="p-3 bg-panel-base rounded-lg border border-panel-border space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-zinc-400 font-medium">CS2 CONSOLE CVARS</span>
            <button
              onClick={() => handleCopy(cs2Commands, 'cs2')}
              className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              {copiedKey === 'cs2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedKey === 'cs2' ? 'COPIED' : 'COPY'}</span>
            </button>
          </div>
          <div className="font-mono text-[11px] text-zinc-400 bg-panel-subtle p-2 rounded border border-panel-border truncate select-all">
            {cs2Commands}
          </div>
        </div>
      </div>
    </div>
  );
};
