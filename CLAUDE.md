# NailExams — Project Context for Claude

> Read this at the start of every session. Always read current file contents before editing.
> Repo: `github.com/gurolerdogan/NailExams` (public) · active branch: `develop` · **current version: 1.6.0**

---

## What this app is

A React Native (Expo) mobile app that helps GCSE/A-Level students track topic confidence and plan
weekly revision. Fully local storage — no backend, no sync, no server.

---

## Tech stack

- React Native + Expo SDK 54 (managed workflow, dev client builds via EAS)
- TypeScript (strict)
- React Navigation v7 — bottom tabs + native stack
- AsyncStorage for all persistence (via custom storage wrappers)
- Firebase Auth (email/password, Google Sign-In, Apple Sign-In)
- PostHog analytics (`posthog-react-native`, US region `us.i.posthog.com`)
- RevenueCat (`react-native-purchases` v10) — iOS key configured, Android key placeholder
- `@react-native-community/datetimepicker` — native time picker for notification settings
- `react-native-view-shot` — branded image card export in AnalyticsScreen
- `expo-store-review` — in-app review prompt
- `expo-notifications` — local push notifications (DAILY + DATE triggers)

---

## Folder structure

```
src/
  screens/
    auth/             # LoginScreen, SignUpScreen, ForgotPasswordScreen, PasswordResetConfirmationScreen
    onboarding/       # OnboardingExamLevelScreen, OnboardingSubjectsScreen, OnboardingConfirmScreen
    HomeScreen.tsx
    PracticeScreen.tsx
    PlanScreen.tsx
    PlanSettingsScreen.tsx
    EditSubjectsScreen.tsx
    SettingsScreen.tsx
    LogsScreen.tsx
    AnalyticsScreen.tsx
    PaywallScreen.tsx
    ChoosePlanScreen.tsx
    ThemeSelectorScreen.tsx
    ExamDatesScreen.tsx
  navigation/
    RootNavigator.tsx
    AuthNavigator.tsx
    OnboardingNavigator.tsx
    TabNavigator.tsx        # Home, Practice, Plan, Settings tabs
    HomeNavigator.tsx
    SettingsNavigator.tsx   # SettingsHome, EditSubjects, PlanSettings, ThemeSelector,
                            # Paywall, ChoosePlan, Analytics, ExamDates, Logs
  services/
    auth/             # authService (Firebase + Google + Apple sign-in/up/out)
    analytics/        # posthog.ts — PostHog singleton, capture(), identifyUser()
    notifications/    # notificationService.ts — mandatory 6pm DAILY, extra DAILY, streak nudge, weekly summary
    purchases/        # purchasesService.ts — RevenueCat configure/offerings/purchase/restore
    storage/          # nailexamsStorage, planStorage, practiceStorage,
                      # notificationStorage, keys.ts
                      # weeklyGoalStorage.ts — DEPRECATED, key still in keys.ts but value no longer used
    plan/             # generateWeeklyPlan.ts — spaced-repetition priority scoring
    logging/          # logEvent.ts — local log + PostHog forward
    seed/             # preloadGcseTopics.ts (also handles A-Level)
  context/
    AuthContext.tsx
    ThemeContext.tsx
    PlusContext.tsx   # isPlus, FREE_SUBJECT_LIMIT_GCSE=3, FREE_SUBJECT_LIMIT_ALEVEL=1,
                      # MAX_SUBJECTS_GCSE=15, MAX_SUBJECTS_ALEVEL=5, WARN_SUBJECTS_GCSE=12
                      # PLUS_GATE_BYPASS = true in Expo Go (Constants.appOwnership === 'expo')
  data/
    gcseTopicCatalog.ts   # 61 GCSE subjects (AQA/Edexcel/OCR), 1200+ topics
                          # 74 A-Level subjects (AQA/Edexcel/OCR), 1600+ topics
                          # exports: GCSE_SUBJECT_GROUPS, ALEVEL_SUBJECT_GROUPS
    pastPaperLinks.ts     # subject name → official past paper URL (AQA/Edexcel/OCR)
  components/
    PrimaryButton.tsx
    AuthInput.tsx
    LoadingScreen.tsx
    EmptyState.tsx
  utils/
    id.ts             # uuid()
    time.ts           # now()
    streak.ts         # computeStreak(sessions) — shared by HomeScreen + PlanScreen
    reviewPrompt.ts   # maybePromptOnStreak(streak), maybePromptOnNailedIt(conf, total)
    catalog.ts        # getTopicWeight(name) → 1|2|3, getEstimatedMinutes(name) → number
    fastLane.ts       # computeFastLane(), getActiveFastLaneIds() — detects stuck topics
    balance.ts        # computeBalanceWarning() — neglected/skewed subject detection
    sessionTimer.ts   # useSessionTimer(durationSeconds) hook + formatTime()
                      # NOTE: SessionScreen does NOT use useSessionTimer — it has its own
                      # fully-inlined timer (see Session screen section below)
    intentionPlaceholders.ts  # getIntentionPlaceholder(topicName) → string
  notifications/
    messages.ts           # PLAN_REMINDERS, GENERIC_REMINDERS, STREAK_NUDGES, WEEKLY_SUMMARY
    revisionTips.ts       # getTipForSession(confidence, isFastLane, topicId) → string
  types/
    badges.ts         # BadgeId union, BadgeTier, BadgeDefinition, BADGE_CATALOG, BADGE_BY_ID
  services/
    badges/
      badgeService.ts # computeEarnedBadges(), checkForNewBadges(), markBadgesSeen(), markProgressShared()
  components/
    share/
      shareCard.ts          # shared ViewShot + Share.share() helper
      TopicNailedCard.tsx   # confidence-5 branded share card
      SubjectClearedCard.tsx# subject cleared branded share card
      BadgeUnlockCard.tsx   # badge unlock branded share card
  themes/
    index.ts          # THEME_REGISTRY: [default, softFocus, teenEnergy(Neon), darkTerminal]
    default.ts / softFocus.ts / teenEnergy.ts / darkTerminal.ts / types.ts
  constants/
    palette.ts        # TILE_PALETTE (12 entries)
```

