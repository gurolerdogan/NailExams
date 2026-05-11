// Single source of truth for the subject tile colour palette.
// All screens must import from here — never define it inline.
export const TILE_PALETTE = [
  { bg: '#FAEEDA', text: '#633806' },  // 0
  { bg: '#FBEAF0', text: '#72243E' },  // 1
  { bg: '#E6F1FB', text: '#0C447C' },  // 2
  { bg: '#EEEDFE', text: '#3C3489' },  // 3
  { bg: '#EAF3DE', text: '#27500A' },  // 4
  { bg: '#E1F5EE', text: '#085041' },  // 5
  { bg: '#FEF9C3', text: '#854D0E' },  // 6
  { bg: '#F3E8FF', text: '#5B21B6' },  // 7
  { bg: '#FCEBEB', text: '#A32D2D' },  // 8
  { bg: '#E0F2FE', text: '#075985' },  // 9
  { bg: '#F0FDF4', text: '#166534' },  // 10
  { bg: '#FFF7ED', text: '#9A3412' },  // 11
] as const;
