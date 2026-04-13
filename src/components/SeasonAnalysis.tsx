'use client';

import { SeasonStats } from '@/lib/forecastAnalysis';
import { DANGER_LABELS, DangerLevel } from '@/types/forecast';

interface SeasonAnalysisProps {
  stats: SeasonStats;
}

const MONTH_SHORT: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
  '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec',
};

const MONTH_COLORS: Record<string, string> = {
  '11': '#6366f1', // Nov - indigo
  '12': '#3b82f6', // Dec - blue
  '01': '#06b6d4', // Jan - cyan
  '02': '#14b8a6', // Feb - teal
  '03': '#22c55e', // Mar - green
  '04': '#eab308', // Apr - yellow
  '05': '#f97316', // May - orange
};

function getMonthLabel(key: string): string {
  const mm = key.split('-')[1];
  return MONTH_SHORT[mm] || mm;
}

function getMonthColor(key: string): string {
  const mm = key.split('-')[1];
  return MONTH_COLORS[mm] || '#94a3b8';
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateFull(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function MonthLegend({ months }: { months: string[] }) {
  return (
    <div className="flex flex-wrap gap-3 mt-3">
      {months.map(m => (
        <div key={m} className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: getMonthColor(m) }} />
          <span className="text-xs text-gray-500">{getMonthLabel(m)}</span>
        </div>
      ))}
    </div>
  );
}

function SegmentedBar({ monthData, total, months }: { monthData: Record<string, number>; total: number; months: string[] }) {
  if (total === 0) return null;
  return (
    <div className="flex h-full rounded-full overflow-hidden">
      {months.map(m => {
        const count = monthData[m] || 0;
        if (count === 0) return null;
        const pct = (count / total) * 100;
        return (
          <div
            key={m}
            className="h-full"
            style={{ width: `${pct}%`, backgroundColor: getMonthColor(m) }}
            title={`${getMonthLabel(m)}: ${count}d`}
          />
        );
      })}
    </div>
  );
}

function DangerSection({ stats }: { stats: SeasonStats }) {
  const levels = [1, 2, 3, 4, 5] as const;
  const maxCount = Math.max(...levels.map(l => stats.dangerDistribution[l] || 0));
  return (
    <div className="space-y-2">
      {levels.map(level => {
        const count = stats.dangerDistribution[level] || 0;
        const pct = stats.totalDays > 0 ? (count / stats.totalDays) * 100 : 0;
        if (count === 0) return null;
        const barPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
        const monthData = stats.dangerByMonth[level] || {};
        return (
          <div key={level} className="flex items-center gap-3">
            <div className="w-24 text-sm text-gray-600 text-right">{DANGER_LABELS[level as DangerLevel]}</div>
            <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full" style={{ width: `${Math.max(barPct, 3)}%` }}>
                <SegmentedBar monthData={monthData} total={count} months={stats.months} />
              </div>
            </div>
            <div className="w-20 text-sm text-gray-500">{count}d ({Math.round(pct)}%)</div>
          </div>
        );
      })}
      <MonthLegend months={stats.months} />
    </div>
  );
}

function ProblemSection({ stats }: { stats: SeasonStats }) {
  const maxCount = stats.problemFrequency.length > 0 ? stats.problemFrequency[0].count : 0;
  return (
    <div className="space-y-3">
      {stats.problemFrequency.map(problem => {
        const barPct = maxCount > 0 ? (problem.count / maxCount) * 100 : 0;
        const monthData = stats.problemByMonth[problem.type] || {};
        return (
          <div key={problem.type} className="flex items-center gap-3">
            <div className="w-32 text-sm text-gray-700 font-medium">{problem.label}</div>
            <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full" style={{ width: `${Math.max(barPct, 3)}%` }}>
                <SegmentedBar monthData={monthData} total={problem.count} months={stats.months} />
              </div>
            </div>
            <div className="w-24 text-sm text-gray-500 text-right">{problem.count}d ({problem.percentage}%)</div>
          </div>
        );
      })}
      <MonthLegend months={stats.months} />
    </div>
  );
}

