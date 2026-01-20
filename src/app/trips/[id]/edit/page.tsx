'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { getTourPost, updateTourPost, ActivityType, ACTIVITY_LABELS, ACTIVITY_ICONS, ACTIVITY_COLORS } from '@/lib/partners';
import { getTrailheads, Trailhead } from '@/lib/trailheads';

const ALL_ACTIVITIES: ActivityType[] = ['ski_tour', 'offroad', 'mountain_bike', 'trail_run', 'hike', 'climb'];

const EXPERIENCE_LEVELS = [
  { value: '', label: 'Any level welcome' },
  { value: 'beginner', label: 'Beginner+' },
  { value: 'intermediate', label: 'Intermediate+' },
  { value: 'advanced', label: 'Advanced+' },
  { value: 'expert', label: 'Expert only' },
];

export default function EditTripPage() {
  const router = useRouter();
  const params = useParams();
  const tripId = params.id as string;
  const { user, loading: authLoading } = useAuth();

  const [activity, setActivity] = useState<ActivityType>('ski_tour');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tourDate, setTourDate] = useState('');
  const [tourTime, setTourTime] = useState('');
  const [zone, setZone] = useState('southeast');
  const [travelMethod, setTravelMethod] = useState<'skin' | 'snowmobile' | 'both'>('skin');
  const [trailhead, setTrailhead] = useState('');
  const [otherTrailhead, setOtherTrailhead] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [experienceRequired, setExperienceRequired] = useState('');
  const [spotsAvailable, setSpotsAvailable] = useState('2');
  const [requireBeacon, setRequireBeacon] = useState(true);
  const [requireProbe, setRequireProbe] = useState(true);
  const [requireShovel, setRequireShovel] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trailheads, setTrailheads] = useState<Trailhead[]>([]);
  const [originalOwnerId, setOriginalOwnerId] = useState<string | null>(null);

  // Fetch trailheads from database
  useEffect(() => {
    getTrailheads().then(setTrailheads);
  }, []);

  // Load existing trip data
  useEffect(() => {
    async function loadTrip() {
      setIsLoading(true);
      const trip = await getTourPost(tripId);

      if (!trip) {
        setError('Trip not found');
        setIsLoading(false);
        return;
      }

      setOriginalOwnerId(trip.user_id);
      setActivity(trip.activity || 'ski_tour');
      setTitle(trip.title);
      setDescription(trip.description || '');
      setTourDate(trip.tour_date);
      setTourTime(trip.tour_time || '');
      setZone(trip.zone);
      setTravelMethod(trip.travel_method || 'skin');
      setMeetingLocation(trip.meeting_location || '');
      setExperienceRequired(trip.experience_required || '');
      setSpotsAvailable(trip.spots_available.toString());

      // Handle trailhead - check if it's a known trailhead or custom
      if (trip.trailhead) {
        const knownTrailhead = trailheads.find(th => th.slug === trip.trailhead);
        if (knownTrailhead) {
          setTrailhead(trip.trailhead);
        } else {
          setTrailhead('_other');
          setOtherTrailhead(trip.trailhead);
        }
      }

      // Parse gear requirements
      const gear = trip.gear_requirements || [];
      setRequireBeacon(gear.includes('Beacon'));
      setRequireProbe(gear.includes('Probe'));
      setRequireShovel(gear.includes('Shovel'));

      setIsLoading(false);
    }
    loadTrip();
  }, [tripId, trailheads]);

  // Redirect if not logged in or not owner
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    } else if (!isLoading && originalOwnerId && user && user.id !== originalOwnerId) {
      router.push(`/trips/${tripId}`);
    }
  }, [authLoading, user, isLoading, originalOwnerId, tripId, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('You must be logged in to edit a trip');
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (!tourDate) {
      setError('Please select a date');
      return;
    }

    setIsSubmitting(true);

    // Gear requirements - only for ski_tour
    const gearRequirements: string[] = [];
    if (activity === 'ski_tour') {
      if (requireBeacon) gearRequirements.push('Beacon');
      if (requireProbe) gearRequirements.push('Probe');
      if (requireShovel) gearRequirements.push('Shovel');
    } else if (activity === 'mountain_bike') {
      gearRequirements.push('Helmet');
    } else if (activity === 'offroad') {
      gearRequirements.push('Recovery gear');
    }

    // Use custom trailhead text if "Other" was selected
    const finalTrailhead = trailhead === '_other'
      ? (otherTrailhead.trim() || null)
      : (trailhead || null);

    const { error: updateError } = await updateTourPost(tripId, {
      title: title.trim(),
      description: description.trim() || null,
      tour_date: tourDate,
      tour_time: tourTime || null,
      zone,
      travel_method: activity === 'ski_tour' ? travelMethod : null,
      trailhead: finalTrailhead,
      meeting_location: meetingLocation.trim() || null,
      experience_required: experienceRequired as 'beginner' | 'intermediate' | 'advanced' | 'expert' | null || null,
      spots_available: parseInt(spotsAvailable) || 2,
      gear_requirements: gearRequirements.length > 0 ? gearRequirements : null,
      activity,
    });

    if (updateError) {
      setError(updateError.message);
      setIsSubmitting(false);
    } else {
      router.push(`/trips/${tripId}`);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user || (originalOwnerId && user.id !== originalOwnerId)) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Trip</h1>
        <Link
          href={`/trips/${tripId}`}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Cancel
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Activity type selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Activity Type *
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {ALL_ACTIVITIES.map((act) => (
              <button
                key={act}
                type="button"
                onClick={() => setActivity(act)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                  activity === act
                    ? `${ACTIVITY_COLORS[act]} border-current`
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <span className="text-xl">{ACTIVITY_ICONS[act]}</span>
                <span className="text-xs font-medium">{ACTIVITY_LABELS[act]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Trip details card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {ACTIVITY_LABELS[activity]} Details
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g., Morning tour to Gothic Mountain"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              placeholder="Describe the planned route, objectives, terrain..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                value={tourDate}
                onChange={(e) => setTourDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="text"
                value={tourTime}
                onChange={(e) => setTourTime(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., 6:00 AM"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Zone *
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setZone('southeast')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  zone === 'southeast'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                Southeast
              </button>
              <button
                type="button"
                onClick={() => setZone('northwest')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  zone === 'northwest'
                    ? 'bg-gray-900 text-white'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                Northwest
              </button>
            </div>
          </div>

          {activity === 'ski_tour' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Travel Method
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTravelMethod('skin')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    travelMethod === 'skin'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Skin
                </button>
                <button
                  type="button"
                  onClick={() => setTravelMethod('snowmobile')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    travelMethod === 'snowmobile'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Snowmobile
                </button>
                <button
                  type="button"
                  onClick={() => setTravelMethod('both')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    travelMethod === 'both'
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Both
                </button>
              </div>
            </div>
          )}

          {activity === 'ski_tour' && (travelMethod === 'skin' || travelMethod === 'both') && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trailhead
              </label>
              <select
                value={trailhead}
                onChange={(e) => {
                  setTrailhead(e.target.value);
                  if (e.target.value !== '_other') {
                    setOtherTrailhead('');
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Select a trailhead...</option>
                {trailheads.map((th) => (
                  <option key={th.slug} value={th.slug}>
                    {th.name}
                  </option>
                ))}
                <option value="_other">Other...</option>
              </select>
              {trailhead === '_other' && (
                <input
                  type="text"
                  value={otherTrailhead}
                  onChange={(e) => setOtherTrailhead(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="Enter trailhead name..."
                />
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Meeting Location
            </label>
            <input
              type="text"
              value={meetingLocation}
              onChange={(e) => setMeetingLocation(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g., Gothic Road trailhead"
            />
          </div>
        </div>

        {/* Requirements card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Requirements</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Experience Level
              </label>
              <select
                value={experienceRequired}
                onChange={(e) => setExperienceRequired(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Spots Available
              </label>
              <select
                value={spotsAvailable}
                onChange={(e) => setSpotsAvailable(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'spot' : 'spots'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activity === 'ski_tour' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Required Avalanche Gear
              </label>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireBeacon}
                    onChange={(e) => setRequireBeacon(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Beacon</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireProbe}
                    onChange={(e) => setRequireProbe(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Probe</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireShovel}
                    onChange={(e) => setRequireShovel(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700">Shovel</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
