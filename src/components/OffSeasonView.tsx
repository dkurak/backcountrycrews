'use client';

import Link from 'next/link';
import { DBWeeklyReport, SeasonBounds } from '@/lib/supabase';

interface OffSeasonViewProps {
  weeklyReport: DBWeeklyReport | null;
  seasonBounds: SeasonBounds | null;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSeasonLabel(bounds: SeasonBounds): string {
  const start = new Date(bounds.season_start + 'T12:00:00');
  const end = new Date(bounds.season_end + 'T12:00:00');
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  if (startYear === endYear) return `${startYear} Season`;
  return `${startYear}-${String(endYear).slice(2)} Season`;
}

export function OffSeasonView({ weeklyReport, seasonBounds }: OffSeasonViewProps) {
  return (
    <div className="space-y-6">
      {/* Off-season banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">*</span>
          <div>
            <h2 className="text-lg font-semibold text-blue-900">Off-Season</h2>
            <p className="text-sm text-blue-700 mt-1">
              CBAC&apos;s daily avalanche forecasts have ended for the season. Weekly condition updates are published periodically.
            </p>
          </div>
        </div>
      </div>

      {/* Latest weekly report */}
      {weeklyReport ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">{weeklyReport.title || 'Weekly Update'}</h2>
            <span className="text-sm text-gray-500">{formatDate(weeklyReport.report_date)}</span>
          </div>
          {weeklyReport.author && (
            <p className="text-xs text-gray-400 mb-3">By {weeklyReport.author}</p>
          )}
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
            {weeklyReport.body}
          </div>
          {weeklyReport.report_url && (
            <a
              href={weeklyReport.report_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              View on CBAC &rarr;
            </a>
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <p className="text-gray-500">No weekly updates available yet. Check back soon.</p>
        </div>
      )}

      {/* Season summary CTA */}
      {seasonBounds && (
        <Link
          href="/forecast/season"
          className="block bg-white border border-gray-200 rounded-xl p-6 hover:border-gray-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                {formatSeasonLabel(seasonBounds)} Summary
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                {formatDate(seasonBounds.season_start)} &mdash; {formatDate(seasonBounds.season_end)}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Danger trends, snowfall totals, problem types, and more from the full season.
              </p>
            </div>
            <span className="text-2xl text-gray-400">&rarr;</span>
          </div>
        </Link>
      )}

      {/* Links */}
      <div className="flex flex-wrap gap-3">
        <a
          href="https://cbavalanchecenter.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          CBAC Website
        </a>
        <Link
          href="/history"
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Browse Past Forecasts
        </Link>
      </div>

      <div className="text-xs text-gray-400">
        Not affiliated with CBAC
      </div>
    </div>
  );
}
