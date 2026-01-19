'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { getWeather, isSupabaseConfigured, DBWeatherForecast } from '@/lib/supabase';
import { SkyIcon, WindIcon } from '@/components/WeatherIcons';
import Link from 'next/link';

function WeatherPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const zoneParam = searchParams.get('zone');
  const initialZone = (zoneParam === 'northwest' || zoneParam === 'southeast') ? zoneParam : 'southeast';

  const [selectedZone, setSelectedZone] = useState<'northwest' | 'southeast'>(initialZone);
  const [weather, setWeather] = useState<DBWeatherForecast[]>([]);
  const [loading, setLoading] = useState(true);

  const handleZoneChange = (zone: 'northwest' | 'southeast') => {
    setSelectedZone(zone);
    router.push(`/weather?zone=${zone}`, { scroll: false });
  };

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

  // Calculate snow totals
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weather History</h1>
          <p className="text-gray-500">
            {weather.length} days of weather data
            {totalSnow > 0 && ` • ${totalSnow}" total snowfall`}
          </p>
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
    </div>
  );
}

export default function WeatherPage() {
  return (
    <Suspense fallback={<div className="text-center py-12"><p className="text-gray-500">Loading...</p></div>}>
      <WeatherPageContent />
    </Suspense>
  );
}
