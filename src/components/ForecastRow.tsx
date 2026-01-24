'use client';

import { Forecast, AvalancheProblem, DANGER_LABELS, ForecastWeather, ForecastTrend, TREND_LABELS, TREND_COLORS } from '@/types/forecast';
import { DangerPyramid } from './DangerPyramid';
import { AspectRose } from './AspectRose';
import { PROBLEM_LABELS } from '@/types/forecast';
import { analyzeWeek } from './WeekAnalysis';
import { SkyIcon, WindIcon } from './WeatherIcons';

// Trend icon helper
function getTrendIcon(trend: ForecastTrend | undefined): string {
  switch (trend) {
    case 'improving': return '↑';
    case 'worsening': return '↓';
    case 'storm_incoming': return '⚠';
    case 'new_problem': return '!';
    default: return '→';
  }
}

// Count active cells in aspect/elevation rose
function countActiveCells(rose: AvalancheProblem['aspect_elevation']): number {
  let count = 0;
  const aspects = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
  const elevations = ['alpine', 'treeline', 'below_treeline'] as const;

  for (const aspect of aspects) {
    for (const elev of elevations) {
      if (rose[aspect]?.[elev]) count++;
    }
  }
  return count;
}

// Calculate total problem coverage across all problems
function getTotalProblemCoverage(problems: AvalancheProblem[]): number {
  return problems.reduce((sum, p) => sum + countActiveCells(p.aspect_elevation), 0);
}

// Calculate trend by comparing to previous forecast
function calculateTrend(current: Forecast, previous?: Forecast): ForecastTrend | undefined {
  if (!previous) return undefined;

  const currentMaxDanger = Math.max(
    current.danger_alpine,
    current.danger_treeline,
    current.danger_below_treeline
  );
  const previousMaxDanger = Math.max(
    previous.danger_alpine,
    previous.danger_treeline,
    previous.danger_below_treeline
  );

  // Check for new problem types
  const currentTypes = new Set(current.problems.map(p => p.type));
  const previousTypes = new Set(previous.problems.map(p => p.type));
  const hasNewProblemType = [...currentTypes].some(t => !previousTypes.has(t));

  // Calculate problem coverage
  const currentCoverage = getTotalProblemCoverage(current.problems);
  const previousCoverage = getTotalProblemCoverage(previous.problems);

  // Determine trend based on multiple factors
  // Worsening: danger increased, or new problem type, or significantly more coverage
  if (currentMaxDanger > previousMaxDanger) {
    return 'worsening';
  }
  if (hasNewProblemType) {
    return 'new_problem';
  }
  if (currentCoverage > previousCoverage * 1.25) {
    return 'worsening';
  }

  // Improving: danger decreased, or problem resolved, or significantly less coverage
  if (currentMaxDanger < previousMaxDanger) {
    return 'improving';
  }
  if (current.problems.length < previous.problems.length) {
    return 'improving';
  }
  if (currentCoverage < previousCoverage * 0.75) {
    return 'improving';
  }

  // Steady: no significant changes
  return 'steady';
}

// Weather display with fixed-width columns for alignment
function WeatherBadge({ weather }: { weather?: ForecastWeather }) {
  const hasSnow = weather?.snowfall_24hr && weather.snowfall_24hr !== '0';

  return (
    <div className="flex items-center text-sm">
      {/* Temperature - fixed width */}
      <div className="w-12 text-center text-gray-700 font-medium">
        {weather?.temperature ? `${weather.temperature}°` : ''}
      </div>
      {/* Sky icon - fixed width */}
      <div className="w-8 flex justify-center">
        {weather?.cloud_cover ? (
          <SkyIcon cloudCover={weather.cloud_cover} size="lg" />
        ) : null}
      </div>
      {/* Wind icon - fixed width */}
      <div className="w-12 flex justify-center">
        {weather?.wind_direction && weather?.wind_speed ? (
          <WindIcon direction={weather.wind_direction} speed={weather.wind_speed} size="lg" />
        ) : null}
      </div>
      {/* Snowfall - fixed width */}
      <div className="w-12 flex justify-center">
        {hasSnow ? (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium text-xs">
            {weather?.snowfall_24hr}&quot;
          </span>
        ) : null}
      </div>
    </div>
  );
}

interface ForecastRowProps {
  forecast: Forecast;
  previousForecast?: Forecast;
  weekForecasts?: Forecast[]; // 7 days starting from this forecast (for analysis)
  expanded?: boolean;
  onToggle?: () => void;
}

