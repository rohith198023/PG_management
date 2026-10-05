import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, RefreshControl, StyleSheet,
  TouchableOpacity, ActivityIndicator, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getProperties } from '@/services/endpoints';
import { Colors } from '@/constants/colors';
import type { Property, Floor, Room, Bed } from '@/types';
import { useFocusEffect, useRouter } from 'expo-router';

const BED_COLORS: Record<string, string> = {
  OCCUPIED: Colors.success,
  VACANT: Colors.accent,
  MAINTENANCE: Colors.warning,
  RESERVED: Colors.info,
};

function BedPill({
  bed,
  room,
  property,
  onAllocate,
}: {
  bed: Bed;
  room: Room;
  property: Property;
  onAllocate: (b: Bed, r: Room, p: Property) => void;
}) {
  const color = BED_COLORS[bed.status] ?? Colors.textMuted;

  const handlePress = () => {
    if (bed.status === 'VACANT') {
      Alert.alert(
        `Bed ${bed.bed_number} is Vacant 🛏️`,
        `Room ${room.room_number} · ${property.name}\nRent: ₹${Number(room.rent_amount).toLocaleString()}/mo\n\nWould you like to allocate this bed to a new tenant?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Allocate to Tenant', style: 'default', onPress: () => onAllocate(bed, room, property) },
        ]
      );
    } else if (bed.status === 'RESERVED') {
      Alert.alert('Reserved Bed', `Bed ${bed.bed_number} is currently reserved with an active digital admission invite.`);
    } else if (bed.status === 'OCCUPIED') {
      Alert.alert('Occupied Bed', `Bed ${bed.bed_number} is currently occupied by an active resident.`);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.bedPill, { borderColor: color + '50' }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.bedDot, { backgroundColor: color }]} />
      <Text style={styles.bedNum}>{bed.bed_number}</Text>
      {bed.status === 'VACANT' && (
        <Text style={styles.bedPlus}>+</Text>
      )}
    </TouchableOpacity>
  );
}

function PropertyCard({
  property,
  onAllocate,
}: {
  property: Property;
  onAllocate: (b: Bed, r: Room, p: Property) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const totalBeds = property.floors.flatMap((f: Floor) => f.rooms.flatMap((r: Room) => r.beds)).length;
  const occupiedBeds = property.floors.flatMap((f: Floor) => f.rooms.flatMap((r: Room) => r.beds.filter((b: Bed) => b.status === 'OCCUPIED'))).length;
  const occupancy = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const floors = property.floors.length;
  const rooms = property.floors.reduce((sum: number, f: Floor) => sum + f.rooms.length, 0);

  return (
    <View style={styles.propertyCard}>
      {/* Header */}
      <TouchableOpacity style={styles.propertyHeader} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View style={styles.propertyIcon}>
          <Ionicons name="business" size={22} color={Colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.propertyName}>{property.name}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{property.property_type}</Text>
            </View>
          </View>
          <Text style={styles.propertyAddress} numberOfLines={1}>{property.address}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      {/* Stats Row */}
      <View style={styles.propStats}>
        <View style={styles.propStat}>
          <Text style={styles.propStatValue}>{floors}</Text>
          <Text style={styles.propStatLabel}>Floors</Text>
        </View>
        <View style={styles.propStat}>
          <Text style={styles.propStatValue}>{rooms}</Text>
          <Text style={styles.propStatLabel}>Rooms</Text>
        </View>
        <View style={styles.propStat}>
          <Text style={styles.propStatValue}>{totalBeds}</Text>
          <Text style={styles.propStatLabel}>Beds</Text>
        </View>
        <View style={styles.propStat}>
          <Text style={[styles.propStatValue, { color: occupancy >= 70 ? Colors.success : Colors.warning }]}>{occupancy}%</Text>
          <Text style={styles.propStatLabel}>Occ.</Text>
        </View>
      </View>

      {/* Occupancy bar */}
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${occupancy}%`, backgroundColor: occupancy >= 70 ? Colors.success : Colors.warning }]} />
      </View>

      {/* Floor/Room detail */}
      {expanded && (
        <View style={styles.floorList}>
          {property.floors.map((floor: Floor) => (
            <View key={floor.id} style={styles.floorItem}>
              <Text style={styles.floorName}>{floor.name}</Text>
              {floor.rooms.map((room: Room) => (
                <View key={room.id} style={styles.roomItem}>
                  <View style={styles.roomHeader}>
                    <Ionicons name="home-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.roomNum}>Room {room.room_number}</Text>
                    <Text style={styles.roomRent}>₹{Number(room.rent_amount).toLocaleString()}/mo</Text>
                  </View>
                  <View style={styles.bedsRow}>
                    {room.beds.map((bed: Bed) => (
                      <BedPill
                        key={bed.id}
                        bed={bed}
                        room={room}
                        property={property}
                        onAllocate={onAllocate}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default function PropertiesScreen() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [filtered, setFiltered] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchProperties = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await getProperties();
      setProperties(data);
      setFiltered(data);
    } catch (e: any) {
      setError(e.message || 'Failed to load properties');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchProperties(); }, [fetchProperties]));

  const onSearch = (text: string) => {
    setSearch(text);
    const q = text.toLowerCase();
    setFiltered(properties.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q)
    ));
  };

  const handleAllocateDirect = (b: Bed, r: Room, p: Property) => {
    router.push('/(tabs)/tenants');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Properties & Inventory</Text>
        <Text style={styles.subtitle}>{properties.length} properties · Tap vacant bed to allocate</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or location..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={onSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => { setSearch(''); setFiltered(properties); }}>
            <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        {Object.entries(BED_COLORS).map(([status, color]) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendText}>{status}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.accent} size="large" />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="cloud-offline" size={40} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchProperties()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="business-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>{search ? 'No properties match your search' : 'No properties found'}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <PropertyCard
              property={item}
              onAllocate={handleAllocateDirect}
            />
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchProperties(true)} tintColor={Colors.accent} />}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: Colors.bgCard, borderRadius: 12,
    paddingHorizontal: 14, height: 44,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14 },
  legendRow: {
    flexDirection: 'row', justifyContent: 'center', gap: 14,
    marginBottom: 12, paddingHorizontal: 16,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 32 },
  loadingText: { color: Colors.textSecondary },
  errorText: { color: Colors.danger, textAlign: 'center' },
  emptyText: { color: Colors.textMuted, fontSize: 15 },
  retryBtn: { backgroundColor: Colors.accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: Colors.white, fontWeight: '700' },

  propertyCard: {
    backgroundColor: Colors.bgCard, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  propertyHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  propertyIcon: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.accentLight, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: Colors.accentBorder,
  },
  propertyName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  typeBadge: { backgroundColor: Colors.accent + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 9, fontWeight: '800', color: Colors.accent },
  propertyAddress: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  propStats: {
    flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  propStat: { flex: 1, alignItems: 'center' },
  propStatValue: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  propStatLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  barBg: { height: 3, backgroundColor: Colors.border },
  barFill: { height: 3 },

  floorList: { borderTopWidth: 1, borderTopColor: Colors.border, padding: 14, gap: 12 },
  floorItem: { gap: 8 },
  floorName: { fontSize: 12, fontWeight: '700', color: Colors.accent, textTransform: 'uppercase', letterSpacing: 0.5 },
  roomItem: {
    backgroundColor: Colors.bg, borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: Colors.border, gap: 8,
  },
  roomHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  roomNum: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, flex: 1 },
  roomRent: { fontSize: 12, color: Colors.success, fontWeight: '600' },
  bedsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bedPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 8, paddingVertical: 4, backgroundColor: Colors.bgCard,
  },
  bedDot: { width: 7, height: 7, borderRadius: 4 },
  bedNum: { fontSize: 11, fontWeight: '700', color: Colors.textPrimary },
  bedPlus: { fontSize: 11, fontWeight: '800', color: Colors.accent, marginLeft: 2 },
});
