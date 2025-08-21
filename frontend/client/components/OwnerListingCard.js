// components/OwnerListingCard.js
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function OwnerListingCard({
  listing,
  onEdit,
  onToggle,
  onDelete,
  onOpenMap,
  onShare,
  onAnalytics, // ✅ חדש
}) {
  const images = Array.isArray(listing?.images) ? listing.images : [];
  const thumb = images[0]?.uri;

  const coordsLine = useMemo(() => {
    if (typeof listing.latitude === 'number' && typeof listing.longitude === 'number') {
      return `${listing.latitude.toFixed(5)}, ${listing.longitude.toFixed(5)}`;
    }
    return null;
  }, [listing]);

  return (
    <View style={[styles.card, listing.active ? styles.cardActive : styles.cardInactive]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{listing.title || listing.address || 'חניה ללא שם'}</Text>
        <Text
          style={[
            styles.badge,
            listing.active
              ? { backgroundColor: '#e8fff2', borderColor: '#b9f5cf', color: '#0a7a3e' }
              : { backgroundColor: '#fff3f3', borderColor: '#ffd1d1', color: '#b33' },
          ]}
        >
          {listing.active ? 'פעיל' : 'כבוי'}
        </Text>
      </View>

      {images.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }} style={{ marginTop: 8, marginBottom: 8 }}>
          {images.slice(0, 6).map((img, i) => (
            <Image key={`${img.uri}-${i}`} source={{ uri: img.uri }} style={styles.galleryImg} />
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyGallery}>
          <Ionicons name="image-outline" size={20} color="#9ab7d6" />
          <Text style={styles.emptyGalleryText}>אין תמונות – מומלץ להוסיף</Text>
        </View>
      )}

      {!!listing.address && <Text style={styles.line}>כתובת: {listing.address}</Text>}
      {coordsLine && <Text style={styles.line}>מיקום: {coordsLine}</Text>}
      <Text style={styles.line}>מחיר לשעה: ₪{typeof listing.price === 'number' ? listing.price : 0}</Text>

      {/* פעולות שורה 1 */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.primary]} onPress={onEdit}>
          <Ionicons name="create-outline" size={16} color="#fff" style={{ marginEnd: 6 }} />
          <Text style={styles.primaryText}>ערוך</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.secondary]} onPress={onOpenMap}>
          <Ionicons name="map" size={16} color="#0b6aa8" style={{ marginEnd: 6 }} />
          <Text style={styles.secondaryText}>פתח במפה</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.secondary]} onPress={onShare}>
          <Ionicons name="share-social-outline" size={16} color="#0b6aa8" style={{ marginEnd: 6 }} />
          <Text style={styles.secondaryText}>שיתוף</Text>
        </TouchableOpacity>
      </View>

      {/* פעולות שורה 2 */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.info]} onPress={onAnalytics}>
          <Ionicons name="stats-chart" size={16} color="#0b6aa8" style={{ marginEnd: 6 }} />
          <Text style={styles.infoText}>סטטיסטיקות</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, listing.active ? styles.warn : styles.ok]} onPress={onToggle}>
          <Ionicons name="power" size={16} color={listing.active ? '#7a4d00' : '#0a7a3e'} style={{ marginEnd: 6 }} />
          <Text style={listing.active ? styles.warnText : styles.okText}>{listing.active ? 'כבה חניה' : 'הפעל חניה'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionBtn, styles.danger]} onPress={onDelete}>
          <Ionicons name="trash-outline" size={16} color="#b33" style={{ marginEnd: 6 }} />
          <Text style={styles.dangerText}>מחק</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1 },
  cardActive: { borderColor: '#b9f5cf', backgroundColor: '#f7fffb' },
  cardInactive: { borderColor: '#ecf1f7', backgroundColor: '#fff' },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '800' },

  badge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontWeight: '700' },

  galleryImg: { width: 180, height: 110, borderRadius: 10 },
  emptyGallery: {
    height: 110, borderRadius: 10, borderWidth: 1, borderColor: '#e6edf6', backgroundColor: '#f7fbff',
    marginVertical: 8, alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  emptyGalleryText: { color: '#6992b8', fontSize: 12 },

  line: { fontSize: 14, color: '#333', marginVertical: 2 },

  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', borderWidth: 1,
  },

  primary: { backgroundColor: '#00C6FF', borderColor: '#00C6FF' },
  primaryText: { color: '#fff', fontWeight: '800' },

  secondary: { backgroundColor: '#eaf4ff', borderColor: '#cfe3ff' },
  secondaryText: { color: '#0b6aa8', fontWeight: '800' },

  info: { backgroundColor: '#eef8ff', borderColor: '#d6ecff' },
  infoText: { color: '#0b6aa8', fontWeight: '800' },

  warn: { backgroundColor: '#fff7e6', borderColor: '#ffd79a' },
  warnText: { color: '#7a4d00', fontWeight: '800' },

  ok: { backgroundColor: '#e8fff2', borderColor: '#b9f5cf' },
  okText: { color: '#0a7a3e', fontWeight: '800' },

  danger: { backgroundColor: '#fff5f5', borderColor: '#ffd1d1' },
  dangerText: { color: '#b33', fontWeight: '800' },
});
