import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials not found. Running in demo mode with mock data.'
  );
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,           // Store session in localStorage (default, but explicit)
        autoRefreshToken: true,         // Auto-refresh before expiry (default, but explicit)
        detectSessionInUrl: true,       // Handle OAuth redirects
        storageKey: 'backcountrycrews-auth',  // Custom key to avoid conflicts
      },
    })
  : null;

export const isSupabaseConfigured = !!supabase;

// Timeout wrapper to prevent hanging requests
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error('Request timed out')), timeoutMs)
  );
  try {
    return await Promise.race([promise, timeout]);
  } catch (error) {
    // Only log if it's actually a timeout, not other errors
    if (error instanceof Error && error.message === 'Request timed out') {
      console.warn('Supabase request timed out after', timeoutMs, 'ms');
    } else {
      console.warn('Supabase request failed:', error);
    }
    return fallback;
  }
}

// Types for our database
export interface DBForecast {
  id: string
  zone_id: string
  zone_name: string
  issue_date: string
  valid_date: string
  danger_level: number
  danger_text: string
  danger_alpine: number
  danger_treeline: number
  danger_below_treeline: number
  travel_advice: string | null
  bottom_line: string | null
  discussion: string | null
  forecast_url: string | null
  raw_data: any
  // Analysis fields
  trend: string | null
  key_message: string | null
  confidence: string | null
  recent_activity_summary: string | null
  recent_avalanche_count: number | null
  created_at: string
  updated_at: string
}

export interface DBAvalancheProblem {
  id: string
  forecast_id: string
  problem_number: number
  problem_type: string
  likelihood: string | null
  size: string | null
  aspect_elevation_rose: any
  details: string | null
  created_at: string
}

export interface DBWeatherForecast {
  id: string
  zone_id: string
  forecast_date: string
  metrics: {
    temperature?: string
    cloud_cover?: string
    wind_speed?: string
    wind_direction?: string
    snowfall_12hr?: string
    snowfall_24hr?: string
  } | null
  raw_text: string | null
  created_at: string
}

// Fetch forecasts with their problems
export async function getForecasts(zoneId?: string, limit = 14) {
  if (!supabase) return []

  const fetchData = async () => {
    let query = supabase
      .from('forecasts')
      .select(`
        *,
        avalanche_problems (*)
      `)
      .order('valid_date', { ascending: false })
      .order('problem_number', { referencedTable: 'avalanche_problems', ascending: true })
      .limit(limit)

    if (zoneId) {
      query = query.eq('zone_id', zoneId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching forecasts:', error)
      return []
    }

    return data as (DBForecast & { avalanche_problems: DBAvalancheProblem[] })[]
  }

  return withTimeout(fetchData(), 20000, [])
}

// Fetch latest forecast for a zone
export async function getLatestForecast(zoneId: string) {
  if (!supabase) return null

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('forecasts')
      .select(`
        *,
        avalanche_problems (*)
      `)
      .eq('zone_id', zoneId)
      .order('valid_date', { ascending: false })
      .order('problem_number', { referencedTable: 'avalanche_problems', ascending: true })
      .limit(1)
      .single()

    if (error) {
      console.error('Error fetching latest forecast:', error)
      return null
    }

    return data as DBForecast & { avalanche_problems: DBAvalancheProblem[] }
  }

  return withTimeout(fetchData(), 20000, null)
}

// Fetch weather for a zone
export async function getWeather(zoneId: string, limit = 30) {
  if (!supabase) return []

  const fetchData = async () => {
    const { data, error } = await supabase
      .from('weather_forecasts')
      .select('*')
      .eq('zone_id', zoneId)
      .order('forecast_date', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching weather:', error)
      return []
    }

    return data as DBWeatherForecast[]
  }

  return withTimeout(fetchData(), 20000, [])
}

// Fetch forecasts with weather data merged
export async function getForecastsWithWeather(zoneId?: string, limit = 30) {
  const emptyResult = { forecasts: [], weatherMap: {} as Record<string, DBWeatherForecast> }
  if (!supabase) return emptyResult

  const fetchData = async () => {
    // Fetch forecasts
    let forecastQuery = supabase
      .from('forecasts')
      .select(`
        *,
        avalanche_problems (*)
      `)
      .order('valid_date', { ascending: false })
      .order('problem_number', { referencedTable: 'avalanche_problems', ascending: true })
      .limit(limit)

    if (zoneId) {
      forecastQuery = forecastQuery.eq('zone_id', zoneId)
    }

    const { data: forecasts, error: forecastError } = await forecastQuery

    if (forecastError) {
      console.error('Error fetching forecasts:', forecastError)
      return emptyResult
    }

    // Fetch weather data
    let weatherQuery = supabase
      .from('weather_forecasts')
      .select('*')
      .order('forecast_date', { ascending: false })
      .limit(limit)

    if (zoneId) {
      weatherQuery = weatherQuery.eq('zone_id', zoneId)
    }

    const { data: weather, error: weatherError } = await weatherQuery

    if (weatherError) {
      console.error('Error fetching weather:', weatherError)
    }

    // Create a map of weather by zone_id + forecast_date
    const weatherMap: Record<string, DBWeatherForecast> = {}
    if (weather) {
      for (const w of weather) {
        const key = `${w.zone_id}_${w.forecast_date}`
        weatherMap[key] = w
      }
    }

    return {
      forecasts: forecasts as (DBForecast & { avalanche_problems: DBAvalancheProblem[] })[],
      weatherMap
    }
  }

  return withTimeout(fetchData(), 20000, emptyResult)
}
