'use client';

import { useState, useEffect } from 'react';

interface AvalancheWarning {
  id: string;
  zone: string;
  zoneId: string;
  type: 'warning' | 'watch' | 'special';
  title: string;
  dangerRating: number;
  issuedTime: string;
  expiresTime: string;
  bottomLine: string;
  author: string;
  cbacUrl: string;
}

interface Props {
  zoneFilter?: 'northwest' | 'southeast'; // Optional filter by zone
}

export function AvalancheWarningBanner({ zoneFilter }: Props) {
  const [warnings, setWarnings] = useState<AvalancheWarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchWarnings() {
      try {
        const response = await fetch('/api/warnings');
        const data = await response.json();
        setWarnings(data.warnings || []);
      } catch (error) {
        console.error('Failed to fetch warnings:', error);
      }
      setLoading(false);
    }

    fetchWarnings();
    // Refresh every 5 minutes
    const interval = setInterval(fetchWarnings, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Load dismissed warnings from session storage
  useEffect(() => {
    const stored = sessionStorage.getItem('dismissedWarnings');
    if (stored) {
      setDismissed(new Set(JSON.parse(stored)));
    }
  }, []);

  const handleDismiss = (id: string) => {
    const newDismissed = new Set(dismissed);
    newDismissed.add(id);
    setDismissed(newDismissed);
    sessionStorage.setItem('dismissedWarnings', JSON.stringify([...newDismissed]));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Filter by zone if specified
  const filteredWarnings = warnings.filter((w) => {
    if (dismissed.has(w.id)) return false;
    if (zoneFilter && w.zoneId !== zoneFilter) return false;
    return true;
  });

  if (loading || filteredWarnings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {filteredWarnings.map((warning) => (
        <div
          key={warning.id}
          className="relative bg-red-600 text-white rounded-xl overflow-hidden shadow-lg"
        >
          {/* Main warning content */}
          <div className="p-4">
            <div className="flex items-start gap-3">
              {/* Warning icon */}
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <svg
                  className="w-8 h-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2L1 21h22L12 2zm0 4.5l7.5 12.5h-15L12 6.5zm-1 5.5v4h2v-4h-2zm0 5v2h2v-2h-2z" />
                </svg>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold">{warning.title.toUpperCase()}</h3>
                  <span className="px-2 py-0.5 bg-white/20 rounded text-sm">
                    {warning.zone}
                  </span>
                </div>

                <div className="text-red-100 text-sm mt-1">
                  <span>ISSUED: {formatDate(warning.issuedTime)}</span>
                  {warning.expiresTime && (
                    <>
                      <span className="mx-2">|</span>
                      <span>EXPIRES: {formatDate(warning.expiresTime)}</span>
                    </>
                  )}
                </div>

                {warning.bottomLine && (
                  <p className="mt-2 text-sm text-red-50 line-clamp-2">
                    {warning.bottomLine}
                  </p>
                )}
              </div>

              {/* Dismiss button */}
              <button
                onClick={() => handleDismiss(warning.id)}
                className="flex-shrink-0 p-1 hover:bg-white/20 rounded transition-colors"
                aria-label="Dismiss warning"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Read more button */}
            <div className="mt-3">
              <a
                href={warning.cbacUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-red-700 rounded-lg font-semibold text-sm hover:bg-red-50 transition-colors"
              >
                Read Full Warning on CBAC
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