function WeeklySnowfallChart({ weeks }: { weeks: { weekStart: string; weekEnd: string; snowfall: number; cumulative: number }[] }) {
  const maxSnow = Math.max(...weeks.map(w => w.snowfall), 1);
  const maxCumulative = weeks[weeks.length - 1]?.cumulative || 1;
  const chartHeight = 160;

  return (
    <div>
      <div className="relative" style={{ height: chartHeight + 32 }}>
        {/* Cumulative line */}
        <svg className="absolute inset-0 w-full" style={{ height: chartHeight }} viewBox={`0 0 ${weeks.length * 100} ${chartHeight}`} preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            points={weeks.map((w, i) => {
              const x = (i + 0.5) * 100;
              const y = chartHeight - (w.cumulative / maxCumulative) * (chartHeight - 8);
              return `${x},${y}`;
            }).join(' ')}
          />
        </svg>
        {/* Bars */}
        <div className="relative flex items-end gap-px" style={{ height: chartHeight }}>
          {weeks.map((week, i) => {
            const barH = maxSnow > 0 ? (week.snowfall / maxSnow) * (chartHeight - 20) : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: chartHeight }}>
                {week.snowfall > 0 && (
                  <div className="text-[10px] text-gray-500 mb-0.5">{week.snowfall}&quot;</div>
                )}
                <div
                  className="w-full rounded-t bg-blue-400/70"
                  style={{ height: Math.max(barH, week.snowfall > 0 ? 3 : 0) }}
                  title={`${formatDate(week.weekStart)}–${formatDate(week.weekEnd)}: ${week.snowfall}" (${week.cumulative}" total)`}
                />
              </div>
            );
          })}
        </div>
        {/* Cumulative labels */}
        <div className="absolute top-0 right-1 text-xs font-medium text-blue-600">{maxCumulative}&quot;</div>
        <div className="absolute bottom-8 right-1 text-xs text-blue-400">0&quot;</div>
        {/* Date labels */}
        <div className="flex mt-1">
          {weeks.map((week, i) => (
            <div key={i} className="flex-1 text-center">
              <div className="text-[10px] text-gray-400 leading-tight">{formatDate(week.weekStart).split(' ')[0]}</div>
              <div className="text-[10px] text-gray-400 leading-tight">{formatDate(week.weekStart).split(' ')[1]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DailySnowfallChart({ days }: { days: { date: string; snowfall: number; cumulative: number }[] }) {
  const maxSnow = Math.max(...days.map(d => d.snowfall), 1);
  const maxCumulative = days[days.length - 1]?.cumulative || 1;
  const chartHeight = 160;

  // Month boundary labels
  const monthLabels: { index: number; label: string }[] = [];
  let lastMonth = '';
  for (let i = 0; i < days.length; i++) {
    const d = new Date(days[i].date + 'T12:00:00');
    const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (mk !== lastMonth) {
      monthLabels.push({ index: i, label: MONTH_SHORT[String(d.getMonth() + 1).padStart(2, '0')] || mk });
      lastMonth = mk;
    }
  }

  return (
    <div>
      <div className="relative" style={{ height: chartHeight + 24 }}>
        {/* Cumulative area */}
        <svg className="absolute inset-0 w-full" style={{ height: chartHeight }} viewBox={`0 0 ${days.length} ${chartHeight}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polygon
            fill="url(#cumGrad)"
            points={`0,${chartHeight} ${days.map((d, i) => {
              const y = chartHeight - (d.cumulative / maxCumulative) * (chartHeight - 8);
              return `${i + 0.5},${y}`;
            }).join(' ')} ${days.length},${chartHeight}`}
          />
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            points={days.map((d, i) => {
              const y = chartHeight - (d.cumulative / maxCumulative) * (chartHeight - 8);
              return `${i + 0.5},${y}`;
            }).join(' ')}
          />
        </svg>
        {/* Bars */}
        <div className="relative flex items-end" style={{ height: chartHeight }}>
          {days.map((day, i) => {
            const barH = maxSnow > 0 ? (day.snowfall / maxSnow) * (chartHeight - 20) : 0;
            const isNotable = day.snowfall >= 6;
            return (
              <div
                key={i}
                className="flex-1"
                style={{ height: chartHeight, display: 'flex', alignItems: 'flex-end' }}
              >
                <div
                  className={`w-full ${isNotable ? 'bg-blue-500' : 'bg-blue-300/70'}`}
                  style={{ height: Math.max(barH, day.snowfall > 0 ? 2 : 0) }}
                  title={`${formatDate(day.date)}: ${day.snowfall}" (${day.cumulative}" total)`}
                />
              </div>
            );
          })}
        </div>
        {/* Cumulative labels */}
        <div className="absolute top-0 right-1 text-xs font-medium text-blue-600">{maxCumulative}&quot;</div>
        {/* Month labels */}
        <div className="relative h-5 mt-1">
          {monthLabels.map((ml, i) => (
            <div
              key={i}
              className="absolute text-[11px] font-medium text-gray-500"
              style={{ left: `${(ml.index / days.length) * 100}%` }}
            >
              {ml.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SeasonAnalysis({ stats }: SeasonAnalysisProps) {
  if (stats.totalDays === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
        <p className="text-gray-500">No forecast data available for this season.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Season overview card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Season Overview</h2>
        <p className="text-sm text-gray-500 mb-4">
          {formatDateFull(stats.seasonStart)} &mdash; {formatDateFull(stats.seasonEnd)} &middot; {stats.totalDays} days of forecasts
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.totalSnowfall}&quot;</div>
            <div className="text-xs text-blue-600 mt-1">Total Snowfall</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-700">{stats.avgDanger}</div>
            <div className="text-xs text-orange-600 mt-1">Avg Danger Level</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-700">{stats.windEventDays}</div>
            <div className="text-xs text-gray-600 mt-1">Wind Event Days</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-700">{stats.notableStorms.length}</div>
            <div className="text-xs text-purple-600 mt-1">Notable Storms (6&quot;+)</div>
          </div>
        </div>
      </div>

      {/* Danger distribution */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Danger Level Distribution</h2>
        <DangerSection stats={stats} />
        {stats.peakDangerPeriod && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm font-medium text-red-800">
              Peak Danger Period: {formatDate(stats.peakDangerPeriod.start)} &mdash; {formatDate(stats.peakDangerPeriod.end)}
            </div>
            <div className="text-xs text-red-600 mt-1">
              Longest stretch of Considerable or higher &middot; Avg danger: {stats.peakDangerPeriod.avgDanger.toFixed(1)}
            </div>
          </div>
        )}
      </div>

      {/* Problem types */}
      {stats.problemFrequency.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Problem Types</h2>
          <ProblemSection stats={stats} />
        </div>
      )}

      {/* Notable storms */}
      {stats.notableStorms.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Notable Storms (6&quot;+)</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {stats.notableStorms.map((storm, idx) => (
              <div key={idx} className="bg-blue-50 rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-blue-700">{storm.snowfall}&quot;</div>
                <div className="text-xs text-blue-600">{formatDate(storm.date)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly snowfall timeline */}
      {stats.weeklySnowfall.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Weekly Snowfall</h2>
          <p className="text-sm text-gray-500 mb-4">
            Bar height = weekly total &middot; Line = cumulative season total
          </p>
          <WeeklySnowfallChart weeks={stats.weeklySnowfall} />
        </div>
      )}

      {/* Daily snowfall timeline */}
      {stats.dailySnowfall.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Daily Snowfall</h2>
          <p className="text-sm text-gray-500 mb-4">
            Each bar is one day &middot; Line = cumulative season total
          </p>
          <DailySnowfallChart days={stats.dailySnowfall} />
        </div>
      )}

      {/* Temperature + conditions */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Conditions Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.coldClearDays > 0 && (
            <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
              <div className="text-sm font-medium text-cyan-800">{stats.coldClearDays} Cold/Clear Days</div>
              <div className="text-xs text-cyan-600 mt-1">Faceting conditions (cold + clear skies)</div>
            </div>
          )}
          {stats.warmestDay && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="text-sm font-medium text-amber-800">Warmest: {stats.warmestDay.temp}&deg;F</div>
              <div className="text-xs text-amber-600 mt-1">{formatDate(stats.warmestDay.date)}</div>
            </div>
          )}
          {stats.coldestDay && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg">
              <div className="text-sm font-medium text-sky-800">Coldest: {stats.coldestDay.temp}&deg;F</div>
              <div className="text-xs text-sky-600 mt-1">{formatDate(stats.coldestDay.date)}</div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        Analysis based on {stats.totalDays} days of CBAC forecast data.
        Always check the official CBAC forecast and make your own terrain decisions.
      </p>
    </div>
  );
}
