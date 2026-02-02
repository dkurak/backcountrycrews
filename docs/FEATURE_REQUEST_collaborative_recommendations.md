# Feature Request: Collaborative Filtering Recommendation System

**Inspiration**: Snailtrail 4x4 Podcast approach to trail recommendations

**Status**: Proposal for Phase 3+ implementation
**Foundation**: Phase 1 (Attendance) & Phase 2 (Trip Reports) provide necessary data

---

## Problem Statement

Traditional trail ratings are context-free and misleading:
- Expert's 1-star = "too easy"
- Intermediate's 5-star = "perfect challenge"
- **Same route, opposite meanings!**

**Current approach**: "What's the best route?" → Generic averages
**Better approach**: "What do people like me enjoy?" → Contextual recommendations

---

## Core Concept: Find Your Tribe

Instead of absolute ratings, match users based on:
1. **Skill level** (beginner → expert)
2. **Equipment** (beacon/probe/shovel, snowmobile, vehicle build)
3. **Touring style** (KISS vs aggressive, earn-your-turns vs sled-assisted)
4. **Risk tolerance** (conservative, moderate, aggressive)

**Example**: Intermediate, no-sled, KISS skiers see what other intermediate, no-sled, KISS skiers loved.

---

## Key Insight: Trip Rating ≠ Route Rating

**Problem with current implementation**:
- Sunday Coneys trip report: 3 stars (due to poor snow conditions)
- But Coneys as a ROUTE might be 5 stars!

**Solution**: Separate ratings:

### 1. Trip Report Rating (existing)
- "How did THIS specific trip go?"
- Affected by: conditions, weather, group dynamics, timing
- Used for: Historical record, beta about conditions

### 2. Route Rating (NEW)
- "How is THIS route as a route?"
- Independent of conditions
- Based on: approach, difficulty, scenery, access, character
- Used for: Recommendations

---

## Implementation Plan

### Phase 2.5: Enhanced User Profiles (Implement Now)

**Why now**: Foundation for future recommendations, improves current experience

#### Multi-Activity Profile Structure

User profiles need activity-specific tabs/sections since equipment and style vary:

```
Profile Layout:
├─ General Info (existing)
│  ├─ Display name
│  ├─ Overall experience level
│  ├─ Bio
│  └─ Contact info
│
├─ Ski Touring (NEW)
│  ├─ Skill level: Beginner / Intermediate / Advanced / Expert
│  ├─ Equipment
│  │  ├─ Beacon / Probe / Shovel (existing)
│  │  ├─ Snowmobile access: Yes / No
│  │  ├─ Splitboard: Yes / No
│  ├─ Style
│  │  ├─ Approach: KISS / Balanced / Aggressive
│  │  ├─ Access preference: Earn-your-turns / Sled-assisted / Both
│  │  ├─ Risk tolerance: Conservative / Moderate / Aggressive
│  │  ├─ Group size: Solo / Small (2-4) / Large (5+)
│  ├─ Favorite Routes (free-form list)
│  └─ Routes to Avoid (free-form list)
│
├─ Off-Road (NEW)
│  ├─ Experience level: Novice / Intermediate / Advanced / Expert
│  ├─ Vehicle
│  │  ├─ Type: Stock 4Runner / Built Jeep / Bronco / etc.
│  │  ├─ Tire size: 32" / 35" / 37"+
│  │  ├─ Lift: Stock / 2-3" / 4"+
│  │  ├─ Lockers: None / Rear / Front+Rear
│  │  ├─ Armor: Skid plates / Rock sliders / Bumpers
│  ├─ Style
│  │  ├─ Approach: Technical / Scenic / Speed
│  │  ├─ Risk tolerance: Conservative / Moderate / Aggressive
│  ├─ Favorite Trails
│  └─ Trails to Avoid
│
├─ Mountain Bike (NEW)
│  ├─ Skill level
│  ├─ Bike type: XC / Trail / Enduro / DH
│  ├─ Style: Flow / Technical / Jumps / Climbing
│  ├─ Favorite Trails
│  └─ Trails to Avoid
│
└─ (Similar sections for Hike, Climb, Trail Run)
```

#### Database Schema (Phase 2.5)

```sql
-- Add to profiles table
ALTER TABLE profiles
  ADD COLUMN profile_data JSONB DEFAULT '{}';

-- Structure:
{
  "ski_touring": {
    "skill_level": "intermediate",
    "equipment": {
      "has_snowmobile": false,
      "has_splitboard": false
    },
    "style": {
      "approach": "kiss",
      "access_preference": "earn_your_turns",
      "risk_tolerance": "conservative",
      "group_size": "small"
    },
    "favorite_routes": ["Coneys", "Gothic Mountain", "Elkton"],
    "avoid_routes": ["Purple Palace (too exposed)"]
  },
  "offroad": {
    "vehicle": {
      "type": "4runner",
      "tire_size": "33",
      "lift": "stock",
      "lockers": "none"
    },
    "style": {
      "approach": "scenic",
      "risk_tolerance": "moderate"
    },
    "favorite_trails": ["Pearl Pass", "Schofield Pass"],
    "avoid_trails": []
  }
}
```

