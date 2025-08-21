// screens/OwnerDashboardScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import ZpButton from '../components/ui/ZpButton';

export const LISTINGS_KEY = 'owner_listings';

export default function OwnerDashboardScreen({ navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const [listings, setListings] = useState([]);

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem(LISTINGS_KEY);
    const ls = raw ? JSON.parse(raw) : [];
    ls.sort((a, b) => {
      if (a.active !== b.active) return a.active ? -1 : 1;
      return new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt);
    });
    setListings(ls);
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    load();
    return unsub;
  }, [navigation, load]);

  const toggleActive = async (id) => {
    const raw = await AsyncStorage.getItem(LISTINGS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const i = list.findIndex(x => x.id === id);
    if (i === -1) return;
    list[i] = { ...list[i], active: !list[i].active, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(LISTINGS_KEY, JSON.stringify(list));
    setListings(list);
  };

  const removeListing = (id) => {
    Alert.alert('למחוק חניה?', undefined, [
      { text: 'בטל', style: 'cancel' },
      { text: 'מחק', style: 'destructive', onPress: async () => {
          const raw = await AsyncStorage.getItem(LISTINGS_KEY);
          const list = raw ? JSON.parse(raw) : [];
          const next = list.filter(x => x.id !== id);
          await AsyncStorage.setItem(LISTINGS_KEY, JSON.stringify(next));
          setListings(next);
        }
      }
    ]);
  };

  const renderListing = ({ item }) => {
    const thumb = Array.isArray(item.images) && item.images[0]?.uri;

    return (
      <View style={[styles.card, item.active ? styles.cardActive : null]}>
        {/* כותרת + אקשנים */}
        <View style={styles.cardHeader}>
          <Text style={styles.title} numberOfLines={1}>{item.title || 'חניה ללא שם'}</Text>

          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={() => navigation.navigate('OwnerListingDetail', { id: item.id })} style={styles.iconBtn} activeOpacity={0.85}>
              <Ionicons name="bar-chart" size={18} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('OwnerListingForm', { id: item.id })} style={styles.iconBtn} activeOpacity={0.85}>
              <Ionicons name="create-outline" size={18} color={theme.colors.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleActive(item.id)} style={styles.iconBtn} activeOpacity={0.85}>
              <Ionicons name={item.active ? 'toggle' : 'toggle-outline'} size={22} color={item.active ? theme.colors.success : theme.colors.subtext} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => removeListing(item.id)} style={styles.iconBtn} activeOpacity={0.85}>
              <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {!!thumb && <Image source={{ uri: thumb }} style={styles.thumb} />}

        {!!item.address && <Text style={styles.line}>כתובת: {item.address}</Text>}
        <Text style={styles.line}>מחיר לשעה: ₪{item.price || 0}</Text>
        {(item.latitude && item.longitude) && (
          <Text style={styles.line}>מיקום: {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</Text>
        )}

        <View style={styles.pillsRow}>
          <Text style={[styles.statusPill, item.active ? styles.pillOn : styles.pillOff]}>
            {item.active ? 'פעיל' : 'כבוי'}
          </Text>
          {item.approvalMode === 'manual' && (
            <Text style={[styles.statusPill, styles.pillManual]}>אישור ידני מופעל</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.header}>ניהול החניות</Text>

      {/* אקשנים עליונים */}
      <View style={styles.topActions}>
        <ZpButton
          title="הוסף חניה"
          onPress={() => navigation.navigate('OwnerListingForm')}
          leftIcon={<Ionicons name="add" size={18} color="#fff" style={{ marginEnd: 6 }} />}
        />
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('OwnerOverview')} activeOpacity={0.9}>
          <Text style={styles.secondaryBtnText}>סקירה כללית</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('OwnerPending')} activeOpacity={0.9}>
          <Text style={styles.secondaryBtnText}>בקשות בהמתנה</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={listings}
        keyExtractor={i => i.id}
        renderItem={renderListing}
        ListEmptyComponent={<Text style={styles.empty}>אין עדיין חניות. לחץ "הוסף חניה".</Text>}
        contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
      />
    </View>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    wrap:{ flex:1, backgroundColor: colors.bg, padding: spacing.lg },
    header:{ fontSize:20, fontWeight:'800', textAlign:'center', marginBottom: spacing.md, color: colors.text },

    topActions:{ flexDirection:'row', gap: spacing.sm, marginBottom: spacing.md, alignItems:'center' },

    // כרטיס חניה
    card:{
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      borderWidth:1, borderColor: colors.border,
      shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:2
    },
    cardActive:{ borderColor:'#b9f5cf', backgroundColor:'#f7fffb' },

    cardHeader:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom: spacing.xs },
    actionsRow:{ flexDirection:'row', alignItems:'center' },
    iconBtn:{ padding: 6, borderRadius: 8 },

    title:{ fontSize:16, fontWeight:'800', marginBottom: 2, color: colors.text },
    line:{ fontSize:14, color: colors.text, marginVertical:2 },

    pillsRow:{ flexDirection:'row', gap: 8, marginTop: spacing.sm },

    statusPill:{
      paddingVertical:4, paddingHorizontal:10,
      borderRadius: 999, fontSize:12, overflow:'hidden',
      borderWidth:1, borderColor: colors.border, color: colors.text, backgroundColor: colors.bg
    },
    pillOn:{ color: colors.success, borderColor:'#b9f5cf', backgroundColor:'#f7fffb' },
    pillOff:{ color:'#fff', borderColor:'#d66', backgroundColor:'#d66' },
    pillManual:{ color: colors.warning, borderColor:'#ffd79a', backgroundColor:'#fff7e6' },

    thumb:{ width:'100%', height:160, borderRadius: borderRadii.sm, marginBottom:8, backgroundColor: colors.bg },

    secondaryBtn:{
      flex:1,
      backgroundColor: colors.surface,
      paddingVertical:12,
      borderRadius: borderRadii.sm,
      borderWidth:1, borderColor: colors.primary,
      alignItems:'center',
      shadowColor:'#000', shadowOpacity:0.04, shadowRadius:10, shadowOffset:{ width:0, height:4 }, elevation:1
    },
    secondaryBtnText:{ color: colors.primary, fontWeight:'800' },

    empty:{ color: colors.subtext, textAlign:'center', marginTop: 8 },
  });
}
