"""
CBAC Forecast Scraper using avalanche.org API

Uses the official avalanche.org API to fetch forecast data with proper
danger levels and aspect/elevation rose data.
"""

import json
import requests
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, asdict, field

# API endpoints
AVALANCHE_ORG_API = "https://api.avalanche.org/v2/public"
CBAC_CENTER_ID = "CBAC"

# Zone mapping
ZONES = {
    "southeast": "southeast_mountains",
    "northwest": "northwest_mountains",
}

# Aspect mapping for rose diagram
ASPECT_MAP = {
    "north": "N",
    "northeast": "NE",
    "east": "E",
    "southeast": "SE",
    "south": "S",
    "southwest": "SW",
    "west": "W",
    "northwest": "NW",
}

# Elevation mapping
ELEVATION_MAP = {
    "upper": "alpine",
    "middle": "treeline",
    "lower": "below_treeline",
}


@dataclass
class AvalancheProblem:
    problem_number: int
    problem_type: str
    likelihood: str
    size: str
    aspect_elevation_rose: Dict[str, Dict[str, bool]]
    details: Optional[str] = None


@dataclass
class Forecast:
    zone: str
    zone_name: str
    forecast_id: int
    issue_date: str
    valid_date: str
    danger_alpine: int
    danger_treeline: int
    danger_below_treeline: int
    bottom_line: str
    discussion: str
    problems: List[Dict]
    forecast_url: str
    weather: Optional[Dict[str, Any]] = None


def create_empty_rose() -> Dict[str, Dict[str, bool]]:
    """Create an empty aspect/elevation rose."""
    return {
        "N": {"alpine": False, "treeline": False, "below_treeline": False},
        "NE": {"alpine": False, "treeline": False, "below_treeline": False},
        "E": {"alpine": False, "treeline": False, "below_treeline": False},
        "SE": {"alpine": False, "treeline": False, "below_treeline": False},
        "S": {"alpine": False, "treeline": False, "below_treeline": False},
        "SW": {"alpine": False, "treeline": False, "below_treeline": False},
        "W": {"alpine": False, "treeline": False, "below_treeline": False},
        "NW": {"alpine": False, "treeline": False, "below_treeline": False},
    }


def parse_locations_to_rose(locations: List[str]) -> Dict[str, Dict[str, bool]]:
    """
    Parse location strings like 'north upper' into rose format.

    Args:
        locations: List of strings like ['north upper', 'northeast middle']

    Returns:
        Rose dict with affected areas marked True
    """
    rose = create_empty_rose()

    for loc in locations:
        parts = loc.lower().split()
        if len(parts) >= 2:
            aspect_word = parts[0]
            elevation_word = parts[1]

            aspect = ASPECT_MAP.get(aspect_word)
            elevation = ELEVATION_MAP.get(elevation_word)

            if aspect and elevation and aspect in rose:
                rose[aspect][elevation] = True

    return rose


def get_forecast_list(zone: str, days: int = 7) -> List[Dict]:
    """
    Get list of recent forecasts for a zone from the API.

    Returns list of forecast metadata with IDs.
    """
    zone_name = ZONES.get(zone, zone)

    # Get products for CBAC
    url = f"{AVALANCHE_ORG_API}/products?avalanche_center_id={CBAC_CENTER_ID}&product_type=forecast"

    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        # Filter to requested zone - forecast_zone is a list
        forecasts = []
        for product in data:
            zones_list = product.get('forecast_zone', [])
            for fz in zones_list:
                if zone_name == fz.get('zone_id', ''):
                    forecasts.append(product)
                    break

        # Sort by date descending and limit
        forecasts.sort(key=lambda x: x.get('published_time', ''), reverse=True)
        return forecasts[:days]

    except Exception as e:
        print(f"Error fetching forecast list: {e}")
        import traceback
        traceback.print_exc()
        return []


