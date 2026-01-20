import { supabase } from './supabase';

// Timeout wrapper to prevent hanging requests
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
  );
  try {
    return await Promise.race([promise, timeout]);
  } catch (error) {
    console.warn('Request timed out or failed:', error);
    return fallback;
  }
}

export type ActivityType = 'ski_tour' | 'offroad' | 'mountain_bike' | 'trail_run' | 'hike' | 'climb';

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  ski_tour: 'Ski Tour',
  offroad: 'Offroad',
  mountain_bike: 'Mountain Bike',
  trail_run: 'Trail Run',
  hike: 'Hike',
  climb: 'Climb',
};

export const ACTIVITY_COLORS: Record<ActivityType, string> = {
  ski_tour: 'bg-blue-100 text-blue-700',
  offroad: 'bg-orange-100 text-orange-700',
  mountain_bike: 'bg-green-100 text-green-700',
  trail_run: 'bg-purple-100 text-purple-700',
  hike: 'bg-yellow-100 text-yellow-700',
  climb: 'bg-red-100 text-red-700',
};

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  ski_tour: '⛷️',
  offroad: '🛻',
  mountain_bike: '🚵',
  trail_run: '🏃',
  hike: '🥾',
  climb: '🧗',
};

export interface TourPost {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  tour_date: string;
  tour_time: string | null;
  zone: string;
  region: string | null;
  trailhead: string | null;
  travel_method: 'skin' | 'snowmobile' | 'both' | null;
  meeting_location: string | null;
  experience_required: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  spots_available: number;
  gear_requirements: string[] | null;
  status: 'open' | 'confirmed' | 'full' | 'cancelled' | 'completed';
  activity: ActivityType;
  activity_details: Record<string, unknown> | null;
  planning_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined profile data
  profiles?: {
    display_name: string | null;
    experience_level: string | null;
    certifications: string[] | null;
  };
  // Computed: count of accepted responses
  accepted_count?: number;
  // Computed: count of pending responses (for organizers)
  pending_count?: number;
}

export interface TourResponse {
  id: string;
  tour_id: string;
  user_id: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  // Joined profile data
  profiles?: {
    display_name: string | null;
    experience_level: string | null;
    has_beacon: boolean;
    has_probe: boolean;
    has_shovel: boolean;
  };
}

// Participant info shown publicly on tours
export interface TourParticipant {
  user_id: string;
  display_name: string | null;
  experience_level: string | null;
}

// Participant with contact info (for confirmed tours)
export interface TourParticipantWithContact extends TourParticipant {
  phone: string | null;
  email: string | null;
}

// Tour discussion message
export interface TourMessage {
  id: string;
  tour_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  // Joined profile data
  profiles?: {
    display_name: string | null;
  };
}

// Filter options for tour posts
export interface TourFilters {
  zone?: string;
  activity?: ActivityType;
  timeFrame?: 'upcoming' | 'past' | 'all';
  userId?: string; // For "My Tours" - tours user organized or joined
}

// Get tour posts with filters
export async function getTourPosts(filters: TourFilters = {}): Promise<TourPost[]> {
  if (!supabase) return [];
  const client = supabase;

  const fetchData = async (): Promise<TourPost[]> => {
    const { zone, activity, timeFrame = 'upcoming', userId } = filters;
    const today = new Date().toISOString().split('T')[0];

    let query = client
      .from('tour_posts')
      .select(`
        *,
        profiles (
          display_name,
          experience_level,
          certifications
        )
      `)
      .in('status', ['open', 'full', 'completed']);

    // Time frame filter
    if (timeFrame === 'upcoming') {
      query = query.gte('tour_date', today).order('tour_date', { ascending: true });
    } else if (timeFrame === 'past') {
      query = query.lt('tour_date', today).order('tour_date', { ascending: false });
    } else {
      query = query.order('tour_date', { ascending: false });
    }

    // Zone filter
    if (zone) {
      query = query.eq('zone', zone);
    }

    // Activity filter
    if (activity) {
      query = query.eq('activity', activity);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tour posts:', error);
      return [];
    }

    let tours = data as TourPost[];

    // If filtering by user, also get tours they've joined
    if (userId) {
      // Get tour IDs where user has accepted response
      const { data: joinedResponses } = await client
        .from('tour_responses')
        .select('tour_id')
        .eq('user_id', userId)
        .eq('status', 'accepted');

      const joinedTourIds = new Set(joinedResponses?.map(r => r.tour_id) || []);

      // Filter to only tours user organized or joined
      tours = tours.filter(tour =>
        tour.user_id === userId || joinedTourIds.has(tour.id)
      );
    }

    // Get accepted response counts for all tours
    if (tours.length > 0) {
      const tourIds = tours.map(t => t.id);
      const { data: responses } = await client
        .from('tour_responses')
        .select('tour_id')
        .in('tour_id', tourIds)
        .eq('status', 'accepted');

      if (responses) {
        // Count accepted responses per tour
        const countMap: Record<string, number> = {};
        responses.forEach(r => {
          countMap[r.tour_id] = (countMap[r.tour_id] || 0) + 1;
        });

        // Add counts to tours
        tours.forEach(tour => {
          tour.accepted_count = countMap[tour.id] || 0;
        });
      }
    }

    return tours;
  };

  return withTimeout(fetchData(), 10000, []);
}

