# NailExams — Project Context for Claude

> Read this at the start of every session. Always fetch the latest code from the `develop` branch
> before making changes: `github.com/gurolerdogan/NailExams` (public repo).

---

## What this app is

A React Native (Expo) mobile app that helps GCSE/A-Level students track topic confidence and plan
weekly revision. Fully local — no backend, no sync, no server.

---

## Tech stack

- React Native + Expo (managed workflow)
- TypeScript (strict)
- React Navigation — bottom tabs + native stack
- AsyncStorage for all persistence (via custom storage wrappers)
- Firebase Auth (email/password only)
- No backend, no API calls, no external data

---

## Folder structure

```
src/
  screens/
    auth/             # LoginScreen, SignUpScreen
    onboarding/       # OnboardingExamLevelScreen, OnboardingSubjectsScreen, OnboardingConfirmScreen
    HomeScreen.tsx
    PracticeScreen.tsx
    PlanScreen.tsx
    PlanSettingsScreen.tsx
    EditSubjectsScreen.tsx
    SettingsScreen.tsx
    LogsScreen.tsx
  navigation/
    RootNavigator.tsx       # auth → onboarding → tabs routing
    AuthNavigator.tsx
    OnboardingNavigator.tsx
    TabNavigator.tsx        # bottom tabs: Home, Practice, Plan, Settings
    HomeNavigator.tsx       # Home stack (HomeMain only — Subjects route removed)
    SettingsNavigator.tsx   # Settings stack: SettingsHome, EditSubjects, PlanSettings, Logs
  services/
    auth/             # authService (Firebase signIn/signUp/signOut)
    storage/          # nailexamsStorage, planStorage, practiceStorage
    seed/             # preloadGcseTopics
    logging/          # logEvent
  types/
    models.ts         # UserProfile, Subject, Topic (confidence: 0|1|2|3|4|5)
    plan.ts           # WeeklyPlan, PlanSession
    practice.ts       # PracticeAttempt
  context/
    AuthContext.tsx
  data/
    gcseTopicCatalog.ts   # GCSE_SUBJECTS, GCSE_SUBJECT_PRESETS, GCSE_TOPIC_CATALOG
  components/
    PrimaryButton.tsx
    AuthInput.tsx
    LoadingScreen.tsx
    SubjectGrid.tsx       # legacy component, largely superseded by inline tile grids
  utils/
    id.ts             # uuid()
    time.ts           # now()
  hooks/
    useFirebaseError.ts
```

---

## Key types

```ts
// models.ts
Topic = {
  id, subjectId, name,
  confidence?: 0 | 1 | 2 | 3 | 4 | 5,  // 0 = never checked in (default)
  lastPracticedAt?: number,
  createdAt, updatedAt
}

// plan.ts
PlanSession = { id, date, subjectId, topicId, title, status: 'PLANNED'|'DONE', createdAt, updatedAt }
WeeklyPlan   = { id, weekStart, sessionsPerDay, sessions, createdAt, updatedAt }

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
│   └── ForgotPassword
├── OnboardingNavigator (logged in, onboarding not done)
│   ├── OnboardingExamLevel
│   ├── OnboardingSubjects  ← params: { examLevel }
│   └── OnboardingConfirm   ← params: { examLevel, subjectNames[] }
└── TabNavigator (logged in + onboarded)
    ├── Home  → HomeNavigator → HomeMain
    ├── Practice  ← params: { subjectId?, topicId? }
    ├── Plan
    └── Settings → SettingsNavigator → SettingsHome / EditSubjects / PlanSettings / Logs
```

---

## Core behaviours & rules

### Confidence levels
- Topics are seeded with `confidence: 0` (never checked in)
- `0` means "not touched yet" — no bars shown, "Not checked in" label, `–` pill
- `1–5` means checked in — bars, colour pill, last-practiced date shown
- First check-in sets `lastPracticedAt`; cycling never returns to `0`
- Practice sheet opens with `null` selection for unchecked topics (user must pick before saving)
- Practice sheet pre-selects existing confidence for previously checked-in topics

### Subject tile palette (used consistently across Home, Practice, EditSubjects, Onboarding)
```
Index 0:  bg #FAEEDA  text #633806
Index 1:  bg #FBEAF0  text #72243E
Index 2:  bg #E6F1FB  text #0C447C
Index 3:  bg #EEEDFE  text #3C3489
Index 4:  bg #EAF3DE  text #27500A
Index 5:  bg #E1F5EE  text #085041
Index 6:  bg #FEF9C3  text #854D0E
Index 7:  bg #F3E8FF  text #5B21B6
Index 8:  bg #FCEBEB  text #A32D2D
Index 9:  bg #E0F2FE  text #075985
Index 10: bg #F0FDF4  text #166534
Index 11: bg #FFF7ED  text #9A3412
```

### Confidence bar colours (index 0–4 = levels 1–5)
`['#E24B4A', '#EF9F27', '#FAC775', '#97C459', '#1D9E75']`

### Plan → Practice deep-link
`tabNav.navigate('Practice', { subjectId, topicId })` — PracticeScreen auto-opens the topic sheet

### Storage keys
- Subjects, topics, profile: via `nailexamsStorage`
- Plan: via `planStorage` (key `NE_PLAN_V1`)
- Plan settings: via `planStorage` (key `NE_PLAN_SETTINGS_V1`)
- Practice attempts: via `practiceStorage`
- Onboarding flag: via `nailexamsStorage`

---

## What's done vs. what's next

### ✅ Complete
- Firebase auth (login, signup, forgot password)
- Onboarding (3 screens: exam level → subjects tile grid → confirm)
- Home screen (subjects mode + study plan mode, pill switcher)
- Practice check-in (subject grid → topic list → confidence sheet)
- Topics: confidence `0–5`, unchecked state, "Not checked in" label
- Weekly plan generation (`generateWeeklyPlan`)
- Plan screen (calendar strip, session cards, mark done, clear plan)
- Plan → Practice deep-link (auto-opens topic sheet)
- Plan settings (sessions/day preference)
- Settings screen with nav to EditSubjects and PlanSettings
- EditSubjects screen (tile grid picker, custom subject add)
- Onboarding redesign (white screens, progress dots, tile grid)
- Login / SignUp redesign (wordmark, minimal form)
- Cleanup: removed TopicsScreen, ProgressScreen, ExamsScreen, orphan repos/types

### ⏳ Next — Phase 3
- **Plan screen improvements** (compact week strip, stats row, "Start →" button per session)
- **Tab bar icons** (no icons currently on bottom tabs)
- **Empty states** (no-subjects, no-plan, no-check-ins friendly UI)
- **Storage integrity** — verify `wipeAll` covers all keys incl. `NE_PLAN_SETTINGS_V1`
- **App Store prep** — icons, splash, metadata, privacy policy, TestFlight

---

## Important conventions

- Always read the relevant file from `develop` branch before editing
- Never guess file contents — fetch first
- All new screens use `SafeAreaView` + `StyleSheet.create` (no styled-components)
- Background colour for main screens: `#F2F2F7` (iOS system grouped background)
- Background for auth/onboarding screens: `#FFFFFF`
- Primary action button: `backgroundColor: '#1C1C1E'`, `borderRadius: 16`, `paddingVertical: 15+`
- No class components — functional only with hooks
- `SubjectGrid.tsx` component is legacy; prefer inline tile grids with the palette above
