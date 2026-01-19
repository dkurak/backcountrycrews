'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DangerPyramid } from '@/components/DangerPyramid';
import { ProblemCard } from '@/components/ProblemCard';
import { ForecastRow } from '@/components/ForecastRow';
import { WeekAnalysis } from '@/components/WeekAnalysis';
import { getForecastsWithWeather, isSupabaseConfigured, DBForecast, DBAvalancheProblem, DBWeatherForecast } from '@/lib/supabase';
import { mockForecasts, getMockForecast } from '@/lib/mockData';
import { DANGER_LABELS, Forecast, AvalancheProblem } from '@/types/forecast';
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
  };
}

function DashboardContent() {
  // Inner component that uses useSearchParams
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get zone from URL or default to southeast
  const zoneParam = searchParams.get('zone');
  const initialZone = (zoneParam === 'northwest' || zoneParam === 'southeast') ? zoneParam : 'southeast';

  const [selectedZone, setSelectedZone] = useState<'northwest' | 'southeast'>(initialZone);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);

  // Update URL when zone changes
  const handleZoneChange = (zone: 'northwest' | 'southeast') => {
    setSelectedZone(zone);
    router.push(`/?zone=${zone}`, { scroll: false });
  };

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
        // Fall back to mock data
        setForecasts(mockForecasts.filter((f) => f.zone === selectedZone));
      }
      setLoading(false);
    }
    loadForecasts();
  }, [selectedZone]);

  // Get current and all forecasts (including today in the list)
  const currentForecast = forecasts[0];
  const allForecasts = forecasts; // Show all including today in the history list

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
              <div>Alpine • Treeline • BTL</div>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">
              Bottom Line
            </h2>
            <p className="text-gray-700 leading-relaxed">{currentForecast.bottom_line}</p>
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
            View all history →
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
            View Chart →
          </div>
        </div>
      </a>

      {/* Quick links */}
      <div className="flex justify-center gap-4 py-4">
        <Link
          href={`/history?zone=${selectedZone}`}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Full History
        </Link>
        <span className="text-gray-300">•</span>
        <Link
          href={`/weather?zone=${selectedZone}`}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Weather Table
        </Link>
        <span className="text-gray-300">•</span>
        <a
          href="https://cbavalanchecenter.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          CBAC Official
        </a>
      </div>

      {/* Data source notice */}
      <div className="text-center py-2 text-sm text-gray-400">
        {isSupabaseConfigured
          ? `Showing ${forecasts.length} days of CBAC forecast data`
          : 'Demo mode - Using mock data. Connect Supabase to see real forecasts.'}
      </div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={<div className="text-center py-12"><p className="text-gray-500">Loading...</p></div>}>
      <DashboardContent />
    </Suspense>
  );
}
