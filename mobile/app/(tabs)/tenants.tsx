import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, RefreshControl, StyleSheet,
  TouchableOpacity, ActivityIndicator, TextInput, Modal,
  ScrollView, Alert, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getTenants, getProperties, createAdmissionInvite, getAdmissionInvites, processMoveOut } from '@/services/endpoints';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/colors';
import { API_URL } from '@/constants/config';
import type { Tenant, Property, Floor, Room, Bed } from '@/types';
import { useFocusEffect } from 'expo-router';

interface VacantBedOption {
  id: string;
  propertyName: string;
  roomNumber: string;
  bedNumber: string;
  defaultRent: number;
  defaultDeposit: number;
}

function TenantCard({
  tenant,
  isAdminOrManager,
  onMoveOut,
}: {
  tenant: any;
  isAdminOrManager?: boolean;
  onMoveOut?: (tenant: any) => void;
}) {
  const activeLease = tenant.leases?.[0];
  const fullName = `${tenant.user?.first_name || ''} ${tenant.user?.last_name || ''}`.trim() || 'Resident';
  const location = tenant.bed
    ? `${tenant.bed.room?.property?.name || 'Property'} · Room ${tenant.bed.room?.room_number || 'N/A'} · Bed ${tenant.bed.bed_number || 'N/A'}`
    : 'No bed assigned';

  const idType = tenant.id_proof_type || 'Aadhaar';
  const idNumber = tenant.id_proof_number;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {tenant.user?.first_name?.charAt(0) || 'T'}{tenant.user?.last_name?.charAt(0) || ''}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{fullName}</Text>
          <Text style={styles.email}>{tenant.user?.email}</Text>
        </View>
        <View style={styles.badgeGroup}>
          <View style={[styles.badge, { backgroundColor: tenant.user?.is_active ? Colors.success + '20' : Colors.danger + '20' }]}>
            <Text style={[styles.badgeText, { color: tenant.user?.is_active ? Colors.success : Colors.danger }]}>
              {tenant.user?.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
          <View style={styles.kycBadge}>
            <Ionicons name="shield-checkmark" size={11} color={Colors.accent} />
            <Text style={styles.kycBadgeText}>KYC</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.infoText} numberOfLines={1}>{location}</Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="call-outline" size={14} color={Colors.textMuted} />
        <Text style={styles.infoText}>{tenant.user?.phone || 'No phone'}</Text>
      </View>

      {idNumber && (
        <View style={styles.idRow}>
          <Ionicons name="card-outline" size={13} color={Colors.textSecondary} />
          <Text style={styles.idText}>
            ID Proof ({idType}): <Text style={styles.idValue}>{idNumber}</Text>
          </Text>
        </View>
      )}

      {activeLease && (
        <View style={styles.leaseRow}>
          <Ionicons name="document-text-outline" size={14} color={Colors.accent} />
          <Text style={styles.leaseText}>
            Rent: ₹{Number(activeLease.rent_amount).toLocaleString()}/mo ·
            {' '}{new Date(activeLease.start_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
            {activeLease.end_date ? ` – ${new Date(activeLease.end_date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}` : ' (Active Stay)'}
          </Text>
        </View>
      )}

      {isAdminOrManager && tenant.bed_id && (
        <View style={styles.cardActionsRow}>
          <TouchableOpacity
            style={styles.moveOutBtn}
            onPress={() => onMoveOut?.(tenant)}
            activeOpacity={0.7}
          >
            <Ionicons name="exit-outline" size={13} color={Colors.danger} />
            <Text style={styles.moveOutBtnText}>Initiate Move-Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export default function TenantsScreen() {
  const { user } = useAuth();
  const isAdminOrManager = user?.role === 'WORKSPACE_ADMIN' || user?.role === 'MANAGER';

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Allocation Modal State
  const [showModal, setShowModal] = useState(false);
  const [vacantBeds, setVacantBeds] = useState<VacantBedOption[]>([]);
  const [loadingBeds, setLoadingBeds] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [selectedBedId, setSelectedBedId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [rentAmount, setRentAmount] = useState('8500');
  const [depositAmount, setDepositAmount] = useState('15000');

  // Success Link State
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);

  // Move-Out Modal State
  const [moveOutTenant, setMoveOutTenant] = useState<any | null>(null);
  const [damageDeduction, setDamageDeduction] = useState('0');
  const [deductionNotes, setDeductionNotes] = useState('');
  const [refundMethod, setRefundMethod] = useState<'BANK_TRANSFER' | 'UPI' | 'CASH' | 'ADJUSTED'>('BANK_TRANSFER');
  const [moveOutSubmitting, setMoveOutSubmitting] = useState(false);

  const handleMoveOutSubmit = async () => {
    if (!moveOutTenant) return;
    setMoveOutSubmitting(true);
    try {
      const res = await processMoveOut(moveOutTenant.id, {
        damageDeduction: Number(damageDeduction) || 0,
        deductionNotes: deductionNotes.trim(),
        refundMethod,
      });
      Alert.alert(
        'Move-Out Completed',
        `Stay terminated and bed released back to VACANT. Net Refund: ₹${res.settlement?.netRefundable ?? 0}`
      );
      setMoveOutTenant(null);
      setDamageDeduction('0');
      setDeductionNotes('');
      fetchTenants(false);
    } catch (e: any) {
      Alert.alert('Move-Out Error', e.message || 'Failed to process move-out');
    } finally {
      setMoveOutSubmitting(false);
    }
  };

  const fetchTenants = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [tenantsData, invitesData] = await Promise.all([
        getTenants(),
        getAdmissionInvites().catch(() => ({ invites: [] })),
      ]);
      setTenants(tenantsData || []);
      setFiltered(tenantsData || []);
      setInvites(invitesData?.invites || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load tenants');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchTenants(); }, [fetchTenants]));

  const onSearch = (text: string) => {
    setSearch(text);
    const q = text.toLowerCase();
    setFiltered(tenants.filter(t =>
      `${t.user?.first_name} ${t.user?.last_name}`.toLowerCase().includes(q) ||
      t.user?.email?.toLowerCase().includes(q) ||
      t.user?.phone?.includes(q)
    ));
  };

  const openAllocateModal = async () => {
    setShowModal(true);
    setCreatedInviteUrl(null);
    setLoadingBeds(true);
    try {
      const properties: Property[] = await getProperties();
      const bedsList: VacantBedOption[] = [];
      properties.forEach(p => {
        p.floors?.forEach(f => {
          f.rooms?.forEach(r => {
            r.beds?.forEach(b => {
              if (b.status === 'VACANT') {
                bedsList.push({
                  id: b.id,
                  propertyName: p.name,
                  roomNumber: r.room_number,
                  bedNumber: b.bed_number,
                  defaultRent: Number(r.rent_amount) || 8500,
                  defaultDeposit: Number(r.deposit_amount) || 15000,
                });
              }
            });
          });
        });
      });
      setVacantBeds(bedsList);
      if (bedsList.length > 0) {
        setSelectedBedId(bedsList[0].id);
        setRentAmount(String(bedsList[0].defaultRent));
        setDepositAmount(String(bedsList[0].defaultDeposit));
      }
    } catch (e: any) {
      Alert.alert('Error', 'Failed to load property inventory');
    } finally {
      setLoadingBeds(false);
    }
  };

  const handleBedSelect = (bed: VacantBedOption) => {
    setSelectedBedId(bed.id);
    setRentAmount(String(bed.defaultRent));
    setDepositAmount(String(bed.defaultDeposit));
  };

  const handleAllocateSubmit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone.trim()) {
      Alert.alert('Missing Details', 'Please fill in resident name, email, and phone number.');
      return;
    }
    if (!selectedBedId) {
      Alert.alert('No Bed Selected', 'Please choose a vacant room and bed to allocate.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createAdmissionInvite({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        bedId: selectedBedId,
        rentAmount: Number(rentAmount) || 8500,
        depositAmount: Number(depositAmount) || 15000,
      });

      setCreatedInviteUrl(result.publicAdmissionUrl);
      fetchTenants(false);
    } catch (e: any) {
      Alert.alert('Allocation Failed', e.message || 'Could not allocate bed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareInvite = async (urlToShare?: string, residentName?: string) => {
    const targetUrl = urlToShare || createdInviteUrl;
    if (!targetUrl) return;
    try {
      await Share.share({
        title: 'PG Room Allocation & Digital Admission Link',
        message: `Hello ${residentName || firstName}! You have been allocated a bed at Royal Living PG. Please complete your digital KYC and onboarding here:\n${targetUrl}`,
      });
    } catch {
      // User cancelled share
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Tenants & Admission</Text>
          <Text style={styles.subtitle}>{tenants.length} active residents · {invites.length} pending invites</Text>
        </View>
        {isAdminOrManager && (
          <TouchableOpacity style={styles.allocateTopBtn} onPress={openAllocateModal} activeOpacity={0.8}>
            <Ionicons name="person-add" size={16} color="#fff" />
            <Text style={styles.allocateTopBtnText}>+ Add Tenant</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Pending Admission Invites Section (Matches Web Parity) */}
      {invites.length > 0 && (
        <View style={styles.invitesSection}>
          <View style={styles.invitesHeader}>
            <Ionicons name="time" size={15} color={Colors.accent} />
            <Text style={styles.invitesTitle}>Pending Digital Admission Invites ({invites.length})</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.invitesScroll}>
            {invites.map((inv: any) => {
              const admissionLink = `${API_URL}/admission/${inv.token}`;
              return (
                <View key={inv.id} style={styles.inviteCard}>
                  <View style={styles.inviteCardTop}>
                    <Text style={styles.inviteName} numberOfLines={1}>{inv.first_name} {inv.last_name}</Text>
                    <View style={styles.reservedTag}>
                      <Text style={styles.reservedTagText}>RESERVED</Text>
                    </View>
                  </View>
                  <Text style={styles.inviteLocation}>
                    Room {inv.bed?.room?.room_number || 'N/A'} (Bed {inv.bed?.bed_number || 'N/A'})
                  </Text>
                  <Text style={styles.inviteRent}>₹{Number(inv.rent_amount).toLocaleString()}/mo</Text>
                  <TouchableOpacity
                    style={styles.inviteShareBtn}
                    onPress={() => handleShareInvite(admissionLink, `${inv.first_name} ${inv.last_name}`)}
                  >
                    <Ionicons name="share-outline" size={13} color="#fff" />
                    <Text style={styles.inviteShareText}>Share Admission Link</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, email or phone..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={onSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setFiltered(tenants); }}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading tenant directory...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline" size={40} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchTenants()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>{search ? 'No tenants match your search' : 'No active tenants yet'}</Text>
          {isAdminOrManager && (
            <TouchableOpacity style={styles.retryBtn} onPress={openAllocateModal}>
              <Text style={styles.retryText}>+ Add First Tenant</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TenantCard
              tenant={item}
              isAdminOrManager={isAdminOrManager}
              onMoveOut={(t) => {
                setMoveOutTenant(t);
                setDamageDeduction('0');
                setDeductionNotes('');
              }}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchTenants(true)} tintColor={Colors.accent} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* ── Room & Bed Allocation / Add Tenant Modal ───────────────────────── */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Add Tenant & Allocate Bed</Text>
                <Text style={styles.modalSubtitle}>Select vacant bed & generate tokenized admission link</Text>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {createdInviteUrl ? (
                /* Success View */
                <View style={styles.successCard}>
                  <View style={styles.successIcon}>
                    <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
                  </View>
                  <Text style={styles.successTitle}>Bed Reserved & Link Created!</Text>
                  <Text style={styles.successDesc}>
                    Bed has been reserved for {firstName} {lastName}. Send this digital admission link to the resident. When they open it, they will verify KYC, create their password, and immediately be able to log into the Residence Portal!
                  </Text>
                  <View style={styles.linkBox}>
                    <Text style={styles.linkText} numberOfLines={2}>{createdInviteUrl}</Text>
                  </View>
                  <TouchableOpacity style={styles.shareBtn} onPress={() => handleShareInvite()}>
                    <Ionicons name="share-social" size={18} color="#fff" />
                    <Text style={styles.shareBtnText}>Share Link via WhatsApp / SMS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.doneBtn} onPress={() => setShowModal(false)}>
                    <Text style={styles.doneBtnText}>Done</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* Allocation Form */
                <>
                  {/* Vacant Bed Selector */}
                  <Text style={styles.formLabel}>1. Select Vacant Room & Bed *</Text>
                  {loadingBeds ? (
                    <ActivityIndicator color={Colors.accent} style={{ marginVertical: 12 }} />
                  ) : vacantBeds.length === 0 ? (
                    <View style={styles.emptyBedsWarning}>
                      <Ionicons name="alert-circle" size={20} color={Colors.warning} />
                      <Text style={styles.emptyBedsText}>No vacant beds available in inventory.</Text>
                    </View>
                  ) : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bedList}>
                      {vacantBeds.map(b => {
                        const isSelected = selectedBedId === b.id;
                        return (
                          <TouchableOpacity
                            key={b.id}
                            style={[styles.bedChip, isSelected && styles.bedChipSelected]}
                            onPress={() => handleBedSelect(b)}
                          >
                            <View style={styles.bedChipTop}>
                              <Ionicons name="bed" size={16} color={isSelected ? '#fff' : Colors.accent} />
                              <Text style={[styles.bedChipNum, isSelected && { color: '#fff' }]}>
                                Bed {b.bedNumber}
                              </Text>
                            </View>
                            <Text style={[styles.bedChipRoom, isSelected && { color: '#e0e7ff' }]}>
                              Room {b.roomNumber}
                            </Text>
                            <Text style={[styles.bedChipProp, isSelected && { color: '#c7d2fe' }]} numberOfLines={1}>
                              {b.propertyName}
                            </Text>
                            <Text style={[styles.bedChipRent, isSelected && { color: '#fff' }]}>
                              ₹{b.defaultRent}/mo
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}

                  {/* Resident Info */}
                  <Text style={[styles.formLabel, { marginTop: 16 }]}>2. Resident Details *</Text>
                  <View style={styles.inputRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputSubLabel}>First Name</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Rahul"
                        placeholderTextColor={Colors.textMuted}
                        value={firstName}
                        onChangeText={setFirstName}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputSubLabel}>Last Name</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="e.g. Verma"
                        placeholderTextColor={Colors.textMuted}
                        value={lastName}
                        onChangeText={setLastName}
                      />
                    </View>
                  </View>

                  <Text style={styles.inputSubLabel}>Email Address</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. rahul@example.com"
                    placeholderTextColor={Colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />

                  <Text style={styles.inputSubLabel}>Phone Number</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. +91 9876543210"
                    placeholderTextColor={Colors.textMuted}
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                  />

                  {/* Rent & Deposit */}
                  <Text style={[styles.formLabel, { marginTop: 16 }]}>3. Financial Agreement</Text>
                  <View style={styles.inputRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputSubLabel}>Monthly Rent (₹)</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="8500"
                        placeholderTextColor={Colors.textMuted}
                        value={rentAmount}
                        onChangeText={setRentAmount}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputSubLabel}>Security Deposit (₹)</Text>
                      <TextInput
                        style={styles.textInput}
                        placeholder="15000"
                        placeholderTextColor={Colors.textMuted}
                        value={depositAmount}
                        onChangeText={setDepositAmount}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  {/* Submit Button */}
                  <TouchableOpacity
                    style={[styles.submitBtn, (submitting || vacantBeds.length === 0) && { opacity: 0.6 }]}
                    onPress={handleAllocateSubmit}
                    disabled={submitting || vacantBeds.length === 0}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="key" size={18} color="#fff" />
                        <Text style={styles.submitBtnText}>Generate Link & Reserve Bed</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Move-Out & Settlement Modal ─────────────────────────────── */}
      <Modal visible={!!moveOutTenant} animationType="slide" transparent onRequestClose={() => setMoveOutTenant(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Initiate Move-Out</Text>
                <Text style={styles.modalSubtitle}>
                  {moveOutTenant?.user?.first_name} {moveOutTenant?.user?.last_name} · Room {moveOutTenant?.bed?.room?.room_number || 'N/A'} (Bed {moveOutTenant?.bed?.bed_number || 'N/A'})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setMoveOutTenant(null)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.settlementBanner}>
                <Ionicons name="information-circle" size={18} color={Colors.accent} />
                <Text style={styles.settlementBannerText}>
                  Moving out terminates the active lease, releases the bed back to VACANT, balances the deposit ledger, and halts future billing.
                </Text>
              </View>

              <Text style={[styles.formLabel, { marginTop: 12 }]}>Deposit & Deductions</Text>
              <Text style={styles.inputSubLabel}>Damage / Repair Deductions (₹)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                value={damageDeduction}
                onChangeText={setDamageDeduction}
                keyboardType="numeric"
              />

              <Text style={styles.inputSubLabel}>Deduction Reason / Notes</Text>
              <TextInput
                style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                placeholder="e.g. Wall painting or key replacement"
                placeholderTextColor={Colors.textMuted}
                value={deductionNotes}
                onChangeText={setDeductionNotes}
                multiline
              />

              <Text style={styles.inputSubLabel}>Refund Method</Text>
              <View style={styles.refundMethodsRow}>
                {(['BANK_TRANSFER', 'UPI', 'CASH', 'ADJUSTED'] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.refundMethodChip, refundMethod === m && styles.refundMethodChipSelected]}
                    onPress={() => setRefundMethod(m)}
                  >
                    <Text style={[styles.refundMethodText, refundMethod === m && styles.refundMethodTextSelected]}>
                      {m.replace(/_/g, ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.confirmMoveOutBtn, moveOutSubmitting && { opacity: 0.6 }]}
                onPress={handleMoveOutSubmit}
                disabled={moveOutSubmitting}
              >
                {moveOutSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#fff" />
                    <Text style={styles.confirmMoveOutBtnText}>Confirm Move-Out & Settlement</Text>
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  allocateTopBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.accent, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10,
  },
  allocateTopBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Pending Invites
  invitesSection: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.accent + '40',
    padding: 12,
  },
  invitesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  invitesTitle: { fontSize: 12, fontWeight: '700', color: Colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  invitesScroll: { flexDirection: 'row' },
  inviteCard: {
    backgroundColor: Colors.bg, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    padding: 10, marginRight: 8, width: 210,
  },
  inviteCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  inviteName: { flex: 1, fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  reservedTag: { backgroundColor: Colors.warning + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  reservedTagText: { fontSize: 9, fontWeight: '800', color: Colors.warning },
  inviteLocation: { fontSize: 11, color: Colors.textMuted },
  inviteRent: { fontSize: 12, fontWeight: '700', color: Colors.success, marginVertical: 4 },
  inviteShareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    backgroundColor: Colors.accent, borderRadius: 6, paddingVertical: 5, marginTop: 4,
  },
  inviteShareText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.bgCard, borderRadius: 12,
    paddingHorizontal: 14, height: 44,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  loadingText: { color: Colors.textSecondary },
  errorText: { color: Colors.danger, textAlign: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 15, textAlign: 'center' },
  retryBtn: { backgroundColor: Colors.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
  retryText: { color: Colors.white, fontWeight: '700' },

  card: {
    backgroundColor: Colors.bgCard, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.accentLight, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.accentBorder,
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: Colors.accent },
  name: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  email: { fontSize: 12, color: Colors.textSecondary },
  badgeGroup: { alignItems: 'flex-end', gap: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  kycBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.accent + '15', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  kycBadgeText: { fontSize: 9, fontWeight: '700', color: Colors.accent },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { flex: 1, fontSize: 13, color: Colors.textSecondary },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.bg, padding: 8, borderRadius: 8 },
  idText: { fontSize: 11, color: Colors.textMuted },
  idValue: { fontFamily: 'monospace', color: Colors.textPrimary, fontWeight: '600' },
  leaseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.accentLight, padding: 10, borderRadius: 10,
  },
  leaseText: { flex: 1, fontSize: 12, color: Colors.accent },

  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: '90%', paddingBottom: 24,
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
  formLabel: { fontSize: 14, fontWeight: '700', color: Colors.accent, marginBottom: 8 },
  inputSubLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4, marginTop: 8 },
  textInput: {
    backgroundColor: Colors.bg, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
    color: Colors.textPrimary, fontSize: 14,
  },
  inputRow: { flexDirection: 'row', gap: 12 },

  // Bed selector
  bedList: { flexDirection: 'row', marginVertical: 6 },
  bedChip: {
    backgroundColor: Colors.bg, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.border,
    padding: 12, marginRight: 10, width: 140,
  },
  bedChipSelected: {
    backgroundColor: Colors.accent, borderColor: Colors.accent,
  },
  bedChipTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  bedChipNum: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },
  bedChipRoom: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  bedChipProp: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  bedChipRent: { fontSize: 12, fontWeight: '700', color: Colors.success, marginTop: 6 },
  emptyBedsWarning: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.warning + '15', padding: 12, borderRadius: 10,
  },
  emptyBedsText: { flex: 1, fontSize: 12, color: Colors.warning },

  // Submit
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent, borderRadius: 12,
    paddingVertical: 14, marginTop: 24, marginBottom: 20,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // Success Card
  successCard: { alignItems: 'center', paddingVertical: 20 },
  successIcon: { marginBottom: 12 },
  successTitle: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  successDesc: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  linkBox: {
    backgroundColor: Colors.bg, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    padding: 12, width: '100%', marginBottom: 16,
  },
  linkText: { fontSize: 12, color: Colors.accent, textAlign: 'center' },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.success, borderRadius: 12,
    paddingVertical: 14, width: '100%', marginBottom: 10,
  },
  shareBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  doneBtn: {
    paddingVertical: 12, width: '100%', alignItems: 'center',
    borderRadius: 12, backgroundColor: Colors.bg,
    borderWidth: 1, borderColor: Colors.border,
  },
  doneBtnText: { color: Colors.textPrimary, fontSize: 14, fontWeight: '600' },

  // Card Action & Move-Out Styles
  cardActionsRow: {
    flexDirection: 'row', justifyContent: 'flex-end',
    borderTopWidth: 1, borderTopColor: Colors.border,
    paddingTop: 10, marginTop: 4,
  },
  moveOutBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.danger + '15',
    borderWidth: 1, borderColor: Colors.danger + '30',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 8,
  },
  moveOutBtnText: { fontSize: 12, fontWeight: '700', color: Colors.danger },

  // Settlement Modal
  settlementBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.accent + '15',
    borderWidth: 1, borderColor: Colors.accent + '30',
    padding: 12, borderRadius: 10, marginBottom: 8,
  },
  settlementBannerText: { flex: 1, fontSize: 12, color: Colors.accent, lineHeight: 16 },
  refundMethodsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  refundMethodChip: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, backgroundColor: Colors.bg,
    borderWidth: 1, borderColor: Colors.border,
  },
  refundMethodChipSelected: {
    backgroundColor: Colors.accent, borderColor: Colors.accent,
  },
  refundMethodText: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  refundMethodTextSelected: { color: '#fff', fontWeight: '700' },
  confirmMoveOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.danger, borderRadius: 12,
    paddingVertical: 14, marginTop: 24, marginBottom: 20,
  },
  confirmMoveOutBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