// Get trips where user has pending interest (awaiting response from organizer)
export async function getTripsAwaitingResponse(userId: string): Promise<TourPost[]> {
  if (!supabase) return [];
  const client = supabase;

  const fetchData = async (): Promise<TourPost[]> => {
    const today = new Date().toISOString().split('T')[0];

    // Get tour IDs where user has pending response
    const { data: pendingResponses, error: responseError } = await client
      .from('tour_responses')
      .select('tour_id')
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (responseError || !pendingResponses?.length) {
      return [];
    }

    const tourIds = pendingResponses.map(r => r.tour_id);

    // Get the tour posts
    const { data, error } = await client
      .from('tour_posts')
      .select(`
        *,
        profiles (
          display_name,
          experience_level,
          certifications
        )
      `)
      .in('id', tourIds)
      .gte('tour_date', today)
      .in('status', ['open', 'full'])
      .order('tour_date', { ascending: true });

    if (error) {
      console.error('Error fetching pending trips:', error);
      return [];
    }

    return data as TourPost[];
  };

  return withTimeout(fetchData(), 10000, []);
}

// Get trips user organizes that have pending requests
export async function getTripsWithPendingRequests(userId: string): Promise<TourPost[]> {
  if (!supabase) return [];
  const client = supabase;

  const fetchData = async (): Promise<TourPost[]> => {
    const today = new Date().toISOString().split('T')[0];

    // Get user's upcoming trips
    const { data: trips, error: tripsError } = await client
      .from('tour_posts')
      .select(`
        *,
        profiles (
          display_name,
          experience_level,
          certifications
        )
      `)
      .eq('user_id', userId)
      .gte('tour_date', today)
      .in('status', ['open', 'full'])
      .order('tour_date', { ascending: true });

    if (tripsError || !trips?.length) {
      return [];
    }

    const tourIds = trips.map(t => t.id);

    // Get pending response counts
    const { data: responses } = await client
      .from('tour_responses')
      .select('tour_id')
      .in('tour_id', tourIds)
      .eq('status', 'pending');

    if (!responses?.length) {
      return [];
    }

    // Count pending responses per tour
    const countMap: Record<string, number> = {};
    responses.forEach(r => {
      countMap[r.tour_id] = (countMap[r.tour_id] || 0) + 1;
    });

    // Filter to trips with pending requests and add counts
    const tripsWithPending = (trips as TourPost[])
      .filter(tour => countMap[tour.id] > 0)
      .map(tour => ({
        ...tour,
        pending_count: countMap[tour.id],
      }));

    return tripsWithPending;
  };

  return withTimeout(fetchData(), 10000, []);
}

