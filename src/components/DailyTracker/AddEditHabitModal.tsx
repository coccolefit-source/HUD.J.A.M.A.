import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Check, Target, Trash2 } from 'lucide-react';
import { Habit, CategoryType } from '../../types';
import { IconRenderer, AVAILABLE_ICONS } from '../IconRenderer';
import { supabase } from '../../lib/supabase';

interface AddEditHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (habitData: Partial<Habit>) => void;
  editingHabit?: Habit | null;
  onDelete?: (habitId: string) => void;
}

const CATEGORIES: CategoryType[] = ['Salud', 'Productividad', 'Mente', 'Finanzas', 'Relaciones', 'Personal'];

const COLORS = [
  { id: 'cyan', label: 'Cian Neón', bg: 'bg-[#00F0FF]', border: 'border-[#00F0FF]' },
  { id: 'indigo', label: 'Índigo', bg: 'bg-indigo-500', border: 'border-indigo-500' },
  { id: 'violet', label: 'Violeta', bg: 'bg-violet-500', border: 'border-violet-500' },
  { id: 'amber', label: 'Ámbar', bg: 'bg-amber-500', border: 'border-amber-500' },
  { id: 'cobalt', label: 'Cobalto', bg: 'bg-blue-600', border: 'border-blue-600' },
  { id: 'rose', label: 'Rosa', bg: 'bg-rose-500', border: 'border-rose-500' }
];

const WEEKDAYS = [
  { key: 'mon', label: 'L' },
  { key: 'tue', label: 'M' },
  { key: 'wed', label: 'X' },
  { key: 'thu', label: 'J' },
  { key: 'fri', label: 'V' },
  { key: 'sat', label: 'S' },
  { key: 'sun', label: 'D' }
];

