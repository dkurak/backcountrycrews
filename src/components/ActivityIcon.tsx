import { Bike, Footprints, Mountain, MountainSnow, TreePine, Truck, type LucideIcon } from 'lucide-react';
import type { ActivityType } from '@/lib/partners';

const ICONS: Record<ActivityType, LucideIcon> = {
  ski_tour: MountainSnow,
  offroad: Truck,
  mountain_bike: Bike,
  trail_run: Footprints,
  hike: TreePine,
  climb: Mountain,
};

export function ActivityIcon({ activity, className = 'h-4 w-4' }: { activity: ActivityType; className?: string }) {
  const Icon = ICONS[activity] ?? MountainSnow;
  return <Icon className={className} aria-hidden="true" />;
}
