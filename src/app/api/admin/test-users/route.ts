import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const TEST_USER_PASSWORD = 'TestUser123!';
const TEST_EMAIL_DOMAIN = 'backcountrycrews.local';

// Sample user data for variety
const SAMPLE_PROFILES = [
  { name: 'Alex Summit', experience: 'advanced', fitness: 'very_fit', travel: 'skin', years: 8, bio: 'Weekend warrior, love early starts and big days.' },
  { name: 'Jordan Powder', experience: 'intermediate', fitness: 'fit', travel: 'skin', years: 3, bio: 'Still learning but always stoked. AIARE 1 certified.' },
  { name: 'Morgan Steep', experience: 'expert', fitness: 'athlete', travel: 'both', years: 15, bio: 'Former ski patrol, now guiding part-time. Safety first!' },
  { name: 'Casey Dawn', experience: 'intermediate', fitness: 'moderate', travel: 'skin', years: 2, bio: 'New to CB, moved from the Wasatch. Looking for touring buddies.' },
  { name: 'Riley Traverse', experience: 'advanced', fitness: 'very_fit', travel: 'snowmobile', years: 10, bio: 'Sled access opens up the goods. Happy to shuttle.' },
  { name: 'Quinn Cornice', experience: 'beginner', fitness: 'fit', travel: 'skin', years: 1, bio: 'First season touring, have all the gear and eager to learn.' },
  { name: 'Avery Couloir', experience: 'expert', fitness: 'athlete', travel: 'skin', years: 12, bio: 'Splitboarder. Prefer mellow company and steep lines.' },
  { name: 'Taylor Aspect', experience: 'advanced', fitness: 'fit', travel: 'both', years: 6, bio: 'Flexible schedule, can tour weekdays. Usually at Washington Gulch.' },
  { name: 'Jamie Beacon', experience: 'intermediate', fitness: 'very_fit', travel: 'skin', years: 4, bio: 'Trail runner in summer, touring addict in winter.' },
  { name: 'Sam Ridgeline', experience: 'advanced', fitness: 'fit', travel: 'skin', years: 7, bio: 'Mellow touring, good conversation, no hero laps needed.' },
  { name: 'Chris Snowpack', experience: 'expert', fitness: 'very_fit', travel: 'snowmobile', years: 20, bio: 'Old timer. Been touring CB since the 90s.' },
  { name: 'Pat Skintrack', experience: 'beginner', fitness: 'moderate', travel: 'skin', years: 0, bio: 'Just took AIARE 1, looking to get out safely with experienced folks.' },
  { name: 'Drew Facet', experience: 'intermediate', fitness: 'fit', travel: 'skin', years: 3, bio: 'Work from home, flexible schedule. Snodgrass regular.' },
  { name: 'Blake Crust', experience: 'advanced', fitness: 'athlete', travel: 'both', years: 9, bio: 'Dawn patrol enthusiast. Back by noon for work calls.' },
  { name: 'Sage Windboard', experience: 'intermediate', fitness: 'fit', travel: 'skin', years: 2, bio: 'Splitboarder, usually slower than skiers but I bring good snacks.' },
];

const TRAILHEADS = ['washington_gulch', 'snodgrass', 'kebler', 'brush_creek', 'cement_creek'];
const CERTIFICATIONS = [['AIARE 1'], ['AIARE 1', 'WFR'], ['AIARE 2'], ['AIARE 1', 'AIARE 2'], []];

