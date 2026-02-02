# Feature Idea: Field Book Image Parsing

**Status**: Future enhancement idea
**Priority**: Low (after historical trip entry is well-established)

---

## Concept

Allow users to upload photos of their backcountry field book pages and automatically parse trip data.

## User Story

> "I have 3 years of trips logged in my field book. Instead of manually entering each one, I'd like to take photos and have the system extract the data."

## What to Parse

### From typical field book entries:
- **Date**: "Jan 15, 2024"
- **Route/Location**: "Coneys, Gothic Mountain"
- **Activity**: Ski tour, hike, climb (from context)
- **Conditions**: Snow quality, weather notes
- **Companions**: Names of who went
- **Notes**: Free-form observations

### Example field book entry:
```
Jan 15, 2024 - Coneys
Ski tour w/ Mike & Sarah
Skin up from WG TH - 2hrs
Snow: powder, 6-8" fresh
Descent: excellent!
No dangers observed
```

## Technical Approach

### Phase 1: OCR Text Extraction
- Use OCR service (Google Vision API, AWS Textract, or Tesseract)
- Extract raw text from image
- Preserve layout/structure hints

### Phase 2: Natural Language Processing
- Parse date formats (various styles)
- Extract location names
- Identify activity type from keywords
- Extract companion names
- Classify conditions (good/bad, powder/crud, etc.)

### Phase 3: Assisted Data Entry
Rather than fully automatic, provide **AI-assisted form filling**:

```
┌─ Import from Field Book ─────────────┐
│                                      │
│ [Upload Image]                       │
│                                      │
│ ─── Extracted Data (Review) ───     │
│                                      │
│ Date: [Jan 15, 2024    ] ✓ looks good│
│ Route: [Coneys         ] ✓          │
│ Activity: [Ski Tour ▼  ] ✓          │
│                                      │
│ Companions detected:                 │
│ ☑ Mike  ☑ Sarah                      │
│                                      │
│ Conditions:                          │
│ Snow: [Powder ▼] (from "powder")    │
│                                      │
│ Notes:                               │
│ "Skin up from WG TH - 2hrs           │
│ Descent: excellent!                  │
│ No dangers observed"                 │
│                                      │
│ [Correct & Create Trip]  [Cancel]    │
└──────────────────────────────────────┘
```

### Benefits of Assisted Approach:
1. **Accuracy**: User reviews/corrects before saving
2. **Learning**: System learns from corrections
3. **Flexibility**: Handles variations in handwriting/format
4. **Trust**: Users verify critical data (dates, locations)

## Challenges

### Handwriting Recognition
- Field books often handwritten (not typed)
- Quality varies significantly
- Solution: Start with typed/printed books, add handwriting later

### Format Variations
- Every person logs differently
- No standard format for field books
- Solution: Support common patterns, learn from user corrections

### Ambiguity
- "Gothic" - Gothic Mountain? Gothic Road? Gothic Townsite?
- "Good conditions" - what does that mean numerically?
- Solution: Ask for disambiguation during review

## MVP Approach

### Start Simple:
1. **Upload image** → Extract text with OCR
2. **Show raw text** → User manually maps to form fields
3. **Pre-fill suggestions** → Highlight dates, locations for clicking
4. **Save successful patterns** → Learn common formats per user

### Later Enhancements:
- Full NLP parsing
- Handwriting recognition
- Bulk upload (multiple pages at once)
- "Learn my format" mode

## Integration Points

### Where to add:
- **Trip creation page**: "+ Import from Field Book" button
- **Profile page**: "Bulk import historical trips" section
- **Trips list**: "Import" action in header

### Data Flow:
```
1. User uploads image
2. OCR extracts text
3. NLP suggests field values
4. User reviews/corrects
5. Create trip as "completed" (historical)
6. Learn from corrections for next time
```

## Technical Stack

### OCR Options:
- **Google Cloud Vision API**: Best accuracy, paid
- **AWS Textract**: Good for structured documents
- **Tesseract**: Open-source, free, decent accuracy
- **Azure Computer Vision**: Good handwriting support

### NLP Options:
- **OpenAI GPT-4**: Excellent understanding, paid per request
- **Anthropic Claude**: Great at structured extraction
- **spaCy**: Open-source, fast, good for entities
- **Custom regex + patterns**: Simple, free, limited

### Recommended MVP Stack:
- **Tesseract** for OCR (free, good enough for typed text)
- **Basic regex + patterns** for parsing (dates, common locations)
- **User corrections** to build training data
- Upgrade to GPT-4/Claude later when budget allows

## Cost Considerations

### Per-image costs (approximate):
- Google Vision OCR: $1.50 per 1000 images
- GPT-4 parsing: $0.02-0.05 per image
- Tesseract + regex: Free (self-hosted)

### For 1000 users importing 10 images each:
- Google + GPT-4: ~$500-700
- Tesseract + regex: Infrastructure cost only (~$50/month)

**Recommendation**: Start with free tier, add premium when ROI proven

## Success Metrics

1. **Import success rate**: % of parsed trips accepted without correction
2. **Time savings**: Manual entry time vs assisted import time
3. **Adoption**: % of users who use feature
4. **Historical data**: Number of pre-2024 trips added to platform

## Timeline

- **Now**: Manual historical trip entry (implemented)
- **Q2 2026**: OCR + basic parsing prototype
- **Q3 2026**: AI-assisted review interface
- **Q4 2026**: Production-ready with user corrections learning
- **2027+**: Handwriting recognition, bulk import

## Open Questions

1. **Privacy**: Who can see parsed data before creation?
2. **Storage**: Keep original images or just extracted data?
3. **Companions**: Auto-suggest existing users vs free text?
4. **Batch**: Process multiple pages/years at once?
5. **Mobile**: Upload from phone camera vs desktop?

## Related Features

- Historical trip creation (✅ implemented)
- Trip reports (✅ implemented)
- Route database (📋 planned - Phase 3)
- User similarity (📋 planned - Phase 4)

---

## Example Use Cases

### Use Case 1: Season Review
User wants to import their entire 2023-24 ski season:
- Takes photos of 30 field book pages
- Uploads as batch
- Reviews/corrects suggested entries
- Creates 30 historical trips in 20 minutes
- Now has full season data for recommendations

### Use Case 2: New User Onboarding
New user joins with 5 years of experience:
- Uploads key favorite trips from field book
- System learns their style from historical data
- Gets accurate recommendations from day 1

### Use Case 3: Community Beta
Multiple users import trips to same routes:
- Builds rich conditions database
- Shows seasonal patterns
- Informs future trip planning

---

*Created: 2026-02-02*
*Status: Idea - Future enhancement*
*Dependencies: Historical trip entry (completed), OCR service, NLP capability*
