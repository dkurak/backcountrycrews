import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const DANGER_LABELS: Record<number, string> = {
  1: 'Low', 2: 'Moderate', 3: 'Considerable', 4: 'High', 5: 'Extreme',
};

type AnyRecord = Record<string, unknown>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeTool(name: string, input: AnyRecord, supabase: any): Promise<string> {
  const zones = input.zone === 'both' ? ['northwest', 'southeast'] : [input.zone as string];
  const days = Math.min(Number(input.days) || 7, 30);

  if (name === 'get_latest_forecast') {
    const results = await Promise.all(zones.map(async (zone) => {
      const { data, error } = await supabase
        .from('forecasts')
        .select('*, avalanche_problems(*)')
        .eq('zone_id', zone)
        .order('valid_date', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) return `No forecast available for ${zone} zone.`;

      const row = data as AnyRecord;
      const problems = ((row.avalanche_problems as AnyRecord[]) || [])
        .map((p) => `  • ${p.problem_type}: ${p.likelihood || '?'} likelihood, size ${p.size || '?'}`)
        .join('\n');

      return [
        `Zone: ${row.zone_name} (${zone})`,
        `Date: ${row.valid_date}`,
        `Overall Danger: ${DANGER_LABELS[row.danger_level as number]} (${row.danger_level}/5)`,
        `  Alpine: ${DANGER_LABELS[row.danger_alpine as number]} | Treeline: ${DANGER_LABELS[row.danger_treeline as number]} | Below Treeline: ${DANGER_LABELS[row.danger_below_treeline as number]}`,
        `Trend: ${row.trend || 'unknown'}`,
        `Key Message: ${row.key_message || 'none'}`,
        `Bottom Line: ${row.bottom_line || 'none'}`,
        `Travel Advice: ${row.travel_advice || 'none'}`,
        `Avalanche Problems:\n${problems || '  none recorded'}`,
      ].join('\n');
    }));
    return results.join('\n\n---\n\n');
  }

  if (name === 'get_forecast_history') {
    const results = await Promise.all(zones.map(async (zone) => {
      const { data, error } = await supabase
        .from('forecasts')
        .select('valid_date, danger_level, danger_alpine, danger_treeline, danger_below_treeline, trend, key_message')
        .eq('zone_id', zone)
        .order('valid_date', { ascending: false })
        .limit(days);

      if (error || !data) return `No history available for ${zone} zone.`;

      const history = data as AnyRecord[];
      const rows = history.map((f) =>
        `${f.valid_date}: ${DANGER_LABELS[f.danger_level as number]} (A:${f.danger_alpine} T:${f.danger_treeline} B:${f.danger_below_treeline}) | ${f.trend || 'steady'} | ${f.key_message || ''}`
      ).join('\n');

      return `${zone.toUpperCase()} ZONE — Last ${history.length} days:\n${rows}`;
    }));
    return results.join('\n\n');
  }

  if (name === 'get_weather_data') {
    const results = await Promise.all(zones.map(async (zone) => {
      const { data, error } = await supabase
        .from('weather_forecasts')
        .select('*')
        .eq('zone_id', zone)
        .order('forecast_date', { ascending: false })
        .limit(3);

      if (error || !data?.length) return `No weather data for ${zone} zone.`;

      const weather = data as AnyRecord[];
      const rows = weather.map((w) => {
        const m = (w.metrics as Record<string, string>) || {};
        return `${w.forecast_date}: Temp ${m.temperature || 'N/A'}, Wind ${m.wind_speed || 'N/A'} ${m.wind_direction || ''}, Snow 24hr: ${m.snowfall_24hr || 'N/A'}, Cloud: ${m.cloud_cover || 'N/A'}`;
      }).join('\n');

      return `${zone.toUpperCase()} ZONE weather:\n${rows}`;
    }));
    return results.join('\n\n');
  }

  return 'Unknown tool';
}

const MCP_TOOLS = [
  {
    name: 'get_latest_forecast',
    description: 'Get the current avalanche forecast for Crested Butte backcountry (CBAC zones). Returns danger levels (1–5), avalanche problems, key message, and travel advice.',
    inputSchema: {
      type: 'object',
      properties: {
        zone: {
          type: 'string',
          enum: ['northwest', 'southeast', 'both'],
          description: "Which CBAC zone: 'northwest', 'southeast', or 'both'",
        },
      },
      required: ['zone'],
    },
  },
  {
    name: 'get_forecast_history',
    description: 'Get historical avalanche forecasts for the past N days to analyze trends.',
    inputSchema: {
      type: 'object',
      properties: {
        zone: {
          type: 'string',
          enum: ['northwest', 'southeast', 'both'],
        },
        days: {
          type: 'number',
          description: 'Number of days of history (default 7, max 30)',
        },
      },
      required: ['zone'],
    },
  },
  {
    name: 'get_weather_data',
    description: 'Get recent weather data for CBAC zones including temperature, wind, and snowfall.',
    inputSchema: {
      type: 'object',
      properties: {
        zone: {
          type: 'string',
          enum: ['northwest', 'southeast', 'both'],
        },
      },
      required: ['zone'],
    },
  },
];

function jsonrpc(id: unknown, result: unknown) {
  return Response.json({ jsonrpc: '2.0', id, result });
}

function jsonrpcError(id: unknown, code: number, message: string) {
  return Response.json({ jsonrpc: '2.0', id, error: { code, message } });
}

export async function POST(request: NextRequest) {
  let body: { id?: unknown; method?: string; params?: AnyRecord };
  try {
    body = await request.json() as typeof body;
  } catch {
    return jsonrpcError(null, -32700, 'Parse error');
  }

  const { id, method, params } = body;

  if (method === 'initialize') {
    return jsonrpc(id, {
      protocolVersion: '2024-11-05',
      capabilities: { tools: {} },
      serverInfo: { name: 'backcountry-crews-forecast', version: '1.0.0' },
    });
  }

  if (method === 'notifications/initialized') {
    return new Response(null, { status: 204 });
  }

  if (method === 'tools/list') {
    return jsonrpc(id, { tools: MCP_TOOLS });
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = (params || {}) as { name: string; arguments: AnyRecord };

    if (!MCP_TOOLS.find(t => t.name === name)) {
      return jsonrpc(id, {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true,
      });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
      const result = await executeTool(name, args || {}, supabase);
      return jsonrpc(id, {
        content: [{ type: 'text', text: result }],
        isError: false,
      });
    } catch (error) {
      return jsonrpc(id, {
        content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
        isError: true,
      });
    }
  }

  return jsonrpcError(id, -32601, 'Method not found');
}
