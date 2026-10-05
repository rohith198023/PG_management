import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';

export default function ResidentDashboardScreen() {
  const { user, workspace } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tenantData, setTenantData] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/tenant/invoices');
      setInvoices(res.data.invoices || []);
      setTenantData(res.data.tenant || null);
    } catch (err) {
      console.warn('Failed to load resident dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate total outstanding
  const pendingInvoices = invoices.filter(
    (i) => i.status === 'ISSUED' || i.status === 'OVERDUE' || i.status === 'PARTIALLY_PAID'
  );
  const totalOutstanding = pendingInvoices.reduce(
    (sum, i) => sum + (Number(i.total_amount) - Number(i.amount_paid)),
    0
  );

  const activeLease = tenantData?.leases?.[0];
  const bedInfo = tenantData?.bed;
  const roomInfo = bedInfo?.room;
  const propertyInfo = roomInfo?.property;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
      >
        {/* Top Bar */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>Welcome home,</Text>
            <Text style={styles.nameText}>{user?.firstName || 'Resident'} {user?.lastName || ''}</Text>
          </View>
          <View style={styles.propertyBadge}>
            <Ionicons name="business-outline" size={12} color="#818CF8" />
            <Text style={styles.propertyBadgeText} numberOfLines={1}>
              {propertyInfo?.name || workspace?.name || 'PG_SAS'}
            </Text>
          </View>
        </View>

        {/* Room & Bed Allocation Banner */}
        <View style={styles.allocationCard}>
          <View style={styles.allocationLeft}>
            <View style={styles.bedIconWrap}>
              <Ionicons name="bed-outline" size={22} color="#6366F1" />
            </View>
            <View>
              <Text style={styles.allocationTitle}>
                Room {roomInfo?.room_number || '—'} • Bed {bedInfo?.bed_number || '—'}
              </Text>
              <Text style={styles.allocationSubtitle}>
                {activeLease ? `Lease Active (₹${activeLease.rent_amount}/mo)` : 'Allocated Bed'}
              </Text>
            </View>
          </View>
          <View style={styles.kycTag}>
            <Ionicons name="shield-checkmark" size={14} color="#10B981" />
            <Text style={styles.kycTagText}>Verified</Text>
          </View>
        </View>

        {/* Outstanding Dues Card */}
        <View style={[styles.duesCard, totalOutstanding > 0 ? styles.duesCardAlert : null]}>
          <View style={styles.duesHeader}>
            <Text style={styles.duesLabel}>Current Outstanding Rent</Text>
            {totalOutstanding > 0 ? (
              <View style={styles.badgeDue}>
                <Ionicons name="alert-circle-outline" size={12} color="#F87171" />
                <Text style={styles.badgeDueText}>Action Required</Text>
              </View>
            ) : (
              <View style={styles.badgePaid}>
                <Ionicons name="checkmark-circle-outline" size={12} color="#34D399" />
                <Text style={styles.badgePaidText}>All Paid</Text>
              </View>
            )}
          </View>

          <Text style={styles.duesAmount}>₹{totalOutstanding.toLocaleString('en-IN')}</Text>

          <View style={styles.duesFooter}>
            <Text style={styles.duesSubtext}>
              {pendingInvoices.length > 0
                ? `${pendingInvoices.length} pending bill(s) to settle`
                : 'No pending dues. You are completely up to date!'}
            </Text>
            {totalOutstanding > 0 && (
              <TouchableOpacity
                style={styles.payNowBtn}
                onPress={() => router.push('/(resident-tabs)/invoices' as any)}
              >
                <Ionicons name="card-outline" size={14} color="#FFFFFF" />
                <Text style={styles.payNowText}>Pay Now</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Action Shortcuts */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => router.push('/(resident-tabs)/invoices' as any)}
          >
            <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <Ionicons name="card-outline" size={20} color="#818CF8" />
            </View>
            <Text style={styles.gridTitle}>Rent Bills</Text>
            <Text style={styles.gridSub}>View & Pay</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => router.push('/(resident-tabs)/meals' as any)}
          >
            <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
              <Ionicons name="restaurant-outline" size={20} color="#FBBF24" />
            </View>
            <Text style={styles.gridTitle}>Meals</Text>
            <Text style={styles.gridSub}>Daily Menu</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => router.push('/(resident-tabs)/complaints' as any)}
          >
            <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Ionicons name="construct-outline" size={20} color="#F87171" />
            </View>
            <Text style={styles.gridTitle}>Maintenance</Text>
            <Text style={styles.gridSub}>Raise Issue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => router.push('/(resident-tabs)/profile' as any)}
          >
            <View style={[styles.gridIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#34D399" />
            </View>
            <Text style={styles.gridTitle}>KYC Status</Text>
            <Text style={styles.gridSub}>Docs & Details</Text>
          </TouchableOpacity>
        </View>

        {/* Security Deposit & Lease Specs */}
        {activeLease && (
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>Lease & Security Deposit</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Security Deposit Held</Text>
              <Text style={styles.infoVal}>₹{Number(activeLease.deposit_amount).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Monthly Rent</Text>
              <Text style={styles.infoVal}>₹{Number(activeLease.rent_amount).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoKey}>Lease Started</Text>
              <Text style={styles.infoVal}>
                {new Date(activeLease.start_date).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  greetingText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  nameText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  propertyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
    maxWidth: 160,
  },
  propertyBadgeText: {
    fontSize: 12,
    color: '#A5B4FC',
    fontWeight: '600',
  },
  allocationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  allocationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bedIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  allocationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  allocationSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  kycTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  kycTagText: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '600',
  },
  duesCard: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  duesCardAlert: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: '#13111C',
  },
  duesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duesLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  badgeDue: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  badgeDueText: {
    fontSize: 11,
    color: '#F87171',
    fontWeight: '600',
  },
  badgePaid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  badgePaidText: {
    fontSize: 11,
    color: '#34D399',
    fontWeight: '600',
  },
  duesAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
    marginBottom: 8,
  },
  duesFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
  },
  duesSubtext: {
    fontSize: 12,
    color: '#64748B',
    flex: 1,
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  payNowText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  gridItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: 14,
  },
  gridIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  gridSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  infoCard: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoKey: {
    fontSize: 12,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#CBD5E1',
  },
});