// Calculate what changed between two forecasts
function getChanges(current: Forecast, previous?: Forecast): string[] {
  if (!previous) return [];

  const changes: string[] = [];

  // Check danger level changes
  if (current.danger_alpine !== previous.danger_alpine) {
    const direction = current.danger_alpine > previous.danger_alpine ? 'increased' : 'decreased';
    changes.push(`Alpine danger ${direction} from ${previous.danger_alpine} to ${current.danger_alpine}`);
  }
  if (current.danger_treeline !== previous.danger_treeline) {
    const direction = current.danger_treeline > previous.danger_treeline ? 'increased' : 'decreased';
    changes.push(`Treeline danger ${direction} from ${previous.danger_treeline} to ${current.danger_treeline}`);
  }
  if (current.danger_below_treeline !== previous.danger_below_treeline) {
    const direction = current.danger_below_treeline > previous.danger_below_treeline ? 'increased' : 'decreased';
    changes.push(`Below treeline danger ${direction} from ${previous.danger_below_treeline} to ${current.danger_below_treeline}`);
  }

  // Check problem count changes
  if (current.problems.length !== previous.problems.length) {
    if (current.problems.length > previous.problems.length) {
      changes.push(`New avalanche problem added (${current.problems.length} total)`);
    } else {
      changes.push(`Avalanche problem resolved (${current.problems.length} remaining)`);
    }
  }

  // Check for new or removed problem types
  const currentTypes = new Set(current.problems.map(p => p.type));
  const previousTypes = new Set(previous.problems.map(p => p.type));

  for (const type of currentTypes) {
    if (!previousTypes.has(type)) {
      changes.push(`${PROBLEM_LABELS[type]} added`);
    }
  }
  for (const type of previousTypes) {
    if (!currentTypes.has(type)) {
      changes.push(`${PROBLEM_LABELS[type]} removed`);
    }
  }

  return changes;
}

