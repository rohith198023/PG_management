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

export default function ResidentInvoicesScreen() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Modal states
  const [showProofModal, setShowProofModal] = useState(false);
  const [submittingProof, setSubmittingProof] = useState(false);
  const [proofForm, setProofForm] = useState({
    utrNumber: '',
    proofUrl: '',
    notes: '',
  });

  const [payingOnline, setPayingOnline] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/tenant/invoices');
      setInvoices(res.data.invoices || []);
    } catch (err: any) {
      console.warn('Failed to load invoices:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchInvoices();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleOnlinePayment = async (inv: any) => {
    setPayingOnline(true);
    try {
      const due = Number(inv.total_amount) - Number(inv.amount_paid);

      // 1. Initialize Checkout Order
      const checkoutRes = await api.post('/api/payments/checkout', {
        invoiceId: inv.id,
        gatewayProvider: 'razorpay',
        customAmount: due,
      });

      const orderData = checkoutRes.data;

      // 2. Confirm payment
      const paymentRef = `pay_mob_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const confirmRes = await api.post('/api/payments/confirm', {
        invoiceId: inv.id,
        orderId: orderData.orderId,
        paymentId: paymentRef,
        signature: `sig_verified_${orderData.orderId}`,
        amount: due,
        gatewayProvider: 'razorpay',
      });

      Alert.alert(
        'Payment Successful! 🎉',
        `Payment of ₹${due} verified and processed. Receipt #${confirmRes.data.receiptNumber || 'REC'} issued.`
      );
      fetchInvoices();
      setSelectedInvoice(null);
    } catch (err: any) {
      Alert.alert('Payment Error', err.response?.data?.error || err.message || 'Failed to process payment');
    } finally {
      setPayingOnline(false);
    }
  };

  const handleProofSubmit = async () => {
    if (!proofForm.proofUrl) {
      Alert.alert('Error', 'Please provide a proof image URL or screenshot link.');
      return;
    }

    setSubmittingProof(true);
    try {
      await api.post('/api/payments/proof', {
        invoiceId: selectedInvoice.id,
        proofImageUrl: proofForm.proofUrl,
        utrNumber: proofForm.utrNumber || undefined,
        notes: proofForm.notes || undefined,
      });

      Alert.alert('Proof Submitted! ✅', 'Your payment proof has been submitted for owner verification.');
      setShowProofModal(false);
      setProofForm({ utrNumber: '', proofUrl: '', notes: '' });
      fetchInvoices();
      setSelectedInvoice(null);
    } catch (err: any) {
      Alert.alert('Upload Error', err.response?.data?.error || err.message || 'Failed to submit proof');
    } finally {
      setSubmittingProof(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Invoices & Payments</Text>
          <Text style={styles.subtitle}>Track dues, pay online, or upload payment receipts</Text>
        </View>
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
          {invoices.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={36} color="#64748B" />
              <Text style={styles.emptyTitle}>No Invoices Issued</Text>
              <Text style={styles.emptySubtitle}>You have no rental invoices or charges on record.</Text>
            </View>
          ) : (
            invoices.map((inv) => {
              const due = Number(inv.total_amount) - Number(inv.amount_paid);
              const isPaid = inv.status === 'PAID';
              const isOverdue = inv.status === 'OVERDUE';

              return (
                <TouchableOpacity
                  key={inv.id}
                  style={[styles.invoiceCard, isPaid ? styles.cardPaid : isOverdue ? styles.cardOverdue : null]}
                  onPress={() => setSelectedInvoice(inv)}
                >
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.invoiceNumber}>#{inv.invoice_number}</Text>
                      <Text style={styles.invoiceDate}>
                        Due: {new Date(inv.due_date).toLocaleDateString()}
                      </Text>
                    </View>

                    <View style={[
                      styles.statusBadge,
                      isPaid ? styles.badgePaid : isOverdue ? styles.badgeOverdue : styles.badgeIssued,
                    ]}>
                      <Ionicons
                        name={isPaid ? 'checkmark-circle' : 'time-outline'}
                        size={12}
                        color={isPaid ? '#34D399' : '#FBBF24'}
                      />
                      <Text style={[
                        styles.statusText,
                        isPaid ? styles.textPaid : isOverdue ? styles.textOverdue : styles.textIssued,
                      ]}>
                        {inv.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.amountRow}>
                    <View>
                      <Text style={styles.amountLabel}>Total Bill</Text>
                      <Text style={styles.amountValue}>₹{Number(inv.total_amount).toLocaleString('en-IN')}</Text>
                    </View>

                    {!isPaid && (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.amountLabel}>Remaining Due</Text>
                        <Text style={[styles.amountValue, { color: '#F87171' }]}>
                          ₹{due.toLocaleString('en-IN')}
                        </Text>
                      </View>
                    )}
                  </View>

                  {!isPaid && (
                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={styles.payBtn}
                        onPress={() => handleOnlinePayment(inv)}
                        disabled={payingOnline}
                      >
                        <Ionicons name="card-outline" size={14} color="#FFFFFF" />
                        <Text style={styles.payBtnText}>Pay Online</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.proofBtn}
                        onPress={() => {
                          setSelectedInvoice(inv);
                          setShowProofModal(true);
                        }}
                      >
                        <Ionicons name="cloud-upload-outline" size={14} color="#A5B4FC" />
                        <Text style={styles.proofBtnText}>Upload Proof</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Upload Proof Modal */}
      <Modal visible={showProofModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Payment Proof</Text>
              <TouchableOpacity onPress={() => setShowProofModal(false)}>
                <Ionicons name="close" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Invoice #{selectedInvoice?.invoice_number} • Due: ₹
              {(Number(selectedInvoice?.total_amount || 0) - Number(selectedInvoice?.amount_paid || 0)).toLocaleString('en-IN')}
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>UTR / UPI Reference Number (12 digits)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 324105928103"
                placeholderTextColor="#64748B"
                value={proofForm.utrNumber}
                onChangeText={(t) => setProofForm({ ...proofForm, utrNumber: t })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Proof Image URL / Screenshot Link *</Text>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                placeholderTextColor="#64748B"
                value={proofForm.proofUrl}
                onChangeText={(t) => setProofForm({ ...proofForm, proofUrl: t })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Notes / Payment Remarks (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Paid via Google Pay"
                placeholderTextColor="#64748B"
                value={proofForm.notes}
                onChangeText={(t) => setProofForm({ ...proofForm, notes: t })}
              />
            </View>

            <TouchableOpacity
              style={styles.submitModalBtn}
              onPress={handleProofSubmit}
              disabled={submittingProof}
            >
              {submittingProof ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitModalBtnText}>Submit for Verification</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  header: {
    padding: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
    gap: 12,
  },
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E2E8F0',
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  invoiceCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    gap: 12,
  },
  cardPaid: {
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  cardOverdue: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: '#12111D',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  invoiceDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgePaid: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  badgeOverdue: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  badgeIssued: {
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  textPaid: { color: '#34D399' },
  textOverdue: { color: '#F87171' },
  textIssued: { color: '#FBBF24' },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 10,
  },
  amountLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  payBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  proofBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.25)',
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  proofBtnText: {
    color: '#A5B4FC',
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 20,
    paddingBottom: 36,
    gap: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalSub: {
    fontSize: 12,
    color: '#94A3B8',
  },
  formGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
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
  submitModalBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  submitModalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
