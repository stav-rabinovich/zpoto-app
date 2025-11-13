// screens/OwnerIntroScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { LinearGradient } from 'expo-linear-gradient';
import ZpButton from '../components/ui/ZpButton';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';


function StatusBadge({ status, colors }) {
  const map = {
    approved: { bg: '#e8fff2', br: '#b9f5cf', color: colors.success, icon: 'checkmark-circle' },
    pending:  { bg: '#fffaf1', br: '#ffe1a8', color: colors.warning, icon: 'time' },
    none:     { bg: '#eef3ff', br: '#dfe7ff', color: colors.primary, icon: 'information-circle' },
  };
  const s = map[status] || map.none;
  const label = status === 'approved' ? 'מאושר' : status === 'pending' ? 'בהמתנה' : 'טרם נרשמת';
  return (
    <View style={[styles.badge, { backgroundColor: s.bg, borderColor: s.br }]}>
      <Ionicons name={s.icon} size={14} color={s.color} style={{ marginEnd: 6 }} />
      <Text style={[styles.badgeText, { color: s.color }]}>{label}</Text>
    </View>
  );
}

function KpiCard({ icon, label, value, colors }) {
  return (
    <View style={[styles.kpi, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <View style={[styles.kpiIconWrap, { backgroundColor: 'rgba(0,0,0,0.04)' }]}>
        <Ionicons name={icon} size={16} color={colors.text} />
      </View>
      <Text style={[styles.kpiValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: colors.subtext }]}>{label}</Text>
    </View>
  );
}

export default function OwnerIntroScreen({ navigation }) {
  const theme = useTheme();
  const { user, isAuthenticated, login, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('none'); // 'none' | 'pending' | 'approved'
  const [name, setName] = useState('');
  const [canLogin, setCanLogin] = useState(false);
  
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Commission data state
  const [monthlyCommissions, setMonthlyCommissions] = useState(null);
  const [commissionsLoading, setCommissionsLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // טעינת עמלות חודשיות - פשוט
  const loadMonthlyCommissions = useCallback(async () => {
    if (!isAuthenticated || !user?.id || commissionsLoading) return;
    
    setCommissionsLoading(true);
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const response = await api.get(`/api/commissions/owner/${user.id}/commissions?year=${year}&month=${month}`, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      
      if (response.data.success) {
        setMonthlyCommissions(response.data.data);
      }
    } catch (error) {
      console.log('💰 Error loading commissions:', error.message);
    } finally {
      setCommissionsLoading(false);
    }
  }, [isAuthenticated, user, commissionsLoading]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      
      if (user?.email) {
        const response = await api.get(`/api/owner/status?email=${encodeURIComponent(user.email)}`);
        setStatus(response.data.status || 'none');
        setCanLogin(response.data.canLogin || false);
        setName(user.name || '');
      } else {
        setStatus('none');
        setCanLogin(false);
        setName('');
      }
    } catch (error) {
      console.error('Load owner status error:', error);
      
      // אם זו שגיאת 403 זה לא משנה - פשוט לא נציג מידע
      if (error.response?.status === 403) {
        console.log('🚫 User blocked - not showing status info');
      }
      
      setStatus('none');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleLogin = useCallback(async () => {
    if (!loginEmail || !loginPassword) {
      alert('אנא מלא אימייל וסיסמה');
      return;
    }

    try {
      setLoginLoading(true);
      console.log('🔐 Attempting owner login:', loginEmail);
      
      const result = await login(loginEmail, loginPassword);
      
      if (result.success) {
        console.log('✅ Basic login successful, checking owner status...');
        
        // בדיקה מיוחדת: בודק אם המשתמש הוא אכן בעל חניה
        try {
          const statusResponse = await api.get(`/api/owner/status?email=${encodeURIComponent(loginEmail)}`);
          const userStatus = statusResponse.data.status;
          const userCanLogin = statusResponse.data.canLogin;
          
          console.log(`📊 Owner status check: status=${userStatus}, canLogin=${userCanLogin}`);
          
          if (userStatus === 'none') {
            // המשתמש לא בעל חניה בכלל
            await logout(); // זריקה מהמערכת
            alert('❌ אין לך הרשאה לגשת לאזור בעלי החניה.\n\n💡 להגיש בקשה להיות בעל חניה, היכנס לאפליקציה ובחר "הצטרף כבעל חניה".');
            return;
          }
          
          if (userStatus === 'pending') {
            // המשתמש הגיש בקשה אבל עדיין לא אושר
            await logout(); // זריקה מהמערכת
            alert('⏳ הבקשה שלך להיות בעל חניה עדיין בטיפול.\n\n📧 תקבל התראה כשהבקשה תאושר.');
            return;
          }
          
          if (userStatus === 'approved' && !userCanLogin) {
            // המשתמש מאושר אבל אין לו סיסמה
            await logout(); // זריקה מהמערכת
            alert('🔑 החשבון שלך מאושר אבל עדיין לא הוגדרה סיסמה.\n\n📧 בדוק את האימייל לקבלת הסיסמה הזמנית.');
            return;
          }
          
          if (userStatus === 'approved' && userCanLogin) {
            // הכל בסדר! נישאר בדף OwnerIntro
            console.log('🎉 Owner login approved - staying on intro screen');
            setStatus(userStatus);
            setCanLogin(userCanLogin);
            // לא מנווטים - נישאר בדף "ברוך הבא! מה תרצו לעשות?"
            return;
          }
          
          // מקרה לא צפוי
          await logout();
          alert('❌ שגיאה בבדיקת הרשאות. נסה שוב מאוחר יותר.');
          
        } catch (statusError) {
          console.error('❌ Status check failed:', statusError);
          await logout(); // זריקה מהמערכת
          alert('❌ שגיאה בבדיקת הרשאות. נסה שוב מאוחר יותר.');
        }
        
      } else {
        console.log('🔐 Owner login failed:', result.error);
        alert(result.error || 'התחברות נכשלה. בדוק את פרטי ההתחברות.');
      }
    } catch (error) {
      console.log('🔐 Owner login exception:', error);
      alert('שגיאה בהתחברות. נסה שוב.');
    } finally {
      setLoginLoading(false);
    }
  }, [loginEmail, loginPassword, login, logout, navigation]);

  const handleLogout = useCallback(async () => {
    try {
      console.log('🚪 Owner logout initiated...');
      await logout();
      console.log('✅ Owner logout successful - navigating to main screen');
      // מעבר למסך הראשי של האפליקציה
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      console.error('❌ Owner logout failed:', error);
      // גם במקרה של שגיאה, חוזר למסך הראשי
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    }
  }, [logout, navigation]);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      load();
      // טעינת עמלות רק אם המשתמש מחובר ומאושר
      if (isAuthenticated && status === 'approved') {
        loadMonthlyCommissions();
      }
    });
    load();
    // טעינת עמלות רק אם המשתמש מחובר ומאושר
    if (isAuthenticated && status === 'approved') {
      loadMonthlyCommissions();
    }
    return unsub;
  }, [navigation, load]);

  // טעינת עמלות רק כשנדרש
  useEffect(() => {
    if (isAuthenticated && status === 'approved') {
      console.log('💰 Loading commissions for approved owner...');
      loadMonthlyCommissions();
    }
  }, [isAuthenticated, status]);


  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={[styles.centerText, { color: theme.colors.subtext }]}>טוען…</Text>
      </View>
    );
  }

  const gradStart = theme.colors?.gradientStart ?? theme.colors.primary;
  const gradEnd = theme.colors?.gradientEnd ?? theme.colors.primary;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={[styles.wrap, { padding: theme.spacing.lg }]}
      showsVerticalScrollIndicator={false}
      bounces={false}
      overScrollMode="never"
    >
      {/* HERO מנהלי */}
      <LinearGradient
        colors={[gradStart, gradEnd]}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={[styles.hero, { borderRadius: theme.borderRadii.lg }]}
      >
        <View style={styles.heroTopRow}>
          <Text style={styles.heroTitle}>מרכז הניהול להשכרת חניה</Text>

        </View>

        {/* ברכה קצרה - הוסרה */}

        {/* תיאור – מיושר לשמאל */}
        <Text style={styles.heroSub}>
          הפכו את החניה שלכם להכנסה קבועה — ניהול קל, שקיפות מלאה ותשלומים מאובטחים.
        </Text>

        {/* תג הסטטוס מתחת לטקסט התיאור */}
        <View style={styles.heroBadgeBelow}>
          <StatusBadge status={status} colors={theme.colors} />
        </View>
      </LinearGradient>


      {/* תוכן לפי סטטוס */}
      {status === 'approved' && (
        <>
          <View style={[styles.card, styles.cardApproved, themed(theme)]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: theme.colors.success }]}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              </View>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>ברוך/ה הבא/ה{name ? `, ${name}` : ''}!</Text>
            </View>

            {/* קארד הכנסות חודשיות */}
            <View style={[styles.monthlyRevenueCard, { 
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border 
            }]}>
              <View style={styles.monthlyRevenueHeader}>
                <View style={[styles.monthlyRevenueIcon, { backgroundColor: `${theme.colors.success}15`, marginRight: 12 }]}>
                  <Ionicons name="wallet" size={20} color={theme.colors.success} />
                </View>
                <View style={[styles.monthlyRevenueInfo, { alignItems: 'flex-start', flex: 1 }]}>
                  <Text style={[styles.monthlyRevenueTitle, { color: theme.colors.text, textAlign: 'left' }]}>
                    הכנסות החודש
                  </Text>
                  <Text style={[styles.monthlyRevenueSubtitle, { color: theme.colors.subtext, textAlign: 'left' }]}>
                    {new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
                  </Text>
                </View>
              </View>
              
              <View style={styles.monthlyRevenueContent}>
                {commissionsLoading ? (
                  <View style={styles.monthlyRevenueLoading}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                    <Text style={[styles.monthlyRevenueLoadingText, { color: theme.colors.subtext }]}>
                      טוען נתונים...
                    </Text>
                  </View>
                ) : monthlyCommissions ? (
                  <View style={styles.monthlyRevenueData}>
                    <View style={styles.monthlyRevenueAmount}>
                      <Text style={[styles.monthlyRevenueAmountValue, { color: theme.colors.success }]}>
                        ₪{monthlyCommissions.summary.totalNetOwnerILS}
                      </Text>
                      <Text style={[styles.monthlyRevenueAmountLabel, { color: theme.colors.subtext }]}>
                        נטו לתשלום
                      </Text>
                    </View>
                    
                    <View style={[styles.monthlyRevenueStats, { borderTopColor: theme.colors.border }]}>
                      <View style={styles.monthlyRevenueStat}>
                        <Text style={[styles.monthlyRevenueStatValue, { color: theme.colors.text }]}>
                          {monthlyCommissions.summary.count}
                        </Text>
                        <Text style={[styles.monthlyRevenueStatLabel, { color: theme.colors.subtext }]}>
                          הזמנות
                        </Text>
                      </View>
                      
                      <View style={styles.monthlyRevenueStat}>
                        <Text style={[styles.monthlyRevenueStatValue, { color: theme.colors.text }]}>
                          ₪{monthlyCommissions.summary.totalCommissionILS}
                        </Text>
                        <Text style={[styles.monthlyRevenueStatLabel, { color: theme.colors.subtext }]}>
                          עמלת זפוטו
                        </Text>
                      </View>
                    </View>
                    
                    <View style={[styles.monthlyRevenuePayoutInfo, { backgroundColor: `${theme.colors.accent}08` }]}>
                      <Ionicons name="calendar" size={12} color={theme.colors.subtext} />
                      <Text style={[styles.monthlyRevenuePayoutText, { color: theme.colors.subtext }]}>
                        תשלום ב-1 לחודש הבא
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.monthlyRevenueEmpty}>
                    <Ionicons name="information-circle" size={16} color={theme.colors.subtext} />
                    <Text style={[styles.monthlyRevenueEmptyText, { color: theme.colors.subtext }]}>
                      אין הכנסות החודש
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* פעולות מינימליסטיות עתידניות */}
            <View style={{
              marginTop: 20,
              gap: 8,
            }}>
              {/* כפתור ראשי - ניהול החניות */}
              <TouchableOpacity
                style={{
                  height: 64,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255, 255, 255, 0.25)',
                  borderWidth: 4,
                  borderColor: 'rgba(255, 255, 255, 0.7)',
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 20,
                  backdropFilter: 'blur(15px)',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.3,
                  shadowRadius: 16,
                  elevation: 12,
                  // גבול פנימי נוסף
                  borderTopWidth: 4,
                  borderTopColor: 'rgba(255, 255, 255, 0.8)',
                  // אפקט זוהר
                  position: 'relative',
                }}
                onPress={() => navigation.navigate('OwnerDashboard')}
                activeOpacity={0.8}
              >
                <View style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginLeft: 0,
                  marginRight: 16,
                }}>
                  <Ionicons name="business" size={18} color="#3B82F6" />
                </View>
                
                <Text style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: theme.colors.text,
                  flex: 1,
                  textAlign: 'left',
                }}>ניהול החניות</Text>
                
                <Ionicons name="chevron-back" size={16} color={theme.colors.subtext} />
              </TouchableOpacity>

              {/* גריד 2x2 מינימליסטי */}
              <View style={{
                flexDirection: 'row',
                gap: 8,
                marginTop: 8,
              }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    height: 88,
                    borderRadius: 16,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 5,
                    borderColor: 'rgba(255, 255, 255, 0.65)',
                    padding: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 14,
                    elevation: 10,
                    // גבול פנימי עדין
                    borderTopWidth: 5,
                    borderTopColor: 'rgba(255, 255, 255, 0.8)',
                  }}
                  onPress={() => navigation.navigate('OwnerOverview')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trending-up" size={20} color="#10B981" style={{ marginBottom: 8 }} />
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: theme.colors.text,
                    textAlign: 'center',
                  }}>היסטוריית הכנסות</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    height: 88,
                    borderRadius: 16,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 5,
                    borderColor: 'rgba(255, 255, 255, 0.65)',
                    padding: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 14,
                    elevation: 10,
                    // גבול פנימי עדין
                    borderTopWidth: 5,
                    borderTopColor: 'rgba(255, 255, 255, 0.8)',
                  }}
                  onPress={() => navigation.navigate('OwnerPending')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar" size={20} color="#F59E0B" style={{ marginBottom: 8 }} />
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: theme.colors.text,
                    textAlign: 'center',
                  }}>הזמנות עתידיות</Text>
                </TouchableOpacity>
              </View>

              <View style={{
                flexDirection: 'row',
                gap: 8,
              }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    height: 88,
                    borderRadius: 16,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 5,
                    borderColor: 'rgba(255, 255, 255, 0.65)',
                    padding: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 14,
                    elevation: 10,
                    // גבול פנימי עדין
                    borderTopWidth: 5,
                    borderTopColor: 'rgba(255, 255, 255, 0.8)',
                  }}
                  onPress={() => navigation.navigate('OwnerListingForm')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={20} color="#8B5CF6" style={{ marginBottom: 8 }} />
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: theme.colors.text,
                    textAlign: 'center',
                  }}>פרסום חניה חדשה</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    height: 88,
                    borderRadius: 16,
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 5,
                    borderColor: 'rgba(255, 255, 255, 0.65)',
                    padding: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 14,
                    elevation: 10,
                    // גבול פנימי עדין
                    borderTopWidth: 5,
                    borderTopColor: 'rgba(255, 255, 255, 0.8)',
                  }}
                  onPress={() => navigation.navigate('OwnerSettings')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="settings" size={20} color="#6B7280" style={{ marginBottom: 8 }} />
                  <Text style={{
                    fontSize: 14,
                    fontWeight: '500',
                    color: theme.colors.text,
                    textAlign: 'center',
                  }}>הגדרות</Text>
                </TouchableOpacity>
              </View>
            </View>

          </View>

          <View style={[styles.infoStrip, { borderColor: theme.colors.border, backgroundColor: '#F8FAFF' }]}>
            <Ionicons name="bulb-outline" size={16} color={theme.colors.primary} style={{ marginEnd: 8 }} />
            <Text style={[styles.infoStripText, { color: theme.colors.subtext }]}>
              טיפ: הגדירו שעות זמינות קבועות כדי למקסם תפוסה.
            </Text>
          </View>
        </>
      )}

      {status === 'pending' && (
        <View style={[styles.card, styles.cardPending, themed(theme)]}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconWrap, { backgroundColor: theme.colors.warning }]}>
              <Ionicons name="time-outline" size={16} color="#fff" />
            </View>
            <Text style={[styles.cardTitle, { color: theme.colors.text }]}>הבקשה בהמתנה</Text>
          </View>

          <Text style={[styles.parLeft, { color: theme.colors.text }]}>
            אנו בודקים את הפרטים שלך. נעדכן ברגע האישור.
          </Text>

          <ZpButton
            title="בדוק סטטוס"
            onPress={load}
            leftIcon={<Ionicons name="refresh" size={18} color="#fff" style={{ marginEnd: 6 }} />}
            style={{ marginTop: theme.spacing.sm }}
          />
        </View>
      )}

      {status === 'none' && (
        <>
          {/* טופס התחברות - רק אם המשתמש לא מחובר */}
          {!isAuthenticated && (
            <>
              <View style={[styles.card, themed(theme)]}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIconWrap, { backgroundColor: theme.colors.primary }]}>
                    <Ionicons name="log-in-outline" size={16} color="#fff" />
                  </View>
                  <Text style={[styles.cardTitle, { color: theme.colors.text }]}>כבר יש לך חשבון?</Text>
                </View>

                <View style={styles.loginForm}>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.colors.text }]}>אימייל</Text>
                    <TextInput
                      style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                      value={loginEmail}
                      onChangeText={setLoginEmail}
                      placeholder="הזן את האימייל שלך"
                      placeholderTextColor={theme.colors.subtext}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.colors.text }]}>סיסמה</Text>
                    <TextInput
                      style={[styles.textInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
                      value={loginPassword}
                      onChangeText={setLoginPassword}
                      placeholder="הזן את הסיסמה שלך"
                      placeholderTextColor={theme.colors.subtext}
                      secureTextEntry
                    />
                  </View>

                  <ZpButton
                    title={loginLoading ? "מתחבר..." : "כניסה למערכת"}
                    onPress={handleLogin}
                    disabled={loginLoading || !loginEmail || !loginPassword}
                    leftIcon={<Ionicons name="log-in" size={18} color="#fff" style={{ marginEnd: 6 }} />}
                    style={{ marginTop: theme.spacing.sm }}
                  />
                </View>
              </View>

              {/* מפריד */}
              <View style={styles.divider}>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
                <Text style={[styles.dividerText, { color: theme.colors.subtext }]}>או</Text>
                <View style={[styles.dividerLine, { backgroundColor: theme.colors.border }]} />
              </View>
            </>
          )}

          {/* הגשת בקשה - מופיע גם למשתמשים מחוברים וגם לא מחוברים */}
          <View style={[styles.card, themed(theme)]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="create-outline" size={16} color="#fff" />
              </View>
              <Text style={[styles.cardTitle, { color: theme.colors.text }]}>רוצה להצטרף כבעל/ת חניה?</Text>
            </View>

            <View style={styles.bullets}>
              <View style={styles.bulletRow}>
                <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} style={{ marginEnd: 8 }} />
                <Text style={[styles.bulletText, { color: theme.colors.subtext }]}>תשלומים מאובטחים והגנות ביטול</Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="calendar" size={16} color={theme.colors.primary} style={{ marginEnd: 8 }} />
                <Text style={[styles.bulletText, { color: theme.colors.subtext }]}>שליטה מלאה בזמינות</Text>
              </View>
              <View style={styles.bulletRow}>
                <Ionicons name="chatbubbles" size={16} color={theme.colors.primary} style={{ marginEnd: 8 }} />
                <Text style={[styles.bulletText, { color: theme.colors.subtext }]}>תמיכה ידידותית בעברית</Text>
              </View>
            </View>

            <ZpButton
              title={isAuthenticated ? "הגש בקשה להיות בעל חניה" : "הגש בקשה"}
              onPress={() => navigation.navigate('OwnerApply')}
              leftIcon={<Ionicons name="create" size={18} color="#fff" style={{ marginEnd: 6 }} />}
              style={{ marginTop: theme.spacing.sm }}
            />
          </View>
        </>
      )}

    </ScrollView>
  );
}

