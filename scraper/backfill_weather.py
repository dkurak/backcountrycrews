"""
Backfill weather data from CBAC API.

Re-fetches historical weather products and updates the database with
properly parsed snowfall data (including ranges).

Usage:
    python backfill_weather.py
    python backfill_weather.py --days=30
    python backfill_weather.py --all
"""

import os
import sys
import argparse
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required")
    sys.exit(1)

try:
    from supabase import create_client, Client
    import requests
except ImportError as e:
    print(f"Error: Missing package - {e}")
    print("Run: pip install supabase requests")
    sys.exit(1)

from cbac_api_scraper import parse_weather_data, AVALANCHE_ORG_API, CBAC_CENTER_ID, ZONES


def get_weather_products(limit: int = 100) -> List[Dict]:
    """Fetch weather products from the API."""
    url = f"{AVALANCHE_ORG_API}/products?avalanche_center_id={CBAC_CENTER_ID}&product_type=weather"

    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        products = resp.json()

        # Sort by date descending
        products.sort(key=lambda x: x.get('published_time', ''), reverse=True)
        return products[:limit]
    except Exception as e:
        print(f"Error fetching weather products: {e}")
        return []


def get_weather_by_id(weather_id: int) -> Optional[Dict]:
    """Fetch weather product data by ID."""
    url = f"{AVALANCHE_ORG_API}/product/{weather_id}"

    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"Error fetching weather {weather_id}: {e}")
        return None


def extract_zones_from_product(product: Dict) -> List[str]:
    """Extract zone IDs from a weather product."""
    zones = []
    forecast_zones = product.get('forecast_zone', [])
    for fz in forecast_zones:
        zone_id = fz.get('zone_id', '')
        # Map API zone IDs to our zone IDs
        if zone_id == 'northwest_mountains':
            zones.append('northwest')
        elif zone_id == 'southeast_mountains':
            zones.append('southeast')
    return zones


def save_weather(client: Client, zone: str, forecast_date: str, weather: Dict) -> bool:
    """Save weather data to Supabase."""
    try:
        weather_data = {
            "zone_id": zone,
            "forecast_date": forecast_date,
            "metrics": {
                "temperature": weather.get("temperature"),
                "cloud_cover": weather.get("cloud_cover"),
                "wind_speed": weather.get("wind_speed"),
                "wind_direction": weather.get("wind_direction"),
                "snowfall_12hr": weather.get("snowfall_12hr"),
                "snowfall_24hr": weather.get("snowfall_24hr"),
            },
            "raw_text": weather.get("discussion", ""),
        }

        client.table("weather_forecasts").upsert(
            weather_data,
            on_conflict="zone_id,forecast_date"
        ).execute()
        return True
    except Exception as e:
        print(f"  Error saving weather: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Backfill weather data from CBAC API")
    parser.add_argument("--days", type=int, default=30,
                        help="Number of days to backfill (default: 30)")
    parser.add_argument("--all", action="store_true",
                        help="Backfill all available weather data")
    args = parser.parse_args()

    print("=" * 60)
    print("Weather Data Backfill")
    print("=" * 60)

    # Connect to Supabase
    print("\n1. Connecting to Supabase...")
    client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    print("   Connected")

    # Fetch weather products
    limit = 2500 if args.all else args.days * 3  # ~3 products per day
    print(f"\n2. Fetching weather products (limit: {limit})...")
    products = get_weather_products(limit)
    print(f"   Found {len(products)} products")

    # Process each weather product
    print(f"\n3. Processing and saving weather data...")

    updated = 0
    skipped = 0
    errors = 0

    for i, product in enumerate(products):
        weather_id = product.get('id')
        published = product.get('published_time', '')[:10]
        zones = extract_zones_from_product(product)

        if not weather_id or not zones:
            skipped += 1
            continue

        # Fetch full weather data
        weather_raw = get_weather_by_id(weather_id)
        if not weather_raw:
            errors += 1
            continue

        # Parse weather data
        weather = parse_weather_data(weather_raw)
        if not weather:
            skipped += 1
            continue

        # Save for each zone this weather applies to
        for zone in zones:
            if save_weather(client, zone, published, weather):
                updated += 1
                snow_12 = weather.get('snowfall_12hr') or '0'
                snow_24 = weather.get('snowfall_24hr') or '0'
                print(f"  [{i+1}/{len(products)}] {published} {zone}: 12hr={snow_12}, 24hr={snow_24}")
            else:
                errors += 1

        # Progress indicator
        if (i + 1) % 50 == 0:
            print(f"  ... processed {i + 1}/{len(products)} products")

    print(f"\n4. Done!")
    print(f"   Updated: {updated}")
    print(f"   Skipped: {skipped}")
    print(f"   Errors: {errors}")


if __name__ == "__main__":
    main()
