// screens/OwnerSettingsScreen.js - מסך הגדרות בעל חניה
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

export default function OwnerSettingsScreen({ navigation }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();


  const handleLogout = async () => {
    try {
      await logout();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }
  };

  const settingsOptions = [
    {
      id: 'notifications',
      title: 'התראות',
      subtitle: 'ניהול התראות והודעות',
      icon: 'notifications-outline',
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      id: 'profile',
      title: 'פרופיל אישי',
      subtitle: 'עריכת פרטים אישיים',
      icon: 'person-outline',
      onPress: () => {
        // TODO: Navigate to profile screen
        console.log('Navigate to profile');
      },
    },
    {
      id: 'help',
      title: 'עזרה ותמיכה',
      subtitle: 'שאלות נפוצות ויצירת קשר',
      icon: 'help-circle-outline',
      onPress: () => {
        // TODO: Navigate to help screen
        console.log('Navigate to help');
      },
    },
    {
      id: 'terms',
      title: 'תנאי שימוש',
      subtitle: 'מדיניות פרטיות ותנאים',
      icon: 'document-text-outline',
      onPress: () => {
        // TODO: Navigate to terms screen
        console.log('Navigate to terms');
      },
    },
  ];

  const renderSettingItem = (item) => (
    <TouchableOpacity
      key={item.id}
      style={[styles.settingItem, { borderColor: theme.colors.border }]}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + '15' }]}>
        <Ionicons name={item.icon} size={22} color={theme.colors.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.settingTitle, { color: theme.colors.text }]}>{item.title}</Text>
        <Text style={[styles.settingSubtitle, { color: theme.colors.subtext }]}>{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-back" size={20} color={theme.colors.subtext} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 100) }}>
        {/* כותרת */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>הגדרות</Text>
        </View>

        {/* אפשרויות הגדרות */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          {settingsOptions.map(renderSettingItem)}
        </View>

        {/* כפתור יציאה */}
        <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <TouchableOpacity
            style={[styles.settingItem, styles.logoutItem, { borderColor: '#FCA5A5' }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="log-out-outline" size={22} color="#DC2626" />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.settingTitle, { color: '#DC2626' }]}>יציאה מהחשבון</Text>
              <Text style={[styles.settingSubtitle, { color: '#991B1B' }]}>התנתקות מהמערכת</Text>
            </View>
            <Ionicons name="chevron-back" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#F8FAFF',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 20,
    shadowColor: '#0B6AA8',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0B6AA8',
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginVertical: 6,
    shadowColor: '#0B6AA8',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  logoutItem: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 16,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    fontWeight: '400',
  },
});
