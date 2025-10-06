// screens/OwnerPricingScreen.js - עריכת מחירון
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@shopify/restyle';
import { Ionicons } from '@expo/vector-icons';
import ZpButton from '../components/ui/ZpButton';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function OwnerPricingScreen({ route, navigation }) {
  const { id } = route.params;
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [parking, setParking] = useState(null);
  
  // מחירון לפי שעות (1-12)
  const [pricing, setPricing] = useState({
    hour1: '',
    hour2: '',
    hour3: '',
    hour4: '',
    hour5: '',
    hour6: '',
    hour7: '',
    hour8: '',
    hour9: '',
    hour10: '',
    hour11: '',
    hour12: '',
  });

  useEffect(() => {
    loadParking();
  }, [id]);

  const loadParking = async () => {
    try {
      const response = await api.get(`/api/owner/parkings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParking(response.data);
      
      // טען מחירון קיים אם יש
      if (response.data.pricing) {
        try {
          const existingPricing = JSON.parse(response.data.pricing);
          setPricing(existingPricing);
        } catch (e) {
          // אם אין מחירון, השאר ריק
        }
      }
    } catch (error) {
      console.error('Load parking error:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לטעון את פרטי החניה');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // בדיקה שכל השדות מלאים
    const allFilled = Object.values(pricing).every(val => val && !isNaN(parseFloat(val)));
    if (!allFilled) {
      Alert.alert('שגיאה', 'יש למלא את כל המחירים');
      return;
    }

    setSaving(true);
    try {
      await api.patch(`/api/owner/parkings/${id}`, {
        pricing: JSON.stringify(pricing)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      Alert.alert('הצלחה', 'המחירון עודכן בהצלחה', [
        { text: 'אישור', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error('Save pricing error:', error);
      Alert.alert('שגיאה', 'לא הצלחנו לשמור את המחירון');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <View style={styles.header}>
        <Ionicons name="pricetag" size={32} color={theme.colors.primary} />
        <Text style={styles.title}>עריכת מחירון</Text>
        <Text style={styles.subtitle}>{parking?.title}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>מחיר לפי שעות</Text>
        <Text style={styles.cardSubtitle}>הגדר מחיר שונה לכל שעה (1-12)</Text>

        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(hour => (
          <View key={hour} style={styles.priceRow}>
            <View style={styles.priceLabel}>
              <Ionicons name="time" size={20} color={theme.colors.primary} />
              <Text style={styles.priceLabelText}>שעה {hour}</Text>
            </View>
            <View style={styles.priceInput}>
              <TextInput
                style={styles.input}
                value={pricing[`hour${hour}`]}
                onChangeText={(text) => setPricing(prev => ({ ...prev, [`hour${hour}`]: text }))}
                placeholder="0"
                placeholderTextColor={theme.colors.subtext}
                keyboardType="numeric"
              />
              <Text style={styles.currency}>₪</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={24} color={theme.colors.accent} />
        <Text style={styles.infoText}>
          המחירון יחושב אוטומטית לפי משך השכירות. לדוגמה: שכירות של 3 שעות = שעה 1 + שעה 2 + שעה 3
        </Text>
      </View>

      <ZpButton
        title={saving ? 'שומר...' : 'שמור מחירון'}
        onPress={handleSave}
        disabled={saving}
        leftIcon={<Ionicons name="checkmark" size={20} color="#fff" style={{ marginEnd: 8 }} />}
      />
    </ScrollView>
  );
}

function makeStyles(theme) {
  const { colors, spacing } = theme;
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    header: {
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginTop: 12,
    },
    subtitle: {
      fontSize: 16,
      color: colors.subtext,
      marginTop: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      marginBottom: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    cardSubtitle: {
      fontSize: 14,
      color: colors.subtext,
      marginBottom: 24,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    priceLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    priceLabelText: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    priceInput: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    input: {
      width: 80,
      height: 44,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: 12,
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'center',
    },
    currency: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.primary,
    },
    infoBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: `${colors.accent}15`,
      padding: 16,
      borderRadius: 12,
      marginBottom: 24,
    },
    infoText: {
      flex: 1,
      fontSize: 14,
      color: colors.text,
      lineHeight: 20,
    },
  });
}
