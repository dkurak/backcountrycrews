"""
Save forecasts to Supabase database.

Usage:
    python save_to_supabase.py
    python save_to_supabase.py --days=3
    python save_to_supabase.py --zones=southeast

Environment variables required:
    SUPABASE_URL - Your Supabase project URL
    SUPABASE_SERVICE_KEY - Your Supabase service role key (not anon key)
"""

import os
import sys
import re
import argparse
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from dataclasses import asdict
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Check for Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("Error: SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables required")
    print("Set these in a .env file or as environment variables")
    sys.exit(1)

try:
    from supabase import create_client, Client
except ImportError:
    print("Error: supabase package not installed")
    print("Run: pip install supabase")
    sys.exit(1)

from cbac_api_scraper import (
    scrape_all_zones,
    scrape_zone_forecasts,
    get_weekly_summaries,
    parse_weekly_summary,
    Forecast,
    WeeklySummary,
    ZONES,
)

# Danger level to text mapping
DANGER_TEXT = {
    1: "Low",
    2: "Moderate",
    3: "Considerable",
    4: "High",
    5: "Extreme",
}


def analyze_trend_from_text(bottom_line: str, discussion: str) -> str:
    """
    Analyze forecast text to determine trend based on keywords.
    Used as fallback when danger levels are unchanged.

    Returns:
        trend string
    """
    text = f"{bottom_line or ''} {discussion or ''}"
    text_lower = text.lower()

    # Storm incoming indicators
    storm_patterns = [
        "storm expected", "storm approaching", "storm arriving",
        "snow expected", "snow arriving", "inches expected",
        "accumulation expected", "danger is expected to rise",
        "loading will", "new load"
    ]
    if any(pattern in text_lower for pattern in storm_patterns):
        return "storm_incoming"

    # Worsening indicators
    if any(kw in text_lower for kw in [
        "dangerous avalanche conditions", "heightened avalanche conditions",
        "increasing", "elevated danger"
    ]):
        return "worsening"

    # Improving indicators
    if any(kw in text_lower for kw in [
        "adjusting", "stabiliz", "decreased", "isolated",
        "stubborn", "unlikely", "slowly improved", "conditions have improved"
    ]):
        return "improving"

    return "steady"


def calculate_trend(
    current_danger_sum: int,
    current_problems: int,
    prev_danger_sum: Optional[int],
    prev_problems: Optional[int],
    bottom_line: str,
    discussion: str
) -> str:
    """
    Calculate trend by comparing danger levels between days.

    Uses SUM of all three bands (not just MAX) to catch individual band changes.
    e.g., BTL going from 2→1 while others stay same = improving

    Primary signal: danger sum change
    Secondary signal: problem count change
    Tertiary signal: text analysis

    Returns:
        trend string: 'improving', 'steady', 'worsening', 'storm_incoming'
    """
    # If no previous data, use text analysis
    if prev_danger_sum is None:
        return analyze_trend_from_text(bottom_line, discussion)

    # Check for storm incoming in text first (takes priority)
    text_trend = analyze_trend_from_text(bottom_line, discussion)
    if text_trend == "storm_incoming":
        return "storm_incoming"

    # Compare danger sums (primary signal)
    danger_change = current_danger_sum - prev_danger_sum

    if danger_change < 0:
        # Danger sum decreased = improving (any band got better)
        return "improving"
    elif danger_change > 0:
        # Danger sum increased = worsening (any band got worse)
        return "worsening"

    # Danger sum same - check problem count (secondary signal)
    if prev_problems is not None:
        problem_change = current_problems - prev_problems
        if problem_change < 0:
            # Fewer problems = improving
            return "improving"
        elif problem_change > 0:
            # More problems = worsening
            return "worsening"

    # Danger and problems same - use text analysis (tertiary signal)
    return text_trend


def extract_key_message(bottom_line: str, discussion: str) -> Optional[str]:
    """Extract the most actionable sentence from forecast text."""
    text = f"{bottom_line or ''} {discussion or ''}"
    sentences = re.split(r'[.!]', text)

    key_patterns = [
        r'expect\s+\w+',
        r'avoid\s+\w+',
        r'stay\s+(below|under|off|away)',
        r'do\s+not',
        r'give\s+yourself.*margin',
        r'safest.*terrain',
        r'you can trigger',
        r'dangerous\s+\w+',
    ]

    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence) < 15:
            continue
        for pattern in key_patterns:
            if re.search(pattern, sentence.lower()):
                return sentence[:300]

    # If no key pattern found, use first meaningful sentence
    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence) > 30:
            return sentence[:300]

    return None


def extract_travel_advice(bottom_line: str, discussion: str) -> Optional[str]:
    """Extract travel/terrain advice from forecast text."""
    text = f"{bottom_line or ''} {discussion or ''}"

    travel_patterns = [
        r'(the safest[^.]+\.)',
        r'(you can reduce[^.]+\.)',
        r'(avoid[^.]+\.)',
        r'(lower elevation[^.]+\.)',
        r'(wind.protected[^.]+\.)',
        r'(best.*riding[^.]+\.)',
    ]

    for pattern in travel_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).strip()[:300]

    return None


