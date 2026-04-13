import { Forecast, DangerLevel, DANGER_LABELS, PROBLEM_LABELS, ProblemType, AvalancheProblem, ForecastTrend } from '@/types/forecast';
import { DBForecast, DBAvalancheProblem, DBWeatherForecast } from '@/lib/supabase';

// Convert DB format to frontend Forecast format
export function convertForecast(
  dbForecast: DBForecast & { avalanche_problems: DBAvalancheProblem[] },
  weather?: DBWeatherForecast
): Forecast {
  return {
    id: dbForecast.id,
    zone: dbForecast.zone_id as 'northwest' | 'southeast',
    issue_date: dbForecast.issue_date,
    valid_date: dbForecast.valid_date,
    danger_alpine: dbForecast.danger_alpine as 1 | 2 | 3 | 4 | 5,
    danger_treeline: dbForecast.danger_treeline as 1 | 2 | 3 | 4 | 5,
    danger_below_treeline: dbForecast.danger_below_treeline as 1 | 2 | 3 | 4 | 5,
    travel_advice: dbForecast.travel_advice || undefined,
    forecast_url: dbForecast.forecast_url || 'https://cbavalanchecenter.org/forecasts/',
    problems: dbForecast.avalanche_problems.map((p): AvalancheProblem => ({
      id: p.id,
      type: p.problem_type as AvalancheProblem['type'],
      aspect_elevation: p.aspect_elevation_rose || {
        N: { alpine: false, treeline: false, below_treeline: false },
        NE: { alpine: false, treeline: false, below_treeline: false },
        E: { alpine: false, treeline: false, below_treeline: false },
        SE: { alpine: false, treeline: false, below_treeline: false },
        S: { alpine: false, treeline: false, below_treeline: false },
        SW: { alpine: false, treeline: false, below_treeline: false },
        W: { alpine: false, treeline: false, below_treeline: false },
        NW: { alpine: false, treeline: false, below_treeline: false },
      },
      likelihood: (p.likelihood || 'Possible') as AvalancheProblem['likelihood'],
      size: (p.size || 'D2') as AvalancheProblem['size'],
    })),
    weather: weather?.metrics ? {
      temperature: weather.metrics.temperature,
      cloud_cover: weather.metrics.cloud_cover,
      wind_speed: weather.metrics.wind_speed,
      wind_direction: weather.metrics.wind_direction,
      snowfall_12hr: weather.metrics.snowfall_12hr,
      snowfall_24hr: weather.metrics.snowfall_24hr,
    } : undefined,
    trend: dbForecast.trend as ForecastTrend | undefined,
    key_message: dbForecast.key_message || undefined,
    confidence: dbForecast.confidence as 'low' | 'moderate' | 'high' | undefined,
    recent_activity_summary: dbForecast.recent_activity_summary || undefined,
    recent_avalanche_count: dbForecast.recent_avalanche_count || undefined,
  };
}

export interface SeasonStats {
  totalDays: number;
  seasonStart: string;
  seasonEnd: string;
  totalSnowfall: number;
  dangerDistribution: Record<number, number>; // danger level -> count of days
  avgDanger: number;
  peakDanger: { level: number; dates: string[] };
  peakDangerPeriod: { start: string; end: string; avgDanger: number } | null;
  problemFrequency: { type: string; label: string; count: number; percentage: number }[];
  windEventDays: number;
  notableStorms: { date: string; snowfall: number }[];
  coldClearDays: number;
  warmestDay: { date: string; temp: number } | null;
  coldestDay: { date: string; temp: number } | null;
}

