import { supabase } from './supabase';
import { ActivityType } from './partners';

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
