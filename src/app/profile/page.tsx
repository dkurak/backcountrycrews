'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';

const EXPERIENCE_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'New to backcountry, learning basics' },
  { value: 'intermediate', label: 'Intermediate', description: '1-3 years, comfortable in moderate terrain' },
  { value: 'advanced', label: 'Advanced', description: '3-7 years, experienced in complex terrain' },
  { value: 'expert', label: 'Expert', description: '7+ years, professional level skills' },
];

const FITNESS_LEVELS = [
  { value: 'moderate', label: 'Moderate', description: 'Can do 2-4 hour tours' },
  { value: 'fit', label: 'Fit', description: 'Can do 4-6 hour tours' },
  { value: 'very_fit', label: 'Very Fit', description: 'Can do 6-8 hour tours' },
  { value: 'athlete', label: 'Athlete', description: 'No limits, dawn to dusk' },
];

const CERTIFICATIONS = [
  'AIARE 1',
  'AIARE 2',
  'AIARE Pro',
  'AAA Pro 1',
  'AAA Pro 2',
  'WFR',
  'WEMT',
  'Other',
];

const TRAILHEADS = [
  { value: 'washington_gulch', label: 'Washington Gulch', description: "Coney's, etc." },
  { value: 'snodgrass', label: 'Snodgrass', description: 'Snodgrass Mountain' },
  { value: 'kebler', label: 'Kebler Pass', description: 'Red Lady (winter closure)' },
  { value: 'brush_creek', label: 'Brush Creek', description: 'Brush Creek area' },
  { value: 'cement_creek', label: 'Cement Creek', description: 'Cement Creek area' },
  { value: 'slate_river', label: 'Slate River', description: 'Smith Hill (variable snow)' },
];

