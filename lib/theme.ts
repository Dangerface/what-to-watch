// Eneste sted for universelle designværdier.
// Regel: nye farver, størrelser m.m. tilføjes HER først, ikke direkte i en skærm.
//
// Mørkt tema. Alle værdier er målt direkte på referencebilledet (pixel-sampling).

// Samme farve med gennemsigtighed, så fade-overlayet følger baggrunden automatisk.
function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// Blander to hex-farver. t = 0 giver a, t = 1 giver b.
function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const x = (pa >> shift) & 255;
    const y = (pb >> shift) & 255;
    return Math.round(x + (y - x) * t);
  };
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

type Stops = readonly [string, string, ...string[]];
type Locations = readonly [number, number, ...number[]];

// Rå paletværdier fra referencen.
const SCREEN_TOP = '#040115'; // næsten sort med violet tone, øverst
// Referencen viser kun gradienten op til ca. 58 % (derunder dækker modalen). Den er en ret linje,
// og forlænger man den til bunden, ender den i #091E34 (næsten samme farve som modalens top).
const SCREEN_BOTTOM = '#091E34';
// 1 = præcis den rette linje fra referencen. Under 1 kommer lyset tidligere (0.5 = allerede blålig
// ved 25 % af højden). En telefon viser meget mørke toner svagere end en skærm, så 1 ser fladt ud.
const SCREEN_EASE = 0.5;
const SCREEN_STEPS = 8;
const SHEET_TOP = '#0B2138'; // modalens øverste farve
const SHEET_BOTTOM = '#04051A'; // modalens nederste farve (målt)
const TEXT_LIGHT = '#E5E5E5'; // neutral lysegrå (ikke ren hvid)
const TEXT_DARK = '#262626'; // tekst på lyse knapper

export const colors = {
  // Fast fladefarve. Bruges som reserve under gradienten, til splash og som tekst på lyse knapper.
  background: '#061227',
  backgroundFadeStart: withAlpha(SCREEN_BOTTOM, 0),
  backgroundFadeEnd: withAlpha(SCREEN_BOTTOM, 0.8),

  modalBackground: SHEET_TOP, // reserve under modalens gradient (kantlinjen tegnes over denne)
  sheetBorder: 'rgba(255,255,255,0.07)', // modalens kant hele vejen rundt (ens farve på alle sider)
  sheetBorderTop: 'rgba(255,255,255,0.16)', // lyskanten øverst på modalen (tegnes som en separat linje)

  // Rækker, felter og spor: en gennemsigtig hvid flade, så de altid er lysere end baggrunden,
  // uanset hvor på gradienten de ligger (også i modalen).
  surface: 'rgba(255,255,255,0.08)',

  textPrimary: TEXT_LIGHT,
  textSecondary: '#A3A3A3',
  textMuted: '#737373',
  textAccent: '#E8B923',
  textOnDark: TEXT_DARK, // navnet er arvet: tekst PÅ udfyldte (lyse) knapper
  ink: TEXT_LIGHT, // udfyldte knapper, kanter på outlined knapper, ikoner

  divider: 'rgba(255,255,255,0.10)',
  modalBackdrop: 'rgba(0,0,0,0.55)',
  sheetHandle: 'rgba(255,255,255,0.25)',

  glassBorder: 'rgba(255,255,255,0.12)',
  glassFill: 'rgba(255,255,255,0.06)',
  glassFillStrong: 'rgba(255,255,255,0.10)',
  glassCapsule: 'rgba(255,255,255,0.10)', // fremhævelsen bag det aktive menupunkt

  logoBox: '#000000', // den sorte boks i logo-animationen (splash og loadere)
} as const;

const screenLocations = Array.from({ length: SCREEN_STEPS }, (_, i) => i / (SCREEN_STEPS - 1));
const screenColors = screenLocations.map((p) => mix(SCREEN_TOP, SCREEN_BOTTOM, Math.pow(p, SCREEN_EASE)));

// Gradienter (bruges af ScreenBackground og Sheet).
export const gradients = {
  // Lodret, fra #040115 øverst til #091E34 nederst (se SCREEN_EASE).
  screen: {
    colors: screenColors as unknown as Stops,
    locations: screenLocations as unknown as Locations,
  },
  // Modalen går fra blågrøn til mørk violet.
  sheet: {
    colors: [SHEET_TOP, SHEET_BOTTOM] as const,
  },
};

// Det violette "lys" i skærmens yderkant. Det følger en afrundet ramme og falder ud mod midten.
// Målt på referencen: ca. 9 px bredt, 0,36–0,5 alpha ved kanten. Her ca. 1,4 × målt styrke,
// fordi telefonen viser mørke toner svagere end en skærm.
export const rim = {
  size: 10, // bredde i punkter. 0 slår effekten fra
  radius: 50, // hjørneradius. Ca. 50 følger en nyere iPhones skærmhjørner; 16 ligner referencens kort
  rgb: '20,0,82',
  strength: 0.7, // alpha ved selve kanten
  falloff: [
    { at: 0, mul: 1 },
    { at: 0.2, mul: 0.56 },
    { at: 0.45, mul: 0.2 },
    { at: 0.8, mul: 0 },
  ],
} as const;

export const fonts = {
  heading: 'Gabarito-Bold',
} as const;

export const typography = {
  display: { fontFamily: fonts.heading, fontSize: 36, color: colors.textPrimary }, // forsidens titel
  h1: { fontFamily: fonts.heading, fontSize: 28, color: colors.textPrimary },
  h2: { fontFamily: fonts.heading, fontSize: 24, color: colors.textPrimary }, // sidetitler, filmtitel
  h3: { fontFamily: fonts.heading, fontSize: 20, color: colors.textPrimary }, // beskeder og fejltekster
  h4: { fontFamily: fonts.heading, fontSize: 18, color: colors.textPrimary }, // modal-titler, hints
  body: { fontSize: 15, color: colors.textPrimary },
  caption: { fontSize: 13, color: colors.textPrimary },
} as const;

export const radius = {
  sm: 8,
  poster: 12, // plakater og små felter
  md: 14, // rækker og kort
  card: 16, // store plakater, flader og valgbokse
  lg: 20, // knapper
  field: 24, // søgefeltet
  sheet: 28, // bundark og menu
  pill: 40, // store runde knapper
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const shadows = {
  // Samme skygge som bundmenuen og søgefeltet bruger.
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 10,
  },
  // Modalens skygge kastes OP over indholdet bag den. Målt på referencen:
  // ca. 36 px blød, 10 px forskudt opad, op til ca. 55 % mørkere lige ved kanten.
  sheet: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.58,
    shadowRadius: 36,
  },
} as const;

export const glassTint = 'dark' as const; // blur-tonen i bundmenuen og søgefeltet

export const glass = {
  regular: { intensity: 70, fill: colors.glassFill }, // bundmenuen
  strong: { intensity: 80, fill: colors.glassFillStrong }, // søgefelt og knapper: mere dækkende, så tekst står skarpt
} as const;

export const layout = {
  backButtonTop: 60,
  backButtonLeft: 24,
  topControlTop: 60, // ikon-knapper øverst til højre (indstillinger, rediger)
  topControlRight: 20,
  topControlSize: 44,
  tabBarClearance: 110, // fri plads nederst, så indhold kan scrolles fri af menuen
} as const;

// Lagdeling samlet ét sted, så vi undgår "modal bag modal"-fejl.
export const zIndex = {
  backButton: 10,
  fadeOverlay: 10,
  tabBar: 15,
  floatingControl: 20,
  settingsOverlay: 30,
  searchModal: 50,
  actionModal: 60,
  splash: 100,
} as const;