---

### Phase 3: Route Database & Dual Rating System

#### 1. Routes Table

```sql
CREATE TABLE routes (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  activity ActivityType NOT NULL,
  zone TEXT,
  trailhead TEXT,

  -- Route characteristics (objective, not conditions)
  difficulty_grade TEXT, -- "moderate", "difficult", etc.
  vertical_gain INTEGER,
  distance FLOAT,
  exposure_rating TEXT, -- "low", "moderate", "high"
  technical_rating TEXT,

  -- Aggregated from user ratings
  avg_rating FLOAT,
  rating_count INTEGER,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link trip reports to routes
CREATE TABLE trip_route_links (
  trip_id UUID REFERENCES tour_posts(id),
  route_id UUID REFERENCES routes(id),
  PRIMARY KEY (trip_id, route_id)
);
```

#### 2. Route Ratings (separate from trip reports)

```sql
CREATE TABLE route_ratings (
  id UUID PRIMARY KEY,
  route_id UUID REFERENCES routes(id),
  user_id UUID REFERENCES profiles(id),

  -- Route quality rating (not trip-specific)
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),

  -- Why they rated it this way
  liked TEXT[], -- ["approach", "scenery", "snow_quality", "challenge_level"]
  disliked TEXT[], -- ["exposure", "too_easy", "crowded"]

  -- Context (for similarity matching)
  user_skill_at_time TEXT, -- Skill level when they did it
  user_equipment JSONB, -- Equipment profile snapshot

  notes TEXT, -- Free-form notes about the route (not conditions)

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(route_id, user_id)
);
```

#### 3. Updated Trip Reports

```sql
-- Modify existing trip report structure
-- Separate "trip conditions" from "route rating"

{
  "trip_rating": 3, // How this specific trip went (conditions-dependent)
  "route_rating": 5, // How good the route is (conditions-independent)
  "would_repeat": true, // Boolean flag
  "summary": "Poor conditions but awesome route...",
  "conditions": { ... }
}
```

**Example**:
- **Trip rating**: 3 stars (crud snow, bad visibility, sketchy avalanche conditions)
- **Route rating**: 5 stars (perfect difficulty, beautiful approach, manageable exposure)
- **Would repeat**: Yes! (just need better conditions)

---

### Phase 4: Similarity Algorithm

#### User Similarity Score Calculation

```typescript
function calculateUserSimilarity(user1: Profile, user2: Profile, activity: ActivityType): number {
  const profile1 = user1.profile_data[activity];
  const profile2 = user2.profile_data[activity];

  let score = 0;

  // Skill level (30% weight) - closer = better
  const skillDiff = Math.abs(skillToNumber(profile1.skill_level) - skillToNumber(profile2.skill_level));
  score += (1 - skillDiff / 3) * 30; // 0-3 levels difference

  // Equipment match (20% weight)
  if (activity === 'ski_touring') {
    if (profile1.equipment.has_snowmobile === profile2.equipment.has_snowmobile) score += 10;
    if (profile1.equipment.has_beacon === profile2.equipment.has_beacon) score += 10;
  }

  // Style match (30% weight)
  if (profile1.style.approach === profile2.style.approach) score += 10;
  if (profile1.style.risk_tolerance === profile2.style.risk_tolerance) score += 10;
  if (profile1.style.access_preference === profile2.style.access_preference) score += 10;

  // Overlapping favorites (20% weight) - taste similarity
  const overlap = profile1.favorite_routes.filter(r =>
    profile2.favorite_routes.includes(r)
  ).length;
  score += Math.min(overlap * 5, 20);

  return score; // 0-100
}
```

---

### Phase 5: Recommendation Engine

#### Algorithm Flow

