// components/AvailabilityEditor.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { HEB_DAYS, isValidHHmm, defaultAlwaysAvailable, defaultWeekdayPreset, setAllDays } from '../utils/availability';

export default function AvailabilityEditor({ value, onChange }) {
  const avail = value ?? defaultAlwaysAvailable();

  const applyPreset = (preset) => onChange(preset);
  const setModeWeekly = () => onChange({ ...(value || defaultWeekdayPreset()), mode: 'weekly' });

  const updateDay = (key, patch) => {
    const next = {
      ...avail,
      mode: 'weekly',
      weekly: { ...(avail.weekly || {}) },
    };
    next.weekly[key] = { ...(next.weekly[key] || { enabled:false, from:'08:00', to:'20:00' }), ...patch };
    onChange(next);
  };

  const updateAll = (enabled, from='00:00', to='23:59') => {
    onChange(setAllDays(avail, enabled, from, to));
  };

  const inputBorder = (ok) => ({ borderColor: ok ? '#e3e9f0' : '#ffb4b4', backgroundColor: ok ? '#fff' : '#fff6f6' });

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
            const rule = avail.weekly?.[d.key] || { enabled:false, from:'08:00', to:'20:00' };
            const validFrom = isValidHHmm(rule.from);
            const validTo   = isValidHHmm(rule.to);
            return (
              <View key={d.key} style={styles.dayRow}>
                <View style={{ flexDirection:'row', alignItems:'center', justifyContent:'space-between' }}>
                  <Text style={styles.dayTitle}>יום {d.label}</Text>
                  <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                    <Text style={styles.switchLbl}>{rule.enabled ? 'פתוח' : 'סגור'}</Text>
                    <Switch value={!!rule.enabled} onValueChange={(v) => updateDay(d.key, { enabled: v })} />
                  </View>
                </View>

                {!!rule.enabled && (
                  <View style={styles.timeRow}>
                    <View style={{ flex:1 }}>
                      <Text style={styles.timeLbl}>מ־(HH:mm)</Text>
                      <TextInput
                        style={[styles.timeInput, inputBorder(validFrom)]}
                        value={rule.from}
                        onChangeText={(v) => updateDay(d.key, { from: v })}
                        placeholder="08:00"
                        keyboardType="numbers-and-punctuation"
                        autoCapitalize="none"
                      />
                    </View>
                    <View style={{ width:10 }} />
                    <View style={{ flex:1 }}>
                      <Text style={styles.timeLbl}>עד (HH:mm)</Text>
                      <TextInput
                        style={[styles.timeInput, inputBorder(validTo)]}
                        value={rule.to}
                        onChangeText={(v) => updateDay(d.key, { to: v })}
                        placeholder="20:00"
                        keyboardType="numbers-and-punctuation"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
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

  timeRow:{ flexDirection:'row', alignItems:'center', marginTop:8 },
  timeLbl:{ fontSize:12, color:'#555', marginBottom:4 },
  timeInput:{ height:44, borderRadius:10, borderWidth:1, borderColor:'#e3e9f0', backgroundColor:'#fff', paddingHorizontal:12, fontSize:15 },
});