---

## Key types

```ts
// models.ts
ExamDate = { subjectId: string; date: string }  // ISO date
UserProfile = { examLevel, examDates?: ExamDate[], createdAt, updatedAt, ... }
Topic = { id, subjectId, name, confidence?: 0|1|2|3|4|5, lastPracticedAt?, createdAt, updatedAt }

// plan.ts
PlanConfig   = { durationDays: 30|60|90, subjectIds, topicsPerDay: 1|2|3|4, topicOrder, studyDays: number[] }
               // studyDays: Mon=0 … Sun=6, default [0,1,2,3,4] (Mon–Fri)
               // generatePlan() also accepts: attempts?, examDates? for fast-lane + pressure mode
PlanSession = { id, date, subjectId, topicId, title, status: 'PLANNED'|'DONE', createdAt, updatedAt }
WeeklyPlan   = { id, weekStart, sessionsPerDay, sessions, createdAt, updatedAt, ... }

// practice.ts
PracticeAttempt = { id, subjectId, topicId, ts, confidence: 1|2|3|4|5, note? }
```

---

## Navigation map

```
RootNavigator
├── AuthNavigator (not logged in)
│   ├── Login
│   ├── SignUp
│   ├── ForgotPassword
│   └── PasswordResetConfirmation
├── OnboardingNavigator (logged in, onboarding not done) — 3 steps
│   ├── OnboardingExamLevel   ← step 1: app icon + exam level cards with subject/topic counts
│   ├── OnboardingSubjects    ← step 2: grouped by provider (AQA/Edexcel/OCR), collapsible
│   └── OnboardingConfirm     ← step 3: completes onboarding, calls setOnboardingDone + refreshOnboarding
└── TabNavigator (logged in + onboarded)
    ├── Home  → HomeNavigator → HomeMain
    ├── Practice  ← params: { subjectId?, topicId?, returnTo?: 'Plan'|'Home' }
    ├── Plan
    └── Settings → SettingsNavigator
        ├── SettingsHome (headerShown: false)
        ├── EditSubjects
        ├── PlanSettings
        ├── ThemeSelector
        ├── Paywall
        ├── ChoosePlan
        ├── Analytics
        ├── ExamDates
        └── Logs
```

