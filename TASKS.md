# NailExams — Active Tasks

> Read CLAUDE.md first for project architecture and conventions.

---

## Blocking — must ship before release

### ✅ 0. Dev streak override — reverted
- `src/screens/HomeScreen.tsx` — removed `__DEV__ ? Math.max(real, 5) : real` from streak useMemo

### 1. RevenueCat Android key
**File:** `src/services/purchases/purchasesService.ts`
- Replace `RC_API_KEY_ANDROID = 'goog_REPLACE_WITH_YOUR_ANDROID_KEY'`
- Create Android app in app.revenuecat.com with package `com.gurolerdogan.nailexams`
- iOS key (`appl_NhimetkwHswzUtIWPfLiLUHoakG`) is already live

### 2. Android Firebase config
- Download `google-services.json` from Firebase Console → Project Settings → Android app
- Add to project root
- Add `googleServicesFile: './google-services.json'` to the `android` section of `app.config.ts`

---

## Phase 4 — market expansion

### 3. IB Diploma support
- Add `IB` to `ExamLevel` type in `src/types/models.ts`
- New file: `src/data/ibTopicCatalog.ts` — six subject groups, HL and SL topics
- Update `OnboardingExamLevelScreen` — add IB card with subject/topic counts
- Update `src/services/seed/preloadGcseTopics.ts` to handle IB catalog
- Update `EditSubjectsScreen` — IB preset subjects list

### 4. YKS Turkish market
- Add `YKS` to `ExamLevel` type
- New file: `src/data/yksCatalog.ts` — TYT + AYT subjects and topics
- Turkish localisation for key strings
- Onboarding: show language/exam selector before exam level if device locale is `tr`
- Ship as separate App Store listing (Turkey) pointing to same binary

### 5. Teacher referral page
- New screen: `src/screens/TeacherReferralScreen.tsx`
  - Generates deep-link: `nailexams://onboard?subjects=Maths,Physics&source=teacher`
  - "Copy link" + "Share link" buttons
- Handle deep link in `RootNavigator.tsx` — pre-tick specified subjects in onboarding
- Add "For teachers" link on login screen

---

## Technical debt

### 6. Storage integrity — wipeAll audit
- Check `src/services/storage/nailexamsStorage.ts` `wipeAll()` function
- `wipeAll()` uses `Object.values(STORAGE_KEYS)` — should cover all keys automatically
- Confirm `NE_REVIEW_PROMPTED`, `NE_NOTIF_SETTINGS_V1`, `NE_WEEKLY_GOAL_V1` (deprecated but still in keys.ts) are all wiped
- Consider removing `NE_WEEKLY_GOAL_V1` from keys.ts entirely since it's no longer written

---

## Done ✓

**Session screen (v1.7 develop)**
- ✅ Fully inlined timer in `SessionScreen.tsx` — does NOT use `useSessionTimer` hook
- ✅ Native animated countdown: single `Animated.timing` (linear, `useNativeDriver:true`) drives four digit columns via `Animated.modulo / .divide / .subtract / .add / .interpolate` — zero JS involvement after start; works on React Native 0.81 + Fabric
- ✅ Mechanical odometer roll: each column holds stable digit for its period, rolls 1 s after ones-column wrap
- ✅ `Animated.loop` colon blink (native driver)
- ✅ AppState background compensation: restarts native animation from wall-clock-accurate remaining time
- ✅ Pause/resume wired correctly
- ✅ Practice tab `tabPress` always resets to `PracticeHome`; tab bar hidden on Session screen

**Pillar 3 — Engagement (v1.6)**
- ✅ 3.1 Milestone badges — 19 badges (Bronze/Silver/Gold/Special/Hidden); `badgeService.ts` derives all from existing storage; `BadgesScreen` grid view; badge toast in PracticeScreen after celebration; "Share badge" button (Plus); Settings → Achievements
- ✅ 3.2 Richer share cards — `TopicNailedCard` (journey line), `SubjectClearedCard` (domain bars), `BadgeUnlockCard`; `shareCard.ts` shared helper; share button on celebration overlay (Plus only); `NE_PROGRESS_SHARED` flag unlocks `progress_shared` badge

**Pillar 1 — Smarter plans (v1.6)**
- ✅ 1.1 Topic weight & time estimates — `src/utils/catalog.ts` (keyword-based weight 1/2/3, 15/25/40 min defaults); plan generator uses weight multiplier + one-heavy-per-day rule; PlanScreen session cards show weight dots (●●○) + `~Xmin`
- ✅ 1.2 Exam-pressure mode — plan generator computes phase per subject (normal/crunch/final) from `examDates`; crunch tiles get amber border, final-push tiles get red border on HomeScreen; final-push suppresses well-known topics
- ✅ 1.3 Subject balance warnings — `src/utils/balance.ts`; HomeScreen shows contextual nudge for neglected subjects (9+ days), weekly skew (≥60% one subject), or single-subject runs; dismissable (in-memory)
- ✅ 1.4 Weak-topic fast lane — `src/utils/fastLane.ts`; detects stuck topics (≥2 check-ins in 14 days, peak conf ≤2); 3× priority boost in plan generator; burnout rest after 4 failed sessions; 🚨 rescue badge in PracticeScreen topic rows

