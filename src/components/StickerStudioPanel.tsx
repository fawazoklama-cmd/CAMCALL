import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Plus, Trash2, Type } from 'lucide-react';
import { useState } from 'react';
import { STICKER_CATEGORIES, STICKER_PRESETS, TEXT_FONTS } from '../data/presets';
import type { CanvasLayer, StickerCategory, StickerPreset } from '../types/studio';

interface StickerStudioPanelProps {
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string | null) => void;
  onAddLayer: (layer: CanvasLayer) => void;
  onUpdateLayer: (id: string, patch: Partial<CanvasLayer>) => void;
  onDeleteLayer: (id: string) => void;
}

const TEXT_SWATCHES = ['#DB2777', '#2D1B28', '#FFFFFF', '#7C3AED', '#E11D48', '#F472B6'];

export function StickerStudioPanel({
  layers,
  selectedLayerId,
  onSelectLayer,
  onAddLayer,
  onUpdateLayer,
  onDeleteLayer,
}: StickerStudioPanelProps) {
  const [activeCategory, setActiveCategory] = useState<StickerCategory>('Hearts');
  const [customText, setCustomText] = useState('Cute Day ♡');
  const [customFont, setCustomFont] = useState(TEXT_FONTS[0].id);
  const [customColor, setCustomColor] = useState('#DB2777');
  const [customBgPill, setCustomBgPill] = useState(true);

  const itemsInCategory = STICKER_PRESETS.filter((item) => item.category === activeCategory);
  const selectedLayer = layers.find((l) => l.id === selectedLayerId) || null;

  const handleAddPreset = (preset: StickerPreset) => {
    const id = `layer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    if (preset.kind === 'frame') {
      onAddLayer({
        id,
        type: 'frame',
        label: preset.label,
        symbol: preset.symbol,
        color: preset.color,
        accentColor: preset.accentColor,
        x: 0.5,
        y: 0.5,
        scale: 1,
        rotation: 0,
        opacity: 1,
        stickerId: preset.id,
      });
    } else if (preset.kind === 'text-preset') {
      onAddLayer({
        id,
        type: 'text',
        label: preset.label,
        text: preset.symbol,
        fontFamily: 'Bricolage Grotesque',
        color: preset.color,
        bgColor: preset.accentColor,
        x: 0.5,
        y: 0.82,
        scale: 1,
        rotation: 0,
        opacity: 1,
        stickerId: preset.id,
      });
    } else {
      onAddLayer({
        id,
        type: 'sticker',
        label: preset.label,
        symbol: preset.symbol,
        color: preset.color,
        accentColor: preset.accentColor,
        x: 0.5,
        y: 0.5,
        scale: 1,
        rotation: 0,
        opacity: 1,
        stickerId: preset.id,
      });
    }
    onSelectLayer(id);
  };

  const handleAddCustomText = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    const id = `text-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    onAddLayer({
      id,
      type: 'text',
      label: trimmed,
      text: trimmed,
      fontFamily: customFont,
      color: customColor,
      bgColor: customBgPill ? 'rgba(255, 255, 255, 0.9)' : undefined,
      x: 0.5,
      y: 0.2,
      scale: 1,
      rotation: 0,
      opacity: 1,
    });
    onSelectLayer(id);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 10 Category Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {STICKER_CATEGORIES.map((cat) => {
          const active = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-[#db2777] text-white shadow-sm'
                  : 'bg-[#fdf2f8] text-[#6e4f62] hover:text-[#2d1b28] hover:bg-[#fce7f3]'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Custom Text Input when Text category is active */}
      {activeCategory === 'Text' && (
        <div className="p-3 rounded-2xl bg-[#fdf2f8] border border-[#f3d5e5] flex flex-col gap-2.5">
          <label htmlFor="custom-sticker-text" className="text-xs font-semibold text-[#2d1b28]">
            Add Custom Caption
          </label>
          <div className="flex gap-2">
            <input
              id="custom-sticker-text"
              type="text"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Write cute caption..."
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-white border border-[#f3d5e5] text-sm text-[#2d1b28] focus:outline-none focus:border-[#db2777]"
            />
            <button
              type="button"
              onClick={handleAddCustomText}
              className="px-3 py-2 rounded-xl bg-[#db2777] hover:bg-[#be185d] text-white text-xs font-semibold inline-flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Add
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Caption font"
              value={customFont}
              onChange={(e) => setCustomFont(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-white border border-[#f3d5e5] text-xs text-[#2d1b28]"
            >
              {TEXT_FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              {TEXT_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Select text color ${swatch}`}
                  onClick={() => setCustomColor(swatch)}
                  className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                    customColor === swatch ? 'border-[#2d1b28] scale-110' : 'border-white'
                  }`}
                  style={{ backgroundColor: swatch }}
                />
              ))}
            </div>
            <label className="inline-flex items-center gap-1.5 text-xs text-[#6e4f62] cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={customBgPill}
                onChange={(e) => setCustomBgPill(e.target.checked)}
                className="accent-[#db2777]"
              />
              Backdrop
            </label>
          </div>
        </div>
      )}

      {/* Sticker Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2">
        {itemsInCategory.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleAddPreset(item)}
            className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-[#f3d5e5] hover:border-[#db2777] hover:bg-[#fdf2f8] transition-colors text-left cursor-pointer min-h-[44px]"
          >
            <span
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0 bg-[#fdf2f8]"
              style={{ color: item.color }}
              aria-hidden="true"
            >
              {item.kind === 'frame'
                ? '▢'
                : item.symbol === 'bow-vector'
                ? '🎀'
                : item.kind === 'text-preset'
                ? 'Aa'
                : item.symbol}
            </span>
            <span className="text-xs font-medium text-[#2d1b28] truncate">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Active Layer List */}
      {layers.length > 0 && (
        <div className="pt-2 border-t border-[#f3d5e5] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#2d1b28]">
              Active Decorations ({layers.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {layers.map((layer) => {
              const selected = layer.id === selectedLayerId;
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => onSelectLayer(layer.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 border transition-colors cursor-pointer ${
                    selected
                      ? 'bg-[#fce7f3] border-[#db2777] text-[#be185d]'
                      : 'bg-white border-[#f3d5e5] text-[#6e4f62] hover:text-[#2d1b28]'
                  }`}
                >
                  {layer.type === 'text' && <Type className="w-3 h-3" aria-hidden="true" />}
                  <span className="max-w-[110px] truncate">{layer.text || layer.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Layer Inspector */}
      {selectedLayer && (
        <div className="p-3 rounded-2xl bg-[#fdf2f8] border border-[#f3d5e5] flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#2d1b28] truncate">
              Edit: {selectedLayer.text || selectedLayer.label}
            </span>
            <button
              type="button"
              onClick={() => onDeleteLayer(selectedLayer.id)}
              aria-label={`Delete ${selectedLayer.label}`}
              className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              Remove
            </button>
          </div>

          {selectedLayer.type === 'text' && (
            <div className="flex flex-col gap-2">
              <input
                type="text"
                aria-label="Edit selected text"
                value={selectedLayer.text || ''}
                onChange={(e) =>
                  onUpdateLayer(selectedLayer.id, {
                    text: e.target.value,
                    label: e.target.value || 'Text',
                  })
                }
                className="w-full px-3 py-1.5 rounded-lg bg-white border border-[#f3d5e5] text-xs text-[#2d1b28]"
              />
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  aria-label="Edit selected font"
                  value={selectedLayer.fontFamily || 'Plus Jakarta Sans'}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { fontFamily: e.target.value })}
                  className="px-2 py-1 rounded-lg bg-white border border-[#f3d5e5] text-xs text-[#2d1b28]"
                >
                  {TEXT_FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <input
                  type="color"
                  aria-label="Edit text color"
                  value={selectedLayer.color}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { color: e.target.value })}
                  className="w-7 h-7 rounded cursor-pointer border border-[#f3d5e5]"
                />
              </div>
            </div>
          )}

          {selectedLayer.type !== 'frame' && (
            <>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-[#6e4f62]">
                  <span>Size</span>
                  <span className="font-mono tabular-nums">{Math.round(selectedLayer.scale * 100)}%</span>
                </div>
                <input
                  type="range"
                  aria-label="Sticker size"
                  min={0.4}
                  max={2.6}
                  step={0.05}
                  value={selectedLayer.scale}
                  onChange={(e) => onUpdateLayer(selectedLayer.id, { scale: Number(e.target.value) })}
                  className="studio-slider w-full"
                />
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-xs text-[#6e4f62]">
                  <span>Rotation</span>
                  <span className="font-mono tabular-nums">{selectedLayer.rotation}°</span>
                </div>
                <input
                  type="range"
                  aria-label="Sticker rotation"
                  min={-180}
                  max={180}
                  step={5}
                  value={selectedLayer.rotation}
                  onChange={(e) =>
                    onUpdateLayer(selectedLayer.id, { rotation: Number(e.target.value) })
                  }
                  className="studio-slider w-full"
                />
              </div>

              {/* Position nudge buttons + tip */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] text-[#6e4f62]">Position (or drag on photo)</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Move layer left"
                    onClick={() =>
                      onUpdateLayer(selectedLayer.id, { x: Math.max(0.05, selectedLayer.x - 0.04) })
                    }
                    className="p-1.5 rounded-lg bg-white border border-[#f3d5e5] hover:bg-[#fce7f3] text-[#2d1b28] cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move layer up"
                    onClick={() =>
                      onUpdateLayer(selectedLayer.id, { y: Math.max(0.05, selectedLayer.y - 0.04) })
                    }
                    className="p-1.5 rounded-lg bg-white border border-[#f3d5e5] hover:bg-[#fce7f3] text-[#2d1b28] cursor-pointer"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move layer down"
                    onClick={() =>
                      onUpdateLayer(selectedLayer.id, { y: Math.min(0.95, selectedLayer.y + 0.04) })
                    }
                    className="p-1.5 rounded-lg bg-white border border-[#f3d5e5] hover:bg-[#fce7f3] text-[#2d1b28] cursor-pointer"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move layer right"
                    onClick={() =>
                      onUpdateLayer(selectedLayer.id, { x: Math.min(0.95, selectedLayer.x + 0.04) })
                    }
                    className="p-1.5 rounded-lg bg-white border border-[#f3d5e5] hover:bg-[#fce7f3] text-[#2d1b28] cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-[#6e4f62]">
              <span>Opacity</span>
              <span className="font-mono tabular-nums">{Math.round(selectedLayer.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              aria-label="Layer opacity"
              min={0.2}
              max={1}
              step={0.05}
              value={selectedLayer.opacity}
              onChange={(e) => onUpdateLayer(selectedLayer.id, { opacity: Number(e.target.value) })}
              className="studio-slider w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
