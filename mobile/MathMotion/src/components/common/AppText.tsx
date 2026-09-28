import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import { colors, fontFamilyFor, fontSize, type FontWeightKey } from '../../theme';

interface AppTextProps extends TextProps {
  weight?: FontWeightKey;
  size?: keyof typeof fontSize | number;
  color?: string;
  align?: TextStyle['textAlign'];
}

export function AppText({
  weight = 'regular',
  size = 'md',
  color = colors.textPrimary,
  align,
  style,
  ...rest
}: AppTextProps) {
  const isRTL = useIsRTL();
  const resolvedSize = typeof size === 'number' ? size : fontSize[size];

  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: fontFamilyFor(isRTL ? 'fa' : 'en', weight),
          fontSize: resolvedSize,
          color,
          textAlign: align ?? (isRTL ? 'right' : 'left'),
          writingDirection: isRTL ? 'rtl' : 'ltr',
        },
        style,
      ]}
    />
  );
}
