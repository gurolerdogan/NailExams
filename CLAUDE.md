# NailExams — Project Context for Claude

## What this app is
A React Native (Expo) mobile app that helps GCSE students track topic confidence and plan their revision week by week.

## Tech stack
- React Native + Expo
- TypeScript
- React Navigation (bottom tabs + native stack)
- AsyncStorage for local persistence
- No backend — fully local MVP

## Folder structure
src/
  screens/        # All screens (PracticeScreen, PlanScreen, etc.)
  navigation/     # Navigators (TabNavigator, HomeNavigator, SettingsNavigator, etc.)
  services/
    storage/      # AsyncStorage wrappers (planStorage, practiceStorage, nailexamsStorage)
    plan/         # generateWeeklyPlan
    logging/      # logEvent
  types/          # TypeScript types (models.ts, plan.ts, practice.ts)
  context/        # AuthContext
  utils/          # uuid, time helpers
  data/           # gcseTopicCatalog

## Key types
- Subject: { id, name, subjectId, examLevel }
- Topic: { id, subjectId, name, confidence, lastPracticedAt }
- PlanSession: { id, date, subjectId, topicId, title, status, createdAt, updatedAt }
- WeeklyPlan: { id, weekStart, sessionsPerDay, sessions, createdAt, updatedAt }
- PracticeAttempt: { id, subjectId, topicId, ts, confidence, note? }

## Current state (update this as you build)
- Onboarding: ✅ complete
- Practice check-in: ✅ complete  
- Weekly plan generation: ✅ complete
- Plan → Practice deep-link: ✅ complete
- Progress screen: ⏳ in progress
- Plan settings: ✅ complete