import React, { useState } from 'react';
import { 
  Radar, 
  Plus, 
  Trash2,
  Rocket,
  Zap,
  Tag,
  Target,
  Edit,
  Eye,
  X,
  Save,
  FileText,
  Sparkles,
  BookOpen,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Idea, IdeaCategory } from '../../types';

interface IdeasRadarProps {
  ideas: Idea[];
  onSaveIdea: (idea: Idea) => void;
  onUpdateIdea?: (ideaId: string, updates: Partial<Idea>) => void;
  onDeleteIdea: (ideaId: string) => void;
  onConvertToProject: (idea: Idea) => void;
}

const INFO_TEMPLATES = [
  {
    label: '📋 Siguientes Pasos',
    content: '\n\n### 📋 Siguientes Pasos:\n- [ ] Definir el alcance principal\n- [ ] Diseñar el MVP básico\n- [ ] Identificar recursos clave',
    tooltip: 'Agregar lista estructurada de siguientes pasos'
  },
  {
    label: '🛠️ Recursos Requeridos',
    content: '\n\n### 🛠️ Recursos y Herramientas:\n- Herramientas:\n- Tiempo estimado:\n- Colaboradores:',
    tooltip: 'Agregar sección de recursos necesarios'
  },
  {
    label: '💡 Inspiración / Referencias',
    content: '\n\n### 💡 Inspiración y Referencias:\n- Enlaces clave:\n- Ejemplos similares:\n- Ideas clave:',
    tooltip: 'Agregar sección de inspiración'
  }
];

