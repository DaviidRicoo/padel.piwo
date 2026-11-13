import { Text, type TextProps } from 'react-native';

import { useTheme, type ColorRole, type TypeVariant } from '@/theme';

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  /** colour role; only roles that have a checked pair with the background */
  tone?: ColorRole;
  align?: 'left' | 'center' | 'right';
  /** same-width digits, for scores and stats columns */
  numeric?: boolean;
}

const HEADER_VARIANTS: TypeVariant[] = ['heading', 'title', 'display'];

export function AppText({ variant = 'body', tone = 'text', align, numeric, style, ...rest }: AppTextProps) {
  const t = useTheme();
  return (
    <Text
      accessibilityRole={HEADER_VARIANTS.includes(variant) ? 'header' : undefined}
      maxFontSizeMultiplier={1.6}
      style={[
        t.type[variant],
        { color: t.color[tone] },
        align ? { textAlign: align } : null,
        numeric ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
      {...rest}
    />
  );
}
