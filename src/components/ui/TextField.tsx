import { Eye, EyeOff, Search, X } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

export interface TextFieldProps extends Omit<TextInputProps, 'style' | 'editable'> {
  label: string;
  variant?: 'text' | 'password' | 'search';
  helper?: string;
  error?: string;
  disabled?: boolean;
  /** screen reader labels; Spanish defaults until i18n is wired in /replica-build */
  showPasswordLabel?: string;
  hidePasswordLabel?: string;
  clearLabel?: string;
}

export function TextField({
  label,
  variant = 'text',
  helper,
  error,
  disabled,
  multiline,
  value,
  onChangeText,
  showPasswordLabel = 'Mostrar contraseña',
  hidePasswordLabel = 'Ocultar contraseña',
  clearLabel = 'Borrar texto',
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const borderWidth = focused || error ? 2 : 1;
  const borderColor = error ? t.color.danger : focused ? t.color.focus : t.color.borderInput;
  const iconColor = t.color.textMuted;

  return (
    <View style={{ gap: t.space[1], opacity: disabled ? t.opacity.disabled : 1 }}>
      <AppText variant="label">{label}</AppText>
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          minHeight: multiline ? 96 : t.layout.controlMd,
          borderWidth,
          borderColor,
          borderRadius: t.radius.md,
          backgroundColor: t.color.bg,
          // keep the text in place when the border thickens on focus
          paddingHorizontal: t.space[3] - (borderWidth - 1),
          gap: t.space[2],
        }}>
        {variant === 'search' ? <Search color={iconColor} size={18} /> : null}
        <TextInput
          accessibilityLabel={label}
          accessibilityHint={error ?? helper}
          editable={!disabled}
          multiline={multiline}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={variant === 'password' && !revealed}
          placeholderTextColor={t.color.textMuted}
          selectionColor={t.color.accentText}
          maxFontSizeMultiplier={1.6}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            t.type.body,
            {
              flex: 1,
              color: t.color.text,
              paddingVertical: multiline ? t.space[3] : 0,
              minHeight: multiline ? 96 : t.layout.controlMd - 2 * borderWidth,
              textAlignVertical: multiline ? 'top' : 'center',
              outlineStyle: 'none',
            } as object,
          ]}
          {...rest}
        />
        {variant === 'password' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={revealed ? hidePasswordLabel : showPasswordLabel}
            hitSlop={10}
            onPress={() => setRevealed((r) => !r)}>
            {revealed ? <EyeOff color={iconColor} size={20} /> : <Eye color={iconColor} size={20} />}
          </Pressable>
        ) : null}
        {variant === 'search' && value ? (
          <Pressable accessibilityRole="button" accessibilityLabel={clearLabel} hitSlop={10} onPress={() => onChangeText?.('')}>
            <X color={iconColor} size={18} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : helper ? (
        <AppText variant="caption" tone="textMuted">
          {helper}
        </AppText>
      ) : null}
    </View>
  );
}
