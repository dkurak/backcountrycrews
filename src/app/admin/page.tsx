'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { clearFeatureFlagCache } from '@/lib/featureFlags';

interface FeatureFlag {
  key: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
  description: string | null;
}

interface TestUser {
  id: string;
  email: string;
  display_name: string | null;
  experience_level: string | null;
  travel_method: string | null;
  looking_for_partners: boolean;
}

interface ActivityStats {
  activity: string;
  total_trips: number;
  completed_trips: number;
  unique_organizers: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats[]>([]);
  const [totalTrips, setTotalTrips] = useState(0);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(false);

  // Fetch test users, stats, and feature flags on load
  useEffect(() => {
    fetchTestUsers();
    fetchActivityStats();
    fetchFeatureFlags();
  }, []);

  const fetchActivityStats = async () => {
    if (!supabase) return;

    try {
      // Get all test user trips activity stats
      const { data: testUserIds } = await supabase
        .from('profiles')
        .select('id')
        .eq('is_test_user', true);

      if (!testUserIds || testUserIds.length === 0) {
        setActivityStats([]);
        setTotalTrips(0);
        return;
      }

      const { data: stats } = await supabase
        .from('tour_posts')
        .select('activity, status')
        .in('user_id', testUserIds.map(u => u.id));

      if (stats) {
        const grouped = stats.reduce((acc, trip) => {
          const activity = trip.activity || 'ski_tour';
          if (!acc[activity]) {
            acc[activity] = { total: 0, completed: 0 };
          }
          acc[activity].total++;
          if (trip.status === 'completed') {
            acc[activity].completed++;
          }
          return acc;
        }, {} as Record<string, { total: number; completed: number }>);

        const statsArray = Object.entries(grouped).map(([activity, data]) => ({
          activity,
          total_trips: data.total,
          completed_trips: data.completed,
          unique_organizers: 0,
        }));

        setActivityStats(statsArray);
        setTotalTrips(stats.length);
      }
    } catch (error) {
      console.error('Error fetching activity stats:', error);
    }
  };

