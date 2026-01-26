'use client';

import { Forecast } from '@/types/forecast';
import { ZoneForecastCell } from './ZoneForecastCell';

interface CombinedDateRowProps {
  date: string;
  northwest: Forecast | null;
  southeast: Forecast | null;
}

export function CombinedDateRow({ date, northwest, southeast }: CombinedDateRowProps) {
  const dateObj = new Date(date + 'T12:00:00');
  const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
  const monthDay = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const isToday = (() => {
    const today = new Date();
    return dateObj.toDateString() === today.toDateString();
  })();

  return (
    <div
      className={`bg-white rounded-lg border ${
        isToday ? 'border-blue-300 shadow-sm' : 'border-gray-200'
      } p-3`}
    >
      {/* Desktop layout */}
      <div className="hidden md:grid md:grid-cols-[100px_1fr_1fr] md:gap-4 md:items-center">
        {/* Date cell */}
        <div className="flex flex-col">
          <span className={`text-sm font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
            {isToday ? 'Today' : dayName}
          </span>
          <span className="text-xs text-gray-500">{monthDay}</span>
        </div>

        {/* Northwest cell */}
        <div className="border-l border-gray-200 pl-4">
          <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Northwest</div>
          <ZoneForecastCell forecast={northwest} zoneName="Northwest" />
        </div>

        {/* Southeast cell */}
        <div className="border-l border-gray-200 pl-4">
          <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Southeast</div>
          <ZoneForecastCell forecast={southeast} zoneName="Southeast" />
        </div>
      </div>

      {/* Mobile layout - stacked */}
      <div className="md:hidden space-y-3">
        {/* Date header */}
        <div className={`font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>
          {isToday ? 'Today' : dayName}, {monthDay}
        </div>

        {/* Northwest */}
        <div>
          <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">NW</div>
          <ZoneForecastCell forecast={northwest} zoneName="Northwest" />
        </div>

        {/* Southeast */}
        <div>
          <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">SE</div>
          <ZoneForecastCell forecast={southeast} zoneName="Southeast" />
        </div>
      </div>
    </div>
  );
}
