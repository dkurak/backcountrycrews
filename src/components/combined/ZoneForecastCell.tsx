'use client';

import { Forecast, DangerLevel } from '@/types/forecast';
import { DangerDot } from './DangerDot';
import { DangerPyramid } from '@/components/DangerPyramid';
import { AspectRose } from '@/components/AspectRose';
import { SkyIcon, WindIcon } from '@/components/WeatherIcons';

interface ZoneForecastCellProps {
  forecast: Forecast | null;
  zoneName: string;
}

export function ZoneForecastCell({ forecast, zoneName }: ZoneForecastCellProps) {
  if (!forecast) {
    return (
      <div className="flex items-center gap-2 text-gray-400 text-sm italic">
        <span>No forecast</span>
      </div>
    );
  }

  const maxDanger = Math.max(
    forecast.danger_alpine,
    forecast.danger_treeline,
    forecast.danger_below_treeline
  ) as DangerLevel;

  const weather = forecast.weather;
  const problems = forecast.problems.slice(0, 2); // Max 2 roses

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Danger dot */}
      <DangerDot level={maxDanger} size="md" />

      {/* Danger pyramid */}
      <DangerPyramid
        alpine={forecast.danger_alpine}
        treeline={forecast.danger_treeline}
        belowTreeline={forecast.danger_below_treeline}
        size="sm"
      />

      {/* Problem roses (max 2) */}
      {problems.length > 0 && (
        <div className="flex items-center gap-1">
          {problems.map((problem) => (
            <AspectRose key={problem.id} rose={problem.aspect_elevation} size="sm" />
          ))}
          {forecast.problems.length > 2 && (
            <span className="text-xs text-gray-500">+{forecast.problems.length - 2}</span>
          )}
        </div>
      )}

      {/* Weather info */}
      {weather && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          {weather.temperature && (
            <span className="font-medium">{weather.temperature}°</span>
          )}
          {weather.cloud_cover && (
            <SkyIcon cloudCover={weather.cloud_cover} size="sm" />
          )}
          {weather.wind_direction && weather.wind_speed && (
            <WindIcon direction={weather.wind_direction} speed={weather.wind_speed} size="sm" />
          )}
          {weather.snowfall_24hr && weather.snowfall_24hr !== '0' && (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
              {weather.snowfall_24hr}&quot;
            </span>
          )}
        </div>
      )}
    </div>
  );
}
