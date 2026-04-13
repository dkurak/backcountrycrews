'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { getSeasonBounds, getSeasonForecasts, listSeasons, SeasonBounds, SeasonInfo } from '@/lib/supabase';
import { Forecast } from '@/types/forecast';
import { convertForecast, analyzeseason } from '@/lib/forecastAnalysis';
import { SeasonAnalysis } from '@/components/SeasonAnalysis';

function formatSeasonLabel(bounds: { season_start: string; season_end: string }): string {
  const start = new Date(bounds.season_start + 'T12:00:00');
  const end = new Date(bounds.season_end + 'T12:00:00');
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  if (startYear === endYear) return `${startYear} Season`;
  return `${startYear}-${String(endYear).slice(2)} Season`;
}

const MONTH_LABELS: Record<number, string> = {
  0: 'Jan', 1: 'Feb', 2: 'Mar', 3: 'Apr', 4: 'May', 5: 'Jun',
  6: 'Jul', 7: 'Aug', 8: 'Sep', 9: 'Oct', 10: 'Nov', 11: 'Dec',
};

export default function SeasonPage() {
  const [seasons, setSeasons] = useState<SeasonInfo[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<SeasonBounds | null>(null);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // '' = all, '2026-01' = Jan 2026
  const [allForecasts, setAllForecasts] = useState<Forecast[]>([]);
  const [loading, setLoading] = useState(true);

  // Load available seasons
  useEffect(() => {
    async function load() {
      const allSeasons = await listSeasons();
      setSeasons(allSeasons);
      if (allSeasons.length > 0) {
        const latest = allSeasons[0];
        setSelectedSeason({ season_start: latest.season_start, season_end: latest.season_end });
      }
      setLoading(false);
    }
    load();
  }, []);

  // Load forecast data when season or zone changes
  useEffect(() => {
    if (!selectedSeason) return;

    async function loadData() {
      setLoading(true);
      setSelectedMonth(''); // Reset month filter on season/zone change
      const { forecasts: dbForecasts, weatherMap } = await getSeasonForecasts(
        selectedSeason!.season_start,
        selectedSeason!.season_end,
        selectedZone || undefined
      );

      const forecasts = dbForecasts.map(f => {
        const weatherKey = `${f.zone_id}_${f.valid_date}`;
        return convertForecast(f, weatherMap[weatherKey]);
      });

      setAllForecasts(forecasts);
      setLoading(false);
    }
    loadData();
  }, [selectedSeason, selectedZone]);

  // Derive available months from data
  const availableMonths = useMemo(() => {
    const months = new Map<string, string>(); // '2026-01' -> 'Jan'
    for (const f of allForecasts) {
      const date = new Date(f.valid_date + 'T12:00:00');
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months.has(key)) {
        months.set(key, `${MONTH_LABELS[date.getMonth()]}`);
      }
    }
    // Sort chronologically
    return Array.from(months.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allForecasts]);

  // Filter forecasts by selected month and compute stats
  const stats = useMemo(() => {
    if (allForecasts.length === 0) return null;
    const filtered = selectedMonth
      ? allForecasts.filter(f => f.valid_date.startsWith(selectedMonth))
      : allForecasts;
    if (filtered.length === 0) return null;
    return analyzeseason(filtered);
  }, [allForecasts, selectedMonth]);

  const handleSeasonChange = (idx: number) => {
    const s = seasons[idx];
    setSelectedSeason({ season_start: s.season_start, season_end: s.season_end });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {selectedSeason ? formatSeasonLabel(selectedSeason) : 'Season'} Summary
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {selectedMonth
              ? `${availableMonths.find(([k]) => k === selectedMonth)?.[1] || ''} analysis from CBAC daily forecasts`
              : 'Full-season analysis from CBAC daily forecasts'}
          </p>
        </div>
        <Link
          href="/forecast"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          &larr; Back to Forecast
        </Link>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Season selector */}
        {seasons.length > 1 && (
          <select
            value={seasons.findIndex(s =>
              s.season_start === selectedSeason?.season_start && s.season_end === selectedSeason?.season_end
            )}
            onChange={(e) => handleSeasonChange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
          >
            {seasons.map((s, idx) => (
              <option key={idx} value={idx}>
                {formatSeasonLabel(s)} ({s.forecast_count} days)
              </option>
            ))}
          </select>
        )}

        {/* Zone filter */}
        <div className="flex gap-1">
          {[
            { value: '', label: 'Both Zones' },
            { value: 'southeast', label: 'Southeast' },
            { value: 'northwest', label: 'Northwest' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setSelectedZone(opt.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedZone === opt.value
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Month filter */}
      {availableMonths.length > 1 && (
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedMonth('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedMonth === ''
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All
          </button>
          {availableMonths.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedMonth(key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedMonth === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading season data...</p>
        </div>
      ) : stats ? (
        <SeasonAnalysis stats={stats} />
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">No season data available.</p>
        </div>
      )}
    </div>
  );
}
