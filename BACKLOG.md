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

- [x] **Profile Picture Upload** (Jan 2025)
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

- [ ] **Trip Confirmation & Planning Mode**
  - Trip lifecycle: Proposed → On → (Planning) → Completed

- [x] **Confirm Trip (Organizer action)** (Jan 2026)
  - Manual "Confirm Trip" / "Trip is On" button for organizer
  - Notifies all accepted participants (in-app, future: email option)
  - Visual indicators:
    - Banner on trip detail page: "This trip is ON!"
    - Badge/tag on trip cards in listings
  - Unlocks planning features below

- [ ] **The Brief (AIARE-style pre-trip planning)**
  - Structured discussion framework for the group
  - Elements (refine from AIARE field book):
    - Conditions summary (pull from forecast if available)
    - The plan: route, objectives, timing
    - Hazard awareness / mental model
    - Turn-around criteria
    - Emergency plan / communication protocol
  - Include Quick Trip Plan template (from /field-guide/solo-safety) as a fillable form
    - Pre-populate fields from trip details (destination, trailhead, date, participants)
    - Participants can copy/send to their emergency contacts
  - TODO: Reference AIARE field book for exact structure

- [ ] **Emergency Contacts on Profile**
  - Users can add 1+ emergency contacts to their profile
  - Fields: name, phone number, relationship (e.g. spouse, parent, friend)
  - Visible to trip partners — so if something goes wrong, the group knows who to call
  - Optional: per-trip override (different contact for different trips)
  - Privacy: only shown to accepted participants on shared trips, not publicly visible
  - Ties into The Brief / trip planning — pre-populate the "who to call" field

- [ ] **Gear Coordination**
  - Essentials (radio, satellite, first aid):
    - Pre-filled from user profile settings
    - Requires conscious confirmation per trip (not auto-assumed)
  - Shared items checklist:
    - Group list: emergency blanket, tarp, extra layers, headlamp, repair kit, etc.
    - Each participant indicates what they're bringing
    - Visual indicator for gaps (e.g., "nobody bringing a tarp?")

### Content / Field Guide

- [x] **Radio Channel Guide** (Jan 2025)
  - GMRS/FRS guide, channel reference, best practices
  - At /field-guide/radio-channels

- [x] **Wilderness First Aid Guide** (Jan 2025)
  - Kit essentials, scene assessment, common backcountry injuries
  - At /field-guide/wilderness-first-aid

- [x] **4x4 Vehicle Recovery Guide** (Jan 2025)
  - Gear, self-recovery techniques, CB area road notes
  - At /field-guide/vehicle-recovery

- [x] **Satellite SOS Guide** (Jan 2025)
  - Device comparison, when/how to activate, post-activation flow
  - At /field-guide/satellite-sos

- [x] **Going Alone / Solo Safety** (Jan 2025)
  - Risks and realities of solo backcountry travel
  - Trip planning: tell someone your plan, route, expected return time
  - Reinforce the buddy/group system — why partners matter
  - What to do if plans change or you're overdue
  - Solo-specific gear considerations (satellite communicator is non-negotiable)
  - Link to Trips page as CTA for finding partners
  - At /field-guide/solo-safety

- [ ] **H&H Towing info** — add contact number and details to 4x4 recovery page
- [ ] **Course signup links** — add WFA/WFR/AIARE course links to first aid and avalanche pages
- [ ] **Popular routes section** — add to 4x4 recovery page

### Technical / Infrastructure

- [ ] **Login Activity Tracking**
  - Custom Supabase table for auth events
  - Track who logs in, when, frequency
  - Complement to Vercel Analytics (page views)

---

## Done
_Shipped features (for reference)_

- [x] **Combined Zones View** (Jan 2025)
  - Side-by-side comparison of NW/SE forecasts at /forecast/combined
  - Each date row shows danger pyramid, problem roses, weather info
  - Responsive: side-by-side on desktop, stacked on mobile
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
- [x] **Vercel Speed Insights** (Jan 2025)
- [x] **Field Guide section** (Jan 2025) — Radio, First Aid, 4x4 Recovery, Satellite SOS
- [x] **Withdraw from Trip** (Jan 2025) — Participants can leave trips, notifications sent
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
