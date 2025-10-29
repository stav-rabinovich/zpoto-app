// components/AvailabilityEditor.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Animated, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  HEB_DAYS, 
  TIME_BLOCKS, 
  defaultAlwaysAvailable, 
  defaultWeekdayPreset, 
  setAllDays,
  getActiveBlocksForDay,
  setDayBlocks,
  migrateToBlockFormat,
  isBlockAvailable
} from '../../utils/availability';

export default function AvailabilityEditor({ value, onChange }) {
  // מיגרציה אוטומטית מפורמט ישן לחדש
  const avail = migrateToBlockFormat(value ?? defaultAlwaysAvailable());
  
  // state לטיפול באנימציות ו-tooltips
  const [showTooltip, setShowTooltip] = useState(null);
  const [animatedValues] = useState(
    HEB_DAYS.reduce((acc, day) => {
      const activeBlocks = getActiveBlocksForDay(avail, day.key);
      acc[day.key] = new Animated.Value(activeBlocks.length > 0 ? 1 : 0);
      return acc;
    }, {})
  );

  const applyPreset = (preset) => onChange(preset);
  const setModeWeekly = () => onChange({ ...(avail || defaultWeekdayPreset()), mode: 'weekly' });

  // מעדכן בלוק ספציפי ביום ספציפי
  const toggleDayBlock = (dayKey, blockKey) => {
    const currentBlocks = getActiveBlocksForDay(avail, dayKey);
    const newBlocks = currentBlocks.includes(blockKey) 
      ? currentBlocks.filter(b => b !== blockKey)  // הסרת בלוק
      : [...currentBlocks, blockKey];              // הוספת בלוק
    
    onChange(setDayBlocks(avail, dayKey, newBlocks));
  };

  // כיבוי/הפעלת יום שלם עם אנימציה
  const toggleDay = (dayKey, enabled) => {
    // אנימציה לפתיחה/סגירה של בלוקי זמן
    Animated.timing(animatedValues[dayKey], {
      toValue: enabled ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();

    if (enabled) {
      // הפעלת כל הבלוקים ביום
      onChange(setDayBlocks(avail, dayKey, TIME_BLOCKS.map(b => b.key)));
    } else {
      // כיבוי כל הבלוקים ביום
      onChange(setDayBlocks(avail, dayKey, []));
    }
  };

  // הצגת tooltip עם הסבר
  const showBlockTooltip = (blockKey) => {
    const block = TIME_BLOCKS.find(b => b.key === blockKey);
    Alert.alert(
      'בלוק זמן',
      `בלוק זמן ${block.label}\n\nלחץ לעבור בין זמין/לא זמין\n\nכל בלוק מכסה 4 שעות רצופות`,
      [{ text: 'הבנתי', style: 'default' }]
    );
  };

  const updateAll = (enabled, from='00:00', to='23:59') => {
    onChange(setAllDays(avail, enabled, from, to));
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.section}>זמינות</Text>

      <View style={styles.rowBtns}>
        <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset(defaultAlwaysAvailable())}>
          <Ionicons name="infinite" size={16} color="#0b6aa8" style={{ marginEnd:6 }} />
          <Text style={styles.presetText}>זמין תמיד</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetBtn} onPress={() => applyPreset(defaultWeekdayPreset())}>
          <Ionicons name="calendar" size={16} color="#0b6aa8" style={{ marginEnd:6 }} />
          <Text style={styles.presetText}>ימי חול 08–20</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetBtn} onPress={() => updateAll(false)}>
          <Ionicons name="close-circle" size={16} color="#0b6aa8" style={{ marginEnd:6 }} />
          <Text style={styles.presetText}>סגור הכל</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.presetBtn} onPress={setModeWeekly}>
          <Ionicons name="options" size={16} color="#0b6aa8" style={{ marginEnd:6 }} />
          <Text style={styles.presetText}>מצב שבועי</Text>
        </TouchableOpacity>
      </View>

      {avail.mode === 'always' ? (
        <View style={styles.note}>
          <Text style={styles.noteText}>החניה מוגדרת כזמינה תמיד (24/7). ניתן לעבור ל״מצב שבועי״ כדי לקבוע שעות פתיחה לכל יום.</Text>
        </View>
      ) : (
        <View style={{ marginTop:6 }}>
          {HEB_DAYS.map(d => {
            const activeBlocks = getActiveBlocksForDay(avail, d.key);
            const isDayEnabled = activeBlocks.length > 0;
            
            return (
              <View key={d.key} style={styles.dayRow}>
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                  <Text style={styles.dayTitle}>יום {d.label}</Text>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <Text style={styles.switchLbl}>{isDayEnabled ? 'פתוח' : 'סגור'}</Text>
                    <Switch value={isDayEnabled} onValueChange={(v) => toggleDay(d.key, v)} />
                  </View>
                </View>

                {isDayEnabled && (
                  <Animated.View 
                    style={[
                      styles.blocksContainer,
                      {
                        opacity: animatedValues[d.key],
                        transform: [{
                          scaleY: animatedValues[d.key]
                        }]
                      }
                    ]}
                  >
                    <View style={styles.blocksTitleRow}>
                      <Text style={styles.blocksTitle}>בחר בלוקי זמן (4 שעות כל בלוק):</Text>
                      <TouchableOpacity 
                        onPress={() => Alert.alert(
                          'עזרה - בלוקי זמן',
                          'כל בלוק מכסה 4 שעות רצופות.\n\nניתן לבחור מספר בלוקים לכל יום.\n\nלחץ על בלוק כדי להפעיל/כבות אותו.\n\nירוק = זמין, לבן = לא זמין',
                          [{ text: 'הבנתי', style: 'default' }]
                        )}
                        style={styles.helpButton}
                      >
                        <Ionicons name="help-circle-outline" size={18} color="#0b6aa8" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.blocksGrid}>
                      {TIME_BLOCKS.map(block => {
                        const isActive = activeBlocks.includes(block.key);
                        return (
                          <TouchableOpacity
                            key={block.key}
                            style={[styles.blockButton, isActive && styles.blockButtonActive]}
                            onPress={() => toggleDayBlock(d.key, block.key)}
                            onLongPress={() => showBlockTooltip(block.key)}
                            activeOpacity={0.7}
                          >
                            <Text style={[styles.blockText, isActive && styles.blockTextActive]}>
                              {block.label}
                            </Text>
                            {isActive && (
                              <Ionicons 
                                name="checkmark-circle" 
                                size={14} 
                                color="#0b6aa8" 
                                style={styles.blockCheckmark}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <Text style={styles.blocksHint}>
                      💡 טיפ: לחץ ארוך על בלוק לעזרה נוספת
                    </Text>
                  </Animated.View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:{},
  section:{ fontSize:16, fontWeight:'800', marginBottom:10 },
  rowBtns:{ flexDirection:'row', flexWrap:'wrap', gap:8 },
  presetBtn:{ flexDirection:'row', alignItems:'center', paddingVertical:8, paddingHorizontal:10, borderRadius:10, borderWidth:1, borderColor:'#cfe3ff', backgroundColor:'#eaf4ff' },
  presetText:{ color:'#0b6aa8', fontWeight:'800' },

  note:{ marginTop:8, backgroundColor:'#eef8ff', borderColor:'#d6ecff', borderWidth:1, borderRadius:10, padding:10 },
  noteText:{ color:'#0b6aa8' },

  dayRow:{ marginTop:10, borderTopWidth:1, borderTopColor:'#eef3f8', paddingTop:10 },
  dayTitle:{ fontWeight:'800', color:'#0b6aa8' },
  switchLbl:{ color:'#555' },

  // סטיילים חדשים לבלוקי זמן עם אנימציות
  blocksContainer:{ 
    marginTop:12,
    overflow:'hidden' // לאנימציות
  },
  blocksTitleRow:{ 
    flexDirection:'row', 
    alignItems:'center', 
    justifyContent:'space-between',
    marginBottom:8
  },
  blocksTitle:{ 
    fontSize:14, 
    color:'#0b6aa8', 
    fontWeight:'600'
  },
  helpButton:{ 
    padding:4,
    borderRadius:12,
    backgroundColor:'#f0f7ff'
  },
  blocksGrid:{ 
    flexDirection:'row', 
    flexWrap:'wrap', 
    gap:8 
  },
  blockButton:{ 
    paddingVertical:10, 
    paddingHorizontal:12, 
    borderRadius:8, 
    borderWidth:1.5, 
    borderColor:'#e3e9f0', 
    backgroundColor:'#fff',
    minWidth:95,
    alignItems:'center',
    shadowColor:'#000',
    shadowOffset:{ width:0, height:1 },
    shadowOpacity:0.1,
    shadowRadius:2,
    elevation:1,
    position:'relative'
  },
  blockButtonActive:{ 
    borderColor:'#0b6aa8', 
    backgroundColor:'#eaf4ff',
    shadowColor:'#0b6aa8',
    shadowOpacity:0.2,
    elevation:3
  },
  blockText:{ 
    fontSize:11, 
    color:'#666', 
    fontWeight:'600',
    textAlign:'center',
    marginBottom:2
  },
  blockTextActive:{ 
    color:'#0b6aa8',
    fontWeight:'700'
  },
  blockCheckmark:{
    position:'absolute',
    top:2,
    right:2
  },
  blocksHint:{
    fontSize:11,
    color:'#888',
    fontStyle:'italic',
    textAlign:'center',
    marginTop:8
  },
});
