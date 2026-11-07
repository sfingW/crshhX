import React, { useState } from 'react';
import { CrosshairConfig } from '../types/crosshair';
import { PRO_PRESETS } from '../lib/defaultPresets';
import { ReticleRenderer } from './ReticleRenderer';
import { X, Search, Plus, Trash2, Check, Trophy, Sparkles } from 'lucide-react';

interface ProPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: CrosshairConfig;
  customPresets: CrosshairConfig[];
  onSelectPreset: (config: CrosshairConfig) => void;
  onSaveCurrentAsCustom: (name: string) => void;
  onDeleteCustomPreset: (id: string) => void;
}

export const ProPresetsModal: React.FC<ProPresetsModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  customPresets,
  onSelectPreset,
  onSaveCurrentAsCustom,
  onDeleteCustomPreset,
}) => {
  const [selectedTab, setSelectedTab] = useState<'all' | 'valorant' | 'cs2' | 'fortnite' | 'custom'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [newPresetName, setNewPresetName] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  if (!isOpen) return null;

  const allPresets = [...PRO_PRESETS, ...customPresets];

  const filteredPresets = allPresets.filter((p) => {
    const matchesTab =
      selectedTab === 'all'
        ? true
        : selectedTab === 'custom'
        ? !p.isBuiltIn
        : p.game === selectedTab;

    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPresetName.trim()) {
      onSaveCurrentAsCustom(newPresetName.trim());
      setNewPresetName('');
      setShowSaveInput(false);
      setSelectedTab('custom');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="flex flex-col w-full max-w-4xl max-h-[85vh] bg-[#0f131d] border border-[#222b40] rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#222b40] bg-[#121724]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#00ffcc]/15 text-[#00ffcc] border border-[#00ffcc]/30">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Pro Reticle Vault & Community Presets
              </h2>
              <p className="text-xs text-gray-400">
                1-click copy official configs used by champion FPS esports athletes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1c2436] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Tabs Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-[#0c1018] border-b border-[#222b40]">
          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#141a29] p-1 rounded-xl border border-[#222b40]">
            {[
              { id: 'all', label: 'All Vault' },
              { id: 'valorant', label: 'Valorant' },
              { id: 'cs2', label: 'CS2' },
              { id: 'fortnite', label: 'Fortnite' },
              { id: 'custom', label: `My Presets (${customPresets.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedTab === tab.id
                    ? 'bg-[#00ffcc] text-black font-bold shadow-md'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a2336]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box & Save Action */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search pro player..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 bg-[#141a29] border border-[#222b40] rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-[#00ffcc]"
              />
            </div>

            <button
              onClick={() => setShowSaveInput(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1e2638] hover:bg-[#253047] text-[#00ffcc] border border-[#00ffcc]/30 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Save Current
            </button>
          </div>
        </div>

        {/* Save Current Preset Inline Form */}
        {showSaveInput && (
          <form onSubmit={handleSaveSubmit} className="flex items-center gap-2 px-6 py-2.5 bg-[#172033] border-b border-[#00ffcc]/30">
            <span className="text-xs text-[#00ffcc] font-medium shrink-0">Name Custom Preset:</span>
            <input
              type="text"
              autoFocus
              placeholder="e.g. My Warmup CS2 Dot"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              className="flex-1 bg-[#0a0d14] border border-[#222b40] rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-[#00ffcc]"
            />
            <button
              type="submit"
              className="px-3 py-1 rounded-lg bg-[#00ffcc] text-black text-xs font-bold hover:bg-[#00e6b8]"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowSaveInput(false)}
              className="px-2 py-1 text-xs text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Presets Grid */}
        <div className="flex-1 p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 scrollbar-thin">
          {filteredPresets.map((preset) => {
            const isCurrent = currentConfig.id === preset.id;
            return (
              <div
                key={preset.id}
                onClick={() => {
                  onSelectPreset(preset);
                  onClose();
                }}
                className={`group relative flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  isCurrent
                    ? 'bg-[#152233] border-[#00ffcc] shadow-[0_0_15px_rgba(0,255,204,0.15)]'
                    : 'bg-[#121724] border-[#222b40] hover:border-[#38486b] hover:bg-[#161d2d]'
                }`}
              >
                {/* Visual Thumbnail Stage */}
                <div className="relative w-full h-28 rounded-lg bg-[#0a0d14] border border-[#1e2638] flex items-center justify-center overflow-hidden mb-3">
                  <div
                    className="absolute inset-0 opacity-15"
                    style={{
                      backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
                      backgroundSize: '16px 16px',
                    }}
                  />
                  <ReticleRenderer config={preset} scale={1.5} />
                </div>

                {/* Info & Meta */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-[#00ffcc] transition-colors truncate max-w-[160px]">
                      {preset.name}
                    </h4>
                    <span className="text-[10px] uppercase font-mono text-gray-400 tracking-wider">
                      {preset.game} {preset.topology !== 'cross' ? `• ${preset.topology}` : ''}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {isCurrent && (
                      <span className="p-1 rounded-full bg-[#00ffcc]/20 text-[#00ffcc]">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                    {!preset.isBuiltIn && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCustomPreset(preset.id);
                        }}
                        title="Delete custom preset"
                        className="p-1 rounded-lg text-gray-500 hover:text-red-400 hover:bg-[#1a2233] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