```typescript
function getRecommendations(userId: string, activity: ActivityType, limit: number = 10) {
  // 1. Find similar users (similarity score > 70)
  const similarUsers = findSimilarUsers(userId, activity, minScore: 70);

  // 2. Get routes they rated highly (4-5 stars)
  const candidateRoutes = getHighRatedRoutes(similarUsers, minRating: 4);

  // 3. Filter out routes user already did
  const userRoutes = getUserRoutes(userId, activity);
  const newRoutes = candidateRoutes.filter(r => !userRoutes.includes(r.id));

  // 4. Score and rank routes
  const scored = newRoutes.map(route => ({
    route,
    score: calculateRecommendationScore(route, similarUsers, userId)
  }));

  // 5. Sort by score and return top N
  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

function calculateRecommendationScore(route, similarUsers, userId) {
  let score = 0;

  // Average similarity of users who loved this route
  const lovers = similarUsers.filter(u =>
    u.ratings.find(r => r.route_id === route.id)?.rating >= 4
  );
  const avgSimilarity = average(lovers.map(u => u.similarity));
  score += avgSimilarity * 50; // 0-50 points

  // How many similar users loved it (consensus)
  score += Math.min(lovers.length * 5, 30); // 0-30 points

  // Average route rating from similar users
  const avgRating = average(lovers.map(u =>
    u.ratings.find(r => r.route_id === route.id).rating
  ));
  score += avgRating * 4; // 0-20 points (5 stars * 4)

  return score; // 0-100
}
```

---

## UI/UX Design

### Profile Edit Page - Tabbed Interface

```
┌─ Edit Profile ───────────────────────┐
│                                      │
│ [General] [Ski Touring] [Off-Road]  │ ← Activity tabs
│ ────────────────────────────────     │
│                                      │
│ Ski Touring Profile:                 │
│                                      │
│ Skill Level:                         │
│ ○ Beginner ○ Intermediate           │
│ ● Advanced ○ Expert                  │
│                                      │
│ Equipment:                           │
│ ☑ Beacon ☑ Probe ☑ Shovel          │
│ ☐ Snowmobile access                 │
│ ☐ Splitboard                        │
│                                      │
│ Touring Style:                       │
│ Approach: [KISS ▼]                   │
│ Access: [Earn-your-turns ▼]         │
│ Risk Tolerance: [Conservative ▼]    │
│ Group Size: [Small (2-4) ▼]         │
│                                      │
│ Favorite Routes:                     │
│ • Coneys                 [Remove]    │
│ • Gothic Mountain        [Remove]    │
│ [+ Add Route]                        │
│                                      │
│ Routes to Avoid:                     │
│ • Purple Palace - too exposed        │
│   [Remove]                           │
│ [+ Add Route & Reason]               │
│                                      │
│              [Save Changes]          │
└──────────────────────────────────────┘
```

### Recommendations Page (Phase 5)

