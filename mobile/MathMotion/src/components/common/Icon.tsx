import { MaterialIcons } from '@react-native-vector-icons/material-icons/static';
import React, { type ComponentProps } from 'react';
import { StyleSheet } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import { useColors } from '../../theme';

export type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  // Mirror in RTL — for directional icons (arrows, "next", "back").
  directional?: boolean;
}

// Material icons (the Stitch designs use Google's Material Symbols; this
// is the same icon family as a bundled font). Replaces the emoji
// placeholders used before the icon font was added.
export function Icon({ name, size = 22, color, directional = false }: IconProps) {
  const colors = useColors();
  const isRTL = useIsRTL();
  return (
    <MaterialIcons
      name={name}
      size={size}
      color={color ?? colors.textPrimary}
      style={directional && isRTL ? styles.flipped : undefined}
    />
  );
}

const styles = StyleSheet.create({
  flipped: {
    transform: [{ scaleX: -1 }],
  },
});
