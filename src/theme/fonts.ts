import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Montserrat_700Bold, Montserrat_800ExtraBold } from '@expo-google-fonts/montserrat';

// Every weight the type scale uses, loaded once in the root layout with useFonts.
export const fontAssets = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Montserrat_700Bold,
  Montserrat_800ExtraBold,
};

type Family = 'sans' | 'display';

// Google Fonts packages expose one family name per weight, so the weight is
// chosen by name, not with fontWeight.
const families: Record<Family, Record<number, keyof typeof fontAssets>> = {
  sans: { 400: 'Inter_400Regular', 500: 'Inter_500Medium', 600: 'Inter_600SemiBold', 700: 'Inter_700Bold' },
  display: { 700: 'Montserrat_700Bold', 800: 'Montserrat_800ExtraBold' },
};

export function fontFamily(family: Family, weight: number): string {
  const byWeight = families[family];
  if (byWeight[weight]) return byWeight[weight];
  // nearest loaded weight, so a token change never falls back to the system font
  const nearest = Object.keys(byWeight)
    .map(Number)
    .sort((a, b) => Math.abs(a - weight) - Math.abs(b - weight))[0];
  return byWeight[nearest];
}
