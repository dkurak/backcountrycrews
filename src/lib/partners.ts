import { supabase } from './supabase';
import { generateTripSlug } from './slugify';

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
  ski_tour: 'bg-slate-200 text-slate-700',
  offroad: 'bg-amber-200 text-amber-800',
  mountain_bike: 'bg-teal-200 text-teal-800',
  trail_run: 'bg-violet-200 text-violet-800',
  hike: 'bg-stone-200 text-stone-700',
  climb: 'bg-rose-200 text-rose-800',
};

export const ACTIVITY_ICONS: Record<ActivityType, string> = {
  ski_tour: '⛷️',
  offroad: '🛻',
  mountain_bike: '🚵',
  trail_run: '🏃',
  hike: '🥾',
  climb: '🧗',
};

// Trip Report Types
export interface SkiTourConditions {
  snow_quality?: 'powder' | 'crud' | 'corn' | 'ice' | 'variable';
  dangers_noticed?: string;
  skintrack_condition?: 'excellent' | 'good' | 'fair' | 'poor' | 'not_established';
  descent_quality?: 'excellent' | 'good' | 'fair' | 'poor' | 'unskiable';
}

export interface OffroadConditions {
  trail_condition?: 'excellent' | 'good' | 'muddy' | 'washed_out';
  obstacles?: string;
  difficulty_rating?: 'easier_than_expected' | 'as_expected' | 'harder_than_expected';
}

export interface MountainBikeConditions {
  trail_condition?: 'tacky' | 'dry' | 'dusty' | 'muddy' | 'wet';
  obstacles?: string;
}

export interface HikeConditions {
  trail_condition?: 'clear' | 'overgrown' | 'muddy' | 'snow';
  obstacles?: string;
}

export interface ClimbConditions {
  route_condition?: 'excellent' | 'good' | 'fair' | 'poor';
  rock_quality?: 'solid' | 'loose' | 'variable';
  difficulty_rating?: 'easier_than_expected' | 'as_expected' | 'harder_than_expected';
}

export type ActivityConditions =
  | SkiTourConditions
  | OffroadConditions
  | MountainBikeConditions
  | HikeConditions
  | ClimbConditions;

export interface TripReport {
  overall_rating: 1 | 2 | 3 | 4 | 5;
  summary: string;
  conditions: ActivityConditions;
}

export interface TourPost {
  id: string;
  user_id: string;
  slug: string | null;
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
  trip_report: TripReport | null;
  report_submitted_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined profile data
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
    experience_level: string | null;
    certifications: string[] | null;
  };
  // Computed: count of accepted responses
  accepted_count?: number;
  // Computed: count of pending responses (for organizers)
  pending_count?: number;
  // Computed: count of attendees for completed trips (includes organizer)
  attendance_count?: number;
}

export interface TourResponse {
  id: string;
  tour_id: string;
  user_id: string;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  withdrawal_message: string | null;
  attended: boolean | null;
  created_at: string;
  // Joined profile data
  profiles?: {
    display_name: string | null;
    experience_level: string | null;
    has_beacon: boolean;
    has_probe: boolean;
    has_shovel: boolean;
    has_radio: boolean;
    has_satellite: boolean;
    has_first_aid: boolean;
  };
}

// Participant info shown publicly on tours
export interface TourParticipant {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  experience_level: string | null;
}

// Participant with contact info (for confirmed tours)
export interface TourParticipantWithContact extends TourParticipant {
  phone: string | null;
  email: string | null;
  attended: boolean | null;
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

// Notification types
export interface UserNotification {
  id: string;
  user_id: string;
  type: 'trip_accepted' | 'trip_confirmed' | 'participant_withdrawn';
  trip_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
  tour_posts?: { title: string; tour_date: string; activity: ActivityType };
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
          avatar_url,
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
        .select('tour_id, attended')
        .in('tour_id', tourIds)
        .eq('status', 'accepted');

