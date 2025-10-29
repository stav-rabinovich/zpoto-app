// screens/ProfileScreen.js
// פרופיל משתמש + ניהול "מקומות שמורים" למסך הבית (RTL מלא, UX משופר)

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@shopify/restyle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import ZpButton from '../components/ui/ZpButton';
import { osmAutocomplete } from '../utils/osm';
import { useAuth } from '../contexts/AuthContext';
import { useNavigationContext } from '../contexts/NavigationContext';
import { getUserProfile, updateUserProfile, getUserStats, validatePhoneNumber, validateName, getDefaultAvatar } from '../services/api/profile';
import { getUserVehicles, createVehicle, updateVehicle, deleteVehicle, setDefaultVehicle, formatLicensePlate, validateLicensePlate } from '../services/api/vehicles';

// הוסרו AsyncStorage keys - עובדים רק מהשרת

const PAYMENT_OPTIONS = [
  { key: 'card',     label: 'כרטיס אשראי', icon: 'card' },
  { key: 'paypal',   label: 'PayPal',      icon: 'logo-paypal' },
  { key: 'applepay', label: 'Apple Pay',   icon: 'logo-apple' },
];

function emailValid(email) {
  if (!email) return true;
  const re = /\S+@\S+\.\S+/;
  return re.test(email);
}
const normalizePlate = (s='') => s.replace(/\D/g,'');

function iconForType(type) {
  if (type === 'home') return 'home';
  if (type === 'work') return 'briefcase';
  return 'location';
}
const normLabel = (s='') => s.trim().toLowerCase();