export const IdeasRadar: React.FC<IdeasRadarProps> = ({
  ideas,
  onSaveIdea,
  onUpdateIdea,
  onDeleteIdea,
  onConvertToProject
}) => {
  // New Idea Form State
  const [formTitle, setFormTitle] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formCategory, setFormCategory] = useState<IdeaCategory>('PROYECTO');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View / Edit Modal State
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState<IdeaCategory>('PROYECTO');
  const [editNotes, setEditNotes] = useState('');

  const handleRegisterIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    const newTitle = formTitle.trim();
    if (!newTitle || isSubmitting) return;

    try {
      setIsSubmitting(true);
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

  const handleOpenDetail = (idea: Idea) => {
    setSelectedIdea(idea);
    setEditTitle(idea.title || '');
    setEditCategory(idea.category || 'PROYECTO');
    setEditNotes(idea.notes || '');
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedIdea || !editTitle.trim()) return;

    try {
      if (onUpdateIdea) {
        await onUpdateIdea(selectedIdea.id, {
          title: editTitle.trim(),
          category: editCategory,
          notes: editNotes.trim() || undefined
        });
      }
      
      // Update local state in modal preview
      setSelectedIdea(prev => prev ? {
        ...prev,
        title: editTitle.trim(),
        category: editCategory,
        notes: editNotes.trim() || undefined
      } : null);
      
      setIsEditing(false);
    } catch (err) {
      console.error("Error al actualizar idea:", err);
    }
  };

  const handleAppendTemplateInModal = (content: string) => {
    setEditNotes(prev => prev ? prev + content : content.trim());
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return new Date().toLocaleDateString();
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().toLocaleDateString() : d.toLocaleDateString();
  };

  const getCategoryColor = (category: IdeaCategory) => {
    switch (category) {
      case 'PROYECTO': return 'text-[#00F0FF] border-[#00F0FF]/40 bg-[#00F0FF]/10';
      case 'MEJORA': return 'text-[#00FFCC] border-[#00FFCC]/40 bg-[#00FFCC]/10';
      case 'ESTRATEGIA': return 'text-[#F59E0B] border-[#F59E0B]/40 bg-[#F59E0B]/10';
      case 'PERSONAL': return 'text-violet-400 border-violet-400/40 bg-violet-400/10';
      default: return 'text-slate-400 border-slate-400/40 bg-slate-400/10';
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
            Capturar Nueva Señal de Inteligencia
          </h2>
        </div>

        <form onSubmit={handleRegisterIdea} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Identificador de la Idea (Título)</label>
              <input
                type="text"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/50 transition-colors"
                placeholder="Ej. Crear sistema descentralizado de tareas..."
                required
              />
            </div>
            
            <div className="w-full md:w-64 space-y-2">
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Categoría Táctica</label>
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
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Notas / Especificaciones Iniciales</label>
              <div className="flex gap-2">
                <span className="text-[10px] font-mono text-slate-500">Plantillas rápidas:</span>
                <button
                  type="button"
                  onClick={() => setFormNotes(prev => prev + '\n\n### 📋 Siguientes Pasos:\n- [ ] ')}
                  className="text-[10px] font-mono text-[#F59E0B] hover:underline"
                >
                  + Pasos
                </button>
                <button
                  type="button"
                  onClick={() => setFormNotes(prev => prev + '\n\n### 🛠️ Recursos:\n- ')}
                  className="text-[10px] font-mono text-[#F59E0B] hover:underline"
                >
                  + Recursos
                </button>
              </div>
            </div>
            <textarea
              value={formNotes}
              onChange={e => setFormNotes(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 font-mono text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/50 transition-colors h-24 resize-none"
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
              onClick={() => handleOpenDetail(idea)}
              className="bg-[#0A0D14]/60 border border-slate-800 rounded-xl p-5 flex flex-col group hover:border-slate-600 transition-all hover:scale-[1.01] cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_20px_rgba(245,158,11,0.05)] relative"
            >
              <div className="flex justify-between items-start mb-3 gap-2">
                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 ${getCategoryColor(idea.category)}`}>
                  {idea.category}
                </span>
                
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleOpenDetail(idea)}
                    className="p-1.5 rounded-md text-slate-500 hover:text-[#00F0FF] hover:bg-[#00F0FF]/10 transition-colors"
                    title="Ver o Editar Idea"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteIdea(idea.id)}
                    className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Eliminar Idea"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="text-slate-200 font-bold leading-tight group-hover:text-[#F59E0B] transition-colors mb-2 text-base line-clamp-2">
                {idea.title || "Nueva Idea"}
              </h3>

              <p className="text-slate-400 text-xs line-clamp-3 font-mono mb-4 flex-1 whitespace-pre-wrap">
                {idea.notes || "Sin especificaciones de notas adicionales. Haz clic en Ver para agregar información detallada."}
              </p>

              <div className="pt-4 border-t border-slate-800/50 flex flex-col gap-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" /> {formatDate(idea.createdAt)}
                  </span>
                  <span className="text-[#00F0FF]/80 group-hover:underline flex items-center gap-1">
                    Ver / Editar <Eye className="w-3 h-3" />
                  </span>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onConvertToProject(idea);
                  }}
                  className="w-full py-2 rounded-lg bg-slate-800/30 hover:bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/10 hover:border-[#00F0FF]/40 text-xs font-mono font-bold transition-all flex items-center justify-center gap-2"
                >
                  <Rocket className="w-4 h-4 animate-pulse" />
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

      {/* MODAL PARA VER / EDITAR / AGREGAR INFORMACIÓN */}
      <AnimatePresence>
        {selectedIdea && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedIdea(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0B0F19] border border-slate-800 rounded-xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[85vh]"
            >
              {/* Accent top border */}
              <div className="h-1 w-full bg-[#F59E0B]" />

              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <Radar className="w-5 h-5 text-[#F59E0B]" />
                  <span className="font-mono text-xs text-slate-400 uppercase tracking-widest">
                    DETALLES DE LA IDEA // {selectedIdea.category}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedIdea(null)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800/50 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {!isEditing ? (
                  // VIEWING MODE
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getCategoryColor(selectedIdea.category)}`}>
                          {selectedIdea.category}
                        </span>
                        <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> Registrada el {formatDate(selectedIdea.createdAt)}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-slate-100 font-mono tracking-tight">
                        {selectedIdea.title}
                      </h2>
                    </div>

                    <div className="bg-slate-900/60 rounded-lg p-5 border border-slate-800/80 min-h-32">
                      <div className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-2 text-slate-400 text-xs font-mono">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span>INFORMACIÓN Y ESPECIFICACIONES:</span>
                      </div>
                      
                      {selectedIdea.notes ? (
                        <p className="text-slate-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                          {selectedIdea.notes}
                        </p>
                      ) : (
                        <div className="text-center py-6">
                          <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                          <p className="text-slate-500 text-xs font-mono">
                            No hay notas ni especificaciones detalladas en esta idea.
                          </p>
                          <button
                            onClick={() => setIsEditing(true)}
                            className="mt-3 text-xs font-mono text-[#F59E0B] hover:underline"
                          >
                            + Agregar especificaciones
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // EDITING MODE
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Identificador de la Idea (Título)</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-[#F59E0B] focus:ring-1 focus:ring-[#F59E0B]/30 transition-colors"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Categoría Táctica</label>
                        <select
                          value={editCategory}
                          onChange={e => setEditCategory(e.target.value as IdeaCategory)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-[#F59E0B] transition-colors"
                        >
                          <option value="PROYECTO">[ PROYECTO ]</option>
                          <option value="MEJORA">[ MEJORA ]</option>
                          <option value="ESTRATEGIA">[ ESTRATEGIA ]</option>
                          <option value="PERSONAL">[ PERSONAL ]</option>
                        </select>
                      </div>
                      
                      <div className="flex flex-col justify-end">
                        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-2.5 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#F59E0B]" />
                          <div className="text-[10px] font-mono text-slate-400">
                            Puedes usar los botones de abajo para estructurar tu idea.
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Rich Template Helpers */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Agregar Información Estructurada</label>
                        <span className="text-[10px] text-slate-600 font-mono">Haz clic para insertar</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        {INFO_TEMPLATES.map((tmpl, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAppendTemplateInModal(tmpl.content)}
                            className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-xs font-mono text-slate-300 flex items-center gap-1 transition-colors"
                            title={tmpl.tooltip}
                          >
                            <Plus className="w-3 h-3 text-[#F59E0B]" />
                            {tmpl.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Notas y Especificaciones de la Idea</label>
                      <textarea
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 font-mono text-sm focus:outline-none focus:border-[#F59E0B] transition-colors h-48 resize-none"
                        placeholder="Escribe detalles, requerimientos, o usa las plantillas rápidas de arriba..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  {!isEditing && (
                    <button
                      onClick={() => {
                        onConvertToProject(selectedIdea);
                        setSelectedIdea(null);
                      }}
                      className="w-full sm:w-auto px-4 py-2 rounded-lg bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/30 text-xs font-mono font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <Rocket className="w-4 h-4 animate-pulse" />
                      CONVERTIR EN PROYECTO
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 justify-end">
                  {!isEditing ? (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 rounded-lg bg-slate-850 hover:bg-slate-800 border border-slate-700 text-xs font-mono font-bold text-slate-200 transition-all flex items-center gap-1.5"
                      >
                        <Edit className="w-3.5 h-3.5" /> EDITAR IDEA
                      </button>
                      <button
                        onClick={() => setSelectedIdea(null)}
                        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono font-bold text-slate-300 transition-all"
                      >
                        CERRAR
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-850 border border-slate-700 text-xs font-mono text-slate-400 transition-all"
                      >
                        CANCELAR
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={!editTitle.trim()}
                        className="px-5 py-2 rounded-lg bg-[#F59E0B]/20 hover:bg-[#F59E0B]/30 text-[#F59E0B] border border-[#F59E0B]/40 text-xs font-mono font-bold transition-all flex items-center gap-1.5 disabled:opacity-40"
                      >
                        <Save className="w-3.5 h-3.5" /> GUARDAR CAMBIOS
                      </button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
