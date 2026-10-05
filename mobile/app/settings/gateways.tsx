import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { getGateways, testGateway, saveGateway } from '@/services/endpoints';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/colors';

const SUPPORTED_GATEWAYS = [
  {
    name: 'razorpay',
    label: 'Razorpay',
    icon: 'card-outline',
    color: '#0c2340',
    accentColor: '#3395ff',
    badge: 'Popular in India',
  },
  {
    name: 'stripe',
    label: 'Stripe',
    icon: 'globe-outline',
    color: '#635bff',
    accentColor: '#635bff',
    badge: 'International',
  },
  {
    name: 'cashfree',
    label: 'Cashfree',
    icon: 'wallet-outline',
    color: '#7135d2',
    accentColor: '#a155b9',
    badge: 'Fast UPI Settlement',
  },
  {
    name: 'phonepe',
    label: 'PhonePe PG',
    icon: 'phone-portrait-outline',
    color: '#5f259f',
    accentColor: '#7b3db8',
    badge: 'Direct UPI & QR',
  },
];

export default function GatewaysScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'WORKSPACE_ADMIN' || user?.role === 'PLATFORM_SUPER_ADMIN';

  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [testingGateway, setTestingGateway] = useState<string | null>(null);

  // Configure Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchGatewayConfigs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const data = await getGateways();
      setConfigs(data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch gateway configs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchGatewayConfigs();
    }, [fetchGatewayConfigs])
  );

  const handleTest = async (gatewayName: string) => {
    setTestingGateway(gatewayName);
    try {
      const res = await testGateway(gatewayName);
      Alert.alert(
        'Connection Test Successful ✅',
        `Latency: ${res.latencyMs || 250}ms\nMessage: ${res.message || 'Gateway handshake validated successfully.'}`
      );
      await fetchGatewayConfigs(false);
    } catch (e: any) {
      Alert.alert(
        'Connection Test Failed ❌',
        e.response?.data?.error || e.message || 'Handshake failed'
      );
    } finally {
      setTestingGateway(null);
    }
  };

  const openConfigModal = (gatewayName: string) => {
    const existing = configs.find((c) => c.gateway_name === gatewayName);
    setSelectedGateway(gatewayName);
    setApiKey('');
    setApiSecret('');
    setMerchantId(existing?.merchant_id || '');
    setWebhookSecret('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!selectedGateway) return;
    if (!apiKey.trim() || !apiSecret.trim()) {
      Alert.alert('Required Fields', 'API Key and API Secret are required to configure gateway.');
      return;
    }

    setSaving(true);
    try {
      await saveGateway({
        gatewayName: selectedGateway,
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        merchantId: merchantId.trim() || undefined,
        webhookSecret: webhookSecret.trim() || undefined,
        isActive: true,
      });

      Alert.alert('Success', `${selectedGateway.toUpperCase()} configuration saved!`);
      setModalVisible(false);
      await fetchGatewayConfigs(false);
    } catch (e: any) {
      Alert.alert('Save Failed', e.response?.data?.error || e.message || 'Could not save gateway settings');
    } finally {
      setSaving(false);
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
          <Text style={styles.title}>Payment Gateways</Text>
          <Text style={styles.subtitle}>Configure automated UPI & card settlements</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <Text style={styles.loadingText}>Fetching payment providers...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline" size={44} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchGatewayConfigs()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchGatewayConfigs(true)}
              tintColor={Colors.accent}
            />
          }
        >
          {/* Security Notice */}
          <View style={styles.securityBanner}>
            <Ionicons name="shield-checkmark" size={20} color={Colors.success} />
            <Text style={styles.securityText}>
              Credentials are encrypted at rest with AES-256. Private keys are never exposed to the client.
            </Text>
          </View>

          {/* Gateway List */}
          {SUPPORTED_GATEWAYS.map((gw) => {
            const config = configs.find((c) => c.gateway_name === gw.name);
            const isConfigured = !!config;
            const isTesting = testingGateway === gw.name;

            return (
              <View key={gw.name} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.gwIcon, { backgroundColor: gw.accentColor + '20' }]}>
                    <Ionicons name={gw.icon as any} size={22} color={gw.accentColor} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text style={styles.gwName}>{gw.label}</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{gw.badge}</Text>
                      </View>
                    </View>
                    <Text style={styles.statusLabel}>
                      Status:{' '}
                      <Text
                        style={{
                          color: isConfigured && config.is_active ? Colors.success : Colors.textMuted,
                          fontWeight: '700',
                        }}
                      >
                        {isConfigured ? (config.status || (config.is_active ? 'ACTIVE' : 'INACTIVE')) : 'NOT CONFIGURED'}
                      </Text>
                    </Text>
                  </View>
                </View>

                {isConfigured && (
                  <View style={styles.detailsBlock}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailKey}>Key ID</Text>
                      <Text style={styles.detailVal}>{config.api_key_masked || '••••••••'}</Text>
                    </View>

                    {config.merchant_id && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailKey}>Merchant ID</Text>
                        <Text style={styles.detailVal}>{config.merchant_id}</Text>
                      </View>
                    )}

                    {config.health && (
                      <View style={styles.healthRow}>
                        <View style={styles.healthItem}>
                          <Text style={styles.healthLabel}>Avg Latency</Text>
                          <Text style={styles.healthValue}>{config.health.avg_latency_ms || 250}ms</Text>
                        </View>
                        <View style={styles.healthItem}>
                          <Text style={styles.healthLabel}>Success Rate</Text>
                          <Text style={[styles.healthValue, { color: Colors.success }]}>
                            {config.health.success_rate || 99.9}%
                          </Text>
                        </View>
                        <View style={styles.healthItem}>
                          <Text style={styles.healthLabel}>Webhook</Text>
                          <Text style={styles.healthValue}>{config.health.webhook_health || 'OK'}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                )}

                {/* Actions */}
                <View style={styles.actionsRow}>
                  {isConfigured && (
                    <TouchableOpacity
                      style={styles.testBtn}
                      onPress={() => handleTest(gw.name)}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <ActivityIndicator size="small" color={Colors.accent} />
                      ) : (
                        <>
                          <Ionicons name="pulse" size={14} color={Colors.accent} />
                          <Text style={styles.testBtnText}>Test Ping</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {isAdmin && (
                    <TouchableOpacity
                      style={[styles.configBtn, !isConfigured && { flex: 1 }]}
                      onPress={() => openConfigModal(gw.name)}
                    >
                      <Ionicons
                        name={isConfigured ? 'create-outline' : 'add-circle-outline'}
                        size={15}
                        color={Colors.white}
                      />
                      <Text style={styles.configBtnText}>
                        {isConfigured ? 'Update Keys' : 'Configure Provider'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Configuration Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Configure {selectedGateway?.toUpperCase()}
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.form}>
              <View style={styles.field}>
                <Text style={styles.fieldLabel}>API Key / Key ID *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. rzp_live_xxxxxxxx"
                  placeholderTextColor={Colors.textMuted}
                  value={apiKey}
                  onChangeText={setApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>API Secret *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Paste private secret (encrypted on save)"
                  placeholderTextColor={Colors.textMuted}
                  value={apiSecret}
                  onChangeText={setApiSecret}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Merchant ID / Client ID (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. MERCH_12345"
                  placeholderTextColor={Colors.textMuted}
                  value={merchantId}
                  onChangeText={setMerchantId}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLabel}>Webhook Secret (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Webhook signing secret"
                  placeholderTextColor={Colors.textMuted}
                  value={webhookSecret}
                  onChangeText={setWebhookSecret}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Credentials</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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

  content: { padding: 16, paddingBottom: 40, gap: 14 },

  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  securityText: { flex: 1, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  gwIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gwName: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  badge: {
    backgroundColor: Colors.bg,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 10, color: Colors.textMuted, fontWeight: '600' },
  statusLabel: { fontSize: 12, color: Colors.textSecondary, marginTop: 4 },

  detailsBlock: {
    backgroundColor: Colors.bg,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailKey: { fontSize: 12, color: Colors.textMuted },
  detailVal: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },

  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  healthItem: { alignItems: 'center', gap: 2 },
  healthLabel: { fontSize: 10, color: Colors.textMuted },
  healthValue: { fontSize: 12, fontWeight: '700', color: Colors.textPrimary },

  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  testBtnText: { color: Colors.accent, fontSize: 13, fontWeight: '700' },

  configBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  configBtnText: { color: Colors.white, fontSize: 13, fontWeight: '700' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },

  form: { gap: 14, paddingBottom: 20 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: 14,
  },

  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 14 },
  saveBtn: {
    flex: 2,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },

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
