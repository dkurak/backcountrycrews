'use client';

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from './supabase';

interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

// Activity-specific profile data
interface SkiTouringProfile {
  equipment?: {
    has_snowmobile?: boolean;
    has_splitboard?: boolean;
  };
  style?: {
    approach?: 'kiss' | 'balanced' | 'aggressive';
    access_preference?: 'earn_your_turns' | 'sled_assisted' | 'both';
    risk_tolerance?: 'conservative' | 'moderate' | 'aggressive';
    group_size?: 'solo' | 'small' | 'large';
  };
  favorite_routes?: string[];
  avoid_routes?: Array<{ route: string; reason: string }>;
}

interface ProfileData {
  ski_touring?: SkiTouringProfile;
  // Future: offroad, mountain_bike, etc.
}

interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  experience_level: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  years_experience: number | null;
  certifications: string[] | null;
  has_beacon: boolean;
  has_probe: boolean;
  has_shovel: boolean;
  has_radio: boolean;
  has_satellite: boolean;
  has_first_aid: boolean;
  additional_gear: string[] | null;
  preferred_zones: string[];
  typical_start_time: string | null;
  fitness_level: 'moderate' | 'fit' | 'very_fit' | 'athlete' | null;
  travel_method: 'skin' | 'snowmobile' | 'both';
  preferred_trailheads: string[];
  looking_for_partners: boolean;
  bio: string | null;
  contact_method: 'app' | 'email' | 'phone' | null;
  phone: string | null;
  show_email: boolean;
  show_phone: boolean;
  show_on_tours: boolean;
  emergency_contacts: EmergencyContact[];
  is_test_user: boolean;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
  profile_data: ProfileData | null;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Track ongoing profile fetch to prevent duplicates
  const fetchingProfileRef = useRef<string | null>(null);
  const profileCacheRef = useRef<{ userId: string; profile: Profile; timestamp: number } | null>(null);
  // Track whether initial load is complete - skip onAuthStateChange profile fetches until then
  const initialLoadCompleteRef = useRef(false);

  // Fetch user profile with timeout and deduplication
  const fetchProfile = async (userId: string) => {
    if (!supabase) {
      console.error('fetchProfile: supabase client is null');
      return null;
    }

    // Check cache first (valid for 5 seconds to dedupe rapid calls)
    const cache = profileCacheRef.current;
    if (cache && cache.userId === userId && Date.now() - cache.timestamp < 5000) {
      console.log('fetchProfile: returning cached profile for', userId);
      return cache.profile;
    }

    // If already fetching for this user, skip duplicate request
    if (fetchingProfileRef.current === userId) {
      console.log('fetchProfile: already fetching for', userId, '- skipping duplicate');
      return null;
    }

    fetchingProfileRef.current = userId;
    console.log('fetchProfile: fetching for userId:', userId);
    const startTime = Date.now();

    // Add timeout to profile fetch - 10s should be plenty
    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      console.error('fetchProfile: TIMEOUT after 10s');
    }, 10000);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      clearTimeout(timeoutId);

      if (didTimeout) {
        // Timeout fired while we were waiting - treat as failure
        fetchingProfileRef.current = null;
        return null;
      }

      console.log('fetchProfile: query completed in', Date.now() - startTime, 'ms');

      if (error) {
        console.error('Error fetching profile:', error);
        const errorCode = 'code' in error ? (error as { code?: string }).code : undefined;

        // Check if this is an auth error - token might be invalid
        if (errorCode === 'PGRST301' || error.message?.includes('JWT')) {
          console.error('Auth token may be invalid, attempting to refresh session...');
          const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshData.session) {
            console.log('Session refreshed, retrying profile fetch...');
            const { data: retryData, error: retryError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
            if (!retryError && retryData) {
              const retryProfile = retryData as Profile;
              profileCacheRef.current = { userId, profile: retryProfile, timestamp: Date.now() };
              fetchingProfileRef.current = null;
              return retryProfile;
            }
          }
        }
        fetchingProfileRef.current = null;
        return null;
      }

      console.log('fetchProfile: got profile data:', data?.display_name);
      const profileData = data as Profile;

      // Cache the result
      profileCacheRef.current = { userId, profile: profileData, timestamp: Date.now() };
      fetchingProfileRef.current = null;

      return profileData;
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('fetchProfile: unexpected error:', err);
      fetchingProfileRef.current = null;
      return null;
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (user) {
      const profileData = await fetchProfile(user.id);
      setProfile(profileData);
    }
  };

  // Initialize auth state
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    // Timeout to prevent infinite loading - 15 seconds max
    let authTimeoutId: NodeJS.Timeout | null = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth initialization timed out after 15s');
        initialLoadCompleteRef.current = true;
        setLoading(false);
      }
      authTimeoutId = null;
    }, 15000);

    // Get initial session
    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (!mounted) return;
        // Clear the timeout since we got a response
        if (authTimeoutId) {
          clearTimeout(authTimeoutId);
          authTimeoutId = null;
        }
        if (error) {
          console.error('Error getting session:', error);
          setLoading(false);
          return;
        }
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          // Only update profile if we got data - don't overwrite existing profile with null from timeout
          if (mounted && profileData) setProfile(profileData);
        }
        // Mark initial load complete - onAuthStateChange can now fetch profiles
        initialLoadCompleteRef.current = true;
        if (mounted) setLoading(false);
      })
      .catch((err) => {
        console.error('Auth initialization error:', err);
        if (authTimeoutId) {
          clearTimeout(authTimeoutId);
          authTimeoutId = null;
        }
        if (mounted) setLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        if (!mounted) return;

        console.log('onAuthStateChange:', event);

        // During initial load, only update session/user state - let getSession() handle the profile fetch
        // This prevents duplicate/hung requests from SIGNED_IN or INITIAL_SESSION events
        if (!initialLoadCompleteRef.current) {
          console.log('onAuthStateChange: skipping profile fetch during initial load');
          setSession(session);
          setUser(session?.user ?? null);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const profileData = await fetchProfile(session.user.id);
          // Only update profile if we got data - don't overwrite existing profile with null from timeout
          if (mounted && profileData) setProfile(profileData);
        } else {
          // Only clear profile when there's explicitly no session (sign out)
          setProfile(null);
        }

        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      if (authTimeoutId) clearTimeout(authTimeoutId);
      subscription.unsubscribe();
    };
  }, []);

  // Sign up
  const signUp = async (email: string, password: string, displayName?: string) => {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName || email.split('@')[0],
        },
      },
    });

    return { error: error as Error | null };
  };

  // Sign in
  const signIn = async (email: string, password: string) => {
    if (!supabase) {
      return { error: new Error('Supabase not configured') };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error: error as Error | null };
  };

  // Sign out
  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
  };

  // Update profile
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!supabase || !user) {
      return { error: new Error('Not authenticated') };
    }

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (!error) {
      // Refresh profile after update
      await refreshProfile();
    }

    return { error: error as Error | null };
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper hook to require authentication
export function useRequireAuth() {
  const auth = useAuth();

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      // Could redirect to login here if needed
    }
  }, [auth.loading, auth.user]);

  return auth;
}
