// Danger levels following North American Avalanche Danger Scale
export type DangerLevel = 1 | 2 | 3 | 4 | 5;

export const DANGER_LABELS: Record<DangerLevel, string> = {
  1: 'Low',
  2: 'Moderate',
  3: 'Considerable',
  4: 'High',
  5: 'Extreme',
};

export const DANGER_COLORS: Record<DangerLevel, string> = {
  1: '#50B848', // Green
  2: '#FFF200', // Yellow
  3: '#F7931E', // Orange
  4: '#ED1C24', // Red
  5: '#231F20', // Black
};

// Compass aspects for the rose diagram
export type Aspect = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export const ASPECTS: Aspect[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

// Elevation bands
export type ElevationBand = 'alpine' | 'treeline' | 'below_treeline';

export const ELEVATION_BANDS: ElevationBand[] = ['alpine', 'treeline', 'below_treeline'];

// Avalanche problem types
export type ProblemType =
  | 'persistent_slab'
  | 'wind_slab'
  | 'storm_slab'
  | 'wet_slab'
  | 'loose_dry'
  | 'loose_wet'
  | 'cornice'
  | 'glide';

export const PROBLEM_LABELS: Record<ProblemType, string> = {
  persistent_slab: 'Persistent Slab',
  wind_slab: 'Wind Slab',
  storm_slab: 'Storm Slab',
  wet_slab: 'Wet Slab',
  loose_dry: 'Loose Dry',
  loose_wet: 'Loose Wet',
  cornice: 'Cornice',
  glide: 'Glide',
};

// Aspect/Elevation rose data structure
// Each aspect has 3 elevation bands, value indicates if problem exists there
export interface AspectElevationRose {
  N: { alpine: boolean; treeline: boolean; below_treeline: boolean };
  NE: { alpine: boolean; treeline: boolean; below_treeline: boolean };
  E: { alpine: boolean; treeline: boolean; below_treeline: boolean };
  SE: { alpine: boolean; treeline: boolean; below_treeline: boolean };
  S: { alpine: boolean; treeline: boolean; below_treeline: boolean };
  SW: { alpine: boolean; treeline: boolean; below_treeline: boolean };
  W: { alpine: boolean; treeline: boolean; below_treeline: boolean };
  NW: { alpine: boolean; treeline: boolean; below_treeline: boolean };
}

// Avalanche problem (many per forecast)
export interface AvalancheProblem {
  id: string;
  type: ProblemType;
  aspect_elevation: AspectElevationRose;
  likelihood: 'Unlikely' | 'Possible' | 'Likely' | 'Very Likely' | 'Almost Certain';
  size: string; // e.g., 'D2', 'D1-2', 'D2-D3'
  details?: string;
}

// Weather data for a forecast
export interface ForecastWeather {
  temperature?: string;
  cloud_cover?: string;
  wind_speed?: string;
  wind_direction?: string;
  snowfall_12hr?: string;
  snowfall_24hr?: string;
}

// Trend types for forecast analysis
export type ForecastTrend = 'improving' | 'steady' | 'worsening' | 'storm_incoming' | 'new_problem';

export const TREND_LABELS: Record<ForecastTrend, string> = {
  improving: 'Improving',
  steady: 'Steady',
  worsening: 'Worsening',
  storm_incoming: 'Storm Incoming',
  new_problem: 'New Problem',
};

export const TREND_COLORS: Record<ForecastTrend, string> = {
  improving: '#22c55e', // green
  steady: '#3b82f6', // blue
  worsening: '#f97316', // orange
  storm_incoming: '#ef4444', // red
  new_problem: '#eab308', // yellow
};

// Main forecast (1 per day per zone)
export interface Forecast {
  id: string;
  zone: 'northwest' | 'southeast';
  issue_date: string; // ISO date
  valid_date: string; // ISO date
  danger_alpine: DangerLevel;
  danger_treeline: DangerLevel;
  danger_below_treeline: DangerLevel;
  travel_advice?: string;
  bottom_line?: string; // Now optional - we link to CBAC instead
  discussion?: string; // Now optional - we link to CBAC instead
  forecast_url?: string; // Link to CBAC forecast
  problems: AvalancheProblem[];
  weather?: ForecastWeather;
  // Analysis fields
  trend?: ForecastTrend;
  key_message?: string;
  confidence?: 'low' | 'moderate' | 'high';
  recent_activity_summary?: string;
  recent_avalanche_count?: number;
  created_at?: string;
}

// Weather forecast
export interface WeatherForecast {
  id: string;
  zone: string;
  forecast_date: string;
  metrics: {
    high_temp?: number;
    low_temp?: number;
    wind_speed?: string;
    wind_direction?: string;
    precipitation?: string;
    snowfall?: string;
  };
  raw_text: string;
  created_at: string;
}

// Avalanche observation
export interface AvalancheObservation {
  id: string;
  observation_date: string;
  zone: string;
  avalanche_count: number;
  summary: string;
  cbac_url: string;
  created_at: string;
}
