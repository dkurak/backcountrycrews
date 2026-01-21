'use client';

import { Forecast, AvalancheProblem, ForecastTrend, TREND_LABELS, TREND_COLORS, DANGER_LABELS, DangerLevel } from '@/types/forecast';

interface QuickTakeProps {
  forecast: Forecast;
  previousForecast?: Forecast;
  compact?: boolean; // Smaller version for embedding
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

  // Worsening: danger increased, or new problem type, or significantly more coverage
  if (currentMaxDanger > previousMaxDanger) return 'worsening';
  if (hasNewProblemType) return 'new_problem';
  if (currentCoverage > previousCoverage * 1.25) return 'worsening';

  // Improving: danger decreased, or problem resolved, or significantly less coverage
  if (currentMaxDanger < previousMaxDanger) return 'improving';
  if (current.problems.length < previous.problems.length) return 'improving';
  if (currentCoverage < previousCoverage * 0.75) return 'improving';

  return 'steady';
}

// Generate quick take bullets from forecast data
function generateQuickTake(forecast: Forecast): string[] {
  const bullets: string[] = [];
  const maxDanger = Math.max(
    forecast.danger_alpine,
    forecast.danger_treeline,
    forecast.danger_below_treeline
  ) as DangerLevel;

  // Use travel advice if available
  if (forecast.travel_advice) {
    // Extract first meaningful sentence
    const sentences = forecast.travel_advice.split(/[.!]/).filter(s => s.trim().length > 10);
    if (sentences[0]) {
      bullets.push(sentences[0].trim());
    }
  }

  // Use key message if available and different from travel advice
  if (forecast.key_message && !bullets.some(b => b.includes(forecast.key_message!.substring(0, 20)))) {
    bullets.push(forecast.key_message);
  }

  // Generate from danger levels if we don't have enough bullets
  if (bullets.length < 2) {
    if (maxDanger >= 4) {
      bullets.push('Dangerous avalanche conditions - avoid steep terrain');
    } else if (maxDanger === 3) {
      if (forecast.danger_alpine === 3) {
        bullets.push('Careful terrain selection needed above treeline');
      } else {
        bullets.push('Heightened avalanche conditions - manage terrain carefully');
      }
    } else if (maxDanger === 2) {
      bullets.push('Moderate conditions - evaluate specific terrain features');
    } else {
      bullets.push('Generally favorable conditions - standard precautions apply');
    }
  }

  // Add problem-specific advice
  if (forecast.problems.length > 0) {
    const primaryProblem = forecast.problems[0];
    const problemAdvice: Record<string, string> = {
      persistent_slab: 'Buried weak layer remains a concern',
      wind_slab: 'Watch for wind-loaded slopes',
      storm_slab: 'New snow instabilities possible',
      wet_slab: 'Avoid sun-affected slopes as day warms',
      loose_dry: 'Loose snow sluffs possible on steep terrain',
      loose_wet: 'Wet loose avalanches on sun-affected slopes',
      cornice: 'Avoid corniced ridgelines',
      glide: 'Glide cracks indicate potential full-depth releases',
    };

    if (problemAdvice[primaryProblem.type] && bullets.length < 3) {
      bullets.push(problemAdvice[primaryProblem.type]);
    }

    // Add aspect info if we can determine affected aspects
    const affectedAspects = Object.entries(primaryProblem.aspect_elevation)
      .filter(([_, data]) => data.alpine || data.treeline)
      .map(([aspect]) => aspect);

    if (affectedAspects.length > 0 && affectedAspects.length < 5 && bullets.length < 3) {
      bullets.push(`Primary concern on ${affectedAspects.join(', ')} aspects`);
    }
  }

  // Add recent activity if notable
  if (forecast.recent_avalanche_count && forecast.recent_avalanche_count > 0) {
    bullets.push(`${forecast.recent_avalanche_count} recent avalanche${forecast.recent_avalanche_count > 1 ? 's' : ''} reported`);
  }

  return bullets.slice(0, 3); // Max 3 bullets
}

function getTrendIcon(trend: ForecastTrend | undefined): string {
  switch (trend) {
    case 'improving': return '↑';  // Things looking up
    case 'worsening': return '↓';  // Things going down
    case 'storm_incoming': return '⚠';
    case 'new_problem': return '!';
    default: return '→';
  }
}

export function QuickTake({ forecast, previousForecast, compact = false }: QuickTakeProps) {
  const bullets = generateQuickTake(forecast);
  const trend = calculateTrend(forecast, previousForecast);
  const maxDanger = Math.max(
    forecast.danger_alpine,
    forecast.danger_treeline,
    forecast.danger_below_treeline
  ) as DangerLevel;

  // Determine background color based on danger
  const bgColor = maxDanger >= 4 ? 'bg-red-50 border-red-200' :
                  maxDanger === 3 ? 'bg-orange-50 border-orange-200' :
                  maxDanger === 2 ? 'bg-yellow-50 border-yellow-200' :
                  'bg-green-50 border-green-200';

  const textColor = maxDanger >= 4 ? 'text-red-900' :
                    maxDanger === 3 ? 'text-orange-900' :
                    maxDanger === 2 ? 'text-yellow-900' :
                    'text-green-900';

  const bulletColor = maxDanger >= 4 ? 'text-red-600' :
                      maxDanger === 3 ? 'text-orange-600' :
                      maxDanger === 2 ? 'text-yellow-700' :
                      'text-green-600';

  if (compact) {
    return (
      <div className={`rounded-lg border p-3 ${bgColor}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-sm font-semibold ${textColor}`}>Quick Take</span>
          {trend && trend !== 'steady' && (
            <span
              className="px-1.5 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: TREND_COLORS[trend] + '20',
                color: TREND_COLORS[trend],
              }}
            >
              {getTrendIcon(trend)} {TREND_LABELS[trend]}
            </span>
          )}
        </div>
        <ul className="space-y-1">
          {bullets.map((bullet, i) => (
            <li key={i} className="flex items-start gap-2 text-sm">
              <span className={`font-bold ${bulletColor}`}>•</span>
              <span className={textColor}>{bullet}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border-2 p-4 ${bgColor}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-bold text-lg ${textColor}`}>
          Quick Take
        </h3>
        {trend && trend !== 'steady' && (
          <span
            className="px-2 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: TREND_COLORS[trend] + '20',
              color: TREND_COLORS[trend],
            }}
          >
            {getTrendIcon(trend)} {TREND_LABELS[trend]}
          </span>
        )}
      </div>
      <ul className="space-y-2">
        {bullets.map((bullet, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`font-bold ${bulletColor}`}>•</span>
            <span className={textColor}>{bullet}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
