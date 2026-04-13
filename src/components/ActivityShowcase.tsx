'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getEnabledActivities } from '@/lib/featureFlags';
import { ActivityType, ACTIVITY_LABELS, ACTIVITY_ICONS, ACTIVITY_COLORS, getTourPosts } from '@/lib/partners';

const SUMMER_ACTIVITIES: ActivityType[] = ['hike', 'mountain_bike', 'trail_run', 'climb', 'offroad'];
const WINTER_ACTIVITIES: ActivityType[] = ['ski_tour'];

interface ActivityShowcaseProps {
  offSeason: boolean;
}

export function ActivityShowcase({ offSeason }: ActivityShowcaseProps) {
  const [activities, setActivities] = useState<ActivityType[]>([]);
  const [tripCounts, setTripCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [enabled, trips] = await Promise.all([
        getEnabledActivities(),
        getTourPosts({ timeFrame: 'upcoming' }),
      ]);

      // Count trips per activity
      const counts: Record<string, number> = {};
      for (const trip of trips) {
        const activity = trip.activity || 'ski_tour';
        counts[activity] = (counts[activity] || 0) + 1;
      }

      // Sort: summer activities first when off-season, winter first when in-season
      const sorted = [...enabled].sort((a, b) => {
        const aIsSummer = SUMMER_ACTIVITIES.includes(a);
        const bIsSummer = SUMMER_ACTIVITIES.includes(b);
        if (offSeason) {
          if (aIsSummer && !bIsSummer) return -1;
          if (!aIsSummer && bIsSummer) return 1;
        } else {
          if (!aIsSummer && bIsSummer) return -1;
          if (aIsSummer && !bIsSummer) return 1;
        }
        return 0;
      });

      setActivities(sorted);
      setTripCounts(counts);
      setLoading(false);
    }
    load();
  }, [offSeason]);

  if (loading || activities.length === 0) return null;

  return (
    <div>
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Explore Activities</h2>
        <p className="text-sm text-gray-500">Find your next adventure</p>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {activities.map(activity => {
          const isWinter = WINTER_ACTIVITIES.includes(activity);
          const muted = offSeason && isWinter;
          const count = tripCounts[activity] || 0;

          return (
            <Link
              key={activity}
              href={`/trips?activity=${activity}`}
              className={`${ACTIVITY_COLORS[activity]} rounded-xl p-3 text-center transition-all hover:scale-[1.03] hover:shadow-md ${
                muted ? 'opacity-50' : ''
              }`}
            >
              <div className="text-2xl">{ACTIVITY_ICONS[activity]}</div>
              <div className="text-xs font-semibold mt-1">{ACTIVITY_LABELS[activity]}</div>
              {(muted || count > 0) && (
                <div className="text-[10px] mt-0.5 opacity-70">
                  {muted ? 'Next winter' : `${count} trip${count !== 1 ? 's' : ''}`}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
