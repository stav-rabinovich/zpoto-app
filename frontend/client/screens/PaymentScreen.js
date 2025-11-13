/**
 * מסך תשלום מקצועי - Phase 4
 * כולל סיכום הזמנה מפורט, פרטי תשלום, ועיצוב מודרני
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { LinearGradient } from 'expo-linear-gradient';
import dayjs from 'dayjs';
import 'dayjs/locale/he';

import { useAuth } from '../contexts/AuthContext';
import ZpButton from '../components/ui/ZpButton';
import NetworkStatus from '../components/NetworkStatus';
import { createBooking } from '../services/api/bookings';
import { executeExtension } from '../services/api/extensions';
import {
  validateCouponAPI,
  calculateDiscountAPI,
  formatCurrency,
  formatDiscount,
  formatApplyTo,
  formatCouponError,
  calculateOperationalFee,
  calculateTotalPrice,
  getTimeUntilExpiry
} from '../utils/couponUtils';

dayjs.locale('he');

export default function PaymentScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { token } = useAuth();

  // פרמטרים מהמסך הקודם
  const {
    // פרמטרים רגילים (הזמנה חדשה)
    spot,
    startTime,
    endTime,
    vehicle,
    totalPrice,
    totalHours,
    selectedVehicleId,
    plate,
    carDesc,
    
    // פרמטרים של הארכה
    type, // 'extension' עבור הארכות
    bookingId,
    parkingId,
    parkingTitle,
    amount,
    extensionMinutes,
    newEndTime,
    description
  } = route.params || {};

  // זיהוי סוג התשלום
  const isExtension = type === 'extension';
  const paymentAmount = isExtension ? (amount / 100) : (totalPrice * 1.1); // הארכות באגורות, הזמנות בשקלים + דמי תפעול
  const paymentDescription = isExtension ? description : `חניה ב${spot?.title || 'מקום לא ידוע'}`;

  // State של התשלום
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  
  // State של קופונים
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponValid, setCouponValid] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discount, setDiscount] = useState(null);
  
  // State של התראת חפיפת רכב הועבר למסך ההזמנה

  // חסימת כפתור החזרה אחרי תשלום מוצלח
  useEffect(() => {
    const backAction = () => {
      if (paymentCompleted) {
        // אם התשלום הושלם, חזור למסך הבית
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }]
        });
        return true; // חוסם את החזרה הרגילה
      }
      return false; // מאפשר חזרה רגילה אם התשלום לא הושלם
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [paymentCompleted, navigation]);

  // פונקציה לחישוב מחיר proportional (מדויק) - זהה למסך הזמנה
  const calculateProportionalPrice = (diffMs, spot) => {
    if (!spot) {
      console.log('💳 ❌ No spot data provided');
      return { total: 0, exactHours: 0, breakdown: [] };
    }
    
    const basePricePerHour = spot.price || 10;
    const exactHours = diffMs / (1000 * 60 * 60);
    const wholeHours = Math.floor(exactHours);
    const fractionalPart = exactHours - wholeHours;
    
    console.log(`💳 🔢 Payment screen - Proportional calculation: ${exactHours.toFixed(2)} hours (${wholeHours} whole + ${fractionalPart.toFixed(2)} fractional)`);
    
    // אם יש מחירון מדורג
    if (spot.pricing) {
      try {
        const pricingData = typeof spot.pricing === 'string' ? JSON.parse(spot.pricing) : spot.pricing;
        console.log('💳 ✅ Payment screen - Using tiered pricing:', pricingData);
        
        let total = 0;
        const breakdown = [];
        
        // חישוב שעות שלמות
        for (let i = 1; i <= wholeHours; i++) {
          const rawHourPrice = pricingData[`hour${i}`] || pricingData.hour1 || basePricePerHour;
          const hourPrice = typeof rawHourPrice === 'string' ? parseFloat(rawHourPrice) : rawHourPrice;
          total += hourPrice;
          breakdown.push({ hour: i, price: hourPrice, isFractional: false });
          console.log(`💳 ✅ Payment screen - Hour ${i}: ₪${hourPrice}`);
        }
        
        // חישוב חלק שברי (אם קיים)
        if (fractionalPart > 0) {
          const nextHourIndex = wholeHours + 1;
          const rawNextHourPrice = pricingData[`hour${nextHourIndex}`] || pricingData.hour1 || basePricePerHour;
          const nextHourPrice = typeof rawNextHourPrice === 'string' ? parseFloat(rawNextHourPrice) : rawNextHourPrice;
          const fractionalPrice = fractionalPart * nextHourPrice;
          total += fractionalPrice;
          breakdown.push({ 
            hour: nextHourIndex, 
            price: fractionalPrice, 
            isFractional: true, 
            fractionalPart: fractionalPart 
          });
          console.log(`💳 ✅ Payment screen - Hour ${nextHourIndex} (${(fractionalPart * 100).toFixed(0)}%): ₪${fractionalPrice.toFixed(2)}`);
        }
        
        console.log(`💳 ✅ Payment screen - Proportional total: ₪${total.toFixed(2)}`);
        return { total: total, exactHours: exactHours, breakdown: breakdown };
      } catch (error) {
        console.error('💳 ❌ Payment screen - Failed to parse pricing JSON:', error);
      }
    }
    
    // fallback למחיר יחיד
    const flatTotal = exactHours * basePricePerHour;
    console.log(`💳 ⚠️ Payment screen - Using flat rate: ${exactHours.toFixed(2)} × ₪${basePricePerHour} = ₪${flatTotal.toFixed(2)}`);
    return { total: flatTotal, exactHours: exactHours, breakdown: [] };
  };

  // חישוב פרטי ההזמנה או הארכה
  const bookingDetails = useMemo(() => {
    if (isExtension) {
      // פרטי הארכה
      return {
        start: null,
        end: dayjs(newEndTime),
        duration: extensionMinutes / 60, // המרה לשעות
        price: paymentAmount, // כבר בשקלים עבור הארכות
        pricePerHour: 0, // לא רלוונטי להארכות
        title: parkingTitle || 'חניה',
        type: 'extension'
      };
    }

    // פרטי הזמנה רגילה
    if (!spot || !startTime || !endTime) return null;

    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const exactHours = diffMs / (1000 * 60 * 60);
    // עיגול לרבע שעה הקרוב (0.25, 0.5, 0.75, 1.0) - זהה למסך ההזמנה
    const duration = Math.round(exactHours * 4) / 4;
    
    // 🆕 חישוב proportional מדויק
    const proportionalResult = calculateProportionalPrice(diffMs, spot);
    const price = totalPrice || proportionalResult.total;

    return {
      start: dayjs(start),
      end: dayjs(end),
      duration,
      price,
      pricePerHour: spot.price || 10,
      title: spot.title || 'חניה',
      type: 'booking'
    };
  }, [spot, startTime, endTime, totalPrice, isExtension, extensionMinutes, paymentAmount, newEndTime, parkingTitle]);

  // פונקציות לטיפול בהתראת חפיפת רכב הועברו למסך ההזמנה

  // פונקציית תשלום
  const handlePayment = async () => {
    // ולידציה שונה בהתאם לסוג התשלום
    if (isExtension) {
      if (!bookingId || !paymentAmount) {
        Alert.alert('שגיאה', 'חסרים פרטי הארכה');
        return;
      }
    } else {
      if (!bookingDetails) {
        Alert.alert('שגיאה', 'חסרים פרטי הזמנה');
        return;
      }
    }

    // ולידציה בסיסית
    if (paymentMethod === 'card') {
      if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
        Alert.alert('שגיאה', 'נא למלא את כל פרטי הכרטיס');
        return;
      }
    }

    setLoading(true);
    try {
      console.log(`💳 Processing ${isExtension ? 'extension' : 'booking'} payment...`);
      
      // 🚗 בדיקת חפיפות רכב הועברה למסך ההזמנה (BookingScreen)
      
      // סימולציה של תשלום
      await new Promise(resolve => setTimeout(resolve, 2000));

      let result;

      if (isExtension) {
        // תשלום הארכה
        console.log(`🕐 Processing extension payment for booking #${bookingId}`);
        
        // סימולציית מזהה תשלום
        const mockPaymentId = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // ביצוע ההארכה דרך API
        const extensionResult = await executeExtension(bookingId, mockPaymentId);
        
        if (!extensionResult.success) {
          throw new Error(extensionResult.error || 'Extension execution failed');
        }
        
        result = {
          success: true,
          booking: extensionResult.booking,
          paymentId: mockPaymentId,
          type: 'extension'
        };
        
      } else {
        // תשלום הזמנה רגילה
        const paymentData = {
          parkingId: spot.parkingId || spot.id,
          vehicleId: selectedVehicleId,
          startTime: bookingDetails.start.toISOString(),
          endTime: bookingDetails.end.toISOString(),
          totalPrice: finalAmount, // מחיר סופי עם הנחה
          originalPrice: bookingDetails.price, // מחיר מקורי
          paymentMethod,
          licensePlate: plate,
          vehicleDescription: carDesc,
          cardNumber,
          expiryDate,
          cvv,
          cardholderName,
          // פרטי קופון - חישוב לפי כללי הברזל
          couponCode: appliedCoupon?.code || null,
          discountAmount: (() => {
            if (!discount || !appliedCoupon) return 0;
            
            if (appliedCoupon.applyTo === 'SERVICE_FEE') {
              const operationalFee = bookingDetails.price * 0.1;
              
              if (appliedCoupon.discountType === 'PERCENTAGE') {
                return operationalFee * (appliedCoupon.discountValue / 100);
              } else {
                return Math.min(appliedCoupon.discountValue, operationalFee);
              }
            }
            return discount.discountAmountCents / 100;
          })()
        };

        console.log('💳 Processing booking payment:', paymentData);
        
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.0.23:4000'}/api/payments/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(paymentData)
        });
        
        result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.message || result.error || 'Payment failed');
        }
      }

      // סימון שהתשלום הושלם
      setPaymentCompleted(true);

      // הודעת הצלחה שונה בהתאם לסוג התשלום
      const successTitle = isExtension ? 'הארכה בוצעה בהצלחה! 🕐' : 'תשלום בוצע בהצלחה! 🎉';
      const successMessage = isExtension 
        ? `החניה הוארכה ב-${extensionMinutes} דקות.\nזמן סיום חדש: ${dayjs(newEndTime).format('HH:mm')}\nמזהה תשלום: ${result.paymentId || 'N/A'}`
        : `ההזמנה נוצרה בהצלחה.\nמספר הזמנה: ${result.booking?.id || 'N/A'}\nמזהה תשלום: ${result.booking?.paymentId || 'N/A'}`;

      Alert.alert(
        successTitle,
        successMessage,
        [
          {
            text: 'צפה בהזמנות',
            onPress: () => {
              if (isExtension) {
                // עבור הארכות - איפוס stack וחזרה להזמנות עם רענון
                navigation.reset({
                  index: 1,
                  routes: [
                    { name: 'Home' },
                    { 
                      name: 'BookingDetail', 
                      params: { 
                        id: bookingId,
                        refreshData: true 
                      } 
                    }
                  ]
                });
              } else {
                // עבור הזמנות רגילות - איפוס stack
                navigation.reset({
                  index: 0,
                  routes: [
                    { name: 'Home' },
                    { name: 'Bookings' }
                  ]
                });
              }
            }
          }
        ]
      );

    } catch (error) {
      console.error('💳 Payment failed:', error);
      Alert.alert(
        'שגיאה בתשלום',
        'לא הצלחנו לעבד את התשלום. נסה שוב.',
        [{ text: 'אישור' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // פונקציות קופונים משופרות
  const validateCoupon = async (code) => {
    if (!code.trim()) {
      setCouponError('נא להזין קוד קופון');
      return;
    }

    setCouponLoading(true);
    setCouponError('');
    setCouponValid(null);

    try {
      console.log('🎟️ Validating coupon:', code);
      const result = await validateCouponAPI(code, process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.0.23:4000');

      if (result.isValid) {
        setCouponValid(true);
        setCouponError('');
        console.log('✅ Coupon valid, calculating discount...');
        // חישוב ההנחה
        await calculateDiscount(code.trim().toUpperCase());
      } else {
        setCouponValid(false);
        const errorMessage = formatCouponError(result.errorCode, result.error);
        setCouponError(errorMessage);
        setAppliedCoupon(null);
        setDiscount(null);
        console.log('❌ Coupon invalid:', errorMessage);
      }
    } catch (error) {
      console.error('Coupon validation error:', error);
      setCouponValid(false);
      setCouponError('שגיאה בבדיקת הקופון');
      setAppliedCoupon(null);
      setDiscount(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const calculateDiscount = async (code) => {
    try {
      // פירוק המחיר הכולל לעלות חניה + דמי תפעול
      const totalAmountCents = Math.round(paymentAmount * 100); // המחיר הכולל
      const parkingCostCents = Math.round(totalAmountCents / 1.1); // עלות חניה בלבד
      const operationalFeeCents = totalAmountCents - parkingCostCents; // דמי תפעול (10%)

      console.log('💰 Calculating discount for:', {
        code,
        parkingCostCents,
        operationalFeeCents,
        totalCents: parkingCostCents + operationalFeeCents
      });

      const result = await calculateDiscountAPI(
        code, 
        parkingCostCents, 
        operationalFeeCents, 
        process.env.EXPO_PUBLIC_API_BASE_URL || 'http://10.0.0.23:4000'
      );

      if (result.isValid) {
        setAppliedCoupon(result.coupon);
        setDiscount(result.discount);
        console.log('💸 Discount calculated:', {
          original: formatCurrency(result.discount.originalAmountCents),
          discount: formatCurrency(result.discount.discountAmountCents),
          final: formatCurrency(result.discount.finalAmountCents),
          percentage: result.discount.discountPercentage + '%'
        });
      } else {
        console.log('❌ Discount calculation failed:', result.error);
      }
    } catch (error) {
      console.error('Discount calculation error:', error);
    }
  };

  const removeCoupon = () => {
    console.log('🗑️ Removing coupon');
    setCouponCode('');
    setCouponValid(null);
    setCouponError('');
    setAppliedCoupon(null);
    setDiscount(null);
  };

  // פונקציה לעדכון אוטומטי של הנחה כשמשנים פרמטרים
  const refreshDiscount = async () => {
    if (appliedCoupon && couponCode) {
      console.log('🔄 Refreshing discount calculation');
      await calculateDiscount(couponCode);
    }
  };

  // עדכון אוטומטי של הנחה כשמשתנה המחיר
  useEffect(() => {
    if (appliedCoupon && paymentAmount) {
      const timeoutId = setTimeout(() => {
        refreshDiscount();
      }, 500); // דיליי קטן למניעת קריאות מיותרות

      return () => clearTimeout(timeoutId);
    }
  }, [paymentAmount, appliedCoupon]);

  // חישוב מחיר סופי עם הנחה לפי כללי הברזל
  const finalAmount = useMemo(() => {
    if (discount && appliedCoupon) {
      if (appliedCoupon.applyTo === 'SERVICE_FEE') {
        // חישוב לפי כללי הברזל: עלות חניה + דמי תפעול לאחר הנחה
        const parkingCost = bookingDetails?.price || 0;
        const operationalFee = parkingCost * 0.1;
        
        let discountAmount = 0;
        if (appliedCoupon.discountType === 'PERCENTAGE') {
          discountAmount = operationalFee * (appliedCoupon.discountValue / 100);
        } else {
          discountAmount = Math.min(appliedCoupon.discountValue, operationalFee);
        }
        
        const finalOperationalFee = operationalFee - discountAmount;
        return parkingCost + finalOperationalFee;
      }
      return discount.finalAmountCents / 100;
    }
    return paymentAmount;
  }, [discount, paymentAmount, appliedCoupon, bookingDetails]);

  if (!bookingDetails) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={colors.error} />
        <Text style={styles.errorText}>חסרים פרטי הזמנה</Text>
        <ZpButton
          title="חזור"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.select({ ios: 'padding' })}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

        {/* סיכום ההזמנה */}
        <View style={styles.summaryCard}>
          <Text style={styles.sectionTitle}>
            {isExtension ? 'סיכום ההארכה' : 'סיכום ההזמנה'}
          </Text>
          
          {/* פרטי החניה - עיצוב נקי ואחיד */}
          <View style={styles.cleanDetailsContainer}>
            {/* חניה */}
            <View style={styles.cleanRow}>
              <View style={styles.cleanIconBox}>
                <Ionicons name="location" size={20} color={colors.primary} />
              </View>
              <View style={styles.cleanContent}>
                <Text style={styles.cleanLabel}>חניה</Text>
                <Text style={styles.cleanValue}>
                  {isExtension ? bookingDetails.title : (spot.title || spot.address)}
                </Text>
              </View>
            </View>
            
            {!isExtension && (
              <>
                {/* תאריך */}
                <View style={styles.cleanRow}>
                  <View style={styles.cleanIconBox}>
                    <Ionicons name="calendar" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.cleanContent}>
                    <Text style={styles.cleanLabel}>תאריך</Text>
                    <Text style={styles.cleanValue}>
                      {bookingDetails.start.format('DD/MM/YYYY')}
                    </Text>
                  </View>
                </View>
                
                {/* שעות */}
                <View style={styles.cleanRow}>
                  <View style={styles.cleanIconBox}>
                    <Ionicons name="time" size={20} color={colors.primary} />
                  </View>
                  <View style={styles.cleanContent}>
                    <Text style={styles.cleanLabel}>שעות</Text>
                    <Text style={styles.cleanValue}>
                      {bookingDetails.start.format('HH:mm')} - {bookingDetails.end.format('HH:mm')}
                    </Text>
                  </View>
                </View>
              </>
            )}
            
            {/* משך */}
            <View style={styles.cleanRow}>
              <View style={styles.cleanIconBox}>
                <Ionicons name="hourglass" size={20} color={colors.primary} />
              </View>
              <View style={styles.cleanContent}>
                <Text style={styles.cleanLabel}>
                  {isExtension ? 'הארכה' : 'משך'}
                </Text>
                <Text style={styles.cleanValue}>
                  {isExtension ? `${extensionMinutes} דקות` : `${bookingDetails.duration} שעות`}
                </Text>
              </View>
            </View>

            {/* רכב */}
            <View style={styles.cleanRow}>
              <View style={styles.cleanIconBox}>
                <Ionicons name="car" size={20} color={colors.success} />
              </View>
              <View style={styles.cleanContent}>
                <Text style={styles.cleanLabel}>רכב</Text>
                <Text style={styles.cleanValue}>{plate}</Text>
                {carDesc && (
                  <Text style={styles.cleanSubValue}>{carDesc}</Text>
                )}
              </View>
            </View>
          </View>

          {/* סיכום מחיר - עיצוב נקי ומפורט */}
          <View style={styles.priceContainer}>
            <Text style={styles.priceTitle}>פירוט תשלום שקוף</Text>
            
            {/* עלות חניה בסיסית */}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>עלות חניה</Text>
              <Text style={styles.priceValue}>
                ₪{isExtension 
                  ? (paymentAmount / 1.1).toFixed(2) 
                  : bookingDetails.price.toFixed(2)
                }
              </Text>
            </View>
            
            {/* פירוט לאן הולך הכסף - עמלה לזפוטו */}
            <View style={styles.priceSubRow}>
              <Text style={styles.priceSubLabel}>• עמלה לזפוטו (15%)</Text>
              <Text style={styles.priceSubValue}>
                ₪{isExtension 
                  ? ((paymentAmount / 1.1) * 0.15).toFixed(2)
                  : (bookingDetails.price * 0.15).toFixed(2)
                }
              </Text>
            </View>
            
            {/* פירוט לאן הולך הכסף - נטו לבעל חניה */}
            <View style={styles.priceSubRow}>
              <Text style={styles.priceSubLabel}>• נטו לבעל החניה</Text>
              <Text style={styles.priceSubValue}>
                ₪{isExtension 
                  ? ((paymentAmount / 1.1) * 0.85).toFixed(2)
                  : (bookingDetails.price * 0.85).toFixed(2)
                }
              </Text>
            </View>
            
            {/* דמי תפעול */}
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>דמי תפעול (10%)</Text>
              <Text style={styles.priceValue}>
                ₪{isExtension 
                  ? (paymentAmount - (paymentAmount / 1.1)).toFixed(2)
                  : (bookingDetails.price * 0.1).toFixed(2)
                }
              </Text>
            </View>
            
            {/* הנחת קופון אם יש */}
            {appliedCoupon && discount && discount.amount && (
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, styles.discountLabel]}>
                  הנחת קופון {appliedCoupon.code}
                </Text>
                <Text style={[styles.priceValue, styles.discountValue]}>
                  -₪{discount.amount.toFixed(2)}
                </Text>
              </View>
            )}
            
            {/* קו הפרדה */}
            <View style={styles.priceDivider} />
            
            {/* סה"כ */}
            <View style={styles.totalPriceRow}>
              <Text style={styles.totalPriceLabel}>סה"כ לתשלום</Text>
              <Text style={styles.totalPriceValue}>
                ₪{(appliedCoupon && discount && discount.amount 
                  ? paymentAmount - discount.amount 
                  : paymentAmount
                ).toFixed(2)}
              </Text>
            </View>
            
            {/* הסבר על השקיפות */}
            <View style={styles.transparencyNote}>
              <Text style={styles.transparencyText}>
                💡 זפוטו מאמינה בשקיפות מלאה - אתה רואה בדיוק לאן הולך כל שקל
              </Text>
            </View>
          </View>
        </View>

        {/* קוד קופון - רק להזמנות רגילות, לא להארכות */}
        {!isExtension && (
        <View style={styles.couponCard}>
          <Text style={styles.sectionTitle}>קוד קופון</Text>
          
          <View style={styles.couponContainer}>
            <TextInput
              style={[
                styles.couponInput,
                couponValid === true && styles.couponInputValid,
                couponValid === false && styles.couponInputError
              ]}
              placeholder="הזן קוד קופון (אופציונלי)"
              value={couponCode}
              onChangeText={(text) => {
                setCouponCode(text.toUpperCase());
                // איפוס מצב קודם כשמשנים את הטקסט
                if (couponValid !== null) {
                  setCouponValid(null);
                  setCouponError('');
                  setAppliedCoupon(null);
                  setDiscount(null);
                }
              }}
              placeholderTextColor={colors.subtext}
              autoCapitalize="characters"
              maxLength={20}
            />
            <TouchableOpacity 
              style={[
                styles.couponButton,
                couponLoading && styles.couponButtonDisabled
              ]}
              onPress={() => validateCoupon(couponCode)}
              disabled={couponLoading || !couponCode.trim()}
            >
              {couponLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.couponButtonText}>
                  {couponValid === true ? '✓' : 'בדוק'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
          
          {/* הודעות משוב */}
          {couponError ? (
            <Text style={styles.couponError}>❌ {couponError}</Text>
          ) : couponValid === true && appliedCoupon ? (
            <View style={styles.couponSuccess}>
              <Text style={styles.couponSuccessText}>
                ✅ קופון "{appliedCoupon.code}" הוחל בהצלחה!
              </Text>
              <TouchableOpacity onPress={removeCoupon} style={styles.removeCouponButton}>
                <Text style={styles.removeCouponText}>הסר</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.couponHint}>
              💡 הזן קוד קופון כדי לקבל הנחה על התשלום
            </Text>
          )}

          {/* הצגת הנחה משופרת */}
          {discount && appliedCoupon && (
            <View style={styles.discountInfo}>
              <View style={styles.discountHeader}>
                <Text style={styles.discountTitle}>🎉 פרטי ההנחה</Text>
              </View>
              
              <View style={styles.discountRow}>
                <Text style={styles.discountLabel}>
                  הנחה ({appliedCoupon.applyTo === 'SERVICE_FEE' ? 'דמי תפעול' : 'סכום כולל'})
                </Text>
                <Text style={styles.discountValue}>
                  -{(() => {
                    // חישוב הנחה מדויק לפי כללי הברזל
                    if (appliedCoupon.applyTo === 'SERVICE_FEE') {
                      const operationalFee = bookingDetails.price * 0.1; // דמי תפעול בפועל
                      
                      let discountAmount = 0;
                      if (appliedCoupon.discountType === 'PERCENTAGE') {
                        // אחוז מדמי התפעול
                        discountAmount = operationalFee * (appliedCoupon.discountValue / 100);
                      } else {
                        // סכום קבוע מוגבל לדמי התפעול
                        discountAmount = Math.min(appliedCoupon.discountValue, operationalFee);
                      }
                      
                      return `₪${discountAmount.toFixed(2)}`;
                    }
                    return formatCurrency(discount.discountAmountCents);
                  })()}
                </Text>
              </View>
              
              <View style={styles.discountRow}>
                <Text style={styles.discountLabel}>מחיר מקורי</Text>
                <Text style={styles.discountOriginal}>
                  ₪{paymentAmount.toFixed(2)}
                </Text>
              </View>
              
              <View style={styles.discountDivider} />
              
              <View style={styles.discountRow}>
                <Text style={styles.discountFinalLabel}>מחיר סופי</Text>
                <Text style={styles.discountFinalValue}>
                  {(() => {
                    // חישוב מחיר סופי לפי כללי הברזל: עלות חניה + דמי תפעול לאחר הנחה
                    if (appliedCoupon.applyTo === 'SERVICE_FEE') {
                      const parkingCost = bookingDetails.price; // עלות חניה
                      const operationalFee = bookingDetails.price * 0.1; // דמי תפעול מקוריים
                      
                      let discountAmount = 0;
                      if (appliedCoupon.discountType === 'PERCENTAGE') {
                        discountAmount = operationalFee * (appliedCoupon.discountValue / 100);
                      } else {
                        discountAmount = Math.min(appliedCoupon.discountValue, operationalFee);
                      }
                      
                      const finalOperationalFee = operationalFee - discountAmount;
                      const finalTotal = parkingCost + finalOperationalFee;
                      
                      return `₪${finalTotal.toFixed(2)}`;
                    }
                    return formatCurrency(discount.finalAmountCents);
                  })()}
                </Text>
              </View>
              
              <View style={styles.discountSavings}>
                <Text style={styles.discountSavingsText}>
                  💰 חסכת {(() => {
                    // חישוב חיסכון מדויק לפי כללי הברזל
                    if (appliedCoupon.applyTo === 'SERVICE_FEE') {
                      const operationalFee = bookingDetails.price * 0.1; // דמי תפעול בפועל
                      
                      let discountAmount = 0;
                      if (appliedCoupon.discountType === 'PERCENTAGE') {
                        discountAmount = operationalFee * (appliedCoupon.discountValue / 100);
                      } else {
                        discountAmount = Math.min(appliedCoupon.discountValue, operationalFee);
                      }
                      
                      const discountPercentage = ((discountAmount / paymentAmount) * 100).toFixed(1);
                      return `₪${discountAmount.toFixed(2)} (${discountPercentage}%)`;
                    }
                    return `${formatCurrency(discount.discountAmountCents)} (${discount.discountPercentage.toFixed(1)}%)`;
                  })()}
                </Text>
              </View>
            </View>
          )}
        </View>
        )}

        {/* אמצעי תשלום */}
        <View style={styles.paymentCard}>
          <Text style={styles.sectionTitle}>אמצעי תשלום</Text>
          
          {/* בחירת אמצעי תשלום */}
          <View style={styles.paymentMethods}>
            <TouchableOpacity
              style={[
                styles.paymentMethod,
                paymentMethod === 'card' && styles.paymentMethodActive
              ]}
              onPress={() => setPaymentMethod('card')}
            >
              <Ionicons 
                name="card" 
                size={20} 
                color={paymentMethod === 'card' ? colors.primary : colors.subtext} 
              />
              <Text style={[
                styles.paymentMethodText,
                paymentMethod === 'card' && styles.paymentMethodTextActive
              ]}>
                כרטיס אשראי
              </Text>
              {paymentMethod === 'card' && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>

          {/* פרטי כרטיס אשראי */}
          {paymentMethod === 'card' && (
            <View style={styles.cardForm}>
              <Text style={styles.inputLabel}>מספר כרטיס</Text>
              <TextInput
                style={styles.input}
                placeholder="1234 5678 9012 3456"
                value={cardNumber}
                onChangeText={setCardNumber}
                keyboardType="numeric"
                maxLength={19}
                placeholderTextColor={colors.subtext}
              />

              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>תוקף</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="MM/YY"
                    value={expiryDate}
                    onChangeText={setExpiryDate}
                    keyboardType="numeric"
                    maxLength={5}
                    placeholderTextColor={colors.subtext}
                  />
                </View>
                
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="123"
                    value={cvv}
                    onChangeText={setCvv}
                    keyboardType="numeric"
                    maxLength={4}
                    secureTextEntry
                    placeholderTextColor={colors.subtext}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>שם בעל הכרטיס</Text>
              <TextInput
                style={styles.input}
                placeholder="שם מלא כפי שמופיע על הכרטיס"
                value={cardholderName}
                onChangeText={setCardholderName}
                placeholderTextColor={colors.subtext}
              />
            </View>
          )}
        </View>

        {/* כפתור תשלום */}
        <View style={styles.paymentButtonContainer}>
          <ZpButton
            title={loading ? "מעבד תשלום..." : `שלם ₪${finalAmount.toFixed(2)}`}
            onPress={handlePayment}
            disabled={loading}
            loading={loading}
            style={styles.paymentButton}
            leftIcon={loading ? null : <Ionicons name="card" size={20} color="#fff" />}
          />
          
          <Text style={styles.securityNote}>
            🔒 התשלום מאובטח ומוצפן
          </Text>
        </View>
      </ScrollView>

      {/* התראת חפיפת רכב הועברה למסך ההזמנה */}
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  
  // Header
  header: {
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
    textAlign: 'right',
  },

  // Cards
  summaryCard: {
    backgroundColor: colors.surface,
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  paymentCard: {
    backgroundColor: colors.surface,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },

  // Clean design styles
  cleanDetailsContainer: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cleanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border + '30',
  },
  cleanIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
    marginRight: 16, // רווח בין האייקון לטקסט
  },
  cleanContent: {
    flex: 1,
    paddingRight: 16,
  },
  cleanLabel: {
    fontSize: 14,
    color: colors.subtext,
    fontWeight: '500',
    textAlign: 'left',
    marginBottom: 4,
  },
  cleanValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'left',
  },
  cleanSubValue: {
    fontSize: 12,
    color: colors.subtext,
    marginTop: 2,
    textAlign: 'right',
  },

  // Price container styles
  priceContainer: {
    backgroundColor: colors.bg,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'left',
    marginBottom: 16,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  priceLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
  },
  priceDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  totalPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  totalPriceLabel: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  totalPriceValue: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '800',
  },

  // Section titles - עיצוב מושך ומגרה
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text, // שחור במקום primary
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: colors.text + '20',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Summary
  summarySection: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.subtext,
    marginLeft: 8,
    marginRight: 8,
    minWidth: 60,
  },
  summaryValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },

  // Price section
  priceSection: {
    backgroundColor: colors.bg,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  totalRow: {
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginLeft: 8,
    marginRight: 8,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'right',
  },

  // Payment methods
  paymentMethods: {
    marginBottom: 16,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  paymentMethodActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  paymentMethodText: {
    fontSize: 16,
    color: colors.subtext,
    marginLeft: 12,
    flex: 1,
    textAlign: 'left',
  },
  paymentMethodTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },

  // Card form
  cardForm: {
    marginTop: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    textAlign: 'left',
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right',
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  inputHalf: {
    flex: 0.48,
  },

  // Payment button
  paymentButtonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  paymentButton: {
    marginBottom: 12,
  },
  securityNote: {
    fontSize: 12,
    color: colors.subtext,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.bg,
  },
  errorText: {
    fontSize: 16,
    color: colors.error,
    textAlign: 'center',
    marginVertical: 16,
  },
  backButton: {
    marginTop: 16,
  },

  // Coupon styles
  couponCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  couponContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  couponInput: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: colors.text,
    textAlign: 'right', // שמאל בעברית = right ב-RTL
  },
  couponButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 60,
  },
  couponButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  couponHint: {
    fontSize: 12,
    color: colors.subtext,
    textAlign: 'left',
    marginTop: 12,
    fontStyle: 'italic',
  },
  couponInputValid: {
    borderColor: colors.success,
    borderWidth: 2,
  },
  couponInputError: {
    borderColor: colors.error,
    borderWidth: 2,
  },
  couponButtonDisabled: {
    backgroundColor: colors.subtext,
    opacity: 0.6,
  },
  couponError: {
    fontSize: 14,
    color: colors.error,
    textAlign: 'left',
    marginTop: 8,
    fontWeight: '500',
  },
  couponSuccess: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.success + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.success,
  },
  couponSuccessText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
    flex: 1,
    textAlign: 'left',
  },
  removeCouponButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.error + '20',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.error,
  },
  removeCouponText: {
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
  discountInfo: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.primary + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  discountLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  discountValue: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
  },
  discountOriginal: {
    fontSize: 14,
    color: colors.subtext,
    textDecorationLine: 'line-through',
  },
  discountDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  discountFinalLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '700',
  },
  discountFinalValue: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: '700',
  },
  discountHeader: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  discountTitle: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'left',
  },
  discountSubtitle: {
    fontSize: 12,
    color: colors.subtext,
    fontStyle: 'italic',
  },
  discountSavings: {
    marginTop: 12,
    padding: 8,
    backgroundColor: colors.success + '15',
    borderRadius: 8,
    alignItems: 'center',
  },
  discountSavingsText: {
    fontSize: 14,
    color: colors.success,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // סגנונות חדשים לפירוט מפורט
  priceSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginLeft: 12,
  },
  priceSubLabel: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '500',
  },
  priceSubValue: {
    fontSize: 13,
    color: colors.subtext,
    fontWeight: '600',
  },
  discountLabel: {
    color: colors.success,
  },
  discountValue: {
    color: colors.success,
  },
  transparencyNote: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.primary + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary + '20',
  },
  transparencyText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
});