def get_forecast_by_id(forecast_id: int) -> Optional[Dict]:
    """Fetch full forecast data by ID."""
    url = f"{AVALANCHE_ORG_API}/product/{forecast_id}"

    try:
        resp = requests.get(url, timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"Error fetching forecast {forecast_id}: {e}")
        return None


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


def parse_weather_data(weather_data: Dict) -> Optional[Dict[str, Any]]:
    """Parse weather product into clean format."""
    try:
        weather_list = weather_data.get('weather_data', [])
        if not weather_list:
            return None

        wd = weather_list[0]
        rows = wd.get('rows', [])
        data = wd.get('data', [])

        if not rows or not data:
            return None

        # Map row headings to their data
        result = {}
        for row_def, row_data in zip(rows, data):
            heading = row_def.get('heading', '').lower().replace(' ', '_')
            unit = row_def.get('unit', '')

            # Extract values - focus on "Today" column (usually index 1 or 2)
            values = []
            for cell in row_data:
                val = cell.get('value', '')
                prefix = cell.get('prefix', '')
                if prefix:
                    values.append(f"{prefix} {val}")
                else:
                    values.append(val)

            result[heading] = {
                'values': values,
                'unit': unit,
            }

        # Also extract the weather discussion
        import re
        def clean_html(text):
            if not text:
                return ""
            return re.sub(r'<[^>]+>', '', text).strip()

        result['discussion'] = clean_html(weather_data.get('weather_discussion', ''))

        # Parse into simplified format for display
        parsed = {
            'temperature': None,
            'cloud_cover': None,
            'wind_speed': None,
            'wind_direction': None,
            'snowfall_12hr': None,
            'snowfall_24hr': None,
            'discussion': result.get('discussion', ''),
        }

        # Temperature - try to get today's value
        if 'temperature' in result:
            temps = result['temperature']['values']
            # Usually: [last_night, today, tonight] or similar
            if len(temps) >= 2:
                parsed['temperature'] = temps[1] if temps[1] else temps[0]
            elif temps:
                parsed['temperature'] = temps[0]

        # Cloud cover
        if 'cloud_cover' in result:
            covers = result['cloud_cover']['values']
            if len(covers) >= 2:
                parsed['cloud_cover'] = covers[1] if covers[1] else covers[0]
            elif covers:
                parsed['cloud_cover'] = covers[0]

        # Wind speed
        if 'ridgeline_wind_speed' in result:
            winds = result['ridgeline_wind_speed']['values']
            if len(winds) >= 2:
                parsed['wind_speed'] = winds[1] if winds[1] else winds[0]
            elif winds:
                parsed['wind_speed'] = winds[0]

        # Wind direction
        if 'wind_direction' in result:
            dirs = result['wind_direction']['values']
            if len(dirs) >= 2:
                parsed['wind_direction'] = dirs[1] if dirs[1] else dirs[0]
            elif dirs:
                parsed['wind_direction'] = dirs[0]

        # Snowfall - extract prefixed 12hr/24hr values
        # For ranges like "13 to 17", take the lower bound
        def extract_snow_value(val: str) -> Optional[str]:
            """Extract snowfall value, taking lower bound for ranges."""
            if not val:
                return None
            val = val.strip()
            # Handle ranges: "13 to 17" or "7 - 11"
            if ' to ' in val:
                val = val.split(' to ')[0].strip()
            elif ' - ' in val:
                val = val.split(' - ')[0].strip()
            # Handle trace amounts
            if val.lower() == 'tr' or val.lower() == 'trace':
                return '0'
            return val if val else None

        if 'snowfall' in result:
            snow_data = result['snowfall']
            for s in snow_data.get('values', []):
                if isinstance(s, str):
                    if '24hr:' in s:
                        val = s.replace('24hr:', '').strip()
                        parsed['snowfall_24hr'] = extract_snow_value(val)
                    elif '12hr:' in s:
                        val = s.replace('12hr:', '').strip()
                        parsed['snowfall_12hr'] = extract_snow_value(val)

        return parsed

    except Exception as e:
        print(f"Error parsing weather: {e}")
        import traceback
        traceback.print_exc()
        return None


