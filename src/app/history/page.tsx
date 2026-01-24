'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ForecastRow } from '@/components/ForecastRow';
import { getForecastsWithWeather, isSupabaseConfigured, DBForecast, DBAvalancheProblem, DBWeatherForecast } from '@/lib/supabase';
import { Forecast, AvalancheProblem } from '@/types/forecast';
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
  };
}

function HistoryPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const zoneParam = searchParams.get('zone');
  const initialZone = (zoneParam === 'northwest' || zoneParam === 'southeast') ? zoneParam : 'southeast';

  const [selectedZone, setSelectedZone] = useState<'northwest' | 'southeast'>(initialZone);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);

  const handleZoneChange = (zone: 'northwest' | 'southeast') => {
    setSelectedZone(zone);
    router.push(`/history?zone=${zone}`, { scroll: false });
  };

  useEffect(() => {
    async function loadForecasts() {
      setLoading(true);
      if (isSupabaseConfigured) {
        const { forecasts: data, weatherMap } = await getForecastsWithWeather(selectedZone, 60);
        setForecasts(data.map(f => {
          const weatherKey = `${f.zone_id}_${f.valid_date}`;
          return convertForecast(f, weatherMap[weatherKey]);
        }));
      }
      setLoading(false);
    }
    loadForecasts();
  }, [selectedZone]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Forecast History</h1>
          <p className="text-gray-500">All available forecasts ({forecasts.length} days)</p>
        </div>
        <Link
          href={`/?zone=${selectedZone}`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to Dashboard
        </Link>
      </div>

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

      {/* Forecast list */}
      <div className="space-y-2">
        {forecasts.map((forecast, index) => (
          <ForecastRow
            key={forecast.id}
            forecast={forecast}
            previousForecast={forecasts[index + 1]}
            weekForecasts={forecasts.slice(index, index + 7)}
            expanded={expandedId === forecast.id}
            onToggle={() => setExpandedId(expandedId === forecast.id ? null : forecast.id)}
          />
        ))}
      </div>

      {forecasts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No forecast history available.</p>
        </div>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="text-center py-12"><p className="text-gray-500">Loading...</p></div>}>
      <HistoryPageContent />
    </Suspense>
  );
}
