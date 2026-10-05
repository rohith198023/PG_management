import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getNotifications, retryNotification } from '@/services/endpoints';
import { Colors } from '@/constants/colors';
import type { NotificationItem } from '@/types';

const STATUS_FILTERS = ['ALL', 'PENDING', 'SENT', 'FAILED'];

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  SENT:       { color: Colors.success, icon: 'checkmark-circle', label: 'Sent' },
  PENDING:    { color: Colors.warning, icon: 'time', label: 'Pending' },
  FAILED:     { color: Colors.danger,  icon: 'alert-circle', label: 'Failed' },
  PROCESSING: { color: Colors.info,    icon: 'sync', label: 'Processing' },
  CANCELLED:  { color: Colors.textMuted, icon: 'close-circle', label: 'Cancelled' },
};

const CHANNEL_CONFIG: Record<string, { icon: string; color: string }> = {
  EMAIL:    { icon: 'mail-outline', color: Colors.info },
  SMS:      { icon: 'chatbox-ellipses-outline', color: Colors.warning },
  WHATSAPP: { icon: 'logo-whatsapp', color: Colors.success },
  PUSH:     { icon: 'notifications-outline', color: Colors.accent },
};

function NotificationCard({
  item,
  onRetry,
  retrying,
}: {
  item: NotificationItem;
  onRetry: (id: string) => void;
  retrying: boolean;
}) {
  const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.PENDING;
  const channelCfg = CHANNEL_CONFIG[item.channel] ?? { icon: 'notifications-outline', color: Colors.accent };
  const recipientName = item.recipient
    ? `${item.recipient.first_name} ${item.recipient.last_name}`.trim()
    : item.target;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.channelBadge, { backgroundColor: channelCfg.color + '15' }]}>
          <Ionicons name={channelCfg.icon as any} size={14} color={channelCfg.color} />
          <Text style={[styles.channelText, { color: channelCfg.color }]}>{item.channel}</Text>
        </View>

        <View style={{ flex: 1 }} />

        <View style={[styles.statusBadge, { backgroundColor: statusCfg.color + '15' }]}>
          <Ionicons name={statusCfg.icon as any} size={12} color={statusCfg.color} />
          <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
        </View>
      </View>

      <Text style={styles.subjectText} numberOfLines={1}>
        {item.subject || item.type.replace(/_/g, ' ')}
      </Text>

      <Text style={styles.bodyText} numberOfLines={3}>
        {item.rendered_body}
      </Text>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <View style={styles.recipientRow}>
          <Ionicons name="person-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.recipientText} numberOfLines={1}>
            {recipientName}
          </Text>
        </View>

        <View style={styles.footerRight}>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>

          {item.status === 'FAILED' && (
            <TouchableOpacity
              style={styles.retryActionBtn}
              onPress={() => onRetry(item.id)}
              disabled={retrying}
            >
              {retrying ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <>
                  <Ionicons name="refresh" size={12} color={Colors.white} />
                  <Text style={styles.retryActionText}>Retry</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('ALL');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const fetchQueue = useCallback(
    async (isRefresh = false, activeFilter = 'ALL') => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const res = await getNotifications(
          activeFilter !== 'ALL' ? { status: activeFilter } : undefined
        );
        setNotifications(res.notifications || []);
        setStats(res.stats || {});
      } catch (e: any) {
        setError(e.message || 'Failed to load notifications queue');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      fetchQueue(false, filter);
    }, [fetchQueue, filter])
  );

  const handleFilterChange = (f: string) => {
    setFilter(f);
    fetchQueue(false, f);
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await retryNotification(id);
      Alert.alert('Success', 'Notification queued for re-dispatch');
      await fetchQueue(false, filter);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to retry notification');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notification Dispatch</Text>
          <Text style={styles.subtitle}>Queue status, logs & delivery tracking</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { borderColor: Colors.accentBorder }]}>
          <Text style={[styles.statNum, { color: Colors.accent }]}>
            {Object.values(stats).reduce((a, b) => a + b, 0)}
          </Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>

        <View style={[styles.statBox, { borderColor: Colors.warning + '40' }]}>
          <Text style={[styles.statNum, { color: Colors.warning }]}>
            {stats.PENDING || 0}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>

        <View style={[styles.statBox, { borderColor: Colors.success + '40' }]}>
          <Text style={[styles.statNum, { color: Colors.success }]}>
            {stats.SENT || 0}
          </Text>
          <Text style={styles.statLabel}>Sent</Text>
        </View>

        <View style={[styles.statBox, { borderColor: Colors.danger + '40' }]}>
          <Text style={[styles.statNum, { color: Colors.danger }]}>
            {stats.FAILED || 0}
          </Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
      </View>

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.chip, filter === s && styles.chipActive]}
            onPress={() => handleFilterChange(s)}
          >
            <Text style={[styles.chipText, filter === s && styles.chipTextActive]}>
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading notification queue...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline" size={44} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchQueue(false, filter)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchQueue(true, filter)}
              tintColor={Colors.accent}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Ionicons name="notifications-off-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No Notifications</Text>
              <Text style={styles.emptyDesc}>
                No messages found in the dispatch queue for filter "{filter}".
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <NotificationCard
              item={item}
              onRetry={handleRetry}
              retrying={retryingId === item.id}
            />
          )}
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

  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  statNum: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  chipTextActive: { color: Colors.white },

  list: { padding: 16, paddingBottom: 40, gap: 12 },

  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  channelText: { fontSize: 11, fontWeight: '800' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  subjectText: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  bodyText: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },

  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 4 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recipientRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  recipientText: { fontSize: 12, color: Colors.textMuted },
  footerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateText: { fontSize: 11, color: Colors.textMuted },

  retryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.danger,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  retryActionText: { color: Colors.white, fontSize: 11, fontWeight: '700' },

  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: { fontSize: 13, color: Colors.textMuted },
  errorText: { fontSize: 13, color: Colors.danger, textAlign: 'center' },
  retryBtn: {
    backgroundColor: Colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
});
