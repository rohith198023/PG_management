import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl, StyleSheet,
  TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPnL, getFinanceAnalytics } from '@/services/endpoints';
import { Colors } from '@/constants/colors';
import { useFocusEffect, useRouter } from 'expo-router';

function formatCurrency(n: number) {
  if (!n || isNaN(n)) return '₹0';
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function FinanceMetric({ label, value, color = Colors.textPrimary, icon }: {
  label: string; value: string; color?: string; icon: string;
}) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
    </View>
  );
}

export default function AccountingScreen() {
  const router = useRouter();
  const [pnl, setPnl] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [pnlData, analyticsData] = await Promise.all([getPnL(), getFinanceAnalytics()]);
      setPnl(pnlData);
      setAnalytics(analyticsData);
    } catch (e: any) {
      setError(e.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchData(); }, [fetchData]));

  const revenue = pnl?.revenue ?? pnl?.totalRevenue ?? 0;
  const expenses = pnl?.expenses ?? pnl?.totalExpenses ?? 0;
  const profit = pnl?.profit ?? pnl?.netProfit ?? (revenue - expenses);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Accounting & P&L</Text>
          <Text style={styles.subtitle}>Financial overview</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading financial data...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline" size={40} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(true)} tintColor={Colors.accent} />}
        >
          {/* P&L Summary */}
          <Text style={styles.sectionLabel}>PROFIT & LOSS SUMMARY</Text>
          <View style={styles.pnlCard}>
            <View style={styles.pnlRow}>
              <View style={[styles.pnlIcon, { backgroundColor: Colors.success + '20' }]}>
                <Ionicons name="trending-up" size={24} color={Colors.success} />
              </View>
              <View>
                <Text style={styles.pnlLabel}>Total Revenue</Text>
                <Text style={[styles.pnlAmount, { color: Colors.success }]}>{formatCurrency(revenue)}</Text>
              </View>
            </View>
            <View style={styles.pnlDivider} />
            <View style={styles.pnlRow}>
              <View style={[styles.pnlIcon, { backgroundColor: Colors.danger + '20' }]}>
                <Ionicons name="trending-down" size={24} color={Colors.danger} />
              </View>
              <View>
                <Text style={styles.pnlLabel}>Total Expenses</Text>
                <Text style={[styles.pnlAmount, { color: Colors.danger }]}>{formatCurrency(expenses)}</Text>
              </View>
            </View>
            <View style={styles.pnlDivider} />
            <View style={styles.pnlRow}>
              <View style={[styles.pnlIcon, { backgroundColor: (profit >= 0 ? Colors.accent : Colors.warning) + '20' }]}>
                <Ionicons name="stats-chart" size={24} color={profit >= 0 ? Colors.accent : Colors.warning} />
              </View>
              <View>
                <Text style={styles.pnlLabel}>Net Profit</Text>
                <Text style={[styles.pnlAmount, { color: profit >= 0 ? Colors.accent : Colors.warning }]}>
                  {formatCurrency(profit)}
                </Text>
              </View>
            </View>
          </View>

          {/* Margin */}
          {revenue > 0 && (
            <>
              <Text style={styles.sectionLabel}>PROFIT MARGIN</Text>
              <View style={styles.marginCard}>
                <Text style={styles.marginPercent}>
                  {((profit / revenue) * 100).toFixed(1)}%
                </Text>
                <View style={styles.marginBarBg}>
                  <View style={[
                    styles.marginBarFill,
                    {
                      width: `${Math.min(100, Math.max(0, (profit / revenue) * 100))}%`,
                      backgroundColor: profit >= 0 ? Colors.accent : Colors.warning,
                    }
                  ]} />
                </View>
                <Text style={styles.marginDesc}>
                  {profit >= 0 ? 'Profitable period' : 'Operating at a loss'}
                </Text>
              </View>
            </>
          )}

          {/* Analytics if available */}
          {analytics && (
            <>
              <Text style={styles.sectionLabel}>ANALYTICS OVERVIEW</Text>
              <View style={styles.analyticsGrid}>
                {typeof analytics.totalRevenue === 'number' && (
                  <FinanceMetric label="Revenue" value={formatCurrency(analytics.totalRevenue)} icon="cash" color={Colors.success} />
                )}
                {typeof analytics.totalExpenses === 'number' && (
                  <FinanceMetric label="Expenses" value={formatCurrency(analytics.totalExpenses)} icon="card" color={Colors.danger} />
                )}
                {typeof analytics.collectionRate === 'number' && (
                  <FinanceMetric label="Collection Rate" value={`${analytics.collectionRate}%`} icon="trending-up" color={Colors.accent} />
                )}
                {typeof analytics.outstandingAmount === 'number' && (
                  <FinanceMetric label="Outstanding" value={formatCurrency(analytics.outstandingAmount)} icon="alert-circle" color={Colors.warning} />
                )}
              </View>
            </>
          )}

          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color={Colors.accent} />
            <Text style={styles.infoText}>
              For detailed reports (Trial Balance, GST, Balance Sheet), access the web dashboard.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  loadingText: { color: Colors.textSecondary },
  errorText: { color: Colors.danger, textAlign: 'center' },
  retryBtn: { backgroundColor: Colors.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: Colors.white, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginTop: 20, marginBottom: 10 },

  pnlCard: { backgroundColor: Colors.bgCard, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: Colors.border, gap: 16 },
  pnlRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  pnlIcon: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  pnlLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 4 },
  pnlAmount: { fontSize: 26, fontWeight: '800' },
  pnlDivider: { height: 1, backgroundColor: Colors.border },

  marginCard: { backgroundColor: Colors.bgCard, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', gap: 12 },
  marginPercent: { fontSize: 48, fontWeight: '900', color: Colors.accent },
  marginBarBg: { width: '100%', height: 8, backgroundColor: Colors.border, borderRadius: 4 },
  marginBarFill: { height: 8, borderRadius: 4 },
  marginDesc: { fontSize: 13, color: Colors.textSecondary },

  analyticsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '47%', backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border },
  metricIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  metricLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 4 },
  metricValue: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },

  infoBox: {
    flexDirection: 'row', gap: 10, backgroundColor: Colors.accentLight,
    borderRadius: 12, padding: 14, marginTop: 20,
    borderWidth: 1, borderColor: Colors.accentBorder,
  },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
});
