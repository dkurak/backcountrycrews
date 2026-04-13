'use client';

import { SeasonStats } from '@/lib/forecastAnalysis';
import { DANGER_LABELS, DANGER_COLORS, DangerLevel } from '@/types/forecast';

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
