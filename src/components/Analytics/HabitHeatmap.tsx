import React from 'react';
import { Habit, DailyLog } from '../../types';
import { getPastNDays, parseISODate } from '../../utils/dateUtils';

interface HabitHeatmapProps {
  habits: Habit[];
  logs: Record<string, DailyLog>;
  daysCount?: number;
}

export const HabitHeatmap: React.FC<HabitHeatmapProps> = ({ habits, logs, daysCount = 28 }) => {
  const days = getPastNDays(daysCount);

  return (
    <div className="bg-[#101827]/80 p-5 rounded-2xl border border-[#06B6D4]/25 shadow-xl backdrop-blur-md space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider text-[#06B6D4]">Matriz de Consistencia HUD (Últimos {daysCount} Días)</h3>
          <p className="text-xs text-slate-400">Visualiza la frecuencia diaria y el mapa térmico por cada hábito</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
          <span>Incompleto</span>
          <div className="w-3 h-3 rounded bg-[#0A0D14] border border-[#06B6D4]/30" />
          <div className="w-3 h-3 rounded bg-[#00F0FF]/40 border border-[#00F0FF]/50" />
          <div className="w-3 h-3 rounded bg-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
          <span className="text-[#00F0FF] font-bold">CHECK</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px] space-y-2">
          {/* Day Headers */}
          <div className="grid grid-cols-[160px_1fr] items-center gap-2 text-[10px] text-[#06B6D4] font-mono font-semibold border-b border-[#06B6D4]/20 pb-2">
            <span>PROGRESO / HÁBITO</span>
            <div className="grid grid-cols-28 gap-1 text-center">
              {days.map((dStr) => {
                const dayNum = parseISODate(dStr).getDate();
                return <span key={dStr} title={dStr}>{dayNum}</span>;
              })}
            </div>
          </div>

          {/* Habit rows */}
          {habits.map((habit) => (
            <div key={habit.id} className="grid grid-cols-[160px_1fr] items-center gap-2 py-1">
              <span className="text-xs font-mono font-medium text-slate-200 truncate" title={habit.title}>
                {habit.title}
              </span>
              <div className="grid grid-cols-28 gap-1">
                {days.map((dStr) => {
                  const log = logs[dStr];
                  const isDone = log?.completedHabitIds?.includes(habit.id);
                  return (
                    <div
                      key={dStr}
                      title={`${habit.title} - ${dStr}: ${isDone ? 'Completado' : 'Pendiente'}`}
                      className={`h-6 rounded transition-all ${
                        isDone
                          ? 'bg-[#00F0FF] shadow-[0_0_8px_rgba(0,240,255,0.4)] border border-[#00F0FF]'
                          : 'bg-[#0A0D14] border border-[#06B6D4]/20 hover:border-[#06B6D4]/50'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
