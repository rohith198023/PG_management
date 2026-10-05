import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  getMealConfig,
  getMealTemplate,
  getMealHeadcount,
  getMealMenu,
  selectMealChoice,
  getMyMealSelections,
} from '@/services/endpoints';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/colors';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const DAY_MAP: Record<string, number> = {
  MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 0
};

const SLOTS = ['BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER'];
const SLOT_ICONS: Record<string, string> = {
  BREAKFAST: 'sunny-outline',
  LUNCH: 'restaurant-outline',
  SNACKS: 'cafe-outline',
  DINNER: 'moon-outline',
};

export default function MealsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const isTenant = user?.role === 'TENANT';

  const [tab, setTab] = useState<'CHOICE' | 'HEADCOUNT' | 'MENU' | 'CONFIG'>(isTenant ? 'CHOICE' : 'HEADCOUNT');
  const [selectedDay, setSelectedDay] = useState('MON');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);
  const [headcount, setHeadcount] = useState<any>(null);
  const [menus, setMenus] = useState<any[]>([]);
  const [mySelections, setMySelections] = useState<Record<string, string>>({});
  const [submittingSlot, setSubmittingSlot] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const fetchMealData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [cfgRes, tplRes, hcRes, menuRes, selRes] = await Promise.allSettled([
        getMealConfig(),
        getMealTemplate(),
        getMealHeadcount(todayStr),
        getMealMenu(todayStr),
        getMyMealSelections(todayStr),
      ]);

      if (cfgRes.status === 'fulfilled') setConfig(cfgRes.value?.config);
      if (tplRes.status === 'fulfilled') setTemplate(tplRes.value?.template);
      if (hcRes.status === 'fulfilled') setHeadcount(hcRes.value);
      if (menuRes.status === 'fulfilled') setMenus(menuRes.value?.menus || []);
      if (selRes.status === 'fulfilled') {
        const selMap: Record<string, string> = {};
        (selRes.value?.selections || []).forEach((s: any) => {
          selMap[s.menu_id] = s.choice;
        });
        setMySelections(selMap);
      }
    } catch (e: any) {
      setError(e.message || 'Error loading meal management data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [todayStr]);

  const handleSelectChoice = async (menuId: string, choice: 'VEG' | 'NON_VEG' | 'SKIP') => {
    setSubmittingSlot(menuId);
    try {
      await selectMealChoice({ menuId, choice });
      setMySelections(prev => ({ ...prev, [menuId]: choice }));
      Alert.alert('Selection Saved', `Your preference for this meal has been set to ${choice.replace('_', ' ')}.`);
    } catch (e: any) {
      Alert.alert('Selection Error', e.message || 'Failed to record choice');
    } finally {
      setSubmittingSlot(null);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMealData();
    }, [fetchMealData])
  );

  const currentDayNum = DAY_MAP[selectedDay];
  const templateItems = (template?.items || []).filter(
    (item: any) => item.day_of_week === currentDayNum
  );

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
          <Text style={styles.title}>Meal Management</Text>
          <Text style={styles.subtitle}>Headcounts, weekly menus & policy</Text>
        </View>
      </View>

      {/* Segment tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, tab === 'CHOICE' && styles.tabItemActive]}
          onPress={() => setTab('CHOICE')}
        >
          <Ionicons
            name="restaurant"
            size={16}
            color={tab === 'CHOICE' ? Colors.accent : Colors.textMuted}
          />
          <Text style={[styles.tabLabel, tab === 'CHOICE' && styles.tabLabelActive]}>
            My Choice
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, tab === 'HEADCOUNT' && styles.tabItemActive]}
          onPress={() => setTab('HEADCOUNT')}
        >
          <Ionicons
            name="pie-chart-outline"
            size={16}
            color={tab === 'HEADCOUNT' ? Colors.accent : Colors.textMuted}
          />
          <Text style={[styles.tabLabel, tab === 'HEADCOUNT' && styles.tabLabelActive]}>
            Headcount
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, tab === 'MENU' && styles.tabItemActive]}
          onPress={() => setTab('MENU')}
        >
          <Ionicons
            name="calendar-outline"
            size={16}
            color={tab === 'MENU' ? Colors.accent : Colors.textMuted}
          />
          <Text style={[styles.tabLabel, tab === 'MENU' && styles.tabLabelActive]}>
            Menu
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, tab === 'CONFIG' && styles.tabItemActive]}
          onPress={() => setTab('CONFIG')}
        >
          <Ionicons
            name="options-outline"
            size={16}
            color={tab === 'CONFIG' ? Colors.accent : Colors.textMuted}
          />
          <Text style={[styles.tabLabel, tab === 'CONFIG' && styles.tabLabelActive]}>
            Policy
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <Text style={styles.loadingText}>Fetching meal data...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline" size={44} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchMealData()}>
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
              onRefresh={() => fetchMealData(true)}
              tintColor={Colors.accent}
            />
          }
        >
          {tab === 'CHOICE' && (
            <View style={styles.tabContent}>
              <View style={styles.bannerCard}>
                <View style={[styles.bannerIcon, { backgroundColor: Colors.success + '20' }]}>
                  <Ionicons name="restaurant" size={24} color={Colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerLabel}>Today's Meal Preferences</Text>
                  <Text style={styles.bannerValue}>Choose your diet for each meal slot</Text>
                </View>
                <View style={styles.dateBadge}>
                  <Text style={styles.dateBadgeText}>{todayStr}</Text>
                </View>
              </View>

              {menus.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="restaurant-outline" size={36} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>No Daily Meals Published Today</Text>
                  <Text style={styles.emptyDesc}>
                    The mess supervisor has not published today's daily menu yet. View the "Menu" tab to see the weekly schedule.
                  </Text>
                </View>
              ) : (
                menus.map((menu: any) => {
                  const currentChoice = mySelections[menu.id] || 'NONE';
                  const isSubmitting = submittingSlot === menu.id;

                  return (
                    <View key={menu.id} style={styles.menuCard}>
                      <View style={styles.menuCardTop}>
                        <View style={styles.slotTag}>
                          <Ionicons
                            name={(SLOT_ICONS[menu.slot] || 'restaurant-outline') as any}
                            size={14}
                            color={Colors.accent}
                          />
                          <Text style={styles.slotTagText}>{menu.slot}</Text>
                        </View>
                        {currentChoice !== 'NONE' && (
                          <View
                            style={[
                              styles.specialBadge,
                              {
                                backgroundColor:
                                  currentChoice === 'VEG'
                                    ? Colors.success + '20'
                                    : currentChoice === 'NON_VEG'
                                    ? Colors.danger + '20'
                                    : Colors.warning + '20',
                              },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: '700',
                                color:
                                  currentChoice === 'VEG'
                                    ? Colors.success
                                    : currentChoice === 'NON_VEG'
                                    ? Colors.danger
                                    : Colors.warning,
                              }}
                            >
                              Selected: {currentChoice.replace('_', ' ')}
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.menuTitle}>{menu.title || `${menu.slot} Menu`}</Text>
                      {menu.description ? <Text style={styles.menuDesc}>{menu.description}</Text> : null}

                      {/* Dish tags */}
                      {menu.items && menu.items.length > 0 && (
                        <View style={styles.itemTags}>
                          {menu.items.map((it: any, idx: number) => (
                            <View key={idx} style={styles.dishPill}>
                              <Text style={styles.dishPillText}>{it.name || it}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Interactive Selection Buttons */}
                      <Text style={[styles.sectionHeader, { marginTop: 10 }]}>SELECT YOUR DIET:</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        {menu.vegAvailable !== false && (
                          <TouchableOpacity
                            style={[
                              styles.choiceBtn,
                              currentChoice === 'VEG' && {
                                backgroundColor: Colors.success,
                                borderColor: Colors.success,
                              },
                            ]}
                            onPress={() => handleSelectChoice(menu.id, 'VEG')}
                            disabled={isSubmitting}
                          >
                            <Text
                              style={[
                                styles.choiceBtnText,
                                currentChoice === 'VEG' && { color: Colors.white },
                              ]}
                            >
                              🥬 Pure Veg
                            </Text>
                          </TouchableOpacity>
                        )}

                        {menu.nonVegAvailable && (
                          <TouchableOpacity
                            style={[
                              styles.choiceBtn,
                              currentChoice === 'NON_VEG' && {
                                backgroundColor: Colors.danger,
                                borderColor: Colors.danger,
                              },
                            ]}
                            onPress={() => handleSelectChoice(menu.id, 'NON_VEG')}
                            disabled={isSubmitting}
                          >
                            <Text
                              style={[
                                styles.choiceBtnText,
                                currentChoice === 'NON_VEG' && { color: Colors.white },
                              ]}
                            >
                              🍗 Non-Veg
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          style={[
                            styles.choiceBtn,
                            currentChoice === 'SKIP' && {
                              backgroundColor: Colors.warning,
                              borderColor: Colors.warning,
                            },
                          ]}
                          onPress={() => handleSelectChoice(menu.id, 'SKIP')}
                          disabled={isSubmitting}
                        >
                          <Text
                            style={[
                              styles.choiceBtnText,
                              currentChoice === 'SKIP' && { color: Colors.white },
                            ]}
                          >
                            ⏭️ Skip Meal
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {tab === 'HEADCOUNT' && (
            <View style={styles.tabContent}>
              {/* Top Banner */}
              <View style={styles.bannerCard}>
                <View style={styles.bannerIcon}>
                  <Ionicons name="people-outline" size={24} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bannerLabel}>Active Eligible Tenants</Text>
                  <Text style={styles.bannerValue}>
                    {headcount?.totalActiveTenantsCount ?? 0} residents
                  </Text>
                </View>
                <View style={styles.dateBadge}>
                  <Text style={styles.dateBadgeText}>{todayStr}</Text>
                </View>
              </View>

              {/* Slot Headcounts */}
              <Text style={styles.sectionHeader}>TODAY'S SLOTS</Text>

              {SLOTS.map((slot) => {
                const slotData = headcount?.headcountSummary?.[slot] || {
                  totalVeg: 0,
                  nonVeg: 0,
                  skipped: 0,
                  totalOptedIn: 0,
                };
                const totalActive = headcount?.totalActiveTenantsCount || 1;
                const optedRatio = Math.min(1, (slotData.totalOptedIn || 0) / totalActive);

                return (
                  <View key={slot} style={styles.slotCard}>
                    <View style={styles.slotHeader}>
                      <View style={styles.slotTitleRow}>
                        <Ionicons
                          name={(SLOT_ICONS[slot] || 'restaurant-outline') as any}
                          size={18}
                          color={Colors.accent}
                        />
                        <Text style={styles.slotTitle}>{slot}</Text>
                      </View>
                      <View style={styles.headcountBadge}>
                        <Text style={styles.headcountBadgeText}>
                          {slotData.totalOptedIn || 0} Opted In
                        </Text>
                      </View>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressBar,
                          { width: `${Math.round(optedRatio * 100)}%` },
                        ]}
                      />
                    </View>

                    {/* Counter Grid */}
                    <View style={styles.countsRow}>
                      <View style={styles.countBox}>
                        <View style={[styles.dot, { backgroundColor: Colors.success }]} />
                        <Text style={styles.countNum}>{slotData.totalVeg || 0}</Text>
                        <Text style={styles.countLabel}>Pure Veg</Text>
                      </View>

                      <View style={styles.countBox}>
                        <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
                        <Text style={styles.countNum}>{slotData.nonVeg || 0}</Text>
                        <Text style={styles.countLabel}>Non-Veg</Text>
                      </View>

                      <View style={styles.countBox}>
                        <View style={[styles.dot, { backgroundColor: Colors.warning }]} />
                        <Text style={styles.countNum}>{slotData.skipped || 0}</Text>
                        <Text style={styles.countLabel}>Skipped</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {tab === 'MENU' && (
            <View style={styles.tabContent}>
              {/* Day Selector */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.daySelector}
              >
                {DAYS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayChip, selectedDay === d && styles.dayChipActive]}
                    onPress={() => setSelectedDay(d)}
                  >
                    <Text
                      style={[
                        styles.dayChipText,
                        selectedDay === d && styles.dayChipTextActive,
                      ]}
                    >
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Template Items for selected Day */}
              {templateItems.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="fast-food-outline" size={36} color={Colors.textMuted} />
                  <Text style={styles.emptyTitle}>No Menu Configured</Text>
                  <Text style={styles.emptyDesc}>
                    No meal items defined for {selectedDay} in the weekly schedule.
                  </Text>
                </View>
              ) : (
                templateItems.map((item: any) => (
                  <View key={item.id || item.slot} style={styles.menuCard}>
                    <View style={styles.menuCardTop}>
                      <View style={styles.slotTag}>
                        <Ionicons
                          name={(SLOT_ICONS[item.slot] || 'restaurant-outline') as any}
                          size={14}
                          color={Colors.accent}
                        />
                        <Text style={styles.slotTagText}>{item.slot}</Text>
                      </View>
                      {item.is_special && (
                        <View style={styles.specialBadge}>
                          <Ionicons name="star" size={11} color={Colors.warning} />
                          <Text style={styles.specialBadgeText}>
                            {item.special_tag || 'Special'}
                          </Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.menuTitle}>{item.title || 'Standard Meal'}</Text>
                    {item.description ? (
                      <Text style={styles.menuDesc}>{item.description}</Text>
                    ) : null}

                    {item.items && item.items.length > 0 && (
                      <View style={styles.itemTags}>
                        {item.items.map((dish: string, idx: number) => (
                          <View key={idx} style={styles.dishPill}>
                            <Text style={styles.dishPillText}>{dish}</Text>
                          </View>
                        ))}
                      </View>
                    )}

                    <View style={styles.menuFooter}>
                      <View style={styles.dietTags}>
                        {item.veg_available && (
                          <View style={styles.dietPillVeg}>
                            <View style={[styles.dot, { backgroundColor: Colors.success }]} />
                            <Text style={styles.dietPillText}>Veg ₹{item.veg_price || 60}</Text>
                          </View>
                        )}
                        {item.non_veg_available && (
                          <View style={styles.dietPillNonVeg}>
                            <View style={[styles.dot, { backgroundColor: Colors.danger }]} />
                            <Text style={styles.dietPillText}>Non-Veg ₹{item.non_veg_price || 90}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {tab === 'CONFIG' && (
            <View style={styles.tabContent}>
              <View style={styles.configCard}>
                <Text style={styles.configCardTitle}>Billing Policy</Text>

                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>Billing Mode</Text>
                  <View style={styles.configBadge}>
                    <Text style={styles.configBadgeText}>
                      {config?.billing_type || 'MONTHLY_FIXED'}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>Monthly Plan Price</Text>
                  <Text style={styles.configValue}>
                    ₹{Number(config?.monthly_plan_price ?? 3500).toLocaleString('en-IN')}/mo
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>Default Veg Rate</Text>
                  <Text style={styles.configValue}>
                    ₹{Number(config?.default_veg_price ?? 60).toFixed(0)} per meal
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>Default Non-Veg Rate</Text>
                  <Text style={styles.configValue}>
                    ₹{Number(config?.default_non_veg_price ?? 90).toFixed(0)} per meal
                  </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.configRow}>
                  <Text style={styles.configLabel}>Timezone</Text>
                  <Text style={styles.configValue}>{config?.timezone || 'Asia/Kolkata'}</Text>
                </View>
              </View>

              <View style={styles.infoNote}>
                <Ionicons name="information-circle-outline" size={18} color={Colors.textMuted} />
                <Text style={styles.infoNoteText}>
                  Meal policies are configured at the workspace level. Billing cycles apply to eligible active tenant leases.
                </Text>
              </View>
            </View>
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

  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  tabLabel: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  tabLabelActive: { color: Colors.textPrimary, fontWeight: '700' },

  content: { padding: 16, paddingBottom: 40 },
  tabContent: { gap: 14 },

  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerLabel: { fontSize: 12, color: Colors.textSecondary },
  bannerValue: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginTop: 2 },
  dateBadge: {
    backgroundColor: Colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dateBadgeText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },

  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1,
    marginTop: 6,
  },

  slotCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  slotTitle: { fontSize: 15, fontWeight: '800', color: Colors.textPrimary },
  headcountBadge: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  headcountBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.accent },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.bg,
    overflow: 'hidden',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },

  countsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 4,
  },
  countBox: { alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  countNum: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  countLabel: { fontSize: 11, color: Colors.textSecondary },

  daySelector: { gap: 8, paddingBottom: 6 },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  dayChipText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  dayChipTextActive: { color: Colors.white },

  menuCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  menuCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  slotTagText: { fontSize: 11, fontWeight: '700', color: Colors.accent },
  specialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  specialBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.warning },
  menuTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  menuDesc: { fontSize: 12, color: Colors.textSecondary },

  itemTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  dishPill: {
    backgroundColor: Colors.bg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dishPillText: { fontSize: 11, color: Colors.textSecondary },

  menuFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dietTags: { flexDirection: 'row', gap: 8 },
  dietPillVeg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.success + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dietPillNonVeg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.danger + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dietPillText: { fontSize: 11, fontWeight: '700', color: Colors.textPrimary },

  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 10,
    marginTop: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  emptyDesc: { fontSize: 12, color: Colors.textSecondary, textAlign: 'center' },

  configCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  configCardTitle: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  configLabel: { fontSize: 14, color: Colors.textSecondary },
  configValue: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  configBadge: {
    backgroundColor: Colors.accentLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.accentBorder,
  },
  configBadgeText: { fontSize: 12, fontWeight: '700', color: Colors.accent },
  divider: { height: 1, backgroundColor: Colors.border },

  infoNote: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoNoteText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 18 },

  choiceBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textSecondary,
  },

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
