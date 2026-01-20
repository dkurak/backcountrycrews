# SkinTrack CB - Feature Backlog

## How to Use
- Add new ideas to "Ideas / Unprioritized"
- Move to "Planned" when ready to build
- Move to "Done" when shipped

---

## Planned
_Features prioritized for upcoming work_

(none yet)

---

## Ideas / Unprioritized

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