  const fetchTestUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/test-users');
      const data = await res.json();
      if (data.users) {
        setTestUsers(data.users);
        setPassword(data.password);
      }
    } catch (error) {
      console.error('Error fetching test users:', error);
    }
    setLoading(false);
  };

  const fetchFeatureFlags = async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('*')
        .order('key');

      if (error) {
        console.error('Error fetching feature flags:', error);
        return;
      }

      setFeatureFlags(data || []);
    } catch (error) {
      console.error('Error fetching feature flags:', error);
    }
  };

  const handleToggleFlag = async (key: string, currentEnabled: boolean) => {
    if (!supabase) return;

    setFlagsLoading(true);
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({ enabled: !currentEnabled })
        .eq('key', key);

      if (error) {
        setMessage({ type: 'error', text: `Failed to toggle flag: ${error.message}` });
      } else {
        // Update local state
        setFeatureFlags(prev =>
          prev.map(f => f.key === key ? { ...f, enabled: !currentEnabled } : f)
        );
        // Clear the frontend cache so changes take effect immediately
        clearFeatureFlagCache();
        setMessage({ type: 'success', text: `${key} is now ${!currentEnabled ? 'enabled' : 'disabled'}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to toggle flag' });
    }
    setFlagsLoading(false);
  };

  const handleCreateTestUsers = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/test-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' }),
      });
      const data = await res.json();
      if (data.created) {
        const createdCount = data.created.filter((u: {status: string}) => u.status === 'created').length;
        const historyMsg = data.history ? ` | ${data.history}` : '';
        setMessage({ type: 'success', text: `Created ${createdCount} test users with sample tours${historyMsg}` });
        fetchTestUsers();
        fetchActivityStats();
      } else if (data.error) {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create test users' });
    }
    setActionLoading(false);
  };

  const handleDeleteTestUsers = async () => {
    if (!confirm('Are you sure you want to delete ALL test users, tours, and responses? This cannot be undone.')) {
      return;
    }

    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/test-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      });
      const data = await res.json();
      if (data.deleted !== undefined) {
        setMessage({ type: 'success', text: `Deleted ${data.deleted} test users and all associated data` });
        setTestUsers([]);
      } else if (data.error) {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete test users' });
    }
    setActionLoading(false);
  };

  const handleGenerateHistory = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/test-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_history' }),
      });
      const data = await res.json();
      if (data.history) {
        setMessage({ type: 'success', text: data.history });
        fetchActivityStats();
      } else if (data.error) {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to generate historical data' });
    }
    setActionLoading(false);
  };

  const handleSignInAs = async (email: string) => {
    if (!supabase) return;

    try {
      // Sign out current user first
      await supabase.auth.signOut();

      // Sign in as test user
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage({ type: 'error', text: `Failed to sign in: ${error.message}` });
      } else {
        router.push('/profile');
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to sign in as test user' });
    }
  };

  const EXPERIENCE_LABELS: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    expert: 'Expert',
  };

  const ACTIVITY_LABELS: Record<string, string> = {
    ski_tour: 'Ski Tour',
    offroad: 'Offroad',
    mountain_bike: 'Mountain Bike',
    trail_run: 'Trail Run',
    hike: 'Hike',
    climb: 'Climb',
  };

  const ACTIVITY_COLORS: Record<string, string> = {
    ski_tour: 'bg-blue-100 text-blue-700',
    offroad: 'bg-orange-100 text-orange-700',
    mountain_bike: 'bg-green-100 text-green-700',
    trail_run: 'bg-purple-100 text-purple-700',
    hike: 'bg-yellow-100 text-yellow-700',
    climb: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Test Data Management</h1>
        <p className="text-gray-500">
          Create test users and generate 2+ years of multi-activity history for demos
        </p>
      </div>

      {/* Current user info */}
      {user && (
        <div className="bg-gray-100 rounded-lg p-4 text-sm">
          <span className="text-gray-600">Currently signed in as: </span>
          <span className="font-medium">{user.email}</span>
          {profile?.is_test_user && (
            <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">Test User</span>
          )}
        </div>
      )}

      {/* Messages */}
      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleCreateTestUsers}
            disabled={actionLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? 'Working...' : 'Create 15 Test Users + Sample Tours'}
          </button>
          <button
            onClick={handleGenerateHistory}
            disabled={actionLoading || testUsers.length === 0}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {actionLoading ? 'Working...' : 'Regenerate 2+ Years History'}
          </button>
          <button
            onClick={handleDeleteTestUsers}
            disabled={actionLoading || testUsers.length === 0}
            className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            Delete All Test Data
          </button>
          <button
            onClick={() => { fetchTestUsers(); fetchActivityStats(); }}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 transition-colors"
          >
            Refresh
          </button>
        </div>

        {password && (
          <p className="mt-4 text-sm text-gray-500">
            Test user password: <code className="bg-gray-100 px-2 py-1 rounded">{password}</code>
          </p>
        )}
      </div>

      {/* Activity Stats */}
      {activityStats.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Activity Stats ({totalTrips} total)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {activityStats.map((stat) => (
              <div
                key={stat.activity}
                className={`p-3 rounded-lg ${ACTIVITY_COLORS[stat.activity] || 'bg-gray-100 text-gray-700'}`}
              >
                <div className="font-medium text-sm">
                  {ACTIVITY_LABELS[stat.activity] || stat.activity}
                </div>
                <div className="text-2xl font-bold">{stat.total_trips}</div>
                <div className="text-xs opacity-75">
                  {stat.completed_trips} completed
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature Flags */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Feature Flags
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Toggle activities and features on/off. Changes take effect immediately.
        </p>

        {featureFlags.length === 0 ? (
          <p className="text-gray-500">No feature flags found. Run the migration first.</p>
        ) : (
          <div className="space-y-6">
            {/* Activity Flags */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Activities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {featureFlags
                  .filter(f => f.key.startsWith('activity.'))
                  .sort((a, b) => ((a.metadata?.order as number) || 99) - ((b.metadata?.order as number) || 99))
                  .map((flag) => {
                    const activityName = flag.key.replace('activity.', '');
                    const icon = flag.metadata?.icon as string || '';
                    return (
                      <button
                        key={flag.key}
                        onClick={() => handleToggleFlag(flag.key, flag.enabled)}
                        disabled={flagsLoading}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                          flag.enabled
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-gray-50 opacity-60'
                        } ${flagsLoading ? 'cursor-not-allowed' : 'hover:border-gray-400'}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{icon}</span>
                          <div className="text-left">
                            <div className="font-medium text-gray-900 text-sm">
                              {ACTIVITY_LABELS[activityName] || activityName}
                            </div>
                            <div className="text-xs text-gray-500">{flag.description}</div>
                          </div>
                        </div>
                        <div className={`w-10 h-6 rounded-full transition-colors ${
                          flag.enabled ? 'bg-green-500' : 'bg-gray-300'
                        }`}>
                          <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                            flag.enabled ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
                          }`} />
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Feature Flags */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {featureFlags
                  .filter(f => f.key.startsWith('feature.'))
                  .map((flag) => {
                    const featureName = flag.key.replace('feature.', '').replace(/_/g, ' ');
                    return (
                      <button
                        key={flag.key}
                        onClick={() => handleToggleFlag(flag.key, flag.enabled)}
                        disabled={flagsLoading}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                          flag.enabled
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-gray-50 opacity-60'
                        } ${flagsLoading ? 'cursor-not-allowed' : 'hover:border-gray-400'}`}
                      >
                        <div className="text-left">
                          <div className="font-medium text-gray-900 text-sm capitalize">
                            {featureName}
                          </div>
                          <div className="text-xs text-gray-500">{flag.description}</div>
                        </div>
                        <div className={`w-10 h-6 rounded-full transition-colors ${
                          flag.enabled ? 'bg-green-500' : 'bg-gray-300'
                        }`}>
                          <div className={`w-5 h-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                            flag.enabled ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'
                          }`} />
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Test Users List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Test Users ({testUsers.length})
        </h2>

        {loading ? (
          <p className="text-gray-500">Loading...</p>
        ) : testUsers.length === 0 ? (
          <p className="text-gray-500">No test users created yet. Click the button above to create them.</p>
        ) : (
          <div className="space-y-2">
            {testUsers.map((testUser) => (
              <div
                key={testUser.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">
                    {testUser.display_name || testUser.email}
                  </div>
                  <div className="text-sm text-gray-500 flex flex-wrap gap-2">
                    <span>{testUser.email}</span>
                    {testUser.experience_level && (
                      <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">
                        {EXPERIENCE_LABELS[testUser.experience_level]}
                      </span>
                    )}
                    {testUser.travel_method && (
                      <span className="px-2 py-0.5 bg-gray-200 rounded text-xs">
                        {testUser.travel_method}
                      </span>
                    )}
                    {testUser.looking_for_partners && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                        Looking for partners
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleSignInAs(testUser.email)}
                  className="px-3 py-1.5 bg-gray-900 text-white rounded text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Sign in as
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Test the experience</h3>
        <div className="flex flex-wrap gap-2">
          <a href="/trips" className="text-blue-600 hover:text-blue-800 text-sm">
            Browse Trips →
          </a>
          <span className="text-blue-300">|</span>
          <a href="/trips/new" className="text-blue-600 hover:text-blue-800 text-sm">
            Post a Trip →
          </a>
          <span className="text-blue-300">|</span>
          <a href="/profile" className="text-blue-600 hover:text-blue-800 text-sm">
            Edit Profile →
          </a>
        </div>
      </div>
    </div>
  );
}
