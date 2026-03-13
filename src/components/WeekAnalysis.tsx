'use client';

import { Forecast } from '@/types/forecast';

interface WeekAnalysisProps {
  forecasts: Forecast[]; // Most recent first, at least 7 days
  days?: 7 | 14;
}

export interface AnalysisInsight {
  type: 'snow' | 'wind' | 'temp' | 'danger' | 'problem' | 'stability';
  icon: string;
  title: string;
  detail: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

export function analyzeWeek(forecasts: Forecast[], days = 7): AnalysisInsight[] {
  if (forecasts.length < 2) return [];

  const insights: AnalysisInsight[] = [];
  const week = forecasts.slice(0, days);
  const today = week[0];

  // Calculate totals and trends
  let totalSnow = 0;
  let windDays = 0;
  let coldClearDays = 0;
  let warmingTrend = false;
  let coolingTrend = false;
  let dangerIncreased = false;
  let dangerDecreased = false;

  const temps: number[] = [];
  const maxDangers: number[] = [];

  for (const f of week) {
    // Snow totals
    const snow24 = parseFloat(f.weather?.snowfall_24hr || '0') || 0;
    totalSnow += snow24;

    // Wind events
    const windSpeed = f.weather?.wind_speed?.toLowerCase() || '';
    if (windSpeed.includes('strong') || windSpeed.includes('extreme') || windSpeed.includes('moderate')) {
      windDays++;
    }

    // Cold clear days (faceting conditions)
    const temp = parseInt(f.weather?.temperature || '0') || 0;
    const sky = f.weather?.cloud_cover?.toLowerCase() || '';
    if (temp < 20 && (sky.includes('clear') || sky.includes('sunny'))) {
      coldClearDays++;
    }

    temps.push(temp);
    maxDangers.push(Math.max(f.danger_alpine, f.danger_treeline, f.danger_below_treeline));
  }

  // Temperature trend (compare first half to second half of week)
  if (temps.length >= 4) {
    const recentAvg = temps.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const olderAvg = temps.slice(3, 6).reduce((a, b) => a + b, 0) / Math.min(3, temps.length - 3);
    if (recentAvg > olderAvg + 5) warmingTrend = true;
    if (recentAvg < olderAvg - 5) coolingTrend = true;
  }

  // Danger trend
  if (maxDangers.length >= 2) {
    if (maxDangers[0] > maxDangers[maxDangers.length - 1]) dangerIncreased = true;
    if (maxDangers[0] < maxDangers[maxDangers.length - 1]) dangerDecreased = true;
  }

  // Count days since last significant snow
  let daysSinceSnow = 0;
  for (const f of week) {
    const snow = parseFloat(f.weather?.snowfall_24hr || '0') || 0;
    if (snow >= 3) break;
    daysSinceSnow++;
  }

  // Problem type analysis
  const currentProblems = new Set(today.problems.map(p => p.type));
  const hadPersistentSlab = week.some(f => f.problems.some(p => p.type === 'persistent_slab'));
  const hadWindSlab = week.some(f => f.problems.some(p => p.type === 'wind_slab'));
  const hadStormSlab = week.some(f => f.problems.some(p => p.type === 'storm_slab'));

  // Generate insights

  // Snow summary
  if (totalSnow > 0) {
    insights.push({
      type: 'snow',
      icon: '❄️',
      title: `${totalSnow}" in the last ${week.length} days`,
      detail: totalSnow >= 12
        ? 'Significant loading on the snowpack. New and wind slabs likely.'
        : totalSnow >= 6
        ? 'Moderate new snow has added stress to the snowpack.'
        : 'Light snowfall. Minimal additional loading.',
      sentiment: totalSnow >= 12 ? 'negative' : 'neutral',
    });
  } else {
    insights.push({
      type: 'snow',
      icon: '☀️',
      title: 'Dry spell continues',
      detail: `${daysSinceSnow}+ days without significant snowfall. Slopes are adjusting but surface conditions may be deteriorating.`,
      sentiment: 'neutral',
    });
  }

  // Wind loading
  if (windDays >= 3) {
    insights.push({
      type: 'wind',
      icon: '💨',
      title: `${windDays} days of notable wind`,
      detail: 'Persistent wind loading has formed slabs on lee aspects. Cross-loaded features may hold stubborn slabs.',
      sentiment: 'negative',
    });
  } else if (windDays > 0 && hadWindSlab) {
    insights.push({
      type: 'wind',
      icon: '💨',
      title: 'Recent wind event',
      detail: 'Wind slabs formed on lee terrain. These typically become stubborn to trigger but persist due to poor bonding.',
      sentiment: 'negative',
    });
  }

  // Faceting conditions
  if (coldClearDays >= 3) {
    insights.push({
      type: 'temp',
      icon: '🥶',
      title: `${coldClearDays} cold, clear days`,
      detail: 'Extended cold/clear conditions promote faceting (weak layer formation) on shaded aspects. Near-surface facets may become a future problem.',
      sentiment: 'negative',
    });
  }

  // Temperature trends
  if (warmingTrend) {
    insights.push({
      type: 'temp',
      icon: '🌡️',
      title: 'Warming trend',
      detail: 'Temperatures rising. Gradual warming can help stabilize the snowpack, but rapid warming increases wet avalanche concern.',
      sentiment: 'neutral',
    });
  } else if (coolingTrend) {
    insights.push({
      type: 'temp',
      icon: '🌡️',
      title: 'Cooling trend',
      detail: 'Temperatures dropping. Cold temps slow stabilization and promote faceting on shaded slopes.',
      sentiment: 'neutral',
    });
  }

  // Danger trend
  if (dangerDecreased) {
    insights.push({
      type: 'danger',
      icon: '📉',
      title: 'Danger trending down',
      detail: 'Avalanche danger has decreased over the period. Snowpack is adjusting, but isolated pockets of instability may persist.',
      sentiment: 'positive',
    });
  } else if (dangerIncreased) {
    insights.push({
      type: 'danger',
      icon: '📈',
      title: 'Danger increased',
      detail: 'Avalanche danger has risen. Recent loading or weather changes have stressed the snowpack.',
      sentiment: 'negative',
    });
  }

  // Persistent slab warning
  if (hadPersistentSlab && currentProblems.has('persistent_slab')) {
    insights.push({
      type: 'problem',
      icon: '⚠️',
      title: 'Persistent slab ongoing',
      detail: 'Persistent slab problems remain active. These can produce large avalanches with low probability triggers. Give suspect slopes extra margin.',
      sentiment: 'negative',
    });
  }

  // Stability assessment
  const avgDanger = maxDangers.reduce((a, b) => a + b, 0) / maxDangers.length;
  if (avgDanger <= 1.5 && totalSnow < 3 && windDays < 2) {
    insights.push({
      type: 'stability',
      icon: '✅',
      title: 'Generally stable conditions',
      detail: 'Low danger with minimal recent loading. Good conditions for conservative terrain choices. Always assess local conditions.',
      sentiment: 'positive',
    });
  } else if (avgDanger >= 3) {
    insights.push({
      type: 'stability',
      icon: '🔴',
      title: 'Elevated instability',
      detail: 'Sustained higher danger levels. Natural and human-triggered avalanches have been occurring. Careful terrain selection essential.',
      sentiment: 'negative',
    });
  }

  return insights;
}

export function WeekAnalysis({ forecasts, days = 7 }: WeekAnalysisProps) {
  const insights = analyzeWeek(forecasts, days);

  if (insights.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{days}-Day Analysis</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">AI Summary*</span>
      </div>

      <div className="space-y-3">
        {insights.map((insight, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg border ${
              insight.sentiment === 'negative'
                ? 'bg-red-50 border-red-200'
                : insight.sentiment === 'positive'
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">{insight.icon}</span>
              <div>
                <div className="font-medium text-gray-900">{insight.title}</div>
                <div className="text-sm text-gray-600 mt-0.5">{insight.detail}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-4">
        *Analysis based on weather patterns and avalanche science principles.
        Always check the official CBAC forecast and make your own terrain decisions.
      </p>
    </div>
  );
}
