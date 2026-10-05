import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, RefreshControl, StyleSheet,
  TouchableOpacity, ActivityIndicator, Modal, TextInput,
  ScrollView, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  getInvoices, getTenantInvoices, runBillingEngine,
  createManualInvoice, uploadPaymentProof, getTenants,
} from '@/services/endpoints';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/colors';
import type { Invoice, Tenant } from '@/types';
import { useFocusEffect } from 'expo-router';

const STATUS_CONFIG: Record<string, { color: string; icon: string; label: string }> = {
  DRAFT:          { color: Colors.textMuted, icon: 'document-outline', label: 'Draft' },
  ISSUED:         { color: Colors.info,      icon: 'document-text',   label: 'Issued' },
  PARTIALLY_PAID: { color: Colors.warning,   icon: 'time',            label: 'Partial' },
  PAID:           { color: Colors.success,   icon: 'checkmark-circle', label: 'Paid' },
  OVERDUE:        { color: Colors.danger,    icon: 'alert-circle',    label: 'Overdue' },
  CANCELLED:      { color: Colors.textMuted, icon: 'close-circle',    label: 'Cancelled' },
};

function InvoiceCard({
  invoice,
  defaultPropertyName,
  isTenant,
  onPayProof,
}: {
  invoice: Invoice;
  defaultPropertyName?: string;
  isTenant?: boolean;
  onPayProof?: (inv: Invoice) => void;
}) {
  const cfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.ISSUED;
  const tenant = invoice.tenant?.user;
  const property = invoice.tenant?.bed?.room?.property?.name || defaultPropertyName;
  const outstanding = Number(invoice.total_amount) - Number(invoice.amount_paid);
  const isOverdue = new Date(invoice.due_date) < new Date() && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';
  const isUnpaid = invoice.status !== 'PAID' && invoice.status !== 'CANCELLED';

  return (
    <View style={[styles.card, isOverdue && styles.cardOverdue]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.invoiceNum}>{invoice.invoice_number}</Text>
          {tenant && <Text style={styles.tenantName}>{tenant.first_name} {tenant.last_name}</Text>}
          {property && <Text style={styles.propName}>{property}</Text>}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
          <Ionicons name={cfg.icon as any} size={12} color={cfg.color} />
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.amountRow}>
        <View>
          <Text style={styles.amountLabel}>Total Billed</Text>
          <Text style={styles.amount}>₹{Number(invoice.total_amount).toLocaleString()}</Text>
        </View>
        <View>
          <Text style={styles.amountLabel}>Paid</Text>
          <Text style={[styles.amount, { color: Colors.success }]}>₹{Number(invoice.amount_paid).toLocaleString()}</Text>
        </View>
        <View>
          <Text style={styles.amountLabel}>Outstanding Dues</Text>
          <Text style={[styles.amount, { color: outstanding > 0 ? Colors.danger : Colors.success }]}>
            ₹{outstanding.toLocaleString()}
          </Text>
        </View>
      </View>

      <View style={styles.dateRow}>
        <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
        <Text style={styles.dateText}>
          Issued {new Date(invoice.issue_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
        <Text style={[styles.dateText, { color: isOverdue ? Colors.danger : Colors.textMuted }]}>
          · Due {new Date(invoice.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          {isOverdue ? ' (OVERDUE)' : ''}
        </Text>
      </View>

      {/* Tenant Action: Upload Proof */}
      {isTenant && isUnpaid && onPayProof && (
        <TouchableOpacity style={styles.payProofBtn} onPress={() => onPayProof(invoice)} activeOpacity={0.8}>
          <Ionicons name="cloud-upload" size={14} color="#fff" />
          <Text style={styles.payProofBtnText}>Upload Payment Proof (UPI / UTR)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const FILTERS = ['ALL', 'ISSUED', 'PARTIALLY_PAID', 'OVERDUE', 'PAID'];

export default function InvoicesScreen() {
  const { user } = useAuth();
  const isTenant = user?.role === 'TENANT';
  const isAdminOrManager = user?.role === 'WORKSPACE_ADMIN' || user?.role === 'MANAGER';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [tenantPropertyName, setTenantPropertyName] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('ALL');

  // Admin Monthly Billing State
  const [runningBilling, setRunningBilling] = useState(false);

  // Admin Manual Invoice Modal State
  const [showManualModal, setShowManualModal] = useState(false);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState('');
  const [manualDesc, setManualDesc] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualDueDays, setManualDueDays] = useState('7');
  const [creatingManual, setCreatingManual] = useState(false);

  // Tenant Payment Proof Modal State
  const [showProofModal, setShowProofModal] = useState(false);
  const [selectedInvoiceForProof, setSelectedInvoiceForProof] = useState<Invoice | null>(null);
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [submittingProof, setSubmittingProof] = useState(false);

  const fetchInvoices = useCallback(async (isRefresh = false, statusFilter = activeFilter) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      if (user?.role === 'TENANT') {
        const data = await getTenantInvoices();
        let list = data.invoices || [];
        if (statusFilter !== 'ALL') {
          list = list.filter((inv: any) => inv.status === statusFilter);
        }
        setInvoices(list);
        setTenantPropertyName(data.tenant?.bed?.room?.property?.name);
        setMetrics(null);
      } else {
        try {
          const data = await getInvoices(statusFilter !== 'ALL' ? { status: statusFilter } : undefined);
          setInvoices(data.invoices || []);
          setMetrics(data.metrics || null);
        } catch (adminErr: any) {
          const errText = (adminErr?.message || '').toLowerCase();
          if (errText.includes('forbidden') || errText.includes('permission') || adminErr?.response?.status === 403) {
            const data = await getTenantInvoices();
            let list = data.invoices || [];
            if (statusFilter !== 'ALL') {
              list = list.filter((inv: any) => inv.status === statusFilter);
            }
            setInvoices(list);
            setTenantPropertyName(data.tenant?.bed?.room?.property?.name);
            setMetrics(null);
          } else {
            throw adminErr;
          }
        }
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, user?.role]);

  useFocusEffect(useCallback(() => { fetchInvoices(); }, [fetchInvoices]));

  const onFilter = (f: string) => {
    setActiveFilter(f);
    fetchInvoices(false, f);
  };

  // Run Automated Recurring Billing
  const handleRunBilling = async () => {
    Alert.alert(
      'Run Monthly Billing Engine ⚡',
      'This will calculate rent dues for all active leases across your properties and generate invoices. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run Billing',
          style: 'default',
          onPress: async () => {
            setRunningBilling(true);
            try {
              const res = await runBillingEngine();
              Alert.alert(
                'Billing Complete ✅',
                `Generated: ${res.generatedCount || 0} invoices\nTotal Billed: ₹${Number(res.totalBilled || 0).toLocaleString()}`
              );
              fetchInvoices(true);
            } catch (e: any) {
              Alert.alert('Billing Failed ❌', e.message || 'Error generating invoices');
            } finally {
              setRunningBilling(false);
            }
          },
        },
      ]
    );
  };

  // Open Manual Invoice Modal
  const openManualModal = async () => {
    setShowManualModal(true);
    setManualDesc('');
    setManualAmount('');
    try {
      const tenants = await getTenants();
      setAvailableTenants(tenants || []);
      if (tenants && tenants.length > 0) {
        setSelectedTenantId(tenants[0].id);
      }
    } catch {
      // Ignored
    }
  };

  // Submit Manual Invoice
  const handleCreateManualSubmit = async () => {
    if (!selectedTenantId) {
      Alert.alert('Missing Tenant', 'Please select a tenant to invoice.');
      return;
    }
    if (!manualDesc.trim()) {
      Alert.alert('Missing Description', 'Please provide an invoice item description.');
      return;
    }
    if (!manualAmount || Number(manualAmount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid invoice amount.');
      return;
    }

    setCreatingManual(true);
    try {
      await createManualInvoice({
        tenantId: selectedTenantId,
        description: manualDesc.trim(),
        amount: Number(manualAmount),
        dueDateDays: Number(manualDueDays) || 7,
      });
      Alert.alert('Success ✅', 'Manual invoice created and added to resident desk.');
      setShowManualModal(false);
      fetchInvoices(true);
    } catch (e: any) {
      Alert.alert('Failed to Create Invoice ❌', e.message || 'Error creating invoice');
    } finally {
      setCreatingManual(false);
    }
  };

  // Open Tenant Proof Upload Modal
  const openProofModal = (inv: Invoice) => {
    setSelectedInvoiceForProof(inv);
    setProofImageUrl('');
    setUtrNumber('');
    setProofNotes('');
    setShowProofModal(true);
  };

  // Submit Payment Proof
  const handleSubmitProof = async () => {
    if (!selectedInvoiceForProof) return;
    if (!proofImageUrl.trim()) {
      Alert.alert('Missing Proof URL', 'Please enter the URL or screenshot link of your payment proof.');
      return;
    }

    setSubmittingProof(true);
    try {
      await uploadPaymentProof({
        invoiceId: selectedInvoiceForProof.id,
        proofImageUrl: proofImageUrl.trim(),
        utrNumber: utrNumber.trim() || undefined,
        notes: proofNotes.trim() || 'Submitted via Mobile App',
      });
      Alert.alert(
        'Proof Submitted ✅',
        'Your payment receipt has been submitted and sent to the manager verification queue.'
      );
      setShowProofModal(false);
      fetchInvoices(true);
    } catch (e: any) {
      Alert.alert('Submission Failed ❌', e.message || 'Could not upload proof');
    } finally {
      setSubmittingProof(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {isTenant ? 'My Rent Invoices & Dues' : 'Invoices & Rent Desk'}
          </Text>
          {isTenant ? (
            <Text style={styles.subtitle}>
              {invoices.length} invoices · Personal rent breakdown & receipts
            </Text>
          ) : metrics ? (
            <Text style={styles.subtitle}>
              {metrics.count} invoices · ₹{Number(metrics.totalPaid).toLocaleString()} collected
            </Text>
          ) : null}
        </View>

        {/* Admin Quick Action Buttons */}
        {isAdminOrManager && (
          <View style={styles.adminActionRow}>
            <TouchableOpacity
              style={[styles.billingBtn, runningBilling && { opacity: 0.6 }]}
              onPress={handleRunBilling}
              disabled={runningBilling}
            >
              {runningBilling ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="flash" size={13} color="#fff" />
                  <Text style={styles.billingBtnText}>Run Billing</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.createInvoiceBtn} onPress={openManualModal}>
              <Ionicons name="add" size={15} color="#fff" />
              <Text style={styles.createInvoiceBtnText}>+ Invoice</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Metrics summary (Admin Only) */}
      {metrics && !loading && !isTenant && (
        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>₹{(metrics.totalIssued / 1000).toFixed(1)}K</Text>
            <Text style={styles.metricLabel}>Billed</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: Colors.success }]}>₹{(metrics.totalPaid / 1000).toFixed(1)}K</Text>
            <Text style={styles.metricLabel}>Collected</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: Colors.danger }]}>₹{(metrics.totalPending / 1000).toFixed(1)}K</Text>
            <Text style={styles.metricLabel}>Pending</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: Colors.accent }]}>{metrics.collectionRate}%</Text>
            <Text style={styles.metricLabel}>Rate</Text>
          </View>
        </View>
      )}

      {/* Status filters */}
      <View style={styles.filterScroll}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => onFilter(f)}
          >
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>
              {f.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline" size={40} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchInvoices()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : invoices.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="receipt-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No invoices found</Text>
          {isAdminOrManager && (
            <TouchableOpacity style={styles.retryBtn} onPress={handleRunBilling}>
              <Text style={styles.retryText}>⚡ Run Automated Billing Now</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={invoices}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <InvoiceCard
              invoice={item}
              defaultPropertyName={tenantPropertyName}
              isTenant={isTenant}
              onPayProof={openProofModal}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchInvoices(true)} tintColor={Colors.accent} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      {/* ── Admin: Create Manual Invoice Modal ─────────────────────────────── */}
      <Modal visible={showManualModal} animationType="slide" transparent onRequestClose={() => setShowManualModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create Custom Invoice</Text>
                <Text style={styles.modalSubtitle}>Bill a tenant for electricity, damages, or guest stay</Text>
              </View>
              <TouchableOpacity onPress={() => setShowManualModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.formLabel}>Select Tenant *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tenantSelectScroll}>
                {availableTenants.map(t => {
                  const isSelected = selectedTenantId === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.tenantChip, isSelected && styles.tenantChipSelected]}
                      onPress={() => setSelectedTenantId(t.id)}
                    >
                      <Text style={[styles.tenantChipName, isSelected && { color: '#fff' }]}>
                        {t.user?.first_name} {t.user?.last_name}
                      </Text>
                      <Text style={[styles.tenantChipRoom, isSelected && { color: '#c7d2fe' }]}>
                        {t.bed ? `Room ${t.bed.room?.room_number}` : 'No bed'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.inputSubLabel, { marginTop: 12 }]}>Item Description *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Monthly Electricity Surcharge / Room Damage Recovery"
                placeholderTextColor={Colors.textMuted}
                value={manualDesc}
                onChangeText={setManualDesc}
              />

              <View style={styles.inputRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputSubLabel}>Amount (₹) *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="1200"
                    placeholderTextColor={Colors.textMuted}
                    value={manualAmount}
                    onChangeText={setManualAmount}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputSubLabel}>Due In (Days)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="7"
                    placeholderTextColor={Colors.textMuted}
                    value={manualDueDays}
                    onChangeText={setManualDueDays}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, creatingManual && { opacity: 0.6 }]}
                onPress={handleCreateManualSubmit}
                disabled={creatingManual}
              >
                {creatingManual ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="receipt" size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>Issue Invoice to Resident</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Tenant: Upload Payment Proof Modal ─────────────────────────────── */}
      <Modal visible={showProofModal} animationType="slide" transparent onRequestClose={() => setShowProofModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Submit Payment Proof</Text>
                <Text style={styles.modalSubtitle}>Upload UPI screenshot & UTR transaction reference</Text>
              </View>
              <TouchableOpacity onPress={() => setShowProofModal(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedInvoiceForProof && (
                <View style={styles.invoiceSummaryBox}>
                  <Text style={styles.invoiceSummaryNum}>Invoice: {selectedInvoiceForProof.invoice_number}</Text>
                  <Text style={styles.invoiceSummaryAmount}>
                    Amount Due: ₹{(Number(selectedInvoiceForProof.total_amount) - Number(selectedInvoiceForProof.amount_paid)).toLocaleString()}
                  </Text>
                </View>
              )}

              <Text style={styles.inputSubLabel}>Payment Proof Image URL *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://imgur.com/screenshot.png or cloud link"
                placeholderTextColor={Colors.textMuted}
                value={proofImageUrl}
                onChangeText={setProofImageUrl}
                autoCapitalize="none"
              />

              <Text style={styles.inputSubLabel}>12-Digit UTR / Transaction Reference</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 423982938492"
                placeholderTextColor={Colors.textMuted}
                value={utrNumber}
                onChangeText={setUtrNumber}
                keyboardType="numeric"
              />

              <Text style={styles.inputSubLabel}>Notes (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Paid via Google Pay to PG Account"
                placeholderTextColor={Colors.textMuted}
                value={proofNotes}
                onChangeText={setProofNotes}
              />

              <TouchableOpacity
                style={[styles.submitBtn, submittingProof && { opacity: 0.6 }]}
                onPress={handleSubmitProof}
                disabled={submittingProof}
              >
                {submittingProof ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>Submit to Manager for Approval</Text>
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
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  adminActionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  billingBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#7c3aed', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
  },
  billingBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  createInvoiceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: Colors.accent, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8,
  },
  createInvoiceBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  metricsRow: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.bgCard, borderRadius: 14,
    padding: 12, borderWidth: 1, borderColor: Colors.border,
  },
  metric: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  metricLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },

  filterScroll: {
    flexDirection: 'row', paddingHorizontal: 16, marginBottom: 12, gap: 8,
  },
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
    padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 12,
  },
  cardOverdue: { borderColor: Colors.danger + '60' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  invoiceNum: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  tenantName: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  propName: { fontSize: 11, color: Colors.textMuted },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  amountRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: Colors.bg, borderRadius: 10, padding: 10,
  },
  amountLabel: { fontSize: 10, color: Colors.textMuted },
  amount: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 11, color: Colors.textMuted },
  payProofBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.accent, paddingVertical: 9, borderRadius: 8, marginTop: 4,
  },
  payProofBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
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
  formLabel: { fontSize: 13, fontWeight: '700', color: Colors.accent, marginBottom: 8 },
  inputSubLabel: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginBottom: 4, marginTop: 10 },
  textInput: {
    backgroundColor: Colors.bg, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
    color: Colors.textPrimary, fontSize: 14,
  },
  inputRow: { flexDirection: 'row', gap: 12 },
  tenantSelectScroll: { flexDirection: 'row', marginVertical: 4 },
  tenantChip: {
    backgroundColor: Colors.bg, borderRadius: 10,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 8, marginRight: 8,
  },
  tenantChipSelected: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  tenantChipName: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },
  tenantChipRoom: { fontSize: 10, color: Colors.textMuted },
  invoiceSummaryBox: {
    backgroundColor: Colors.bg, borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
  },
  invoiceSummaryNum: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  invoiceSummaryAmount: { fontSize: 13, fontWeight: '800', color: Colors.danger, marginTop: 4 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.accent, borderRadius: 12,
    paddingVertical: 14, marginTop: 20,
  },
  submitBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
