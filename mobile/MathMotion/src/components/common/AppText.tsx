import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import { fontFamilyFor, fontSize, type FontWeightKey, useColors } from '../../theme';

interface AppTextProps extends TextProps {
  weight?: FontWeightKey;
  size?: keyof typeof fontSize | number;
  color?: string;
  align?: TextStyle['textAlign'];
}

export function AppText({
  weight = 'regular',
  size = 'md',
  color,
  align,
  style,
  ...rest
}: AppTextProps) {
  const colors = useColors();
  const isRTL = useIsRTL();
  const resolvedSize = typeof size === 'number' ? size : fontSize[size];

  return (
    <Text
      {...rest}
      style={[
        {
          fontFamily: fontFamilyFor(isRTL ? 'fa' : 'en', weight),
          fontSize: resolvedSize,
          color: color ?? colors.textPrimary,
          textAlign: align ?? (isRTL ? 'right' : 'left'),
          writingDirection: isRTL ? 'rtl' : 'ltr',
        },
        style,
      ]}
    />
  );
}
