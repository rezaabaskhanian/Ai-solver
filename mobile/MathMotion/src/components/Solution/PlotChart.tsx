import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';

import { useIsRTL } from '../../hooks/useIsRTL';
import { makeStyles, radius, spacing, useColors } from '../../theme';
import type { PlotData, PlotFeature } from '../../types/problem';
import { AppText } from '../common/AppText';

interface PlotChartProps {
  plot: PlotData;
}

const CURVE_WIDTH = 2.5;
const DOT_SIZE = 10;
const DASH = 6;
const PLANE_ASPECT = 1.25;

// The drawn curve of a "function_plot" solve (math-engine solver/plot.py).
// Built from plain Views — each curve segment is a thin rotated bar — so
// no SVG dependency is needed. Always left-to-right: it's a coordinate
// plane, not text. Below it, a legend names every marked point.
export function PlotChart({ plot }: PlotChartProps) {
  const colors = useColors();
  const styles = useStyles();
  const { t } = useTranslation();
  const isRTL = useIsRTL();
  const [width, setWidth] = useState(0);
  const height = width / PLANE_ASPECT;

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  const px = (x: number) => ((x - plot.x_min) / (plot.x_max - plot.x_min)) * width;
  const py = (y: number) => ((plot.y_max - y) / (plot.y_max - plot.y_min)) * height;
  const featureColor: Record<PlotFeature['kind'], string> = {
    root: colors.danger,
    y_intercept: colors.warning,
    max: colors.success,
    min: colors.primary,
  };

  const xTicks = ticks(plot.x_min, plot.x_max);
  const yTicks = ticks(plot.y_min, plot.y_max);
  const xAxisVisible = plot.y_min <= 0 && 0 <= plot.y_max;
  const yAxisVisible = plot.x_min <= 0 && 0 <= plot.x_max;
  // Tick labels sit next to the axes, or along the edges when an axis is off-screen.
  const xLabelTop = xAxisVisible ? Math.min(py(0) + 2, height - 16) : height - 16;
  const yLabelLeft = yAxisVisible ? Math.max(px(0) + 3, 0) : 3;

  return (
    <View style={styles.card}>
      <View style={styles.plane} onLayout={onLayout}>
        {width > 0 && (
          <>
            {xTicks.map(v => (
              <View key={`gx${v}`} style={[styles.gridV, { left: px(v) }]} />
            ))}
            {yTicks.map(v => (
              <View key={`gy${v}`} style={[styles.gridH, { top: py(v) }]} />
            ))}
            {xAxisVisible && <View style={[styles.axisH, { top: py(0) - 0.75 }]} />}
            {yAxisVisible && <View style={[styles.axisV, { left: px(0) - 0.75 }]} />}

            {xTicks.filter(v => v !== 0).map(v => (
              <AppText
                key={`lx${v}`}
                size={10}
                color={colors.textSecondary}
                style={[styles.tickLabel, { left: px(v) - 12, top: xLabelTop }]}
              >
                {formatTick(v)}
              </AppText>
            ))}
            {yTicks.filter(v => v !== 0).map(v => (
              <AppText
                key={`ly${v}`}
                size={10}
                color={colors.textSecondary}
                style={[styles.tickLabel, styles.tickLabelY, { left: yLabelLeft, top: py(v) - 7 }]}
              >
                {formatTick(v)}
              </AppText>
            ))}

            {plot.vertical_asymptotes.map(v =>
              dashes(height).map(top => (
                <View
                  key={`va${v}-${top}`}
                  style={[styles.dash, { left: px(v) - 0.75, top, width: 1.5, height: DASH }]}
                />
              )),
            )}
            {plot.horizontal_asymptotes.map(v =>
              dashes(width).map(left => (
                <View
                  key={`ha${v}-${left}`}
                  style={[styles.dash, { top: py(v) - 0.75, left, width: DASH, height: 1.5 }]}
                />
              )),
            )}

            {plot.points.slice(1).map(([x2, y2], i) => {
              const [x1, y1] = plot.points[i];
              if (y1 === null || y2 === null) {
                return null;
              }
              const ax = px(x1), ay = py(y1), bx = px(x2), by = py(y2);
              const length = Math.hypot(bx - ax, by - ay);
              return (
                <View
                  key={`s${i}`}
                  style={[
                    styles.segment,
                    {
                      left: (ax + bx) / 2 - length / 2,
                      top: (ay + by) / 2 - CURVE_WIDTH / 2,
                      // A hair longer so neighbouring segments overlap without gaps.
                      width: length + 1,
                      transform: [{ rotate: `${Math.atan2(by - ay, bx - ax)}rad` }],
                    },
                  ]}
                />
              );
            })}

            {plot.features.map(f => (
              <View
                key={`f${f.kind}${f.x}`}
                style={[
                  styles.dot,
                  { left: px(f.x) - DOT_SIZE / 2, top: py(f.y) - DOT_SIZE / 2, backgroundColor: featureColor[f.kind] },
                ]}
              />
            ))}
          </>
        )}
      </View>

      {(plot.features.length > 0 || plot.vertical_asymptotes.length > 0 || plot.horizontal_asymptotes.length > 0) && (
        <View style={styles.legend}>
          {plot.features.map(f => (
            <View key={`l${f.kind}${f.x}`} style={[styles.legendRow, isRTL && styles.rowRTL]}>
              <View style={[styles.legendDot, { backgroundColor: featureColor[f.kind] }]} />
              <AppText size="sm" color={colors.textSecondary}>
                {t(`plot.features.${f.kind}`)}
              </AppText>
              <AppText size="sm" weight="medium" style={styles.ltr}>
                {f.label}
              </AppText>
            </View>
          ))}
          {plot.vertical_asymptotes.map(v => (
            <View key={`lv${v}`} style={[styles.legendRow, isRTL && styles.rowRTL]}>
              <View style={[styles.legendDash, { backgroundColor: colors.textSecondary }]} />
              <AppText size="sm" color={colors.textSecondary}>
                {t('plot.verticalAsymptote')}
              </AppText>
              <AppText size="sm" weight="medium" style={styles.ltr}>
                {`x = ${formatTick(v)}`}
              </AppText>
            </View>
          ))}
          {plot.horizontal_asymptotes.map(v => (
            <View key={`lh${v}`} style={[styles.legendRow, isRTL && styles.rowRTL]}>
              <View style={[styles.legendDash, { backgroundColor: colors.textSecondary }]} />
              <AppText size="sm" color={colors.textSecondary}>
                {t('plot.horizontalAsymptote')}
              </AppText>
              <AppText size="sm" weight="medium" style={styles.ltr}>
                {`y = ${formatTick(v)}`}
              </AppText>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Round grid values (…, -2, 0, 2, 4, …) with a 1/2/5 × 10ⁿ step, about 6–10 per axis.
function ticks(min: number, max: number): number[] {
  const rough = (max - min) / 8;
  const power = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 5, 10].map(m => m * power).find(s => s >= rough) ?? 10 * power;
  const out: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
    out.push(Number(v.toFixed(10)));
  }
  return out;
}

function formatTick(v: number): string {
  return String(Number(v.toFixed(3)));
}

function dashes(length: number): number[] {
  const out: number[] = [];
  for (let at = 0; at < length; at += DASH * 2) {
    out.push(at);
  }
  return out;
}

const useStyles = makeStyles(colors => StyleSheet.create({
  card: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  plane: {
    width: '100%',
    aspectRatio: PLANE_ASPECT,
    overflow: 'hidden',
    direction: 'ltr',
  },
  gridV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  gridH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  axisH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: colors.textSecondary,
  },
  axisV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: colors.textSecondary,
  },
  tickLabel: {
    position: 'absolute',
    width: 24,
    textAlign: 'center',
    writingDirection: 'ltr',
  },
  tickLabelY: {
    textAlign: 'left',
    width: 32,
  },
  dash: {
    position: 'absolute',
    backgroundColor: colors.textSecondary,
    opacity: 0.7,
  },
  segment: {
    position: 'absolute',
    height: CURVE_WIDTH,
    borderRadius: CURVE_WIDTH / 2,
    backgroundColor: colors.primary,
  },
  dot: {
    position: 'absolute',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  legend: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  // Soft RTL (see src/i18n/index.ts): rows are mirrored per component.
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  legendDot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
  legendDash: {
    width: DOT_SIZE + 4,
    height: 2,
  },
  ltr: {
    writingDirection: 'ltr',
  },
}));
