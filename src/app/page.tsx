'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getTripsAwaitingResponse, getTripsWithPendingRequests, TourPost, ACTIVITY_COLORS, ACTIVITY_ICONS } from '@/lib/partners';

function TripNotificationCard({ trip, badge }: { trip: TourPost; badge: { text: string; color: string } }) {
  const tripDate = new Date(trip.tour_date + 'T12:00:00');
  const isToday = new Date().toISOString().split('T')[0] === trip.tour_date;
  const isTomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0] === trip.tour_date;
  const activity = trip.activity || 'ski_tour';

  return (
    <Link
      href={`/trips/${trip.id}`}
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
  const [awaitingResponse, setAwaitingResponse] = useState<TourPost[]>([]);
  const [needsAttention, setNeedsAttention] = useState<TourPost[]>([]);

  // Load user's notifications when logged in
  useEffect(() => {
    async function loadNotifications() {
      if (user) {
        const [pending, attention] = await Promise.all([
          getTripsAwaitingResponse(user.id),
          getTripsWithPendingRequests(user.id),
        ]);
        setAwaitingResponse(pending);
        setNeedsAttention(attention);
      }
    }
    loadNotifications();
  }, [user]);

  const hasNotifications = awaitingResponse.length > 0 || needsAttention.length > 0;

  return (
    <div className="space-y-8">
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
              Welcome to SkinTrack CB
            </h1>
            <p className="text-gray-500">Find partners for backcountry adventures in Crested Butte</p>
          </>
        )}
      </div>

      {/* Three large CTA buttons */}
      <div className="grid gap-4">
        {/* Check Forecast CTA */}
        <Link
          href="/forecast"
          className="block bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl">🏔️</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Check Forecast</h2>
              <p className="text-blue-100">Avalanche conditions and weather</p>
            </div>
            <div className="text-2xl">→</div>
          </div>
        </Link>

        {/* Find a Trip CTA */}
        <Link
          href="/trips"
          className="block bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 text-white hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl">⛷️</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Find a Trip</h2>
              <p className="text-green-100">Browse upcoming adventures</p>
            </div>
            <div className="text-2xl">→</div>
          </div>
        </Link>

        {/* Find Partners CTA */}
        <Link
          href="/partners"
          className="block bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 text-white hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center gap-4">
            <div className="text-4xl">🤝</div>
            <div className="flex-1">
              <h2 className="text-xl font-bold">Find Partners</h2>
              <p className="text-purple-100">Connect with touring buddies</p>
            </div>
            <div className="text-2xl">→</div>
          </div>
        </Link>
      </div>

      {/* Notifications section for logged-in users */}
      {user && hasNotifications && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>

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

      {/* Sign in prompt for non-logged-in users */}
      {!authLoading && !user && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Join the community</h3>
          <p className="text-gray-500 mb-4">
            Sign up to create trips, find partners, and coordinate adventures.
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
