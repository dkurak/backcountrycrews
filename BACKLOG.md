# Backcountry Crews - Feature Backlog

## How to Use
- Add new ideas to "Ideas / Unprioritized"
- Move to "Planned" when ready to build
- Move to "Done" when shipped

---

## Planned
_Features prioritized for upcoming work_

### Multi-Activity Platform Expansion

- [x] **Rebranding for Multi-Activity** (Jan 2025)
  - New name: Backcountry Crews (backcountrycrews.com)
  - Updated branding throughout app
  - Activity-agnostic positioning

- [ ] **Per-Activity Profile Sections**
  - Show activity-specific experience on profile
  - Seasonal activity suggestions

---

## Ideas / Unprioritized

### App Structure Redesign

- [ ] **Personal Dashboard / Home Page**
  - Trip-focused home page for logged-in users
  - Shows: your upcoming trips, trips you've organized, recent activity
  - Weather widget (universal across all activities)
  - Quick links to post a new trip or browse trips

- [ ] **Seasonal Navigation for Avalanche**
  - Avalanche/Forecast tab visible only during winter season (when CBAC is reporting)
  - In summer, link still works for browsing historical data
  - "Coming soon for [season]" message off-season

- [ ] **Activity-Based Navigation**
  - Consider activity tabs/filters as primary navigation
  - Universal content: Weather, Trips
  - Seasonal content: Avalanche forecast (winter)
  - Personal content: Dashboard, Profile

### Admin & Data Management

- [ ] **Custom Trailhead Admin Screen**
  - View trailheads entered via "Other" that aren't in our database
  - Show count of tours using each custom entry
  - Actions: "Add as new trailhead" or "Merge into existing"
  - Helps consolidate duplicates (Gothic Trailhead, Gothic, Goth TH → Gothic)

- [ ] **Routes/Lines Management**
  - Add specific routes like "Convex Corner" or "Red Lady Bowl"
  - Link routes to trailheads
  - Users can select routes when posting tours
  - Referenced in admin/trailheads as "Coming soon"

### User Features

- [ ] **Profile Picture Upload**
  - Use Supabase Storage (free tier: 1GB)
  - Upload component on profile edit page
  - Display in nav bar next to name
  - Show on trip cards and profile pages
  - Image resize/compression before upload

- [ ] **Invite Users to Tour**
  - Tour organizers can invite specific people to their tour
  - Finding users to invite:
    - Quick list of past tour partners (people you've toured with before)
    - Browse users marked "Looking for partners"
    - Search all users by name/email
  - Invited user sees invite in-app (profile/dashboard)
  - Invitee can accept or decline (like organizer accepting requests)
  - Notification: in-app only (no email for now)

- [ ] **Comments on Forecasts**
  - Allow users to comment on daily forecasts
  - Share observations, conditions reports
  - Community knowledge layer on top of CBAC data

- [ ] **Trip Reports**
  - Post-tour reports linked to conditions that day
  - Photos, route info, conditions encountered
  - Historical reference for "what was it like when danger was X"

- [ ] **GPX/Route Upload**
  - Upload GPX tracks from tours
  - Display on map
  - Link to conditions/forecast from that day

- [ ] **Personal Route Tracking**
  - Track your own tours over time
  - See patterns: which zones, conditions, partners
  - Tie to forecast conditions for that day

### Content

- [ ] **Radio Channel Guide**
  - Common backcountry radio channels for CB area
  - When/how to use them
  - Could be static page or dynamic content

### Technical / Infrastructure

- [ ] **Login Activity Tracking**
  - Custom Supabase table for auth events
  - Track who logs in, when, frequency
  - Complement to Vercel Analytics (page views)

---

## Done
_Shipped features (for reference)_

- [x] **Activity Type Support** (Jan 2025)
  - Activity enum and details JSONB on tour_posts
  - Meeting points support multiple activity types
  - User profiles track activity interests
  - Sample meeting points for CB, Taylor Park, Moab
- [x] **UI Updates for Multi-Activity** (Jan 2025)
  - Activity filter on tours browse page
  - Activity selector on tour creation form
  - Activity-specific icons and color coding
- [x] **Historical Data Demo** (Jan 2025)
  - `generate_sample_activity_data()` creates 2+ years of seasonal trips
  - Admin page button to regenerate demo data
- [x] **Feature Flags System** (Jan 2025)
  - Database-driven feature flags for activities and features
  - Admin UI toggle switches at /admin
  - Enables gradual rollout (ski touring first, add hiking later)
- [x] Vercel Analytics for page views (Jan 2025)
- [x] Trend analysis in forecasts - improving/steady/worsening (Jan 2025)
- [x] Admin area with trailhead management (Jan 2025)
- [x] "Other" option for custom trailhead entry (Jan 2025)
- [x] Tours & partner finding (Jan 2025)

---

## Notes

_Quick ideas, raw thoughts, things to research_

- Consider OpenSnow or NOAA integration for weather data
- Mobile app wrapper (PWA or React Native) for better mobile experience?
- Notification system for tour responses, forecast changes
- **Multi-activity architecture decision**: Single platform preferred over micro-sites
  - Single login, cross-activity discovery, shared social graph
  - If micro-sites wanted later, can default activity filter per subdomain
  - Same core value: coordinating group outings with location/route sharing
