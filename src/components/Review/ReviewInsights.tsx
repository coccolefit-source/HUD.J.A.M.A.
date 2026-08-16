import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Award, 
  Sparkles, 
  Target, 
  Save, 
  Calendar, 
  Filter, 
  CheckCircle2, 
  History, 
  ChevronRight,
  Zap,
  HelpCircle,
  Trophy,
  Bike,
  Footprints,
  Goal,
  Activity,
  Edit2
} from 'lucide-react';
import { Habit, DailyLog, OneOnOneReview } from '../../types';
import { MONTH_NAMES, getWeekNumber, parseISODate } from '../../utils/dateUtils';
import { IconRenderer } from '../IconRenderer';

function getNeuroBenefits(habit?: Habit) {
  if (!habit) {
    return {
      gained: 'Constancia neuro-plástica en desarrollo.',
      motivational: 'Reactivar esta acción detonará un pico de dopamina y motivación.'
    };
  }
  const cat = (habit.category || '').toLowerCase();
  
  if (cat.includes('salud') || cat.includes('físico') || cat.includes('ejercicio') || cat.includes('deporte') || cat.includes('caminata')) {
    return {
      gained: 'Mayor BDNF (factor neurotrófico), reducción de cortisol y mejor tono vascular.',
      motivational: 'Al reanudarlo, elevarás tu ATP celular, regularás ritmos circadianos y eliminarás la niebla mental.'
    };
  }
  if (cat.includes('mente') || cat.includes('espiritual') || cat.includes('meditación') || cat.includes('sueño') || cat.includes('lectura')) {
    return {
      gained: 'Engrosamiento prefrontal, autorregulación emocional y capacidad de atención ejecutiva.',
      motivational: 'Activarás la respuesta parasimpática, disipando la fatiga por estrés y mejorando la calidad del descanso.'
    };
  }
  if (cat.includes('productividad') || cat.includes('trabajo') || cat.includes('estudio') || cat.includes('enfoque')) {
    return {
      gained: 'Consolidación de redes de Deep Work y velocidad de procesamiento de información.',
      motivational: 'Liberarás memoria de trabajo, reduciendo el desgaste ejecutivo y la fricción por procrastinación.'
    };
  }
  if (cat.includes('finanzas') || cat.includes('disciplina') || cat.includes('orden')) {
    return {
      gained: 'Control de impulsos ventrales, menor sesgo del presente y hábito de recompensa diferida.',
      motivational: 'Fortalecerás tu reserva de fuerza de voluntad y experimentarás el dominio y orden de tus recursos.'
    };
  }
  return {
    gained: `Mantenimiento activo de la red neuronal de "${habit.title}", consolidando la ejecución automática.`,
    motivational: `Superar la resistencia inicial en "${habit.title}" catalizará una racha de dopamina y autoconfianza.`
  };
}

interface ReviewInsightsProps {
  habits: Habit[];
  logs: Record<string, DailyLog>;
  reviews: OneOnOneReview[];
  onSaveReview: (review: OneOnOneReview) => void;
}

