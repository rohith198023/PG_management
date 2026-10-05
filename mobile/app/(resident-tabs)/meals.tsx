import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '@/services/api';

export default function ResidentMealsScreen() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [menus, setMenus] = useState<any[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingMenuId, setUpdatingMenuId] = useState<string | null>(null);

  const dateStr = selectedDate.toISOString().split('T')[0];

  const fetchMeals = useCallback(async () => {
    try {
      setLoading(true);
      const [menuRes, selRes] = await Promise.all([
        api.get(`/api/meals/menu?date=${dateStr}`),
        api.get(`/api/meals/selection?date=${dateStr}`),
      ]);

      setMenus(menuRes.data.menus || []);

      const selMap: Record<string, string> = {};
      (selRes.data.selections || []).forEach((s: any) => {
        selMap[s.menu_id] = s.choice;
      });
      setSelections(selMap);
    } catch (err) {
      console.warn('Failed to load meal menu:', err);
    } finally {
      setLoading(false);
    }
  }, [dateStr]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchMeals();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const handleSelectChoice = async (menuId: string, choice: 'VEG' | 'NON_VEG' | 'SKIP') => {
    setUpdatingMenuId(menuId);
    try {
      await api.post('/api/meals/selection', { menuId, choice });
      setSelections((prev) => ({ ...prev, [menuId]: choice }));
    } catch (err: any) {
      Alert.alert('Selection Error', err.response?.data?.error || err.message || 'Cutoff passed or selection failed');
    } finally {
      setUpdatingMenuId(null);
    }
  };

  const changeDate = (days: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + days);
    setSelectedDate(next);
  };

  const getSlotIcon = (slot: string) => {
    switch (slot) {
      case 'BREAKFAST':
        return <Ionicons name="sunny-outline" size={18} color="#FBBF24" />;
      case 'LUNCH':
        return <Ionicons name="partly-sunny-outline" size={18} color="#F97316" />;
      case 'DINNER':
        return <Ionicons name="moon-outline" size={18} color="#818CF8" />;
      default:
        return <Ionicons name="restaurant-outline" size={18} color="#6366F1" />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Daily Meals & Mess</Text>
        <Text style={styles.subtitle}>Select your dietary choices before cutoff times</Text>

        {/* Date Selector */}
        <View style={styles.dateBar}>
          <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDate(-1)}>
            <Ionicons name="chevron-back" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <Text style={styles.dateLabel}>
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </Text>

          <TouchableOpacity style={styles.dateNavBtn} onPress={() => changeDate(1)}>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
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
          {menus.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="restaurant-outline" size={36} color="#64748B" />
              <Text style={styles.emptyTitle}>No Menu Published</Text>
              <Text style={styles.emptySubtitle}>The mess manager hasn't published a menu for this date yet.</Text>
            </View>
          ) : (
            menus.map((menu) => {
              const currentChoice = selections[menu.id] || 'VEG';
              const isUpdating = updatingMenuId === menu.id;

              return (
                <View key={menu.id} style={styles.menuCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.slotWrap}>
                      {getSlotIcon(menu.slot)}
                      <Text style={styles.slotTitle}>{menu.slot}</Text>
                    </View>

                    {menu.cutoffTime && (
                      <View style={styles.cutoffBadge}>
                        <Ionicons name="time-outline" size={11} color="#64748B" />
                        <Text style={styles.cutoffText}>
                          Cutoff: {new Date(menu.cutoffTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.menuName}>{menu.title}</Text>
                  {menu.description ? <Text style={styles.menuDesc}>{menu.description}</Text> : null}

                  {/* Menu Items Preview */}
                  {menu.items && menu.items.length > 0 && (
                    <View style={styles.itemsWrap}>
                      {menu.items.map((it: any) => (
                        <View key={it.id || it.name} style={styles.itemTag}>
                          <View style={[styles.dot, { backgroundColor: it.isVeg ? '#10B981' : '#EF4444' }]} />
                          <Text style={styles.itemText}>{it.name}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Choice Selector */}
                  <View style={styles.choiceBar}>
                    {menu.vegAvailable && (
                      <TouchableOpacity
                        style={[styles.choiceBtn, currentChoice === 'VEG' ? styles.choiceBtnVegActive : null]}
                        onPress={() => handleSelectChoice(menu.id, 'VEG')}
                        disabled={isUpdating}
                      >
                        <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                        <Text style={[styles.choiceText, currentChoice === 'VEG' ? styles.choiceTextActive : null]}>
                          Veg
                        </Text>
                        {currentChoice === 'VEG' && <Ionicons name="checkmark" size={12} color="#10B981" />}
                      </TouchableOpacity>
                    )}

                    {menu.nonVegAvailable && (
                      <TouchableOpacity
                        style={[styles.choiceBtn, currentChoice === 'NON_VEG' ? styles.choiceBtnNonVegActive : null]}
                        onPress={() => handleSelectChoice(menu.id, 'NON_VEG')}
                        disabled={isUpdating}
                      >
                        <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                        <Text style={[styles.choiceText, currentChoice === 'NON_VEG' ? styles.choiceTextActive : null]}>
                          Non-Veg
                        </Text>
                        {currentChoice === 'NON_VEG' && <Ionicons name="checkmark" size={12} color="#EF4444" />}
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.choiceBtn, currentChoice === 'SKIP' ? styles.choiceBtnSkipActive : null]}
                      onPress={() => handleSelectChoice(menu.id, 'SKIP')}
                      disabled={isUpdating}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={12}
                        color={currentChoice === 'SKIP' ? '#94A3B8' : '#64748B'}
                      />
                      <Text style={[styles.choiceText, currentChoice === 'SKIP' ? styles.choiceTextActive : null]}>
                        Skip
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
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
    gap: 8,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  subtitle: { fontSize: 12, color: '#94A3B8' },
  dateBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
  },
  dateNavBtn: {
    padding: 4,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, gap: 14 },
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
  menuCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: 16,
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E2E8F0',
    letterSpacing: 0.5,
  },
  cutoffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cutoffText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  menuName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  menuDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  itemsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  itemTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090D16',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 5,
  },
  itemText: {
    fontSize: 11,
    color: '#CBD5E1',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  choiceBar: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 10,
    marginTop: 4,
  },
  choiceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#090D16',
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  choiceBtnVegActive: {
    borderColor: '#10B981',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  choiceBtnNonVegActive: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  choiceBtnSkipActive: {
    borderColor: '#64748B',
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
  },
  choiceText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  choiceTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
