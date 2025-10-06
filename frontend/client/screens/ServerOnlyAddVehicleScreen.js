/**
 * מסך הוספת רכב - Server-Only Architecture
 * כל הנתונים נשלחים לשרת, אין שמירה מקומית כלל
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';

import { useAuthContext } from '../contexts/ServerOnlyAuthContext';
import { useOfflineMode } from '../hooks/useOfflineMode';
import useServerOnlyVehicles from '../hooks/useServerOnlyVehicles';
import OfflineScreen from '../components/offline/OfflineScreen';

const VEHICLE_COLORS = [
  { key: 'white', label: 'לבן', color: '#FFFFFF' },
  { key: 'black', label: 'שחור', color: '#000000' },
  { key: 'silver', label: 'כסף', color: '#C0C0C0' },
  { key: 'gray', label: 'אפור', color: '#808080' },
  { key: 'red', label: 'אדום', color: '#FF0000' },
  { key: 'blue', label: 'כחול', color: '#0000FF' },
  { key: 'green', label: 'ירוק', color: '#008000' },
  { key: 'yellow', label: 'צהוב', color: '#FFFF00' },
  { key: 'orange', label: 'כתום', color: '#FFA500' },
  { key: 'brown', label: 'חום', color: '#A52A2A' },
];

const POPULAR_MAKES = [
  'טויוטה', 'הונדה', 'ניסאן', 'מזדה', 'סובארו', 'מיצובישי',
  'סוזוקי', 'קיה', 'יונדאי', 'פולקסווגן', 'אאודי', 'BMW',
  'מרצדס', 'פיג\'ו', 'רנו', 'סיטרואן', 'סקודה', 'סיאט'
];

export default function ServerOnlyAddVehicleScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  
  const { isAuthenticated } = useAuthContext();
  const { isFullyOnline, isOfflineMode, retryConnection } = useOfflineMode();
  
  const {
    createVehicle,
    validateLicensePlate,
    formatLicensePlate,
    isLicensePlateExists,
    vehicles,
    canManageVehicles
  } = useServerOnlyVehicles();

  // פרמטרים מהניווט
  const { onSuccess } = route.params || {};

  // State של הטופס
  const [formData, setFormData] = useState({
    licensePlate: '',
    make: '',
    model: '',
    color: '',
    year: '',
    description: '',
    isDefault: vehicles.length === 0 // אם זה הרכב הראשון, הגדר כברירת מחדל
  });

  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showMakePicker, setShowMakePicker] = useState(false);

  /**
   * עדכון שדה בטופס
   */
  const updateField = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // ניקוי שגיאת validation של השדה
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }

    // פורמט מיוחד למספר רכב
    if (field === 'licensePlate' && value) {
      const formatted = formatLicensePlate(value);
      if (formatted !== value) {
        setFormData(prev => ({ ...prev, licensePlate: formatted }));
      }
    }
  }, [validationErrors, formatLicensePlate]);

  /**
   * ולידציה של הטופס
   */
  const validateForm = useCallback(() => {
    const errors = {};

    // מספר רכב
    if (!formData.licensePlate?.trim()) {
      errors.licensePlate = 'מספר רכב הוא שדה חובה';
    } else if (!validateLicensePlate(formData.licensePlate)) {
      errors.licensePlate = 'מספר רכב לא תקין (7-8 ספרות)';
    } else if (isLicensePlateExists(formData.licensePlate)) {
      errors.licensePlate = 'מספר רכב זה כבר קיים במערכת';
    }

    // שנת ייצור
    if (formData.year && (isNaN(formData.year) || formData.year < 1900 || formData.year > new Date().getFullYear() + 1)) {
      errors.year = 'שנת ייצור לא תקינה';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, validateLicensePlate, isLicensePlateExists]);

  /**
   * שמירת רכב - רק בשרת
   */
  const handleSaveVehicle = useCallback(async () => {
    if (!canManageVehicles) {
      Alert.alert('אין חיבור לשרת', 'הוספת רכב דורשת חיבור לאינטרנט.');
      return;
    }

    // ולידציה
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      console.log('🚗 Creating vehicle on server...', formData);

      // הכנת נתונים לשליחה
      const vehicleData = {
        licensePlate: formData.licensePlate.trim(),
        make: formData.make.trim() || null,
        model: formData.model.trim() || null,
        color: formData.color || null,
        year: formData.year ? parseInt(formData.year) : null,
        description: formData.description.trim() || null,
        isDefault: formData.isDefault
      };

      const result = await createVehicle(vehicleData);
      
      if (result.success) {
        console.log('✅ Vehicle created successfully:', result.data);
        
        Alert.alert(
          'רכב נוסף בהצלחה!',
          `הרכב ${formatLicensePlate(result.data.licensePlate)} נוסף למערכת.`,
          [
            {
              text: 'אישור',
              onPress: () => {
                if (onSuccess) {
                  onSuccess(result.data);
                }
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        console.error('❌ Vehicle creation failed:', result.error);
        Alert.alert('שגיאה', result.error);
      }
    } catch (error) {
      console.error('❌ Vehicle creation error:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה לא צפויה בהוספת הרכב.');
    } finally {
      setLoading(false);
    }
  }, [canManageVehicles, validateForm, formData, createVehicle, formatLicensePlate, onSuccess, navigation]);

  // בדיקת הרשאות
  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="person-outline" size={64} color={colors.error} />
          <Text style={[styles.errorTitle, { color: colors.error }]}>
            נדרשת התחברות
          </Text>
          <Text style={[styles.errorMessage, { color: colors.subtext }]}>
            יש להתחבר כדי להוסיף רכב
          </Text>
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.loginButtonText}>התחבר</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // מסך offline
  if (isOfflineMode) {
    return (
      <OfflineScreen
        title="אין חיבור לאינטרנט"
        message="הוספת רכב דורשת חיבור לאינטרנט. בדוק את החיבור ונסה שוב."
        onRetry={retryConnection}
        retryText="נסה שוב"
        customAction={{
          text: 'חזור',
          onPress: () => navigation.goBack()
        }}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* כותרת */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            הוספת רכב חדש
          </Text>
          
          <View style={styles.headerRight} />
        </View>

        {/* טופס */}
        <View style={styles.form}>
          {/* מספר רכב */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              מספר רכב *
            </Text>
            <View style={[
              styles.inputContainer,
              { backgroundColor: colors.surface, borderColor: colors.border },
              validationErrors.licensePlate && { borderColor: colors.error }
            ]}>
              <Ionicons name="car-outline" size={20} color={colors.subtext} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="123-45-678"
                placeholderTextColor={colors.subtext}
                value={formData.licensePlate}
                onChangeText={(value) => updateField('licensePlate', value)}
                maxLength={10}
                keyboardType="numeric"
                textAlign="center"
                editable={!loading}
              />
            </View>
            {validationErrors.licensePlate && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {validationErrors.licensePlate}
              </Text>
            )}
          </View>

          {/* יצרן */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              יצרן
            </Text>
            <TouchableOpacity
              style={[
                styles.inputContainer,
                { backgroundColor: colors.surface, borderColor: colors.border }
              ]}
              onPress={() => setShowMakePicker(true)}
            >
              <Ionicons name="business-outline" size={20} color={colors.subtext} />
              <Text style={[
                styles.input,
                { color: formData.make ? colors.text : colors.subtext }
              ]}>
                {formData.make || 'בחר יצרן'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          {/* דגם */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              דגם
            </Text>
            <View style={[
              styles.inputContainer,
              { backgroundColor: colors.surface, borderColor: colors.border }
            ]}>
              <Ionicons name="car-sport-outline" size={20} color={colors.subtext} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="קורולה, סיוויק, וכו'"
                placeholderTextColor={colors.subtext}
                value={formData.model}
                onChangeText={(value) => updateField('model', value)}
                editable={!loading}
              />
            </View>
          </View>

          {/* צבע */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              צבע
            </Text>
            <TouchableOpacity
              style={[
                styles.inputContainer,
                { backgroundColor: colors.surface, borderColor: colors.border }
              ]}
              onPress={() => setShowColorPicker(true)}
            >
              <View style={styles.colorPreview}>
                {formData.color ? (
                  <View style={[
                    styles.colorDot,
                    { backgroundColor: formData.color === 'white' ? colors.border : formData.color }
                  ]} />
                ) : (
                  <Ionicons name="color-palette-outline" size={20} color={colors.subtext} />
                )}
              </View>
              <Text style={[
                styles.input,
                { color: formData.color ? colors.text : colors.subtext }
              ]}>
                {formData.color ? VEHICLE_COLORS.find(c => c.key === formData.color)?.label : 'בחר צבע'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={colors.subtext} />
            </TouchableOpacity>
          </View>

          {/* שנת ייצור */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              שנת ייצור
            </Text>
            <View style={[
              styles.inputContainer,
              { backgroundColor: colors.surface, borderColor: colors.border },
              validationErrors.year && { borderColor: colors.error }
            ]}>
              <Ionicons name="calendar-outline" size={20} color={colors.subtext} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="2020"
                placeholderTextColor={colors.subtext}
                value={formData.year}
                onChangeText={(value) => updateField('year', value)}
                keyboardType="numeric"
                maxLength={4}
                editable={!loading}
              />
            </View>
            {validationErrors.year && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {validationErrors.year}
              </Text>
            )}
          </View>

          {/* תיאור */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              תיאור נוסף
            </Text>
            <View style={[
              styles.textAreaContainer,
              { backgroundColor: colors.surface, borderColor: colors.border }
            ]}>
              <TextInput
                style={[styles.textArea, { color: colors.text }]}
                placeholder="הערות נוספות על הרכב..."
                placeholderTextColor={colors.subtext}
                value={formData.description}
                onChangeText={(value) => updateField('description', value)}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!loading}
              />
            </View>
          </View>

          {/* ברירת מחדל */}
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => updateField('isDefault', !formData.isDefault)}
          >
            <View style={[
              styles.checkbox,
              { borderColor: colors.border },
              formData.isDefault && { backgroundColor: colors.primary, borderColor: colors.primary }
            ]}>
              {formData.isDefault && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
            <Text style={[styles.checkboxLabel, { color: colors.text }]}>
              הגדר כרכב ברירת מחדל
            </Text>
          </TouchableOpacity>
        </View>

        {/* כפתור שמירה */}
        <View style={styles.bottomSection}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.primary },
              loading && styles.disabledButton
            ]}
            onPress={handleSaveVehicle}
            disabled={loading || !canManageVehicles}
          >
            {loading ? (
              <Text style={styles.saveButtonText}>שומר רכב...</Text>
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>שמור רכב</Text>
              </>
            )}
          </TouchableOpacity>
          
          {!isFullyOnline && (
            <Text style={[styles.offlineWarning, { color: colors.warning }]}>
              נדרש חיבור לשרת לשמירת הרכב
            </Text>
          )}
        </View>
      </ScrollView>

      {/* מודל בחירת צבע */}
      <ColorPickerModal
        visible={showColorPicker}
        colors={VEHICLE_COLORS}
        selectedColor={formData.color}
        onSelect={(color) => {
          updateField('color', color);
          setShowColorPicker(false);
        }}
        onClose={() => setShowColorPicker(false)}
        themeColors={colors}
      />

      {/* מודל בחירת יצרן */}
      <MakePickerModal
        visible={showMakePicker}
        makes={POPULAR_MAKES}
        selectedMake={formData.make}
        onSelect={(make) => {
          updateField('make', make);
          setShowMakePicker(false);
        }}
        onClose={() => setShowMakePicker(false)}
        themeColors={colors}
      />
    </KeyboardAvoidingView>
  );
}

// רכיב מודל בחירת צבע
function ColorPickerModal({ visible, colors, selectedColor, onSelect, onClose, themeColors }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: themeColors.bg }}>
        <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: themeColors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: themeColors.primary, fontSize: 16 }}>ביטול</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', color: themeColors.text }}>בחר צבע</Text>
            <TouchableOpacity onPress={() => onSelect('')}>
              <Text style={{ color: themeColors.subtext, fontSize: 16 }}>נקה</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView style={{ flex: 1, padding: 20 }}>
          {colors.map((color) => (
            <TouchableOpacity
              key={color.key}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor: themeColors.surface,
                borderRadius: 12,
                marginBottom: 12,
                borderWidth: selectedColor === color.key ? 2 : 1,
                borderColor: selectedColor === color.key ? themeColors.primary : themeColors.border,
              }}
              onPress={() => onSelect(color.key)}
            >
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: color.color === '#FFFFFF' ? themeColors.border : color.color,
                marginRight: 12,
                borderWidth: color.color === '#FFFFFF' ? 1 : 0,
                borderColor: themeColors.border
              }} />
              <Text style={{ fontSize: 16, color: themeColors.text, flex: 1 }}>
                {color.label}
              </Text>
              {selectedColor === color.key && (
                <Ionicons name="checkmark-circle" size={24} color={themeColors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// רכיב מודל בחירת יצרן
function MakePickerModal({ visible, makes, selectedMake, onSelect, onClose, themeColors }) {
  const [customMake, setCustomMake] = useState('');
  
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: themeColors.bg }}>
        <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: themeColors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ color: themeColors.primary, fontSize: 16 }}>ביטול</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '600', color: themeColors.text }}>בחר יצרן</Text>
            <TouchableOpacity onPress={() => onSelect('')}>
              <Text style={{ color: themeColors.subtext, fontSize: 16 }}>נקה</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <ScrollView style={{ flex: 1, padding: 20 }}>
          {/* יצרן מותאם אישית */}
          <View style={{ marginBottom: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: themeColors.text, marginBottom: 12 }}>
              יצרן אחר
            </Text>
            <View style={{
              flexDirection: 'row',
              backgroundColor: themeColors.surface,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: themeColors.border,
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}>
              <TextInput
                style={{ flex: 1, fontSize: 16, color: themeColors.text }}
                placeholder="הזן יצרן"
                placeholderTextColor={themeColors.subtext}
                value={customMake}
                onChangeText={setCustomMake}
              />
              <TouchableOpacity
                onPress={() => {
                  if (customMake.trim()) {
                    onSelect(customMake.trim());
                  }
                }}
                disabled={!customMake.trim()}
              >
                <Ionicons 
                  name="checkmark-circle" 
                  size={24} 
                  color={customMake.trim() ? themeColors.primary : themeColors.subtext} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* יצרנים פופולריים */}
          <Text style={{ fontSize: 16, fontWeight: '600', color: themeColors.text, marginBottom: 12 }}>
            יצרנים פופולריים
          </Text>
          {makes.map((make) => (
            <TouchableOpacity
              key={make}
              style={{
                padding: 16,
                backgroundColor: themeColors.surface,
                borderRadius: 12,
                marginBottom: 8,
                borderWidth: selectedMake === make ? 2 : 1,
                borderColor: selectedMake === make ? themeColors.primary : themeColors.border,
              }}
              onPress={() => onSelect(make)}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, color: themeColors.text }}>
                  {make}
                </Text>
                {selectedMake === make && (
                  <Ionicons name="checkmark-circle" size={20} color={themeColors.primary} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(colors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    scrollView: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
    },
    headerRight: {
      width: 40,
    },
    form: {
      padding: 20,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
    },
    input: {
      flex: 1,
      fontSize: 16,
      marginLeft: 12,
      textAlign: 'right',
    },
    textAreaContainer: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      minHeight: 80,
    },
    textArea: {
      fontSize: 16,
      textAlign: 'right',
      textAlignVertical: 'top',
    },
    colorPreview: {
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorDot: {
      width: 20,
      height: 20,
      borderRadius: 10,
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    checkboxLabel: {
      fontSize: 16,
      flex: 1,
    },
    errorText: {
      fontSize: 12,
      marginTop: 4,
      textAlign: 'right',
    },
    bottomSection: {
      padding: 20,
      paddingBottom: 40,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      marginBottom: 8,
    },
    disabledButton: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    offlineWarning: {
      fontSize: 12,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    errorTitle: {
      fontSize: 24,
      fontWeight: '700',
      marginTop: 16,
      marginBottom: 8,
    },
    errorMessage: {
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 24,
    },
    loginButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
    },
    loginButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
  });
}
