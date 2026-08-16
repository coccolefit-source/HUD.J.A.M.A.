import React, { useState, useMemo } from 'react';
import { 
  Radar, 
  Plus, 
  Trash2,
  Rocket,
  Zap,
  Tag,
  Target
} from 'lucide-react';
import { Idea, IdeaCategory, Project } from '../../types';
import { getTodayISO } from '../../utils/dateUtils';
import { supabase } from '../../lib/supabase';

interface IdeasRadarProps {
  ideas: Idea[];
  onSaveIdea: (idea: Idea) => void;
  onDeleteIdea: (ideaId: string) => void;
  onConvertToProject: (idea: Idea) => void;
}

export const IdeasRadar: React.FC<IdeasRadarProps> = ({
  ideas,
  onSaveIdea,
  onDeleteIdea,
  onConvertToProject
}) => {
  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formCategory, setFormCategory] = useState<IdeaCategory>('PROYECTO');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegisterIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTitle = formTitle.trim();
    if (!newTitle || isSubmitting) return;

    try {
      setIsSubmitting(true);
      console.log("Delegando registro de idea...");

      const newIdea: Idea = {
        id: 'idea-temp-' + Date.now(),
        title: newTitle,
        notes: formNotes.trim() || undefined,
        category: formCategory,
        createdAt: new Date().toISOString()
      };

      await onSaveIdea(newIdea);
      setFormTitle('');
      setFormNotes('');
      setFormCategory('PROYECTO');
    } catch (err) {
      console.error("Error inesperado al guardar idea:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString();
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().toLocaleDateString() : d.toLocaleDateString();
  };

  const getCategoryColor = (category: IdeaCategory) => {
    switch (category) {
      case 'PROYECTO': return 'text-[#00F0FF] border-[#00F0FF] bg-[#00F0FF]/10';
      case 'MEJORA': return 'text-[#00FFCC] border-[#00FFCC] bg-[#00FFCC]/10';
      case 'ESTRATEGIA': return 'text-[#F59E0B] border-[#F59E0B] bg-[#F59E0B]/10';
      case 'PERSONAL': return 'text-violet-400 border-violet-400 bg-violet-400/10';
      default: return 'text-slate-400 border-slate-400 bg-slate-400/10';
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER HUD */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6 relative">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(245,158,11,0.05)_0%,transparent_100%)] pointer-events-none" />
        
        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Radar className="w-8 h-8 text-[#F59E0B]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-100 uppercase tracking-widest flex items-center gap-2">
              RADAR DE IDEAS
            </h1>
            <p className="text-slate-400 text-sm font-mono mt-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse shadow-[0_0_8px_#F59E0B]" />
              SISTEMA DE CAPTURA RÁPIDA DE INTELIGENCIA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm font-mono font-bold z-10 bg-slate-900/50 p-3 rounded-lg border border-slate-800 backdrop-blur-md">
          <div className="flex flex-col items-end">
            <span className="text-slate-500 text-[10px] uppercase">Señales Activas</span>
            <span className="text-[#F59E0B] text-lg">{ (ideas || []).length}</span>
          </div>
        </div>
      </div>

      {/* QUICK CAPTURE FORM */}
      <div className="bg-[#0A0D14]/80 rounded-xl border border-slate-800 p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#F59E0B]" />
        
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-[#F59E0B]" />
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">
            Capturar Nueva Señal
          </h2>
        </div>

        <form onSubmit={handleRegisterIdea} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Identificador de la Idea (Título)</label>
              <input
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/50 transition-colors"
                placeholder="Ej. Crear dashboard de hábitos financieros..."
                required
              />
            </div>
            
            <div className="w-full md:w-64 space-y-2">
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Categoría Táctica</label>
              <select
                value={formCategory}
                onChange={e => setFormCategory(e.target.value as IdeaCategory)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/50 transition-colors"
              >
                <option value="PROYECTO">[ PROYECTO ]</option>
                <option value="MEJORA">[ MEJORA ]</option>
                <option value="ESTRATEGIA">[ ESTRATEGIA ]</option>
                <option value="PERSONAL">[ PERSONAL ]</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Notas / Especificaciones (Opcional)</label>
            <textarea
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/50 transition-colors h-20 resize-none"
              placeholder="Detalles, recursos necesarios, pasos iniciales..."
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !formTitle.trim()}
              className="px-6 py-2.5 rounded-lg bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 text-[#F59E0B] font-mono font-bold text-sm border border-[#F59E0B]/50 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'REGISTRANDO...' : '⚡ REGISTRAR IDEA'}
            </button>
          </div>
        </form>
      </div>

      {/* IDEAS GRID */}
      { (ideas || []).length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          { (ideas || []).map((idea) => (
            <div 
              key={idea.id} 
              className="bg-[#0A0D14]/60 border border-slate-800 rounded-xl p-5 flex flex-col group hover:border-slate-600 transition-colors"
            >
              <div className="flex justify-between items-start mb-3 gap-2">
                <h3 className="text-slate-200 font-bold leading-tight group-hover:text-slate-100 transition-colors">
                  {idea.title || (idea as any).content || "Nueva Idea"}
                </h3>
                <button
                  onClick={() => onDeleteIdea(idea.id)}
                  className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Eliminar Idea"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {idea.notes && (
                <p className="text-slate-400 text-sm mb-4 line-clamp-3 font-mono">
                  {idea.notes}
                </p>
              )}

              <div className="mt-auto pt-4 border-t border-slate-800/50 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getCategoryColor(idea.category)}`}>
                    {idea.category}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {formatDate(idea.createdAt)}
                  </span>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onConvertToProject(idea);
                  }}
                  className="w-full py-2 rounded-lg bg-slate-800/50 hover:bg-[#00F0FF]/15 text-[#00F0FF] border border-transparent hover:border-[#00F0FF]/40 text-xs font-mono font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Rocket className="w-4 h-4" />
                  CONVERTIR EN PROYECTO
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#0A0D14]/40 rounded-xl border border-slate-800/50">
          <Radar className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-slate-400 font-mono mb-2">RADAR DESPEJADO</h3>
          <p className="text-slate-500 text-sm">No hay ideas registradas en este momento.</p>
        </div>
      )}
    </div>
  );
};
