'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DangerPyramid } from '@/components/DangerPyramid';
import { ProblemCard } from '@/components/ProblemCard';
import { ForecastRow } from '@/components/ForecastRow';
import { WeekAnalysis } from '@/components/WeekAnalysis';
import { QuickTake } from '@/components/QuickTake';
import { SkyIcon, WindIcon } from '@/components/WeatherIcons';
import { getForecastsWithWeather, getWeather, isSupabaseConfigured, DBForecast, DBAvalancheProblem, DBWeatherForecast } from '@/lib/supabase';
import { mockForecasts } from '@/lib/mockData';
import { DANGER_LABELS, Forecast, AvalancheProblem, ForecastTrend } from '@/types/forecast';
import Link from 'next/link';

// Convert DB format to frontend format
function convertForecast(
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
    bottom_line: dbForecast.bottom_line || '',
    discussion: dbForecast.discussion || '',
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

function ConditionsTab({ selectedZone }: { selectedZone: 'northwest' | 'southeast' }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadForecasts() {
      setLoading(true);
      if (isSupabaseConfigured) {
        const { forecasts: data, weatherMap } = await getForecastsWithWeather(selectedZone, 14);
        setForecasts(data.map(f => {
          const weatherKey = `${f.zone_id}_${f.valid_date}`;
          return convertForecast(f, weatherMap[weatherKey]);
        }));
      } else {
        setForecasts(mockForecasts.filter((f) => f.zone === selectedZone));
      }
      setLoading(false);
    }
    loadForecasts();
  }, [selectedZone]);

  const currentForecast = forecasts[0];
  const allForecasts = forecasts;

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading forecasts...</p>
      </div>
    );
  }

  if (!currentForecast) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No forecast data available.</p>
      </div>
    );
  }

  const maxDanger = Math.max(
    currentForecast.danger_alpine,
    currentForecast.danger_treeline,
    currentForecast.danger_below_treeline
  );

  const previousForecast = forecasts[1];

  return (
    <div className="space-y-6">
      {/* Current Forecast Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Today&apos;s Forecast</h1>
            <p className="text-gray-500">
              {new Date(currentForecast.valid_date + 'T12:00:00').toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          <div
            className="px-4 py-2 rounded-lg font-bold text-lg"
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
        </div>

        {/* Quick Take - compact version */}
        <div className="mb-4">
          <QuickTake forecast={currentForecast} previousForecast={previousForecast} compact />
        </div>

        {/* Danger visualization - stacked on mobile, side-by-side on desktop */}
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8 mb-6">
          <div className="text-center flex-shrink-0">
            <DangerPyramid
              alpine={currentForecast.danger_alpine}
              treeline={currentForecast.danger_treeline}
              belowTreeline={currentForecast.danger_below_treeline}
              size="lg"
            />
            <div className="mt-2 text-xs text-gray-500">
              <div>Alpine - Treeline - BTL</div>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Bottom Line
            </h2>
            <p className="text-gray-700 leading-relaxed text-sm">{currentForecast.bottom_line}</p>
          </div>
        </div>

        {/* Avalanche Problems */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Avalanche Problems ({currentForecast.problems.length})
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {currentForecast.problems.map((problem, idx) => (
              <ProblemCard key={problem.id} problem={problem} index={idx + 1} />
            ))}
          </div>
        </div>

        {/* Forecast Discussion */}
        {currentForecast.discussion && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
              Forecast Discussion
            </h2>
            <div className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
              {currentForecast.discussion}
            </div>
          </div>
        )}
      </div>

      {/* What's Changed */}
      {forecasts.length > 1 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h2 className="font-semibold text-blue-900 mb-2">What&apos;s Changed</h2>
          <p className="text-sm text-blue-800">
            {currentForecast.danger_alpine !== forecasts[1]?.danger_alpine && (
              <span>
                Alpine danger{' '}
                {currentForecast.danger_alpine > (forecasts[1]?.danger_alpine || 0)
                  ? 'increased'
                  : 'decreased'}{' '}
                from {forecasts[1]?.danger_alpine} to {currentForecast.danger_alpine}.{' '}
              </span>
            )}
            {currentForecast.problems.length !== forecasts[1]?.problems.length && (
              <span>
                {currentForecast.problems.length > (forecasts[1]?.problems.length || 0)
                  ? 'New avalanche problem added.'
                  : 'Avalanche problem resolved.'}{' '}
              </span>
            )}
            {currentForecast.danger_alpine === forecasts[1]?.danger_alpine &&
              currentForecast.problems.length === forecasts[1]?.problems.length && (
                <span>Conditions similar to yesterday.</span>
              )}
          </p>
        </div>
      )}

      {/* 7-Day Analysis */}
      {forecasts.length >= 7 && <WeekAnalysis forecasts={forecasts} />}

      {/* Recent History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Recent Forecasts</h2>
          <Link
            href={`/history?zone=${selectedZone}`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            View all history
          </Link>
        </div>
        <div className="space-y-2">
          {allForecasts.map((forecast, index) => (
            <ForecastRow
              key={forecast.id}
              forecast={forecast}
              previousForecast={allForecasts[index + 1]}
              weekForecasts={allForecasts.slice(index, index + 7)}
              expanded={expandedId === forecast.id}
              onToggle={() => setExpandedId(expandedId === forecast.id ? null : forecast.id)}
            />
          ))}
        </div>
      </div>

      {/* CBAC Card */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-2xl">⛰️</div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">Crested Butte Avalanche Center</div>
            <div className="text-sm text-gray-600">
              Official forecast source for this zone
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://cbavalanchecenter.org/forecasts/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            Full Forecast
          </a>
          <a
            href="https://cbavalanchecenter.org/observations/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            Observations
          </a>
          <a
            href="https://cbavalanchecenter.org/avalanches/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            Avalanches
          </a>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          Not affiliated with CBAC
        </div>
      </div>

      {/* Snowpack Card */}
      <a
        href="https://nwcc-apps.sc.egov.usda.gov/awdb/site-plots/POR/WTEQ/CO/Butte.html"
        target="_blank"
        rel="noopener noreferrer"
        className="block bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200 p-4 hover:border-blue-300 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-2xl">🏔️</div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">Gunnison Basin Snowpack</div>
            <div className="text-sm text-gray-600">
              NRCS SNOTEL Snow Water Equivalent - Historical comparison chart
            </div>
          </div>
          <div className="text-blue-500 text-sm font-medium">
            View Chart
          </div>
        </div>
      </a>

      {/* Demo mode notice */}
      {!isSupabaseConfigured && (
        <div className="text-center py-2 text-sm text-gray-400">
          Demo mode - Using mock data. Connect Supabase to see real forecasts.
        </div>
      )}
    </div>
  );
}

