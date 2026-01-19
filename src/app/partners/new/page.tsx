'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { createTourPost } from '@/lib/partners';

const EXPERIENCE_LEVELS = [
  { value: '', label: 'Any level welcome' },
  { value: 'beginner', label: 'Beginner+' },
  { value: 'intermediate', label: 'Intermediate+' },
  { value: 'advanced', label: 'Advanced+' },
  { value: 'expert', label: 'Expert only' },
];

const TRAILHEADS = [
  { value: 'washington_gulch', label: 'Washington Gulch' },
  { value: 'snodgrass', label: 'Snodgrass' },
  { value: 'kebler', label: 'Kebler Pass' },
  { value: 'brush_creek', label: 'Brush Creek' },
  { value: 'cement_creek', label: 'Cement Creek' },
  { value: 'slate_river', label: 'Slate River' },
];

export default function NewTourPostPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tourDate, setTourDate] = useState('');
  const [tourTime, setTourTime] = useState('');
  const [zone, setZone] = useState('southeast');
  const [travelMethod, setTravelMethod] = useState<'skin' | 'snowmobile' | 'both'>('skin');
  const [trailhead, setTrailhead] = useState('');
  const [meetingLocation, setMeetingLocation] = useState('');
  const [experienceRequired, setExperienceRequired] = useState('');
  const [spotsAvailable, setSpotsAvailable] = useState('2');
  const [requireBeacon, setRequireBeacon] = useState(true);
  const [requireProbe, setRequireProbe] = useState(true);
  const [requireShovel, setRequireShovel] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  // Set default date to tomorrow
  useEffect(() => {
    const tomorrow = new Date(Date.now() + 86400000);
    setTourDate(tomorrow.toISOString().split('T')[0]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError('You must be logged in to post a tour');
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

    const gearRequirements: string[] = [];
    if (requireBeacon) gearRequirements.push('Beacon');
    if (requireProbe) gearRequirements.push('Probe');
    if (requireShovel) gearRequirements.push('Shovel');

    const { data, error: createError } = await createTourPost(user.id, {
      title: title.trim(),
      description: description.trim() || null,
      tour_date: tourDate,
      tour_time: tourTime || null,
      zone,
      travel_method: travelMethod,
      trailhead: trailhead || null,
      meeting_location: meetingLocation.trim() || null,
      experience_required: experienceRequired as 'beginner' | 'intermediate' | 'advanced' | 'expert' | null || null,
      spots_available: parseInt(spotsAvailable) || 2,
      gear_requirements: gearRequirements.length > 0 ? gearRequirements : null,
    });

    if (createError) {
      setError(createError.message);
      setIsSubmitting(false);
    } else if (data) {
      router.push(`/partners/${data.id}`);
    }
  };

  if (authLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Post a Tour</h1>
        <Link
          href="/partners"
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

        {/* Tour details card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Tour Details</h2>

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
                min={new Date().toISOString().split('T')[0]}
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

          {(travelMethod === 'skin' || travelMethod === 'both') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trailhead
              </label>
              <select
                value={trailhead}
                onChange={(e) => setTrailhead(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              >
                <option value="">Select a trailhead...</option>
                {TRAILHEADS.map((th) => (
                  <option key={th.value} value={th.value}>
                    {th.label}
                  </option>
                ))}
              </select>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Gear
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
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-800 focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Posting...' : 'Post Tour'}
        </button>
      </form>
    </div>
  );
}
