import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getWorkspaceSettings, updateWorkspaceSettings } from '@/services/endpoints';
import { Colors } from '@/constants/colors';
import { useAuth } from '@/context/AuthContext';

export default function WorkspaceSettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'WORKSPACE_ADMIN';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [dueDays, setDueDays] = useState('7');
  const [lateFeePerDay, setLateFeePerDay] = useState('0');
  const [cgstRate, setCgstRate] = useState('0');
  const [sgstRate, setSgstRate] = useState('0');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const ws = await getWorkspaceSettings();
      const fin = ws.financial_settings;
      setName(ws.name || '');
      setSlug(ws.slug || '');
      setEmail(ws.email || '');
      setPhone(ws.phone || '');
      setGstNumber(ws.gst_number || '');
      setLogoUrl(ws.logo_url || '');

      setInvoicePrefix(fin?.invoice_prefix || 'INV');
      setDueDays(String(fin?.due_days ?? 7));
      setLateFeePerDay(String(fin?.late_fee_per_day ?? 0));
      setCgstRate(String(fin?.cgst_rate ?? 0));
      setSgstRate(String(fin?.sgst_rate ?? 0));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to load workspace settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'PG / Workspace name cannot be empty.');
      return;
    }
    setSaving(true);
    try {
      await updateWorkspaceSettings({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        gstNumber: gstNumber.trim() || null,
        logoUrl: logoUrl.trim() || null,
        invoicePrefix: invoicePrefix.trim().toUpperCase() || 'INV',
        dueDays: parseInt(dueDays, 10) || 7,
        lateFeePerDay: parseFloat(lateFeePerDay) || 0,
        cgstRate: parseFloat(cgstRate) || 0,
        sgstRate: parseFloat(sgstRate) || 0,
      });
      Alert.alert('Success', 'Workspace settings & billing rules saved successfully!');
    } catch (err: any) {
      Alert.alert('Save Failed', err.message || 'Could not update settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Workspace Settings</Text>
          <Text style={styles.subtitle}>PG profile, tax & billing automation</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color="#fff" />
                <Text style={styles.saveBtnText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Section: Business Identity */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business" size={18} color={Colors.accent} />
              <Text style={styles.sectionTitle}>PG / Business Identity</Text>
            </View>

            <Text style={styles.label}>PG / Business Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Royal Living PG"
              placeholderTextColor={Colors.textMuted}
              editable={isAdmin}
            />

            <Text style={styles.label}>Workspace Slug (Unique identifier)</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={slug}
              editable={false}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Official Phone</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 9876543210"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="phone-pad"
                  editable={isAdmin}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Official Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="contact@royalliving.in"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={isAdmin}
                />
              </View>
            </View>

            <Text style={styles.label}>GSTIN / Tax ID</Text>
            <TextInput
              style={styles.input}
              value={gstNumber}
              onChangeText={setGstNumber}
              placeholder="29AAAAA0000A1Z5 (optional)"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
              editable={isAdmin}
            />

            <Text style={styles.label}>Logo URL</Text>
            <TextInput
              style={styles.input}
              value={logoUrl}
              onChangeText={setLogoUrl}
              placeholder="https://example.com/logo.png"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              editable={isAdmin}
            />
          </View>

          {/* Section: Invoicing & Billing Rules */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="receipt-outline" size={18} color={Colors.warning} />
              <Text style={styles.sectionTitle}>Invoicing & Late Fee Rules</Text>
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Invoice Prefix</Text>
                <TextInput
                  style={styles.input}
                  value={invoicePrefix}
                  onChangeText={setInvoicePrefix}
                  placeholder="INV"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="characters"
                  editable={isAdmin}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Due Grace Days</Text>
                <TextInput
                  style={styles.input}
                  value={dueDays}
                  onChangeText={setDueDays}
                  placeholder="7"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  editable={isAdmin}
                />
              </View>
            </View>

            <Text style={styles.label}>Daily Late Fee (₹ per day after due date)</Text>
            <TextInput
              style={styles.input}
              value={lateFeePerDay}
              onChangeText={setLateFeePerDay}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
              editable={isAdmin}
            />

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>CGST Rate (%)</Text>
                <TextInput
                  style={styles.input}
                  value={cgstRate}
                  onChangeText={setCgstRate}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  editable={isAdmin}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>SGST Rate (%)</Text>
                <TextInput
                  style={styles.input}
                  value={sgstRate}
                  onChangeText={setSgstRate}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  editable={isAdmin}
                />
              </View>
            </View>
          </View>

          {isAdmin && (
            <TouchableOpacity
              style={[styles.bigSaveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.bigSaveBtnText}>Save Workspace Settings</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
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
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  content: { padding: 16, gap: 14, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  loadingText: { color: Colors.textSecondary, fontSize: 13 },

  sectionCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },

  label: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary, marginTop: 4 },
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
  disabledInput: {
    opacity: 0.5,
    backgroundColor: Colors.bgCard,
  },
  row: { flexDirection: 'row', gap: 12 },

  bigSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 10,
  },
  bigSaveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
