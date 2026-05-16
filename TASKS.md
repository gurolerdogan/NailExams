# NailExams — Active Tasks

> Read CLAUDE.md first for project architecture and conventions.
> Update this file as tasks are completed. Delete done items or move them to the Done section at the bottom.

---

## Blocking — must ship before marketing

### 1. RevenueCat production keys
**File:** `src/services/purchases/purchasesService.ts`
- Replace `RC_API_KEY_IOS = 'appl_REPLACE_WITH_YOUR_IOS_KEY'`
- Replace `RC_API_KEY_ANDROID = 'goog_REPLACE_WITH_YOUR_ANDROID_KEY'`
- In RevenueCat dashboard: create entitlement ID `plus`, offering ID `default`, packages `$rc_monthly` and `$rc_annual`
- Verify `isRevenueCatConfigured()` returns true before submitting to App Store

---

## High priority — retention & acquisition

### 2. In-app review prompt
**New file:** `src/utils/reviewPrompt.ts`
- Use `expo-store-review` (`import * as StoreReview from 'expo-store-review'`)
- Trigger conditions (pick ONE per session, never repeat):
  - User hits a 7-day streak for the first time
  - User rates their 10th topic 5/5 ("Nailed it")
- Guard: store a flag `NE_REVIEW_PROMPTED` in AsyncStorage — never prompt twice
- Do NOT trigger on first launch, after errors, or mid-flow
- Call from `HomeScreen.tsx` after streak computation or from `PracticeScreen.tsx` after submit

### 3. Shareable revision card (image, not plain text)
**File:** `src/screens/AnalyticsScreen.tsx`
- Replace the plain-text `Share.share` with a designed image card
- Use `react-native-view-shot` to capture a styled `<View>` as PNG, then share
- Card content (styled, branded):
  - NailExams logo/wordmark top-left
  - "X topics checked in · Y days streak" 
  - Subject confidence bars (the 5-colour bar chart)
  - Exam countdown if set (see task 4)
  - Dark background (`#0A0A0C`), confidence bar colours
- Keep plain-text fallback for Android if view-shot fails
- Gate behind Plus (already is — just replace the share implementation)

### 4. Exam countdown
**Files to touch:**
- `src/types/models.ts` — add `examDates?: Array<{ subjectId: string; date: string }>` to `UserProfile`
- New screen: `src/screens/ExamDatesScreen.tsx` — list of subjects with a date picker per subject
- `src/navigation/SettingsNavigator.tsx` — add `ExamDates` route
- `src/screens/SettingsScreen.tsx` — add "Exam dates" menu row navigating to ExamDates
- `src/screens/HomeScreen.tsx` — in the stats row, show the nearest upcoming exam:
  `"47d to Maths GCSE"` in amber if < 30 days, red if < 14 days
- Storage: save via `saveProfile` (already handles UserProfile updates)

### 5. Weekly summary notification
**Files to touch:**
- `src/notifications/messages.ts` — add `WEEKLY_SUMMARY` message type
- `src/services/notifications/` — add `scheduleWeeklySummary()` function
- Schedule: every Sunday at 8pm local time
- Content: compute from practiceStorage — topics checked in that week, avg confidence delta vs previous week, current streak
- Cancel and reschedule on each app open (same pattern as existing reminders)

---

## Medium priority — retention depth

### 6. Milestone celebrations
**File:** `src/screens/PracticeScreen.tsx`
- After `submit()` saves successfully, check:
  - If new confidence === 5 and previous confidence < 5 → show "Nailed it!" celebration
  - If all topics in a subject are now confidence >= 4 → show subject completion banner
- Implementation: a brief animated overlay (Animated.View, 1.5s, auto-dismiss)
- Keep it lightweight — no third-party confetti library needed, CSS-style animation is fine
- Log event `topic_nailed` and `subject_completed` for PostHog

### 7. Spaced repetition in plan generator
**File:** `src/services/plan/generateWeeklyPlan.ts`
- Current logic: sorts topics by confidence ascending (lowest first)
- Add forgetting curve weighting:
  - Topics with confidence 1–2: resurface every 3 days
  - Topics with confidence 3: resurface every 7 days
  - Topics with confidence 4–5: resurface every 14 days
  - Topics never checked in (confidence 0): treat as priority 1
- Use `lastPracticedAt` timestamp to compute days since last check-in
- Topics overdue for their resurfacing interval get a priority boost
- Label this as a Plus feature in PaywallScreen copy: "Plans built on spaced repetition"

