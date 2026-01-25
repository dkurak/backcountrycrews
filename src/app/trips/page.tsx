'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getTourPosts, getTripsWithPendingRequests, getUserNotifications, deleteNotification, TourPost, TourFilters, ActivityType, UserNotification, ACTIVITY_LABELS, ACTIVITY_COLORS, ACTIVITY_ICONS } from '@/lib/partners';
import { getEnabledActivities } from '@/lib/featureFlags';
import { getTripPath } from '@/lib/slugify';

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
};

// Get the Monday of a week for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Format date range for a week
function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
  const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

// Get week label based on date
function getWeekLabel(weekStart: Date): { title: string; dateRange: string; category: 'this' | 'next' | 'future' } {
  const now = new Date();
  const thisWeekStart = getWeekStart(now);
  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  const dateRange = formatWeekRange(weekStart);

  if (weekStart.getTime() === thisWeekStart.getTime()) {
    return { title: 'This Week', dateRange, category: 'this' };
  }
  if (weekStart.getTime() === nextWeekStart.getTime()) {
    return { title: 'Next Week', dateRange, category: 'next' };
  }

  return { title: dateRange, dateRange, category: 'future' };
}

interface WeekGroup {
  title: string;
  dateRange: string;
  category: 'this' | 'next' | 'future';
  startDate: Date;
  trips: TourPost[];
}

interface CategoryGroup {
  category: 'this' | 'next' | 'future';
  label: string;
  weeks: WeekGroup[];
  totalTrips: number;
}

// Group trips by week
function groupTripsByWeek(trips: TourPost[]): WeekGroup[] {
  const groups = new Map<number, WeekGroup>();

  trips.forEach((trip) => {
    const tripDate = new Date(trip.tour_date + 'T12:00:00');
    const weekStart = getWeekStart(tripDate);
    const key = weekStart.getTime();

    if (!groups.has(key)) {
      const { title, dateRange, category } = getWeekLabel(weekStart);
      groups.set(key, {
        title,
        dateRange,
        category,
        startDate: weekStart,
        trips: [],
      });
    }
    groups.get(key)!.trips.push(trip);
  });

  // Sort by week start date
  return Array.from(groups.values()).sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime()
  );
}

// Group weeks into categories (This Week, Next Week, Future)
function groupWeeksByCategory(weeks: WeekGroup[]): CategoryGroup[] {
  const categories: CategoryGroup[] = [];

  const thisWeek = weeks.filter(w => w.category === 'this');
  const nextWeek = weeks.filter(w => w.category === 'next');
  const futureWeeks = weeks.filter(w => w.category === 'future');

  if (thisWeek.length > 0) {
    categories.push({
      category: 'this',
      label: 'This Week',
      weeks: thisWeek,
      totalTrips: thisWeek.reduce((sum, w) => sum + w.trips.length, 0),
    });
  }

  if (nextWeek.length > 0) {
    categories.push({
      category: 'next',
      label: 'Next Week',
      weeks: nextWeek,
      totalTrips: nextWeek.reduce((sum, w) => sum + w.trips.length, 0),
    });
  }

  if (futureWeeks.length > 0) {
    categories.push({
      category: 'future',
      label: 'Future',
      weeks: futureWeeks,
      totalTrips: futureWeeks.reduce((sum, w) => sum + w.trips.length, 0),
    });
  }

  return categories;
}

interface MonthGroup {
  label: string;
  key: string;
  trips: TourPost[];
}

// Group trips by month for past trips
function groupTripsByMonth(trips: TourPost[]): MonthGroup[] {
  const groups = new Map<string, MonthGroup>();

  trips.forEach((trip) => {
    const tripDate = new Date(trip.tour_date + 'T12:00:00');
    const key = `${tripDate.getFullYear()}-${tripDate.getMonth()}`;
    const label = tripDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (!groups.has(key)) {
      groups.set(key, { label, key, trips: [] });
    }
    groups.get(key)!.trips.push(trip);
  });

  // Sort by date descending (most recent first)
  return Array.from(groups.values()).sort((a, b) => b.key.localeCompare(a.key));
}

