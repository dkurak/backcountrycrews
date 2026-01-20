'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getTourPosts, getTripsAwaitingResponse, getTripsWithPendingRequests, TourPost, ACTIVITY_LABELS, ACTIVITY_COLORS, ACTIVITY_ICONS, ActivityType } from '@/lib/partners';
import { getForecastsWithWeather, isSupabaseConfigured, DBForecast, DBAvalancheProblem } from '@/lib/supabase';
import { DANGER_LABELS } from '@/types/forecast';
import { DangerPyramid } from '@/components/DangerPyramid';

// Quick danger summary from forecast
interface DangerSummary {
  zone: string;
  maxDanger: number;
  validDate: string;
}

function TripCard({ trip, badge }: { trip: TourPost; badge?: { text: string; color: string } }) {
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
              {badge && (
                <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
                  {badge.text}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              {trip.zone === 'southeast' ? 'Southeast' : 'Northwest'}
              {trip.profiles?.display_name && ` • ${trip.profiles.display_name}`}
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

function AvalancheBanner({ danger }: { danger: DangerSummary | null }) {
  if (!danger) return null;

  const dangerColors: Record<number, string> = {
    1: 'from-green-500 to-green-600',
    2: 'from-yellow-400 to-yellow-500',
    3: 'from-orange-500 to-orange-600',
    4: 'from-red-500 to-red-600',
    5: 'from-gray-800 to-black',
  };

  const textColors: Record<number, string> = {
    1: 'text-white',
    2: 'text-gray-900',
    3: 'text-white',
    4: 'text-white',
    5: 'text-white',
  };

  return (
    <Link
      href="/avalanche"
      className={`block bg-gradient-to-r ${dangerColors[danger.maxDanger]} rounded-xl p-4 hover:opacity-95 transition-opacity`}
    >
      <div className="flex items-center justify-between">
        <div className={textColors[danger.maxDanger]}>
          <div className="text-sm font-medium opacity-90">Avalanche Danger</div>
          <div className="text-2xl font-bold">
            {DANGER_LABELS[danger.maxDanger as 1 | 2 | 3 | 4 | 5]}
          </div>
        </div>
        <div className={`text-sm font-medium ${textColors[danger.maxDanger]} opacity-75`}>
          View Forecast →
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [upcomingTrips, setUpcomingTrips] = useState<TourPost[]>([]);
  const [myTrips, setMyTrips] = useState<TourPost[]>([]);
  const [awaitingResponse, setAwaitingResponse] = useState<TourPost[]>([]);
  const [needsAttention, setNeedsAttention] = useState<TourPost[]>([]);
  const [danger, setDanger] = useState<DangerSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // Load upcoming trips
      const trips = await getTourPosts({ timeFrame: 'upcoming' });
      setUpcomingTrips(trips.slice(0, 5));

      // Load avalanche danger
      if (isSupabaseConfigured) {
        const { forecasts } = await getForecastsWithWeather('southeast', 1);
        if (forecasts.length > 0) {
          const f = forecasts[0];
          setDanger({
            zone: f.zone_id,
            maxDanger: Math.max(f.danger_alpine, f.danger_treeline, f.danger_below_treeline),
            validDate: f.valid_date,
          });
        }
      }

      setLoading(false);
    }
    loadData();
  }, []);

  // Load user's trips and notifications when logged in
  useEffect(() => {
    async function loadMyTrips() {
      if (user) {
        const [trips, pending, attention] = await Promise.all([
          getTourPosts({ timeFrame: 'upcoming', userId: user.id }),
          getTripsAwaitingResponse(user.id),
          getTripsWithPendingRequests(user.id),
        ]);
        setMyTrips(trips.slice(0, 3));
        setAwaitingResponse(pending);
        setNeedsAttention(attention);
      }
    }
    loadMyTrips();
  }, [user]);

  return (
    <div className="space-y-6">
      {/* Welcome / Hero */}
      {!authLoading && !user ? (
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">Welcome to SkinTrack CB</h1>
          <p className="text-gray-300 mb-4">
            Find partners for backcountry adventures in Crested Butte. Ski touring, hiking, biking, and more.
          </p>
          <div className="flex gap-3">
            <Link
              href="/signup"
              className="px-4 py-2 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Sign Up
            </Link>
            <Link
              href="/trips"
              className="px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Browse Trips
            </Link>
          </div>
        </div>
      ) : user && profile ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-500">
                {(profile.display_name || user.email || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">
                Hey, {profile.display_name || 'there'}!
              </h1>
              <p className="text-gray-500">Ready for your next adventure?</p>
            </div>
            <Link
              href="/trips/new"
              className="px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              + Post Trip
            </Link>
          </div>
        </div>
      ) : null}

      {/* Avalanche Banner */}
      <AvalancheBanner danger={danger} />

      {/* Needs Attention - trips you organize with pending requests */}
      {user && needsAttention.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔔</span>
            <h2 className="text-lg font-semibold text-amber-900">Needs Your Attention</h2>
          </div>
          <div className="space-y-2">
            {needsAttention.map((trip) => (
              <TripCard
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
      {user && awaitingResponse.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Awaiting Response</h2>
          </div>
          <div className="space-y-2">
            {awaitingResponse.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                badge={{
                  text: 'Pending',
                  color: 'bg-yellow-100 text-yellow-700',
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* My Upcoming Trips (logged in) */}
      {user && myTrips.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">My Upcoming Trips</h2>
            <Link href="/trips" className="text-sm text-blue-600 hover:text-blue-800">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {myTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Trips */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Upcoming Trips</h2>
          <Link href="/trips" className="text-sm text-blue-600 hover:text-blue-800">
            See all →
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : upcomingTrips.length > 0 ? (
          <div className="space-y-2">
            {upcomingTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <p className="text-gray-500 mb-3">No upcoming trips posted yet.</p>
            {user ? (
              <Link
                href="/trips/new"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Post the First Trip
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Sign In to Post
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/avalanche"
          className="bg-blue-50 border border-blue-200 rounded-xl p-4 hover:bg-blue-100 transition-colors"
        >
          <div className="text-2xl mb-1">🏔️</div>
          <div className="font-semibold text-blue-900">Avalanche Forecast</div>
          <div className="text-sm text-blue-700">CBAC conditions & danger</div>
        </Link>
        <Link
          href="/weather"
          className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 hover:bg-cyan-100 transition-colors"
        >
          <div className="text-2xl mb-1">🌤️</div>
          <div className="font-semibold text-cyan-900">Weather</div>
          <div className="text-sm text-cyan-700">Forecasts & conditions</div>
        </Link>
      </div>

      {/* Activity Types */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-900 mb-3">Activities</h3>
        <div className="flex flex-wrap gap-2">
          {(['ski_tour', 'hike', 'mountain_bike', 'offroad', 'trail_run', 'climb'] as ActivityType[]).map((activity) => (
            <Link
              key={activity}
              href={`/trips?activity=${activity}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${ACTIVITY_COLORS[activity]} hover:opacity-80 transition-opacity`}
            >
              <span>{ACTIVITY_ICONS[activity]}</span>
              {ACTIVITY_LABELS[activity]}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
