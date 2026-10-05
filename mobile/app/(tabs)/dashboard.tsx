import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, RefreshControl,
  StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { getDashboardStats } from '@/services/endpoints';
import { Colors } from '@/constants/colors';
import type { DashboardStats } from '@/types';
import { useFocusEffect, useRouter } from 'expo-router';

function formatCurrency(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
}

function StatCard({ label, value, sub, icon, color = Colors.accent }: {
  label: string; value: string; sub?: string; icon: string; color?: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user, workspace, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await getDashboardStats();
      setStats(data);
    } catch (e: any) {
      // If tenant, stats may be partial or restricted
      if (user?.role !== 'TENANT') {
        setError(e.message || 'Failed to load dashboard');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.role]);

  useFocusEffect(useCallback(() => { fetchStats(); }, [fetchStats]));

  const onRefresh = () => fetchStats(true);

  const isTenant = user?.role === 'TENANT';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.workspace}>{workspace?.name ?? 'PG SAS'}</Text>
          <Text style={styles.greeting}>Welcome, {user?.firstName} 👋</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Role badge */}
        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark" size={12} color={Colors.success} />
          <Text style={styles.roleText}>{user?.role?.replace('_', ' ')}</Text>
        </View>

        <Text style={styles.sectionTitle}>
          {isTenant ? 'Residence Member Hub' : 'Property Operations Overview'}
        </Text>

        {isTenant ? (
          <View style={styles.residentHub}>
            {/* Room allocation card */}
            <View style={styles.residentCard}>
              <View style={styles.residentCardTop}>
                <View style={styles.residentBadge}>
                  <Ionicons name="home" size={14} color={Colors.accent} />
                  <Text style={styles.residentBadgeText}>YOUR ROOM</Text>
                </View>
                <View style={styles.activeTag}>
                  <View style={[styles.dot, { backgroundColor: Colors.success }]} />
                  <Text style={styles.activeTagText}>Active Resident</Text>
                </View>
              </View>

              <Text style={styles.residentRoomText}>
                {user?.tenantProfile?.bed
                  ? `Room ${user.tenantProfile.bed.room.room_number} · Bed ${user.tenantProfile.bed.bed_number}`
                  : 'Room 101 · Bed 101-A'}
              </Text>
              <Text style={styles.residentPropText}>
                {user?.tenantProfile?.bed?.room?.property?.name || 'Royal Living — HSR Branch'}
              </Text>

              <View style={styles.residentMetaRow}>
                <View style={styles.residentMetaItem}>
                  <Text style={styles.residentMetaLabel}>Monthly Rent</Text>
                  <Text style={styles.residentMetaVal}>
                    ₹{Number(user?.tenantProfile?.bed?.room?.rent_amount || 8500).toLocaleString('en-IN')}/mo
                  </Text>
                </View>
                <View style={styles.residentMetaDivider} />
                <View style={styles.residentMetaItem}>
                  <Text style={styles.residentMetaLabel}>Security Deposit</Text>
                  <Text style={styles.residentMetaVal}>
                    ₹{Number(user?.tenantProfile?.bed?.room?.deposit_amount || 17000).toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Actions Grid for PG Members */}
            <Text style={styles.groupLabel}>MEMBER SERVICES</Text>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/screens/meals')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBox, { backgroundColor: Colors.warning + '20' }]}>
                <Ionicons name="restaurant" size={22} color={Colors.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Daily Mess & Meals</Text>
                <Text style={styles.actionDesc}>View menus & select Veg / Non-Veg / Skip</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/invoices')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBox, { backgroundColor: Colors.success + '20' }]}>
                <Ionicons name="receipt" size={22} color={Colors.success} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Pay Rent & Invoices</Text>
                <Text style={styles.actionDesc}>Check dues, view breakdown & payment receipts</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/screens/complaints')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBox, { backgroundColor: Colors.danger + '20' }]}>
                <Ionicons name="construct" size={22} color={Colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Maintenance & Complaints</Text>
                <Text style={styles.actionDesc}>Report issues & track resolution SLAs</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => router.push('/screens/notifications')}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIconBox, { backgroundColor: Colors.info + '20' }]}>
                <Ionicons name="notifications" size={22} color={Colors.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Notices & Announcements</Text>
                <Text style={styles.actionDesc}>Stay updated on PG updates & gate timings</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={Colors.accent} size="large" />
                <Text style={styles.loadingText}>Loading dashboard...</Text>
              </View>
            )}

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="cloud-offline" size={32} color={Colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity style={styles.retryBtn} onPress={() => fetchStats()}>
                  <Text style={styles.retryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}

            {stats && !loading && (
              <>
            {/* Occupancy Row */}
            <Text style={styles.groupLabel}>BED OCCUPANCY</Text>
            <View style={styles.row}>
              <StatCard
                label="Occupancy"
                value={`${stats.occupancy.occupancyPercentage}%`}
                sub={`${stats.occupancy.occupiedBeds} / ${stats.occupancy.totalBeds} beds`}
                icon="bed-outline"
                color={Colors.accent}
              />
              <StatCard
                label="Vacant"
                value={`${stats.occupancy.vacantBeds}`}
                sub="beds available"
                icon="checkmark-circle-outline"
                color={Colors.success}
              />
            </View>

            {/* Financial Row */}
            <Text style={styles.groupLabel}>FINANCIALS</Text>
            <View style={styles.row}>
              <StatCard
                label="Today's Revenue"
                value={formatCurrency(stats.financials.todayRevenue)}
                sub="Verified collections"
                icon="trending-up"
                color={Colors.success}
              />
              <StatCard
                label="Collection Rate"
                value={`${stats.financials.collectionEfficiency}%`}
                sub={`${formatCurrency(stats.financials.monthCollected)} of ${formatCurrency(stats.financials.monthTotalBilled)}`}
                icon="wallet-outline"
                color={Colors.accent}
              />
            </View>
            <View style={styles.row}>
              <StatCard
                label="Outstanding"
                value={formatCurrency(stats.financials.pendingRent)}
                sub="Across all aging buckets"
                icon="alert-circle-outline"
                color={Colors.warning}
              />
              <StatCard
                label="Pending Proofs"
                value={`${stats.financials.pendingProofCount}`}
                sub="Awaiting verification"
                icon="document-text-outline"
                color={stats.financials.pendingProofCount > 0 ? Colors.warning : Colors.success}
              />
            </View>

            {/* Complaints */}
            <Text style={styles.groupLabel}>MAINTENANCE</Text>
            <View style={styles.complaintsCard}>
              <View style={styles.complaintItem}>
                <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
                <Text style={styles.complaintLabel}>Open</Text>
                <Text style={styles.complaintCount}>{stats.complaints.open}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.complaintItem}>
                <View style={[styles.dot, { backgroundColor: Colors.warning }]} />
                <Text style={styles.complaintLabel}>In Progress</Text>
                <Text style={styles.complaintCount}>{stats.complaints.inProgress}</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.complaintItem}>
                <View style={[styles.dot, { backgroundColor: Colors.success }]} />
                <Text style={styles.complaintLabel}>Resolved</Text>
                <Text style={styles.complaintCount}>{stats.complaints.resolvedThisMonth}</Text>
              </View>
            </View>

            {/* AR Aging */}
            <Text style={styles.groupLabel}>AR AGING</Text>
            <View style={styles.agingCard}>
              {[
                { label: '0–30 Days', value: stats.financials.arAging.current, color: Colors.success },
                { label: '31–60 Days', value: stats.financials.arAging.days31to60, color: Colors.warning },
                { label: '60+ Days (Critical)', value: stats.financials.arAging.days60plus, color: Colors.danger },
              ].map((item) => (
                <View key={item.label} style={styles.agingRow}>
                  <View style={[styles.dot, { backgroundColor: item.color }]} />
                  <Text style={styles.agingLabel}>{item.label}</Text>
                  <Text style={[styles.agingValue, { color: item.color }]}>{formatCurrency(item.value)}</Text>
                </View>
              ))}
              <View style={[styles.agingRow, styles.agingTotal]}>
                <Text style={styles.agingLabel}>Total Outstanding</Text>
                <Text style={styles.agingValue}>{formatCurrency(stats.financials.pendingRent)}</Text>
              </View>
            </View>

            {/* Mess headcount */}
            {stats.messHeadcount.totalSelected > 0 && (
              <>
                <Text style={styles.groupLabel}>TODAY'S MESS</Text>
                <View style={styles.messCard}>
                  <View style={styles.messItem}>
                    <Text style={styles.messEmoji}>🥦</Text>
                    <Text style={styles.messCount}>{stats.messHeadcount.vegCount}</Text>
                    <Text style={styles.messLabel}>Veg</Text>
                  </View>
                  <View style={styles.messItem}>
                    <Text style={styles.messEmoji}>🍗</Text>
                    <Text style={styles.messCount}>{stats.messHeadcount.nonVegCount}</Text>
                    <Text style={styles.messLabel}>Non-Veg</Text>
                  </View>
                  <View style={styles.messItem}>
                    <Text style={styles.messEmoji}>⏭️</Text>
                    <Text style={styles.messCount}>{stats.messHeadcount.skippedCount}</Text>
                    <Text style={styles.messLabel}>Skip</Text>
                  </View>
                </View>
              </>
            )}
          </>
        )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  workspace: { fontSize: 17, fontWeight: '800', color: Colors.textPrimary },
  greeting: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  logoutBtn: { padding: 8 },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 32 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(34,197,94,0.1)', alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)',
  },
  roleText: { fontSize: 11, color: Colors.success, fontWeight: '700', letterSpacing: 0.5 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 20 },
  groupLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginBottom: 10, marginTop: 16 },
  loadingBox: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  loadingText: { color: Colors.textSecondary, fontSize: 14 },
  errorBox: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  errorText: { color: Colors.danger, fontSize: 14, textAlign: 'center' },
  retryBtn: { backgroundColor: Colors.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: Colors.white, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  statCard: {
    flex: 1, backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  statIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary },
  statSub: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
  complaintsCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    flexDirection: 'row', borderWidth: 1, borderColor: Colors.border,
  },
  complaintItem: { flex: 1, alignItems: 'center', gap: 6 },
  complaintLabel: { fontSize: 12, color: Colors.textSecondary },
  complaintCount: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  divider: { width: 1, backgroundColor: Colors.border, marginHorizontal: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  agingCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  agingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  agingTotal: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12, marginTop: 4 },
  agingLabel: { flex: 1, fontSize: 14, color: Colors.textSecondary },
  agingValue: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  messCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    flexDirection: 'row', justifyContent: 'space-around', borderWidth: 1, borderColor: Colors.border,
  },
  messItem: { alignItems: 'center', gap: 4 },
  messEmoji: { fontSize: 24 },
  messCount: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  messLabel: { fontSize: 12, color: Colors.textSecondary },

  residentHub: { gap: 14 },
  residentCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  residentCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  residentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  residentBadgeText: { fontSize: 11, fontWeight: '800', color: Colors.accent },
  activeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  activeTagText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  residentRoomText: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  residentPropText: { fontSize: 13, color: Colors.textSecondary },
  residentMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: Colors.bg,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  residentMetaItem: { alignItems: 'center' },
  residentMetaLabel: { fontSize: 11, color: Colors.textMuted },
  residentMetaVal: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  residentMetaDivider: { width: 1, height: 24, backgroundColor: Colors.border },

  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  actionIconBox: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  actionDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});

