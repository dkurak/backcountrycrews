'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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
      className="block rounded-2xl p-5 transition-all shadow-lg hover:shadow-xl hover:scale-[1.01] bg-gradient-to-r from-slate-700 via-blue-800 to-sky-500"
    >
      <div className="flex items-center gap-4">
        <div className="text-3xl">&#x26F7;&#xFE0F;</div>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-white">{seasonLabel} Ski Season Recap</h2>
          <p className="text-sm text-blue-200">Danger trends, snowfall totals, and the full season breakdown</p>
        </div>
        <div className="text-2xl text-white/70">&rarr;</div>
      </div>
    </Link>
  );
}
