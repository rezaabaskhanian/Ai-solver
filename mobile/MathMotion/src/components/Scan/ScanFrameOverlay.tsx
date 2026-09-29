import React from 'react';
import { StyleSheet, View } from 'react-native';

import { makeStyles, radius } from '../../theme';

// A framing guide over the live preview — purely visual guidance (no
// real-time detection), four accent-colored corner brackets as in the
// Stitch "camera_scan" design, showing where to line up the paper.
export function ScanFrameOverlay() {
  const styles = useStyles();

  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={styles.frame}>
        <View style={[styles.corner, styles.topLeft]} />
        <View style={[styles.corner, styles.topRight]} />
        <View style={[styles.corner, styles.bottomLeft]} />
        <View style={[styles.corner, styles.bottomRight]} />
      </View>
    </View>
  );
}

const CORNER = 36;
const THICKNESS = 4;

const useStyles = makeStyles(colors => StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frame: {
    width: '84%',
    aspectRatio: 1.35,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: colors.primary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: THICKNESS,
    borderLeftWidth: THICKNESS,
    borderTopLeftRadius: radius.md,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: THICKNESS,
    borderRightWidth: THICKNESS,
    borderTopRightRadius: radius.md,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: THICKNESS,
    borderLeftWidth: THICKNESS,
    borderBottomLeftRadius: radius.md,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: THICKNESS,
    borderRightWidth: THICKNESS,
    borderBottomRightRadius: radius.md,
  },
}));