export function analyzeseason(forecasts: Forecast[]): SeasonStats {
  if (forecasts.length === 0) {
    return {
      totalDays: 0,
      seasonStart: '',
      seasonEnd: '',
      totalSnowfall: 0,
      dangerDistribution: {},
      avgDanger: 0,
      peakDanger: { level: 0, dates: [] },
      peakDangerPeriod: null,
      problemFrequency: [],
      windEventDays: 0,
      notableStorms: [],
      coldClearDays: 0,
      warmestDay: null,
      coldestDay: null,
    };
  }

  // Sort ascending by date for period calculations
  const sorted = [...forecasts].sort((a, b) => a.valid_date.localeCompare(b.valid_date));
  // Deduplicate by date (take first per date — may have two zones)
  const byDate = new Map<string, Forecast[]>();
  for (const f of sorted) {
    const existing = byDate.get(f.valid_date) || [];
    existing.push(f);
    byDate.set(f.valid_date, existing);
  }

  const dates = Array.from(byDate.keys()).sort();
  const totalDays = dates.length;

  // Danger distribution — use max danger across zones per day
  const dangerDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const dailyMaxDangers: { date: string; danger: number }[] = [];

  for (const [date, dayForecasts] of byDate) {
    const maxDanger = Math.max(
      ...dayForecasts.map(f => Math.max(f.danger_alpine, f.danger_treeline, f.danger_below_treeline))
    );
    dangerDistribution[maxDanger] = (dangerDistribution[maxDanger] || 0) + 1;
    dailyMaxDangers.push({ date, danger: maxDanger });
  }

  const avgDanger = dailyMaxDangers.reduce((sum, d) => sum + d.danger, 0) / totalDays;

  // Peak danger
  const maxLevel = Math.max(...dailyMaxDangers.map(d => d.danger));
  const peakDangerDates = dailyMaxDangers.filter(d => d.danger === maxLevel).map(d => d.date);

  // Peak danger period — find longest stretch of Considerable+
  let peakPeriod: { start: string; end: string; avgDanger: number } | null = null;
  let currentStreak: { start: string; end: string; sum: number; count: number } | null = null;
  let bestStreak: { start: string; end: string; sum: number; count: number } | null = null;

  for (const d of dailyMaxDangers) {
    if (d.danger >= 3) {
      if (!currentStreak) {
        currentStreak = { start: d.date, end: d.date, sum: d.danger, count: 1 };
      } else {
        currentStreak.end = d.date;
        currentStreak.sum += d.danger;
        currentStreak.count++;
      }
    } else {
      if (currentStreak && (!bestStreak || currentStreak.count > bestStreak.count)) {
        bestStreak = { ...currentStreak };
      }
      currentStreak = null;
    }
  }
  if (currentStreak && (!bestStreak || currentStreak.count > bestStreak.count)) {
    bestStreak = { ...currentStreak };
  }
  if (bestStreak && bestStreak.count >= 2) {
    peakPeriod = {
      start: bestStreak.start,
      end: bestStreak.end,
      avgDanger: bestStreak.sum / bestStreak.count,
    };
  }

  // Snowfall
  let totalSnowfall = 0;
  const notableStorms: { date: string; snowfall: number }[] = [];

  for (const f of sorted) {
    const snow = parseFloat(f.weather?.snowfall_24hr || '0') || 0;
    totalSnowfall += snow;
    if (snow >= 6) {
      // Avoid duplicate storm entries for same date (two zones)
      if (!notableStorms.some(s => s.date === f.valid_date)) {
        notableStorms.push({ date: f.valid_date, snowfall: snow });
      } else {
        // Take the higher value
        const existing = notableStorms.find(s => s.date === f.valid_date)!;
        existing.snowfall = Math.max(existing.snowfall, snow);
      }
    }
  }
  // Deduplicate snowfall — if two zones on same day, don't double count
  // Recalculate using max per date
  totalSnowfall = 0;
  for (const [, dayForecasts] of byDate) {
    const maxSnow = Math.max(...dayForecasts.map(f => parseFloat(f.weather?.snowfall_24hr || '0') || 0));
    totalSnowfall += maxSnow;
  }
  notableStorms.sort((a, b) => a.date.localeCompare(b.date));

  // Wind events
  let windEventDays = 0;
  for (const [, dayForecasts] of byDate) {
    const hasWind = dayForecasts.some(f => {
      const ws = f.weather?.wind_speed?.toLowerCase() || '';
      return ws.includes('strong') || ws.includes('extreme') || ws.includes('moderate');
    });
    if (hasWind) windEventDays++;
  }

  // Cold/clear days
  let coldClearDays = 0;
  for (const [, dayForecasts] of byDate) {
    const hasColdClear = dayForecasts.some(f => {
      const temp = parseInt(f.weather?.temperature || '0') || 0;
      const sky = f.weather?.cloud_cover?.toLowerCase() || '';
      return temp < 20 && (sky.includes('clear') || sky.includes('sunny'));
    });
    if (hasColdClear) coldClearDays++;
  }

  // Temperature extremes
  let warmestDay: { date: string; temp: number } | null = null;
  let coldestDay: { date: string; temp: number } | null = null;

  for (const f of sorted) {
    const temp = parseInt(f.weather?.temperature || '') || null;
    if (temp === null) continue;
    if (!warmestDay || temp > warmestDay.temp) {
      warmestDay = { date: f.valid_date, temp };
    }
    if (!coldestDay || temp < coldestDay.temp) {
      coldestDay = { date: f.valid_date, temp };
    }
  }

  // Problem type frequency
  const problemCounts = new Map<string, number>();
  for (const [, dayForecasts] of byDate) {
    const dayProblems = new Set<string>();
    for (const f of dayForecasts) {
      for (const p of f.problems) {
        dayProblems.add(p.type);
      }
    }
    for (const type of dayProblems) {
      problemCounts.set(type, (problemCounts.get(type) || 0) + 1);
    }
  }

  const problemFrequency = Array.from(problemCounts.entries())
    .map(([type, count]) => ({
      type,
      label: PROBLEM_LABELS[type as ProblemType] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      count,
      percentage: Math.round((count / totalDays) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalDays,
    seasonStart: dates[0],
    seasonEnd: dates[dates.length - 1],
    totalSnowfall: Math.round(totalSnowfall),
    dangerDistribution,
    avgDanger: Math.round(avgDanger * 10) / 10,
    peakDanger: { level: maxLevel, dates: peakDangerDates },
    peakDangerPeriod: peakPeriod,
    problemFrequency,
    windEventDays,
    notableStorms,
    coldClearDays,
    warmestDay,
    coldestDay,
  };
}
