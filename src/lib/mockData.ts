import { Forecast, AvalancheProblem, AspectElevationRose } from '@/types/forecast';

// Mock data for development without Supabase
const mockRoseAllHigh: AspectElevationRose = {
  N: { alpine: true, treeline: true, below_treeline: false },
  NE: { alpine: true, treeline: true, below_treeline: false },
  E: { alpine: true, treeline: false, below_treeline: false },
  SE: { alpine: false, treeline: false, below_treeline: false },
  S: { alpine: false, treeline: false, below_treeline: false },
  SW: { alpine: false, treeline: false, below_treeline: false },
  W: { alpine: true, treeline: false, below_treeline: false },
  NW: { alpine: true, treeline: true, below_treeline: false },
};

const mockRoseWindSlab: AspectElevationRose = {
  N: { alpine: true, treeline: true, below_treeline: false },
  NE: { alpine: true, treeline: true, below_treeline: false },
  E: { alpine: true, treeline: false, below_treeline: false },
  SE: { alpine: false, treeline: false, below_treeline: false },
  S: { alpine: false, treeline: false, below_treeline: false },
  SW: { alpine: false, treeline: false, below_treeline: false },
  W: { alpine: false, treeline: false, below_treeline: false },
  NW: { alpine: true, treeline: false, below_treeline: false },
};

const mockProblems: AvalancheProblem[] = [
  {
    id: '1',
    type: 'persistent_slab',
    aspect_elevation: mockRoseAllHigh,
    likelihood: 'Possible',
    size: 'D2-D3',
  },
  {
    id: '2',
    type: 'wind_slab',
    aspect_elevation: mockRoseWindSlab,
    likelihood: 'Likely',
    size: 'D1-D2',
  },
];

export const mockForecasts: Forecast[] = [
  {
    id: 'fc1',
    zone: 'northwest',
    issue_date: new Date().toISOString().split('T')[0],
    valid_date: new Date().toISOString().split('T')[0],
    danger_alpine: 3,
    danger_treeline: 2,
    danger_below_treeline: 1,
    bottom_line:
      'Dangerous avalanche conditions exist on steep, wind-loaded slopes at and above treeline. Careful snowpack evaluation, cautious route-finding, and conservative decision-making are essential.',
    discussion:
      'A persistent slab problem continues to be our primary concern. This weak layer of facets was buried in mid-December and has been slowly healing. However, recent stress from new snow and wind loading has shown it can still produce dangerous avalanches. Additionally, strong southwest winds yesterday created fresh wind slabs on northeast through east aspects above treeline.',
    problems: mockProblems,
    created_at: new Date().toISOString(),
  },
  {
    id: 'fc2',
    zone: 'northwest',
    issue_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    valid_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    danger_alpine: 3,
    danger_treeline: 3,
    danger_below_treeline: 2,
    bottom_line:
      'Avalanche danger is CONSIDERABLE on all aspects at and above treeline. Exercise caution in avalanche terrain.',
    discussion:
      'Storm snow from the past 48 hours has increased the stress on the persistent weak layer. Natural avalanches were observed yesterday on north-facing slopes near treeline.',
    problems: [mockProblems[0]],
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'fc3',
    zone: 'northwest',
    issue_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    valid_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    danger_alpine: 2,
    danger_treeline: 2,
    danger_below_treeline: 1,
    bottom_line:
      'Moderate avalanche danger exists above treeline. Use caution on steep, wind-loaded terrain.',
    discussion:
      'The snowpack is slowly stabilizing after last week\'s storm cycle. The persistent weak layer continues to be a concern for larger avalanches.',
    problems: [mockProblems[0]],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

export function getMockForecast(zone: string = 'northwest'): Forecast | null {
  return mockForecasts.find((f) => f.zone === zone) || null;
}

export function getMockForecasts(zone: string = 'northwest', limit: number = 7): Forecast[] {
  return mockForecasts.filter((f) => f.zone === zone).slice(0, limit);
}
