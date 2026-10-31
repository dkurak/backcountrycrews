'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import {
  getForecastsWithWeather,
  getLatestWeeklyReport,
  CURRENT_SEASON_LABEL,
  DBForecast,
  DBWeeklyReport,
  SeasonMode,
} from '@/lib/supabase';
import { DANGER_COLORS, DANGER_LABELS, DangerLevel } from '@/types/forecast';

const ZONE_LABELS: Record<string, string> = {
  southeast: 'Southeast Mountains',
  northwest: 'Northwest Mountains',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function excerpt(text: string, max = 320): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')) + '…';
}

function DangerChip({ label, level }: { label: string; level: number }) {
  const lvl = (level >= 1 && level <= 5 ? level : 1) as DangerLevel;
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: DANGER_COLORS[lvl] }}
        aria-hidden="true"
      />
      <span>
        {label}: <span className="font-medium text-slate-900">{DANGER_LABELS[lvl]}</span>
      </span>
    </div>
  );
}

function ZoneForecast({ forecast }: { forecast: DBForecast }) {
  const summary = forecast.key_message || forecast.bottom_line;
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{ZONE_LABELS[forecast.zone_id] || forecast.zone_name}</h3>
        <span className="text-xs text-slate-500">{formatDate(forecast.valid_date)}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
        <DangerChip label="Alpine" level={forecast.danger_alpine} />
        <DangerChip label="Treeline" level={forecast.danger_treeline} />
        <DangerChip label="Below treeline" level={forecast.danger_below_treeline} />
      </div>
      {summary && <p className="mt-3 text-sm leading-relaxed text-slate-600">{excerpt(summary, 220)}</p>}
    </div>
  );
}

export function LatestForecastCard({ mode }: { mode: SeasonMode }) {
  const [forecasts, setForecasts] = useState<DBForecast[]>([]);
  const [report, setReport] = useState<DBWeeklyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (mode === 'active') {
        const { forecasts: rows } = await getForecastsWithWeather(undefined, 6);
        const latestByZone = new Map<string, DBForecast>();
        for (const f of rows) {
          if (!latestByZone.has(f.zone_id)) latestByZone.set(f.zone_id, f);
        }
        setForecasts([...latestByZone.values()].sort((a, b) => a.zone_id.localeCompare(b.zone_id)).reverse());
      } else {
        setReport(await getLatestWeeklyReport());
      }
      setLoading(false);
    }
    load();
  }, [mode]);

  const active = mode === 'active';
  const heading = active ? 'Latest avalanche forecast' : `Early season ${CURRENT_SEASON_LABEL}`;
  const cta = active ? 'View full forecast' : 'Read the full update';

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="px-6 pt-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{heading}</p>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : active && forecasts.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {forecasts.map((f) => (
              <ZoneForecast key={f.id} forecast={f} />
            ))}
          </div>
        ) : report ? (
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xl font-semibold text-slate-900">{report.title || 'Weekly update'}</h2>
              <span className="text-xs text-slate-500">{formatDate(report.report_date)}</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{excerpt(report.body)}</p>
            <p className="mt-3 text-xs text-slate-500">
              CBAC is posting weekly summaries. Daily forecasts will appear here once they begin.
            </p>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No forecast available yet. Check back soon.</p>
        )}
      </div>

      <div className="border-t border-slate-100 px-6 py-3">
        <Link
          href="/forecast"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 hover:text-sky-700"
        >
          {cta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