def parse_forecast(data: Dict, zone: str) -> Optional[Forecast]:
    """Parse API response into Forecast object."""
    try:
        # Get danger ratings for current day
        danger_current = None
        for danger in data.get('danger', []):
            if danger.get('valid_day') == 'current':
                danger_current = danger
                break

        if not danger_current:
            danger_current = data.get('danger', [{}])[0] if data.get('danger') else {}

        danger_alpine = danger_current.get('upper', 0)
        danger_treeline = danger_current.get('middle', 0)
        danger_btl = danger_current.get('lower', 0)

        # Parse avalanche problems
        problems = []
        for i, prob in enumerate(data.get('forecast_avalanche_problems', [])):
            # Parse locations into rose format
            locations = prob.get('location', [])
            rose = parse_locations_to_rose(locations)

            # Get likelihood and size
            likelihood = prob.get('likelihood', 'possible').title()
            size_range = prob.get('size', ['1', '2'])
            if isinstance(size_range, list) and len(size_range) >= 2:
                size = f"D{size_range[0]}-{size_range[1]}"
            else:
                size = "D2"

            # Get problem type name
            problem_type = prob.get('name', 'Unknown').lower().replace(' ', '_')

            # Get problem media/details
            details = None
            media = prob.get('media')
            if media and isinstance(media, dict):
                details = media.get('caption', '')

            problems.append({
                "problem_number": i + 1,
                "problem_type": problem_type,
                "likelihood": likelihood,
                "size": size,
                "aspect_elevation_rose": rose,
                "details": details,
            })

        # Parse dates
        published = data.get('published_time', '')
        issue_date = published[:10] if published else datetime.now().strftime('%Y-%m-%d')

        # Clean HTML from text fields while preserving paragraph breaks
        import re
        def clean_html(text):
            if not text:
                return ""
            # Convert paragraph and break tags to newlines
            text = re.sub(r'</p>\s*<p[^>]*>', '\n\n', text)
            text = re.sub(r'<br\s*/?>', '\n', text)
            text = re.sub(r'<p[^>]*>', '', text)
            text = re.sub(r'</p>', '\n\n', text)
            # Remove remaining HTML tags
            text = re.sub(r'<[^>]+>', '', text)
            # Clean up excessive whitespace but preserve paragraph breaks
            text = re.sub(r'[ \t]+', ' ', text)
            text = re.sub(r'\n{3,}', '\n\n', text)
            # Clean up &nbsp; entities
            text = text.replace('&nbsp;', ' ')
            return text.strip()

        bottom_line = clean_html(data.get('bottom_line', ''))
        discussion = clean_html(data.get('hazard_discussion', ''))

        zone_name = "Northwest Mountains" if zone == "northwest" else "Southeast Mountains"

        # Fetch weather data if available
        weather = None
        weather_data_ref = data.get('weather_data', {})
        if isinstance(weather_data_ref, dict):
            weather_id = weather_data_ref.get('weather_product_id')
            if weather_id:
                weather_raw = get_weather_by_id(weather_id)
                if weather_raw:
                    weather = parse_weather_data(weather_raw)

        return Forecast(
            zone=zone,
            zone_name=zone_name,
            forecast_id=data.get('id', 0),
            issue_date=issue_date,
            valid_date=issue_date,
            danger_alpine=danger_alpine,
            danger_treeline=danger_treeline,
            danger_below_treeline=danger_btl,
            bottom_line=bottom_line,
            discussion=discussion,
            problems=problems,
            forecast_url=f"https://cbavalanchecenter.org/forecasts/#/forecast/{ZONES[zone]}/{data.get('id')}",
            weather=weather,
        )

    except Exception as e:
        print(f"Error parsing forecast: {e}")
        import traceback
        traceback.print_exc()
        return None


