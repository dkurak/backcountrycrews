import { supabase } from './supabase';
import { ActivityType } from './partners';

// ─── Section-level feature flags ────────────────────────────────────────────
// Edit these values to show/hide entire sections of the app.
// forecast  – /forecast page + forecast chat widget
// trips     – /trips, Post a Trip, Browse Trips, trip notifications
// partners  – /partners page
// fieldGuide – /field-guide page
export const SECTION_FLAGS = {
  forecast: true,
  trips: false,
  partners: false,
  fieldGuide: true,
} as const;

export type SectionKey = keyof typeof SECTION_FLAGS;
// ────────────────────────────────────────────────────────────────────────────

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
  description: string | null;
}

// Cache for feature flags (refreshed on page load)
let flagsCache: Map<string, FeatureFlag> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute

// Fetch all feature flags
export async function getFeatureFlags(): Promise<Map<string, FeatureFlag>> {
  // Return cache if fresh
  if (flagsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return flagsCache;
  }

  if (!supabase) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('feature_flags')
    .select('*');

  if (error) {
    console.error('Error fetching feature flags:', error);
    // Return cache if available, even if stale
    return flagsCache || new Map();
  }

  flagsCache = new Map(
    (data || []).map(flag => [flag.key, flag as FeatureFlag])
  );
  cacheTimestamp = Date.now();

  return flagsCache;
}

// Check if a specific feature is enabled
export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags.get(key)?.enabled ?? false;
}

// Get all enabled activities
export async function getEnabledActivities(): Promise<ActivityType[]> {
  const flags = await getFeatureFlags();

  const activities: { type: ActivityType; order: number }[] = [];

  flags.forEach((flag, key) => {
    if (key.startsWith('activity.') && flag.enabled) {
      const activityType = key.replace('activity.', '') as ActivityType;
      const order = (flag.metadata?.order as number) ?? 99;
      activities.push({ type: activityType, order });
    }
  });

  // Sort by order and return just the types
  return activities
    .sort((a, b) => a.order - b.order)
    .map(a => a.type);
}

// Synchronous check using cached values (for use after initial load)
export function isFeatureEnabledSync(key: string): boolean {
  if (!flagsCache) return false;
  return flagsCache.get(key)?.enabled ?? false;
}

// Get enabled activities synchronously (for use after initial load)
export function getEnabledActivitiesSync(): ActivityType[] {
  if (!flagsCache) return ['ski_tour']; // Default fallback

  const activities: { type: ActivityType; order: number }[] = [];

  flagsCache.forEach((flag, key) => {
    if (key.startsWith('activity.') && flag.enabled) {
      const activityType = key.replace('activity.', '') as ActivityType;
      const order = (flag.metadata?.order as number) ?? 99;
      activities.push({ type: activityType, order });
    }
  });

  if (activities.length === 0) return ['ski_tour']; // Default fallback

  return activities
    .sort((a, b) => a.order - b.order)
    .map(a => a.type);
}

// Clear cache (useful for admin panel after updates)
export function clearFeatureFlagCache(): void {
  flagsCache = null;
  cacheTimestamp = 0;
}

// Preload flags (call on app init)
export async function preloadFeatureFlags(): Promise<void> {
  await getFeatureFlags();
}

// Maintenance mode types
export interface MaintenanceMode {
  enabled: boolean;
  bypassPassword: string | null;
  message: string;
}

// Get maintenance mode settings
export async function getMaintenanceMode(): Promise<MaintenanceMode> {
  const flags = await getFeatureFlags();
  const flag = flags.get('system.maintenance_mode');

  if (!flag) {
    return {
      enabled: false,
      bypassPassword: null,
      message: 'Site is under maintenance',
    };
  }

  return {
    enabled: flag.enabled,
    bypassPassword: (flag.metadata?.bypass_password as string) || null,
    message: (flag.metadata?.message as string) || 'Site is under maintenance',
  };
}

// Synchronous maintenance mode check (for middleware after cache is warm)
export function getMaintenanceModeSync(): MaintenanceMode | null {
  if (!flagsCache) return null;

  const flag = flagsCache.get('system.maintenance_mode');
  if (!flag) return null;

  return {
    enabled: flag.enabled,
    bypassPassword: (flag.metadata?.bypass_password as string) || null,
    message: (flag.metadata?.message as string) || 'Site is under maintenance',
  };
}
