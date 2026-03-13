import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
        .map((p) =>
          `  • ${p.problem_type}: ${p.likelihood || '?'} likelihood, size ${p.size || '?'}`)
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

const tools: Anthropic.Tool[] = [
  {
    name: 'get_latest_forecast',
    description: 'Get the current avalanche forecast for CBAC zones. Returns danger levels (1–5 scale), avalanche problems, bottom line, key message, and travel advice.',
    input_schema: {
      type: 'object' as const,
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
    description: 'Get historical avalanche forecasts to analyze trends over recent days.',
    input_schema: {
      type: 'object' as const,
      properties: {
        zone: {
          type: 'string',
          enum: ['northwest', 'southeast', 'both'],
        },
        days: {
          type: 'number',
          description: 'Number of days of history to retrieve (default 7, max 30)',
        },
      },
      required: ['zone'],
    },
  },
  {
    name: 'get_weather_data',
    description: 'Get recent weather data including temperature, wind speed/direction, and snowfall.',
    input_schema: {
      type: 'object' as const,
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

const SYSTEM_PROMPT = `You are an avalanche safety assistant for Backcountry Crews, focused on Crested Butte, Colorado backcountry skiing and ski touring.

You have real-time CBAC (Crested Butte Avalanche Center) forecast data for two zones:
- Northwest Zone: north and west facing terrain
- Southeast Zone: south and east facing terrain

Always use your tools to fetch current data before answering questions about conditions, risks, or forecasts.

Danger scale: 1=Low, 2=Moderate, 3=Considerable, 4=High, 5=Extreme
At Considerable (3) or above, be clear and specific about risks. At High (4) or Extreme (5), strongly advise caution or avoidance.

FORMATTING RULES — follow these strictly:
- Use **bold** for danger levels, key terms, and important warnings
- Use bullet points (- ) for lists
- Use short paragraphs separated by blank lines
- Do NOT use ### or ## headings
- Do NOT use markdown tables (no |---|---| format)
- Do NOT use horizontal rules (---)
- Keep responses concise and scannable
- Always cite the date of the forecast data you reference`;

export async function POST(request: Request) {
  const { messages, sessionId } = await request.json();

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Log the question anonymously — fire and forget
  const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user');
  if (lastUserMsg && sessionId) {
    supabase.from('chat_logs').insert({
      session_id: sessionId,
      question: lastUserMsg.content,
    }).then(() => {}).catch(() => {});
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const apiMessages: Anthropic.MessageParam[] = messages;
        let continueLoop = true;

        while (continueLoop) {
          const msgStream = client.messages.stream({
            model: 'claude-opus-4-6',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            tools,
            messages: apiMessages,
          });

          // Forward text tokens to client as they arrive
          msgStream.on('text', (delta: string) => {
            controller.enqueue(encoder.encode(delta));
          });

          const finalMessage = await msgStream.finalMessage();

          if (finalMessage.stop_reason === 'end_turn') {
            continueLoop = false;
          } else if (finalMessage.stop_reason === 'tool_use') {
            const toolUseBlocks = finalMessage.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
            );

            apiMessages.push({ role: 'assistant', content: finalMessage.content });

            const toolResults: Anthropic.ToolResultBlockParam[] = [];
            for (const toolUse of toolUseBlocks) {
              const result = await executeTool(
                toolUse.name,
                toolUse.input as Record<string, unknown>,
                supabase
              );
              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: result,
              });
            }

            apiMessages.push({ role: 'user', content: toolResults });
          } else {
            continueLoop = false;
          }
        }

        controller.close();
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'An error occurred';
        controller.enqueue(encoder.encode(`Sorry, I ran into an error: ${msg}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