**Tab press behaviour:**
- **Settings** tab always resets to SettingsHome via `tabPress` listener (`e.preventDefault()` + `navigate('Settings', { screen: 'SettingsHome' })`). Back button uses `canGoBack()` guard — navigates to SettingsHome if stack has no history.
- **Practice** tab always resets to PracticeHome via `tabPress` listener (same pattern — prevents landing on a stale Session screen).
- Tab bar is hidden on the Session screen via `getFocusedRouteNameFromRoute(route) === 'Session'`.

---

## Core behaviours & rules

### Confidence levels
- Topics seeded with `confidence: 0` (never checked in)
- `0` = not touched — no bars, "Not checked in" label
- `1–5` = checked in — bars, colour pill, last-practiced date shown in sheet
- Practice sheet shows `lastPracticedAt` date (italic muted text) when previously checked in
- Practice sheet pre-selects existing confidence; `null` for unchecked (user must pick before saving)
- After check-in: celebration overlay fires for every confidence level (level-specific emoji, message, holdMs)
  - Levels 1–2: "Need more help? Find past questions →" link shown if past paper URL exists
  - Navigation back to `returnTo` tab fires AFTER celebration animation completes (via onComplete callback)

### Subject limits by plan
- GCSE free: 3 subjects · Plus: up to 15 (warning at 12)
- A-Level free: 1 subject · Plus: up to 5
- Hard cap enforced in both `OnboardingSubjectsScreen` and `EditSubjectsScreen`

### Onboarding subject picker
- GCSE: grouped by AQA / Edexcel / OCR, collapsible sections with selected-count badges
- A-Level: same grouped layout (ALEVEL_SUBJECT_GROUPS)
- No custom subject input (removed)

### Subject tile palette
```
Index 0:  bg #FAEEDA  text #633806    Index 6:  bg #FEF9C3  text #854D0E
Index 1:  bg #FBEAF0  text #72243E    Index 7:  bg #F3E8FF  text #5B21B6
Index 2:  bg #E6F1FB  text #0C447C    Index 8:  bg #FCEBEB  text #A32D2D
Index 3:  bg #EEEDFE  text #3C3489    Index 9:  bg #E0F2FE  text #075985
Index 4:  bg #EAF3DE  text #27500A    Index 10: bg #F0FDF4  text #166534
Index 5:  bg #E1F5EE  text #085041    Index 11: bg #FFF7ED  text #9A3412
```

### Confidence bar colours (levels 1–5)
`['#E24B4A', '#EF9F27', '#FAC775', '#97C459', '#1D9E75']`

### Plan → Practice deep-link
- `tabNav.navigate('Practice', { subjectId, topicId, returnTo: 'Plan'|'Home' })`
- `returnTo` navigation only fires when `openedFromPlanRef.current === true` (set by auto-open effect, cleared by manual openSheet)

### Storage keys (`src/services/storage/keys.ts`)
```
NE_PROFILE_V1       NE_SUBJECTS_V1      NE_TOPICS_V1
NE_ONBOARDING_DONE  NE_STORAGE_VERSION  NE_LOGS_V1
NE_ATTEMPTS_V1      NE_PLAN_V1          NE_PLAN_SETTINGS_V1
NE_NOTIF_SETTINGS_V1   NE_REVIEW_PROMPTED   NE_WEEKLY_GOAL_V1 (deprecated — no longer written)
NE_BADGES_SEEN_V1   NE_PROGRESS_SHARED
```

`NE_PLAN_SETTINGS_V1` stores `PlanConfig` including `studyDays`. Weekly goal is derived at runtime as `topicsPerDay × studyDays.length` — not stored separately.

