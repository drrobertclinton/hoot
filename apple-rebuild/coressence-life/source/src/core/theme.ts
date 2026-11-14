// Coressence visual identity, 1.2: the course workbook at the shore. Deep ocean blue and teal from the wave logo
// stay as the brand; warm paper and sand carry the course pages; a serif display face (Fraunces) sets headings like
// a book, Outfit sets numbers and small capitals, Inter sets reading text. Shapes are squarer, with tide lines.
import { useColorScheme } from 'react-native';
import { useSettings } from './settings';

export interface Palette {
  dark: boolean;
  bg: string;
  surface: string;
  surface2: string;
  ink: string;
  inkSoft: string;
  muted: string;
  line: string;
  accent: string;
  teal: string;
  accentSoft: string;
  onAccent: string;
  hero: [string, string];
  danger: string;
  dangerSoft: string;
  warn: string;
  warnSoft: string;
  ok: string;
  okSoft: string;
  /** Warm page color for course material and the experiment journal. */
  paper: string;
  paperLine: string;
  /** Shore accent: used sparingly, for the course and for "keep". */
  sand: string;
  sandSoft: string;
  /** Deepest water: the loop hero. */
  deep: string;
  foam: string;
  /** One color for each of the five pillars of the method. */
  pillar: { sleep: string; move: string; fuel: string; recover: string; restore: string };
}

export const LIGHT: Palette = {
  dark: false,
  bg: '#F2F6F7',
  surface: '#FFFFFF',
  surface2: '#E7EFF3',
  ink: '#0B2A3C',
  inkSoft: '#36505F',
  muted: '#647B89',
  line: '#D7E3E9',
  accent: '#0E5C7E',
  teal: '#11928F',
  accentSoft: '#DDEEF4',
  onAccent: '#FFFFFF',
  hero: ['#0E4A6B', '#14A3A0'],
  danger: '#B4382F',
  dangerSoft: '#F8E5E3',
  warn: '#7A5300',
  warnSoft: '#FFF2D6',
  ok: '#0F7B5F',
  okSoft: '#DDF3EA',
  paper: '#FBF6EC',
  paperLine: '#EADFC8',
  sand: '#A9762B',
  sandSoft: '#F5E9D2',
  deep: '#06202F',
  foam: '#9FE3DC',
  pillar: { sleep: '#4B5FD6', move: '#0FA37F', fuel: '#DE8F1F', recover: '#1F96CC', restore: '#6E5BB4' },
};

export const DARK: Palette = {
  dark: true,
  bg: '#071A26',
  surface: '#0D2433',
  surface2: '#143042',
  ink: '#E8F1F5',
  inkSoft: '#BACCD6',
  muted: '#88A2B0',
  line: '#1F3D4E',
  accent: '#5CC6D8',
  teal: '#4FD1C5',
  accentSoft: '#123A4B',
  onAccent: '#04161F',
  hero: ['#0B3A55', '#0F7C7A'],
  danger: '#FF7A6E',
  dangerSoft: '#3A1D1A',
  warn: '#F2C66B',
  warnSoft: '#30270F',
  ok: '#5ED3AE',
  okSoft: '#123A30',
  paper: '#12293A',
  paperLine: '#244356',
  sand: '#E2BB7C',
  sandSoft: '#33290F',
  deep: '#04131C',
  foam: '#9FE3DC',
  pillar: { sleep: '#7F90F0', move: '#3DD6A8', fuel: '#F2AE4A', recover: '#55BDEB', restore: '#9D8BE0' },
};

export const FONTS = {
  /** Headings: Fraunces, a soft serif, so course pages read like the book they come from. */
  display: 'Fraunces_600SemiBold',
  displayBold: 'Fraunces_700Bold',
  displayMedium: 'Fraunces_500Medium',
  italic: 'Fraunces_400Regular_Italic',
  /** Numbers and small capitals: Outfit. */
  num: 'Outfit_600SemiBold',
  numLight: 'Outfit_300Light',
  caps: 'Outfit_600SemiBold',
  /** Reading text: Inter. */
  body: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
};

/** Corner radii: squarer than before, one family across cards, buttons and the dock. */
export const RADIUS = { card: 16, button: 14, chip: 10, hero: 28 };

export function useTheme(): Palette {
  const scheme = useColorScheme();
  const appearance = useSettings((s) => s.appearance);
  const dark = appearance === 'dark' || (appearance === 'system' && scheme === 'dark');
  return dark ? DARK : LIGHT;
}

/** Accent color for each module. */
export function moduleColor(c: Palette, id: string): string {
  const fixed: Record<string, string> = {
    sleep: c.pillar.sleep,
    move: c.pillar.move,
    fuel: c.pillar.fuel,
    recover: c.pillar.recover,
    restore: c.pillar.restore,
    measure: c.accent,
    devices: c.dark ? '#6FB6DA' : '#2F7FA8',
    monitor: c.dark ? '#EC7FAA' : '#C2477A',
    track: c.teal,
    rehearse: c.dark ? '#F08A66' : '#B9532F',
    coach: c.accent,
    plan: c.teal,
    education: c.dark ? '#7FB4F5' : '#2B5FA8',
    labs: c.dark ? '#F07D93' : '#B23A55',
    md: c.accent,
    shop: c.dark ? '#D9B37A' : '#8A6430',
    experiment: c.sand,
    performer: c.dark ? '#F08A66' : '#B9532F',
    cycle: c.teal,
  };
  return fixed[id] ?? c.accent;
}
