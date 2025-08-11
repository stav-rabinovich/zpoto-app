// components/BarChartMini.js
// בר צ׳ארט מינימלי בלי ספריות – משתמש רק ב-View.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function BarChartMini({
  data = [],                 // [{ label: '2025-08-01', value: 120 }, ...]
  height = 120,
  barWidth = 12,
  gap = 6,
  roundTop = 6,
  yFormatter = (n) => `₪${n}`,
  xFormatter = (s) => s.slice(5), // MM-DD
  highlightIndex = null,
  onBarPress,
  showYAxis = true,
  yTicks = 3,
  color = '#00C6FF',
  colorFaded = 'rgba(0,198,255,0.2)',
}) {
  const max = useMemo(() => {
    const m = Math.max(1, ...data.map(d => Number(d.value) || 0));
    return m;
  }, [data]);

  const tickVals = useMemo(() => {
    const arr = [];
    for (let i = yTicks; i >= 1; i--) {
      arr.push(Math.round((max * i) / yTicks));
    }
    return arr;
  }, [max, yTicks]);

  return (
    <View style={[styles.wrap, { height }]}>
      {/* ציר Y (אופציונלי) */}
      {showYAxis && (
        <View style={styles.yAxis}>
          {tickVals.map((t, i) => (
            <View key={`t-${i}`} style={[styles.tickRow, { height: (height - 20) / yTicks }]}>
              <Text style={styles.tickText}>{yFormatter(t)}</Text>
            </View>
          ))}
          <Text style={[styles.tickText, { marginTop: 2 }]}>{yFormatter(0)}</Text>
        </View>
      )}

      {/* גרף */}
      <View style={[styles.chart, { height }]}>
        <View style={[styles.grid, { backgroundColor: colorFaded }]} />
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          {data.map((d, idx) => {
            const h = max === 0 ? 0 : Math.max(2, Math.round(((Number(d.value) || 0) / max) * (height - 24)));
            const active = highlightIndex === idx;
            return (
              <View key={idx} style={{ alignItems: 'center', marginRight: gap }}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => onBarPress?.(d, idx)}
                  style={[
                    styles.bar,
                    {
                      height: h,
                      width: barWidth,
                      borderTopLeftRadius: roundTop,
                      borderTopRightRadius: roundTop,
                      backgroundColor: active ? color : `${color}CC`, // קצת שקיפות לברירת מחדל
                    },
                  ]}
                />
                <Text numberOfLines={1} style={styles.xLabel}>
                  {xFormatter(String(d.label || ''))}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', flexDirection: 'row' },
  yAxis: { width: 64, paddingRight: 6, justifyContent: 'space-between', alignItems: 'flex-end' },
  tickRow: { justifyContent: 'flex-start' },
  tickText: { fontSize: 11, color: '#557', fontWeight: '600' },
  chart: { flex: 1, paddingTop: 4, paddingBottom: 20, justifyContent: 'flex-end' },
  grid: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 24,
    opacity: 0.06, borderRadius: 10,
  },
  bar: {
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  xLabel: { fontSize: 10, color: '#446', marginTop: 4, maxWidth: 40, textAlign: 'center' },
});
