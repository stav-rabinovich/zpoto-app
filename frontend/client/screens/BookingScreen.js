// screens/BookingScreen.js
// RTL מלא. בחירת התחלה וסיום (פאנל גלגלים ייעודי, החלקה ימ/שמ ליום קודם/הבא), בלי קיצורי 15/30.
// נשמרו כללי מינימום שעה, חפיפות, התראות, ועוד.

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  TextInput,
  Keyboard,
  Image,
  I18nManager,
  Modal,
  FlatList,
  PanResponder,
  Dimensions,
} from 'react-native';
import dayjs from 'dayjs';
import 'dayjs/locale/he';
import * as Haptics from 'expo-haptics';
import api from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import { formatForAPI, convertFromUTC, formatForDisplay, addHoursInIsrael, getIsraelMinutesFromDate, setTimeInIsrael } from '../utils/timezone';
import { scheduleBookingNotifications, cancelBookingNotifications } from '../utils/notify';
import { useTheme } from '@shopify/restyle';
import ZpButton from '../components/ui/ZpButton';
import { createBooking } from '../services/api/bookings';
import { LinearGradient } from 'expo-linear-gradient';
import TimePickerWheel, { roundTo15Minutes } from '../components/ui/TimePickerWheel';
import { useAuth } from '../contexts/AuthContext';
import { useAvailability } from '../hooks';
import ParkingAvailability from '../components/ParkingAvailability';
import BookingValidator from '../components/BookingValidator';
import NetworkStatus from '../components/NetworkStatus';
import { API_BASE } from '../consts';
import { BOOKING_TYPES, isImmediateBooking, isFutureBooking } from '../constants/bookingTypes';

dayjs.locale('he');

// ודא ש-RTL מאופשר (בעיקר לאנדרואיד)
try { I18nManager.allowRTL(true); } catch {}

const PROFILE_KEY = 'profile';
const VEHICLES_KEY = 'vehicles';
const BOOKINGS_KEY = 'bookings';
const LISTINGS_KEY = 'owner_listings';

function msToHhMm(ms) {
  if (ms <= 0) return '00:00';
  const totalMin = Math.floor(ms / (60 * 1000));
  const hh = Math.floor(totalMin / 60);
  const mm = totalMin % 60;
  const pad = n => String(n).padStart(2, '0');
  return `${pad(hh)}:${pad(mm)}`;
}
function paymentLabel(key) {
  switch (key) {
    case 'paypal': return 'PayPal';
    case 'applepay': return 'Apple Pay';
    case 'card':
    default: return 'כרטיס אשראי';
  }
}
function hasOverlap(bookings, startISO, endISO, excludeId = null) {
  const s = new Date(startISO).getTime();
  const e = new Date(endISO).getTime();
  return bookings.some(b => {
    if (excludeId && b.id === excludeId) return false;
    const bs = new Date(b.start).getTime();
    const be = new Date(b.end).getTime();
    return s < be && e > bs;
  });
}
// 🔧 תוקן: משתמש במערכת השעות החדשה במקום המרות ידניות
const roundTo15 = (d) => {
  const dt = new Date(d);
  const m = getIsraelMinutesFromDate(dt); // שימוש בפונקציית העזר החדשה
  const rounded = Math.round(m / 15) * 15;
  if (rounded >= 60) {
    // במקום setHours ישירות, נשתמש בפונקציות העזר החדשות
    const currentHour = getIsraelHourFromDate(dt);
    return setTimeInIsrael(dt, currentHour + 1, 0);
  } else {
    const currentHour = getIsraelHourFromDate(dt);
    return setTimeInIsrael(dt, currentHour, rounded);
  }
};

