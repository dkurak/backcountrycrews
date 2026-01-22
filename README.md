# BackcountryCrews

A mobile-first web app for finding partners for backcountry adventures. Currently focused on Crested Butte, with support for skiing, hiking, biking, off-roading, and more.

**Live:** [backcountrycrews.com](https://backcountrycrews.com) (or [skintrackcb.vercel.app](https://skintrackcb.vercel.app))

## Features

### Avalanche Forecasts
- **Current Conditions** - Today's danger pyramid (Alpine, Treeline, Below Treeline) for Northwest and Southeast zones
- **Avalanche Problems** - Active problems with likelihood, size, and affected aspects/elevations
- **Bottom Line** - Key summary and travel advice from CBAC forecasters

### History & Trends
- **Historical Browser** - Scroll through past forecasts to spot patterns
- **Trend Analysis** - Each forecast shows trend compared to previous day:
  - Improving (danger sum decreased)
  - Steady (no change)
  - Worsening (danger sum increased)
  - Storm Incoming (based on forecast text)
- **Quick Take** - Extracted key message and travel advice for each day

### Weather
- Zone-specific weather forecasts (Northwest & Southeast)
- Key metrics: temperature, wind, precipitation

### Tours & Partners
- Browse upcoming backcountry tours
- Post your own tours with date, trailhead, and objectives
- Find partners for your trips

### Admin Features
- Trailhead management (add/edit/delete trailheads)
- Test user creation for development/demos

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (React), Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | Vercel |
| Scraper | Python (runs via GitHub Actions) |
| Analytics | Vercel Analytics |

## Data Collection

Forecasts are automatically scraped daily from CBAC via GitHub Actions:
- Runs at 6 AM and 6 PM Mountain Time
- Stores danger levels, problems, bottom line, and weather
- Calculates trends by comparing to previous day's data

## Local Development

### Prerequisites
- Node.js 20+
- Python 3.11+ (for scraper)
- Supabase account

### Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/dkurak/backcountrycrews.git
   cd backcountrycrews
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase credentials
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

### Scraper Setup

```bash
cd scraper
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Copy and configure .env
cp .env.example .env
# Add SUPABASE_URL and SUPABASE_SERVICE_KEY

# Run manually
python save_to_supabase.py
```

## Database Migrations

Migrations are in `supabase/migrations/`. Run them in order via the Supabase SQL Editor.

## License

MIT
