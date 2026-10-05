import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getUsers, createUser, updateUser, deleteUser } from '@/services/endpoints';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

interface WorkspaceUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  WORKSPACE_ADMIN: { bg: '#8b5cf620', text: '#a78bfa' },
  MANAGER: { bg: '#6366f120', text: '#818cf8' },
  STAFF: { bg: '#06b6d420', text: '#22d3ee' },
  TENANT: { bg: '#10b98120', text: '#34d399' },
};

export default function UsersScreen() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'WORKSPACE_ADMIN';

  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Add User Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'MANAGER' | 'STAFF'>('STAFF');
  const [password, setPassword] = useState('');

  const fetchUsersList = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await getUsers({
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        search: search.trim() || undefined,
      });
      setUsers(data || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load team members');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roleFilter, search]);

  useFocusEffect(
    useCallback(() => {
      fetchUsersList();
    }, [fetchUsersList])
  );

  const handleCreateSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim() || !password.trim()) {
      Alert.alert('Incomplete Form', 'Please provide all details including temporary password.');
      return;
    }
    setSubmitting(true);
    try {
      await createUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        role,
        password: password.trim(),
      });
      Alert.alert('Success', `Staff member ${firstName} has been added to your workspace.`);
      setShowAddModal(false);
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setPassword('');
      fetchUsersList(false);
    } catch (err: any) {
      Alert.alert('Failed to Add Staff', err.message || 'Could not create staff account');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = (u: WorkspaceUser) => {
    if (u.role === 'WORKSPACE_ADMIN') {
      Alert.alert('Protected', 'Primary Workspace Admin status cannot be toggled.');
      return;
    }
    const action = u.is_active ? 'Deactivate' : 'Activate';
    Alert.alert(
      `${action} Member`,
      `Are you sure you want to ${action.toLowerCase()} ${u.first_name} ${u.last_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: u.is_active ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await updateUser(u.id, { isActive: !u.is_active });
              fetchUsersList(false);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Update failed');
            }
          },
        },
      ]
    );
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = `${u.first_name} ${u.last_name}`.toLowerCase().includes(q);
      const matchEmail = u.email.toLowerCase().includes(q);
      const matchPhone = u.phone?.includes(q);
      return matchName || matchEmail || matchPhone;
    }
    return true;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Navigation Bar */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Staff & Team</Text>
          <Text style={styles.subtitle}>{filteredUsers.length} staff & management accounts</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="person-add" size={16} color="#fff" />
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Role Filter Chips */}
      <View style={styles.filterRow}>
        {['ALL', 'MANAGER', 'STAFF'].map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.filterChip, roleFilter === r && styles.filterChipActive]}
            onPress={() => setRoleFilter(r)}
          >
            <Text style={[styles.filterChipText, roleFilter === r && styles.filterChipTextActive]}>
              {r}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search Input */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, email or phone..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading team roster...</Text>
        </View>
      ) : filteredUsers.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No team members found</Text>
          <Text style={styles.emptySubtitle}>
            {search ? 'Try adjusting your search criteria.' : 'Add managers or staff to help operate your PG.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchUsersList(true)}
              tintColor={Colors.accent}
            />
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const roleStyle = ROLE_COLORS[item.role] || { bg: Colors.bg, text: Colors.textSecondary };
            return (
              <View style={styles.userCard}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.first_name?.charAt(0) || 'U'}{item.last_name?.charAt(0) || ''}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.userName}>{item.first_name} {item.last_name}</Text>
                    <View style={styles.badgeRow}>
                      <View style={[styles.roleBadge, { backgroundColor: roleStyle.bg }]}>
                        <Text style={[styles.roleBadgeText, { color: roleStyle.text }]}>
                          {item.role.replace(/_/g, ' ')}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: item.is_active ? Colors.success + '20' : Colors.danger + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: item.is_active ? Colors.success : Colors.danger },
                          ]}
                        >
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.contactDetails}>
                  <View style={styles.contactItem}>
                    <Ionicons name="mail-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.contactText}>{item.email}</Text>
                  </View>
                  <View style={styles.contactItem}>
                    <Ionicons name="call-outline" size={13} color={Colors.textMuted} />
                    <Text style={styles.contactText}>{item.phone || 'No phone'}</Text>
                  </View>
                </View>

                {isAdmin && item.role !== 'WORKSPACE_ADMIN' && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        item.is_active ? styles.actionBtnDeactivate : styles.actionBtnActivate,
                      ]}
                      onPress={() => handleToggleStatus(item)}
                    >
                      <Ionicons
                        name={item.is_active ? 'pause-circle-outline' : 'play-circle-outline'}
                        size={14}
                        color={item.is_active ? Colors.danger : Colors.success}
                      />
                      <Text
                        style={[
                          styles.actionBtnText,
                          { color: item.is_active ? Colors.danger : Colors.success },
                        ]}
                      >
                        {item.is_active ? 'Deactivate' : 'Reactivate'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* Add Staff Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Team Member</Text>
                <Text style={styles.modalSubtitle}>Create credentials for manager or front desk staff</Text>
              </View>
              <TouchableOpacity onPress={() => setShowAddModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.nameRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>First Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Ramesh"
                    placeholderTextColor={Colors.textMuted}
                    value={firstName}
                    onChangeText={setFirstName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Last Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. Kumar"
                    placeholderTextColor={Colors.textMuted}
                    value={lastName}
                    onChangeText={setLastName}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="staff@pgproperty.com"
                placeholderTextColor={Colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>Mobile Phone *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="+91 9876543210"
                placeholderTextColor={Colors.textMuted}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Assigned Role *</Text>
              <View style={styles.rolePicker}>
                <TouchableOpacity
                  style={[styles.roleOption, role === 'STAFF' && styles.roleOptionActive]}
                  onPress={() => setRole('STAFF')}
                >
                  <Ionicons
                    name="construct-outline"
                    size={18}
                    color={role === 'STAFF' ? Colors.accent : Colors.textMuted}
                  />
                  <Text style={[styles.roleOptionText, role === 'STAFF' && styles.roleOptionTextActive]}>
                    Staff (Operations)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleOption, role === 'MANAGER' && styles.roleOptionActive]}
                  onPress={() => setRole('MANAGER')}
                >
                  <Ionicons
                    name="shield-outline"
                    size={18}
                    color={role === 'MANAGER' ? Colors.accent : Colors.textMuted}
                  />
                  <Text style={[styles.roleOptionText, role === 'MANAGER' && styles.roleOptionTextActive]}>
                    Manager (All Except Delete)
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Temporary Password *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Minimum 6 characters"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                onPress={handleCreateSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>Create Account</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  backBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textSecondary },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginVertical: 10,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  filterChipText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  filterChipTextActive: { color: '#fff', fontWeight: '700' },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 42,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 13 },

  listContent: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 32 },
  loadingText: { color: Colors.textSecondary, fontSize: 13 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 8 },
  emptySubtitle: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', maxWidth: 260 },

  userCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.accentLight,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: Colors.accent },
  userName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleBadgeText: { fontSize: 10, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },

  contactDetails: {
    backgroundColor: Colors.bg,
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  contactItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  contactText: { fontSize: 12, color: Colors.textSecondary },

  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnDeactivate: {
    backgroundColor: Colors.danger + '10',
    borderColor: Colors.danger + '30',
  },
  actionBtnActivate: {
    backgroundColor: Colors.success + '10',
    borderColor: Colors.success + '30',
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  modalSubtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  closeBtn: { padding: 6, borderRadius: 20, backgroundColor: Colors.bg },
  modalBody: { padding: 20 },
  nameRow: { flexDirection: 'row', gap: 12 },
  inputLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 4, marginTop: 10 },
  textInput: {
    backgroundColor: Colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  rolePicker: { flexDirection: 'column', gap: 8, marginVertical: 6 },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roleOptionActive: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentLight,
  },
  roleOptionText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  roleOptionTextActive: { color: Colors.accent, fontWeight: '700' },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    marginBottom: 16,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
