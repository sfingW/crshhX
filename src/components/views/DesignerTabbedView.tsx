import React, { useEffect, useMemo, useState } from 'react';
import type { CrosshairConfig } from '../../types/crosshair';
import { DEFAULT_CONFIG } from '../../lib/defaultPresets';
import { ReticleControls } from '../ReticleControls';
import { BACKDROP_OPTIONS } from '../TargetBackdrops';
import { useConfigHistory } from '../editor/useConfigHistory';
import { ComparePanel, PinCompareButton, PreviewStage } from '../editor/ComparePanel';
import {
  Check,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  Layers,
  RotateCcw,
  Save,
  Share2,
  Undo2,
  Redo2,
  X,
} from 'lucide-react';

interface DesignerTabbedViewProps {
  config: CrosshairConfig;
  onChange: (updated: Partial<CrosshairConfig>) => void;
  onSavePreset: (name: string) => void;
}

/**
 * The crosshair designer.
 *
 * Layout: a sub-header with document actions, the full parameter inspector on
 * the left, and a live preview stage on the right. The preview renders through
 * `ReticleRenderer` — the exact same component the overlay uses — so what is on
 * screen here is what appears in game, with no second rendering path to drift.
 *
 * Two things were consolidated here deliberately:
 *
 * - Parameter editing is delegated to `ReticleControls`, which previously sat
 *   unused while this file carried a second, smaller copy of the same sliders.
 *   One editor now, so a control can never exist in one place and not the other.
 * - The old "Layers" panel listed four fake layers with a "+ New Layer" button
 *   that only switched tabs. A crosshair is one config, not a layer stack, so
 *   that panel was removed in favour of a real component visibility list — each
 *   row toggles a field the renderer actually reads.
 */
