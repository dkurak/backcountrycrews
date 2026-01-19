import { supabase } from './supabase';

export interface TourPost {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  tour_date: string;
  tour_time: string | null;
  zone: string;
  trailhead: string | null;
  travel_method: 'skin' | 'snowmobile' | 'both' | null;
  meeting_location: string | null;
  experience_required: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  spots_available: number;
  gear_requirements: string[] | null;
  status: 'open' | 'full' | 'cancelled' | 'completed';
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
    show_on_tours: boolean;
  };
}

// Participant info shown publicly on tours
export interface TourParticipant {
  user_id: string;
  display_name: string | null;
  experience_level: string | null;
}

// Get all open and full tour posts
export async function getTourPosts(zone?: string): Promise<TourPost[]> {
  if (!supabase) return [];

  let query = supabase
    .from('tour_posts')
    .select(`
      *,
      profiles (
        display_name,
        experience_level,
        certifications
      )
    `)
    .in('status', ['open', 'full'])
    .gte('tour_date', new Date().toISOString().split('T')[0])
    .order('tour_date', { ascending: true });

  if (zone) {
    query = query.eq('zone', zone);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching tour posts:', error);
    return [];
  }

  const tours = data as TourPost[];

  // Get accepted response counts for all tours
  if (tours.length > 0) {
    const tourIds = tours.map(t => t.id);
    const { data: responses } = await supabase
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
}

// Get a single tour post
export async function getTourPost(id: string): Promise<TourPost | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
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
}

// Get user's own tour posts
export async function getMyTourPosts(userId: string): Promise<TourPost[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('tour_posts')
    .select('*')
    .eq('user_id', userId)
    .order('tour_date', { ascending: false });

  if (error) {
    console.error('Error fetching user tour posts:', error);
    return [];
  }

  return data as TourPost[];
}

// Create a tour post
export async function createTourPost(
  userId: string,
  post: Omit<TourPost, 'id' | 'user_id' | 'status' | 'created_at' | 'updated_at' | 'profiles'>
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

  const { data, error } = await supabase
    .from('tour_responses')
    .select(`
      *,
      profiles (
        display_name,
        experience_level,
        has_beacon,
        has_probe,
        has_shovel,
        show_on_tours
      )
    `)
    .eq('tour_id', tourId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching tour responses:', error);
    return [];
  }

  return data as TourResponse[];
}

// Get accepted participants for a tour (public view - respects show_on_tours setting)
export async function getTourParticipants(tourId: string): Promise<TourParticipant[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('tour_responses')
    .select(`
      user_id,
      profiles (
        display_name,
        experience_level,
        show_on_tours
      )
    `)
    .eq('tour_id', tourId)
    .eq('status', 'accepted');

  if (error) {
    console.error('Error fetching tour participants:', error);
    return [];
  }

  // Filter to only those who have show_on_tours enabled (default true)
  // Cast profiles to handle Supabase's nested object typing
  type ProfileData = { display_name: string | null; experience_level: string | null; show_on_tours: boolean | null };
  return (data || [])
    .filter(r => {
      const profile = r.profiles as unknown as ProfileData | null;
      return profile?.show_on_tours !== false;
    })
    .map(r => {
      const profile = r.profiles as unknown as ProfileData | null;
      return {
        user_id: r.user_id,
        display_name: profile?.display_name || null,
        experience_level: profile?.experience_level || null,
      };
    });
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