export default function ProfileScreen() {
  const navigation = useNavigation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = makeStyles(theme);
  const { user, isAuthenticated, logout } = useAuth();
  const { clearIntendedDestination } = useNavigationContext();

  // Debug log for ProfileScreen access
  console.log('👤 ProfileScreen loaded - isAuthenticated:', isAuthenticated, 'user exists:', !!user);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // פרופיל בסיסי
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [payment, setPayment] = useState('card');
  const [stats, setStats] = useState(null);

  // רכבים
  const [vehicles, setVehicles] = useState([]);
  const [newPlate, setNewPlate] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // מקומות שמורים
  const [savedPlaces, setSavedPlaces] = useState([]);
  const [placeType, setPlaceType] = useState(null);   // 'home' | 'work' | 'custom' | null
  const [customLabel, setCustomLabel] = useState('');
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeCoords, setPlaceCoords] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const suggestTimer = useRef(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      // טעינה מהשרת
      const [profileResult, vehiclesResult, statsResult, rawPlaces] = await Promise.all([
        getUserProfile(),
        getUserVehicles(),
        getUserStats(),
        // TODO: העברת מקומות שמורים לשרת
      ]);

      // עדכון פרופיל
      if (profileResult.success && profileResult.data) {
        const profile = profileResult.data;
        setName(profile.name || '');
        setEmail(profile.email || '');
        setPhone(profile.phone || '');
      } else if (user) {
        // fallback לנתוני המשתמש מה-context
        setEmail(user.email || '');
        setName(user.name || '');
      }

      // עדכון רכבים
      if (vehiclesResult.success) {
        setVehicles(vehiclesResult.data);
      } else {
        console.error('Failed to load vehicles:', vehiclesResult.error);
        setVehicles([]);
      }

      // עדכון סטטיסטיקות
      if (statsResult.success) {
        setStats(statsResult.data);
      }

      // מקומות שמורים (עדיין מקומיים)
      setSavedPlaces(rawPlaces ? JSON.parse(rawPlaces) : []);
    } catch (error) {
      console.error('Failed to load profile data:', error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => { load(); }, [load]);

  const saveProfile = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert('שגיאה', 'יש להתחבר כדי לשמור את הפרופיל.');
      return;
    }

    // ולידציות
    if (!emailValid(email)) {
      Alert.alert('שגיאה', 'כתובת אימייל לא תקינה.');
      return;
    }

    const nameValidation = validateName(name.trim());
    if (!nameValidation.isValid) {
      Alert.alert('שגיאה', nameValidation.error);
      return;
    }

    if (phone && !validatePhoneNumber(phone)) {
      Alert.alert('שגיאה', 'מספר טלפון לא תקין.');
      return;
    }

    setSaving(true);
    try {
      const result = await updateUserProfile({
        name: name.trim() || null,
        phone: phone.trim() || null,
      });

      if (result.success) {
        // הוסרנו שמירה מקומית - רק שרת
        
        Alert.alert('נשמר', 'הפרופיל עודכן בהצלחה.');
      } else {
        Alert.alert('שגיאה', result.error || 'לא ניתן לשמור את הפרופיל.');
      }
    } catch (error) {
      console.error('Save profile error:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בשמירת הפרופיל.');
    } finally {
      setSaving(false);
    }
  }, [name, email, phone, payment, isAuthenticated]);

  const addVehicle = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert('שגיאה', 'יש להתחבר כדי להוסיף רכב.');
      return;
    }

    const plate = newPlate.trim();
    const desc = newDesc.trim();
    
    if (!plate) { 
      Alert.alert('שגיאה', 'נא להזין מספר רכב.'); 
      return; 
    }

    if (!validateLicensePlate(plate)) {
      Alert.alert('שגיאה', 'מספר רכב לא תקין.');
      return;
    }

    // בדיקה אם הרכב כבר קיים
    const formattedPlate = formatLicensePlate(plate);
    const exists = vehicles.some(v => 
      formatLicensePlate(v.licensePlate) === formattedPlate
    );
    
    if (exists) { 
      Alert.alert('שגיאה', 'מספר רכב כבר קיים.'); 
      return; 
    }

    setSaving(true);
    try {
      const result = await createVehicle({
        licensePlate: formattedPlate,
        description: desc || null,
        isDefault: vehicles.length === 0
      });

      if (result.success) {
        setVehicles(prev => [result.data, ...prev]);
        setNewPlate(''); 
        setNewDesc('');
        Alert.alert('נוסף', 'הרכב נוסף בהצלחה.');
      } else {
        Alert.alert('שגיאה', result.error || 'לא ניתן להוסיף את הרכב.');
      }
    } catch (error) {
      console.error('Add vehicle error:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בהוספת הרכב.');
    } finally {
      setSaving(false);
    }
  }, [newPlate, newDesc, vehicles, isAuthenticated]);

  const removeVehicle = useCallback(async (vehicleId) => {
    if (!isAuthenticated) {
      Alert.alert('שגיאה', 'יש להתחבר כדי למחוק רכב.');
      return;
    }

    Alert.alert(
      'מחיקת רכב',
      'האם אתה בטוח שברצונך למחוק את הרכב?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const result = await deleteVehicle(vehicleId);
              
              if (result.success) {
                setVehicles(prev => prev.filter(v => v.id !== vehicleId));
                Alert.alert('נמחק', 'הרכב נמחק בהצלחה.');
              } else {
                Alert.alert('שגיאה', result.error || 'לא ניתן למחוק את הרכב.');
              }
            } catch (error) {
              console.error('Remove vehicle error:', error);
              Alert.alert('שגיאה', 'אירעה שגיאה במחיקת הרכב.');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  }, [isAuthenticated]);

  const setDefaultVehicleHandler = useCallback(async (vehicleId) => {
    if (!isAuthenticated) {
      Alert.alert('שגיאה', 'יש להתחבר כדי לשנות רכב ברירת מחדל.');
      return;
    }

    setSaving(true);
    try {
      const result = await setDefaultVehicle(vehicleId);
      
      if (result.success) {
        // עדכון מקומי
        setVehicles(prev => prev.map(v => ({ 
          ...v, 
          isDefault: v.id === vehicleId 
        })));
        Alert.alert('עודכן', 'רכב ברירת המחדל שונה בהצלחה.');
      } else {
        Alert.alert('שגיאה', result.error || 'לא ניתן לשנות רכב ברירת מחדל.');
      }
    } catch (error) {
      console.error('Set default vehicle error:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בשינוי רכב ברירת המחדל.');
    } finally {
      setSaving(false);
    }
  }, [isAuthenticated]);

  const defaultVehicle = useMemo(() => vehicles.find(v => v.isDefault) || null, [vehicles]);

  // הצעות OSM
  useEffect(() => {
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    const q = (placeQuery || '').trim();
    if (q.length < 2) { setSuggestions([]); return; }
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await osmAutocomplete(q, { limit: 6, language: 'he' });
        setSuggestions(res || []);
      } catch { setSuggestions([]); }
    }, 220);
    return () => suggestTimer.current && clearTimeout(suggestTimer.current);
  }, [placeQuery]);

  const onPickSuggestion = (item) => {
    const label = item.description || item.display_name || placeQuery;
    setPlaceQuery(label);
    setPlaceCoords({ latitude: item.lat, longitude: item.lon });
    setSuggestions([]);
  };

  const useCurrentLocation = useCallback(async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('נדרשת הרשאה', 'אפשר הרשאת מיקום כדי להשתמש ב"מיקומי".');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPlaceCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      setPlaceQuery('המיקום הנוכחי שלי');
    } catch {
      Alert.alert('שגיאה', 'לא הצלחנו לאתר את המיקום כרגע.');
    }
  }, []);

  const savePlace = useCallback(async () => {
    if (!placeType) {
      Alert.alert('שגיאה', 'נא לבחור סוג מקום: בית / עבודה / אחר.');
      return;
    }
    const finalLabel =
      placeType === 'home' ? 'בית' :
      placeType === 'work' ? 'עבודה' :
      (customLabel.trim() || 'מקום');

    if (!placeCoords) {
      Alert.alert('שגיאה', 'נא לבחור כתובת מההצעות או להשתמש במיקומך.');
      return;
    }

    let next = [...savedPlaces];

    if (placeType === 'home' || placeType === 'work') {
      const fixedId = placeType;
      const item = { id: fixedId, label: finalLabel, icon: iconForType(placeType), coords: placeCoords, note: placeQuery || undefined };
      const idx = next.findIndex(p => p.id === fixedId);
      if (idx >= 0) next[idx] = item; else next = [item, ...next];
    } else {
      const n = normLabel(finalLabel);
      const existingIdx = next.findIndex(p => normLabel(p.label) === n && p.id !== 'home' && p.id !== 'work');
      if (existingIdx >= 0) {
        next[existingIdx] = { ...next[existingIdx], label: finalLabel, icon: iconForType('custom'), coords: placeCoords, note: placeQuery || undefined };
      } else {
        next = [{ id: `p-${Date.now()}`, label: finalLabel, icon: iconForType('custom'), coords: placeCoords, note: placeQuery || undefined }, ...next];
      }
    }

    setSavedPlaces(next);
    // TODO: שמירה בשרת

    setPlaceType(null);
    setCustomLabel('');
    setPlaceQuery('');
    setPlaceCoords(null);
    setSuggestions([]);

    Alert.alert('נשמר', 'המקום השמור עודכן בהצלחה. הוא יופיע במסך הבית.');
  }, [placeType, customLabel, placeCoords, placeQuery, savedPlaces]);

  const removePlace = useCallback(async (id) => {
    const next = savedPlaces.filter(p => p.id !== id);
    setSavedPlaces(next);
    // TODO: מחיקה בשרת
  }, [savedPlaces]);

  // פונקציית התנתקות
  const handleLogout = useCallback(async () => {
    Alert.alert(
      'התנתקות',
      'האם אתה בטוח שברצונך להתנתק?',
      [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'התנתק',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚪 User requested logout from ProfileScreen');
              
              // ניקוי NavigationContext לפני logout
              await clearIntendedDestination();
              console.log('🎯 Cleared navigation intended destinations');
              
              await logout();
              console.log('✅ Logout completed successfully');
              navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              });
            } catch (error) {
              console.error('❌ Logout failed:', error);
              Alert.alert('שגיאה', 'אירעה שגיאה בהתנתקות. נסה שוב.');
            }
          }
        }
      ]
    );
  }, [logout, navigation, clearIntendedDestination]);

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>טוען פרופיל…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

      {/* פרטים אישיים */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons name="person-outline" size={16} color="#fff" style={styles.cardIconWrap} />
          <Text style={styles.section}>פרטים אישיים</Text>
        </View>

        <Text style={styles.label}>שם מלא</Text>
        <TextInput
          style={styles.input}
          placeholder="לדוגמה: ישראל ישראלי"
          placeholderTextColor={theme.colors.subtext}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>אימייל (לחשבוניות)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: theme.colors.border, color: theme.colors.subtext }]}
          placeholder="you@example.com"
          placeholderTextColor={theme.colors.subtext}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={false}
        />

        <Text style={styles.label}>מספר טלפון</Text>
        <TextInput
          style={styles.input}
          placeholder="לדוגמה: 050-123-4567"
          placeholderTextColor={theme.colors.subtext}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />

        <Text style={[styles.label, { marginTop: theme.spacing.xs }]}>אמצעי תשלום ברירת מחדל</Text>

        {/* דרכי תשלום — מיושרות לשמאל */}
        <View style={styles.paymentRowLeft}>
          {PAYMENT_OPTIONS.map(opt => {
            const active = payment === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.payChip, active && styles.payChipActive]}
                onPress={() => setPayment(opt.key)}
                activeOpacity={0.9}
              >
                <Ionicons name={opt.icon} size={16} color={active ? '#fff' : theme.colors.primary} style={{ marginEnd:6 }} />
                <Text style={[styles.payChipText, active && styles.payChipTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ZpButton 
          title={saving ? "שומר..." : "שמור פרופיל"} 
          onPress={saveProfile} 
          disabled={saving}
          style={{ marginTop: theme.spacing.lg }} 
        />
      </View>

      {/* מקומות שמורים */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons name="location-outline" size={16} color="#fff" style={styles.cardIconWrap} />
          <Text style={styles.section}>מקומות שמורים (לדף הבית)</Text>
        </View>

        {savedPlaces.length === 0 ? (
          <Text style={styles.hint}>טרם הוגדרו מקומות שמורים. הוסיפו למטה “בית”, “עבודה” או מקום מותאם.</Text>
        ) : (
          savedPlaces.map(p => (
            <View key={p.id} style={styles.placeRow}>
              {/* מחק — לימין */}
              <TouchableOpacity style={styles.deleteBtn} onPress={() => removePlace(p.id)} activeOpacity={0.9}>
                <Text style={styles.deleteBtnText}>מחק</Text>
              </TouchableOpacity>

              {/* תוכן (כתובת/הערה בלבד) */}
              <View style={{ flex:1 }}>
                <Text style={styles.placeTitle}>{p.label}</Text>
                {!!p.note && <Text style={styles.placeNote} numberOfLines={1}>{p.note}</Text>}
              </View>

              {/* אייקון בצמוד לשמאל */}
              <Ionicons
                name={p.icon || 'location'}
                size={18}
                color={theme.colors.primary}
                style={{ marginStart: 8 }}
              />
            </View>
          ))
        )}

        {/* הוספה/עדכון */}
        <View style={styles.addBox}>
          <Text style={styles.label}>בחרו סוג מקום</Text>

          {/* בית/עבודה/אחר — מיושרים לשמאל */}
          <View style={styles.quickRowLeft}>
            {[
              { key: 'home',  label: 'בית'   },
              { key: 'work',  label: 'עבודה' },
              { key: 'custom',label: 'אחר'   },
            ].map(opt => {
              const active = placeType === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.quickChip, active && styles.quickChipActive]}
                  onPress={() => setPlaceType(opt.key)}
                  activeOpacity={0.9}
                >
                  <Ionicons name={iconForType(opt.key)} size={14} color={active ? '#fff' : theme.colors.primary} style={{ marginEnd:6 }} />
                  <Text style={[styles.quickChipText, active && styles.quickChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {placeType === 'custom' && (
            <>
              <Text style={styles.label}>שם מותאם אישית</Text>
              <TextInput
                style={styles.input}
                placeholder="לדוגמה: חדר כושר / מסעדה אהובה"
                placeholderTextColor={theme.colors.subtext}
                value={customLabel}
                onChangeText={setCustomLabel}
              />
            </>
          )}

          <Text style={styles.label}>כתובת / אזור</Text>
          <TextInput
            style={styles.input}
            placeholder="הקלידו כתובת ובחרו מההצעות…"
            placeholderTextColor={theme.colors.subtext}
            value={placeQuery}
            onChangeText={(t) => { setPlaceQuery(t); setPlaceCoords(null); }}
          />

          {/* "השתמשו במיקומי הנוכחי" מתחת לשדה הכתובת */}
          <TouchableOpacity style={[styles.actionBtnGhost, { marginTop: theme.spacing.xs }]} onPress={useCurrentLocation} activeOpacity={0.9}>
            <Text style={styles.actionBtnGhostText}>השתמשו במיקומי הנוכחי</Text>
          </TouchableOpacity>

          {/* הצעות — לימין (RTL) */}
          {suggestions.length > 0 && (
            <View style={styles.suggestBox}>
              <FlatList
                keyboardShouldPersistTaps="handled"
                data={suggestions}
                keyExtractor={(i, idx) => String(i.id || i.place_id || idx)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.suggestItem} onPress={() => onPickSuggestion(item)} activeOpacity={0.9}>
                    <Ionicons name="location" size={16} color={theme.colors.primary} style={{ marginStart:8 }} />
                    <Text style={styles.suggestText} numberOfLines={1}>
                      {item.description || item.display_name || 'לא ידוע'}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          {/* "שמור מקום" כמו "שמור פרופיל" */}
          <ZpButton
            title="שמור מקום"
            onPress={savePlace}
            style={{ marginTop: theme.spacing.sm }}
            textStyle={{ fontWeight: '800' }}
            leftIcon={<Ionicons name="save-outline" size={18} color="#fff" style={{ marginEnd: 8 }} />}
          />
        </View>
      </View>

      {/* רכבים */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Ionicons name="car-outline" size={16} color="#fff" style={styles.cardIconWrap} />
          <Text style={styles.section}>הרכבים שלי</Text>
        </View>

        {vehicles.length === 0 ? (
          <Text style={styles.hint}>לא הוספתם עדיין רכבים. הוסיפו רכב למטה.</Text>
        ) : (
          vehicles.map(v => (
            <View key={v.id} style={styles.vehicleRow}>
              {/* מחק — לימין */}
              <TouchableOpacity
                style={[styles.smallBtn, { borderColor: theme.colors.error }]}
                onPress={() => removeVehicle(v.id)}
                activeOpacity={0.9}
              >
                <Text style={[styles.smallBtnText, { color: theme.colors.error }]}>מחק</Text>
              </TouchableOpacity>

              {/* תוכן */}
              <View style={{ flex:1 }}>
                <Text style={styles.vehicleTitle}>{v.licensePlate || v.plate}</Text>
                {!!(v.description || v.desc) && <Text style={styles.vehicleDesc}>{v.description || v.desc}</Text>}
                {v.isDefault && <Text style={styles.defaultBadge}>ברירת מחדל</Text>}
              </View>

              {/* קבע כברירת מחדל — גרסה עדינה ונעימה */}
              {!v.isDefault && (
                <TouchableOpacity style={styles.setDefaultBtn} onPress={() => setDefaultVehicleHandler(v.id)} activeOpacity={0.9}>
                  <Text style={styles.setDefaultBtnText}>קבעו כברירת מחדל</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}

        {/* הוספת רכב */}
        <View style={styles.addBox}>
          <Text style={styles.label}>מספר רכב</Text>
          <TextInput
            style={styles.input}
            placeholder="לדוגמה: 12-345-67"
            placeholderTextColor={theme.colors.subtext}
            value={newPlate}
            onChangeText={setNewPlate}
            keyboardType="numbers-and-punctuation"
          />
          <Text style={styles.label}>תיאור (לא חובה)</Text>
          <TextInput
            style={styles.input}
            placeholder="לדוגמה: מאזדה 3 לבנה"
            placeholderTextColor={theme.colors.subtext}
            value={newDesc}
            onChangeText={setNewDesc}
          />
          <ZpButton
            title={saving ? "מוסיף..." : "הוסיפו רכב"}
            onPress={addVehicle}
            disabled={saving}
            leftIcon={<Ionicons name="add" size={18} color="#fff" style={{ marginEnd: 8 }} />}
          />
        </View>
      </View>

      {/* רכב ברירת מחדל — אייקון ושורה מיושרים לשמאל */}
      {!!defaultVehicle && (
        <View style={styles.defaultSummaryCard}>
          <Ionicons name="car-sport" size={20} color={theme.colors.primary} style={{ marginRight:8 }} />
          <Text style={styles.defaultSummaryText}>
            רכב ברירת מחדל: {defaultVehicle.licensePlate || defaultVehicle.plate}{(defaultVehicle.description || defaultVehicle.desc) ? ` – ${defaultVehicle.description || defaultVehicle.desc}` : ''}
          </Text>
        </View>
      )}

      {/* סטטיסטיקות משתמש */}
      {!!stats && (
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Ionicons name="stats-chart-outline" size={16} color="#fff" style={styles.cardIconWrap} />
            <Text style={styles.section}>הסטטיסטיקות שלי</Text>
          </View>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.bookings?.total || 0}</Text>
              <Text style={styles.statLabel}>הזמנות</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats.vehicles?.total || 0}</Text>
              <Text style={styles.statLabel}>רכבים</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>₪{stats.spending?.total?.toFixed(0) || 0}</Text>
              <Text style={styles.statLabel}>הוצאות</Text>
            </View>
          </View>
        </View>
      )}

      {/* כפתור התנתקות */}
      {isAuthenticated && (
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" style={styles.logoutIcon} />
            <Text style={styles.logoutText}>התנתק</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={{ height: Math.max(insets.bottom + 70, theme.spacing.xl) }} />
    </ScrollView>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  return StyleSheet.create({
    container:{ padding: spacing.lg, backgroundColor: colors.bg, direction: 'rtl' },
    center:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor: colors.bg },
    centerText:{ color: colors.text, textAlign: 'center' },

    header:{ fontSize:22, fontWeight:'800', textAlign:'center', marginBottom: spacing.md, color: colors.text },

    card:{
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
      shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:2,
      borderWidth:1, borderColor: colors.border,
    },

    // כותרת משנית
    headerRow:{
      flexDirection:'row',
      alignItems:'center',
      justifyContent:'flex-start',
      gap:8,
      marginBottom: spacing.sm,
    },
    cardIconWrap:{
      width: 24, height: 24, borderRadius: 12,
      textAlignVertical: 'center',
      textAlign: 'center',
      backgroundColor: colors.primary,
      color:'#fff',
      overflow:'hidden',
      paddingTop: 3,
    },
    section:{ fontSize:16, fontWeight:'700', color: colors.text, textAlign: 'left', flex:1, writingDirection:'ltr' },

    label:{ fontSize:13, color: colors.subtext, marginBottom:6, marginTop:6, textAlign: 'left', writingDirection: 'ltr' },

    // קלטים: טקסט ו-placeholder לימין תמיד
    input:{
      height:48,
      borderRadius: borderRadii.sm,
      borderWidth:1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal:12,
      fontSize:15,
      marginBottom:8,
      color: colors.text,
      textAlign:'right',
      writingDirection:'rtl'
    },

    hint:{ fontSize:12, color: colors.subtext, textAlign:'left', writingDirection:'ltr' },

    // דרכי תשלום — לשמאל
    paymentRowLeft:{ flexDirection:'row', flexWrap:'wrap', gap:8, marginTop: spacing.xs, justifyContent:'flex-start', marginBottom: spacing.sm },
    payChip:{
      flexDirection:'row', alignItems:'center',
      paddingVertical:8, paddingHorizontal:12,
      borderRadius:999, borderWidth:1, borderColor: colors.primary,
      backgroundColor: colors.surface,
      shadowColor:'#000', shadowOpacity:0.04, shadowRadius:10, shadowOffset:{ width:0, height:4 }, elevation:1
    },
    payChipActive:{ backgroundColor: colors.primary, borderColor: colors.primary },
    payChipText:{ color: colors.primary, fontWeight:'700', textAlign:'left' },
    payChipTextActive:{ color:'#fff', fontWeight:'700', textAlign:'left' },

    // רכבים
    vehicleRow:{
      flexDirection:'row-reverse',
      alignItems:'center',
      gap:8,
      paddingVertical:8,
      borderBottomWidth:1,
      borderBottomColor: colors.border
    },
    vehicleTitle:{ fontSize:15, fontWeight:'700', color: colors.text, textAlign:'left', writingDirection:'ltr' },
    vehicleDesc:{ fontSize:13, color: colors.subtext, textAlign:'left', writingDirection:'ltr' },

    defaultBadge:{
      marginTop:4, alignSelf:'flex-start',
      backgroundColor:'#EEF3FF', borderColor: colors.border, borderWidth:1,
      borderRadius: 999, paddingHorizontal:8, paddingVertical:4,
      color: colors.primary, fontWeight:'700', fontSize:12
    },

    smallBtn:{
      paddingVertical:8, paddingHorizontal:10,
      borderRadius: borderRadii.sm,
      borderWidth:1, borderColor: colors.primary,
      backgroundColor: colors.surface
    },
    smallBtnText:{ color: colors.primary, fontWeight:'700', textAlign:'left', writingDirection:'ltr' },

    // כפתור "קבעו כברירת מחדל" — עדין
    setDefaultBtn:{
      paddingVertical:6,
      paddingHorizontal:10,
      borderRadius: borderRadii.sm,
      borderWidth:1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    setDefaultBtnText:{
      color: colors.text,
      fontWeight:'600',
      fontSize:13,
      textAlign:'left',
      writingDirection:'ltr'
    },

    // מקומות שמורים
    placeRow:{
      flexDirection:'row-reverse',
      alignItems:'center',
      gap:8,
      paddingVertical:10,
      borderBottomWidth:1,
      borderBottomColor: colors.border
    },

    // כפתור מחיקה — תמיד בצד ימין
    deleteBtn:{
      paddingVertical:8, paddingHorizontal:12,
      borderRadius: borderRadii.sm,
      borderWidth:1, borderColor: colors.error,
      backgroundColor: colors.surface,
      minWidth: 64,
      alignItems:'center', justifyContent:'center',
      marginStart:8
    },
    deleteBtnText:{ color: colors.error, fontWeight:'800', textAlign:'center' },

    placeTitle:{ color: colors.text, fontWeight:'800', textAlign:'left', writingDirection:'ltr' },
    placeNote:{ color: colors.subtext, fontSize:12, textAlign:'left', writingDirection:'ltr' },

    addBox:{ marginTop:8, backgroundColor: colors.surface, borderRadius: borderRadii.md, borderWidth:1, borderColor: colors.border, padding: spacing.md },

    // בית/עבודה/אחר — לשמאל
    quickRowLeft:{ flexDirection:'row', alignItems:'center', flexWrap:'wrap', justifyContent:'flex-start' },
    quickChip:{
      flexDirection:'row', alignItems:'center',
      paddingVertical:8, paddingHorizontal:12,
      borderRadius:999, borderWidth:1, borderColor: colors.primary,
      backgroundColor: colors.surface,
      marginRight:8, marginBottom:8,
    },
    quickChipActive:{ backgroundColor: colors.primary, borderColor: colors.primary },
    quickChipText:{ color: colors.primary, fontWeight:'700', textAlign:'left' },
    quickChipTextActive:{ color:'#fff', fontWeight:'800', textAlign:'left' },

    // הצעות כתובת — לימין (RTL)
    suggestBox:{
      backgroundColor: colors.surface,
      borderRadius: borderRadii.sm,
      borderWidth:1, borderColor: colors.border,
      maxHeight: 200, marginTop: 4, overflow:'hidden',
      shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:2
    },
    suggestItem:{
      flexDirection:'row-reverse',
      paddingVertical:10, paddingHorizontal:12,
      borderBottomWidth:1, borderBottomColor: colors.border,
      alignItems:'center'
    },
    suggestText:{ flex:1, color: colors.text, textAlign:'right', writingDirection:'rtl' },

    // כפתורי פעולה — אנכי
    actionBtnGhost:{
      minHeight:46,
      borderRadius: borderRadii.md,
      borderWidth:1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems:'center',
      justifyContent:'center'
    },
    actionBtnGhostText:{ color: colors.text, fontWeight:'700' },

    // סיכום — רכב ברירת מחדל
    defaultSummaryCard:{
      flexDirection:'row',
      alignItems:'center',
      backgroundColor:'#F6F8FF',
      borderWidth:1,
      borderColor: colors.border,
      borderRadius: borderRadii.md,
      paddingVertical: spacing.md + 2,
      paddingHorizontal: spacing.lg,
      marginTop: spacing.lg,
      shadowColor:'#000', shadowOpacity:0.03, shadowRadius:8, shadowOffset:{ width:0, height:4 }
    },
    defaultSummaryText:{
      flex:1,
      color: colors.text,
      fontWeight:'800',
      fontSize:16,
      textAlign:'left',
      writingDirection:'ltr'
    },

    // סטטיסטיקות
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: spacing.md,
    },
    statItem: {
      alignItems: 'center',
      flex: 1,
    },
    statNumber: {
      fontSize: 24,
      fontWeight: '800',
      color: colors.primary,
      textAlign: 'center',
    },
    statLabel: {
      fontSize: 12,
      color: colors.subtext,
      textAlign: 'center',
      marginTop: spacing.xs,
    },

    // Header עם כפתור חזרה
    headerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
      paddingBottom: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      borderRadius: borderRadii.sm,
      backgroundColor: colors.surface,
    },
    backText: {
      color: colors.primary,
      fontWeight: '600',
      marginLeft: spacing.xs,
      fontSize: 16,
    },

    // כפתור התנתקות
    logoutSection: {
      marginTop: spacing.xl,
      paddingTop: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: 'center',
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#DC2626', // אדום
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadii.lg,
      minWidth: 140,
      shadowColor: '#DC2626',
      shadowOpacity: 0.3,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    logoutIcon: {
      marginRight: spacing.sm,
    },
    logoutText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '700',
    },
  });
}
