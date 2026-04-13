'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AvalancheWarningBanner } from '@/components/AvalancheWarningBanner';
import { CombinedDateRow } from '@/components/combined/CombinedDateRow';
import { getForecastsWithWeather, isSupabaseConfigured } from '@/lib/supabase';
import { Forecast } from '@/types/forecast';
import { convertForecast } from '@/lib/forecastAnalysis';

interface GroupedForecast {
  date: string;
  northwest: Forecast | null;
  southeast: Forecast | null;
}

export default function CombinedForecastPage() {
  const [groupedForecasts, setGroupedForecasts] = useState<GroupedForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadForecasts() {
      setLoading(true);
      if (isSupabaseConfigured) {
        // Fetch all forecasts (both zones)
        const { forecasts: data, weatherMap } = await getForecastsWithWeather(undefined, 30);

        // Convert to frontend format
        const converted = data.map(f => {
          const weatherKey = `${f.zone_id}_${f.valid_date}`;
          return convertForecast(f, weatherMap[weatherKey]);
        });

        // Group by date
        const byDate = new Map<string, { northwest?: Forecast; southeast?: Forecast }>();
        for (const forecast of converted) {
          const existing = byDate.get(forecast.valid_date) || {};
          if (forecast.zone === 'northwest') {
            existing.northwest = forecast;
          } else if (forecast.zone === 'southeast') {
            existing.southeast = forecast;
          }
          byDate.set(forecast.valid_date, existing);
        }

        // Convert to sorted array
        const grouped: GroupedForecast[] = Array.from(byDate.entries())
          .map(([date, zones]) => ({
            date,
            northwest: zones.northwest || null,
            southeast: zones.southeast || null,
          }))
          .sort((a, b) => b.date.localeCompare(a.date)); // Descending by date

        setGroupedForecasts(grouped);
      }
      setLoading(false);
    }
    loadForecasts();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading forecasts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Zone selector - matching forecast page style */}
      <div className="flex items-center gap-2">
        <Link
          href="/forecast?zone=southeast"
          className="px-4 py-2 rounded-lg font-medium transition-colors bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
        >
          Southeast
        </Link>
        <Link
          href="/forecast?zone=northwest"
          className="px-4 py-2 rounded-lg font-medium transition-colors bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
        >
          Northwest
        </Link>
        <span className="px-4 py-2 rounded-lg font-medium bg-gray-900 text-white">
          Compare
        </span>
      </div>

      {/* Avalanche Warning Banner (both zones) */}
      <AvalancheWarningBanner />

      {/* Forecast rows */}
      {groupedForecasts.length > 0 ? (
        <div className="space-y-2">
          {groupedForecasts.map((group) => (
            <CombinedDateRow
              key={group.date}
              date={group.date}
              northwest={group.northwest}
              southeast={group.southeast}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No forecast data available.</p>
        </div>
      )}

      {/* Demo mode notice */}
      {!isSupabaseConfigured && (
        <div className="text-center py-2 text-sm text-gray-400">
          Demo mode - Using mock data. Connect Supabase to see real forecasts.
        </div>
      )}
    </div>
  );
}
