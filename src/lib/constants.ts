// Centralized constants for the application

// Experience levels
export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

export const EXPERIENCE_COLORS: Record<string, string> = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-gray-200 text-gray-900',
  expert: 'bg-gray-200 text-gray-900',
};

// Fitness levels
export type FitnessLevel = 'moderate' | 'fit' | 'very_fit' | 'athlete';

export const FITNESS_LABELS: Record<string, string> = {
  moderate: 'Moderate',
  fit: 'Fit',
  very_fit: 'Very Fit',
  athlete: 'Athlete',
};

// Zones
export type Zone = 'southeast' | 'northwest';

export const ZONE_LABELS: Record<Zone, string> = {
  southeast: 'Southeast',
  northwest: 'Northwest',
};

export const ZONE_COLORS: Record<Zone, string> = {
  southeast: 'bg-amber-100 text-amber-700',
  northwest: 'bg-cyan-100 text-cyan-700',
};

// Trailheads
export const TRAILHEAD_LABELS: Record<string, string> = {
  washington_gulch: 'Washington Gulch',
  snodgrass: 'Snodgrass',
  kebler: 'Kebler Pass',
  brush_creek: 'Brush Creek',
  cement_creek: 'Cement Creek',
  slate_river: 'Slate River',
};

// Travel methods
export type TravelMethod = 'skin' | 'snowmobile' | 'both';

export const TRAVEL_METHOD_LABELS: Record<TravelMethod, string> = {
  skin: 'Skin',
  snowmobile: 'Snowmobile',
  both: 'Skin & Snowmobile',
};
