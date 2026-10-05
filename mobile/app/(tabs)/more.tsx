import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/colors';
import { useRouter } from 'expo-router';

interface MenuItem {
  label: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

const MENU_ITEMS: MenuItem[] = [
  { label: 'Meal Management', description: 'Menu, templates & headcount', icon: 'restaurant', route: '/screens/meals', color: Colors.warning },
  { label: 'Maintenance Desk', description: 'Complaints & maintenance tickets', icon: 'construct', route: '/screens/complaints', color: Colors.danger },
  { label: 'Payment Verifications', description: 'Approve or reject payment proofs', icon: 'card', route: '/screens/payments', color: Colors.success },
  { label: 'Accounting & P&L', description: 'Financial reports and analytics', icon: 'bar-chart', route: '/screens/accounting', color: Colors.accent },
  { label: 'Notification Dispatch', description: 'Notification queue & status', icon: 'notifications', route: '/screens/notifications', color: Colors.info },
  { label: 'Staff & Team', description: 'Manage staff and manager accounts', icon: 'people', route: '/screens/users', color: Colors.accent },
  { label: 'Workspace & Billing', description: 'PG profile, tax & late fee rules', icon: 'business', route: '/settings/workspace', color: '#8b5cf6' },
  { label: 'Gateway Settings', description: 'Payment gateway configuration', icon: 'settings', route: '/settings/gateways', color: Colors.textMuted },
];

export default function MoreScreen() {
  const { user, workspace, logout } = useAuth();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>More</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitials}>
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{user?.firstName} {user?.lastName}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.rolePill}>
              <Ionicons name="shield-checkmark" size={12} color={Colors.success} />
              <Text style={styles.roleText}>{user?.role?.replace(/_/g, ' ')}</Text>
            </View>
          </View>
        </View>

        {/* Workspace info */}
        <View style={styles.workspaceCard}>
          <Ionicons name="business" size={18} color={Colors.accent} />
          <View>
            <Text style={styles.workspaceName}>{workspace?.name}</Text>
            <Text style={styles.workspaceSlug}>/{workspace?.slug}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <Text style={styles.sectionLabel}>FEATURES</Text>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.route}
            style={styles.menuItem}
            onPress={() => router.push(item.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuDesc}>{item.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  content: { padding: 16, paddingBottom: 40, gap: 12 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.bgCard, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  profileAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.accentLight, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: Colors.accentBorder,
  },
  profileInitials: { fontSize: 20, fontWeight: '800', color: Colors.accent },
  profileName: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  profileEmail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.success + '15', alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 6,
  },
  roleText: { fontSize: 11, color: Colors.success, fontWeight: '700' },

  workspaceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: Colors.border,
  },
  workspaceName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  workspaceSlug: { fontSize: 12, color: Colors.textSecondary },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginTop: 4 },

  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  menuIcon: { width: 46, height: 46, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  menuDesc: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 14, paddingVertical: 16,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)', marginTop: 8,
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: Colors.danger },
});
