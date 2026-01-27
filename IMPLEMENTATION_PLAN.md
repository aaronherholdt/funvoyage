# Feature Implementation Plan: AI Cost Protection

**Overall Progress:** `0%`

## TLDR
Implement cost controls for Gemini API usage to protect against runaway bills while maintaining quality Nia experience. Per-tier trip limits, conversation turn caps, token limits, and Tourist abuse protection.

## Critical Decisions
- **Per-tier limits**: Trip quotas are account-wide, not per-child (prevents fake kid abuse)
- **Tourist model**: 1 full trip with all features; email required to save data
- **Adventurer "unlimited"**: Capped at 15 trips/day (feels unlimited, prevents abuse)
- **History trimming**: Send last 5 exchanges to Gemini (not full history)
- **Rate limit storage**: Supabase (no extra infrastructure)
- **Turn limits**: Hard caps by age group per session

---

## Tasks

- [ ] 🟥 **Step 1: Add Token Limits to Gemini Responses**
  - [ ] 🟥 Update `/api/nia/respond` to set `maxOutputTokens` (150-300 based on age)
  - [ ] 🟥 Update `/api/nia/analyze` to set `maxOutputTokens` (500 max)

- [ ] 🟥 **Step 2: Implement Conversation Turn Limits**
  - [ ] 🟥 Add turn limit constants by age group (4-6: 4 turns, 7-9: 6 turns, 10-12: 8 turns, 13+: 10 turns)
  - [ ] 🟥 Enforce turn limit in frontend before calling API
  - [ ] 🟥 Add backend validation to reject requests exceeding turn limit
  - [ ] 🟥 Trigger graceful session wrap-up when limit reached

- [ ] 🟥 **Step 3: Add Conversation History Trimming**
  - [ ] 🟥 Modify `/api/nia/respond` to only send last 5 exchanges (not full history)
  - [ ] 🟥 Always include system prompt + session context (location, problems)

- [ ] 🟥 **Step 4: Create Usage Tracking in Supabase**
  - [ ] 🟥 Add `usage_tracking` table (user_id, date, trip_count, last_device_fingerprint)
  - [ ] 🟥 Add `tourist_usage` table (device_fingerprint, ip_hash, email, trip_used, created_at)

- [ ] 🟥 **Step 5: Implement Tier-Based Trip Limits**
  - [ ] 🟥 Update tier constants (Tourist: 1 lifetime, Starter: 3/mo, Explorer Pro: 10/mo, Adventurer: 15/day)
  - [ ] 🟥 Add trip limit check before session start
  - [ ] 🟥 Increment trip count on session completion
  - [ ] 🟥 Show upgrade prompt when limit reached

- [ ] 🟥 **Step 6: Implement Tourist Abuse Protection**
  - [ ] 🟥 Generate device fingerprint on client (browser + screen + timezone hash)
  - [ ] 🟥 Check `tourist_usage` table before allowing free trip
  - [ ] 🟥 Block repeat attempts with "Upgrade to continue" message
  - [ ] 🟥 Require email to save trip data (prompt after session complete)

- [ ] 🟥 **Step 7: Move Rate Limiting to Supabase**
  - [ ] 🟥 Replace in-memory Map with Supabase table
  - [ ] 🟥 Add `rate_limits` table (identifier, request_count, window_start)
  - [ ] 🟥 Update `aiRateLimiter.ts` to use Supabase

- [ ] 🟥 **Step 8: Update Tier Configuration**
  - [ ] 🟥 Rename tiers in constants (GUEST→TOURIST, PRO→EXPLORER_PRO, ADVENTURER→WORLD_ADVENTURER)
  - [ ] 🟥 Update tier limits to match pricing (trips, children, features)
  - [ ] 🟥 Add feature flags per tier (badges, media_saving, pdf_reports)

---

## Cost Impact Summary

| Control | Estimated Savings |
|---------|------------------|
| Token limits | ~30% reduction per response |
| Turn limits | ~40% reduction in long sessions |
| History trimming | ~50% reduction in input tokens |
| Trip limits | Prevents unlimited free usage |

**Expected outcome**: Predictable costs tied directly to paying customers.
