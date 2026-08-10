/* Hallmark · genre: modern-minimal · theme: Verdant (custom) · design-system: design.md
 * paper #FFFFFF · ink #171A19 · accent #0F7B55 (deep green) · system sans
 * axes: light paper / system-sans display / cool-green accent
 * NOTE: React Native StyleSheet does not support oklch() — tokens ship as hex.
 *       OKLCH equivalents are recorded in design.md.
 */

import { Platform } from 'react-native';

// COLOUR — see design.md for the full table and contrast notes.
export const color = {
  paper: '#FFFFFF',
  paper2: '#F5F6F5',      // input + chip fill, bot bubbles
  paper3: '#EAECEA',      // pressed state
  ink: '#171A19',         // primary text AND selected chips
  ink2: '#5B625E',        // secondary text
  ink3: '#8A918C',        // tertiary text, disclosure chevrons
  rule: '#E4E7E4',        // hairline separators
  ruleStrong: '#D0D5D1',  // outlined button borders
  accent: '#0F7B55',      // primary action + halal ONLY
  accentPressed: '#0B5C40',
  accentTint: '#E8F3EE',
  accentInk: '#FFFFFF',
  star: '#D99A2B',        // rating glyph only
  danger: '#A8402C',
  dangerTint: '#FBEDEA',
};

// SPACING — 4-point scale.
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

// TYPOGRAPHY — system font so the app looks native and needs no font loading.
// RN native takes a single family name; web needs a full stack, hence Platform.
export const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}) as string;

export const size = {
  display: 28,
  title: 21,
  rowTitle: 16,
  section: 15,
  body: 15,
  meta: 13,
  micro: 11,
};

// RN wants fontWeight as strings.
export const weight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};
