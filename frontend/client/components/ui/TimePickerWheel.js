// components/ui/TimePickerWheel.js - רכיב בחירת זמן אחיד עם הגבלת 15 דקות
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@shopify/restyle';
import { getIsraelMinutesFromDate, getIsraelHourFromDate, setTimeInIsrael, addHoursInIsrael } from '../../utils/timezone';
import dayjs from 'dayjs';
import 'dayjs/locale/he';

dayjs.locale('he');

// ===== WheelPicker כללי עם Snap =====
const ITEM_H = 40;
function WheelPicker({
  data, value, onChange, height = ITEM_H * 5, style, textStyle,
}) {
  const listRef = useRef(null);
  const selectedIndex = Math.max(0, data.findIndex(d => d.value === value));
  const [isUserScrolling, setIsUserScrolling] = useState(false); // מעקב אחר גלילה ידנית

  useEffect(() => {
    if (listRef.current && data.length > 0 && !isUserScrolling) {
      const targetIndex = Math.max(0, data.findIndex(d => d.value === value));
      listRef.current.scrollToIndex({ index: targetIndex, animated: false });
    }
  }, [value, data, isUserScrolling]);

  const onScrollEnd = (event) => {
    const y = event.nativeEvent.contentOffset.y;
    const index = Math.round(y / ITEM_H);
    const clampedIndex = Math.max(0, Math.min(index, data.length - 1));
    if (data[clampedIndex] && onChange) {
      onChange(data[clampedIndex].value);
    }
  };

  const renderItem = ({ item, index }) => {
    const isSelected = item.value === value;
    return (
      <View style={[{ height: ITEM_H, justifyContent: 'center', alignItems: 'center' }]}>
        <Text
          style={[
            { fontSize: 18, textAlign: 'center' },
            isSelected ? { fontWeight: 'bold', color: '#0B6AA8' } : { color: '#666' },
            textStyle,
            item.label?.startsWith('· ') && { opacity: 0.4 },
          ]}
        >
          {item.label}
        </Text>
      </View>
    );
  };

  return (
    <View style={[{ height, overflow: 'hidden' }, style]}>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item, index) => `${item.value}-${index}`}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onScrollBeginDrag={() => setIsUserScrolling(true)} // המשתמש התחיל לגלול
        onMomentumScrollEnd={(event) => {
          setIsUserScrolling(false); // המשתמש סיים לגלול
          onScrollEnd(event);
        }}
        getItemLayout={(_, index) => ({ length: ITEM_H, offset: ITEM_H * index, index })}
        contentContainerStyle={{ paddingTop: (height - ITEM_H) / 2, paddingBottom: (height - ITEM_H) / 2 }}
      />
    </View>
  );
}

// ===== עזר לפאנל ===== 
// 🔧 תוקן: משתמש במערכת השעות החדשה במקום המרות ידניות
const roundTo15Minutes = (d) => { 
  const x = new Date(d); 
  const minutes = getIsraelMinutesFromDate(x); // שימוש בפונקציית העזר החדשה
  
  // עיגול קדימה ל-15 דקות הקרובות
  // אם השעה 10:06 -> 10:15, אם 10:15 -> 10:15, אם 10:16 -> 10:30
  const roundedMinutes = Math.ceil(minutes / 15) * 15;
  
  if (roundedMinutes >= 60) {
    // במקום setHours ישירות, נשתמש בפונקציות העזר החדשות
    const currentHour = getIsraelHourFromDate(x);
    return setTimeInIsrael(x, currentHour + 1, 0);
  } else {
    const currentHour = getIsraelHourFromDate(x);
    return setTimeInIsrael(x, currentHour, roundedMinutes);
  }
};

const clampToMin = (date, min) => (!min || date >= min) ? date : new Date(min);

const daysArray = (baseMin, span = 180) => {
  const out = [];
  const startDay = baseMin ? new Date(baseMin) : new Date();
  // 🔧 תוקן: משתמש בפונקציית העזר החדשה במקום המרה ידנית
  const startDayMidnight = setTimeInIsrael(startDay, 0, 0);
  for (let i=0; i<=span; i++){
    // 🔧 תוקן: משתמש בפונקציית העזר החדשה במקום המרה ידנית
    const d = new Date(startDayMidnight.getTime() + (i * 24 * 60 * 60 * 1000));
    out.push({ value: d.getTime(), label: dayjs(d).format('DD/MM ddd') });
  }
  return out;
};

const hoursArray = () => Array.from({ length: 24 }, (_, h) => ({ 
  value: h, 
  label: String(h).padStart(2,'0') 
}));

const minutesArray = () => [
  { value: 0, label: '00' },
  { value: 15, label: '15' },
  { value: 30, label: '30' },
  { value: 45, label: '45' }
];