function WeatherTab({ selectedZone }: { selectedZone: 'northwest' | 'southeast' }) {
  const [weather, setWeather] = useState<DBWeatherForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWeather() {
      setLoading(true);
      if (isSupabaseConfigured) {
        const data = await getWeather(selectedZone, 30);
        setWeather(data);
      }
      setLoading(false);
    }
    loadWeather();
  }, [selectedZone]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalSnow = weather.reduce((acc, w) => {
    const snow = parseFloat(w.metrics?.snowfall_24hr || '0') || 0;
    return acc + snow;
  }, 0);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading weather...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Weather History</h1>
        <p className="text-gray-500">
          {weather.length} days of weather data
          {totalSnow > 0 && ` - ${totalSnow}" total snowfall`}
        </p>
      </div>

      {/* Weather table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Temp</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Sky</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">Wind</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">12hr Snow</th>
                <th className="px-4 py-3 text-center font-semibold text-gray-700">24hr Snow</th>
              </tr>
            </thead>
            <tbody>
              {weather.map((w, index) => {
                const hasSnow = w.metrics?.snowfall_24hr && w.metrics.snowfall_24hr !== '0';
                const prevWeather = weather[index + 1];
                const tempChange = prevWeather?.metrics?.temperature && w.metrics?.temperature
                  ? parseInt(w.metrics.temperature) - parseInt(prevWeather.metrics.temperature)
                  : null;

                return (
                  <tr
                    key={w.id}
                    className={`border-b border-gray-100 ${hasSnow ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {formatDate(w.forecast_date)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium">{w.metrics?.temperature || '-'}°F</span>
                      {tempChange !== null && tempChange !== 0 && (
                        <span className={`ml-1 text-xs ${tempChange > 0 ? 'text-red-500' : 'text-blue-500'}`}>
                          {tempChange > 0 ? '↑' : '↓'}{Math.abs(tempChange)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {w.metrics?.cloud_cover ? (
                        <div className="flex items-center justify-center gap-1" title={w.metrics.cloud_cover}>
                          <SkyIcon cloudCover={w.metrics.cloud_cover} />
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">
                      {w.metrics?.wind_direction && w.metrics?.wind_speed ? (
                        <div className="flex items-center justify-center" title={`${w.metrics.wind_direction} ${w.metrics.wind_speed}`}>
                          <WindIcon direction={w.metrics.wind_direction} speed={w.metrics.wind_speed} />
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {w.metrics?.snowfall_12hr && w.metrics.snowfall_12hr !== '0' ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                          {w.metrics.snowfall_12hr}&quot;
                        </span>
                      ) : (
                        <span className="text-gray-400">0&quot;</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {w.metrics?.snowfall_24hr && w.metrics.snowfall_24hr !== '0' ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                          {w.metrics.snowfall_24hr}&quot;
                        </span>
                      ) : (
                        <span className="text-gray-400">0&quot;</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {weather.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No weather data available.</p>
        </div>
      )}

      {/* CBAC Card */}
      <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-2xl">⛰️</div>
          <div className="flex-1">
            <div className="font-semibold text-gray-900">Crested Butte Avalanche Center</div>
            <div className="text-sm text-gray-600">
              Official weather data source for this zone
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://cbavalanchecenter.org/forecasts/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            Full Forecast
          </a>
          <a
            href="https://cbavalanchecenter.org/observations/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            Observations
          </a>
          <a
            href="https://cbavalanchecenter.org/avalanches/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            Avalanches
          </a>
        </div>
        <div className="mt-3 text-xs text-gray-400">
          Not affiliated with CBAC
        </div>
      </div>
    </div>
  );
}

function ForecastContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const zoneParam = searchParams.get('zone');
  const tabParam = searchParams.get('tab');
  const initialZone = (zoneParam === 'northwest' || zoneParam === 'southeast') ? zoneParam : 'southeast';
  const initialTab = (tabParam === 'weather') ? 'weather' : 'conditions';

  const [selectedZone, setSelectedZone] = useState<'northwest' | 'southeast'>(initialZone);
  const [activeTab, setActiveTab] = useState<'conditions' | 'weather'>(initialTab);

  const handleZoneChange = (zone: 'northwest' | 'southeast') => {
    setSelectedZone(zone);
    const params = new URLSearchParams();
    params.set('zone', zone);
    if (activeTab !== 'conditions') params.set('tab', activeTab);
    router.push(`/forecast?${params.toString()}`, { scroll: false });
  };

  const handleTabChange = (tab: 'conditions' | 'weather') => {
    setActiveTab(tab);
    const params = new URLSearchParams();
    params.set('zone', selectedZone);
    if (tab !== 'conditions') params.set('tab', tab);
    router.push(`/forecast?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      {/* Zone selector */}
      <div className="flex gap-2">
        <button
          onClick={() => handleZoneChange('southeast')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedZone === 'southeast'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Southeast
        </button>
        <button
          onClick={() => handleZoneChange('northwest')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedZone === 'northwest'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Northwest
        </button>
      </div>

      {/* Tab selector */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => handleTabChange('conditions')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'conditions'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Conditions
        </button>
        <button
          onClick={() => handleTabChange('weather')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'weather'
              ? 'border-gray-900 text-gray-900'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Weather
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'conditions' ? (
        <ConditionsTab selectedZone={selectedZone} />
      ) : (
        <WeatherTab selectedZone={selectedZone} />
      )}
    </div>
  );
}

export default function ForecastPage() {
  return (
    <Suspense fallback={<div className="text-center py-12"><p className="text-gray-500">Loading...</p></div>}>
      <ForecastContent />
    </Suspense>
  );
}