export const DesignerTabbedView: React.FC<DesignerTabbedViewProps> = ({
  config,
  onChange,
  onSavePreset,
}) => {
  const history = useConfigHistory(config, onChange);

  const [crosshairTitle, setCrosshairTitle] = useState(config.name);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(2);
  const [isFiring, setIsFiring] = useState(false);
  const [isAds, setIsAds] = useState(false);
  const [backdropId, setBackdropId] = useState<string>(BACKDROP_OPTIONS[0].id);
  const [copied, setCopied] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  /** The "A" variation in a comparison, or null when not comparing. */
  const [pinned, setPinned] = useState<CrosshairConfig | null>(null);

  // A different crosshair can be loaded from the vault while this view stays
  // mounted; the title field has to follow it, and a pinned comparison of the
  // previous crosshair would be meaningless.
  useEffect(() => {
    setCrosshairTitle(config.name);
  }, [config.name]);

  useEffect(() => {
    setPinned((current) => (current && current.id !== config.id ? null : current));
  }, [config.id]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  const backdrop = useMemo(
    () => BACKDROP_OPTIONS.find((b) => b.id === backdropId) ?? BACKDROP_OPTIONS[0],
    [backdropId],
  );

  /* Keyboard undo/redo, suppressed while typing in a field. */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        history.undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        history.redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [history]);

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingTitle(false);
    const next = crosshairTitle.trim();
    if (!next || next === config.name) {
      setCrosshairTitle(config.name);
      return;
    }
    history.handleChange({ name: next });
  };

  const handleCopyJson = async () => {
    const payload = JSON.stringify(config, null, 2);
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
    } catch {
      // Clipboard access can be denied; fall back to a selectable dump rather
      // than failing silently.
      window.prompt('Copy the crosshair JSON:', payload);
    }
  };

  const handleResetAll = () => {
    history.handleChange({
      ...DEFAULT_CONFIG,
      id: config.id,
      name: config.name,
      game: config.game,
      isBuiltIn: config.isBuiltIn,
    });
    setConfirmingReset(false);
  };

  /** Every component the renderer can actually switch on or off. */
  const components: Array<{
    key: keyof CrosshairConfig;
    label: string;
    enabled: boolean;
    applies: boolean;
  }> = [
    { key: 'hasTopArm', label: 'Top line', enabled: config.hasTopArm, applies: true },
    { key: 'hasBottomArm', label: 'Bottom line', enabled: config.hasBottomArm, applies: true },
    { key: 'hasLeftArm', label: 'Left line', enabled: config.hasLeftArm, applies: true },
    { key: 'hasRightArm', label: 'Right line', enabled: config.hasRightArm, applies: true },
    {
      key: 'centerDotEnabled',
      label: 'Centre dot',
      enabled: config.centerDotEnabled,
      applies: true,
    },
    {
      key: 'outlineEnabled',
      label: 'Outer outline',
      enabled: config.outlineEnabled,
      applies: config.topology !== 'dot',
    },
    {
      key: 'innerOutlineEnabled',
      label: 'Inner outline',
      enabled: !!config.innerOutlineEnabled,
      applies: config.topology !== 'dot',
    },
    {
      key: 'circleEnabled',
      label: 'Spread ring',
      enabled: config.circleEnabled,
      applies: true,
    },
    {
      key: 'glowEnabled',
      label: 'Glow',
      enabled: config.glowEnabled,
      applies: true,
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-base text-zinc-100 overflow-hidden select-none">
      {/* Sub-header: document actions */}
      <div className="flex items-center justify-between px-6 py-2.5 bg-surface-sidebar border-b border-surface-border text-xs gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {isEditingTitle ? (
            <form onSubmit={handleTitleSubmit} className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={crosshairTitle}
                onChange={(e) => setCrosshairTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                aria-label="Crosshair name"
                maxLength={60}
                className="bg-surface-card border rounded px-2 py-1 text-zinc-100 text-xs font-semibold focus:outline-none"
                style={{ borderColor: 'var(--brand-accent)' }}
              />
              <button type="submit" aria-label="Save name" style={{ color: 'var(--brand-accent)' }}>
                <Check className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingTitle(true)}
              className="flex items-center gap-2 cursor-pointer group min-w-0"
              aria-label="Rename crosshair"
            >
              <Edit2 className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 shrink-0" />
              <span className="font-bold text-sm text-zinc-100 truncate">{config.name}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-zinc-400 shrink-0">
          {/* History */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={history.undo}
              disabled={!history.canUndo}
              title={history.canUndo ? 'Undo (Ctrl+Z)' : 'Nothing to undo'}
              aria-label="Undo"
              className="p-1 rounded transition-colors enabled:hover:text-zinc-100 enabled:hover:bg-surface-card disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={history.redo}
              disabled={!history.canRedo}
              title={history.canRedo ? 'Redo (Ctrl+Shift+Z)' : 'Nothing to redo'}
              aria-label="Redo"
              className="p-1 rounded transition-colors enabled:hover:text-zinc-100 enabled:hover:bg-surface-card disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-3.5 w-px bg-surface-border" />

          <button
            type="button"
            onClick={() => onSavePreset(config.name)}
            className="flex items-center gap-1.5 hover:text-zinc-100 transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          <button
            type="button"
            onClick={handleCopyJson}
            className="flex items-center gap-1.5 hover:text-zinc-100 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy JSON'}</span>
          </button>

          <div className="h-3.5 w-px bg-surface-border" />

          <button
            type="button"
            title="Save a copy as a new preset"
            aria-label="Save a copy as a new preset"
            onClick={() => onSavePreset(`${config.name} (Copy)`)}
            className="hover:text-zinc-100 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            title="Reset all parameters"
            aria-label="Reset all parameters"
            onClick={() => setConfirmingReset(true)}
            className="hover:text-rose-400 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inline reset confirmation — non-blocking, unlike a native dialog */}
      {confirmingReset && (
        <div
          role="alertdialog"
          aria-label="Confirm reset"
          className="flex items-center justify-between gap-3 px-6 py-2 bg-rose-950/40 border-b border-rose-900/50 text-[11px]"
        >
          <span className="text-rose-200">
            Reset every parameter of <strong>{config.name}</strong> back to the crshhx default
            crosshair? Its name and game stay, and nothing is saved until you press Save. You can
            undo this with Ctrl+Z.
          </span>
          <span className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleResetAll}
              className="px-2.5 py-1 rounded bg-rose-600 text-white hover:bg-rose-500 transition-colors font-medium"
            >
              Reset parameters
            </button>
            <button
              type="button"
              onClick={() => setConfirmingReset(false)}
              aria-label="Cancel reset"
              className="p-1 rounded text-rose-300 hover:text-white hover:bg-rose-900/60 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
        </div>
      )}

      {/* Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: the full parameter inspector */}
        <div className="flex-1 min-w-0 overflow-y-auto scrollbar-thin">
          <ReticleControls
            config={config}
            onChange={history.handleChange}
            onResetCenter={() => history.handleChange({ offsetX: 0, offsetY: 0 })}
          />
        </div>

        {/* Right: live preview stage */}
        <div className="w-[340px] shrink-0 border-l border-surface-border bg-surface-sidebar flex flex-col overflow-y-auto scrollbar-thin">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2 gap-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold">
                {pinned ? 'Compare' : 'Live preview'}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-600">{zoomLevel}×</span>
                {!pinned && <PinCompareButton onPin={() => setPinned({ ...config })} />}
              </span>
            </div>

            {pinned ? (
              <ComparePanel
                pinned={pinned}
                current={config}
                scale={zoomLevel}
                backdrop={backdrop}
                onUpdatePin={() => setPinned({ ...config })}
                onRestorePinned={() =>
                  // Restoring A is an edit, so it goes through history and can
                  // itself be undone. The document identity stays put.
                  history.handleChange({ ...pinned, id: config.id, name: config.name })
                }
                onClear={() => setPinned(null)}
              />
            ) : (
              <PreviewStage
                config={config}
                scale={zoomLevel}
                backdrop={backdrop}
                isFiring={isFiring}
                isAds={isAds}
                interactive
                onFireStart={() => {
                  setIsFiring(true);
                  setTimeout(() => setIsFiring(false), config.firingDecayMs || 120);
                }}
                onAdsChange={(active) => {
                  // Also clears on pointer-leave, so a simulated ADS can never
                  // be left stuck if the pointer exits mid-hold.
                  setIsAds(active);
                  if (!active) setIsFiring(false);
                }}
              />
            )}

            {/* Zoom */}
            <div className="flex items-center justify-center gap-1.5 mt-2">
              {[1, 2, 4, 8].map((z) => (
                <button
                  key={z}
                  type="button"
                  onClick={() => setZoomLevel(z)}
                  aria-pressed={zoomLevel === z}
                  aria-label={`Zoom ${z} times`}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    zoomLevel === z ? 'font-bold text-black' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                  style={{
                    backgroundColor: zoomLevel === z ? 'var(--brand-accent)' : undefined,
                  }}
                >
                  {z}×
                </button>
              ))}
            </div>

            {/* Preview background */}
            <div className="mt-3 space-y-1.5">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-semibold block">
                Preview background
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {BACKDROP_OPTIONS.map((option) => {
                  const active = option.id === backdropId;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setBackdropId(option.id)}
                      title={`${option.name} — ${option.category}`}
                      aria-pressed={active}
                      className={`h-9 rounded border text-[10px] text-left px-2 truncate transition-all ${
                        active
                          ? 'border-transparent text-zinc-100 font-medium'
                          : 'border-surface-border text-zinc-500 hover:text-zinc-300'
                      }`}
                      style={{
                        ...option.backgroundStyle,
                        backgroundColor: active ? undefined : option.backgroundStyle.backgroundColor,
                        boxShadow: active ? 'inset 0 0 0 1px var(--brand-accent)' : undefined,
                        textShadow: '0 1px 2px rgba(0,0,0,.85)',
                      }}
                    >
                      {option.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Component visibility — every row maps to a field the renderer reads */}
          <div className="px-4 pb-4 flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-zinc-300 flex items-center gap-1.5 text-xs">
                <Layers className="w-3.5 h-3.5" style={{ color: 'var(--brand-accent)' }} />
                Components
              </span>
              <span className="text-[10px] font-mono text-zinc-600">
                {components.filter((c) => c.enabled && c.applies).length}/{components.length} on
              </span>
            </div>

            <div className="space-y-1">
              {components.map((component) => (
                <button
                  key={String(component.key)}
                  type="button"
                  disabled={!component.applies}
                  onClick={() =>
                    history.handleChange({ [component.key]: !component.enabled } as Partial<CrosshairConfig>)
                  }
                  aria-pressed={component.enabled}
                  aria-label={`${component.enabled ? 'Hide' : 'Show'} ${component.label}`}
                  title={
                    component.applies
                      ? `${component.label} — ${component.enabled ? 'visible' : 'hidden'}`
                      : `${component.label} does not apply to the ${config.topology} style`
                  }
                  className={`w-full flex items-center justify-between p-2 rounded-md border transition-all text-left ${
                    !component.applies
                      ? 'bg-surface-sidebar border-surface-border text-zinc-600 cursor-not-allowed opacity-50'
                      : component.enabled
                        ? 'bg-surface-card border-surface-border text-zinc-100'
                        : 'bg-surface-sidebar border-surface-border text-zinc-500 hover:text-zinc-300'
                  }`}
                  style={{
                    borderColor:
                      component.enabled && component.applies
                        ? 'var(--brand-accent-border)'
                        : undefined,
                  }}
                >
                  <span className="text-[11px]">{component.label}</span>
                  {component.enabled && component.applies ? (
                    <Eye className="w-3 h-3" style={{ color: 'var(--brand-accent)' }} />
                  ) : (
                    <EyeOff className="w-3 h-3 text-zinc-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
