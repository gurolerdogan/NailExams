/**
 * Push notification copy — edit freely.
 *
 * PLAN_REMINDERS  → sent when the user has a plan with unchecked topics today.
 *   Use {count} for the number of unchecked topics.
 *   Use {s} for the plural suffix ("" or "s").
 *
 * GENERIC_REMINDERS → sent when there is no plan set up, or all today's
 *   topics are already checked in.
 */

export type NotificationMessage = {
  title: string;
  body: string;
};

export const PLAN_REMINDERS: NotificationMessage[] = [
  {
    title: 'NailExams 📚',
    body: "You've got {count} topic{s} to check in on today. Future you says thanks!",
  },
  {
    title: 'NailExams ⚡',
    body: '{count} topic{s} on today\'s plan — a quick confidence rating keeps the streak alive.',
  },
  {
    title: 'NailExams 🎯',
    body: "Those {count} topic{s} won't revise themselves… you've totally got this.",
  },
  {
    title: 'NailExams 🧠',
    body: 'Check-in time! {count} topic{s} waiting for your honest self-assessment today.',
  },
  {
    title: 'NailExams 🏆',
    body: '{count} topic{s} on the list. Top of the class incoming — go check in!',
  },
];

/**
 * STREAK_NUDGES → sent at 9 pm when the user has an active streak but hasn't
 * checked in yet today. Use {count} for the streak length, {s} for plural suffix.
 */
export const STREAK_NUDGES: NotificationMessage[] = [
  {
    title: 'Don\'t break your streak! 🔥',
    body: 'You\'re on a {count}-day streak. One quick check-in keeps it alive.',
  },
  {
    title: '{count} days strong 🔥',
    body: 'Your streak ends at midnight — check in before you sleep!',
  },
  {
    title: 'Streak at risk 🔥',
    body: '{count} days in a row. Open NailExams before 12 am to keep it going.',
  },
  {
    title: 'Almost there 🔥',
    body: 'A {count}-day streak is worth protecting. 30 seconds is all it takes.',
  },
];

export const GENERIC_REMINDERS: NotificationMessage[] = [
  {
    title: 'NailExams 📅',
    body: 'Build a study plan and start tracking your confidence — takes about 2 minutes!',
  },
  {
    title: 'NailExams 🚀',
    body: 'Exam season is always closer than you think. Ready to plan your revision?',
  },
  {
    title: 'NailExams 💡',
    body: 'Top tip: students who track confidence revise smarter, not harder.',
  },
  {
    title: 'NailExams 📝',
    body: 'Set up your study plan and know exactly which topics to hit next.',
  },
  {
    title: 'NailExams ⏰',
    body: 'A few minutes of checking in now = a lot less panic later. Open NailExams!',
  },
];