**Pillar 2 — Study efficiency (v1.6)**
- ✅ 2.1 Focus timer — `src/utils/sessionTimer.ts`; 3-state sheet in PracticeScreen (idle → running → checkin); duration from catalog weight; pauses on app background; "skip timer" always available
- ✅ 2.2 Revision strategy tips — `src/notifications/revisionTips.ts`; 18 tips across 3 categories (conf 1–2, conf 3–4, fast-lane); deterministic per (topicId, confidence, fastLane) — same tip each session until confidence improves
- ✅ 2.3 Pre-session intention — `src/utils/intentionPlaceholders.ts`; keyword→placeholder lookup (~18 entries); intention shown during session, pre-filled into note at check-in as `"Goal: ..."`

**Auth & onboarding**
- ✅ Firebase auth (email/password, Google, Apple Sign-In)
- ✅ Onboarding 3-step flow (exam level → grouped subject picker → confirm)
- ✅ Subject picker grouped by provider (AQA/Edexcel/OCR), collapsible sections
- ✅ 61 GCSE subjects / 74 A-Level subjects with 1200+/1600+ topics across 3 providers
- ✅ Subject limits: GCSE free=3, Plus up to 15 (warn at 12); A-Level free=1, Plus up to 5
- ✅ App icon on onboarding first screen; exam level cards show subject/topic counts

**Core features**
- ✅ Practice check-in (subject grid → topic list → confidence sheet)
- ✅ Confidence 0–5 model; last check-in date shown in sheet
- ✅ Domain grouping in topic list (collapsible sections)
- ✅ Persistent notes on topics
- ✅ Past paper links ("Find past questions →" per subject, AQA/Edexcel/OCR)
- ✅ Celebration overlay on every check-in (level-specific emoji/message/duration)
  - Levels 1–2: "Need more help? Find past questions →" link
  - Navigation back after plan check-in fires after celebration completes
- ✅ Weekly plan generation (auto-generate + manual modes)
- ✅ Plan screen: day headers green + "✅ All done!" + inline "Share" button when day complete
- ✅ HomeScreen plan tab: day pills green + ✓ when day complete; "Share today's progress" button
- ✅ Plan → Practice deep-link (returnTo: 'Plan'|'Home', openedFromPlanRef guard)
- ✅ Plan settings (sessions/day, 30/60/90 days, topic order, study days Mon–Sun chips)
- ✅ Study days selection — plan generation only places sessions on selected days
- ✅ Spaced repetition in plan generator (forgetting curve: conf 1–2=3d, 3=7d, 4–5=14d)

**Retention & analytics**
- ✅ Streak system (computeStreak, HomeScreen display 🔥, 9pm nudge)
- ✅ PostHog analytics (US region, all logEvent calls forwarded, app_open tracked)
- ✅ In-app review prompt (7-day streak or 10th "Nailed it", one-time, NE_REVIEW_PROMPTED)
- ✅ Push notifications: mandatory 6pm DAILY + user extra DAILY (native spinner, 5-min intervals)
- ✅ Weekly summary notification (Sunday 8pm, one-shot DATE trigger)
- ✅ Weekly check-in goal — derived from `topicsPerDay × studyDays.length`, progress bar on HomeScreen, unique topics counted
- ✅ Exam countdown (ExamDatesScreen, per-subject dates, HomeScreen banner + tile indicator)
- ✅ Milestone: "All done" day indicators in Plan and HomeScreen plan tab

**Monetisation**
- ✅ RevenueCat + PlusContext (iOS key live, Android placeholder)
- ✅ PaywallScreen (custom branded, feature list, plan cards, legal links)
- ✅ ChoosePlanScreen (Settings → Subscription → Choose a Plan)
- ✅ Plus features gated: themes, 60/90-day plans, manual planning, Analytics, image share
- ✅ Onboarding: subject limit enforced, theme selection removed (moved to Settings)
- ✅ Expo Go bypass: PLUS_GATE_BYPASS + isRevenueCatConfigured() returns false in Expo Go

**Settings & UI**
- ✅ Theme system: Default (free), Soft Focus, Neon, Dark Terminal (Plus only)
- ✅ Theme selector order: Default → Soft Focus → Neon → Dark Terminal
- ✅ Analytics screen (Plus only): weekly trend chart, most improved topics, branded image share
- ✅ Settings sections: Study / Subscription / Legal / Developer (admin only) / Account
- ✅ Admin accounts list (ADMIN_EMAILS set) — View Logs only for admins
- ✅ Reset Onboarding moved to Account section (before Log Out)
- ✅ Legal section: Terms of Use + Privacy Policy links (also in PaywallScreen + ChoosePlanScreen)
- ✅ Settings tab always resets to SettingsHome (tabPress listener)
- ✅ Back button always reaches SettingsHome (canGoBack() guard)
- ✅ HomeScreen: Plus promo banner (random, 6 messages, bottom of content, hidden for Plus users)
- ✅ HomeScreen: exam countdown banner with natural language copy
- ✅ HomeScreen: subject tiles show exam day indicator (top-right corner)
- ✅ Notification extra reminder: native DateTimePicker spinner, 5-min intervals (iOS), Platform-aware (Android)

**App Store**
- ✅ Privacy policy URL: gurolerdogan.github.io/NailExams/privacy
- ✅ Terms of Use: Apple standard EULA linked in PaywallScreen, ChoosePlanScreen, SettingsScreen
- ✅ Subscription details (title, length, price) shown explicitly in PaywallScreen and ChoosePlanScreen
- ✅ Available in all countries except China Mainland
