import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';

const CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'CLEANING', 'WIFI_INTERNET', 'FOOD_MESS', 'CARPENTRY', 'OTHER'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function ResidentComplaintsScreen() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'PLUMBING',
    priority: 'MEDIUM',
  });

  const fetchComplaints = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/complaints');
      setComplaints(res.data.complaints || []);
    } catch (err) {
      console.warn('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchComplaints();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const handleCreate = async () => {
    if (!form.title || !form.description) {
      Alert.alert('Error', 'Please provide a title and issue description.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/complaints', form);
      Alert.alert('Request Submitted! 🛠️', 'Maintenance team has been notified.');
      setShowCreateModal(false);
      setForm({ title: '', description: '', category: 'PLUMBING', priority: 'MEDIUM' });
      fetchComplaints();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Maintenance Desk</Text>
          <Text style={styles.subtitle}>Report repairs, room issues, or cleaning requests</Text>
        </View>

        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.addBtnText}>Raise Request</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />}
        >
          {complaints.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="construct-outline" size={36} color="#64748B" />
              <Text style={styles.emptyTitle}>No Issues Reported</Text>
              <Text style={styles.emptySubtitle}>Everything looks smooth! Tap "Raise Request" if you need any assistance.</Text>
            </View>
          ) : (
            complaints.map((c) => {
              const isResolved = c.status === 'RESOLVED' || c.status === 'CLOSED';
              const isInProgress = c.status === 'IN_PROGRESS';

              return (
                <View key={c.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{c.title}</Text>
                    <View style={[
                      styles.statusBadge,
                      isResolved ? styles.badgeResolved : isInProgress ? styles.badgeProgress : styles.badgeOpen,
                    ]}>
                      <Ionicons
                        name={isResolved ? 'checkmark-circle' : 'time-outline'}
                        size={11}
                        color={isResolved ? '#34D399' : '#FBBF24'}
                      />
                      <Text style={[
                        styles.statusText,
                        isResolved ? styles.textResolved : isInProgress ? styles.textProgress : styles.textOpen,
                      ]}>
                        {c.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardDesc}>{c.description}</Text>

                  <View style={styles.cardFooter}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{c.category?.replace('_', ' ') || 'GENERAL'}</Text>
                    </View>
                    <Text style={styles.dateText}>
                      {new Date(c.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {/* New Complaint Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Maintenance Request</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ gap: 12 }}>
              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Issue Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Bathroom tap leaking"
                  placeholderTextColor="#64748B"
                  value={form.title}
                  onChangeText={(t) => setForm({ ...form, title: t })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[styles.pill, form.category === cat ? styles.pillActive : null]}
                      onPress={() => setForm({ ...form, category: cat })}
                    >
                      <Text style={[styles.pillText, form.category === cat ? styles.pillTextActive : null]}>
                        {cat.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Priority Level</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                  {PRIORITIES.map((pri) => (
                    <TouchableOpacity
                      key={pri}
                      style={[styles.pill, form.priority === pri ? styles.pillActive : null]}
                      onPress={() => setForm({ ...form, priority: pri })}
                    >
                      <Text style={[styles.pillText, form.priority === pri ? styles.pillTextActive : null]}>
                        {pri}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.inputLabel}>Detailed Description *</Text>
                <TextInput
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                  multiline
                  placeholder="Describe the issue and location in your room..."
                  placeholderTextColor="#64748B"
                  value={form.description}
                  onChangeText={(t) => setForm({ ...form, description: t })}
                />
              </View>

              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={handleCreate}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitModalBtnText}>Submit Request</Text>
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
  container: { flex: 1, backgroundColor: '#090D16' },
  header: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  addBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 12 },
  emptyCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 32,
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#E2E8F0' },
  emptySubtitle: { fontSize: 12, color: '#64748B', textAlign: 'center' },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', flex: 1, marginRight: 8 },
  cardDesc: { fontSize: 13, color: '#94A3B8', lineHeight: 18 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  badgeResolved: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  badgeProgress: { backgroundColor: 'rgba(99, 102, 241, 0.15)' },
  badgeOpen: { backgroundColor: 'rgba(234, 179, 8, 0.12)' },
  statusText: { fontSize: 11, fontWeight: '600' },
  textResolved: { color: '#34D399' },
  textProgress: { color: '#818CF8' },
  textOpen: { color: '#FBBF24' },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 8,
    marginTop: 4,
  },
  tag: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: { fontSize: 10, color: '#CBD5E1', fontWeight: '500' },
  dateText: { fontSize: 11, color: '#64748B' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'flex-end' },
  modalBox: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
    paddingBottom: 36,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#FFFFFF' },
  formGroup: { gap: 6 },
  inputLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  input: {
    backgroundColor: '#090D16',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#FFFFFF',
    fontSize: 13,
  },
  pill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  pillActive: { backgroundColor: '#4F46E5' },
  pillText: { fontSize: 12, color: '#94A3B8' },
  pillTextActive: { color: '#FFFFFF', fontWeight: '600' },
  submitModalBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitModalBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});