```
┌─ Recommended Routes ─────────────────┐
│                                      │
│ Based on your ski touring profile:   │
│ Intermediate · No sled · KISS        │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 🎿 Gothic Mountain                │ │
│ │ ⭐⭐⭐⭐⭐ (4.8 avg from 12 similar) │ │
│ │                                   │ │
│ │ 8 skiers like you loved this:     │ │
│ │ • MountainMike (95% match)       │ │
│ │ • SkiSarah (92% match)           │ │
│ │ • PowderPete (89% match)         │ │
│ │                                   │ │
│ │ Why you might like it:            │ │
│ │ ✓ Moderate difficulty             │ │
│ │ ✓ Earn-your-turns approach        │ │
│ │ ✓ Beautiful scenery               │ │
│ │ ✓ Low avalanche terrain          │ │
│ │                                   │ │
│ │ [View Details] [Mark as Done]     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ 🎿 Elkton                          │ │
│ │ ⭐⭐⭐⭐ (4.2 avg from 8 similar)   │ │
│ │ ...                               │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

### Trip Report Form - Updated with Dual Ratings

```
┌─ Trip Report ────────────────────────┐
│                                      │
│ Route: [Sunday Coneys ▼] [+ New]    │
│                                      │
│ ─────────────────────────────────   │
│                                      │
│ How did THIS trip go?                │
│ Trip Conditions Rating:              │
│ ⭐⭐⭐☆☆ (3 stars - poor conditions)  │
│                                      │
│ Snow Quality: [Crud ▼]              │
│ Skintrack: [Fair ▼]                 │
│ Descent: [Poor ▼]                   │
│ Dangers: "High avalanche danger..."  │
│                                      │
│ ─────────────────────────────────   │
│                                      │
│ How is the ROUTE itself?             │
│ Route Rating (independent of         │
│ today's conditions):                 │
│ ⭐⭐⭐⭐⭐ (5 stars - love this route) │
│                                      │
│ Would you do this route again?       │
│ ● Yes, with better conditions        │
│ ○ Yes, anytime                       │
│ ○ Maybe                              │
│ ○ No                                 │
│                                      │
│ What did you like?                   │
│ ☑ Approach  ☑ Scenery                │
│ ☑ Challenge level  ☐ Solitude        │
│                                      │
│ Trip Summary:                        │
│ "Poor conditions but the route is... │
│                                      │
│              [Save Report]           │
└──────────────────────────────────────┘
```

---

## Benefits

### For Users
1. **Discover routes matched to their style** - not just "popular" routes
2. **Learn from similar users** - "People like me enjoyed..."
3. **Build confidence** - recommendations matched to skill/equipment
4. **Avoid mismatches** - Don't send KISS skiers to aggressive terrain

### For Community
1. **Encourages honest feedback** - ratings are contextualized
2. **Reduces gatekeeping** - All routes are "good" for the right person
3. **Knowledge sharing** - "Here's what works for my setup"
4. **Diversity of experiences** - Not just "best of" lists

### For Safety
1. **Appropriate recommendations** - Matched to skill level
2. **Equipment context** - Routes recommended based on gear
3. **Risk tolerance** - Conservative users don't get aggressive routes
4. **Local knowledge propagation** - Learn from experienced locals with similar profiles

---

## Data Requirements

### Critical Mass Needed

- **Minimum 20-30 active users** per activity per zone
- **3-5 route ratings per route** for reliable recommendations
- **6+ months of trip reports** to understand user preferences

### Cold Start Problem Solutions

1. **Manual route seeding** - Pre-populate common routes
2. **Explicit favorites** - Users list favorites immediately
3. **Hybrid recommendations** - Combine collaborative + content-based
4. **Progressive enhancement** - Start with simple "similar users" → full recommendations

---

## Implementation Phases

### ✅ Phase 1: Attendance Tracking (DONE)
Foundation for knowing who actually did routes

### ✅ Phase 2: Trip Reports (DONE)
Foundation for gathering rating data

### 🚧 Phase 2.5: Enhanced Profiles (NEXT - Implement Now)
- Add tabbed profile interface
- Activity-specific profile sections
- Favorite routes / Routes to avoid
- Equipment and style preferences
- **Timeline**: 2-3 weeks

### 📋 Phase 3: Route Database & Dual Ratings
- Create routes table
- Separate trip ratings from route ratings
- Link trips to routes
- **Timeline**: 4-6 weeks

### 📋 Phase 4: Similarity Algorithm
- User matching algorithm
- Profile similarity scoring
- Testing and tuning
- **Timeline**: 2-3 weeks

### 📋 Phase 5: Recommendation Engine
- Build recommendation algorithm
- UI for browsing recommendations
- Testing with real data
- **Timeline**: 4-6 weeks

**Total estimated timeline**: 4-6 months after Phase 2.5 starts

---

## Success Metrics

1. **User engagement**: % of users filling out enhanced profiles
2. **Recommendation accuracy**: % of recommended routes users actually do
3. **Rating participation**: % increase in route ratings vs current trip reports
4. **Discovery**: New routes tried per user per season
5. **User satisfaction**: Survey feedback on recommendation quality

---

## Technical Considerations

### Performance
- Similarity calculations are CPU-intensive
- Cache similarity scores (recalculate weekly)
- Pre-compute recommendations (refresh daily)
- Limit to top 50-100 routes per activity/zone

### Privacy
- Let users control profile visibility
- Anonymous route ratings option
- Don't expose full "similar users" list (just count)

### Scalability
- Start with single zone/activity (Ski Touring in CB)
- Expand as data grows
- Consider ML models if user base grows >1000

---

## Open Questions

1. **How to handle route variations?**
   - Example: Coneys via skin track vs Coneys via snowmobile
   - Solution: Track access method in route_ratings

2. **Seasonal variations?**
   - Winter Schofield Pass ≠ Summer Schofield Pass
   - Solution: Activity-specific route entries

3. **Should routes be user-generated or admin-curated?**
   - Start: Admin-curated common routes
   - Later: User-submitted with review

4. **How to handle changing user profiles?**
   - Beginner → Advanced over time
   - Solution: Snapshot profile at rating time, weight recent ratings higher

---

## Alternative: Lightweight MVP

If full implementation is too complex, start with:

### Simple Favorites/Avoid Lists (Phase 2.5 only)

- Add "Favorite Routes" and "Routes to Avoid" to profiles
- Display on user profiles
- Manual discovery: "Check out profiles of users similar to you"
- No algorithm, just structured data collection
- **Build the data foundation for future automation**

This captures the key insight (context matters) without building the full recommendation engine yet.

---

## Inspiration Credit

**Snailtrail 4x4 Podcast** - Collaborative approach to trail recommendations based on user similarity and equipment profiles rather than absolute ratings.

---

## Next Steps

1. **Review this proposal** - feedback from early users
2. **Prioritize Phase 2.5** - Enhanced profiles provide immediate value
3. **Collect route names** - Start building common routes list
4. **Test dual rating concept** - Does separating trip/route rating make sense?
5. **Gather user feedback** - Would people use this?

---

*Created: 2026-02-02*
*Status: Proposal - Ready for review*