// Get a single tour post
export async function getTourPost(id: string): Promise<TourPost | null> {
  if (!supabase) return null;
  const client = supabase;

  const fetchData = async () => {
    const { data, error } = await client
      .from('tour_posts')
      .select(`
        *,
        profiles (
          display_name,
          experience_level,
          certifications
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching tour post:', error);
      return null;
    }

    return data as TourPost;
  };

  return withTimeout(fetchData(), 10000, null);
}

// Get user's own tour posts
export async function getMyTourPosts(userId: string): Promise<TourPost[]> {
  if (!supabase) return [];
  const client = supabase;

  const fetchData = async () => {
    const { data, error } = await client
      .from('tour_posts')
      .select('*')
      .eq('user_id', userId)
      .order('tour_date', { ascending: false });

    if (error) {
      console.error('Error fetching user tour posts:', error);
      return [];
    }

    return data as TourPost[];
  };

  return withTimeout(fetchData(), 10000, []);
}

// Create a tour post
export async function createTourPost(
  userId: string,
  post: Omit<TourPost, 'id' | 'user_id' | 'status' | 'created_at' | 'updated_at' | 'profiles' | 'planning_notes' | 'accepted_count'>
): Promise<{ data: TourPost | null; error: Error | null }> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase
    .from('tour_posts')
    .insert({
      ...post,
      user_id: userId,
      status: 'open',
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error as unknown as Error };
  }

  return { data: data as TourPost, error: null };
}

// Update a tour post
export async function updateTourPost(
  id: string,
  updates: Partial<TourPost>
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('tour_posts')
    .update(updates)
    .eq('id', id);

  return { error: error as unknown as Error | null };
}

// Delete a tour post
export async function deleteTourPost(id: string): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('tour_posts')
    .delete()
    .eq('id', id);

  return { error: error as unknown as Error | null };
}

// Get responses for a tour post
export async function getTourResponses(tourId: string): Promise<TourResponse[]> {
  if (!supabase) return [];
  const client = supabase;

  const fetchData = async () => {
    const { data, error } = await client
      .from('tour_responses')
      .select(`
        *,
        profiles (
          display_name,
          experience_level,
          has_beacon,
          has_probe,
          has_shovel
        )
      `)
      .eq('tour_id', tourId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tour responses:', error);
      return [];
    }

    return data as TourResponse[];
  };

  return withTimeout(fetchData(), 10000, []);
}

// Get accepted participants for a tour (public view)
export async function getTourParticipants(tourId: string): Promise<TourParticipant[]> {
  if (!supabase) return [];
  const client = supabase;

  const fetchData = async () => {
    const { data, error } = await client
      .from('tour_responses')
      .select(`
        user_id,
        profiles (
          display_name,
          experience_level
        )
      `)
      .eq('tour_id', tourId)
      .eq('status', 'accepted');

    if (error) {
      console.error('Error fetching tour participants:', error);
      return [];
    }

    // Cast profiles to handle Supabase's nested object typing
    type ProfileData = { display_name: string | null; experience_level: string | null };
    return (data || []).map(r => {
      const profile = r.profiles as unknown as ProfileData | null;
      return {
        user_id: r.user_id,
        display_name: profile?.display_name || null,
        experience_level: profile?.experience_level || null,
      };
    });
  };

  return withTimeout(fetchData(), 10000, []);
}

// Create a response to a tour post
export async function createTourResponse(
  tourId: string,
  userId: string,
  message?: string
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('tour_responses')
    .insert({
      tour_id: tourId,
      user_id: userId,
      message: message || null,
      status: 'pending',
    });

  return { error: error as unknown as Error | null };
}

// Update response status (for tour post owner)
export async function updateTourResponseStatus(
  responseId: string,
  status: 'accepted' | 'declined'
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('tour_responses')
    .update({ status })
    .eq('id', responseId);

  return { error: error as unknown as Error | null };
}

// Get users looking for partners
export async function getPartnersLooking(zone?: string): Promise<{
  id: string;
  display_name: string | null;
  experience_level: string | null;
  fitness_level: string | null;
  certifications: string[] | null;
  bio: string | null;
  has_beacon: boolean;
  has_probe: boolean;
  has_shovel: boolean;
  preferred_zones: string[];
}[]> {
  if (!supabase) return [];

  let query = supabase
    .from('profiles')
    .select(`
      id,
      display_name,
      experience_level,
      fitness_level,
      certifications,
      bio,
      has_beacon,
      has_probe,
      has_shovel,
      preferred_zones
    `)
    .eq('looking_for_partners', true);

  if (zone) {
    query = query.contains('preferred_zones', [zone]);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching partners:', error);
    return [];
  }

  return data;
}

// Get tour messages (discussion thread)
export async function getTourMessages(tourId: string): Promise<TourMessage[]> {
  if (!supabase) return [];
  const client = supabase;

  const fetchData = async () => {
    const { data, error } = await client
      .from('tour_messages')
      .select(`
        *,
        profiles (
          display_name
        )
      `)
      .eq('tour_id', tourId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching tour messages:', error);
      return [];
    }

    return data as TourMessage[];
  };

  return withTimeout(fetchData(), 10000, []);
}

// Create a tour message
export async function createTourMessage(
  tourId: string,
  userId: string,
  content: string
): Promise<{ data: TourMessage | null; error: Error | null }> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  const { data, error } = await supabase
    .from('tour_messages')
    .insert({
      tour_id: tourId,
      user_id: userId,
      content,
    })
    .select(`
      *,
      profiles (
        display_name
      )
    `)
    .single();

  if (error) {
    return { data: null, error: error as unknown as Error };
  }

  return { data: data as TourMessage, error: null };
}

// Get participants with contact info (for confirmed tours)
export async function getTourParticipantsWithContact(
  tourId: string,
  tourOwnerId: string
): Promise<TourParticipantWithContact[]> {
  if (!supabase) return [];
  const client = supabase;

  const fetchData = async () => {
    // Get accepted participants
    const { data: responses, error: responsesError } = await client
      .from('tour_responses')
      .select('user_id')
      .eq('tour_id', tourId)
      .eq('status', 'accepted');

    if (responsesError) {
      console.error('Error fetching tour responses:', responsesError);
      return [];
    }

    // Get user IDs (participants + organizer)
    const userIds = [tourOwnerId, ...(responses?.map(r => r.user_id) || [])];

    // Get profiles with contact info
    const { data: profiles, error: profilesError } = await client
      .from('profiles')
      .select('id, display_name, experience_level, phone, email')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching participant profiles:', profilesError);
      return [];
    }

    return (profiles || []).map(p => ({
      user_id: p.id,
      display_name: p.display_name,
      experience_level: p.experience_level,
      phone: p.phone,
      email: p.email,
    }));
  };

  return withTimeout(fetchData(), 10000, []);
}

// Update tour status (for organizer)
export async function updateTourStatus(
  tourId: string,
  status: 'open' | 'confirmed' | 'full' | 'cancelled' | 'completed'
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('tour_posts')
    .update({ status })
    .eq('id', tourId);

  return { error: error as unknown as Error | null };
}

// Update tour planning notes
export async function updateTourPlanningNotes(
  tourId: string,
  planningNotes: string
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('tour_posts')
    .update({ planning_notes: planningNotes })
    .eq('id', tourId);

  return { error: error as unknown as Error | null };
}
