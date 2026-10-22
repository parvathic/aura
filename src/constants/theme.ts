// Aura Design System — extracted from wireframe Tailwind config
// "The Ethereal Curator" — Quiet Luxury editorial aesthetic

export const colors = {
  // Primary palette
  secondary: '#7345B6',        // Purple accent — CTAs, active states, primary actions
  primaryContainer: '#B48A8F', // Dusty pink — period indicators, warm accents
  primary: '#795559',          // Muted rose

  // Surfaces (paper layering system — no borders, only tonal shifts)
  background: '#FFF8F7',
  surface: '#FFF8F7',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#FBF2F1',
  surfaceContainer: '#F5ECEC',
  surfaceContainerHigh: '#EFE6E6',
  surfaceContainerHighest: '#E9E0E0',
  surfaceDim: '#E0D8D8',

  // Text / on-surface
  onSurface: '#1E1B1B',
  onSurfaceVariant: '#504445',
  onPrimary: '#FFFFFF',
  onSecondary: '#FFFFFF',
  onPrimaryContainer: '#422529',
  onSecondaryContainer: '#4A148C',

  // Secondary containers
  secondaryContainer: '#B889FF',
  secondaryFixedDim: '#D7BAFF',

  // Utility
  outline: '#827475',
  outlineVariant: '#D4C2C4',
  error: '#BA1A1A',
  errorContainer: '#FFD9DD',

  // Tertiary (green wellness accent)
  tertiary: '#4C6451',
  tertiaryContainer: '#819B86',

  // Phase colors for calendar
  phaseMenustrual: '#B48A8F',
  phaseFollicular: '#C4A8E0',
  phaseOvulatory: '#7345B6',
  phaseLuteal: '#9B8AA0',
  phasePredicted: 'rgba(180, 138, 143, 0.5)',

  // Tab bar
  tabInactive: '#A1A1AA', // zinc-400
  tabBarBg: 'rgba(255, 255, 255, 0.8)',

  // Misc
  white: '#FFFFFF',
  transparent: 'transparent',
};

// Silk gradient (135deg, purple → dusty pink)
export const gradients = {
  silk: ['#7345B6', '#B48A8F'] as const,
  silkAngle: 135,
};

export const typography = {
  fontFamily: {
    regular: 'PlusJakartaSans-Regular',
    medium: 'PlusJakartaSans-Medium',
    semiBold: 'PlusJakartaSans-SemiBold',
    bold: 'PlusJakartaSans-Bold',
    extraBold: 'PlusJakartaSans-ExtraBold',
  },
  // Display — hero moments, editorial headers
  displayLg: { fontSize: 40, lineHeight: 48, letterSpacing: -0.8 },
  displayMd: { fontSize: 34, lineHeight: 42, letterSpacing: -0.68 },
  displaySm: { fontSize: 28, lineHeight: 36, letterSpacing: -0.56 },
  // Headlines
  headlineLg: { fontSize: 24, lineHeight: 32 },
  headlineMd: { fontSize: 20, lineHeight: 28 },
  headlineSm: { fontSize: 18, lineHeight: 26 },
  // Title
  titleLg: { fontSize: 18, lineHeight: 26 },
  titleMd: { fontSize: 16, lineHeight: 24 },
  titleSm: { fontSize: 14, lineHeight: 20 },
  // Body — generous line-height for editorial feel
  bodyLg: { fontSize: 16, lineHeight: 25.6 },
  bodyMd: { fontSize: 14, lineHeight: 22.4 },
  bodySm: { fontSize: 12, lineHeight: 19.2 },
  // Labels — uppercase metadata style
  labelLg: { fontSize: 14, lineHeight: 20, letterSpacing: 0.7 },
  labelMd: { fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
  labelSm: { fontSize: 11, lineHeight: 16, letterSpacing: 0.55 },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
};

export const borderRadius = {
  default: 16,  // 1rem
  lg: 32,       // 2rem
  xl: 48,       // 3rem
  full: 9999,
};

export const shadows = {
  // Editorial shadow — tinted, not pure black
  editorial: {
    shadowColor: 'rgba(115, 69, 182, 0.08)',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 4,
  },
  // Soft glow for bottom nav
  softGlow: {
    shadowColor: 'rgba(180, 138, 143, 0.08)',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 8,
  },
};