export function ForecastRow({ forecast, previousForecast, weekForecasts, expanded = false, onToggle }: ForecastRowProps) {
  // Calculate trend by comparing to previous forecast (instead of using keyword-based DB field)
  const trend = calculateTrend(forecast, previousForecast);

  // Get 7-day analysis if we have the forecasts
  const insights = weekForecasts && weekForecasts.length >= 2 ? analyzeWeek(weekForecasts) : [];
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const maxDanger = Math.max(
    forecast.danger_alpine,
    forecast.danger_treeline,
    forecast.danger_below_treeline
  );

  const changes = getChanges(forecast, previousForecast);
  const hasChanges = changes.length > 0;

  // Determine if danger increased or decreased overall
  const prevMaxDanger = previousForecast
    ? Math.max(previousForecast.danger_alpine, previousForecast.danger_treeline, previousForecast.danger_below_treeline)
    : maxDanger;
  const dangerTrend = maxDanger > prevMaxDanger ? 'up' : maxDanger < prevMaxDanger ? 'down' : null;

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
      {/* Compact row - always visible */}
      <button
        onClick={onToggle}
        className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
      >
        {/* Date */}
        <div className="w-20 text-left">
          <div className="text-sm font-medium text-gray-900">
            {formatDate(forecast.valid_date)}
          </div>
          <div className="text-xs text-gray-500 capitalize">{forecast.zone}</div>
        </div>

        {/* Trend badge */}
        {trend && trend !== 'steady' && (
          <div
            className="flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
            style={{
              backgroundColor: TREND_COLORS[trend] + '20',
              color: TREND_COLORS[trend],
            }}
          >
            {getTrendIcon(trend)} {TREND_LABELS[trend]}
          </div>
        )}

        {/* Danger Pyramid */}
        <div className="flex-shrink-0">
          <DangerPyramid
            alpine={forecast.danger_alpine}
            treeline={forecast.danger_treeline}
            belowTreeline={forecast.danger_below_treeline}
            size="sm"
          />
        </div>

        {/* Problems summary */}
        <div className="flex-1 flex items-center gap-2 overflow-x-auto">
          {forecast.problems.map((problem) => (
            <div key={problem.id} className="flex-shrink-0 flex items-center gap-1">
              <AspectRose rose={problem.aspect_elevation} size="sm" showLabels={false} />
              <span className="text-xs text-gray-600 whitespace-nowrap">
                {PROBLEM_LABELS[problem.type]?.split(' ')[0]}
              </span>
            </div>
          ))}
        </div>

        {/* Weather columns: Temp | Sky | Wind | Snow */}
        <div className="flex-shrink-0 hidden sm:block">
          <WeatherBadge weather={forecast.weather} />
        </div>

        {/* Max danger badge - fixed width for alignment */}
        <div
          className="flex-shrink-0 w-24 px-2 py-1 rounded text-xs font-bold text-center"
          style={{
            backgroundColor:
              maxDanger === 5
                ? '#231F20'
                : maxDanger === 4
                ? '#ED1C24'
                : maxDanger === 3
                ? '#F7931E'
                : maxDanger === 2
                ? '#FFF200'
                : '#50B848',
            color: maxDanger >= 4 ? '#fff' : '#000',
          }}
        >
          {DANGER_LABELS[maxDanger as 1 | 2 | 3 | 4 | 5]}
        </div>

        {/* Changed indicator - delta symbol after danger badge */}
        <div className="flex-shrink-0 w-6 flex justify-center">
          {hasChanges ? (
            <span className="text-blue-500 font-bold text-lg" title="Changed from previous day">Δ</span>
          ) : null}
        </div>

        {/* Expand indicator */}
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100">
          {/* What's Changed */}
          {hasChanges && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-1">What&apos;s Changed</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                {changes.map((change, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-400">•</span>
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Weather details */}
          {forecast.weather && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Weather</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                {forecast.weather.temperature && (
                  <div>
                    <span className="text-gray-500">Temp:</span>{' '}
                    <span className="font-medium">{forecast.weather.temperature}°F</span>
                  </div>
                )}
                {forecast.weather.cloud_cover && (
                  <div>
                    <span className="text-gray-500">Sky:</span>{' '}
                    <span className="font-medium">{forecast.weather.cloud_cover}</span>
                  </div>
                )}
                {forecast.weather.wind_direction && forecast.weather.wind_speed && (
                  <div>
                    <span className="text-gray-500">Wind:</span>{' '}
                    <span className="font-medium">{forecast.weather.wind_direction} {forecast.weather.wind_speed}</span>
                  </div>
                )}
                {forecast.weather.snowfall_24hr && (
                  <div>
                    <span className="text-gray-500">Snow:</span>{' '}
                    <span className="font-medium">{forecast.weather.snowfall_24hr}&quot;</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Quick Take / Key Message */}
          {(forecast.key_message || forecast.travel_advice) && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="text-sm font-semibold text-amber-900 mb-1">Quick Take</h4>
              {forecast.key_message && (
                <p className="text-sm text-amber-800">{forecast.key_message}</p>
              )}
              {forecast.travel_advice && forecast.travel_advice !== forecast.key_message && (
                <p className="text-sm text-amber-700 mt-1">{forecast.travel_advice}</p>
              )}
            </div>
          )}

          {/* Read Full Forecast Link */}
          <a
            href="https://cbavalanchecenter.org/forecasts/"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-4 flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <span className="text-lg">⛰️</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">Read Full Forecast</div>
              <div className="text-xs text-gray-500">Bottom line, discussion &amp; details on CBAC</div>
            </div>
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>

          {/* Problems */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Avalanche Problems ({forecast.problems.length})
            </h4>
            <div className="space-y-2">
              {forecast.problems.map((problem, idx) => (
                <div
                  key={problem.id}
                  className="flex items-center gap-3 p-2 bg-gray-50 rounded"
                >
                  <AspectRose
                    rose={problem.aspect_elevation}
                    size="sm"
                    showLabels={false}
                  />
                  <div>
                    <div className="text-sm font-medium">
                      #{idx + 1} {PROBLEM_LABELS[problem.type]}
                    </div>
                    <div className="text-xs text-gray-500">
                      {problem.likelihood} • Size {problem.size}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 7-Day Analysis */}
          {insights.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-3">
                <h4 className="text-sm font-semibold text-gray-700">7-Day Analysis</h4>
                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">AI*</span>
              </div>
              <div className="space-y-2">
                {insights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded-lg border text-sm ${
                      insight.sentiment === 'negative'
                        ? 'bg-red-50 border-red-200'
                        : insight.sentiment === 'positive'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span>{insight.icon}</span>
                      <div>
                        <div className="font-medium text-gray-900">{insight.title}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{insight.detail}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                *Based on the 7 days ending on this date.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
