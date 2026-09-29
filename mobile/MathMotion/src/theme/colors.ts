// The palette is assembled from three user choices (Settings → Appearance):
// light/dark mode, an accent color and a text color. Every screen reads
// colors through useColors()/makeStyles() (src/theme/useColors.ts), never
// hardcoded hex values, so a change here repaints the whole app.

export type ColorScheme = 'light' | 'dark';
export type ThemeMode = 'system' | ColorScheme;
export type AccentId =
  | 'indigo'
  | 'lime'
  | 'blue'
  | 'teal'
  | 'violet'
  | 'rose'
  | 'orange';
export type TextToneId = 'default' | 'black' | 'navy' | 'brown' | 'green';

const base = {
  light: {
    background: '#F7F8FC',
    surface: '#FFFFFF',
    surfaceMuted: '#EEF0F8',
    border: '#E2E5F1',
    textInverse: '#FFFFFF',
    success: '#1E9E6B',
    successMuted: '#DCF5EA',
    danger: '#E0435B',
    dangerMuted: '#FBE2E6',
    warning: '#C9821B',
    warningMuted: '#FBEEDA',
    overlay: 'rgba(27, 29, 41, 0.4)',
  },
  dark: {
    background: '#12131A',
    surface: '#1C1E28',
    surfaceMuted: '#262938',
    border: '#2F3344',
    textInverse: '#FFFFFF',
    success: '#3CC48C',
    successMuted: '#173A2C',
    danger: '#F2657A',
    dangerMuted: '#3F1D25',
    warning: '#E0A445',
    warningMuted: '#3B2D17',
    overlay: 'rgba(0, 0, 0, 0.6)',
  },
};

interface AccentShades {
  primary: string;
  primaryPressed: string;
  primaryMuted: string;
  // Text/icons drawn ON a primary fill (buttons, active chips). White
  // unless the accent is too light for it — lime needs dark text.
  onPrimary?: string;
  // The accent used AS text/icon color on surfaces (links, labels,
  // spinners). Same as primary unless primary is too light to read.
  primaryText?: string;
  // Optional tint for the neutral surfaces, so the whole screen matches
  // the accent (lime's design uses faintly green backgrounds/borders).
  neutrals?: Partial<Record<'background' | 'surfaceMuted' | 'border', string>>;
}

// Dark accents carry white text; dark-mode shades are lifted to stay
// visible on the dark surfaces. Lime (from the Stitch "MathMotion AI
// Study System" design) is light, so it sets onPrimary/primaryText.
export const ACCENTS: Record<AccentId, Record<ColorScheme, AccentShades>> = {
  indigo: {
    light: {
      primary: '#4A5CF0',
      primaryPressed: '#3A49D6',
      primaryMuted: '#E4E7FD',
    },
    dark: {
      primary: '#6E7EFF',
      primaryPressed: '#5A6BF0',
      primaryMuted: '#262B52',
    },
  },
  lime: {
    light: {
      primary: '#A3E635',
      primaryPressed: '#8CCF1F',
      primaryMuted: '#ECFCCB',
      onPrimary: '#111827',
      primaryText: '#446900',
      neutrals: { background: '#F7FAF7', surfaceMuted: '#F2F7F1', border: '#E1EDE0' },
    },
    dark: {
      primary: '#A3E635',
      primaryPressed: '#8CCF1F',
      primaryMuted: '#26330F',
      onPrimary: '#111827',
      primaryText: '#B5F05A',
    },
  },
  blue: {
    light: {
      primary: '#1976D2',
      primaryPressed: '#1565C0',
      primaryMuted: '#DDEEFC',
    },
    dark: {
      primary: '#3C95E6',
      primaryPressed: '#2A82D4',
      primaryMuted: '#1C3247',
    },
  },
  teal: {
    light: {
      primary: '#0E8577',
      primaryPressed: '#0B7065',
      primaryMuted: '#D5F3EF',
    },
    dark: {
      primary: '#1FA898',
      primaryPressed: '#178F81',
      primaryMuted: '#173A37',
    },
  },
  violet: {
    light: {
      primary: '#7445F0',
      primaryPressed: '#6236DB',
      primaryMuted: '#ECE4FF',
    },
    dark: {
      primary: '#8F68FF',
      primaryPressed: '#7C53F5',
      primaryMuted: '#30264F',
    },
  },
  rose: {
    light: {
      primary: '#D63A71',
      primaryPressed: '#BD2E60',
      primaryMuted: '#FCE3EC',
    },
    dark: {
      primary: '#E5588A',
      primaryPressed: '#D24477',
      primaryMuted: '#45212F',
    },
  },
  orange: {
    light: {
      primary: '#D9620B',
      primaryPressed: '#BF5509',
      primaryMuted: '#FDEBD9',
    },
    dark: {
      primary: '#E57A1E',
      primaryPressed: '#CF6912',
      primaryMuted: '#43301C',
    },
  },
};

interface TextShades {
  textPrimary: string;
  textSecondary: string;
}

export const TEXT_TONES: Record<TextToneId, Record<ColorScheme, TextShades>> = {
  default: {
    light: { textPrimary: '#1B1D29', textSecondary: '#5C6079' },
    dark: { textPrimary: '#ECEEF6', textSecondary: '#A3A8BF' },
  },
  black: {
    light: { textPrimary: '#000000', textSecondary: '#3F4254' },
    dark: { textPrimary: '#FFFFFF', textSecondary: '#C4C8D8' },
  },
  navy: {
    light: { textPrimary: '#1A2B5C', textSecondary: '#4F5F8A' },
    dark: { textPrimary: '#DCE5FF', textSecondary: '#9DAAD0' },
  },
  brown: {
    light: { textPrimary: '#3B2A1E', textSecondary: '#7A6555' },
    dark: { textPrimary: '#F3E6D8', textSecondary: '#BFAE9C' },
  },
  green: {
    light: { textPrimary: '#173B2F', textSecondary: '#52705F' },
    dark: { textPrimary: '#DDF3E8', textSecondary: '#9EC2B0' },
  },
};

export const ACCENT_IDS = Object.keys(ACCENTS) as AccentId[];
export const TEXT_TONE_IDS = Object.keys(TEXT_TONES) as TextToneId[];

export type AppColors = typeof base.light &
  Required<Omit<AccentShades, 'neutrals'>> &
  TextShades & {
    scheme: ColorScheme;
  };

// Cached per combination so the same choice always yields the same object
// — makeStyles() keys its stylesheet cache on that identity.
const cache = new Map<string, AppColors>();

export function buildColors(
  scheme: ColorScheme,
  accent: AccentId,
  textTone: TextToneId,
): AppColors {
  const key = `${scheme}:${accent}:${textTone}`;
  let colors = cache.get(key);
  if (!colors) {
    const { neutrals, ...shades } = (ACCENTS[accent] ?? ACCENTS.indigo)[scheme];
    colors = {
      scheme,
      ...base[scheme],
      ...neutrals,
      ...shades,
      onPrimary: shades.onPrimary ?? '#FFFFFF',
      primaryText: shades.primaryText ?? shades.primary,
      ...(TEXT_TONES[textTone] ?? TEXT_TONES.default)[scheme],
    };
    cache.set(key, colors);
  }
  return colors;
}
