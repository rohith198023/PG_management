import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, RefreshControl, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getPayments, verifyPayment } from '@/services/endpoints';
import { Colors } from '@/constants/colors';
import type { Payment } from '@/types';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  PENDING_VERIFICATION: { color: Colors.warning, icon: 'hourglass', label: 'Pending' },
  PAID:                 { color: Colors.success, icon: 'checkmark-circle', label: 'Approved' },
  REJECTED:             { color: Colors.danger,  icon: 'close-circle', label: 'Rejected' },
  FAILED:               { color: Colors.danger,  icon: 'alert-circle', label: 'Failed' },
};

const SOURCE_ICONS: Record<string, string> = {
  UPI: 'phone-portrait-outline',
  BANK_TRANSFER: 'business-outline',
  CASH: 'cash-outline',
  CHEQUE: 'document-outline',
  CARD: 'card-outline',
};

function PaymentCard({ item, canVerify, onAction }: {
  item: Payment;
  canVerify: boolean;
  onAction: (id: string, action: 'APPROVE' | 'REJECT') => void;
}) {
  const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDING_VERIFICATION;
  const sourceIcon = SOURCE_ICONS[item.source] ?? 'cash-outline';

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.sourceIcon, { backgroundColor: cfg.color + '20' }]}>
          <Ionicons name={sourceIcon as any} size={22} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.amount}>₹{Number(item.amount).toLocaleString()}</Text>
          <Text style={styles.tenant}>
            {item.tenant?.user.first_name} {item.tenant?.user.last_name}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
          <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <Text style={styles.detail}>
          {item.source} · {new Date(item.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
        {item.proof?.utr_number && (
          <Text style={styles.utr}>UTR: {item.proof.utr_number}</Text>
        )}
        {item.invoice && (
          <Text style={styles.invoice}>Invoice: {item.invoice.invoice_number}</Text>
        )}
      </View>

      {canVerify && item.status === 'PENDING_VERIFICATION' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => onAction(item.id, 'APPROVE')}
          >
            <Ionicons name="checkmark" size={16} color={Colors.success} />
            <Text style={[styles.actionText, { color: Colors.success }]}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => onAction(item.id, 'REJECT')}
          >
            <Ionicons name="close" size={16} color={Colors.danger} />
            <Text style={[styles.actionText, { color: Colors.danger }]}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const FILTERS = ['ALL', 'PENDING_VERIFICATION', 'PAID', 'REJECTED'];

export default function PaymentsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const canVerify = user?.role === 'WORKSPACE_ADMIN' || user?.role === 'MANAGER' || user?.role === 'PLATFORM_SUPER_ADMIN';

  const fetchPayments = useCallback(async (isRefresh = false, filter = 'ALL') => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await getPayments(filter);
      setPayments(data.payments);
      setMetrics(data.metrics);
    } catch (e: any) {
      setError(e.message || 'Failed to load payments');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchPayments(); }, [fetchPayments]));

  const handleAction = (paymentId: string, action: 'APPROVE' | 'REJECT') => {
    const label = action === 'APPROVE' ? 'Approve' : 'Reject';
    Alert.alert(
      `${label} Payment`,
      `Are you sure you want to ${label.toLowerCase()} this payment?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: action === 'REJECT' ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoading(paymentId);
            try {
              await verifyPayment({ paymentId, action });
              await fetchPayments(false, activeFilter);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Action failed');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

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
          <Text style={styles.title}>Payment Verifications</Text>
          {metrics && (
            <Text style={styles.subtitle}>
              {metrics.pendingCount} pending · {metrics.approvedCount} approved
            </Text>
          )}
        </View>
      </View>

      {/* Metrics */}
      {metrics && !loading && (
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: Colors.warning }]}>{metrics.pendingCount}</Text>
            <Text style={styles.metricLabel}>Pending</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: Colors.success }]}>{metrics.approvedCount}</Text>
            <Text style={styles.metricLabel}>Approved</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: Colors.danger }]}>{metrics.rejectedCount}</Text>
            <Text style={styles.metricLabel}>Rejected</Text>
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, activeFilter === f && styles.chipActive]}
            onPress={() => { setActiveFilter(f); fetchPayments(false, f); }}
          >
            <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>
              {f === 'PENDING_VERIFICATION' ? 'Pending' : f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.accent} size="large" /></View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline" size={40} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchPayments()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : payments.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="card-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No payments found</Text>
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PaymentCard
              item={item}
              canVerify={canVerify}
              onAction={handleAction}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPayments(true, activeFilter)} tintColor={Colors.accent} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
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
  metricsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 10,
    backgroundColor: Colors.bgCard, borderRadius: 14, borderWidth: 1, borderColor: Colors.border,
  },
  metric: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  metricValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  metricLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  filters: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border },
  chipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  chipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: Colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  errorText: { color: Colors.danger, textAlign: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 15 },
  retryBtn: { backgroundColor: Colors.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: Colors.white, fontWeight: '700' },

  card: { backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sourceIcon: { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  amount: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  tenant: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  detailsRow: { gap: 4 },
  detail: { fontSize: 12, color: Colors.textSecondary },
  utr: { fontSize: 12, color: Colors.textMuted, fontFamily: 'monospace' },
  invoice: { fontSize: 12, color: Colors.accent },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  approveBtn: { backgroundColor: Colors.success + '15', borderColor: Colors.success + '40' },
  rejectBtn: { backgroundColor: Colors.danger + '15', borderColor: Colors.danger + '40' },
  actionText: { fontSize: 14, fontWeight: '700' },
});
