'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3 } from 'lucide-react';
import { getSeasonBounds, SeasonBounds } from '@/lib/supabase';

function formatSeasonLabel(bounds: SeasonBounds): string {
  const start = new Date(bounds.season_start + 'T12:00:00');
  const end = new Date(bounds.season_end + 'T12:00:00');
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  if (startYear === endYear) return `${startYear}`;
  return `${startYear}-${String(endYear).slice(2)}`;
}

export function SeasonRecapBanner() {
  const [seasonLabel, setSeasonLabel] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const bounds = await getSeasonBounds();
      if (bounds) {
        setSeasonLabel(formatSeasonLabel(bounds));
      }
    }
    load();
  }, []);

  if (!seasonLabel) return null;

  return (
    <Link
      href="/forecast/season"
      className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-slate-300"
    >
      <BarChart3 className="h-5 w-5 flex-shrink-0 text-slate-500" aria-hidden="true" />
      <div className="flex-1">
        <p className="text-sm font-medium text-slate-900">{seasonLabel} season recap</p>
        <p className="text-xs text-slate-500">Danger trends, snowfall totals, and the full season breakdown</p>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
    </Link>
  );
}