      if (responses) {
        // Count accepted responses per tour
        const acceptedCountMap: Record<string, number> = {};
        const attendedCountMap: Record<string, number> = {};

        responses.forEach(r => {
          acceptedCountMap[r.tour_id] = (acceptedCountMap[r.tour_id] || 0) + 1;
          // Count attendance (only for completed trips where attended is marked)
          if (r.attended === true) {
            attendedCountMap[r.tour_id] = (attendedCountMap[r.tour_id] || 0) + 1;
          }
        });

        // Add counts to tours
        tours.forEach(tour => {
          tour.accepted_count = acceptedCountMap[tour.id] || 0;
          // For completed trips, add attendance count (attendees + organizer)
          if (tour.status === 'completed') {
            tour.attendance_count = (attendedCountMap[tour.id] || 0) + 1; // +1 for organizer
          }
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
          avatar_url,
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
          avatar_url,
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

// Get a single tour post by ID, short ID, or slug
// Supports: full UUID, short ID (first 8 chars), or full slug
export async function getTourPost(idOrShortId: string): Promise<TourPost | null> {
  if (!supabase) return null;
  const client = supabase;

  const fetchData = async () => {
    // Check if it's a full UUID
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isFullUuid = uuidPattern.test(idOrShortId);

    const baseSelect = `
      *,
      profiles (
        display_name,
        avatar_url,
        experience_level,
        certifications
      )
    `;

    if (isFullUuid) {
      // Full UUID - exact match on id
      const { data, error } = await client
        .from('tour_posts')
        .select(baseSelect)
        .eq('id', idOrShortId)
        .single();

      if (error) {
        console.error('Error fetching tour post by UUID:', error);
        return null;
      }
      return data as TourPost;
    }

    // Not a UUID - try matching by slug (which ends with the short ID)
    // The slug format is: title-slug-shortid (e.g., "morning-tour-86db9d11")
    const { data, error } = await client
      .from('tour_posts')
      .select(baseSelect)
      .ilike('slug', `%-${idOrShortId}`)
      .single();

    if (!error && data) {
      return data as TourPost;
    }

    // Fallback: try exact slug match (in case the full slug was passed)
    const { data: exactMatch, error: exactError } = await client
      .from('tour_posts')
      .select(baseSelect)
      .eq('slug', idOrShortId)
      .single();

    if (exactError) {
      console.error('Error fetching tour post:', exactError);
      return null;
    }

    return exactMatch as TourPost;
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

// Get IDs of trips the user has joined (accepted responses)
export async function getJoinedTripIds(userId: string): Promise<Set<string>> {
  if (!supabase) return new Set();
  const client = supabase;

  const { data, error } = await client
    .from('tour_responses')
    .select('tour_id')
    .eq('user_id', userId)
    .eq('status', 'accepted');

  if (error) {
    console.error('Error fetching joined trips:', error);
    return new Set();
  }

  return new Set(data?.map(r => r.tour_id) || []);
}

// Create a tour post
export async function createTourPost(
  userId: string,
  post: Omit<TourPost, 'id' | 'user_id' | 'slug' | 'status' | 'created_at' | 'updated_at' | 'profiles' | 'planning_notes' | 'accepted_count' | 'trip_report' | 'report_submitted_at' | 'pending_count'>
): Promise<{ data: TourPost | null; error: Error | null }> {
  if (!supabase) {
    return { data: null, error: new Error('Supabase not configured') };
  }

  // Determine initial status based on date
  // Past dates = completed (for historical records)
  // Future/today = open
  const today = new Date().toISOString().split('T')[0];
  const initialStatus = post.tour_date < today ? 'completed' : 'open';

  // First insert without slug to get the ID
  const { data, error } = await supabase
    .from('tour_posts')
    .insert({
      ...post,
      user_id: userId,
      status: initialStatus,
    })
    .select()
    .single();

  if (error) {
    return { data: null, error: error as unknown as Error };
  }

  // Generate and save the slug using the new ID
  const slug = generateTripSlug(post.title, data.id);
  await supabase
    .from('tour_posts')
    .update({ slug })
    .eq('id', data.id);

  return { data: { ...data, slug } as TourPost, error: null };
}

// Update a tour post
export async function updateTourPost(
  idOrShortId: string,
  updates: Partial<TourPost>
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  // Check if it's a full UUID
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isFullUuid = uuidPattern.test(idOrShortId);

  if (isFullUuid) {
    // Full UUID - update directly
    const { error } = await supabase
      .from('tour_posts')
      .update(updates)
      .eq('id', idOrShortId);

    return { error: error as unknown as Error | null };
  }

  // Short ID or slug - first find the full UUID
  const trip = await getTourPost(idOrShortId);
  if (!trip) {
    return { error: new Error('Trip not found') };
  }

  // Update using the full UUID
  const { error } = await supabase
    .from('tour_posts')
    .update(updates)
    .eq('id', trip.id);

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
          avatar_url,
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
    type ProfileData = { display_name: string | null; avatar_url: string | null; experience_level: string | null };
    return (data || []).map(r => {
      const profile = r.profiles as unknown as ProfileData | null;
      return {
        user_id: r.user_id,
        display_name: profile?.display_name || null,
        avatar_url: profile?.avatar_url || null,
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
    .upsert({
      tour_id: tourId,
      user_id: userId,
      message: message || null,
      status: 'pending',
      withdrawal_message: null,
    }, { onConflict: 'tour_id,user_id' });

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

  // First get the response to find the user, tour, and CURRENT status
  const { data: response, error: fetchError } = await supabase
    .from('tour_responses')
    .select('user_id, tour_id, status')
    .eq('id', responseId)
    .single();

  if (fetchError || !response) {
    return { error: fetchError as unknown as Error };
  }

  const previousStatus = response.status;

  // Update the response status
  const { error } = await supabase
    .from('tour_responses')
    .update({ status })
    .eq('id', responseId);

  if (error) {
    return { error: error as unknown as Error };
  }

  // Get current trip details
  const { data: trip } = await supabase
    .from('tour_posts')
    .select('title, spots_available, status')
    .eq('id', response.tour_id)
    .single();

  if (trip) {
    // Update spots_available based on status transition
    if (status === 'accepted' && previousStatus !== 'accepted') {
      // Accepting someone: decrement spots
      const newSpotsAvailable = Math.max(0, trip.spots_available - 1);
      const newTripStatus = newSpotsAvailable === 0 ? 'full' : trip.status;

      await supabase
        .from('tour_posts')
        .update({
          spots_available: newSpotsAvailable,
          status: newTripStatus === 'open' || newTripStatus === 'full' ? newTripStatus : trip.status
        })
        .eq('id', response.tour_id);
    } else if (status === 'declined' && previousStatus === 'accepted') {
      // Declining a previously accepted person: increment spots
      const newSpotsAvailable = trip.spots_available + 1;
      const newTripStatus = trip.status === 'full' ? 'open' : trip.status;

      await supabase
        .from('tour_posts')
        .update({
          spots_available: newSpotsAvailable,
          status: newTripStatus
        })
        .eq('id', response.tour_id);
    }

    // Create notification for accepted users
    if (status === 'accepted') {
      await supabase.from('notifications').insert({
        user_id: response.user_id,
        type: 'trip_accepted',
        trip_id: response.tour_id,
        message: `You've been accepted to "${trip.title}"!`,
      });
    }
  }

  return { error: null };
}

// Withdraw from a tour (self-removal by participant)
export async function withdrawFromTrip(
  tourId: string,
  userId: string,
  withdrawalMessage: string,
  notifyParticipants: boolean = true
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  // 1. Get the user's current response
  const { data: response, error: fetchError } = await supabase
    .from('tour_responses')
    .select('id, status')
    .eq('tour_id', tourId)
    .eq('user_id', userId)
    .single();

  if (fetchError || !response) {
    return { error: new Error('Response not found') };
  }

  if (response.status !== 'pending' && response.status !== 'accepted') {
    return { error: new Error('Cannot withdraw from this status') };
  }

  const wasAccepted = response.status === 'accepted';

  // 2. Update the response to 'withdrawn'
  const { error: updateError } = await supabase
    .from('tour_responses')
    .update({
      status: 'withdrawn',
      withdrawal_message: withdrawalMessage || null,
    })
    .eq('id', response.id);

  if (updateError) {
    return { error: updateError as unknown as Error };
  }

  // 3. Get trip info for notifications and spot management
  const { data: trip } = await supabase
    .from('tour_posts')
    .select('title, spots_available, status, user_id')
    .eq('id', tourId)
    .single();

  // 4. If was accepted, free up a spot
  if (trip && wasAccepted) {
    const newSpots = trip.spots_available + 1;
    const newTripStatus = trip.status === 'full' ? 'open' : trip.status;

    await supabase
      .from('tour_posts')
      .update({
        spots_available: newSpots,
        status: newTripStatus,
      })
      .eq('id', tourId);
  }

  if (!trip) {
    return { error: null };
  }

  // 5. Get the withdrawing user's display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', userId)
    .single();

  const displayName = profile?.display_name || 'A participant';

  // 6. Always notify the organizer
  await supabase.from('notifications').insert({
    user_id: trip.user_id,
    type: 'participant_withdrawn',
    trip_id: tourId,
    message: `${displayName} has withdrawn from "${trip.title}".`,
  });

  // 7. Optionally notify other accepted participants
  if (notifyParticipants) {
    const { data: otherParticipants } = await supabase
      .from('tour_responses')
      .select('user_id')
      .eq('tour_id', tourId)
      .eq('status', 'accepted')
      .neq('user_id', userId);

    if (otherParticipants && otherParticipants.length > 0) {
      const notifications = otherParticipants.map((p) => ({
        user_id: p.user_id,
        type: 'participant_withdrawn' as const,
        trip_id: tourId,
        message: `${displayName} has withdrawn from "${trip.title}".`,
      }));

      await supabase.from('notifications').insert(notifications);
    }
  }

  return { error: null };
}

// Get users looking for partners
export async function getPartnersLooking(zone?: string): Promise<{
  id: string;
  display_name: string | null;
  avatar_url: string | null;
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
      avatar_url,
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
    // Get accepted participants with attendance data
    const { data: responses, error: responsesError } = await client
      .from('tour_responses')
      .select('user_id, attended')
      .eq('tour_id', tourId)
      .eq('status', 'accepted');

    if (responsesError) {
      console.error('Error fetching tour responses:', responsesError);
      return [];
    }

    // Create a map of user_id to attendance
    const attendanceMap = new Map<string, boolean | null>();
    responses?.forEach(r => {
      attendanceMap.set(r.user_id, r.attended);
    });

    // Get user IDs (participants + organizer)
    const userIds = [tourOwnerId, ...(responses?.map(r => r.user_id) || [])];

    // Get profiles with contact info
    const { data: profiles, error: profilesError } = await client
      .from('profiles')
      .select('id, display_name, avatar_url, experience_level, phone, email')
      .in('id', userIds);

    if (profilesError) {
      console.error('Error fetching participant profiles:', profilesError);
      return [];
    }

    return (profiles || []).map(p => ({
      user_id: p.id,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
      experience_level: p.experience_level,
      phone: p.phone,
      email: p.email,
      attended: p.id === tourOwnerId ? true : (attendanceMap.get(p.id) ?? null),
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

  if (error) {
    return { error: error as unknown as Error };
  }

  // If confirmed, notify all accepted participants
  if (status === 'confirmed') {
    // Get trip details
    const { data: trip } = await supabase
      .from('tour_posts')
      .select('title')
      .eq('id', tourId)
      .single();

    // Get all accepted participants
    const { data: responses } = await supabase
      .from('tour_responses')
      .select('user_id')
      .eq('tour_id', tourId)
      .eq('status', 'accepted');

    if (trip && responses && responses.length > 0) {
      // Create notifications for all participants
      const notifications = responses.map((r) => ({
        user_id: r.user_id,
        type: 'trip_confirmed' as const,
        trip_id: tourId,
        message: `"${trip.title}" is confirmed - It's On!`,
      }));

      await supabase.from('notifications').insert(notifications);
    }
  }

  return { error: null };
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

// Update attendance for multiple participants
export async function updateAttendance(
  tourId: string,
  attendance: Record<string, boolean>
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  // Get all accepted responses for this tour
  const { data: responses, error: fetchError } = await supabase
    .from('tour_responses')
    .select('id, user_id')
    .eq('tour_id', tourId)
    .eq('status', 'accepted');

  if (fetchError) {
    return { error: fetchError as unknown as Error };
  }

  if (!responses || responses.length === 0) {
    return { error: null };
  }

  // Update each response individually to work with RLS
  for (const response of responses) {
    const { error } = await supabase
      .from('tour_responses')
      .update({ attended: attendance[response.user_id] ?? null })
      .eq('id', response.id)
      .eq('tour_id', tourId); // Include tour_id for RLS policy check

    if (error) {
      console.error('Error updating attendance for response:', response.id, error);
      return { error: error as unknown as Error };
    }
  }

  return { error: null };
}

// Submit or update trip report
export async function submitTripReport(
  tourId: string,
  report: TripReport
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('tour_posts')
    .update({
      trip_report: report as unknown as Record<string, unknown>,
      report_submitted_at: new Date().toISOString(),
    })
    .eq('id', tourId);

  return { error: error as unknown as Error | null };
}

// ===== Notification Functions =====

// Get user notifications
export async function getUserNotifications(
  userId: string,
  filter: 'unread' | 'all' = 'all'
): Promise<UserNotification[]> {
  if (!supabase) return [];
  const client = supabase;

  const fetchData = async () => {
    let query = client
      .from('notifications')
      .select(`
        *,
        tour_posts (
          title,
          tour_date,
          activity
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (filter === 'unread') {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }

    return data as UserNotification[];
  };

  return withTimeout(fetchData(), 10000, []);
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (!supabase) return 0;
  const client = supabase;

  const fetchData = async () => {
    const { count, error } = await client
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) {
      console.error('Error counting notifications:', error);
      return 0;
    }

    return count || 0;
  };

  return withTimeout(fetchData(), 5000, 0);
}

// Mark a single notification as read
export async function markNotificationRead(
  notificationId: string
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  return { error: error as unknown as Error | null };
}

// Mark all notifications as read for a user
export async function markAllNotificationsRead(
  userId: string
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  return { error: error as unknown as Error | null };
}

// Delete a notification
export async function deleteNotification(
  notificationId: string
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId);

  return { error: error as unknown as Error | null };
}

// Create a notification (internal helper)
export async function createNotification(
  userId: string,
  type: 'trip_accepted' | 'trip_confirmed',
  tripId: string,
  message: string
): Promise<{ error: Error | null }> {
  if (!supabase) {
    return { error: new Error('Supabase not configured') };
  }

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      trip_id: tripId,
      message,
    });

  return { error: error as unknown as Error | null };
}
