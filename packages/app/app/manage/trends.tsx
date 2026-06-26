import { useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';
import { useTrendsStore } from '../../src/stores/trendsStore';
import { useLicenseStore } from '../../src/edition/LicenseStore';
import { buildPills, isRangeLocked, TrendRange } from '../../src/lib/trends';
import {
  toBandSeries,
  hasEnoughHistory,
  TrendMetricKey,
} from '../../src/lib/trendsApi';
import { UpgradePrompt } from '../../src/edition/UpgradePrompt';
import MetricGauge from '../../src/components/MetricGauge';
import ScreenErrorBoundary from '../../src/components/ScreenErrorBoundary';
import { COLORS, RADIUS, SPACING, FONT, SHADOW } from '../../src/theme/tokens';

/* Metric → display config. `gated` feature key drives UpgradePrompt label. */
const METRICS: {
  key: TrendMetricKey;
  title: string;
  unit: string;
  color: string;
}[] = [
  { key: 'cpu', title: 'CPU', unit: '%', color: COLORS.blue },
  { key: 'memory', title: 'Memory', unit: '%', color: COLORS.purple },
  { key: 'disk', title: 'Disk', unit: '%', color: COLORS.yellow },
  { key: 'load', title: 'Load (1m)', unit: '', color: COLORS.green },
];

export default function TrendsScreen() {
  const { width } = useWindowDimensions();
  const chartWidth = Math.max(width - SPACING.lg * 2 - SPACING.lg * 2, 240);

  const range = useTrendsStore((s) => s.range);
  const data = useTrendsStore((s) => s.data);
  const loading = useTrendsStore((s) => s.loading);
  const error = useTrendsStore((s) => s.error);
  const setRange = useTrendsStore((s) => s.setRange);
  const fetchTrends = useTrendsStore((s) => s.fetch);

  const retentionLimit = useLicenseStore((s) => s.getLimit)('metricsRetentionDays');
  const pills = useMemo(() => buildPills(retentionLimit), [retentionLimit]);

  const load = useCallback(() => {
    // Locked ranges are pre-gated in the store; this is a no-op for them.
    fetchTrends(retentionLimit);
  }, [fetchTrends, retentionLimit]);

  useEffect(() => {
    load();
  }, [range, load]);

  const selectedLocked = isRangeLocked(range, retentionLimit);
  const enough = hasEnoughHistory(data);
  const latest = data?.buckets?.[data.buckets.length - 1] ?? null;

  function onPillPress(r: TrendRange, locked: boolean) {
    if (locked) return; // never select a locked range
    setRange(r);
  }

  function renderBandChart(
    title: string,
    key: TrendMetricKey,
    unit: string,
    color: string,
  ) {
    const series = toBandSeries(data!.buckets, key);
    const current = latest ? Number(latest[`${key}_avg` as keyof typeof latest]) : undefined;
    return (
      <View style={styles.card} key={key}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={[styles.cardCurrent, { color }]}>
            {current != null ? current.toFixed(1) : '--'}{unit}
          </Text>
        </View>
        <LineChart
          data={series.line}
          data2={series.max}
          data3={series.min}
          width={chartWidth}
          height={120}
          thickness={2}
          color1={color}
          color2={color + '55'}
          color3={color + '55'}
          hideDataPoints
          curved
          areaChart
          startFillColor={color}
          startOpacity={0.18}
          endOpacity={0.02}
          yAxisColor={COLORS.border}
          xAxisColor={COLORS.border}
          yAxisTextStyle={styles.axisText}
          hideRules
          initialSpacing={0}
          adjustToWidth
        />
        <Text style={styles.bandHint}>shaded band = min / max per bucket</Text>
      </View>
    );
  }

  function renderContainerChart() {
    const total = toBandSeries(data!.buckets, 'container_total').line;
    const running = toBandSeries(data!.buckets, 'container_running').line;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Containers</Text>
          <Text style={[styles.cardCurrent, { color: COLORS.teal }]}>
            {latest ? `${latest.container_running_avg.toFixed(0)}/${latest.container_total_avg.toFixed(0)}` : '--'}
          </Text>
        </View>
        <LineChart
          data={total}
          data2={running}
          width={chartWidth}
          height={120}
          thickness={2}
          color1={COLORS.teal}
          color2={COLORS.green}
          hideDataPoints
          curved
          yAxisColor={COLORS.border}
          xAxisColor={COLORS.border}
          yAxisTextStyle={styles.axisText}
          hideRules
          initialSpacing={0}
          adjustToWidth
        />
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.teal }]} />
            <Text style={styles.legendText}>Total</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: COLORS.green }]} />
            <Text style={styles.legendText}>Running</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <ScreenErrorBoundary screenName="Trends">
      <View style={styles.screen}>
        <Stack.Screen
          options={{
            title: 'Trends',
            headerStyle: { backgroundColor: COLORS.bg },
            headerTintColor: COLORS.textPrimary,
          }}
        />

        {/* Range pills */}
        <View style={styles.rangeRow}>
          {pills.map((p) => (
            <TouchableOpacity
              key={p.range}
              style={[
                styles.rangeBtn,
                range === p.range && !p.locked && styles.rangeBtnActive,
                p.locked && styles.rangeBtnLocked,
              ]}
              activeOpacity={p.locked ? 1 : 0.7}
              onPress={() => onPillPress(p.range, p.locked)}
            >
              <Text
                style={[
                  styles.rangeBtnText,
                  range === p.range && !p.locked && styles.rangeBtnTextActive,
                  p.locked && styles.rangeBtnTextLocked,
                ]}
              >
                {p.label}{p.locked ? ' 🔒' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedLocked ? (
          <UpgradePrompt feature="reports" />
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.blue} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={load}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !enough ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>Not enough history yet</Text>
            <Text style={styles.emptyText}>
              Trend data is still being collected for this range. Check back soon.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={loading}
                onRefresh={load}
                tintColor={COLORS.blue}
                colors={[COLORS.blue]}
                progressBackgroundColor={COLORS.card}
              />
            }
          >
            {latest && (
              <View style={styles.gaugeCard}>
                <MetricGauge label="CPU" value={latest.cpu_avg} />
                <MetricGauge label="Memory" value={latest.memory_avg} />
                <MetricGauge label="Disk" value={latest.disk_avg} />
              </View>
            )}
            {METRICS.map((m) => renderBandChart(m.title, m.key, m.unit, m.color))}
            {renderContainerChart()}
            {data?.clamped && (
              <Text style={styles.clampedNote}>
                Showing {data.servedDays}d of {data.requestedDays}d — your plan caps history at {data.retentionDays}d.
              </Text>
            )}
          </ScrollView>
        )}
      </View>
    </ScreenErrorBoundary>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xxl },
  errorText: { color: COLORS.red, fontSize: 14, marginBottom: SPACING.md, textAlign: 'center' },
  retryBtn: {
    backgroundColor: COLORS.border,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 10,
    borderRadius: RADIUS.sm,
  },
  retryText: { color: COLORS.blue, fontWeight: '600', fontSize: 14 },
  emptyTitle: { color: COLORS.textPrimary, ...FONT.heading, marginBottom: SPACING.sm },
  emptyText: { color: COLORS.textTertiary, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  rangeRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  rangeBtn: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.border,
    alignItems: 'center',
  },
  rangeBtnActive: { backgroundColor: COLORS.blue },
  rangeBtnLocked: { opacity: 0.5 },
  rangeBtnText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  rangeBtnTextActive: { color: COLORS.bg },
  rangeBtnTextLocked: { color: COLORS.textTertiary },

  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingBottom: 40 },

  gaugeCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600' },
  cardCurrent: { fontSize: 20, fontWeight: '700' },
  axisText: { color: COLORS.textTertiary, fontSize: 9 },
  bandHint: { color: COLORS.textTertiary, fontSize: 10, marginTop: SPACING.sm },
  legendRow: { flexDirection: 'row', gap: SPACING.lg, marginTop: SPACING.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: COLORS.textSecondary, fontSize: 12 },
  clampedNote: {
    color: COLORS.yellow,
    fontSize: 12,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
