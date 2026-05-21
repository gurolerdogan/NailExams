# NailExams — Active Tasks

> Read CLAUDE.md first for project architecture and conventions.

---

## Blocking — must ship before release

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

### 7. Revert dev streak override
- `src/screens/HomeScreen.tsx` line ~309: `return __DEV__ ? Math.max(real, 5) : real;`
- Remove after App Store screenshots are taken

---

## Done ✓

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