// Calculate age range from birth date
function getAgeRange(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  const age = today.getFullYear() - birth.getFullYear();

  if (age < 25) return '18-24';
  if (age < 35) return '25-34';
  if (age < 45) return '35-44';
  if (age < 55) return '45-54';
  if (age < 65) return '55-64';
  return '65+';
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading, updateProfile, signOut } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [hasBeacon, setHasBeacon] = useState(false);
  const [hasProbe, setHasProbe] = useState(false);
  const [hasShovel, setHasShovel] = useState(false);
  const [fitnessLevel, setFitnessLevel] = useState('');
  const [typicalStartTime, setTypicalStartTime] = useState('');
  const [preferredZones, setPreferredZones] = useState<string[]>(['southeast', 'northwest']);
  const [travelMethod, setTravelMethod] = useState<'skin' | 'snowmobile' | 'both'>('skin');
  const [preferredTrailheads, setPreferredTrailheads] = useState<string[]>([]);
  const [lookingForPartners, setLookingForPartners] = useState(false);
  const [showOnTours, setShowOnTours] = useState(true);
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Populate form with existing profile data
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setBirthDate(profile.birth_date || '');
      setExperienceLevel(profile.experience_level || '');
      setYearsExperience(profile.years_experience?.toString() || '');
      setCertifications(profile.certifications || []);
      setHasBeacon(profile.has_beacon || false);
      setHasProbe(profile.has_probe || false);
      setHasShovel(profile.has_shovel || false);
      setFitnessLevel(profile.fitness_level || '');
      setTypicalStartTime(profile.typical_start_time || '');
      setPreferredZones(profile.preferred_zones || ['southeast', 'northwest']);
      setTravelMethod(profile.travel_method || 'skin');
      setPreferredTrailheads(profile.preferred_trailheads || []);
      setLookingForPartners(profile.looking_for_partners || false);
      setShowOnTours(profile.show_on_tours !== false);
      setBio(profile.bio || '');
    }
  }, [profile]);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  const handleCertificationToggle = (cert: string) => {
    setCertifications((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  };

  const handleZoneToggle = (zone: string) => {
    setPreferredZones((prev) =>
      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]
    );
  };

  const handleTrailheadToggle = (trailhead: string) => {
    setPreferredTrailheads((prev) =>
      prev.includes(trailhead) ? prev.filter((t) => t !== trailhead) : [...prev, trailhead]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    const { error } = await updateProfile({
      display_name: displayName || null,
      birth_date: birthDate || null,
      experience_level: experienceLevel as 'beginner' | 'intermediate' | 'advanced' | 'expert' | null || null,
      years_experience: yearsExperience ? parseInt(yearsExperience) : null,
      certifications: certifications.length > 0 ? certifications : null,
      has_beacon: hasBeacon,
      has_probe: hasProbe,
      has_shovel: hasShovel,
      fitness_level: fitnessLevel as 'moderate' | 'fit' | 'very_fit' | 'athlete' | null || null,
      typical_start_time: typicalStartTime || null,
      preferred_zones: preferredZones,
      travel_method: travelMethod,
      preferred_trailheads: preferredTrailheads,
      looking_for_partners: lookingForPartners,
      show_on_tours: showOnTours,
      bio: bio || null,
    });

    setIsSaving(false);

    if (error) {
      setSaveMessage({ type: 'error', text: error.message });
    } else {
      setSaveMessage({ type: 'success', text: 'Profile saved!' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const ageRange = getAgeRange(birthDate);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your Profile</h1>
          <p className="text-gray-500">{user.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Sign Out
        </button>
      </div>

      {/* Save message */}
      {saveMessage && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            saveMessage.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Profile form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        {/* Basic Info */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Info</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="How others will see you"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Birthday <span className="text-gray-400 font-normal">(optional, for age matching)</span>
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {ageRange && (
                  <span className="text-sm text-gray-500">
                    Age range: <span className="font-medium">{ageRange}</span>
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Only your age range is shown to others, never your exact birthday
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                placeholder="Tell others about yourself and your touring style..."
              />
            </div>
          </div>
        </div>

        {/* Travel Method */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">How do you access the backcountry?</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTravelMethod('skin')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                travelMethod === 'skin'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Skin from Trailhead
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

          {/* Trailhead preferences for skin touring */}
          {(travelMethod === 'skin' || travelMethod === 'both') && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Trailheads
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TRAILHEADS.map((th) => (
                  <button
                    key={th.value}
                    type="button"
                    onClick={() => handleTrailheadToggle(th.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      preferredTrailheads.includes(th.value)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{th.label}</div>
                    <div className="text-xs text-gray-500">{th.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Experience */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Experience</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Experience Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {EXPERIENCE_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setExperienceLevel(level.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      experienceLevel === level.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{level.label}</div>
                    <div className="text-xs text-gray-500">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Years of Backcountry Experience
              </label>
              <input
                type="number"
                value={yearsExperience}
                onChange={(e) => setYearsExperience(e.target.value)}
                min="0"
                max="50"
                className="w-24 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certifications
              </label>
              <div className="flex flex-wrap gap-2">
                {CERTIFICATIONS.map((cert) => (
                  <button
                    key={cert}
                    type="button"
                    onClick={() => handleCertificationToggle(cert)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      certifications.includes(cert)
                        ? 'bg-blue-100 text-blue-700 border border-blue-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    {cert}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Gear */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Essential Gear</h2>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasBeacon}
                onChange={(e) => setHasBeacon(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Beacon</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasProbe}
                onChange={(e) => setHasProbe(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Probe</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasShovel}
                onChange={(e) => setHasShovel(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Shovel</span>
            </label>
          </div>
        </div>

        {/* Touring Preferences */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Touring Preferences</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fitness Level
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FITNESS_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setFitnessLevel(level.value)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      fitnessLevel === level.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{level.label}</div>
                    <div className="text-xs text-gray-500">{level.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Typical Start Time
              </label>
              <input
                type="text"
                value={typicalStartTime}
                onChange={(e) => setTypicalStartTime(e.target.value)}
                className="w-48 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g., 6:00 AM, Dawn"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Zones
              </label>
              <div className="flex gap-2">
                {['southeast', 'northwest'].map((zone) => (
                  <button
                    key={zone}
                    type="button"
                    onClick={() => handleZoneToggle(zone)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      preferredZones.includes(zone)
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {zone === 'southeast' ? 'Southeast' : 'Northwest'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Partner Finder */}
        <div className="border-t border-gray-200 pt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Partner Finder</h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={lookingForPartners}
                onChange={(e) => setLookingForPartners(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">I&apos;m looking for touring partners</div>
                <div className="text-sm text-gray-500">
                  Your profile will be visible to others looking for partners
                </div>
              </div>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnTours}
                onChange={(e) => setShowOnTours(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium text-gray-900">Show my name on tours I join</div>
                <div className="text-sm text-gray-500">
                  When you&apos;re accepted to a tour, others can see you&apos;re going
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Save button */}
        <div className="border-t border-gray-200 pt-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto bg-gray-900 text-white py-2 px-6 rounded-lg font-medium hover:bg-gray-800 focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      {/* Partner finder link */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-blue-900">Find Touring Partners</div>
            <div className="text-sm text-blue-700">
              Browse tour posts and connect with other backcountry skiers
            </div>
          </div>
          <Link
            href="/partners"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Browse
          </Link>
        </div>
      </div>
    </div>
  );
}
