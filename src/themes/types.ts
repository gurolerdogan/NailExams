export type ThemeColors = {
  // Backgrounds
  screenBg: string;
  cardBg: string;
  cardBorder: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // Accent / interactive
  accent: string;
  accentSecondary: string;

  // Primary button
  buttonPrimaryBg: string;
  buttonPrimaryText: string;

  // Tab bar
  tabBarBg: string;
  tabBarBorderTop: string;
  tabBarActiveTint: string;
  tabBarInactiveTint: string;

  // Input fields
  inputBg: string;
  inputBorder: string;
  inputText: string;

  // Profile / header card (dark card on Home + Settings)
  profileCardBg: string;
  profileCardText: string;
  profileCardMeta: string;
  profileBadgeBg: string;
  profileBadgeText: string;

  // Navigation headers
  headerBg: string;
  headerText: string;
  headerBorderBottom: string;
  headerBackBg: string;
  headerBackIcon: string;

  // Misc
  sectionLabel: string;
  divider: string;
  pillSwitcherBg: string;
  pillActiveBg: string;
  pillActiveText: string;
  pillInactiveText: string;
};

export type ThemeFonts = {
  heading: string | undefined;
  body: string | undefined;
  headingWeight: '400' | '500' | '600' | '700' | '800' | '900';
  bodyWeight: '400' | '500' | '600' | '700';
  letterSpacingHeading: number;
};

export type ThemeRadii = {
  card: number;
  button: number;
  input: number;
  tile: number;
  pill: number;
};

// ─── Subject panel display options ───────────────────────────────────────────

/** How subjects are arranged on the Home screen */
export type SubjectPanelType = 'tile' | 'list';

/** How subject progress (confidence distribution) is visualised */
export type ProgressChartType = 'barchart' | 'progressline' | 'colordots';

/** How the checked-in count is displayed */
export type CheckedInType = 'CtoT' | 'Percent';

export type Theme = {
  id: string;
  name: string;
  description: string;
  dark: boolean;
  colors: ThemeColors;
  fonts: ThemeFonts;
  radii: ThemeRadii;
  // Preview swatches shown in the Theme Selector
  previewSwatches: string[];
  // Home screen subject display
  subjectPanel: SubjectPanelType;
  progressChart: ProgressChartType;
  checkedIn: CheckedInType;
};