### 8. Weekly check-in goal
**Files to touch:**
- `src/screens/PlanSettingsScreen.tsx` — add a "Weekly goal" setting (slider or stepper: 5/10/15/20 topics)
- `src/screens/HomeScreen.tsx` — add a goal progress bar below the stats row when a goal is set:
  `"8 / 10 topics this week"` with a green progress bar
- Storage key: `NE_WEEKLY_GOAL_V1` in AsyncStorage
- Notification: if goal is set and not yet reached by Thursday 8pm, send a nudge

---

## Phase 4 — market expansion (after metrics are stable)

### 9. IB Diploma support
- Add `IB` to `ExamLevel` type in `src/types/models.ts`
- New file: `src/data/ibTopicCatalog.ts`
  - Six subject groups: Studies in Language & Literature, Language Acquisition, Individuals & Societies, Sciences, Mathematics, The Arts
  - Populate with HL and SL topics for the most common subjects
- Update `src/screens/onboarding/OnboardingExamLevelScreen.tsx` — add IB card
- Update `src/services/seed/preloadGcseTopics.ts` (rename to `preloadTopics.ts`) to handle IB
- Update `src/screens/EditSubjectsScreen.tsx` — IB preset subjects list

### 10. YKS Turkish market
- Add `YKS` to `ExamLevel` type
- New file: `src/data/yksCatalog.ts`
  - TYT subjects: Türkçe, Sosyal Bilimler, Temel Matematik, Fen Bilimleri
  - AYT subjects: Matematik, Fizik, Kimya, Biyoloji, Türk Dili ve Edebiyatı, Tarih, Coğrafya
- Turkish localisation: `src/i18n/tr.ts` — key strings translated
- Onboarding: show language/exam selector before exam level if device locale is `tr`
- Ship as separate App Store listing (Turkey) pointing to same binary

### 11. Teacher referral page
- New screen: `src/screens/TeacherReferralScreen.tsx`
  - Teacher enters school name + subject list
  - Generates a deep-link URL: `nailexams://onboard?subjects=Maths,Physics&source=teacher`
  - "Copy link" + "Share link" buttons
- Handle deep link in `RootNavigator.tsx` — if `source=teacher`, pre-tick the specified subjects in `OnboardingSubjectsScreen`
- Add "For teachers" link on the login screen (small, below the form)
- No backend needed — link encodes the config in URL params

---

## Technical debt

### 12. Storage integrity — wipeAll audit
- Check `src/services/storage/nailexamsStorage.ts` `wipeAll()` function
- Verify it covers ALL keys: `NE_TOPICS_V1`, `NE_SUBJECTS_V1`, `NE_PROFILE_V1`, `NE_ONBOARDING_V1`, `NE_PLAN_V1`, `NE_PLAN_SETTINGS_V1`, `NE_WEEKLY_GOAL_V1` (new), `NE_REVIEW_PROMPTED` (new)
- Add any missing keys

### 13. CLAUDE.md update
- After shipping tasks 2–5, regenerate CLAUDE.md to reflect new screens, storage keys, and feature status

---

## Done ✓

- ✅ Firebase auth (login, signup, Google, Apple)
- ✅ Onboarding (3 screens, tile grid subject picker, progress dots)
- ✅ Practice check-in (subject grid → topic list → confidence sheet)
- ✅ Confidence 0–5 model (0 = unchecked, 1–5 = checked in)
- ✅ Domain grouping in topic list (collapsible sections)
- ✅ Persistent notes on topics (shown inline)
- ✅ Past paper links ("Find past questions →" in check-in sheet)
- ✅ Weekly plan generation (auto + manual modes)
- ✅ Plan → Practice deep-link (auto-opens topic sheet)
- ✅ Plan settings (sessions/day, duration, auto/manual mode)
- ✅ Streak system (computeStreak, home screen display, 9pm nudge notification)
- ✅ Push notifications (plan reminders, streak nudges, generic reminders)
- ✅ PostHog analytics (posthog.ts, logEvent throughout app)
- ✅ RevenueCat wired (purchasesService.ts, PlusContext, PaywallScreen)
- ✅ Plus features gated (themes, 60/90-day plans, manual planning, Analytics)
- ✅ Theme system (ThemeContext, ThemeSelectorScreen, 5+ themes)
- ✅ Analytics screen (weekly trend chart, most improved topics, progress share)
- ✅ Progress report sharing (text export from AnalyticsScreen)
- ✅ Home screen widget variants (tile / list layouts, progress chart types)
- ✅ Walkthrough screens (3-page intro before login)
- ✅ App icon (confidence rising bars, dark background)
- ✅ App Store screenshots prepared