export const ReviewInsights: React.FC<ReviewInsightsProps> = ({
  habits,
  logs,
  reviews,
  onSaveReview
}) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentWeek = getWeekNumber(currentDate);

  // Filters state
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedWeek, setSelectedWeek] = useState<number>(currentWeek);

  // Reflection form fields
  const [workedWell, setWorkedWell] = useState('');
  const [obstacles, setObstacles] = useState('');
  const [commitments, setCommitments] = useState('');
  
  // Widget Overrides / Manual Selections
  const [focusHabitId, setFocusHabitId] = useState<string>('');
  
  // UI Toast notification
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const activeHabits = useMemo(() => (habits || []).filter(h => !h.archived), [habits]);

  // Compute stats for selected filter frame (Month + Week)
  const periodData = useMemo(() => {
    const habitStats: Record<string, { habit: Habit; totalCount: number; completedCount: number; rate: number }> = {};

    activeHabits.forEach(h => {
      habitStats[h.id] = { habit: h, totalCount: 0, completedCount: 0, rate: 0 };
    });

    Object.keys(logs || {}).forEach(dateStr => {
      const date = parseISODate(dateStr);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const week = getWeekNumber(date);

      const matchesYear = year === selectedYear;
      const matchesMonth = month === selectedMonth;
      const matchesWeek = selectedWeek === 0 || week === selectedWeek; // 0 = All weeks in month

      if (matchesYear && matchesMonth && matchesWeek) {
        const completedIds = logs[dateStr]?.completedHabitIds || [];
        activeHabits.forEach(h => {
          if (habitStats[h.id]) {
            habitStats[h.id].totalCount += 1;
            if (completedIds.includes(h.id)) {
              habitStats[h.id].completedCount += 1;
            }
          }
        });
      }
    });

    const statsList = Object.values(habitStats).map(s => ({
      ...s,
      rate: s.totalCount > 0 ? Math.min(100, Math.round((s.completedCount / s.totalCount) * 100)) : 0
    }));

    // Sort to find Best Habit
    const sortedBest = [...statsList].sort((a, b) => b.rate - a.rate);
    const bestHabit = sortedBest[0]?.habit || activeHabits[0];

    // Find Revelation Habit (Highest target multiplier)
    const sortedRevelation = [...statsList].sort((a, b) => (b.completedCount * b.habit.targetDaysPerWeek) - (a.completedCount * a.habit.targetDaysPerWeek));
    const revelationHabit = sortedRevelation.find(s => s.habit.id !== bestHabit?.id)?.habit || sortedRevelation[0]?.habit || activeHabits[1];

    // Find Lowest Movement / Focus Habit (Lowest compliance rate)
    const sortedLowest = [...statsList].sort((a, b) => a.rate - b.rate);
    const lowestHabit = sortedLowest[0]?.habit || activeHabits[activeHabits.length - 1];

    return {
      statsList,
      bestHabit,
      revelationHabit,
      lowestHabit
    };
  }, [selectedYear, selectedMonth, selectedWeek, logs, activeHabits]);

  // Auto-aggregate daily wins recorded in Tracker Diario for this selected period
  const periodWins = useMemo(() => {
    const wins: { date: string; win: string }[] = [];

    Object.keys(logs || {}).forEach(dateStr => {
      const date = parseISODate(dateStr);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const week = getWeekNumber(date);

      const matchesYear = year === selectedYear;
      const matchesMonth = month === selectedMonth;
      const matchesWeek = selectedWeek === 0 || week === selectedWeek;

      if (matchesYear && matchesMonth && matchesWeek) {
        const log = logs[dateStr];
        if (log?.dailyWins && Array.isArray(log.dailyWins)) {
          log.dailyWins.forEach(w => {
            if (w && w.trim()) {
              wins.push({ date: dateStr, win: w.trim() });
            }
          });
        }
      }
    });

    return wins.sort((a, b) => a.date.localeCompare(b.date));
  }, [logs, selectedYear, selectedMonth, selectedWeek]);

  // Auto-aggregate sports entries recorded in Tracker Diario for this selected period
  const periodSportsData = useMemo(() => {
    const entries: { date: string; sportType: string; km: number; notes?: string }[] = [];
    const totalsBySport: Record<string, { km: number; count: number }> = {};
    let totalKmOverall = 0;

    Object.keys(logs || {}).forEach(dateStr => {
      const date = parseISODate(dateStr);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const week = getWeekNumber(date);

      const matchesYear = year === selectedYear;
      const matchesMonth = month === selectedMonth;
      const matchesWeek = selectedWeek === 0 || week === selectedWeek;

      if (matchesYear && matchesMonth && matchesWeek) {
        const log = logs[dateStr];
        if (log?.sportsEntries && Array.isArray(log.sportsEntries)) {
          log.sportsEntries.forEach(se => {
            if (se && se.km > 0) {
              entries.push({
                date: dateStr,
                sportType: se.sportType,
                km: se.km,
                notes: se.notes
              });

              totalKmOverall += se.km;
              if (!totalsBySport[se.sportType]) {
                totalsBySport[se.sportType] = { km: 0, count: 0 };
              }
              totalsBySport[se.sportType].km += se.km;
              totalsBySport[se.sportType].count += 1;
            }
          });
        }
      }
    });

    entries.sort((a, b) => a.date.localeCompare(b.date));

    return {
      entries,
      totalsBySport,
      totalKmOverall: Math.round(totalKmOverall * 10) / 10
    };
  }, [logs, selectedYear, selectedMonth, selectedWeek]);

  // Load existing review if already saved for this period
  useEffect(() => {
    const existing = reviews.find(
      r => r.year === selectedYear && r.month === selectedMonth && r.weekNumber === selectedWeek
    );

    if (existing) {
      setWorkedWell(existing.notesWorkedWell || '');
      setObstacles(existing.notesObstacles || '');
      setCommitments(existing.notesCommitments || '');
      if (existing.focusHabitId) setFocusHabitId(existing.focusHabitId);
    } else {
      setWorkedWell('');
      setObstacles('');
      setCommitments('');
      if (activeHabits.length > 0) {
        // default focus habit to revelation habit or first active habit
        setFocusHabitId(periodData.revelationHabit?.id || activeHabits[0]?.id);
      }
    }
  }, [selectedYear, selectedMonth, selectedWeek, reviews]);

  const handleLoadReviewForEdit = (rev: OneOnOneReview) => {
    setSelectedYear(rev.year);
    setSelectedMonth(rev.month);
    setSelectedWeek(rev.weekNumber);
    setWorkedWell(rev.notesWorkedWell || '');
    setObstacles(rev.notesObstacles || '');
    setCommitments(rev.notesCommitments || '');
    if (rev.focusHabitId) setFocusHabitId(rev.focusHabitId);
    setShowHistoryModal(false);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const review: OneOnOneReview = {
      id: `rev-${selectedYear}-${selectedMonth}-${selectedWeek}`,
      year: selectedYear,
      month: selectedMonth,
      weekNumber: selectedWeek,
      createdAt: new Date().toISOString(),
      bestHabitId: periodData.bestHabit?.id,
      revelationHabitId: periodData.revelationHabit?.id,
      focusHabitId: focusHabitId || periodData.revelationHabit?.id,
      notesWorkedWell: workedWell,
      notesObstacles: obstacles,
      notesCommitments: commitments
    };

    onSaveReview(review);
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#101827]/80 p-6 rounded-2xl border border-[#06B6D4]/30 shadow-[0_0_20px_rgba(6,182,212,0.08)] backdrop-blur-md relative overflow-hidden">
        {/* Tactical Corner Accents */}
        <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-[#00F0FF]" />
        <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#00F0FF]" />
        <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#00F0FF]" />
        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-[#00F0FF]" />

        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.2)]">
            <Sparkles className="w-6 h-6 text-[#00F0FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-slate-100 font-sans">Sesión 1-on-1 (Reflexión & Diagnostics)</h1>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]">MODULE // 1x1_INSIGHTS</span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Diagnóstico táctico, análisis de fricción y reprogramación de compromisos</p>
          </div>
        </div>

        <button
          onClick={() => setShowHistoryModal(true)}
          className="px-4 py-2.5 rounded-xl bg-[#0A0D14] hover:bg-[#101827] text-slate-200 border border-[#06B6D4]/30 text-xs font-mono font-bold transition-colors flex items-center gap-2 self-start md:self-auto"
        >
          <History className="w-4 h-4 text-[#06B6D4]" />
          Historial de Sesiones ({ (reviews || []).length})
        </button>
      </div>

      {/* Sleek, Compact Multi-Filters Bar */}
      <div className="bg-[#101827]/60 p-3 px-4 rounded-xl border border-[#06B6D4]/20 backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-400 font-bold uppercase tracking-wider text-[11px]">
          <Filter className="w-3.5 h-3.5 text-[#00F0FF]" />
          <span>Filtro de Periodo:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-[#0A0D14] border border-[#06B6D4]/25 rounded-lg px-2.5 py-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Año</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-slate-100 font-bold focus:outline-none cursor-pointer text-xs"
            >
              {[2026, 2025, 2024].map((y) => (
                <option key={y} value={y} className="bg-[#0A0D14] text-slate-200">{y}</option>
              ))}
            </select>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-[#0A0D14] border border-[#06B6D4]/25 rounded-lg px-2.5 py-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Mes</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-transparent text-slate-100 font-bold focus:outline-none cursor-pointer text-xs"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx + 1} className="bg-[#0A0D14] text-slate-200">{m}</option>
              ))}
            </select>
          </div>

          {/* Week Selector */}
          <div className="flex items-center gap-1.5 bg-[#0A0D14] border border-[#06B6D4]/25 rounded-lg px-2.5 py-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Semana</span>
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(Number(e.target.value))}
              className="bg-transparent text-slate-100 font-bold focus:outline-none cursor-pointer text-xs max-w-[160px] truncate"
            >
              <option value={0} className="bg-[#0A0D14] text-slate-200">Todas (Mensual)</option>
              {Array.from({ length: 52 }, (_, i) => i + 1).map((wNum) => (
                <option key={wNum} value={wNum} className="bg-[#0A0D14] text-slate-200">
                  Sem. {wNum} {wNum === currentWeek ? '(Actual)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Performance Widgets Grid & Benefits Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Widget 1: Mejor Hábito (Mayor Puntaje) */}
        <div className="bg-[#101827]/90 p-5 rounded-2xl border border-[#00F0FF]/40 shadow-[0_0_20px_rgba(0,240,255,0.08)] backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 font-mono">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#00F0FF] flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#00F0FF]" /> Mejor Hábito (Rendimiento Max)
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30">
                #1 LÍDER
              </span>
            </div>

            {periodData.bestHabit ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-xl bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] shrink-0 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                    <IconRenderer name={periodData.bestHabit.icon} className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">{periodData.bestHabit.title}</h3>
                    <p className="text-xs text-[#06B6D4] font-mono">{periodData.bestHabit.category}</p>
                  </div>
                </div>

                {/* Direct Benefits Gained Box */}
                <div className="p-3 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-xs font-mono">
                  <span className="font-bold text-[#00F0FF] block mb-1">⚡ Beneficios Neuro-Fisiológicos:</span>
                  <p className="text-slate-200 text-[11px] leading-relaxed">
                    {getNeuroBenefits(periodData.bestHabit).gained}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono">Sin datos registrados aún para este periodo</p>
            )}
          </div>
        </div>

        {/* Widget 2: Hábito Revelación */}
        <div className="bg-[#101827]/90 p-5 rounded-2xl border border-[#06B6D4]/40 shadow-[0_0_20px_rgba(6,182,212,0.08)] backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 font-mono">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#06B6D4] flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#06B6D4]" /> Hábito Revelación
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/30">
                IMPULSO
              </span>
            </div>

            {periodData.revelationHabit ? (
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-xl bg-[#06B6D4]/15 border border-[#06B6D4]/40 text-[#06B6D4] shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                    <IconRenderer name={periodData.revelationHabit.icon} className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">{periodData.revelationHabit.title}</h3>
                    <p className="text-xs text-[#06B6D4] font-mono">{periodData.revelationHabit.category}</p>
                  </div>
                </div>

                {/* Impact & Benefits Box */}
                <div className="p-3 rounded-xl bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-xs font-mono">
                  <span className="font-bold text-[#06B6D4] block mb-1">🚀 Victoria de Impulso:</span>
                  <p className="text-slate-200 text-[11px] leading-relaxed">
                    {getNeuroBenefits(periodData.revelationHabit).gained}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono">Sin datos registrados aún para este periodo</p>
            )}
          </div>
        </div>

        {/* Widget 3: Hábito de Enfoque (Menor Movimiento / Reencuadre Motivacional) */}
        <div className="bg-[#101827]/90 p-5 rounded-2xl border border-blue-500/40 shadow-[0_0_20px_rgba(37,99,235,0.08)] backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2 font-mono">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-blue-400" /> Hábito Enfoque Próxima Semana
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                ENFOQUE
              </span>
            </div>

            <label className="block text-[11px] text-slate-400 font-mono mb-1">
              Selecciona o prioriza el hábito con menor cumplimiento para reactivarlo:
            </label>
            <select
              value={focusHabitId}
              onChange={(e) => setFocusHabitId(e.target.value)}
              className="w-full bg-[#0A0D14] text-slate-100 text-xs font-mono font-bold px-3 py-2 rounded-xl border border-[#06B6D4]/30 focus:outline-none focus:border-blue-400 mb-3"
            >
              {activeHabits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.title} ({h.category}) {h.id === periodData.lowestHabit?.id ? '★ Menor cumplimiento' : ''}
                </option>
              ))}
            </select>

            {/* Motivational Benefit Reframing Card */}
            {(() => {
              const selectedFocusHabit = activeHabits.find(h => h.id === focusHabitId) || periodData.lowestHabit;
              return (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs font-mono">
                  <span className="font-bold text-blue-400 block mb-1">🔥 Beneficio de Reactivación:</span>
                  <p className="text-slate-200 text-[11px] leading-relaxed">
                    {getNeuroBenefits(selectedFocusHabit).motivational}
                  </p>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Free Reflection Form Fields */}
      <form onSubmit={handleSave} className="bg-[#101827]/80 p-6 rounded-2xl border border-[#06B6D4]/25 shadow-xl backdrop-blur-md space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#06B6D4]/20">
          <div>
            <h2 className="text-lg font-bold text-slate-100 font-mono uppercase tracking-wider text-[#06B6D4]">Bitácora de Notas & Diagnóstico Táctico</h2>
            <p className="text-xs text-slate-400 font-mono">
              Evaluación para: {selectedWeek > 0 ? `Semana ${selectedWeek}` : 'Mes Completo'}, {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </p>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[#06B6D4] hover:bg-[#06B6D4]/90 text-[#0A0D14] font-mono font-bold text-xs transition-colors shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-2"
          >
            <Save className="w-4 h-4 text-[#0A0D14]" /> Guardar Sesión 1-on-1
          </button>
        </div>

        {/* Feed Automático de Victorias del Periodo */}
        <div className="p-4 rounded-xl bg-[#0A0D14] border border-[#F59E0B]/30 space-y-3 font-mono">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#F59E0B]/20">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#F59E0B]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#F59E0B]">
                Victorias del Periodo ({periodWins.length}) — Alimentado del Tracker Diario
              </span>
            </div>
            {periodWins.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const winsText = periodWins.map(p => `• [${p.date.slice(5)}]: ${p.win}`).join('\n');
                  setWorkedWell(prev => prev ? `${prev}\n\nVictorias del tracker diario:\n${winsText}` : `Victorias del tracker diario:\n${winsText}`);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#F59E0B]/15 hover:bg-[#F59E0B]/25 text-[#F59E0B] border border-[#F59E0B]/40 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Copiar al campo de notas</span>
              </button>
            )}
          </div>

          {periodWins.length > 0 ? (
            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
              {Object.entries(
                periodWins.reduce((acc, item) => {
                  const weekNum = getWeekNumber(parseISODate(item.date));
                  if (!acc[weekNum]) acc[weekNum] = [];
                  acc[weekNum].push(item);
                  return acc;
                }, {} as Record<number, typeof periodWins>)
              ).map(([week, items]) => (
                <div key={week} className="space-y-2">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                    Semana {week}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-[#101827] border border-[#F59E0B]/20 text-xs text-slate-200 flex items-start gap-2">
                        <span className="px-1.5 py-0.5 rounded bg-[#F59E0B]/20 text-[#F59E0B] text-[10px] font-bold shrink-0">
                          {item.date.slice(5)}
                        </span>
                        <span className="leading-snug">{item.win}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No hay victorias registradas en el Tracker Diario para esta semana/mes. Agrega tus victorias en la pestaña Daily Tracker y aparecerán aquí automáticamente.
            </p>
          )}
        </div>

        {/* Feed Automático de Registro Deportivo & Kilometraje */}
        <div className="p-4 rounded-xl bg-[#0A0D14] border border-[#00F0FF]/30 space-y-3 font-mono">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-[#00F0FF]/20">
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4 text-[#00F0FF]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#00F0FF]">
                Actividad Deportiva ({periodSportsData.totalKmOverall} KM TOTALES) — Alimentado del Tracker Diario
              </span>
            </div>
            {periodSportsData.entries.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const summaryLines: string[] = [];
                  summaryLines.push(`=== REGISTRO DEPORTIVO (${periodSportsData.totalKmOverall} KM TOTALES) ===`);
                  Object.entries(periodSportsData.totalsBySport).forEach(([sport, statData]) => {
                    const stat = statData as { km: number; count: number };
                    summaryLines.push(`• ${sport}: ${Math.round(stat.km * 10) / 10} KM (${stat.count} sesiones)`);
                  });
                  summaryLines.push('\nDetalle de sesiones:');
                  periodSportsData.entries.forEach(e => {
                    summaryLines.push(`- [${e.date.slice(5)}] ${e.sportType}: ${e.km} KM ${e.notes ? `(${e.notes})` : ''}`);
                  });
                  const sportsText = summaryLines.join('\n');
                  setWorkedWell(prev => prev ? `${prev}\n\n${sportsText}` : sportsText);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/40 text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />
                <span>Copiar métricas al campo de notas</span>
              </button>
            )}
          </div>

          {/* Breakdown summary badges */}
          {periodSportsData.entries.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(periodSportsData.totalsBySport).map(([sport, statData]) => {
                  const stat = statData as { km: number; count: number };
                  return (
                    <div key={sport} className="px-3 py-1.5 rounded-xl bg-[#101827] border border-[#00F0FF]/25 flex items-center gap-2 text-xs">
                      {sport === 'Ciclismo' && <Bike className="w-3.5 h-3.5 text-[#00F0FF]" />}
                      {sport === 'Running' && <Footprints className="w-3.5 h-3.5 text-[#10B981]" />}
                      {sport === 'Fútbol' && <Goal className="w-3.5 h-3.5 text-[#8B5CF6]" />}
                      {!['Ciclismo', 'Running', 'Fútbol'].includes(sport) && <Activity className="w-3.5 h-3.5 text-slate-400" />}
                      <span className="font-bold text-slate-200">{sport}:</span>
                      <span className="font-black text-[#00F0FF]">{Math.round(stat.km * 10) / 10} KM</span>
                      <span className="text-[10px] text-slate-400">({stat.count}x)</span>
                    </div>
                  );
                })}
              </div>

              {/* Grid of sessions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                {periodSportsData.entries.map((item, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-[#101827] border border-[#00F0FF]/20 text-xs text-slate-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      <span className="px-1.5 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] text-[10px] font-bold shrink-0">
                        {item.date.slice(5)}
                      </span>
                      <span className="font-bold truncate">{item.sportType}</span>
                      {item.notes && <span className="text-[11px] text-slate-400 truncate">({item.notes})</span>}
                    </div>
                    <span className="font-black text-[#00F0FF] text-xs shrink-0">{item.km} KM</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              No hay sesiones deportivas registradas en el Tracker Diario para esta semana/mes. Agrega tus sesiones de Ciclismo, Running, Fútbol u otros en el Tracker Diario.
            </p>
          )}
        </div>

        {/* Field 1: What worked well? */}
        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-200 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] flex items-center justify-center font-mono font-black text-xs">1</span>
            ¿Qué funcionó bien este periodo?
          </label>
          <p className="text-xs text-slate-400 font-mono mb-2">
            Registra tus victorias, rutinas que fluyeron sin resistencia y detonantes positivos.
          </p>
          <textarea
            rows={3}
            value={workedWell}
            onChange={(e) => setWorkedWell(e.target.value)}
            placeholder="Ej: Cumplir con la caminata matutina me dio mucha más claridad mental durante el trabajo..."
            className="w-full px-4 py-3 bg-[#0A0D14] border border-[#06B6D4]/30 rounded-xl text-slate-100 text-xs md:text-sm font-mono focus:outline-none focus:border-[#06B6D4] transition-colors placeholder:text-slate-600 leading-relaxed"
          />
        </div>

        {/* Field 2: Obstacles and solutions */}
        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-200 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-[#F97316]/20 border border-[#F97316]/40 text-[#F97316] flex items-center justify-center font-mono font-black text-xs">2</span>
            ¿Qué obstáculos aparecieron y cómo superarlos?
          </label>
          <p className="text-xs text-slate-400 font-mono mb-2">
            Identifica la fricción o distracciones sin juzgarte y define soluciones prácticas de ajuste.
          </p>
          <textarea
            rows={3}
            value={obstacles}
            onChange={(e) => setObstacles(e.target.value)}
            placeholder="Ej: Noté que me dio flojera leer de noche. Solución: Dejar el libro sobre la almohada por la mañana..."
            className="w-full px-4 py-3 bg-[#0A0D14] border border-[#06B6D4]/30 rounded-xl text-slate-100 text-xs md:text-sm font-mono focus:outline-none focus:border-[#06B6D4] transition-colors placeholder:text-slate-600 leading-relaxed"
          />
        </div>

        {/* Field 3: Next week commitments */}
        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-200 mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-400 flex items-center justify-center font-mono font-black text-xs">3</span>
            Compromisos concretos para la próxima semana
          </label>
          <p className="text-xs text-slate-400 font-mono mb-2">
            Puntos irrenunciables, claros y ejecutables para la siguiente iteración.
          </p>
          <textarea
            rows={3}
            value={commitments}
            onChange={(e) => setCommitments(e.target.value)}
            placeholder="Ej: 1) Entrenar lunes, miércoles y viernes. 2) Tomar 2.5L de agua al despertar..."
            className="w-full px-4 py-3 bg-[#0A0D14] border border-[#06B6D4]/30 rounded-xl text-slate-100 text-xs md:text-sm font-mono focus:outline-none focus:border-[#06B6D4] transition-colors placeholder:text-slate-600 leading-relaxed"
          />
        </div>

        {/* Toast confirmation */}
        <AnimatePresence>
          {showSavedToast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3 rounded-xl bg-[#00F0FF]/20 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-mono font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.2)]"
            >
              <CheckCircle2 className="w-4 h-4 text-[#00F0FF]" />
              ¡Nota guardada con éxito!
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A0D14]/85 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-[#101827] border border-[#06B6D4]/40 rounded-2xl p-6 shadow-2xl max-h-[80vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[#06B6D4]/20">
              <h3 className="text-lg font-bold text-slate-100 font-mono flex items-center gap-2">
                <History className="w-5 h-5 text-[#06B6D4]" /> Historial de Sesiones 1-on-1 HUD
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-xs font-mono font-semibold text-slate-400 hover:text-slate-200"
              >
                Cerrar
              </button>
            </div>

            { (reviews || []).length > 0 ? (
              <div className="space-y-4 font-mono">
                { (reviews || []).map((rev) => (
                  <div key={rev.id} className="p-4 rounded-xl bg-[#0A0D14] border border-[#06B6D4]/20 space-y-2 relative group">
                    <div className="flex items-center justify-between text-xs text-[#06B6D4] font-bold">
                      <span>Semana {rev.weekNumber || 'Mensual'}, {MONTH_NAMES[rev.month - 1]} {rev.year}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleLoadReviewForEdit(rev)}
                          className="px-2 py-1 rounded bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40 hover:bg-[#00F0FF]/30 transition-colors text-[10px] flex items-center gap-1 cursor-pointer"
                          title="Editar esta nota"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Editar</span>
                        </button>
                        <span className="text-[10px] text-slate-500">{new Date(rev.createdAt).toLocaleDateString('es-ES')}</span>
                      </div>
                    </div>

                    {rev.notesWorkedWell && (
                      <div className="text-xs text-slate-300">
                        <strong className="text-[#00F0FF]">Lo que funcionó: </strong>{rev.notesWorkedWell}
                      </div>
                    )}
                    {rev.notesObstacles && (
                      <div className="text-xs text-slate-300">
                        <strong className="text-[#F97316]">Obstáculos: </strong>{rev.notesObstacles}
                      </div>
                    )}
                    {rev.notesCommitments && (
                      <div className="text-xs text-slate-300">
                        <strong className="text-blue-400">Compromisos: </strong>{rev.notesCommitments}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 font-mono text-center py-8">Aún no hay sesiones archivadas.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