// ===== WheelPicker כללי עם Snap =====
const ITEM_H = 40;
function WheelPicker({
  data, value, onChange, height = ITEM_H * 5, style, textStyle,
}) {
  const listRef = React.useRef(null);
  const selectedIndex = Math.max(0, data.findIndex(d => d.value === value));
  const snapTo = (index) => {
    const clamped = Math.max(0, Math.min(index, data.length - 1));
    listRef.current?.scrollToOffset({ offset: clamped * ITEM_H, animated: true });
    onChange?.(data[clamped].value);
  };
  React.useEffect(() => {
    const id = setTimeout(() => {
      listRef.current?.scrollToOffset({ offset: selectedIndex * ITEM_H, animated: false });
    }, 0);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const onScrollEnd = (e) => {
    const offset = e.nativeEvent.contentOffset.y;
    const index = Math.round(offset / ITEM_H);
    snapTo(index);
  };
  const renderItem = ({ item }) => {
    const isActive = item.value === value;
    return (
      <View style={{ height: ITEM_H, justifyContent: 'center', alignItems: 'flex-end', alignSelf: 'stretch', paddingHorizontal: 12 }}>
        <Text style={[{ fontSize: 16, color: isActive ? '#111827' : '#94A3B8', fontWeight: isActive ? '800' : '600', textAlign: 'right', writingDirection: 'rtl' }, textStyle]}>
          {item.label}
        </Text>
      </View>
    );
  };
  return (
    <View style={[{ height, overflow: 'hidden' }, style]}>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', top: (height - ITEM_H) / 2, height: ITEM_H, left: 0, right: 0,
                 borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E2E8F0', zIndex: 1 }}
      />
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
        contentContainerStyle={{ paddingTop: (height - ITEM_H) / 2, paddingBottom: (height - ITEM_H) / 2 }}
      />
    </View>
  );
}



export default function BookingScreen({ route, navigation }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const { token, isAuthenticated } = useAuth();

  const params = route?.params || {};
  const spot = params.spot || params.parkingSpot || null; // תמיכה בשני שמות פרופס
  const editingId = params.bookingId || null;
  
  // זיהוי סוג הזמנה ופרמטרים נוספים
  const bookingType = params.bookingType || BOOKING_TYPES.IMMEDIATE; // ברירת מחדל: מיידי
  const isImmediate = isImmediateBooking(bookingType);
  const isFuture = isFutureBooking(bookingType);
  const searchStartDate = params.searchStartDate || null;
  const searchEndDate = params.searchEndDate || null;
  const immediateDuration = params.immediateDuration || 2.5;
  
  console.log('🔍 BookingScreen - Booking type:', bookingType);
  console.log('🔍 BookingScreen - Is immediate:', isImmediate);
  console.log('🔍 BookingScreen - Is future:', isFuture);
  console.log('🔍 BookingScreen - Times editable:', areTimesEditable);
  
  if (isFuture) {
    console.log('📅 Future booking times:', {
      searchStart: searchStartDate ? new Date(searchStartDate).toLocaleString('he-IL') : 'None',
      searchEnd: searchEndDate ? new Date(searchEndDate).toLocaleString('he-IL') : 'None'
    });
  } else {
    console.log('⚡ Immediate booking setup:', {
      duration: immediateDuration + ' hours',
      maxHours: 12,
      endOfDay: '23:45'
    });
  }

  // לוגים לבדיקת נתוני החניה
  console.log('🏁 BookingScreen - Full spot data:', JSON.stringify(spot, null, 2));
  console.log('🏁 BookingScreen - Spot pricing field:', spot?.pricing);
  console.log('🏁 BookingScreen - Spot price field:', spot?.price);

  const pricePerHour = typeof spot?.price === 'number' ? spot.price : 10;

  const [start, setStart] = useState(() => {
    if (isFuture && searchStartDate) {
      // הזמנה עתידית: השתמש בזמן מהחיפוש
      const futureStart = new Date(searchStartDate);
      console.log('📅 Future booking - Using search start time:', futureStart.toISOString());
      return futureStart;
    } else {
      // הזמנה מיידית: עגל לרבע שעה הקרובה
      const now = new Date();
      const s = params.initialStart ? new Date(params.initialStart) : now;
      s.setSeconds(0, 0);
      
      // וודא שהזמן לא בעבר
      const currentTime = new Date();
      
      if (s <= currentTime) {
        const rounded = roundTo15Minutes(currentTime);
        console.log('⚡ Immediate booking - Using rounded current time:', rounded.toISOString());
        return rounded;
      }
      
      const rounded = roundTo15Minutes(s);
      console.log('⚡ Immediate booking - Using rounded time:', rounded.toISOString());
      return rounded;
    }
  });
  
  // זמן הסיום יוגדר בuseEffect אחרי שstart מוכן
  const [end, setEnd] = useState(new Date());

  const [paymentMethod, setPaymentMethod] = useState('card');
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [plate, setPlate] = useState('');
  const [carDesc, setCarDesc] = useState('');

  // פאנל גלגלים
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelMode, setPanelMode] = useState('start');
  
  // האם זמנים ניתנים לעריכה (רק בהזמנה מיידית)
  const areTimesEditable = isImmediate;

  // פונקציה לקבלת הודעות הנחיה דינמיות
  const getBookingInstructions = useCallback(() => {
    if (isFuture) {
      return {
        title: 'הזמנה עתידית',
        subtitle: 'הזמנים נקבעו לפי החיפוש שביצעת ולא ניתן לשנותם',
        icon: '📅',
        color: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)'
      };
    } else {
      return {
        title: 'הזמנה מיידית',
        subtitle: 'ניתן לבחור זמן התחלה וסיום עד סוף היום (מקסימום 12 שעות)',
        icon: '⚡',
        color: '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)'
      };
    }
  }, [isFuture]);

  // פונקציה לחישוב זמן סיום מקסימלי לפי זמינות החניה
  const getMaxEndTime = useCallback(() => {
    if (!isImmediate) return null;
    
    // 🔧 תוקן: משתמש בפונקציית העזר החדשה במקום המרה ידנית
    const endOfDay = setTimeInIsrael(new Date(), 23, 45);
    
    // אם יש נתוני זמינות מהשרת, השתמש בהם
    if (availability && availability.availableUntil) {
      const availableUntil = new Date(availability.availableUntil);
      return availableUntil < endOfDay ? availableUntil : endOfDay;
    }
    
    // אחרת, השתמש בסוף היום
    return endOfDay;
  }, [isImmediate, availability]);

  // פונקציית ולידציה להזמנה מיידית
  const validateImmediateBooking = useCallback((startTime, endTime) => {
    if (!isImmediate) return { isValid: true };

    // בדיקות בסיסיות
    if (!startTime || !endTime) {
      return { isValid: false, error: 'זמני התחלה וסיום נדרשים' };
    }

    const now = new Date();
    
    // בדיקה שההתחלה לא בעבר
    if (startTime <= now) {
      return {
        isValid: false,
        error: 'זמן ההתחלה חייב להיות בעתיד'
      };
    }
    
    // בדיקה שהסיום אחרי ההתחלה
    if (endTime <= startTime) {
      return {
        isValid: false,
        error: 'זמן הסיום חייב להיות אחרי זמן ההתחלה'
      };
    }
    
    // בדיקה שלא עובר את זמן הזמינות המקסימלי
    const maxEndTime = getMaxEndTime();
    if (endTime > maxEndTime) {
      const maxTimeStr = maxEndTime.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
      return {
        isValid: false,
        error: `ניתן להזמין עד ${maxTimeStr} לכל היותר`
      };
    }
    
    // בדיקת מינימום שעה
    const diffMs = endTime - startTime;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 1) {
      return {
        isValid: false,
        error: 'מינימום זמן הזמנה הוא שעה אחת'
      };
    }
    
    // בדיקת מקסימום 12 שעות
    if (diffHours > 12) {
      return {
        isValid: false,
        error: 'ניתן להזמין מקסימום 12 שעות'
      };
    }
    
    return { isValid: true };
  }, [isImmediate]); // 'start' | 'end'

  // זמינות החניה - משתמש בhook החדש
  const { checkAvailability, validateBooking, loading: availabilityLoading, error: availabilityError } = useAvailability();
  const [availability, setAvailability] = useState(null);
  const [validationResult, setValidationResult] = useState(null);
  
  // הוסר קוד serverPrice - משתמשים בחישוב client-side מעודכן

  // הגדרת זמן סיום ראשוני ועדכון כשזמן ההתחלה משתנה
  useEffect(() => {
    if (isFuture && searchEndDate) {
      // הזמנה עתידית: השתמש בזמן מהחיפוש
      const futureEnd = new Date(searchEndDate);
      console.log('📅 Future booking - Setting search end time:', futureEnd.toISOString());
      setEnd(futureEnd);
    } else if (start) {
      // הזמנה מיידית: חשב מזמן ההתחלה + שעה אחת (לא immediateDuration)
      // 🔧 תוקן: משתמש בפונקציית העזר החדשה במקום המרה ידנית
      const newEnd = addHoursInIsrael(start, 1); // שעה אחת
      console.log('⚡ Setting end time based on start time (1 hour):', {
        start: start.toISOString(),
        newEnd: newEnd.toISOString(),
        duration: '1 hour'
      });
      setEnd(newEnd);
    }
  }, [start, isImmediate, isFuture, immediateDuration, searchEndDate]);

  useEffect(() => {
    (async () => {
      try {
        // טעינת פרופיל מהשרת
        try {
          const profileResponse = await api.get('/api/auth/me');
          if (profileResponse.data?.payment) setPaymentMethod(profileResponse.data.payment);
        } catch (error) {
          console.log('Failed to load profile from server:', error);
        }
        
        // טעינת רכבים מהשרת
        try {
          console.log('🚗 Loading vehicles from server...');
          const vehiclesResponse = await api.get('/api/vehicles');
          const userVehicles = vehiclesResponse.data?.data || [];
          console.log('🚗 Loaded vehicles:', userVehicles);
          
          setVehicles(userVehicles);
          
          // בחירת רכב ברירת מחדל אוטומטית
          if (userVehicles.length > 0) {
            const defaultVehicle = userVehicles.find(v => v.isDefault) || userVehicles[0];
            console.log('🚗 Selected default vehicle:', defaultVehicle);
            
            setSelectedVehicleId(defaultVehicle.id);
            setPlate(defaultVehicle.licensePlate || '');
            
            // בניית תיאור הרכב - עדיפות לתיאור מותאם אישית, אחר כך יצרן ודגם
            let vehicleDescription = '';
            if (defaultVehicle.description && defaultVehicle.description.trim()) {
              // יש תיאור מותאם אישית - נשתמש בו
              vehicleDescription = defaultVehicle.description.trim();
              console.log('🚗 Using custom description:', vehicleDescription);
            } else {
              // אין תיאור מותאם - נבנה מיצרן ודגם
              const makeModel = `${defaultVehicle.make || ''} ${defaultVehicle.model || ''}`.trim();
              if (makeModel) {
                vehicleDescription = makeModel;
                console.log('🚗 Using make/model description:', vehicleDescription);
              } else {
                console.log('🚗 No description available, leaving empty');
              }
            }
            setCarDesc(vehicleDescription);
          } else {
            console.log('🚗 No vehicles found, clearing fields');
            setPlate('');
            setCarDesc('');
          }
        } catch (error) {
          console.error('🚗 Failed to load vehicles:', error);
          setVehicles([]);
          setPlate('');
          setCarDesc('');
        }
      } catch {
        // הוסרנו שמירה מקומית - רק שרת
      }
    })();
  }, []);

  // טעינת זמינות החניה
  const loadAvailability = useCallback(async () => {
    if (!spot?.parkingId || !start) {
      console.log('🔍 CLIENT DEBUG: Skipping availability load - missing data:', { 
        parkingId: spot?.parkingId, 
        hasStart: !!start 
      });
      return;
    }
    
    console.log('🔍 CLIENT DEBUG: Loading availability...', {
      parkingId: spot.parkingId,
      startTime: start.toISOString(),
      startTimeLocal: start.toString()
    });
    
    try {
      const result = await checkAvailability(spot.parkingId, formatForAPI(start));
      
      console.log('🔍 CLIENT DEBUG: Availability result:', result);
      
      if (result.success) {
        console.log('🔍 CLIENT DEBUG: Setting availability:', result.data);
        setAvailability(result.data);
      } else {
        console.error('Failed to load availability:', result.error);
        setAvailability(null);
      }
    } catch (error) {
      console.error('Error loading availability:', error);
      setAvailability(null);
    }
  }, [spot?.parkingId, start]);

  // טען זמינות כשהחניה או זמן ההתחלה משתנים
  useEffect(() => {
    console.log('🔍 CLIENT DEBUG: useEffect for availability triggered', {
      parkingId: spot?.parkingId,
      startTime: start?.toISOString(),
      loadAvailabilityExists: typeof loadAvailability === 'function'
    });
    loadAvailability();
  }, [loadAvailability]);

  // הוסר useEffect של חישוב מחיר מהשרת - משתמשים בחישוב client-side מעודכן

  const MIN_MS = 60 * 60 * 1000; // מינימום שעה

  // פונקציה לחישוב מחיר proportional (מדויק)
  const calculateProportionalPrice = (diffMs, spot) => {
    if (!spot) {
      console.log('💰 ❌ No spot data provided');
      return { total: 0, exactHours: 0, breakdown: [] };
    }
    
    const exactHours = diffMs / (1000 * 60 * 60);
    const wholeHours = Math.floor(exactHours);
    const fractionalPart = exactHours - wholeHours;
    
    console.log(`💰 🔢 Proportional calculation: ${exactHours.toFixed(2)} hours (${wholeHours} whole + ${fractionalPart.toFixed(2)} fractional)`);
    
    // אם יש מחירון מדורג
    if (spot.pricing) {
      try {
        const pricingData = typeof spot.pricing === 'string' ? JSON.parse(spot.pricing) : spot.pricing;
        console.log('💰 ✅ Using tiered pricing:', pricingData);
        
        let total = 0;
        const breakdown = [];
        
        // חישוב שעות שלמות
        for (let i = 1; i <= wholeHours; i++) {
          const rawHourPrice = pricingData[`hour${i}`] || pricingData.hour1 || pricePerHour;
          const hourPrice = typeof rawHourPrice === 'string' ? parseFloat(rawHourPrice) : rawHourPrice;
          total += hourPrice;
          breakdown.push({ hour: i, price: hourPrice, isFractional: false });
          console.log(`💰 ✅ Hour ${i}: ₪${hourPrice}`);
        }
        
        // חישוב חלק שברי (אם קיים)
        if (fractionalPart > 0) {
          const nextHourIndex = wholeHours + 1;
          const rawNextHourPrice = pricingData[`hour${nextHourIndex}`] || pricingData.hour1 || pricePerHour;
          const nextHourPrice = typeof rawNextHourPrice === 'string' ? parseFloat(rawNextHourPrice) : rawNextHourPrice;
          const fractionalPrice = fractionalPart * nextHourPrice;
          total += fractionalPrice;
          breakdown.push({ 
            hour: nextHourIndex, 
            price: fractionalPrice, 
            isFractional: true, 
            fractionalPart: fractionalPart 
          });
          console.log(`💰 ✅ Hour ${nextHourIndex} (${(fractionalPart * 100).toFixed(0)}%): ₪${fractionalPrice.toFixed(2)}`);
        }
        
        console.log(`💰 ✅ Proportional total: ₪${total.toFixed(2)}`);
        return { total: total, exactHours: exactHours, breakdown: breakdown };
      } catch (error) {
        console.error('💰 ❌ Failed to parse pricing JSON:', error);
      }
    }
    
    // fallback למחיר יחיד
    const flatTotal = exactHours * pricePerHour;
    console.log(`💰 ⚠️ Using flat rate: ${exactHours.toFixed(2)} × ₪${pricePerHour} = ₪${flatTotal.toFixed(2)}`);
    return { total: flatTotal, exactHours: exactHours, breakdown: [] };
  };

  const calculateTotalPrice = (hours, spot) => {
    if (!spot) {
      console.log('💰 ❌ No spot data provided');
      return 0;
    }
    
    console.log(`💰 🎯 Calculating price for ${hours} hours (client-side fallback)`);
    console.log('💰 🎯 Spot pricing field:', spot.pricing);
    console.log('💰 🎯 Spot pricing type:', typeof spot.pricing);
    
    // אם יש מחירון מדורג
    if (spot.pricing && typeof spot.pricing === 'string') {
      try {
        const pricingData = JSON.parse(spot.pricing);
        console.log('💰 ✅ Using tiered pricing:', pricingData);
        
        let total = 0;
        for (let i = 1; i <= hours; i++) {
          const rawHourPrice = pricingData[`hour${i}`] || pricingData.hour1 || pricePerHour;
          // המרה לnumber כי הנתונים מגיעים כstrings
          const hourPrice = typeof rawHourPrice === 'string' ? parseFloat(rawHourPrice) : rawHourPrice;
          total += hourPrice;
          console.log(`💰 ✅ Hour ${i}: ₪${hourPrice} (from ${pricingData[`hour${i}`] ? `hour${i}` : 'fallback'}, raw: ${rawHourPrice})`);
        }
        
        console.log(`💰 ✅ Total for ${hours} hours: ₪${total}`);
        return total;
      } catch (error) {
        console.error('💰 ❌ Failed to parse pricing JSON:', error);
      }
    } else if (spot.pricing && typeof spot.pricing === 'object') {
      // אם זה כבר אובייקט
      console.log('💰 ✅ Using tiered pricing (object):', spot.pricing);
      
      let total = 0;
      for (let i = 1; i <= hours; i++) {
        const rawHourPrice = spot.pricing[`hour${i}`] || spot.pricing.hour1 || pricePerHour;
        // המרה לnumber כי הנתונים יכולים להגיע כstrings
        const hourPrice = typeof rawHourPrice === 'string' ? parseFloat(rawHourPrice) : rawHourPrice;
        total += hourPrice;
        console.log(`💰 ✅ Hour ${i}: ₪${hourPrice} (from ${spot.pricing[`hour${i}`] ? `hour${i}` : 'fallback'}, raw: ${rawHourPrice})`);
      }
      
      console.log(`💰 ✅ Total for ${hours} hours: ₪${total}`);
      return total;
    }
    
    // fallback למחיר יחיד
    console.log(`💰 ⚠️ Using flat rate: ${hours} × ₪${pricePerHour} = ₪${hours * pricePerHour}`);
    return hours * pricePerHour;
  };

  const { hours, exactHours, total, breakdown, invalid } = useMemo(() => {
    const diffMs = end - start;
    if (diffMs <= 0) {
      return { hours: 1, exactHours: 0, total: 0, breakdown: [], invalid: true };
    }
    
    // 🆕 חישוב proportional מדויק
    const proportionalResult = calculateProportionalPrice(diffMs, spot);
    
    // וידוא שהתוצאה תקינה
    if (!proportionalResult || typeof proportionalResult.total !== 'number') {
      console.error('💰 ❌ Invalid proportional result:', proportionalResult);
      return { hours: 1, exactHours: 0, total: 0, breakdown: [], invalid: true };
    }
    
    // חישוב שעות מעוגלות למעלה (לצורך תצוגה)
    const h = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60)));
    
    console.log(`💰 🎯 Final calculation: ${proportionalResult.exactHours.toFixed(2)} exact hours → ₪${proportionalResult.total.toFixed(2)}`);
    
    return { 
      hours: h, 
      exactHours: proportionalResult.exactHours || 0,
      total: proportionalResult.total || 0, 
      breakdown: proportionalResult.breakdown || [],
      invalid: false 
    };
  }, [start, end, pricePerHour, spot]);

  const now = new Date();
  const isActive = spot && start <= now && now < end;
  const timeLeft = isActive ? end - now : 0;

  const upsertBooking = async (booking) => {
    let serverSuccess = false;
    
    try {
      // בדיקה אם המשתמש מחובר
      if (!isAuthenticated) {
        throw new Error('המשתמש לא מחובר - נדרשת התחברות');
      }
      
      if (!token) {
        throw new Error('לא נמצא טוקן אימות - נדרשת התחברות מחדש');
      }
      
      // שליחה לשרת באמצעות השירות החדש
      if (booking.spot?.parkingId || booking.spot?.id) {
        // חיפוש ה-parking ID האמיתי
        let parkingId;
        
        if (booking.spot.parkingId) {
          parkingId = parseInt(booking.spot.parkingId);
        } else if (booking.spot.id && booking.spot.id.startsWith('parking-')) {
          // אם ה-ID הוא 'parking-15', נחלץ את 15
          const numericId = booking.spot.id.replace('parking-', '');
          parkingId = parseInt(numericId);
        } else {
          parkingId = parseInt(booking.spot.id);
        }
        
        if (isNaN(parkingId)) {
          throw new Error(`מזהה חניה לא תקין: ${booking.spot.id}`);
        }
        
        const serverBooking = {
          parkingId: parkingId,
          startTime: formatForAPI(booking.start), // המרה ל-UTC לפני שליחה
          endTime: formatForAPI(booking.end)      // המרה ל-UTC לפני שליחה
          // הסטטוס יקבע בשרת לפי מוד האישור של החניה
        };
        
        console.log('🚀 Creating booking on server:', serverBooking);
        console.log('🔍 Token available:', !!token);
        console.log('🔍 Token value:', token ? `${token.substring(0, 20)}...` : 'null');
        console.log('🔍 User authenticated:', !!isAuthenticated);
        
        const result = await createBooking(serverBooking);
        console.log('📨 Server response:', result);
        
        if (result.success) {
          console.log('✅ Server booking created successfully:', result.data);
          booking.serverId = result.data.id;
          serverSuccess = true;
          
          // הודעת הצלחה מותאמת לסטטוס
          const bookingStatus = result.data.status;
          
          if (bookingStatus === 'CONFIRMED') {
            Alert.alert(
              '✅ הזמנה אושרה!',
              'ההזמנה אושרה מיד ותוצג בכל המכשירים שלך.'
            );
          } else if (bookingStatus === 'PENDING_APPROVAL') {
            Alert.alert(
              '⏳ הזמנה נשלחה לאישור',
              'הבקשה נשלחה לבעל החניה לאישור. תקבל התראה תוך 5 דקות.',
              [
                { text: 'הבנתי', style: 'default' },
                { 
                  text: 'צפה בסטטוס', 
                  onPress: () => {
                    // נווט למסך הזמנות כדי לראות את הסטטוס
                    navigation.navigate('MyBookings');
                  }
                }
              ]
            );
          } else {
            Alert.alert(
              '📋 הזמנה נשלחה',
              'ההזמנה נשמרה בשרת ותוצג בכל המכשירים שלך.'
            );
          }
        } else {
          throw new Error(result.error);
        }
      } else {
        throw new Error('לא נמצא מזהה חניה תקין');
      }
    } catch (error) {
      console.error('❌ Failed to send booking to server:', error);
      
      // הודעה מותאמת אישית לסוגי שגיאות שונים
      if (error.message.includes('מחובר') || error.message.includes('טוקן')) {
        Alert.alert(
          'נדרשת התחברות 🔐', 
          `${error.message}\n\nההזמנה נשמרה מקומית. להתחבר ולסנכרן?`,
          [
            { text: 'לא עכשיו', style: 'cancel' },
            { 
              text: 'התחבר', 
              onPress: () => navigation.navigate('Login')
            }
          ]
        );
      } else if (error.message.includes('חיבור') || error.message.includes('Network') || error.message.includes('timeout')) {
        Alert.alert(
          'בעיית חיבור 🌐', 
          `לא ניתן להתחבר לשרת כרגע.\n\nההזמנה נשמרה מקומית ותסונכרן אוטומטי כשהחיבור יחזור.`,
          [
            { text: 'הבנתי', style: 'default' }
          ]
        );
      } else {
        Alert.alert(
          'שגיאה בשליחה לשרת', 
          `${error.message}\n\nההזמנה נשמרה מקומית ותישלח כשהבעיה תיפתר.`
        );
      }
    }
    
    // הוסרנו שמירה מקומית - רק שרת
    if (serverSuccess) {
      console.log('✅ Booking saved to server successfully');
    }
    
    return serverSuccess;
  };

  const openPanel = (mode) => {
    if (!areTimesEditable) {
      // הזמנה עתידית - זמנים קבועים
      Alert.alert(
        '📅 הזמנה עתידית', 
        `הזמנים נקבעו לפי החיפוש שביצעת:\n\n• התחלה: ${dayjs(start).format('DD/MM/YYYY בשעה HH:mm')}\n• סיום: ${dayjs(end).format('DD/MM/YYYY בשעה HH:mm')}\n\nלשינוי זמנים, בצע חיפוש חדש מהדף הראשי.`,
        [
          { text: 'הבנתי', style: 'default' },
          { 
            text: 'חזור לחיפוש', 
            style: 'default',
            onPress: () => navigation.navigate('Home')
          }
        ]
      );
      return;
    }
    
    // הזמנה מיידית - אפשר עריכה
    setPanelMode(mode);
    setPanelVisible(true);
  };

  const handlePanelConfirm = (picked) => {
    const now = new Date();
    
    console.log('🔍 CLIENT DEBUG: Panel confirm called', {
      panelMode,
      pickedTime: picked.toISOString(),
      pickedTimeLocal: picked.toString(),
      currentStart: start.toISOString(),
      currentEnd: end.toISOString(),
      bookingType,
      isImmediate
    });
    
    // ולידציה מתקדמת להזמנה מיידית
    if (isImmediate) {
      // 🔧 תוקן: משתמש בפונקציית העזר החדשה במקום המרה ידנית
      const endOfDay = setTimeInIsrael(new Date(), 23, 45);
      
      if (picked > endOfDay) {
        Alert.alert(
          'זמן לא תקין', 
          'בהזמנה מיידית ניתן לבחור רק עד סוף היום הנוכחי (23:45).',
          [{ text: 'הבנתי', style: 'default' }]
        );
        setPanelVisible(false);
        return;
      }
      
      // בדיקת מקסימום 12 שעות
      if (panelMode === 'end') {
        const maxDuration = 12 * 60 * 60 * 1000; // 12 שעות במילישניות
        if (picked - start > maxDuration) {
          Alert.alert(
            'משך זמן מקסימלי', 
            'בהזמנה מיידית ניתן להזמין מקסימום 12 שעות.',
            [{ text: 'הבנתי', style: 'default' }]
          );
          setPanelVisible(false);
          return;
        }
      }
    }
    
    if (panelMode === 'start') {
      // ולידציה: מניעת בחירת זמן עבר
      if (picked <= now) {
        Alert.alert(
          'זמן לא תקין', 
          'לא ניתן לבחור זמן התחלה בעבר. נבחר הזמן הקרוב ביותר.',
          [{ text: 'הבנתי', style: 'default' }]
        );
        const nextValidTime = roundTo15Minutes(now);
        setStart(nextValidTime);
        
        // עדכון זמן סיום בהתאם
        if (end - nextValidTime < MIN_MS) {
          const e = new Date(nextValidTime.getTime() + MIN_MS);
          setEnd(roundTo15Minutes(e));
        }
      } else {
        const newStart = roundTo15Minutes(picked);
        console.log('🔍 CLIENT DEBUG: Setting NEW start time:', newStart.toISOString());
        console.log('🔍 CLIENT DEBUG: Previous start time was:', start.toISOString());
        setStart(newStart);
        if (end - picked < MIN_MS) {
          const e = new Date(picked.getTime() + MIN_MS);
          setEnd(roundTo15Minutes(e));
        }
      }
    } else {
      // ולידציה לזמן סיום
      if (picked - start < MIN_MS) {
        const e = new Date(start.getTime() + MIN_MS);
        setEnd(roundTo15Minutes(e));
      } else {
        setEnd(roundTo15Minutes(picked));
      }
    }
    setPanelVisible(false);
  };

  const confirm = useCallback(async () => {
    if (!spot) { navigation.goBack(); return; }
    if (!plate.trim()) { Alert.alert('שגיאה', 'נא להזין מספר רכב.'); return; }
    
    // בדיקת תקינות ההזמנה באמצעות הvalidator החדש
    // רק אם יש תוצאה ברורה שהיא לא תקינה
    if (validationResult && validationResult.success && !validationResult.valid) {
      Alert.alert('שגיאה', validationResult.error || 'ההזמנה לא תקינה');
      return;
    }
    
    // ולידציה: וודא שזמן ההתחלה לא בעבר
    const now = new Date();
    if (start <= now) {
      Alert.alert('שגיאה', 'זמן ההתחלה לא יכול להיות בעבר. נא לבחור זמן עתידי.');
      return;
    }
    
    if (end - start < MIN_MS) {
      Alert.alert('שגיאה', 'הסיום חייב להיות לפחות שעה אחרי ההתחלה.');
      return;
    }

    // במקום ליצור הזמנה ישירות, ננווט למסך תשלום
    console.log('🚀 Navigating to payment screen...');
    
    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || null;
    
    navigation.navigate('Payment', {
      spot,
      startTime: formatForAPI(start),
      endTime: formatForAPI(end),
      vehicle: selectedVehicle,
      totalPrice: total,
      totalHours: hours,
      selectedVehicleId,
      plate: plate.trim(),
      carDesc: carDesc.trim()
    });
    
    return; // יציאה מוקדמת - לא ממשיכים עם הקוד הישן

    let serverSyncSuccess = false;

    try {
      // הוסרנו בדיקת חפיפות מקומית - השרת יטפל בזה

      // הוסרנו שמירת פרטי רכב מקומית

      let approvalMode = 'auto';
      try {
        // TODO: בדיקת approval mode מהשרת
        // לעכשיו auto כברירת מחדל
      } catch {}

      if (editingId) {
        const prev = existing.find(b => b.id === editingId);
        if (prev?.notificationIds) {
          try { await cancelBookingNotifications(prev.notificationIds); } catch {}
        }
      }

      const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId) || null;

      const bookingBase = {
        spot: {
          id: spot.id,
          address: spot.address,
          title: spot.title || spot.address || 'חניה',
          price: pricePerHour,
          latitude: spot.latitude,
          longitude: spot.longitude,
          images: spot.images || [],
        },
        ownerListingId: spot.ownerListingId ?? null,
        plate: plate.trim(),
        carDesc: (carDesc || '').trim(),
        vehicleId: selectedVehicle ? selectedVehicle.id : null,
        paymentMethod,
        start: formatForAPI(start),
        end: formatForAPI(end),
        hours,
        total,
        alerted30: false,
        status: approvalMode === 'manual' ? 'pending' : 'confirmed',
        updatedAt: new Date().toISOString(),
      };

      const booking = editingId
        ? { ...bookingBase, id: editingId }
        : { ...bookingBase, id: `b-${Date.now()}`, createdAt: new Date().toISOString() };

      if (booking.status === 'confirmed') {
        try {
          const notifIds = await scheduleBookingNotifications(booking);
          booking.notificationIds = notifIds;
        } catch {}
      }

      serverSyncSuccess = await upsertBooking(booking);

      Keyboard.dismiss();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const syncStatus = serverSyncSuccess ? '✅ נשמרה בשרת' : '📱 נשמרה מקומית';
      const statusText = editingId ? 'הזמנה עודכנה' : (booking.status === 'pending' ? 'הזמנה נשלחה לאישור' : 'הזמנה בוצעה');
      
      Alert.alert(
        `${statusText} ${syncStatus}`,
        `חניה: ${booking.spot.title}
כתובת: ${booking.spot.address || '—'}
מס׳ רכב: ${booking.plate}
רכב: ${booking.carDesc || 'לא צוין'}
אמצעי תשלום: ${paymentLabel(paymentMethod)}
מתאריך: ${dayjs(start).format('DD/MM/YYYY HH:mm')}
עד: ${dayjs(end).format('DD/MM/YYYY HH:mm')}
משך: ${hours} שעות
סה״כ: ₪${total}${!serverSyncSuccess ? '\n\n💡 ההזמנה תסונכרן לשרת כשתתחבר' : ''}`,
        [{ text: 'סגור', onPress: () => navigation.navigate('Bookings') }]
      );
    } catch (e) {}
  }, [spot, plate, carDesc, start, end, hours, total, navigation, pricePerHour, editingId, vehicles, selectedVehicleId, paymentMethod]);

  if (!spot) {
    return (
      <View style={styles.center}>
        <Text style={styles.centerText}>לא התקבלה חניה</Text>
      </View>
    );
  }

  const images = spot.images || [];

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.select({ ios: 'padding' })}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        style={{ direction: 'rtl' }}
      >


        {/* כרטיס מידע על החניה */}
        <View style={styles.card}>
          {/* כותרת שם החניה — במרכז */}
          <Text style={styles.title}>{spot.title || spot.address || 'חניה'}</Text>

          {/* באנר סוג הזמנה */}
          {isFuture && (
            <View style={styles.futureBookingBanner}>
              <View style={styles.bannerContent}>
                <Text style={styles.bannerIcon}>📅</Text>
                <View style={styles.bannerTextContainer}>
                  <Text style={styles.bannerTitle}>הזמנה עתידית</Text>
                  <Text style={styles.bannerSubtitle}>
                    זמנים נקבעו לפי החיפוש שביצעת ({dayjs(start).format('HH:mm')} - {dayjs(end).format('HH:mm')}) • לא ניתן לעריכה
                  </Text>
                </View>
              </View>
            </View>
          )}
          
          {isImmediate && (
            <View style={styles.immediateBookingBanner}>
              <View style={styles.bannerContent}>
                <Text style={styles.bannerIcon}>⚡</Text>
                <View style={styles.bannerTextContainer}>
                  <Text style={styles.bannerTitle}>הזמנה מיידית</Text>
                  <Text style={styles.bannerSubtitle}>ניתן לבחור זמנים עד סוף היום (מקסימום 12 שעות)</Text>
                </View>
              </View>
            </View>
          )}

          
          {/* גלריית תמונות החניה - בסדר קבוע */}
          {(() => {
            // סידור התמונות לפי סדר קבוע: כניסה, ריקה, עם רכב, נוסף
            const imageTypes = ['entrance', 'empty', 'with_car', 'additional'];
            let orderedImages = imageTypes
              .map(type => spot.images?.find(img => img.type === type))
              .filter(Boolean); // מסנן תמונות שקיימות
            
            // אם אין תמונות במבנה הישן, נשתמש בתמונות מהשרת
            if (orderedImages.length === 0) {
              const serverImages = [];
              if (spot.entranceImageUrl) serverImages.push({ uri: spot.entranceImageUrl, type: 'entrance' });
              if (spot.emptyImageUrl) serverImages.push({ uri: spot.emptyImageUrl, type: 'empty' });
              if (spot.withCarImageUrl) serverImages.push({ uri: spot.withCarImageUrl, type: 'with_car' });
              orderedImages = serverImages;
            }
            
            return orderedImages.length > 0 && (
              <ScrollView 
                horizontal 
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.galleryContainer}
                contentContainerStyle={styles.galleryContent}
              >
                {orderedImages.map((image, index) => {
                  // תיקון URL של התמונות - הוספת base URL אם חסר
                  let imageUri = image.uri;
                  if (imageUri && imageUri.startsWith('/api/')) {
                    imageUri = `${API_BASE}${imageUri}`;
                  }
                  
                  return (
                    <View 
                      key={`${image.type}-${index}`} 
                      style={[styles.gallerySlide, { width: Dimensions.get('window').width - 80 }]}
                    >
                      <Image 
                        source={{ uri: imageUri }} 
                        style={styles.galleryImage}
                        resizeMode="cover"
                        onError={(error) => {
                          console.log('🚨 Gallery Image load error:', error.nativeEvent.error);
                          console.log('🚨 Gallery Image URI:', imageUri);
                        }}
                        onLoad={() => {
                          console.log('✅ Gallery Image loaded successfully:', imageUri);
                        }}
                      />
                    </View>
                  );
                })}
              </ScrollView>
            );
          })()}


          {!!spot.distanceKm && <Text style={styles.line}>מרחק: {Number(spot.distanceKm).toFixed(2)} ק״מ</Text>}
        </View>

        {/* בחירת זמנים – התחלה/סיום (כפתור פותח פאנל גלגלים) */}
        <View style={styles.card}>
          <Text style={styles.section}>בחרו תאריך ושעה</Text>

          {/* הצגת זמינות החניה */}
          {spot?.parkingId && start && (
            <ParkingAvailability 
              parkingId={spot.parkingId}
              startTime={formatForAPI(start)}
              onAvailabilityChange={(data) => setAvailability(data)}
              style={{ marginVertical: 8 }}
            />
          )}

          {/* התחלה */}
          <View style={{ marginTop: 6, alignItems: 'flex-start' }}>
            <View style={styles.rowHeader}>
              <Ionicons name="play" size={14} color={theme.colors.subtext} style={{ marginEnd: 6 }} />
              <Text style={styles.labelStrong}>התחלה</Text>
            </View>
            <View style={styles.fieldsRow}>
              <TouchableOpacity 
                style={[
                  styles.fieldButton,
                  !areTimesEditable && styles.fieldButtonDisabled
                ]} 
                onPress={() => openPanel('start')} 
                activeOpacity={areTimesEditable ? 0.9 : 1}
                disabled={!areTimesEditable}
              >
                <Ionicons name="calendar-outline" size={16} style={styles.fieldIcon} />
                <Text style={[
                  styles.fieldButtonText,
                  !areTimesEditable && styles.fieldButtonTextDisabled
                ]}>
                  {dayjs(start).format('DD/MM/YYYY • HH:mm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* סיום */}
          <View style={{ marginTop: 12, alignItems: 'flex-start' }}>
            <View style={styles.rowHeader}>
              <Ionicons name="square" size={12} color={theme.colors.subtext} style={{ marginEnd: 6 }} />
              <Text style={styles.labelStrong}>סיום</Text>
            </View>
            <View style={styles.fieldsRow}>
              <TouchableOpacity 
                style={[
                  styles.fieldButton,
                  !areTimesEditable && styles.fieldButtonDisabled
                ]} 
                onPress={() => openPanel('end')} 
                activeOpacity={areTimesEditable ? 0.9 : 1}
                disabled={!areTimesEditable}
              >
                <Ionicons name="time-outline" size={16} style={styles.fieldIcon} />
                <Text style={[
                  styles.fieldButtonText,
                  !areTimesEditable && styles.fieldButtonTextDisabled
                ]}>
                  {dayjs(end).format('DD/MM/YYYY • HH:mm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* הודעת שגיאה להזמנה מיידית */}
          {isImmediate && (() => {
            const validation = validateImmediateBooking(start, end);
            if (!validation.isValid) {
              return (
                <View style={styles.immediateValidationError}>
                  <Ionicons name="warning" size={16} color="#EF4444" style={{ marginLeft: 6 }} />
                  <Text style={styles.immediateValidationErrorText}>{validation.error}</Text>
                </View>
              );
            }
            return null;
          })()}

          {/* הודעת עזרה להזמנה עתידית */}
          {isFuture && (
            <View style={styles.futureHelpMessage}>
              <Ionicons name="information-circle" size={16} color="#3B82F6" style={{ marginLeft: 6 }} />
              <Text style={styles.futureHelpMessageText}>
                הזמנים נקבעו לפי החיפוש שביצעת ולא ניתן לשנותם. לשינוי זמנים, בצע חיפוש חדש.
              </Text>
            </View>
          )}

          {/* בדיקת תקינות ההזמנה */}
          {spot?.parkingId && start && end && (
            <BookingValidator 
              parkingId={spot.parkingId}
              startTime={formatForAPI(start)}
              endTime={formatForAPI(end)}
              onValidationChange={(result) => {
                console.log('🔍 Validation result received:', result);
                setValidationResult(result);
              }}
              style={{ marginTop: 12 }}
            />
          )}

          {/* הוסרה תיבת הטווח */}
          <Text style={[styles.hint, { marginTop: theme.spacing.xs }]}>
            מינימום שעה בין התחלה לסיום. החיוב לפי שעות שימוש (עיגול מעלה).
          </Text>
        </View>

        {/* פרטי רכב */}
        <View style={styles.card}>
          <Text style={styles.section}>פרטי רכב</Text>
          
          {/* רכב ברירת מחדל */}
          {selectedVehicleId && vehicles.find(v => v.id === selectedVehicleId) && (
            <View style={styles.defaultVehicleContainer}>
              <Text style={styles.defaultVehicleText}>
                נטען רכב ברירת מחדל מהפרופיל שלך
              </Text>
              {vehicles.length > 1 && (
                <TouchableOpacity 
                  style={styles.changeVehicleBtn}
                  onPress={() => {
                    // כאן נוכל להוסיף modal לבחירת רכב אחר
                    Alert.alert(
                      'בחירת רכב',
                      'בחר רכב אחר מהרשימה:',
                      vehicles.map(v => ({
                        text: `${v.licensePlate} - ${v.description || `${v.make || ''} ${v.model || ''}`.trim() || 'רכב'}`,
                        onPress: () => {
                          setSelectedVehicleId(v.id);
                          setPlate(v.licensePlate || '');
                          
                          // אותה לוגיקה כמו בטעינה הראשונית
                          let vehicleDescription = '';
                          if (v.description && v.description.trim()) {
                            vehicleDescription = v.description.trim();
                          } else {
                            const makeModel = `${v.make || ''} ${v.model || ''}`.trim();
                            if (makeModel) {
                              vehicleDescription = makeModel;
                            }
                          }
                          setCarDesc(vehicleDescription);
                        }
                      })).concat([{ text: 'ביטול', style: 'cancel' }])
                    );
                  }}
                >
                  <Text style={styles.changeVehicleText}>שנה</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={styles.label}>מספר רכב</Text>
          <TextInput
            style={styles.input}
            placeholder="לדוגמה: 12-345-67"
            value={plate}
            onChangeText={setPlate}
            keyboardType="numbers-and-punctuation"
            placeholderTextColor={theme.colors.subtext}
          />

          <Text style={styles.label}>תיאור רכב (לא חובה)</Text>
          <TextInput
            style={styles.input}
            placeholder="לדוגמה: מאזדה 3 לבנה"
            value={carDesc}
            onChangeText={setCarDesc}
            placeholderTextColor={theme.colors.subtext}
          />
        </View>

        {/* סיכום — עכשיו מעל התשלום, כולל כותרת */}
        <View style={styles.summary}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryHeaderIcon}>{getBookingInstructions().icon}</Text>
            <Text style={styles.section}>סיכום {getBookingInstructions().title}</Text>
          </View>

          <View style={styles.summaryDivider} />

          {/* זמן מדויק ומחיר - חישוב proportional */}
          {exactHours > 0 && (
            <View style={styles.summaryItem}>
              <Ionicons name="time-outline" size={16} style={{ marginEnd: 16 }} />
              <Text style={styles.summaryText}>
                זמן מדויק: {exactHours.toFixed(2)} שעות
              </Text>
            </View>
          )}
          
          <View style={styles.summaryItem}>
            <Ionicons name="cash-outline" size={16} style={{ marginEnd: 16 }} />
            <Text style={styles.summaryText}>
              סה״כ לתשלום: ₪{(total || 0).toFixed(2)} 🆕
            </Text>
          </View>

        </View>


        {/* פעולות */}
        <ZpButton
          title={editingId ? 'שמור שינויים' : 'המשך לתשלום'}
          onPress={confirm}
          disabled={!plate.trim() || (validationResult && validationResult.success && !validationResult.valid)}
          style={{ opacity: (!plate.trim() || (validationResult && validationResult.success && !validationResult.valid)) ? 0.6 : 1 }}
          textStyle={{ textAlign: 'left' }}
        />

        <View style={{ height: theme.spacing.lg }} />
      </ScrollView>

      {/* פאנל גלגלים */}
      <TimePickerWheel
        visible={panelVisible}
        initial={panelMode === 'start' ? start : end}
        minimumDate={panelMode === 'start' ? (() => {
          // עבור זמן התחלה בהזמנה מיידית - מינימום עכשיו
          if (isImmediate) {
            const now = new Date();
            console.log('⚡ Setting minimum date for immediate booking:', now.toISOString());
            return now;
          }
          return new Date();
        })() : new Date(start.getTime() + MIN_MS)}
        maximumDate={isImmediate ? (() => {
                  const now = new Date();
                  // 🔧 תוקן: משתמש בפונקציית העזר החדשה במקום המרה ידנית
                  const endOfToday = setTimeInIsrael(now, 23, 45);
                  
                  if (panelMode === 'start') {
                    // הגבלת זמן התחלה ל-15 דקות קדימה בלבד - בדיוק כמו בTimePickerWheel
                    const maxStartTime = new Date(now.getTime() + (15 * 60 * 1000)); // +15 דקות
                    
                    // בדוק אם באמת צריך יום הבא (אותה לוגיקה כמו בTimePickerWheel)
                    // 🔧 תוקן: משתמש בפונקציית העזר החדשה במקום המרה ידנית
                    const realEndOfToday = setTimeInIsrael(now, 23, 59);
                    
                    console.log('🔍 BookingScreen maximumDate check:', {
                      now: now.toISOString(),
                      maxStartTime: maxStartTime.toISOString(),
                      realEndOfToday: realEndOfToday.toISOString(),
                      needsNextDay: maxStartTime > realEndOfToday
                    });
                    
                    if (maxStartTime > realEndOfToday) {
                      // רק אם באמת חורג - אפשר עד הזמן המקסימלי (אבל לא יותר מ-01:00 למחרת)
                      // 🔧 תוקן: משתמש בפונקציית העזר החדשה במקום המרה ידנית
                      const nextDay = new Date(realEndOfToday.getTime() + (24 * 60 * 60 * 1000));
                      const nextDayLimit = setTimeInIsrael(nextDay, 1, 0); // עד 01:00 למחרת
                      console.log('⚡ Allowing next day until:', nextDayLimit.toISOString());
                      return maxStartTime < nextDayLimit ? maxStartTime : nextDayLimit;
                    } else {
                      // לא צריך יום הבא - הגבל לסוף היום הנוכחי
                      console.log('⚡ Limiting to today only');
                      return maxStartTime;
                    }
                  } else {
                    // מקסימום 12 שעות מההתחלה או עד סוף היום
                    // 🔧 תוקן: משתמש בפונקציית העזר החדשה במקום המרה ידנית
                    const maxFromStart = addHoursInIsrael(start, 12);
                    return maxFromStart < endOfToday ? maxFromStart : endOfToday;
                  }
                })() : null}
        bookingType={bookingType}
        title={panelMode === 'start' ? 'בחרו זמן התחלה' : 'בחרו זמן סיום'}
        onClose={() => setPanelVisible(false)}
        onConfirm={handlePanelConfirm}
      />
    </KeyboardAvoidingView>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  const textBase = { textAlign: 'left', writingDirection: 'rtl', color: colors.text };
  return StyleSheet.create({
    container:{ padding: spacing.lg, backgroundColor: colors.bg, direction:'rtl' },
    center:{ flex:1, justifyContent:'center', alignItems:'center', backgroundColor: colors.bg, direction:'rtl' },
    centerText:{ ...textBase, marginBottom: spacing.md },

    // (הכותרת הראשית הוסרה מה־UI; נשארת למקרה עתידי)
    header:{ color: colors.text, fontSize:22, fontWeight:'800', marginBottom: spacing.md, textAlign:'center', writingDirection:'rtl' },

    // Card בסיסי
    card:{
      backgroundColor: colors.surface,
      borderRadius: borderRadii.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
      shadowColor:'#000', shadowOpacity:0.06, shadowRadius:12, shadowOffset:{ width:0, height:6 }, elevation:2,
      borderWidth:1, borderColor: colors.border,
      direction:'rtl'
    },

    // טקסטים שמאלה - מותאם למסך התשלום
    section:{ 
      ...textBase, 
      fontSize: 22,        // גדול יותר כמו במסך התשלום
      fontWeight: '800', 
      marginBottom: 20,    // מרווח גדול יותר
      textAlign: 'center', // במרכז כמו במסך התשלום
      letterSpacing: 0.5,  // ריווח בין אותיות
      color: colors.text,  // שחור
    },
    title:{ ...textBase, textAlign:'center', fontSize:18, fontWeight:'800', marginBottom:6 },
    line:{ ...textBase, fontSize:15, marginVertical:2 },
    hint:{ textAlign:'left', writingDirection:'rtl', color: colors.subtext, fontSize:12 },

    // Inputs
    label:{ textAlign:'left', writingDirection:'rtl', fontSize:13, color: colors.subtext, marginTop:6, marginBottom:6 },
    labelStrong:{ ...textBase, fontSize:14, fontWeight:'800' },
    input:{
      height:48, borderRadius: borderRadii.sm,
      borderWidth:1, borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal:12, fontSize:15, marginBottom:8,
      color: colors.text, textAlign:'left', writingDirection:'rtl'
    },

    // אזור בחירת זמן — שמאלה
    rowHeader:{ flexDirection:'row', alignItems:'center', marginBottom: 4 },
    fieldsRow:{ flexDirection:'row', gap: 8, marginTop: 6 },
    fieldButton:{
      flex:1,
      height:48,
      borderRadius: borderRadii.sm,
      borderWidth:1,
      borderColor: colors.border,
      backgroundColor:'#F7F9FF',
      alignItems:'flex-start',
      justifyContent:'center',
      paddingHorizontal:12
    },
    fieldButtonText:{ ...textBase, fontSize:16, fontWeight:'800' },
    fieldIcon:{ position:'absolute', right:12, color: colors.subtext },

    // Summary — מותאם למסך התשלום
    summary:{
      backgroundColor: colors.surface, // רקע אחיד כמו במסך התשלום
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 16, // עגול יותר כמו במסך התשלום
      padding: 20, // padding אחיד
      marginTop: 4,
      marginBottom: spacing.md,
      shadowColor:'#000', shadowOpacity:0.04, shadowRadius:10, shadowOffset:{ width:0, height:4 }, elevation:1,
    },
    summaryDivider:{
      height:1, backgroundColor:'#E6ECF5', marginVertical:8, alignSelf:'stretch'
    },
    summaryItem:{ 
      flexDirection:'row', 
      alignItems:'center', 
      marginBottom: 12, // מרווח גדול יותר
      paddingVertical: 8, // padding אנכי
    },
    summaryText:{ 
      ...textBase, 
      fontSize: 16, 
      fontWeight: '600', // קצת פחות עבה
      textAlign: 'left', // יישור לשמאל כמו במסך התשלום
    },

    // Active badge
    activeBadge:{
      marginTop:6, alignSelf:'flex-start',
      backgroundColor:'#e8fff2', borderColor:'#b9f5cf', borderWidth:1,
      borderRadius: 999, paddingHorizontal:10, paddingVertical:6, flexDirection:'row-reverse', alignItems:'center'
    },
    activeText:{ color: colors.success, fontWeight:'800', textAlign:'right', writingDirection:'rtl' },

    // Images
    heroImg:{ width: 240, height: 150, borderRadius: borderRadii.sm, marginStart:8, backgroundColor: colors.bg },

    // ===== Styles לפאנל =====
    modalBackdrop:{ flex:1, backgroundColor:'rgba(0,0,0,0.45)', justifyContent:'flex-end' },
    modalSheet:{
      backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
      overflow:'hidden', borderColor: colors.border, borderTopWidth: 1,
      shadowColor:'#000', shadowOpacity:0.12, shadowRadius:16, shadowOffset:{ width:0, height:-6 }, elevation:10
    },
    modalHeaderGrad:{ paddingTop: 10, paddingBottom: 14, paddingHorizontal: spacing.lg },
    dragHandle:{ alignSelf:'center', width: 42, height: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.75)', marginBottom: 8 },
    modalTitle:{ textAlign:'right', color:'#fff', fontSize:16, fontWeight:'800' },
    modalSubtitle:{ textAlign:'right', color:'rgba(255,255,255,0.9)', fontSize:12, marginTop: 4 },

    dayRow:{
      flexDirection:'row-reverse', alignItems:'center', justifyContent:'space-between',
      paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
      backgroundColor:'#F6F8FF', borderTopWidth:1, borderBottomWidth:1, borderColor:'#E2E8F0'
    },
    arrowBtn:{
      width:44, height:44, borderRadius:12, alignItems:'center', justifyContent:'center',
      backgroundColor:'#FFFFFF', borderWidth:1, borderColor:'#E2E8F0'
    },

    hmWrapWheels:{
      flexDirection:'row-reverse', justifyContent:'space-between',
      paddingHorizontal: spacing.lg, paddingVertical: spacing.lg, backgroundColor:'#FFFFFF'
    },
    hmColWheel:{ flex:1, alignItems:'center' },
    hmLabel:{ color: colors.subtext, fontSize:13, fontWeight:'700', marginBottom: 6 },

    modalFooter:{
      paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing.sm,
      flexDirection: 'row-reverse', backgroundColor:'#FFFFFF'
    },
    modalBtn:{ flex:1, height:48, borderRadius: 12, alignItems:'center', justifyContent:'center', borderWidth:1 },
    modalBtnGhost:{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' },
    modalBtnGhostText:{ color: colors.text, fontWeight:'800' },
    modalBtnPrimary:{ backgroundColor: colors.primary, borderColor: colors.primary },
    modalBtnPrimaryText:{ color:'#fff', fontWeight:'800' },
    
    // סטיילים לרכב ברירת מחדל
    defaultVehicleInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.success + '15',
      borderColor: colors.success + '40',
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    defaultVehicleText: {
      color: colors.success,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'right',
      writingDirection: 'rtl',
      flex: 1,
    },
    changeVehicleBtn: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      marginStart: 8,
    },
    changeVehicleText: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
    },
    
    // סטיילים לזמינות החניה
    availabilityContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(139, 92, 246, 0.1)', // סגול בהיר
      borderColor: 'rgba(139, 92, 246, 0.3)', // סגול כהה יותר
      borderWidth: 1,
      borderRadius: 8,
      padding: 10,
      marginTop: 8,
      marginBottom: 4,
    },
    availabilityText: {
      color: '#8B5CF6', // סגול
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
      writingDirection: 'rtl',
    },
    availabilityLoading: {
      color: colors.subtext,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
      writingDirection: 'rtl',
    },
    unavailableText: {
      color: colors.error,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
      writingDirection: 'rtl',
    },

    // גלריית תמונות החניה
    galleryContainer: {
      marginTop: 12,
      marginBottom: 16,
      height: 200, // גובה קבוע לגלריה
    },
    galleryContent: {
      flexDirection: 'row-reverse', // RTL
      paddingRight: 16, // מקום לרמיזה של התמונה הבאה
    },
    gallerySlide: {
      width: '100%', // רוחב מלא
      paddingHorizontal: 8,
      justifyContent: 'center',
      marginLeft: 0, // רווח בין תמונות
    },
    galleryImage: {
      width: '100%',
      height: 240, // הגדלה מ-180 ל-240 פיקסלים
      borderRadius: 10,
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },

    // באנרי סוג הזמנה
    immediateBookingBanner: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderColor: '#10B981',
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
      marginBottom: 8,
    },
    futureBookingBanner: {
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: '#3B82F6',
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      marginTop: 12,
      marginBottom: 8,
    },
    bannerContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    bannerIcon: {
      fontSize: 18,
      marginLeft: 8,
    },
    bannerTextContainer: {
      flex: 1,
    },
    bannerTitle: {
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'right',
      writingDirection: 'rtl',
      color: colors.text,
    },
    bannerSubtitle: {
      fontSize: 12,
      textAlign: 'right',
      writingDirection: 'rtl',
      color: colors.subtext,
      marginTop: 2,
    },

    // כפתורי זמן מבוטלים (הזמנה עתידית)
    fieldButtonDisabled: {
      opacity: 0.6,
      backgroundColor: '#f5f5f5',
    },
    fieldButtonTextDisabled: {
      color: '#999',
    },

    // הודעת שגיאה להזמנה מיידית
    immediateValidationError: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderColor: '#EF4444',
      borderWidth: 1,
      borderRadius: 6,
      padding: 8,
      marginTop: 8,
    },
    immediateValidationErrorText: {
      fontSize: 12,
      color: '#EF4444',
      textAlign: 'right',
      writingDirection: 'rtl',
      flex: 1,
    },

    // הודעת עזרה להזמנה עתידית
    futureHelpMessage: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: '#3B82F6',
      borderWidth: 1,
      borderRadius: 6,
      padding: 8,
      marginTop: 8,
    },
    futureHelpMessageText: {
      fontSize: 12,
      color: '#3B82F6',
      textAlign: 'right',
      writingDirection: 'rtl',
      flex: 1,
    },


    // כותרת סיכום
    summaryHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    summaryHeaderIcon: {
      fontSize: 18,
      marginLeft: 8,
    },
  });
}