function TourPostCard({ post, pendingCount }: { post: TourPost; pendingCount?: number }) {
  const tourDate = new Date(post.tour_date + 'T12:00:00');
  const isToday = new Date().toISOString().split('T')[0] === post.tour_date;
  const isTomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0] === post.tour_date;
  const activity = post.activity || 'ski_tour';

  return (
    <Link
      href={getTripPath(post)}
      className="block bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-gray-300 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${ACTIVITY_COLORS[activity]}`}>
              <span>{ACTIVITY_ICONS[activity]}</span>
              {ACTIVITY_LABELS[activity]}
            </span>
            <h3 className="font-semibold text-gray-900 truncate">{post.title}</h3>
            {pendingCount && pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Posted by {post.profiles?.display_name || 'Anonymous'}
            {post.profiles?.experience_level && (
              <span className="ml-2 text-gray-400">
                ({EXPERIENCE_LABELS[post.profiles.experience_level]})
              </span>
            )}
          </p>
        </div>
        <div className="flex-shrink-0 text-right">
          <div
            className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              isToday
                ? 'bg-green-100 text-green-700'
                : isTomorrow
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            {isToday
              ? 'Today'
              : isTomorrow
              ? 'Tomorrow'
              : tourDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
          </div>
          {post.tour_time && (
            <div className="text-xs text-gray-500 mt-1">{post.tour_time}</div>
          )}
        </div>
      </div>

      {post.description && (
        <p className="text-sm text-gray-600 mt-3 line-clamp-2">{post.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-3 mt-4 text-sm">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            post.zone === 'southeast'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-cyan-100 text-cyan-700'
          }`}
        >
          {post.zone === 'southeast' ? 'Southeast' : 'Northwest'}
        </span>

        {post.experience_required && (
          <span className="text-gray-500">
            {EXPERIENCE_LABELS[post.experience_required]}+ required
          </span>
        )}

        {post.status === 'full' ? (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
            Full
          </span>
        ) : (
          <span className="text-gray-500">
            {post.accepted_count || 0}/{post.spots_available + (post.accepted_count || 0)} spots filled
          </span>
        )}
      </div>
    </Link>
  );
}

export default function PartnersPage() {
  const { user, loading: authLoading } = useAuth();
  const [allPosts, setAllPosts] = useState<TourPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<Set<ActivityType>>(new Set());
  const [timeFrame, setTimeFrame] = useState<'upcoming' | 'past'>('upcoming');
  const [showMyTrips, setShowMyTrips] = useState(false);
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['this', 'next', 'future']));
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [enabledActivities, setEnabledActivities] = useState<ActivityType[]>(['ski_tour']);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleMonth = (key: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Fetch enabled activities on mount
  useEffect(() => {
    getEnabledActivities().then(setEnabledActivities);
  }, []);

  // Auto-expand the first (most recent) month when viewing past trips
  useEffect(() => {
    if (timeFrame === 'past' && allPosts.length > 0) {
      const months = groupTripsByMonth(allPosts);
      if (months.length > 0) {
        setExpandedMonths(prev => {
          const next = new Set(prev);
          next.add(months[0].key);
          return next;
        });
      }
    }
  }, [timeFrame, allPosts]);

  // Compute activity counts from loaded posts
  const activityCounts = allPosts.reduce((acc, post) => {
    const activity = post.activity || 'ski_tour';
    acc[activity] = (acc[activity] || 0) + 1;
    return acc;
  }, {} as Record<ActivityType, number>);

  // Filter posts by selected activities (client-side for multi-select)
  const posts = selectedActivities.size === 0
    ? allPosts
    : allPosts.filter((p) => selectedActivities.has(p.activity || 'ski_tour'));

  const toggleActivity = (activity: ActivityType) => {
    setSelectedActivities((prev) => {
      const next = new Set(prev);
      if (next.has(activity)) {
        next.delete(activity);
      } else {
        next.add(activity);
      }
      return next;
    });
  };

  useEffect(() => {
    async function loadPosts() {
      setLoading(true);
      const filters: TourFilters = {
        zone: selectedZone || undefined,
        timeFrame,
        userId: showMyTrips && user ? user.id : undefined,
      };
      const data = await getTourPosts(filters);
      setAllPosts(data);
      setLoading(false);
    }
    loadPosts();
  }, [selectedZone, timeFrame, showMyTrips, user]);

  // Load pending counts for trips the user organizes
  useEffect(() => {
    async function loadPendingCounts() {
      if (user) {
        const tripsWithPending = await getTripsWithPendingRequests(user.id);
        const counts: Record<string, number> = {};
        tripsWithPending.forEach((trip) => {
          if (trip.pending_count) {
            counts[trip.id] = trip.pending_count;
          }
        });
        setPendingCounts(counts);
      }
    }
    loadPendingCounts();
  }, [user]);

  // Load unread notifications
  useEffect(() => {
    async function loadNotifications() {
      if (user) {
        const notifs = await getUserNotifications(user.id, 'unread');
        setNotifications(notifs);
      }
    }
    loadNotifications();
  }, [user]);

  const handleDismissNotification = async (id: string) => {
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trips</h1>
          <p className="text-gray-500">
            {posts.length} {posts.length === 1 ? 'trip' : 'trips'} posted
          </p>
        </div>
        {user ? (
          <Link
            href="/trips/new"
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            + Post a Trip
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Sign in to Post
          </Link>
        )}
      </div>

      {/* Community invite banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-5 text-white">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="font-semibold text-lg mb-1">Help Build Our Community</h3>
            <p className="text-slate-300 text-sm">
              Know someone who&apos;d love to find backcountry partners? Invite your friends to join and let&apos;s grow this crew together.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href="mailto:?subject=Join%20me%20on%20Backcountry%20Crews&body=Check%20out%20Backcountry%20Crews%20-%20find%20partners%20for%20ski%20tours%20and%20outdoor%20adventures%20in%20Crested%20Butte!%0A%0Ahttps://backcountrycrews.com"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-800 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Email
            </a>
            <a
              href="sms:?body=Check%20out%20Backcountry%20Crews%20-%20find%20partners%20for%20ski%20tours%20in%20Crested%20Butte!%20backcountrycrews.com"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-800 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Text
            </a>
            <button
              onClick={() => {
                navigator.clipboard.writeText('Check out Backcountry Crews - find partners for ski tours in Crested Butte! backcountrycrews.com');
                alert('Link copied!');
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg font-medium hover:bg-slate-500 transition-colors text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Link
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* My Trips toggle (when logged in) */}
        {user && (
          <>
            <button
              onClick={() => setShowMyTrips(!showMyTrips)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showMyTrips
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              My Trips
            </button>
            <span className="text-gray-300">|</span>
          </>
        )}

        {/* Time filters */}
        <button
          onClick={() => setTimeFrame('upcoming')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            timeFrame === 'upcoming'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Upcoming
        </button>
        <button
          onClick={() => setTimeFrame('past')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            timeFrame === 'past'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Past
        </button>

        {/* Zone dropdown */}
        <div className="ml-auto">
          <select
            value={selectedZone || ''}
            onChange={(e) => setSelectedZone(e.target.value || null)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Zones</option>
            <option value="southeast">Southeast</option>
            <option value="northwest">Northwest</option>
          </select>
        </div>
      </div>

      {/* Notifications banner */}
      {notifications.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="text-sm text-green-800 truncate">
                {notifications.length === 1
                  ? notifications[0].message
                  : `You have ${notifications.length} new notifications`}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link
                href={notifications.length === 1 ? `/trips/${notifications[0].trip_id}` : '/notifications'}
                className="text-sm font-medium text-green-700 hover:text-green-800"
              >
                View
              </Link>
              {notifications.length === 1 && (
                <button
                  onClick={() => handleDismissNotification(notifications[0].id)}
                  className="p-1 text-green-600 hover:text-green-800 hover:bg-green-100 rounded"
                  aria-label="Dismiss"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Activity Stats Cards - only show if multiple activities enabled or there's data for multiple */}
      {allPosts.length > 0 && enabledActivities.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-3">
            Activities ({allPosts.length} total){selectedActivities.size > 0 && ` · ${posts.length} selected`}
          </div>
          <div className="flex flex-wrap gap-2">
            {enabledActivities.map((activity) => {
              const count = activityCounts[activity] || 0;
              if (count === 0) return null;
              const isSelected = selectedActivities.has(activity);
              return (
                <button
                  key={activity}
                  onClick={() => toggleActivity(activity)}
                  className={`px-3 py-2 rounded-lg text-left transition-all ${
                    isSelected
                      ? `${ACTIVITY_COLORS[activity]} ring-2 ring-offset-1 ring-gray-400`
                      : `${ACTIVITY_COLORS[activity]} opacity-70 hover:opacity-100`
                  }`}
                >
                  <div className="flex items-center gap-1 text-xs font-medium">
                    <span>{ACTIVITY_ICONS[activity]}</span>
                    <span>{ACTIVITY_LABELS[activity]}</span>
                  </div>
                  <div className="text-lg font-bold">{count}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Trip posts list */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading trips...</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-4xl mb-4">{showMyTrips ? '📋' : '⛷️'}</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {showMyTrips
              ? 'No trips yet'
              : timeFrame === 'past'
              ? 'No past trips'
              : 'No upcoming trips'}
          </h3>
          <p className="text-gray-500 mb-4">
            {showMyTrips
              ? "You haven't organized or joined any trips yet."
              : timeFrame === 'past'
              ? 'Check upcoming trips or post your own!'
              : 'Post a trip and invite your friends to join!'}
          </p>
          {!showMyTrips && (
            user ? (
              <Link
                href="/trips/new"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <span>Post a Trip</span>
                <span className="text-blue-200">+ Invite Friends</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Sign in to Get Started
              </Link>
            )
          )}
        </div>
      ) : timeFrame === 'upcoming' ? (
        // Categorized view for upcoming trips (This Week, Next Week, Future)
        <div className="space-y-4">
          {groupWeeksByCategory(groupTripsByWeek(posts)).map((category) => {
            const isExpanded = expandedCategories.has(category.category);
            return (
              <div key={category.category} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleCategory(category.category)}
                  className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-semibold text-gray-900">{category.label}</span>
                    {category.category !== 'future' && category.weeks[0] && (
                      <span className="text-sm text-gray-500">({category.weeks[0].dateRange})</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {category.totalTrips} {category.totalTrips === 1 ? 'trip' : 'trips'}
                  </span>
                </button>
                {isExpanded && (
                  <div className="p-4 space-y-4 bg-white">
                    {category.category === 'future' ? (
                      // For future, show week subgroups
                      category.weeks.map((week) => (
                        <div key={week.startDate.getTime()}>
                          <div className="text-sm font-medium text-gray-500 mb-2">{week.dateRange}</div>
                          <div className="space-y-3">
                            {week.trips.map((post) => (
                              <TourPostCard key={post.id} post={post} pendingCount={pendingCounts[post.id]} />
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      // For this/next week, show trips directly
                      category.weeks.flatMap(w => w.trips).map((post) => (
                        <TourPostCard key={post.id} post={post} pendingCount={pendingCounts[post.id]} />
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Monthly grouped view for past trips
        <div className="space-y-4">
          {groupTripsByMonth(posts).map((month) => {
            const isExpanded = expandedMonths.has(month.key);
            return (
              <div key={month.key} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleMonth(month.key)}
                  className="w-full bg-gray-50 px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="font-semibold text-gray-900">{month.label}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {month.trips.length} {month.trips.length === 1 ? 'trip' : 'trips'}
                  </span>
                </button>
                {isExpanded && (
                  <div className="p-4 space-y-4 bg-white">
                    {month.trips.map((post) => (
                      <TourPostCard key={post.id} post={post} pendingCount={pendingCounts[post.id]} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 mb-2">How it works</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>1. Post a trip with your date, zone, and requirements</li>
          <li>2. Share the link with friends to invite them</li>
          <li>3. Accept requests and confirm who&apos;s in</li>
          <li>4. Coordinate details and get out there!</li>
        </ul>
      </div>
    </div>
  );
}
