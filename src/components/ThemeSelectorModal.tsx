import React from 'react';
import { motion } from 'motion/react';
import { X, Check, Palette, Sparkles } from 'lucide-react';
import { THEMES, ThemeId, ThemeConfig } from '../theme';

interface ThemeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId: ThemeId;
  onSelectTheme: (themeId: ThemeId) => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme
}) => {
  if (!isOpen) return null;

  const activeTheme = THEMES.find(t => t.id === currentThemeId) || THEMES[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl bg-slate-900/95 border border-slate-800 rounded-2xl p-6 shadow-2xl my-4 relative max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between pb-4 mb-3 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="p-2.5 rounded-xl border transition-colors"
              style={{
                backgroundColor: `${activeTheme.accentHex}20`,
                borderColor: `${activeTheme.accentHex}40`,
                color: activeTheme.accentHex
              }}
            >
              <Palette className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 font-sans">Seleccionar Estilo y Tema Visual</h2>
              <p className="text-xs text-slate-400 font-mono">Personaliza la atmósfera táctica de tu HUD ({THEMES.length} temas disponibles)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-2 overflow-y-auto pr-1 flex-1 min-h-0">
          {THEMES.map((theme: ThemeConfig) => {
            const isSelected = theme.id === currentThemeId;

            return (
              <div
                key={theme.id}
                onClick={() => {
                  onSelectTheme(theme.id);
                }}
                className={`group relative p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-slate-950 shadow-xl ring-1'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                }`}
                style={isSelected ? {
                  borderColor: theme.accentHex,
                  boxShadow: `0 0 20px ${theme.accentHex}30`,
                  outline: `1px solid ${theme.accentHex}`
                } : {}}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-slate-100">{theme.name}</span>
                    {isSelected && (
                      <span 
                        className="p-1 rounded-full text-slate-950 font-bold"
                        style={{ backgroundColor: theme.accentHex }}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">{theme.description}</p>
                </div>

                {/* Color swatches preview */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <div className="flex items-center gap-2">
                    {theme.previewColors.map((hex, idx) => (
                      <span
                        key={idx}
                        className="w-5 h-5 rounded-full border border-slate-700 shadow-sm"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>

                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-xl transition-colors ${
                      isSelected
                        ? 'text-slate-950'
                        : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700'
                    }`}
                    style={isSelected ? { backgroundColor: theme.accentHex } : {}}
                  >
                    {isSelected ? 'Seleccionado' : 'Aplicar'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-mono">
            <Sparkles 
              className="w-4 h-4 transition-colors" 
              style={{ color: activeTheme.accentHex }}
            />
            El estilo se guarda y persiste automáticamente en tu sesión.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-slate-950 font-bold text-xs transition-colors cursor-pointer"
            style={{ backgroundColor: activeTheme.accentHex }}
          >
            Listo
          </button>
        </div>
      </motion.div>
    </div>
  );
};
