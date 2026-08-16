import React, { useState, useMemo } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import { TrendingUp, Flame, Calendar, Award, Target, PieChart as PieChartIcon, BarChart2 } from 'lucide-react';
import { Habit, DailyLog } from '../../types';
import { getPastNDays, formatFriendlyDate, parseISODate, MONTH_NAMES } from '../../utils/dateUtils';
import { HabitHeatmap } from './HabitHeatmap';

interface AnalyticsTrendsProps {
  habits: Habit[];
  logs: Record<string, DailyLog>;
  calculateStreak: (habitId: string, uptoDate: string) => number;
}

export const AnalyticsTrends: React.FC<AnalyticsTrendsProps> = ({ habits, logs }) => {
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(14);

  const activeHabits = (habits || []).filter(h => !h.archived);
  const totalHabitsCount = activeHabits.length;

  // Compute Daily Trend Data
  const dailyTrendData = useMemo(() => {
    const days = getPastNDays(timeRange);
    return days.map(dStr => {
      const log = logs[dStr];
      const completedIds = log?.completedHabitIds || [];
      const completedCount = activeHabits.filter(h => completedIds.includes(h.id)).length;
      const rate = totalHabitsCount > 0 ? Math.min(100, Math.round((completedCount / totalHabitsCount) * 100)) : 0;
      
      return {
        date: dStr,
        friendlyDate: formatFriendlyDate(dStr),
        completados: completedCount,
        porcentaje: rate,
        isClosed: log?.isClosed || false
      };
    });
  }, [timeRange, logs, totalHabitsCount]);

  // Overall Average Rate
  const overallAvgRate = useMemo(() => {
    if (dailyTrendData.length === 0) return 0;
    const sum = dailyTrendData.reduce((acc, curr) => acc + curr.porcentaje, 0);
    return Math.round(sum / dailyTrendData.length);
  }, [dailyTrendData]);

  // Compute Weekly Averages (Last 4 Weeks)
  const weeklyData = useMemo(() => {
    const weeks: { weekLabel: string; avgRate: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const days = getPastNDays(7, new Date(Date.now() - w * 7 * 86400000));
      let sum = 0;
      days.forEach(dStr => {
        const log = logs[dStr];
        const completedIds = log?.completedHabitIds || [];
        const completed = activeHabits.filter(h => completedIds.includes(h.id)).length;
        const rate = totalHabitsCount > 0 ? Math.min(100, (completed / totalHabitsCount) * 100) : 0;
        sum += rate;
      });
      const avg = Math.min(100, Math.round(sum / 7));
      weeks.push({
        weekLabel: `Semana ${4 - w}`,
        avgRate: avg
      });
    }
    return weeks;
  }, [logs, totalHabitsCount, activeHabits]);

  // Compute Monthly Averages (Last 3 Months)
  const monthlyData = useMemo(() => {
    const months: { monthLabel: string; avgRate: number }[] = [];
    const now = new Date();
    
    for (let m = 2; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const mName = MONTH_NAMES[d.getMonth()];
      
      // Calculate average for all days logged in that month
      let sum = 0;
      let count = 0;
      Object.keys(logs).forEach(dateStr => {
        const logDate = parseISODate(dateStr);
        if (logDate.getFullYear() === d.getFullYear() && logDate.getMonth() === d.getMonth()) {
          const log = logs[dateStr];
          const completedIds = log?.completedHabitIds || [];
          const completed = activeHabits.filter(h => completedIds.includes(h.id)).length;
          const rate = totalHabitsCount > 0 ? Math.min(100, (completed / totalHabitsCount) * 100) : 0;
          sum += rate;
          count++;
        }
      });

      const avg = count > 0 ? Math.min(100, Math.round(sum / count)) : 0;
      months.push({
        monthLabel: `${mName} ${d.getFullYear()}`,
        avgRate: avg
      });
    }
    return months;
  }, [logs, totalHabitsCount]);

  // Category Breakdown Data
  const categoryData = useMemo(() => {
    const counts: Record<string, { total: number; done: number }> = {};
    
    activeHabits.forEach(h => {
      if (!counts[h.category]) {
        counts[h.category] = { total: 0, done: 0 };
      }
      counts[h.category].total += 1;
    });

    // Sum overall completions in last 14 days
    const days = getPastNDays(14);
    days.forEach(dStr => {
      const completedIds = logs[dStr]?.completedHabitIds || [];
      completedIds.forEach(id => {
        const h = activeHabits.find(item => item.id === id);
        if (h && counts[h.category]) {
          counts[h.category].done += 1;
        }
      });
    });

    const COLORS = ['#00F0FF', '#6366f1', '#8b5cf6', '#f59e0b', '#06b6d4', '#2563eb'];

    return Object.keys(counts).map((cat, idx) => {
      const item = counts[cat];
      const maxPossible = item.total * 14;
      const rate = maxPossible > 0 ? Math.min(100, Math.round((item.done / maxPossible) * 100)) : 0;
      return {
        name: cat,
        cumplimiento: rate,
        color: COLORS[idx % COLORS.length]
      };
    });
  }, [activeHabits, logs]);

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
            <TrendingUp className="w-6 h-6 text-[#00F0FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-slate-100 font-sans">Tendencias & Progreso</h1>
              <span className="px-2 py-0.5 text-[9px] font-mono font-bold rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 shadow-[0_0_8px_rgba(0,240,255,0.2)]">MODULE // ANALYTICS</span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">Patrones de constancia, balance personal y seguimiento de desempeño</p>
          </div>
        </div>

        {/* Time range selector */}
        <div className="flex items-center gap-1.5 bg-[#0A0D14] p-1.5 rounded-xl border border-[#06B6D4]/30 self-start md:self-auto font-mono">
          {([7, 14, 30] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                timeRange === r
                  ? 'bg-[#06B6D4] text-[#0A0D14] shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r} Días
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#101827]/80 p-5 rounded-2xl border border-[#06B6D4]/25 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-[#06B6D4] mb-2 font-mono">
            <span className="text-xs font-bold uppercase tracking-wider">PROMEDIO GENERAL</span>
            <Target className="w-4 h-4 text-[#00F0FF]" />
          </div>
          <div className="text-3xl font-black font-mono text-[#00F0FF]">{overallAvgRate}%</div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">Últimos {timeRange} días de actividad</p>
        </div>

        <div className="bg-[#101827]/80 p-5 rounded-2xl border border-[#06B6D4]/25 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-[#06B6D4] mb-2 font-mono">
            <span className="text-xs font-bold uppercase tracking-wider">DÍAS REGISTRADOS</span>
            <Calendar className="w-4 h-4 text-[#06B6D4]" />
          </div>
          <div className="text-3xl font-black font-mono text-slate-100">{Object.keys(logs).length}</div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">Historial total en el sistema</p>
        </div>

        <div className="bg-[#101827]/80 p-5 rounded-2xl border border-[#06B6D4]/25 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-[#06B6D4] mb-2 font-mono">
            <span className="text-xs font-bold uppercase tracking-wider">HÁBITOS ACTIVOS</span>
            <Award className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black font-mono text-cyan-300">{totalHabitsCount}</div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">Acciones diarias configuradas</p>
        </div>

        <div className="bg-[#101827]/80 p-5 rounded-2xl border border-[#06B6D4]/25 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-[#06B6D4] mb-2 font-mono">
            <span className="text-xs font-bold uppercase tracking-wider">DÍAS SOBRESALIENTES</span>
            <Flame className="w-4 h-4 text-[#F97316]" />
          </div>
          <div className="text-3xl font-black font-mono text-amber-400">
            {dailyTrendData.filter(d => d.porcentaje >= 80).length}
          </div>
          <p className="text-[11px] text-slate-400 font-mono mt-1">Jornadas con &gt;80% completado</p>
        </div>
      </div>

      {/* Main Chart 1: Daily Evolution Area/Line Chart */}
      <div className="bg-[#101827]/80 p-6 rounded-2xl border border-[#06B6D4]/25 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 font-mono uppercase tracking-wider text-[#06B6D4]">/// Tendencia Diaria de Cumplimiento</h3>
            <p className="text-xs text-slate-400">Evolución porcentual de hábitos completados día a día ({timeRange} días)</p>
          </div>
          <span className="text-xs text-[#00F0FF] bg-[#00F0FF]/15 px-3 py-1 rounded-full border border-[#00F0FF]/40 font-mono font-bold shadow-[0_0_10px_rgba(0,240,255,0.2)]">
            OBJETIVO: &gt; 70%
          </span>
        </div>

        <div className="h-64 md:h-80 w-full pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="dopamineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00F0FF" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.15)" vertical={false} />
              <XAxis dataKey="friendlyDate" stroke="#06B6D4" fontSize={11} tickLine={false} fontFamily="monospace" />
              <YAxis stroke="#06B6D4" fontSize={11} domain={[0, 100]} tickLine={false} unit="%" fontFamily="monospace" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0A0D14',
                  borderColor: 'rgba(6, 182, 212, 0.4)',
                  borderRadius: '12px',
                  color: '#00F0FF',
                  fontFamily: 'monospace',
                  fontSize: '12px'
                }}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter={(value: any) => [`${value}%`, 'Cumplimiento HUD']}
              />
              <Area
                type="monotone"
                dataKey="porcentaje"
                stroke="#00F0FF"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#dopamineGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid Chart 2: Weekly & Monthly Comparison Bar Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Averages */}
        <div className="bg-[#101827]/80 p-6 rounded-2xl border border-[#06B6D4]/25 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#06B6D4]" />
            <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider text-[#06B6D4]">Promedio Semanal (Últimas 4 Semanas)</h3>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.15)" vertical={false} />
                <XAxis dataKey="weekLabel" stroke="#06B6D4" fontSize={11} tickLine={false} fontFamily="monospace" />
                <YAxis stroke="#06B6D4" fontSize={11} domain={[0, 100]} tickLine={false} unit="%" fontFamily="monospace" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0A0D14',
                    borderColor: 'rgba(6, 182, 212, 0.4)',
                    borderRadius: '12px',
                    color: '#38BDF8',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`${value}%`, 'Promedio Semanal']}
                />
                <Bar dataKey="avgRate" radius={[8, 8, 0, 0]}>
                  {weeklyData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === weeklyData.length - 1 ? '#00F0FF' : '#06B6D4'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Averages */}
        <div className="bg-[#101827]/80 p-6 rounded-2xl border border-[#06B6D4]/25 shadow-xl backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider text-[#06B6D4]">Promedio Mensual (Últimos 3 Meses)</h3>
          </div>

          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.15)" vertical={false} />
                <XAxis dataKey="monthLabel" stroke="#06B6D4" fontSize={11} tickLine={false} fontFamily="monospace" />
                <YAxis stroke="#06B6D4" fontSize={11} domain={[0, 100]} tickLine={false} unit="%" fontFamily="monospace" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0A0D14',
                    borderColor: 'rgba(6, 182, 212, 0.4)',
                    borderRadius: '12px',
                    color: '#38BDF8',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`${value}%`, 'Promedio Mensual']}
                />
                <Bar dataKey="avgRate" radius={[8, 8, 0, 0]}>
                  {monthlyData.map((_, index) => (
                    <Cell key={`cell-m-${index}`} fill={index === monthlyData.length - 1 ? '#3B82F6' : 'rgba(6,182,212,0.5)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Category Breakdown Chart */}
      <div className="bg-[#101827]/80 p-6 rounded-2xl border border-[#06B6D4]/25 shadow-xl backdrop-blur-md space-y-4">
        <div className="flex items-center gap-2">
          <PieChartIcon className="w-5 h-5 text-[#00F0FF]" />
          <div>
            <h3 className="text-sm font-bold text-slate-100 font-mono uppercase tracking-wider text-[#06B6D4]">Distribución de Cumplimiento por Categoría</h3>
            <p className="text-xs text-slate-400">Eficacia por pilar de vida en los últimos 14 días</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="cumplimiento"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  innerRadius={45}
                  paddingAngle={4}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`pie-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0A0D14',
                    borderColor: 'rgba(6, 182, 212, 0.4)',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontFamily: 'monospace',
                    fontSize: '12px'
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`${value}%`, 'Cumplimiento Categoría']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-3 font-mono">
            {categoryData.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0A0D14] border border-[#06B6D4]/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs font-semibold text-slate-200">{cat.name}</span>
                </div>
                <span className="text-xs font-bold text-[#00F0FF]">{cat.cumplimiento}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Consistency Matrix Heatmap */}
      <HabitHeatmap habits={activeHabits} logs={logs} daysCount={28} />
    </div>
  );
};