// ===== הפאנל התחתון לבחירת תאריך/שעה =====
function WheelsDateTimePanel({ 
  visible, 
  initial, 
  onClose, 
  onConfirm, 
  minimumDate, 
  maximumDate,
  bookingType,
  title = 'בחרו תאריך ושעה' 
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  const gradStart = theme.colors?.gradientStart ?? theme.colors.primary;
  const gradEnd = theme.colors?.gradientEnd ?? theme.colors.primary;

  const min = minimumDate ? roundTo15Minutes(new Date(minimumDate)) : null;
  const max = maximumDate ? roundTo15Minutes(new Date(maximumDate)) : null;
  
  // פונקציה לחיתוך זמן בין min ו-max
  const clampToRange = (date, minDate, maxDate) => {
    let result = new Date(date);
    if (minDate && result < minDate) result = new Date(minDate);
    if (maxDate && result > maxDate) result = new Date(maxDate);
    // וודא שהתוצאה מעוגלת לרבע שעה
    return roundTo15Minutes(result);
  };
  
  const init = clampToRange(roundTo15Minutes(initial), min, max);

  // 🔧 תוקן: משתמש בפונקציות העזר החדשות במקום המרות ידניות
  const [selDay, setSelDay] = useState(setTimeInIsrael(init, 0, 0).getTime());
  const [selHour, setSelHour] = useState(getIsraelHourFromDate(init));
  const [selMin, setSelMin] = useState(getIsraelMinutesFromDate(init));
  const [hasUserInteracted, setHasUserInteracted] = useState(false); // מעקב אחר אינטראקציות משתמש

  useEffect(() => {
    // אתחל רק כשהפאנל נפתח ולא כשיש שינויים ב-initial
    if (!visible) {
      setHasUserInteracted(false); // איפוס כשסוגרים את הפאנל
      return;
    }
    
    // אתחל רק אם המשתמש עוד לא התחיל לערוך
    if (!hasUserInteracted) {
      const i = clampToRange(roundTo15Minutes(initial), min, max);
      // 🔧 תוקן: משתמש בפונקציות העזר החדשות במקום המרות ידניות
      const d0 = setTimeInIsrael(i, 0, 0);
      setSelDay(d0.getTime());
      setSelHour(getIsraelHourFromDate(i));
      setSelMin(getIsraelMinutesFromDate(i));
    }
  }, [visible, minimumDate, maximumDate]); // הוסר initial מה-dependencies

  const isMinDay = !!min && new Date(selDay).getTime() === new Date(min.getFullYear(),min.getMonth(),min.getDate(),0,0,0,0).getTime();
  const isMaxDay = !!max && new Date(selDay).getTime() === new Date(max.getFullYear(),max.getMonth(),max.getDate(),0,0,0,0).getTime();
  
  // 🔧 תוקן: משתמש בפונקציות העזר החדשות במקום המרות ידניות
  const minHour = isMinDay ? getIsraelHourFromDate(min) : 0;
  const maxHour = isMaxDay ? getIsraelHourFromDate(max) : 23;
  const minMin = (isMinDay && selHour === minHour) ? getIsraelMinutesFromDate(min) : 0;
  const maxMin = (isMaxDay && selHour === maxHour) ? getIsraelMinutesFromDate(max) : 45;

  // הגבלת ימים לפי סוג הזמנה - מתוקן
  const maxDays = useMemo(() => {
    // אם זה הזמנה מיידית (יש maximumDate קרוב)
    if (maximumDate) {
      const now = new Date();
      const maxTime = new Date(maximumDate);
      const diffHours = (maxTime - now) / (1000 * 60 * 60);
      
      console.log('🔍 TimePickerWheel maxDays calculation:', {
        now: now.toISOString(),
        maxTime: maxTime.toISOString(),
        diffHours,
        isImmediate: diffHours <= 24
      });
      
      if (diffHours <= 24) {
        // הזמנה מיידית - רק היום הנוכחי (1 יום)
        return 1;
      }
    }
    
    // הזמנה עתידית - שבוע וחצי (10 יום)
    return 10;
  }, [maximumDate]);
  
  const dayData = daysArray(min, maxDays);
  const hourData = hoursArray().map(it => ({
    ...it, label: (isMinDay && it.value < minHour) ? `· ${String(it.value).padStart(2,'0')}` : 
                  (isMaxDay && it.value > maxHour) ? `· ${String(it.value).padStart(2,'0')}` : it.label
  }));
  const minuteData = minutesArray().map(it => ({
    ...it, label: (isMinDay && selHour === minHour && it.value < minMin) ? `· ${String(it.value).padStart(2,'0')}` : 
                  (isMaxDay && selHour === maxHour && it.value > maxMin) ? `· ${String(it.value).padStart(2,'0')}` : it.label
  }));

  // חיצים + החלקה ימ/שמ לשינוי יום
  const swipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 14 && Math.abs(g.dy) < 10,
      onPanResponderRelease: (_, g) => {
        const i = dayData.findIndex(d => d.value === selDay);
        if (g.dx > 30 && i > 0) setSelDay(dayData[i - 1].value);
        else if (g.dx < -30 && i < dayData.length - 1) setSelDay(dayData[i + 1].value);
      },
    })
  ).current;

  const compose = () => {
    // 🔧 תוקן: משתמש בפונקציות העזר החדשות במקום המרות ידניות
    let dt = setTimeInIsrael(new Date(selDay), selHour, selMin);
    dt = roundTo15Minutes(dt);
    dt = clampToMin(dt, min);
    return dt;
  };

  const headerStr = dayjs(compose()).format('dddd • DD/MM/YYYY • HH:mm');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <LinearGradient 
            colors={[gradStart, gradEnd]} 
            start={{ x:0,y:1 }} 
            end={{ x:1,y:0 }} 
            style={styles.modalHeaderGrad}
          >
            <View style={styles.dragHandle} />
            <Text style={styles.modalTitle}>{title}</Text>
            <Text style={styles.modalSubtitle}>{headerStr}</Text>
          </LinearGradient>

          <View style={styles.dayRow} {...swipeResponder.panHandlers}>
            {/* ימני = יום קודם */}
            <TouchableOpacity
              onPress={() => {
                setHasUserInteracted(true); // סמן שהמשתמש התחיל לערוך
                const i = dayData.findIndex(d => d.value === selDay);
                if (i > 0) setSelDay(dayData[i - 1].value);
              }}
              style={styles.arrowBtn}
              activeOpacity={0.9}
            >
              <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
            </TouchableOpacity>

            <View style={{ flex:1, alignItems:'center' }}>
              <WheelPicker
                data={dayData}
                value={selDay}
                onChange={(val) => {
                  setHasUserInteracted(true); // סמן שהמשתמש התחיל לערוך
                  setSelDay(val);
                  if (isMinDay && selHour < minHour) setSelHour(minHour);
                  if (isMinDay && selHour === minHour && selMin < minMin) setSelMin(minMin);
                }}
                height={ITEM_H * 5}
              />
            </View>

            {/* שמאלי = יום הבא */}
            <TouchableOpacity
              onPress={() => {
                setHasUserInteracted(true); // סמן שהמשתמש התחיל לערוך
                const i = dayData.findIndex(d => d.value === selDay);
                if (i < dayData.length - 1) setSelDay(dayData[i + 1].value);
              }}
              style={styles.arrowBtn}
              activeOpacity={0.9}
            >
              <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.hmWrapWheels}>
            <View style={styles.hmColWheel}>
              <Text style={styles.hmLabel}>דקות</Text>
              <WheelPicker
                data={minuteData}
                value={Math.max(selMin, (isMinDay && selHour === minHour) ? minMin : 0)}
                onChange={(m) => {
                  setHasUserInteracted(true); // סמן שהמשתמש התחיל לערוך
                  if (isMinDay && selHour === minHour && m < minMin) m = minMin;
                  setSelMin(m);
                }}
              />
            </View>

            <View style={styles.hmColWheel}>
              <Text style={styles.hmLabel}>שעה</Text>
              <WheelPicker
                data={hourData}
                value={Math.max(selHour, minHour)}
                onChange={(h) => {
                  setHasUserInteracted(true); // סמן שהמשתמש התחיל לערוך
                  if (isMinDay && h < minHour) h = minHour;
                  setSelHour(h);
                  if (isMinDay && h === minHour && selMin < minMin) setSelMin(minMin);
                }}
              />
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              onPress={onClose} 
              style={[styles.modalBtn, styles.modalBtnGhost, { marginStart: 8 }]} 
              activeOpacity={0.9}
            >
              <Text style={styles.modalBtnGhostText}>ביטול</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => onConfirm(compose())} 
              style={[styles.modalBtn, styles.modalBtnPrimary]} 
              activeOpacity={0.9}
            >
              <Text style={styles.modalBtnPrimaryText}>אישור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    maxHeight: '85%',
  },
  modalHeaderGrad: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: 'center',
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 2,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  arrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors?.surface || '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hmWrapWheels: {
    flexDirection: 'row',
    paddingHorizontal: 40,
    gap: 20,
  },
  hmColWheel: {
    flex: 1,
    alignItems: 'center',
  },
  hmLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors?.text || '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnPrimary: {
    backgroundColor: theme.colors?.primary || '#0B6AA8',
  },
  modalBtnPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  modalBtnGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors?.border || '#E5E7EB',
  },
  modalBtnGhostText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors?.text || '#333',
  },
});

export default WheelsDateTimePanel;
export { roundTo15Minutes };