export async function GET() {
  try {
    // Get all test users
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('is_test_user', true)
      .order('display_name');

    if (error) throw error;

    return NextResponse.json({ users: profiles, password: TEST_USER_PASSWORD });
  } catch (error) {
    console.error('Error fetching test users:', error);
    return NextResponse.json({ error: 'Failed to fetch test users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    if (action === 'create') {
      const createdUsers = [];

      for (let i = 0; i < SAMPLE_PROFILES.length; i++) {
        const profile = SAMPLE_PROFILES[i];
        const email = `test${i + 1}@${TEST_EMAIL_DOMAIN}`;

        // Check if user already exists
        const { data: existing } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (existing) {
          createdUsers.push({ email, status: 'already exists' });
          continue;
        }

        // Create auth user
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: TEST_USER_PASSWORD,
          email_confirm: true,
          user_metadata: { display_name: profile.name }
        });

        if (authError) {
          console.error(`Error creating ${email}:`, authError);
          createdUsers.push({ email, status: 'auth error', error: authError.message });
          continue;
        }

        // Update profile with test data
        const randomTrailheads = TRAILHEADS.filter(() => Math.random() > 0.5);
        const randomCerts = CERTIFICATIONS[Math.floor(Math.random() * CERTIFICATIONS.length)];
        const birthYear = 1970 + Math.floor(Math.random() * 35); // Ages roughly 20-55

        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({
            display_name: profile.name,
            is_test_user: true,
            experience_level: profile.experience,
            fitness_level: profile.fitness,
            travel_method: profile.travel,
            years_experience: profile.years,
            bio: profile.bio,
            birth_date: `${birthYear}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
            preferred_trailheads: randomTrailheads,
            certifications: randomCerts,
            has_beacon: true,
            has_probe: true,
            has_shovel: true,
            preferred_zones: Math.random() > 0.3 ? ['southeast', 'northwest'] : ['southeast'],
            looking_for_partners: Math.random() > 0.3,
            typical_start_time: ['6:00 AM', '6:30 AM', '7:00 AM', 'Dawn', '8:00 AM'][Math.floor(Math.random() * 5)],
            show_on_tours: true,
          })
          .eq('id', authUser.user.id);

        if (profileError) {
          console.error(`Error updating profile for ${email}:`, profileError);
        }

        createdUsers.push({ email, status: 'created', id: authUser.user.id });
      }

      // Create sample tours (old ski-only tours)
      await createSampleTours();

      // Generate rich multi-activity historical data (2+ years)
      const { data: historyResult, error: historyError } = await supabaseAdmin
        .rpc('generate_sample_activity_data');

      const historyMessage = historyError
        ? `Historical data error: ${historyError.message}`
        : historyResult || 'Historical data generated';

      return NextResponse.json({ created: createdUsers, history: historyMessage });
    }

    if (action === 'generate_history') {
      // Just regenerate historical data without recreating users
      // First, clear existing historical trips created by the function
      await supabaseAdmin
        .from('tour_posts')
        .delete()
        .in('user_id', (await supabaseAdmin.from('profiles').select('id').eq('is_test_user', true)).data?.map(u => u.id) || [])
        .neq('activity', 'ski_tour'); // Keep original ski tours for now

      const { data: historyResult, error: historyError } = await supabaseAdmin
        .rpc('generate_sample_activity_data');

      if (historyError) {
        return NextResponse.json({ error: historyError.message }, { status: 500 });
      }

      return NextResponse.json({ history: historyResult });
    }

    if (action === 'delete') {
      // Get all test user IDs
      const { data: testUsers } = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .eq('is_test_user', true);

      if (!testUsers || testUsers.length === 0) {
        return NextResponse.json({ message: 'No test users to delete' });
      }

      const userIds = testUsers.map(u => u.id);

      // Delete tour responses
      await supabaseAdmin
        .from('tour_responses')
        .delete()
        .in('user_id', userIds);

      // Delete tour responses to test user tours
      const { data: testTours } = await supabaseAdmin
        .from('tour_posts')
        .select('id')
        .in('user_id', userIds);

      if (testTours && testTours.length > 0) {
        await supabaseAdmin
          .from('tour_responses')
          .delete()
          .in('tour_id', testTours.map(t => t.id));
      }

      // Delete tours
      await supabaseAdmin
        .from('tour_posts')
        .delete()
        .in('user_id', userIds);

      // Delete auth users (this cascades to profiles)
      for (const user of testUsers) {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      }

      return NextResponse.json({ deleted: testUsers.length });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in test users API:', error);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}

async function createSampleTours() {
  // Get test users
  const { data: testUsers } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, travel_method')
    .eq('is_test_user', true);

  if (!testUsers || testUsers.length < 5) return;

  const today = new Date();
  const tours = [
    {
      title: 'Morning tour to Coney\'s',
      description: 'Easy-moderate skin up Washington Gulch to Coney\'s. Looking for 1-2 partners. Plan to be back by noon.',
      zone: 'southeast',
      trailhead: 'washington_gulch',
      experience_required: 'intermediate',
      spots: 2,
      daysFromNow: 1,
      time: '6:30 AM',
      travel_method: 'skin',
    },
    {
      title: 'Snodgrass laps',
      description: 'Quick dawn patrol on Snodgrass. Multiple laps if conditions allow. Need to be efficient.',
      zone: 'southeast',
      trailhead: 'snodgrass',
      experience_required: 'intermediate',
      spots: 3,
      daysFromNow: 2,
      time: '6:00 AM',
      travel_method: 'skin',
    },
    {
      title: 'Red Lady via Kebler',
      description: 'Longer day to Red Lady. Bring lunch and plenty of water. 6+ hour day expected.',
      zone: 'northwest',
      trailhead: 'kebler',
      experience_required: 'advanced',
      spots: 2,
      daysFromNow: 3,
      time: '5:30 AM',
      travel_method: 'skin',
    },
    {
      title: 'Sled-assisted Gothic tour',
      description: 'Snowmobile shuttle to Gothic, then skin up for some turns. Sled provided.',
      zone: 'northwest',
      trailhead: null,
      experience_required: 'intermediate',
      spots: 2,
      daysFromNow: 4,
      time: '7:00 AM',
      travel_method: 'snowmobile',
    },
    {
      title: 'Beginner-friendly Snodgrass',
      description: 'Taking it slow, focus on safety and learning. Perfect for those new to touring. I\'ll share beta.',
      zone: 'southeast',
      trailhead: 'snodgrass',
      experience_required: 'beginner',
      spots: 3,
      daysFromNow: 5,
      time: '8:00 AM',
      travel_method: 'skin',
    },
    {
      title: 'Paradise Divide mission',
      description: 'Big day in the alpine. Need experienced partners comfortable with exposure.',
      zone: 'northwest',
      trailhead: null,
      experience_required: 'expert',
      spots: 1,
      daysFromNow: 6,
      time: '5:00 AM',
      travel_method: 'snowmobile',
    },
    {
      title: 'Mellow Washington Gulch tour',
      description: 'No specific objective, just want to get out and enjoy the snow. Flexible on timing.',
      zone: 'southeast',
      trailhead: 'washington_gulch',
      experience_required: null,
      spots: 4,
      daysFromNow: 1,
      time: '7:30 AM',
      travel_method: 'skin',
    },
    {
      title: 'Brush Creek exploration',
      description: 'Checking out some new-to-me terrain in Brush Creek. Looking for someone who knows the area.',
      zone: 'southeast',
      trailhead: 'brush_creek',
      experience_required: 'advanced',
      spots: 1,
      daysFromNow: 7,
      time: '6:00 AM',
      travel_method: 'skin',
    },
  ];

  // Create tours with different users
  for (let i = 0; i < tours.length; i++) {
    const tour = tours[i];
    const user = testUsers[i % testUsers.length];
    const tourDate = new Date(today);
    tourDate.setDate(tourDate.getDate() + tour.daysFromNow);

    const { data: createdTour, error } = await supabaseAdmin
      .from('tour_posts')
      .insert({
        user_id: user.id,
        title: tour.title,
        description: tour.description,
        tour_date: tourDate.toISOString().split('T')[0],
        tour_time: tour.time,
        zone: tour.zone,
        trailhead: tour.trailhead,
        travel_method: tour.travel_method,
        experience_required: tour.experience_required,
        spots_available: tour.spots,
        gear_requirements: ['Beacon', 'Probe', 'Shovel'],
        status: i < 2 ? 'full' : 'open', // First 2 tours are full
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tour:', error);
      continue;
    }

    // Add some responses to tours
    if (createdTour) {
      const otherUsers = testUsers.filter(u => u.id !== user.id);

      if (i < 2) {
        // Full tours: add accepted responses equal to spots_available
        const acceptedResponders = otherUsers.slice(0, tour.spots);
        for (const responder of acceptedResponders) {
          await supabaseAdmin
            .from('tour_responses')
            .insert({
              tour_id: createdTour.id,
              user_id: responder.id,
              message: [
                'Interested! I have all the gear and experience.',
                'This sounds great, count me in if there\'s room.',
              ][Math.floor(Math.random() * 2)],
              status: 'accepted',
            });
        }
      } else if (i < 5) {
        // Some open tours: add 1-2 accepted responses (partially filled)
        const numAccepted = Math.min(i - 1, tour.spots - 1); // 1 or 2 accepted, leaving room
        const acceptedResponders = otherUsers.slice(0, numAccepted);
        for (const responder of acceptedResponders) {
          await supabaseAdmin
            .from('tour_responses')
            .insert({
              tour_id: createdTour.id,
              user_id: responder.id,
              message: 'I\'d love to join. Free that day.',
              status: 'accepted',
            });
        }
        // Also add some pending responses
        const pendingResponders = otherUsers.slice(numAccepted, numAccepted + 2);
        for (const responder of pendingResponders) {
          await supabaseAdmin
            .from('tour_responses')
            .insert({
              tour_id: createdTour.id,
              user_id: responder.id,
              message: 'Perfect timing for me. Let me know!',
              status: 'pending',
            });
        }
      } else if (i < 7) {
        // Some tours with only pending responses
        const pendingResponders = otherUsers.slice(0, 2);
        for (const responder of pendingResponders) {
          await supabaseAdmin
            .from('tour_responses')
            .insert({
              tour_id: createdTour.id,
              user_id: responder.id,
              message: 'This sounds great, count me in if there\'s room.',
              status: 'pending',
            });
        }
      }
      // Last tour has no responses
    }
  }
}
