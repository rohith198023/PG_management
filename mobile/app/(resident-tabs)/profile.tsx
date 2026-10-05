import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';

export default function ResidentProfileScreen() {
  const { user, workspace, logout } = useAuth();
  const [tenantProfile, setTenantProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [savingKyc, setSavingKyc] = useState(false);

  const [kycForm, setKycForm] = useState({
    idProofType: 'Aadhaar',
    idProofNumber: '',
    idProofUrl: '',
    emergencyContact: '',
  });

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/api/tenant/invoices');
        const tp = res.data.tenant;
        if (tp) {
          setTenantProfile(tp);
          setKycForm({
            idProofType: tp.id_proof_type || 'Aadhaar',
            idProofNumber: tp.id_proof_number || '',
            idProofUrl: tp.id_proof_url || '',
            emergencyContact: tp.emergency_contact || '',
          });
        }
      } catch (err) {
        console.warn('Failed to load profile details:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUpdateKyc = async () => {
    if (!kycForm.idProofNumber || !kycForm.idProofUrl) {
      Alert.alert('Required', 'Please enter both ID proof number and document URL.');
      return;
    }

    setSavingKyc(true);
    try {
      await api.post('/api/tenants/kyc/upload', {
        idProofType: kycForm.idProofType,
        idProofNumber: kycForm.idProofNumber,
        idProofUrl: kycForm.idProofUrl,
      });

      Alert.alert('Saved! ✅', 'Your KYC documents have been updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || err.message || 'Failed to update KYC');
    } finally {
      setSavingKyc(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Resident Profile</Text>
        <Text style={styles.subtitle}>Personal identity, KYC documents & room allocation</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.[0] || 'R'}{user?.lastName?.[0] || ''}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>RESIDENT</Text>
            </View>
          </View>
        </View>

        {/* Room / Property Summary */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Stay Details</Text>

          <View style={styles.row}>
            <Ionicons name="business-outline" size={16} color="#6366F1" />
            <Text style={styles.rowLabel}>Property</Text>
            <Text style={styles.rowVal}>{workspace?.name || 'PG_SAS Coliving'}</Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="bed-outline" size={16} color="#6366F1" />
            <Text style={styles.rowLabel}>Allocated Bed</Text>
            <Text style={styles.rowVal}>
              Room {tenantProfile?.bed?.room?.room_number || '—'} (Bed {tenantProfile?.bed?.bed_number || '—'})
            </Text>
          </View>

          <View style={styles.row}>
            <Ionicons name="call-outline" size={16} color="#6366F1" />
            <Text style={styles.rowLabel}>Registered Phone</Text>
            <Text style={styles.rowVal}>{user?.phone || 'N/A'}</Text>
          </View>
        </View>

        {/* KYC Document Verification */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionTitle}>KYC Verification</Text>
            <View style={styles.verifiedTag}>
              <Ionicons name="shield-checkmark" size={12} color="#10B981" />
              <Text style={styles.verifiedText}>Document On File</Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>ID Proof Type</Text>
            <TextInput
              style={styles.input}
              value={kycForm.idProofType}
              onChangeText={(t) => setKycForm({ ...kycForm, idProofType: t })}
              placeholder="e.g. Aadhaar, Passport, PAN"
              placeholderTextColor="#64748B"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>ID Proof Number</Text>
            <TextInput
              style={styles.input}
              value={kycForm.idProofNumber}
              onChangeText={(t) => setKycForm({ ...kycForm, idProofNumber: t })}
              placeholder="e.g. 1234-5678-9012"
              placeholderTextColor="#64748B"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.inputLabel}>Document Link / Image URL</Text>
            <TextInput
              style={styles.input}
              value={kycForm.idProofUrl}
              onChangeText={(t) => setKycForm({ ...kycForm, idProofUrl: t })}
              placeholder="https://..."
              placeholderTextColor="#64748B"
            />
          </View>

          <TouchableOpacity
            style={styles.saveKycBtn}
            onPress={handleUpdateKyc}
            disabled={savingKyc}
          >
            {savingKyc ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveKycBtnText}>Update KYC Documents</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={16} color="#F87171" />
          <Text style={styles.logoutBtnText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  content: { padding: 16, gap: 14, paddingBottom: 32 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#818CF8',
  },
  userInfo: { flex: 1 },
  userName: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  userEmail: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  roleBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  roleText: { fontSize: 10, color: '#A5B4FC', fontWeight: '700' },
  card: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  verifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    color: '#34D399',
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 8,
  },
  rowLabel: {
    fontSize: 12,
    color: '#94A3B8',
    flex: 1,
  },
  rowVal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  formGroup: { gap: 4 },
  inputLabel: { fontSize: 11, color: '#94A3B8' },
  input: {
    backgroundColor: '#090D16',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 13,
  },
  saveKycBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  saveKycBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
    marginTop: 8,
  },
  logoutBtnText: {
    color: '#F87171',
    fontSize: 14,
    fontWeight: '600',
  },
});