export const AddEditHabitModal: React.FC<AddEditHabitModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingHabit,
  onDelete
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<CategoryType>('Productividad');
  const [color, setColor] = useState('cyan');
  const [icon, setIcon] = useState('Zap');
  const [targetDays, setTargetDays] = useState(7);
  const [daysOfWeek, setDaysOfWeek] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (editingHabit) {
      setTitle(editingHabit.title);
      setDescription(editingHabit.description || '');
      setCategory(editingHabit.category);
      setColor(editingHabit.color || 'cyan');
      setIcon(editingHabit.icon || 'Zap');
      setTargetDays(editingHabit.targetDaysPerWeek || 7);
      setDaysOfWeek(editingHabit.daysOfWeek || []);
    } else {
      setTitle('');
      setDescription('');
      setCategory('Productividad');
      setColor('cyan');
      setIcon('Zap');
      setTargetDays(7);
      setDaysOfWeek([]);
    }
  }, [editingHabit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const habitTitle = title.trim();
    if (!habitTitle || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSave({
        id: editingHabit?.id,
        title: habitTitle,
        description: description.trim(),
        category,
        color,
        icon,
        targetDaysPerWeek: targetDays,
        frequency: targetDays,
        daysOfWeek
      } as any);

      onClose();
    } catch (err) {
      console.error("Error al guardar hábito:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-[#101827] border border-[#06B6D4]/40 rounded-2xl p-6 shadow-[0_0_25px_rgba(6,182,212,0.15)] my-8 font-mono"
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#06B6D4]/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#06B6D4]/15 text-[#06B6D4] border border-[#06B6D4]/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
              <IconRenderer name={icon} className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 tracking-wide">
                {editingHabit ? 'EDITAR PARÁMETRO DE HÁBITO' : 'CONFIGURAR NUEVO HÁBITO HUD'}
              </h2>
              <p className="text-xs text-slate-400">Acción programada en la matriz de comportamiento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#0A0D14] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#06B6D4] mb-1.5">
              Identificador del Hábito <span className="text-[#00F0FF]">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Lectura Enfocada 20 min"
              className="w-full px-4 py-2.5 bg-[#0A0D14] border border-[#06B6D4]/30 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-[#06B6D4] transition-colors placeholder:text-slate-600 font-mono"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#06B6D4] mb-1.5">
              Propósito / Detalle Operativo
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Leer al levantarse antes de revisar el móvil"
              className="w-full px-4 py-2.5 bg-[#0A0D14] border border-[#06B6D4]/30 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-[#06B6D4] transition-colors placeholder:text-slate-600 font-mono"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#06B6D4] mb-1.5">
              Categoría
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-2 rounded-xl text-xs font-mono font-medium border transition-all ${
                    category === cat
                      ? 'bg-[#06B6D4]/20 text-[#06B6D4] border-[#06B6D4] shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                      : 'bg-[#0A0D14] text-slate-400 border-[#06B6D4]/20 hover:border-[#06B6D4]/40'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#06B6D4] mb-1.5">
              Icono del Hábito
            </label>
            <div className="grid grid-cols-10 gap-1.5 bg-[#0A0D14] p-2.5 rounded-xl border border-[#06B6D4]/25 max-h-32 overflow-y-auto">
              {AVAILABLE_ICONS.map((iName) => (
                <button
                  type="button"
                  key={iName}
                  onClick={() => setIcon(iName)}
                  className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                    icon === iName
                      ? 'bg-[#06B6D4] text-[#0A0D14] shadow-[0_0_10px_rgba(6,182,212,0.5)] font-bold'
                      : 'text-slate-400 hover:bg-[#101827] hover:text-slate-200'
                  }`}
                >
                  <IconRenderer name={iName} className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#06B6D4] mb-1.5">
              Acento de Color
            </label>
            <div className="flex items-center gap-3">
              {COLORS.map((c) => (
                <button
                  type="button"
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  className={`w-8 h-8 rounded-full ${c.bg} flex items-center justify-center transition-transform ${
                    color === c.id ? 'ring-2 ring-offset-2 ring-offset-[#101827] ring-[#06B6D4] scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {color === c.id && <Check className="w-4 h-4 text-slate-950 stroke-[3]" />}
                </button>
              ))}
            </div>
          </div>

          {/* Days of Week Selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#06B6D4] mb-1.5">
              Días de la Semana (Opcional)
            </label>
            <div className="flex items-center gap-2">
              {WEEKDAYS.map((day) => {
                const isSelected = daysOfWeek.includes(day.key);
                return (
                  <button
                    type="button"
                    key={day.key}
                    onClick={() => {
                      setDaysOfWeek(prev =>
                        prev.includes(day.key)
                          ? prev.filter(d => d !== day.key)
                          : [...prev, day.key]
                      );
                    }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#06B6D4] text-[#0A0D14] shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                        : 'bg-[#101827] text-slate-400 border border-[#06B6D4]/30 hover:bg-[#06B6D4]/20 hover:text-[#06B6D4]'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 mt-1.5">Si no seleccionas ninguno, se mostrará todos los días.</p>
          </div>

          {/* Target Frequency */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-[#06B6D4]">
                Meta de Frecuencia
              </label>
              <span className="text-xs font-bold text-[#00F0FF] flex items-center gap-1 font-mono">
                <Target className="w-3.5 h-3.5 text-[#00F0FF]" /> {targetDays} días / semana
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={7}
              value={targetDays}
              onChange={(e) => setTargetDays(Number(e.target.value))}
              className="w-full accent-[#00F0FF] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
              <span>1 día</span>
              <span>3-4 días</span>
              <span>7 días (Consistencia Max)</span>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#06B6D4]/20">
            <div>
              {editingHabit && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete(editingHabit.id);
                    onClose();
                  }}
                  className="px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-[#0A0D14] text-slate-300 text-xs font-bold hover:bg-[#101827] border border-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="px-5 py-2.5 rounded-xl bg-[#1C1F26] hover:bg-[#101827] text-[#00F0FF] border border-[#00F0FF]/40 font-mono font-bold text-xs transition-all hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] hover:border-[#00F0FF] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? 'Guardando...' : (editingHabit ? 'Guardar Cambios' : '+ Crear Hábito')}
              </button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
