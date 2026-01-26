import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST() {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Get all tour posts with open or full status
  const { data: trips, error: tripsError } = await supabase
    .from('tour_posts')
    .select('id, title, spots_available, status')
    .in('status', ['open', 'full']);

  if (tripsError) {
    return NextResponse.json({ error: tripsError.message }, { status: 500 });
  }

  if (!trips || trips.length === 0) {
    return NextResponse.json({ message: 'No trips found to check', fixed: 0 });
  }

  const results: { title: string; oldStatus: string; newStatus: string; spotsAvailable: number }[] = [];

  for (const trip of trips) {
    // Determine what the status SHOULD be based on spots_available
    const shouldBeFull = trip.spots_available === 0;
    const currentlyFull = trip.status === 'full';

    let needsFix = false;
    let newStatus = trip.status;

    if (shouldBeFull && !currentlyFull) {
      // spots_available is 0 but status isn't 'full'
      newStatus = 'full';
      needsFix = true;
    } else if (!shouldBeFull && currentlyFull) {
      // spots_available > 0 but status is 'full'
      newStatus = 'open';
      needsFix = true;
    }

    if (needsFix) {
      const { error: updateError } = await supabase
        .from('tour_posts')
        .update({ status: newStatus })
        .eq('id', trip.id);

      if (!updateError) {
        results.push({
          title: trip.title,
          oldStatus: trip.status,
          newStatus,
          spotsAvailable: trip.spots_available,
        });
      }
    }
  }

  return NextResponse.json({
    message: `Fixed ${results.length} trips`,
    fixed: results.length,
    checked: trips.length,
    details: results,
  });
}

// GET to preview what would be fixed (dry run)
export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  // Get all tour posts with open or full status
  const { data: trips, error: tripsError } = await supabase
    .from('tour_posts')
    .select('id, title, spots_available, status')
    .in('status', ['open', 'full']);

  if (tripsError) {
    return NextResponse.json({ error: tripsError.message }, { status: 500 });
  }

  if (!trips || trips.length === 0) {
    return NextResponse.json({ message: 'No trips found to check', wouldFix: [] });
  }

  const wouldFix: { title: string; currentStatus: string; correctStatus: string; spotsAvailable: number }[] = [];

  for (const trip of trips) {
    const shouldBeFull = trip.spots_available === 0;
    const currentlyFull = trip.status === 'full';

    if (shouldBeFull && !currentlyFull) {
      wouldFix.push({
        title: trip.title,
        currentStatus: trip.status,
        correctStatus: 'full',
        spotsAvailable: trip.spots_available,
      });
    } else if (!shouldBeFull && currentlyFull) {
      wouldFix.push({
        title: trip.title,
        currentStatus: trip.status,
        correctStatus: 'open',
        spotsAvailable: trip.spots_available,
      });
    }
  }

  return NextResponse.json({
    message: `Would fix ${wouldFix.length} of ${trips.length} trips`,
    wouldFix,
  });
}
