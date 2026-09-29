import React from 'react';
import { Image, StyleSheet } from 'react-native';

// The MathMotion mark (Stitch "mathmotion_logo": gradient tile with a
// pulse line), rendered to PNG at @1x/@2x/@3x in src/assets/images —
// the same artwork as the Android launcher icons.
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <Image
      source={require('../../assets/images/logo.png')}
      style={[styles.logo, { width: size, height: size }]}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    resizeMode: 'contain',
  },
});