def get_previous_forecast(client: Client, zone: str, valid_date: str) -> Optional[Dict[str, Any]]:
    """
    Fetch the previous day's forecast for comparison.

    Returns:
        Dict with danger_sum and problem_count, or None if not found
    """
    from datetime import datetime, timedelta

    try:
        # Parse the date and get previous day
        current_date = datetime.strptime(valid_date, "%Y-%m-%d")
        prev_date = (current_date - timedelta(days=1)).strftime("%Y-%m-%d")

        # Fetch previous forecast
        result = client.table("forecasts").select(
            "id, danger_alpine, danger_treeline, danger_below_treeline"
        ).eq("zone_id", zone).eq("valid_date", prev_date).execute()

        if result.data and len(result.data) > 0:
            prev = result.data[0]
            # Use SUM of all bands for more granular comparison
            prev_danger_sum = (
                prev["danger_alpine"] +
                prev["danger_treeline"] +
                prev["danger_below_treeline"]
            )

            # Get problem count
            prev_problems = 0
            forecast_id = prev.get("id")
            if forecast_id:
                prob_count = client.table("avalanche_problems").select(
                    "id"
                ).eq("forecast_id", forecast_id).execute()
                prev_problems = len(prob_count.data) if prob_count.data else 0

            return {
                "danger_sum": prev_danger_sum,
                "problem_count": prev_problems
            }

        return None

    except Exception as e:
        print(f"    Warning: Could not fetch previous forecast: {e}")
        return None


def get_supabase_client() -> Client:
    """Create and return a Supabase client."""
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)


def save_forecast(client: Client, forecast: Forecast) -> Optional[str]:
    """
    Save a forecast to Supabase.

    Uses upsert to update existing forecasts for the same zone/date.

    Returns:
        The forecast ID if successful, None otherwise
    """
    try:
        # Calculate overall danger level (max of the three)
        danger_level = max(
            forecast.danger_alpine,
            forecast.danger_treeline,
            forecast.danger_below_treeline
        )

        # Get previous day's forecast for trend comparison
        prev_forecast = get_previous_forecast(client, forecast.zone, forecast.valid_date)

        # Calculate danger sum (for trend comparison) - uses SUM not MAX
        # to catch individual band changes
        danger_sum = (
            forecast.danger_alpine +
            forecast.danger_treeline +
            forecast.danger_below_treeline
        )

        # Calculate trend by comparing to previous day
        current_problems = len(forecast.problems) if forecast.problems else 0
        trend = calculate_trend(
            current_danger_sum=danger_sum,
            current_problems=current_problems,
            prev_danger_sum=prev_forecast["danger_sum"] if prev_forecast else None,
            prev_problems=prev_forecast["problem_count"] if prev_forecast else None,
            bottom_line=forecast.bottom_line or "",
            discussion=forecast.discussion or ""
        )

        # Extract key message and travel advice
        key_message = extract_key_message(
            forecast.bottom_line or "",
            forecast.discussion or ""
        )
        travel_advice = extract_travel_advice(
            forecast.bottom_line or "",
            forecast.discussion or ""
        )

        # Prepare forecast data
        forecast_data = {
            "zone_id": forecast.zone,
            "zone_name": forecast.zone_name,
            "issue_date": forecast.issue_date,
            "valid_date": forecast.valid_date,
            "danger_level": danger_level,
            "danger_text": DANGER_TEXT.get(danger_level, "Unknown"),
            "danger_alpine": forecast.danger_alpine,
            "danger_treeline": forecast.danger_treeline,
            "danger_below_treeline": forecast.danger_below_treeline,
            "bottom_line": forecast.bottom_line,
            "discussion": forecast.discussion,
            "forecast_url": forecast.forecast_url,
            "trend": trend,
            "key_message": key_message,
            "travel_advice": travel_advice,
            "raw_data": {
                "scraped_at": datetime.now().isoformat(),
                "weather": forecast.weather,
            },
        }

        # Upsert forecast (update if exists, insert if not)
        result = client.table("forecasts").upsert(
            forecast_data,
            on_conflict="zone_id,valid_date"
        ).execute()

        if result.data and len(result.data) > 0:
            forecast_id = result.data[0]["id"]
            print(f"  Saved forecast for {forecast.zone_name} ({forecast.valid_date})")
            if prev_forecast:
                print(f"    Danger sum: {prev_forecast['danger_sum']} → {danger_sum} | Max: {danger_level} | Trend: {trend}")
            else:
                print(f"    Danger: {danger_level} (sum: {danger_sum}) | Trend: {trend} (no previous day)")

            # Delete existing problems for this forecast (to handle updates)
            client.table("avalanche_problems").delete().eq(
                "forecast_id", forecast_id
            ).execute()

            # Save avalanche problems if any
            if forecast.problems:
                for problem in forecast.problems:
                    problem_data = {
                        "forecast_id": forecast_id,
                        "problem_number": problem.get("problem_number", 1),
                        "problem_type": problem.get("problem_type", "unknown"),
                        "likelihood": problem.get("likelihood"),
                        "size": problem.get("size"),
                        "aspect_elevation_rose": problem.get("aspect_elevation_rose"),
                        "details": problem.get("details"),
                    }
                    client.table("avalanche_problems").insert(problem_data).execute()
                print(f"    Saved {len(forecast.problems)} avalanche problems")

            # Save weather data if available
            if forecast.weather:
                weather_data = {
                    "zone_id": forecast.zone,
                    "forecast_date": forecast.valid_date,
                    "metrics": {
                        "temperature": forecast.weather.get("temperature"),
                        "cloud_cover": forecast.weather.get("cloud_cover"),
                        "wind_speed": forecast.weather.get("wind_speed"),
                        "wind_direction": forecast.weather.get("wind_direction"),
                        "snowfall_12hr": forecast.weather.get("snowfall_12hr"),
                        "snowfall_24hr": forecast.weather.get("snowfall_24hr"),
                    },
                    "raw_text": forecast.weather.get("discussion", ""),
                }
                client.table("weather_forecasts").upsert(
                    weather_data,
                    on_conflict="zone_id,forecast_date"
                ).execute()
                print(f"    Saved weather data")

            return forecast_id

        return None

    except Exception as e:
        print(f"  Error saving forecast: {e}")
        import traceback
        traceback.print_exc()
        return None