const themed = (theme) => ({
  borderColor: theme.colors.border,
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 2,
});

const styles = StyleSheet.create({
  wrap: { direction: 'rtl' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerText: { marginTop: 8 },

  hero: { paddingVertical: 18, paddingHorizontal: 16, marginBottom: 14 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  heroHello: { color: '#fff', fontWeight: '700', marginTop: 6 },
  heroSub: { color: 'rgba(255,255,255,0.95)', marginTop: 8, lineHeight: 20, fontSize: 13, textAlign: 'left', writingDirection: 'ltr' },
  heroBadgeBelow: { marginTop: 10, alignItems: 'flex-start' }, // מתחת לטקסט, מיושר לשמאל

  devBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  devBtnText: { fontSize: 11, fontWeight: '700' },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: { fontSize: 12, fontWeight: '800' },

  kpiRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpi: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiIconWrap: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  kpiValue: { fontSize: 16, fontWeight: '800' },
  kpiLabel: { fontSize: 11, marginTop: 2 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardApproved: { backgroundColor: '#f7fffb' },
  cardPending: { backgroundColor: '#fffaf1' },

  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  cardIconWrap: {
    width: 26, height: 26, borderRadius: 13,
    alignItems: 'center', justifyContent: 'center', marginEnd: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '800' },

  sectionTitleLeft: { fontSize: 14, fontWeight: '800', marginTop: 2, marginBottom: 8, textAlign: 'left', writingDirection: 'ltr' },
  parLeft: { fontSize: 14, marginVertical: 2, textAlign: 'left', writingDirection: 'ltr' },

  // קארד הכנסות חודשיות
  monthlyRevenueCard: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
  },
  monthlyRevenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  monthlyRevenueIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  monthlyRevenueInfo: {
    flex: 1,
  },
  monthlyRevenueTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  monthlyRevenueSubtitle: {
    fontSize: 13,
  },
  monthlyRevenueDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  monthlyRevenueDetailsText: {
    fontSize: 12,
    fontWeight: '600',
    marginEnd: 4,
  },
  monthlyRevenueContent: {
    minHeight: 60,
  },
  monthlyRevenueLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  monthlyRevenueLoadingText: {
    fontSize: 13,
    marginStart: 8,
  },
  monthlyRevenueData: {
    gap: 12,
  },
  monthlyRevenueAmount: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  monthlyRevenueAmountValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 2,
  },
  monthlyRevenueAmountLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  monthlyRevenueStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  monthlyRevenueStat: {
    alignItems: 'center',
  },
  monthlyRevenueStatValue: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  monthlyRevenueStatLabel: {
    fontSize: 11,
  },
  monthlyRevenuePayoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  monthlyRevenuePayoutText: {
    fontSize: 12,
    marginStart: 4,
  },
  monthlyRevenueEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  monthlyRevenueEmptyText: {
    fontSize: 13,
    marginStart: 8,
  },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickTile: {
    width: '48%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickLabel: { fontWeight: '700', fontSize: 13, textAlign: 'center' },

  infoStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  infoStripText: { fontSize: 13 },

  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryBtnText: { fontWeight: '800' },
  line: { fontSize: 14, marginVertical: 2 },
  bullets: { marginTop: 6 },
  bulletRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  bulletText: { fontSize: 13 },

  // Login form styles
  loginForm: { marginTop: 12 },
  inputGroup: { marginBottom: 12 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'right',
  },

  // Divider styles
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
  },

  // Logout button styles
  logoutContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 30,
  },
  logoutButton: {
    backgroundColor: '#ef4444', // אדום
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginStart: 8,
  },
});
