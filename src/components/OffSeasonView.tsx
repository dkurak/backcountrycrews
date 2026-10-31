'use client';

import Link from 'next/link';
import { DBWeeklyReport, SeasonBounds, SeasonMode, CURRENT_SEASON_LABEL } from '@/lib/supabase';
import { SeasonRecapBanner } from '@/components/SeasonRecapBanner';

interface OffSeasonViewProps {
  mode: Exclude<SeasonMode, 'active'>;
  reports: DBWeeklyReport[];
  seasonBounds: SeasonBounds | null;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function ReportBody({ report }: { report: DBWeeklyReport }) {
  return (
    <>
      {report.author && <p className="text-xs text-gray-400 mb-3">By {report.author}</p>}
      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">{report.body}</div>
      {report.report_url && (
        <a
          href={report.report_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 text-sm font-medium text-sky-700 hover:text-sky-900"
        >
          View on CBAC &rarr;
        </a>
      )}
    </>
  );
}

export function OffSeasonView({ mode, reports, seasonBounds }: OffSeasonViewProps) {
  const [latest, ...earlier] = reports;
  const early = mode === 'early';

  return (
    <div className="space-y-6">
      {/* Season status banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-slate-900">
          {early ? `Early Season ${CURRENT_SEASON_LABEL}` : 'Off-Season'}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          {early
            ? "CBAC is publishing weekly conditions updates. Daily avalanche forecasts start once the snowpack is ready, and they'll appear here automatically."
            : "CBAC's daily avalanche forecasts have ended for the season. Weekly condition updates are published periodically."}
        </p>
      </div>

      {/* Latest weekly report */}
      {latest ? (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">{latest.title || 'Weekly Update'}</h2>
            <span className="text-sm text-gray-500">{formatDate(latest.report_date)}</span>
          </div>
          <ReportBody report={latest} />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center">
          <p className="text-gray-500">No weekly updates available yet. Check back soon.</p>
        </div>
      )}

      {/* Earlier updates this season */}
      {earlier.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">Earlier this season</h3>
          {earlier.map((report) => (
            <details key={report.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <summary className="cursor-pointer text-sm font-medium text-gray-900">
                {report.title || 'Weekly Update'} &middot; {formatDate(report.report_date)}
              </summary>
              <div className="mt-3">
                <ReportBody report={report} />
              </div>
            </details>
          ))}
        </div>
      )}

      {/* Last season's recap */}
      <SeasonRecapBanner />

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
