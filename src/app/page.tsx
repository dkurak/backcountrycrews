'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useTheme } from '@/lib/theme';
import { AvalancheWarningBanner } from '@/components/AvalancheWarningBanner';
import { getTripsAwaitingResponse, getTripsWithPendingRequests, getUserNotifications, deleteNotification, TourPost, UserNotification, ACTIVITY_COLORS, ACTIVITY_ICONS } from '@/lib/partners';
import { getTripPath } from '@/lib/slugify';

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function UserNotificationCard({
  notification,
  onDismiss
}: {
  notification: UserNotification;
  onDismiss: (id: string) => void;
}) {
  const activity = notification.tour_posts?.activity || 'ski_tour';

  const handleDismiss = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await deleteNotification(notification.id);
    onDismiss(notification.id);
  };

  return (
    <div className="relative bg-white rounded-lg border border-gray-200 p-4">
      <Link href={`/trips/${notification.trip_id}`} className="block">
        <div className="flex items-center gap-3">
          <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-lg ${ACTIVITY_COLORS[activity]}`}>
            {notification.type === 'trip_accepted' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <span>{ACTIVITY_ICONS[activity]}</span>
            )}
          </span>
          <div className="flex-1 min-w-0 pr-6">
            <p className="text-sm font-medium text-gray-900 truncate">{notification.message}</p>
            <p className="text-xs text-gray-500">{formatTimeAgo(notification.created_at)}</p>
          </div>
        </div>
      </Link>
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
        aria-label="Dismiss notification"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function TripNotificationCard({ trip, badge }: { trip: TourPost; badge: { text: string; color: string } }) {
  const tripDate = new Date(trip.tour_date + 'T12:00:00');
  const isToday = new Date().toISOString().split('T')[0] === trip.tour_date;
  const isTomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0] === trip.tour_date;
  const activity = trip.activity || 'ski_tour';

  return (
    <Link
      href={getTripPath(trip)}
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-lg ${ACTIVITY_COLORS[activity]}`}>
            {ACTIVITY_ICONS[activity]}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-gray-900 truncate">{trip.title}</h3>
              <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                {badge.text}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {trip.zone === 'southeast' ? 'Southeast' : 'Northwest'}
              {trip.profiles?.display_name && ` - ${trip.profiles.display_name}`}
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 text-right">
          <div
            className={`text-sm font-medium ${
              isToday ? 'text-green-600' : isTomorrow ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            {isToday
              ? 'Today'
              : isTomorrow
              ? 'Tomorrow'
              : tripDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </div>
          {trip.tour_time && <div className="text-xs text-gray-400">{trip.tour_time}</div>}
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const { colors } = useTheme();
  const [awaitingResponse, setAwaitingResponse] = useState<TourPost[]>([]);
  const [needsAttention, setNeedsAttention] = useState<TourPost[]>([]);
  const [notifications, setNotifications] = useState<UserNotification[]>([]);

  // Load user's notifications when logged in
  useEffect(() => {
    async function loadNotifications() {
      if (user) {
        const [pending, attention, userNotifs] = await Promise.all([
          getTripsAwaitingResponse(user.id),
          getTripsWithPendingRequests(user.id),
          getUserNotifications(user.id, 'unread'),
        ]);
        setAwaitingResponse(pending);
        setNeedsAttention(attention);
        setNotifications(userNotifs);
      }
    }
    loadNotifications();
  }, [user]);

  const handleDismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const hasNotifications = awaitingResponse.length > 0 || needsAttention.length > 0 || notifications.length > 0;

  return (
    <div className="space-y-8">
      {/* Avalanche Warning Banner - shows for all zones */}
      <AvalancheWarningBanner />

      {/* Hero section with greeting */}
      <div className="text-center py-6">
        {!authLoading && user && profile ? (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Hey, {profile.display_name || 'there'}!
            </h1>
            <p className="text-gray-500">What are you looking for today?</p>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Welcome to Backcountry Crews
            </h1>
            <p className="text-gray-500">Plan your trip. Invite your crew. Get out there.</p>
          </>
        )}
      </div>

      {/* Three large CTA buttons */}
      <div className="grid gap-4">
        {/* Check Forecast CTA */}
        <Link
          href="/forecast"
          className="block rounded-2xl p-6 transition-all shadow-lg hover:shadow-xl hover:scale-[1.01]"
          style={{
            background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
            color: colors.primary.text,
          }}
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl">🏔️</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Check Forecast</h2>
              <p style={{ color: colors.primary.subtext }}>Avalanche conditions and weather</p>
            </div>
            <div className="text-2xl">→</div>
          </div>
        </Link>

        {/* Post a Trip CTA - Primary action */}
        <Link
          href={user ? "/trips/new" : "/login"}
          className="block rounded-2xl p-6 transition-all shadow-lg hover:shadow-xl hover:scale-[1.01]"
          style={{
            background: `linear-gradient(to right, ${colors.secondary.from}, ${colors.secondary.to})`,
            color: colors.secondary.text,
          }}
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl">⛷️</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Post a Trip</h2>
              <p style={{ color: colors.secondary.subtext }}>Plan your adventure and invite your crew</p>
            </div>
            <div className="text-2xl">→</div>
          </div>
        </Link>

        {/* Browse Trips CTA */}
        <Link
          href="/trips"
          className="block rounded-2xl p-6 transition-all shadow-lg hover:shadow-xl hover:scale-[1.01]"
          style={{
            background: `linear-gradient(to right, ${colors.tertiary.from}, ${colors.tertiary.to})`,
            color: colors.tertiary.text,
          }}
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl">🗓️</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Browse Trips</h2>
              <p style={{ color: colors.tertiary.subtext }}>Find upcoming adventures near you</p>
            </div>
            <div className="text-2xl">→</div>
          </div>
        </Link>
      </div>

      {/* Notifications section for logged-in users */}
      {user && hasNotifications && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
            {notifications.length > 0 && (
              <Link href="/notifications" className="text-sm text-blue-600 hover:text-blue-700">
                View all
              </Link>
            )}
          </div>

          {/* Unread notifications from trip acceptance/confirmation */}
          {notifications.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </span>
                <h3 className="font-semibold text-green-900">New Updates</h3>
              </div>
              <div className="space-y-2">
                {notifications.slice(0, 3).map((notification) => (
                  <UserNotificationCard
                    key={notification.id}
                    notification={notification}
                    onDismiss={handleDismissNotification}
                  />
                ))}
                {notifications.length > 3 && (
                  <Link
                    href="/notifications"
                    className="block text-center text-sm text-green-700 hover:text-green-800 py-2"
                  >
                    +{notifications.length - 3} more notifications
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Needs Attention - trips you organize with pending requests */}
          {needsAttention.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🔔</span>
                <h3 className="font-semibold text-amber-900">Needs Your Attention</h3>
              </div>
              <div className="space-y-2">
                {needsAttention.map((trip) => (
                  <TripNotificationCard
                    key={trip.id}
                    trip={trip}
                    badge={{
                      text: `${trip.pending_count} pending`,
                      color: 'bg-amber-100 text-amber-700',
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Awaiting Response - trips you expressed interest in */}
          {awaitingResponse.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">⏳</span>
                <h3 className="font-semibold text-blue-900">Awaiting Response</h3>
              </div>
              <div className="space-y-2">
                {awaitingResponse.map((trip) => (
                  <TripNotificationCard
                    key={trip.id}
                    trip={trip}
                    badge={{
                      text: 'Pending',
                      color: 'bg-blue-100 text-blue-700',
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite friends banner for logged-in users */}
      {!authLoading && user && (
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
      )}

      {/* Sign in prompt for non-logged-in users */}
      {!authLoading && !user && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to get out there?</h3>
          <p className="text-gray-500 mb-4">
            Sign up to post trips and invite your friends to join your adventures.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/signup"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Sign Up
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