### Notifications
- **Mandatory 6pm**: `DAILY` trigger, always on, plan-aware content
- **Extra reminder**: `DAILY` trigger, user-chosen time, native `DateTimePicker` spinner (minuteInterval=5 iOS)
- **Streak nudge**: one-shot `DATE` trigger at 9pm when streak > 0
- **Weekly summary**: one-shot `DATE` trigger, next Sunday 8pm
- All use `SchedulableTriggerInputTypes` enum (no `as any` casts)

### Themes (THEME_REGISTRY order)
1. `default` — free, always available
2. `soft-focus` — Plus only
3. `teen-energy` (display name: "Neon") — Plus only
4. `dark-terminal` — Plus only

### Admin accounts
`SettingsScreen.tsx` has `ADMIN_EMAILS = new Set(['gurolerdogan@gmail.com'])`.
Admin users see "View logs" row in the Account section.

### Session screen timer (critical — do not rewrite without reading this)
`SessionScreen.tsx` has a fully **inlined** timer — it does NOT use `useSessionTimer`. This was
necessary because React 19.1 + React Native 0.81 + Fabric defers `setState` calls from
`setInterval` and never flushes them to the screen while the app is idle in the foreground.

**Architecture:**
- `timerAnim` — a single `Animated.Value` counting from `durationSeconds` to `0`.  
  Started with `Animated.timing(..., { easing: Easing.linear, useNativeDriver: true })`.  
  Runs entirely on the UI thread; JS is not involved after `.start()`.
- `digitYs` — four derived animated values (M-tens, M-ones, S-tens, S-ones), each computed
  via `Animated.modulo / .divide / .subtract / .add / .interpolate` from `timerAnim`.  
  Each column holds a stable digit for its full period and rolls for exactly 1 second *after*
  the ones-column wraps (mechanical odometer style). All native-driver-compatible.
- `colonAnim` — `Animated.loop` on opacity, also native driver, for the blinking colon.
- `setInterval` (1 s) — only needed to detect `remaining <= 0` and call `setPhase('checkin')`.
  All visual display is driven by the native animation, not the interval.
- `AppState` listener — when app returns from background, stops the native animation and
  restarts it from the wall-clock-accurate remaining time (`currentRemaining.current`).
- Pause/resume: `timerAnimComp.current.stop()` freezes the native animation; `startTickFrom`
  restarts it with `Animated.timing(timerAnim, { toValue: 0, duration: remaining*1000 })`.

**Why this is hard:**  
Seven other approaches were tried (useState, RAF, Animated.Value+interval, setNativeProps,
useSyncExternalStore, Animated.timing duration:0, Animated.timing duration:200) — all failed
because Fabric only flushes JS-originated commits when a native event (touch, AppState) arrives.
The single long-running native animation is the only mechanism that bypasses this entirely.

---

## Plus features gated (`PlusContext.usePlus()`)

| Feature | Free | Plus |
|---|---|---|
| GCSE subjects | 3 | up to 15 |
| A-Level subjects | 1 | up to 5 |
| Plan duration | 30 days | 30 / 60 / 90 days |
| Manual planning | ✗ | ✓ |
| Themes | Default only | All 4 |
| Analytics screen | ✗ | ✓ |
| Progress image share | ✗ | ✓ |

`PLUS_GATE_BYPASS = Constants.appOwnership === 'expo'` — Expo Go always gets Plus for testing.
`isRevenueCatConfigured()` returns false in Expo Go (no RC native module).

---

## Important conventions

- Read file before editing — never guess contents
- All screens: `StyleSheet.create`, functional components with hooks
- Main screen background: `theme.colors.screenBg` (from ThemeContext)
- Auth/onboarding: `#FFFFFF`
- Primary button: `backgroundColor: theme.colors.buttonPrimaryBg`, `borderRadius: theme.radii.button`, `paddingVertical: 15+`
- No class components. No styled-components.
- `SubjectGrid.tsx` is legacy — use inline tile grids with TILE_PALETTE
- Privacy policy URL: `https://gurolerdogan.github.io/NailExams/privacy`
- Terms of Use URL: `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`