def scrape_zone_forecasts(zone: str, days: int = 7) -> List[Forecast]:
    """Scrape multiple days of forecasts for a zone using the API."""
    print(f"Fetching {days} forecasts for {zone}...")

    # Get forecast list
    forecast_list = get_forecast_list(zone, days * 2)  # Get extra to filter empty ones
    print(f"  Found {len(forecast_list)} forecasts")

    forecasts = []
    seen_dates = set()

    for item in forecast_list:
        forecast_id = item.get('id')
        if not forecast_id:
            continue

        print(f"  Fetching forecast {forecast_id}...")
        data = get_forecast_by_id(forecast_id)

        if data:
            forecast = parse_forecast(data, zone)
            if forecast:
                # Skip empty/draft forecasts
                if forecast.danger_alpine == 0 and forecast.danger_treeline == 0:
                    print(f"    Skipping empty forecast")
                    continue

                # Skip duplicate dates (keep first/most recent)
                if forecast.valid_date in seen_dates:
                    print(f"    Skipping duplicate date")
                    continue

                seen_dates.add(forecast.valid_date)
                forecasts.append(forecast)
                print(f"    Date: {forecast.valid_date}, Danger: ALP={forecast.danger_alpine}, TL={forecast.danger_treeline}, BTL={forecast.danger_below_treeline}")
                print(f"    Problems: {len(forecast.problems)}")

                if len(forecasts) >= days:
                    break

    return forecasts


def scrape_all_zones(days: int = 7) -> List[Forecast]:
    """Scrape forecasts for all zones."""
    all_forecasts = []

    for zone in ZONES.keys():
        forecasts = scrape_zone_forecasts(zone, days)
        all_forecasts.extend(forecasts)

    return all_forecasts


def save_forecasts(forecasts: List[Forecast], filename: str = "api_forecasts.json"):
    """Save forecasts to JSON file."""
    data = [asdict(f) for f in forecasts]
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)
    print(f"\nSaved {len(forecasts)} forecasts to {filename}")


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Scrape CBAC forecasts via API")
    parser.add_argument("--days", type=int, default=7,
                        help="Number of days to fetch (default: 7)")
    parser.add_argument("--zones", type=str, default="southeast,northwest",
                        help="Comma-separated zones (default: southeast,northwest)")
    parser.add_argument("--output", type=str, default="api_forecasts.json",
                        help="Output JSON file")

    args = parser.parse_args()

    print("=" * 60)
    print("CBAC Forecast Scraper (API)")
    print("=" * 60)

    zones = [z.strip() for z in args.zones.split(",")]

    all_forecasts = []
    for zone in zones:
        if zone in ZONES:
            forecasts = scrape_zone_forecasts(zone, args.days)
            all_forecasts.extend(forecasts)
        else:
            print(f"Unknown zone: {zone}")

    if all_forecasts:
        save_forecasts(all_forecasts, args.output)

        print("\n" + "=" * 60)
        print("Scraping complete!")

        # Group by date
        by_date = {}
        for f in all_forecasts:
            if f.valid_date not in by_date:
                by_date[f.valid_date] = []
            by_date[f.valid_date].append(f)

        for date in sorted(by_date.keys(), reverse=True):
            print(f"\n--- {date} ---")
            for f in by_date[date]:
                print(f"\n  {f.zone_name}:")
                print(f"    Danger: ALP={f.danger_alpine}, TL={f.danger_treeline}, BTL={f.danger_below_treeline}")
                print(f"    Problems: {len(f.problems)}")
                for p in f.problems:
                    # Count affected areas in rose
                    affected = sum(
                        1 for aspect in p['aspect_elevation_rose'].values()
                        for elev, val in aspect.items() if val
                    )
                    print(f"      #{p['problem_number']} {p['problem_type']}: {p['likelihood']}, {p['size']}, {affected} areas affected")
    else:
        print("\nNo forecasts found.")


if __name__ == "__main__":
    main()
