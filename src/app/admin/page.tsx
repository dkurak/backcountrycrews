'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { clearFeatureFlagCache } from '@/lib/featureFlags';
import { useTheme, themes, ThemeName } from '@/lib/theme';

interface FeatureFlag {
  key: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
  description: string | null;
}

interface MaintenanceSettings {
  enabled: boolean;
  bypassPassword: string;
  message: string;
  bypassVersion: number;
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

type AdminTab = 'test-data' | 'settings' | 'branding';

// Logo concept SVG components
function LogoSkinTracks({ color = 'currentColor', size = 64 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M32 8L16 56" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <path d="M32 8L32 56" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <path d="M32 8L48 56" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <circle cx="32" cy="8" r="4" fill={color} />
    </svg>
  );
}

function LogoWordmarkPeak({ color = 'currentColor', size = 64 }: { color?: string; size?: number }) {
  return (
    <svg width={size * 2} height={size} viewBox="0 0 128 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 48L24 16L40 48" stroke={color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 48L56 24L72 48" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      <path d="M72 48L84 32L96 48" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
      <rect x="8" y="54" width="88" height="2" fill={color} opacity="0.3" />
    </svg>
  );
}

function LogoCompassMountain({ color = 'currentColor', size = 64 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="28" stroke={color} strokeWidth="2" opacity="0.3" />
      <circle cx="32" cy="6" r="2" fill={color} />
      <circle cx="32" cy="58" r="2" fill={color} opacity="0.5" />
      <circle cx="6" cy="32" r="2" fill={color} opacity="0.5" />
      <circle cx="58" cy="32" r="2" fill={color} opacity="0.5" />
      <path d="M16 44L28 24L32 30L36 24L48 44" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M26 28L28 24L30 27" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
    </svg>
  );
}

function LogoMinimalPeaks({ color = 'currentColor', size = 64 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 52L20 20L28 32L32 16L36 32L44 20L60 52" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const { theme, colors, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<AdminTab>('test-data');
  const [testUsers, setTestUsers] = useState<TestUser[]>([]);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats[]>([]);
  const [totalTrips, setTotalTrips] = useState(0);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  const [flagsLoading, setFlagsLoading] = useState(false);
  const [maintenance, setMaintenance] = useState<MaintenanceSettings>({
    enabled: false,
    bypassPassword: '',
    message: 'We are currently working on something exciting. Check back soon!',
    bypassVersion: 0,
  });
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);

  const themeKeys = Object.keys(themes) as ThemeName[];

  // Fetch test users, stats, and feature flags on load
  useEffect(() => {
    fetchTestUsers();
    fetchActivityStats();
    fetchFeatureFlags();
    fetchMaintenanceSettings();
  }, []);

  const fetchActivityStats = async () => {
    if (!supabase) return;

    try {
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

  const fetchMaintenanceSettings = async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('enabled, metadata')
        .eq('key', 'system.maintenance_mode')
        .single();

      if (error) {
        console.error('Error fetching maintenance settings:', error);
        return;
      }

      if (data) {
        setMaintenance({
          enabled: data.enabled,
          bypassPassword: (data.metadata?.bypass_password as string) || '',
          message: (data.metadata?.message as string) || 'We are currently working on something exciting. Check back soon!',
          bypassVersion: (data.metadata?.bypass_version as number) || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching maintenance settings:', error);
    }
  };

  const handleMaintenanceToggle = async () => {
    if (!supabase) return;

    setMaintenanceLoading(true);
    const turningOn = !maintenance.enabled;

    try {
      const newVersion = turningOn ? maintenance.bypassVersion + 1 : maintenance.bypassVersion;

      const updateData: { enabled: boolean; metadata?: Record<string, unknown> } = {
        enabled: turningOn,
      };

      if (turningOn) {
        updateData.metadata = {
          bypass_password: maintenance.bypassPassword || null,
          message: maintenance.message,
          bypass_version: newVersion,
        };
      }

      const { error } = await supabase
        .from('feature_flags')
        .update(updateData)
        .eq('key', 'system.maintenance_mode');

      if (error) {
        setMessage({ type: 'error', text: `Failed to toggle maintenance mode: ${error.message}` });
      } else {
        setMaintenance(prev => ({ ...prev, enabled: turningOn, bypassVersion: newVersion }));
        clearFeatureFlagCache();
        setMessage({
          type: 'success',
          text: `Maintenance mode ${turningOn ? 'enabled' : 'disabled'}${turningOn ? ' - existing bypass cookies invalidated' : ''}`
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to toggle maintenance mode' });
    }
    setMaintenanceLoading(false);
  };

  const handleMaintenanceUpdate = async () => {
    if (!supabase) return;

    setMaintenanceLoading(true);
    try {
      const { error } = await supabase
        .from('feature_flags')
        .update({
          metadata: {
            bypass_password: maintenance.bypassPassword || null,
            message: maintenance.message,
            bypass_version: maintenance.bypassVersion,
          },
        })
        .eq('key', 'system.maintenance_mode');

      if (error) {
        setMessage({ type: 'error', text: `Failed to update settings: ${error.message}` });
      } else {
        clearFeatureFlagCache();
        setMessage({ type: 'success', text: 'Maintenance settings updated' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update settings' });
    }
    setMaintenanceLoading(false);
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
        setFeatureFlags(prev =>
          prev.map(f => f.key === key ? { ...f, enabled: !currentEnabled } : f)
        );
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
      await supabase.auth.signOut();
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
    ski_tour: 'bg-slate-200 text-slate-700',
    offroad: 'bg-amber-200 text-amber-800',
    mountain_bike: 'bg-teal-200 text-teal-800',
    trail_run: 'bg-violet-200 text-violet-800',
    hike: 'bg-stone-200 text-stone-700',
    climb: 'bg-rose-200 text-rose-800',
  };

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: 'test-data', label: 'Test Data', icon: '🧪' },
    { id: 'settings', label: 'Site Settings', icon: '⚙️' },
    { id: 'branding', label: 'Branding', icon: '🎨' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-white border border-gray-200 border-b-white -mb-[3px] text-gray-900'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
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

      {/* Test Data Tab */}
      {activeTab === 'test-data' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Test Data Management</h1>
            <p className="text-gray-500">
              Create test users and generate 2+ years of multi-activity history for demos
            </p>
          </div>

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
        </div>
      )}

      {/* Site Settings Tab */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Site Settings</h1>
            <p className="text-gray-500">
              Maintenance mode and feature flags
            </p>
          </div>

          {/* Maintenance Mode */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Site Access Control
                </h2>
                <p className="text-sm text-gray-500">
                  Lock down the site with a &quot;Coming Soon&quot; page. Admins always have access.
                </p>
              </div>
              <button
                onClick={handleMaintenanceToggle}
                disabled={maintenanceLoading}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  maintenance.enabled ? 'bg-red-500' : 'bg-gray-300'
                } ${maintenanceLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
                    maintenance.enabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className={`space-y-4 ${maintenance.enabled ? '' : 'opacity-50'}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bypass Password
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={maintenance.bypassPassword}
                    onChange={(e) => setMaintenance(prev => ({ ...prev, bypassPassword: e.target.value }))}
                    placeholder="Leave empty to disable password bypass"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Visitors can enter this password to access the site
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={maintenance.message}
                  onChange={(e) => setMaintenance(prev => ({ ...prev, message: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <button
                onClick={handleMaintenanceUpdate}
                disabled={maintenanceLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
              >
                {maintenanceLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>

            {maintenance.enabled && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span className="font-medium">Maintenance Mode Active</span>
                </div>
                <p className="text-sm text-red-600 mt-1">
                  Non-admin visitors will see the &quot;Coming Soon&quot; page.
                  {maintenance.bypassPassword && ' They can enter the bypass password to access the site.'}
                </p>
              </div>
            )}
          </div>

          {/* Feature Flags */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Feature Flags
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Toggle activities and features on/off. Changes take effect immediately.
            </p>

            {featureFlags.filter(f => !f.key.startsWith('system.')).length === 0 ? (
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
        </div>
      )}

      {/* Branding Tab */}
      {activeTab === 'branding' && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Brand & Theme</h1>
            <p className="text-gray-500">Preview themes and logo concepts</p>
          </div>

          {/* Theme Selector */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Color Theme</h2>
            <p className="text-sm text-gray-500 mb-6">
              Select a theme to preview. Changes apply site-wide immediately.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              {themeKeys.map((key) => {
                const t = themes[key];
                const isActive = theme === key;

                return (
                  <button
                    key={key}
                    onClick={() => setTheme(key)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      isActive
                        ? 'border-blue-500 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ background: t.primary.from }}
                      />
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ background: t.secondary.from }}
                      />
                      <div
                        className="w-6 h-6 rounded-full"
                        style={{ background: t.accent }}
                      />
                    </div>
                    <h3 className="font-semibold text-gray-900">{t.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                    {isActive && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        Active
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Preview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Theme Preview</h2>
            <p className="text-sm text-gray-500 mb-6">
              How the main CTA cards look with the current theme.
            </p>

            <div className="grid gap-3 max-w-md">
              <div
                className="rounded-xl p-4"
                style={{
                  background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
                  color: colors.primary.text,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏔️</span>
                  <div>
                    <div className="font-bold">Check Forecast</div>
                    <div className="text-sm" style={{ color: colors.primary.subtext }}>
                      Avalanche conditions
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-4"
                style={{
                  background: `linear-gradient(to right, ${colors.secondary.from}, ${colors.secondary.to})`,
                  color: colors.secondary.text,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">⛷️</span>
                  <div>
                    <div className="font-bold">Find a Trip</div>
                    <div className="text-sm" style={{ color: colors.secondary.subtext }}>
                      Browse adventures
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-4"
                style={{
                  background: `linear-gradient(to right, ${colors.tertiary.from}, ${colors.tertiary.to})`,
                  color: colors.tertiary.text,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🤝</span>
                  <div>
                    <div className="font-bold">Find Partners</div>
                    <div className="text-sm" style={{ color: colors.tertiary.subtext }}>
                      Connect with buddies
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Logo Concepts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Logo Concepts</h2>
            <p className="text-sm text-gray-500 mb-6">
              Exploratory logo ideas for &quot;Backcountry Crews&quot;. These are rough concepts to evaluate direction.
            </p>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Concept 1: Converging Skin Tracks */}
              <div className="border border-gray-200 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">1. Converging Tracks</h3>
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-4">
                  Three skin tracks meeting at a summit - represents crews coming together.
                  Unique to ski touring culture.
                </p>
                <div className="flex items-center gap-6 py-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <LogoSkinTracks color="#ffffff" size={48} />
                  </div>
                  <div className="bg-white border border-gray-200 p-4 rounded-lg">
                    <LogoSkinTracks color="#1f2937" size={48} />
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: colors.primary.from }}>
                    <LogoSkinTracks color="#ffffff" size={48} />
                  </div>
                </div>
              </div>

              {/* Concept 2: Stacked Peaks */}
              <div className="border border-gray-200 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">2. Stacked Peaks Wordmark</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Mountain range silhouette that could accompany the text wordmark.
                  Works as a standalone icon too.
                </p>
                <div className="flex items-center gap-6 py-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <LogoWordmarkPeak color="#ffffff" size={48} />
                  </div>
                  <div className="bg-white border border-gray-200 p-4 rounded-lg">
                    <LogoWordmarkPeak color="#1f2937" size={48} />
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: colors.primary.from }}>
                    <LogoWordmarkPeak color="#ffffff" size={48} />
                  </div>
                </div>
              </div>

              {/* Concept 3: Compass Mountain */}
              <div className="border border-gray-200 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">3. Compass Mountain</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Navigation meets wilderness - compass ring with mountain silhouette inside.
                  Suggests adventure and direction.
                </p>
                <div className="flex items-center gap-6 py-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <LogoCompassMountain color="#ffffff" size={48} />
                  </div>
                  <div className="bg-white border border-gray-200 p-4 rounded-lg">
                    <LogoCompassMountain color="#1f2937" size={48} />
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: colors.primary.from }}>
                    <LogoCompassMountain color="#ffffff" size={48} />
                  </div>
                </div>
              </div>

              {/* Concept 4: Minimal Peaks */}
              <div className="border border-gray-200 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 mb-4">4. Minimal Peaks</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Simple continuous line forming a mountain range.
                  Clean, modern, works at any size.
                </p>
                <div className="flex items-center gap-6 py-4">
                  <div className="bg-gray-900 p-4 rounded-lg">
                    <LogoMinimalPeaks color="#ffffff" size={48} />
                  </div>
                  <div className="bg-white border border-gray-200 p-4 rounded-lg">
                    <LogoMinimalPeaks color="#1f2937" size={48} />
                  </div>
                  <div className="p-4 rounded-lg" style={{ background: colors.primary.from }}>
                    <LogoMinimalPeaks color="#ffffff" size={48} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="font-semibold text-amber-900 mb-2">Notes</h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>These are rough SVG concepts - a final logo would be professionally refined</li>
              <li>The &quot;Converging Tracks&quot; concept is unique to ski touring and memorable</li>
              <li>Consider how it looks as a favicon (16x16) and on a sticker</li>
              <li>Theme selection is saved to your browser - others will see the default until you set a site-wide default</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
