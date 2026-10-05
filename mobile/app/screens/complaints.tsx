import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, RefreshControl, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, Modal,
  TextInput, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getComplaints, createComplaint, updateComplaint } from '@/services/endpoints';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/colors';
import type { Complaint } from '@/types';
import { useFocusEffect, useRouter } from 'expo-router';

const PRIORITY_CONFIG: Record<string, { color: string; label: string }> = {
  LOW:    { color: Colors.success, label: 'Low' },
  MEDIUM: { color: Colors.warning, label: 'Medium' },
  HIGH:   { color: Colors.danger,  label: 'High' },
  URGENT: { color: '#ff0040',     label: 'Urgent' },
};

const STATUS_CONFIG: Record<string, { color: string; icon: string }> = {
  OPEN:        { color: Colors.danger,  icon: 'alert-circle' },
  IN_PROGRESS: { color: Colors.warning, icon: 'time' },
  RESOLVED:    { color: Colors.success, icon: 'checkmark-circle' },
  CLOSED:      { color: Colors.textMuted, icon: 'close-circle' },
};

function ComplaintCard({
  item,
  canManage,
  onPressCard,
}: {
  item: Complaint;
  canManage?: boolean;
  onPressCard?: (c: Complaint) => void;
}) {
  const priority = PRIORITY_CONFIG[item.priority] ?? PRIORITY_CONFIG.MEDIUM;
  const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.OPEN;
  const tenantName = item.tenant ? `${item.tenant.user.first_name} ${item.tenant.user.last_name}` : 'Resident';

  return (
    <TouchableOpacity
      style={[styles.card, item.isBreached && styles.cardBreached]}
      activeOpacity={canManage ? 0.75 : 1}
      onPress={() => canManage && onPressCard && onPressCard(item)}
    >
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{item.title}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: priority.color + '20' }]}>
          <Text style={[styles.priorityText, { color: priority.color }]}>{priority.label}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
        <Text style={styles.infoText}>{tenantName}</Text>
        {item.tenant?.bed && (
          <Text style={styles.infoText}>· Room {item.tenant.bed.room.room_number}</Text>
        )}
      </View>

      {item.resolution_notes && (
        <View style={styles.resolutionBox}>
          <Ionicons name="checkmark-done" size={12} color={Colors.success} />
          <Text style={styles.resolutionText}>Notes: {item.resolution_notes}</Text>
        </View>
      )}

      <View style={styles.bottomRow}>
        <View style={[styles.statusPill, { backgroundColor: status.color + '20' }]}>
          <Ionicons name={status.icon as any} size={13} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>{item.status.replace('_', ' ')}</Text>
        </View>
        <Text style={styles.category}>{item.category}</Text>
        {item.isBreached && (
          <View style={styles.slaBreached}>
            <Ionicons name="warning" size={12} color={Colors.danger} />
            <Text style={styles.slaText}>SLA Breached</Text>
          </View>
        )}
        {!item.isBreached && item.remainingHours > 0 && item.status !== 'RESOLVED' && item.status !== 'CLOSED' && (
          <Text style={styles.slaRemaining}>{item.remainingHours}h left</Text>
        )}
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.dateText}>
          {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
        {canManage && (
          <Text style={styles.manageHintText}>Tap to update status →</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const STATUSES = ['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
const CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'CARPENTRY', 'CLEANING', 'INTERNET', 'APPLIANCE', 'SECURITY', 'OTHER'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function ComplaintsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const canManage = user?.role === 'WORKSPACE_ADMIN' || user?.role === 'MANAGER' || user?.role === 'STAFF';

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Create Ticket Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('OTHER');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [creating, setCreating] = useState(false);

  // Update Status Modal State (Admin Parity)
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [targetStatus, setTargetStatus] = useState('IN_PROGRESS');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchComplaints = useCallback(async (isRefresh = false, statusFilter = activeFilter) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await getComplaints(statusFilter !== 'ALL' ? { status: statusFilter } : undefined);
      setComplaints(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load complaints');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useFocusEffect(useCallback(() => { fetchComplaints(); }, [fetchComplaints]));

  const onFilter = (status: string) => {
    setActiveFilter(status);
    fetchComplaints(false, status);
  };

  const handleCreateSubmit = async () => {
    if (!newTitle.trim() || !newDesc.trim()) {
      Alert.alert('Missing Fields', 'Please provide both title and description.');
      return;
    }
    setCreating(true);
    try {
      await createComplaint({
        title: newTitle.trim(),
        description: newDesc.trim(),
        category: newCategory,
        priority: newPriority,
      });
      Alert.alert('Ticket Created ✅', 'Your complaint has been lodged with the property manager.');
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
      fetchComplaints(true);
    } catch (e: any) {
      Alert.alert('Submission Failed ❌', e.message || 'Could not create ticket');
    } finally {
      setCreating(false);
    }
  };

  const openUpdateModal = (c: Complaint) => {
    setSelectedComplaint(c);
    setTargetStatus(c.status);
    setResolutionNotes(c.resolution_notes || '');
    setShowUpdateModal(true);
  };

  const handleUpdateSubmit = async () => {
    if (!selectedComplaint) return;
    setUpdating(true);
    try {
      await updateComplaint(selectedComplaint.id, {
        status: targetStatus,
        resolutionNotes: resolutionNotes.trim() || undefined,
      });
      Alert.alert('Ticket Updated ✅', `Ticket status set to ${targetStatus}.`);
      setShowUpdateModal(false);
      fetchComplaints(true);
    } catch (e: any) {
      Alert.alert('Update Failed ❌', e.message || 'Could not update ticket');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.title}>Incident & Maintenance</Text>
          <Text style={styles.subtitle}>{complaints.length} tickets in desk</Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.newBtnText}>New Ticket</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {STATUSES.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.filterChip, activeFilter === s && styles.filterChipActive]}
            onPress={() => onFilter(s)}
          >
            <Text style={[styles.filterText, activeFilter === s && styles.filterTextActive]}>
              {s.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline" size={40} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchComplaints()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : complaints.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="build-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No complaints found</Text>
        </View>
      ) : (
        <FlatList
          data={complaints}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ComplaintCard
              item={item}
              canManage={canManage}
              onPressCard={openUpdateModal}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchComplaints(true)} tintColor={Colors.accent} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* ── Create Ticket Modal ───────────────────────────────────────────── */}
      <Modal visible={showCreateModal} animationType="slide" transparent onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Lodge Maintenance Ticket</Text>
                <Text style={styles.modalSubtitle}>Report an issue in your room or facility</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCreateModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputSubLabel}>Issue Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Geyser not heating water"
                placeholderTextColor={Colors.textMuted}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              <Text style={styles.inputSubLabel}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.choiceChip, newCategory === cat && styles.choiceChipActive]}
                    onPress={() => setNewCategory(cat)}
                  >
                    <Text style={[styles.choiceChipText, newCategory === cat && styles.choiceChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputSubLabel}>Priority</Text>
              <View style={{ flexDirection: 'row', gap: 6, marginVertical: 6 }}>
                {PRIORITIES.map(p => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.choiceChip, newPriority === p && styles.choiceChipActive]}
                    onPress={() => setNewPriority(p)}
                  >
                    <Text style={[styles.choiceChipText, newPriority === p && styles.choiceChipTextActive]}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputSubLabel}>Description *</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Provide details about the issue..."
                placeholderTextColor={Colors.textMuted}
                value={newDesc}
                onChangeText={setNewDesc}
                multiline
              />

              <TouchableOpacity
                style={[styles.submitBtn, creating && { opacity: 0.6 }]}
                onPress={handleCreateSubmit}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={16} color="#fff" />
                    <Text style={styles.submitBtnText}>Submit Complaint</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Admin Update Status Modal ─────────────────────────────────────── */}
      <Modal visible={showUpdateModal} animationType="slide" transparent onRequestClose={() => setShowUpdateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Update Ticket Status</Text>
                <Text style={styles.modalSubtitle}>Change status or record repair resolution</Text>
              </View>
              <TouchableOpacity onPress={() => setShowUpdateModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedComplaint && (
                <View style={styles.ticketSummaryBox}>
                  <Text style={styles.ticketSummaryTitle}>{selectedComplaint.title}</Text>
                  <Text style={styles.ticketSummaryDesc} numberOfLines={2}>{selectedComplaint.description}</Text>
                </View>
              )}

              <Text style={styles.inputSubLabel}>Set Ticket Status *</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 6 }}>
                {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map(st => {
                  const isSelected = targetStatus === st;
                  const cfg = STATUS_CONFIG[st] ?? STATUS_CONFIG.OPEN;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[styles.statusSelectChip, isSelected && { backgroundColor: cfg.color, borderColor: cfg.color }]}
                      onPress={() => setTargetStatus(st)}
                    >
                      <Ionicons name={cfg.icon as any} size={13} color={isSelected ? '#fff' : cfg.color} />
                      <Text style={[styles.statusSelectText, isSelected && { color: '#fff' }]}>
                        {st.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputSubLabel}>Resolution Notes</Text>
              <TextInput
                style={[styles.textInput, { height: 75, textAlignVertical: 'top' }]}
                placeholder="e.g. Technician replaced heating element. Tested and working."
                placeholderTextColor={Colors.textMuted}
                value={resolutionNotes}
                onChangeText={setResolutionNotes}
                multiline
              />

              <TouchableOpacity
                style={[styles.submitBtn, updating && { opacity: 0.6 }]}
                onPress={handleUpdateSubmit}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={16} color="#fff" />
                    <Text style={styles.submitBtnText}>Save Ticket Status</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: { padding: 4 },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.accent, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
  },
  newBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  filterRow: { marginBottom: 12, maxHeight: 36 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  filterChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  filterText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  filterTextActive: { color: Colors.white, fontWeight: '700' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  errorText: { color: Colors.danger, textAlign: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 15 },
  retryBtn: { backgroundColor: Colors.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  retryText: { color: Colors.white, fontWeight: '700' },

  card: {
    backgroundColor: Colors.bgCard, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  cardBreached: { borderColor: Colors.danger + '80' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardDesc: { fontSize: 13, color: Colors.textSecondary, marginTop: 3 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  priorityText: { fontSize: 10, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 12, color: Colors.textMuted },
  resolutionBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.success + '12', padding: 8, borderRadius: 8,
  },
  resolutionText: { fontSize: 11, color: Colors.success, flex: 1 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: '700' },
  category: { fontSize: 10, color: Colors.textMuted, backgroundColor: Colors.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  slaBreached: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slaText: { fontSize: 10, color: Colors.danger, fontWeight: '700' },
  slaRemaining: { fontSize: 10, color: Colors.warning, fontWeight: '600' },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.border + '40', paddingTop: 8, marginTop: 2 },
  dateText: { fontSize: 11, color: Colors.textMuted },
  manageHintText: { fontSize: 11, color: Colors.accent, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '85%', paddingBottom: 24,
    borderWidth: 1, borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  modalSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  closeBtn: { padding: 6, borderRadius: 20, backgroundColor: Colors.bg },
  modalBody: { padding: 20 },
  inputSubLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4, marginTop: 8 },
  textInput: {
    backgroundColor: Colors.bg, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
    color: Colors.textPrimary, fontSize: 14,
  },
  choiceChip: {
    backgroundColor: Colors.bg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
    marginRight: 6, borderWidth: 1, borderColor: Colors.border,
  },
  choiceChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  choiceChipText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  choiceChipTextActive: { color: '#fff', fontWeight: '700' },
  statusSelectChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  statusSelectText: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  ticketSummaryBox: {
    backgroundColor: Colors.bg, padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  ticketSummaryTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  ticketSummaryDesc: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent, borderRadius: 12,
    paddingVertical: 14, marginTop: 18,
  },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