def save_weekly_report(client: Client, summary: WeeklySummary) -> Optional[str]:
    """Save a weekly summary report to Supabase."""
    try:
        report_data = {
            "report_date": summary.report_date,
            "title": summary.title,
            "body": summary.body,
            "body_html": summary.body_html,
            "author": summary.author,
            "report_url": summary.report_url,
            "product_id": summary.product_id,
            "raw_data": summary.raw_data,
        }

        result = client.table("weekly_reports").upsert(
            report_data,
            on_conflict="product_id"
        ).execute()

        if result.data and len(result.data) > 0:
            print(f"  Saved weekly report: {summary.title} ({summary.report_date})")
            return result.data[0]["id"]

        return None

    except Exception as e:
        print(f"  Error saving weekly report: {e}")
        import traceback
        traceback.print_exc()
        return None


def fetch_and_save_weekly_reports(client: Client) -> int:
    """Fetch and save weekly summary reports. Returns count saved."""
    print("\nChecking for weekly summaries...")
    summaries_meta = get_weekly_summaries(limit=5)

    if not summaries_meta:
        print("  No weekly summaries found.")
        return 0

    print(f"  Found {len(summaries_meta)} summary product(s)")
    saved = 0
    for meta in summaries_meta:
        product_id = meta.get('id')
        if not product_id:
            continue

        print(f"  Fetching summary {product_id}...")
        summary = parse_weekly_summary(product_id)
        if summary:
            report_id = save_weekly_report(client, summary)
            if report_id:
                saved += 1

    print(f"  Saved {saved} weekly report(s)")
    return saved


def main():
    """Main entry point for the Supabase save script."""
    parser = argparse.ArgumentParser(description="Scrape CBAC forecasts and save to Supabase")
    parser.add_argument("--days", type=int, default=1,
                        help="Number of days to scrape (default: 1)")
    parser.add_argument("--zones", type=str, default="southeast,northwest",
                        help="Comma-separated zones to scrape (default: southeast,northwest)")
    args = parser.parse_args()

    print("=" * 60)
    print("CBAC Forecast to Supabase (API)")
    print("=" * 60)

    zones = [z.strip() for z in args.zones.split(",")]

    # Scrape forecasts
    print(f"\n1. Scraping {args.days} day(s) of forecasts for {', '.join(zones)}...")

    # Scrape using API
    forecasts = []
    for zone in zones:
        if zone in ZONES:
            zone_forecasts = scrape_zone_forecasts(zone, args.days)
            forecasts.extend(zone_forecasts)
        else:
            print(f"Unknown zone: {zone}")

    # Connect to Supabase
    print("\n2. Connecting to Supabase...")
    try:
        client = get_supabase_client()
        print("   Connected successfully")
    except Exception as e:
        print(f"   Error connecting: {e}")
        sys.exit(1)

    # Save daily forecasts (if any)
    saved_count = 0
    if forecasts:
        print(f"   Scraped {len(forecasts)} forecast(s)")
        print("\n3. Saving forecasts to database...")
        for forecast in forecasts:
            forecast_id = save_forecast(client, forecast)
            if forecast_id:
                saved_count += 1
        print(f"   Saved {saved_count}/{len(forecasts)} forecast(s)")
    else:
        print("   No daily forecasts found (likely off-season).")

    # Always check for weekly summaries
    print("\n4. Checking for weekly summaries...")
    weekly_saved = fetch_and_save_weekly_reports(client)

    # Summary
    print(f"\n5. Done! Daily: {saved_count}, Weekly: {weekly_saved}")

    # Only fail if daily forecasts were found but couldn't be saved
    if forecasts and saved_count != len(forecasts):
        print("   Some daily forecasts failed to save. Check logs above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
