// screens/AdvancedSearchScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch, Platform, ScrollView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

function Row({ children, style }) {
  return <View style={[{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:12 }, style]}>{children}</View>;
}

export default function AdvancedSearchScreen({ route, navigation }) {
  const initial = route?.params?.initialFilters || {};

  const [availableNow, setAvailableNow] = useState(!!initial.availableNow);
  const [covered, setCovered] = useState(!!initial.covered);
  const [ev, setEv] = useState(!!initial.ev);

  const [maxPrice, setMaxPrice] = useState(initial.maxPrice ?? null);
  const [maxDistance, setMaxDistance] = useState(initial.maxDistance ?? null);

  const [start, setStart] = useState(initial.start ? new Date(initial.start) : null);
  const [end, setEnd] = useState(initial.end ? new Date(initial.end) : null);

  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);

  const prices = [10, 12, 15, 20, 30, 40];
  const distances = [0.5, 1, 2, 5];

  const Chip = ({ active, label, onPress }) => (
    <TouchableOpacity onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const apply = () => {
    const filters = {
      availableNow,
      covered,
      ev,
      maxPrice,
      maxDistance,
      start: start ? start.toISOString() : null,
      end: end ? end.toISOString() : null,
    };
    navigation.navigate('SearchResults', { filters }); // חוזר עם מסננים
  };

  const clear = () => {
    setAvailableNow(false);
    setCovered(false);
    setEv(false);
    setMaxPrice(null);
    setMaxDistance(null);
    setStart(null);
    setEnd(null);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.header}>חיפוש מתקדם</Text>

      <Row>
        <Text style={styles.label}>זמין עכשיו</Text>
        <Switch value={availableNow} onValueChange={setAvailableNow} />
      </Row>

      <Row>
        <Text style={styles.label}>חניה מקורה</Text>
        <Switch value={covered} onValueChange={setCovered} />
      </Row>

      <Row>
        <Text style={styles.label}>טעינת רכב חשמלי</Text>
        <Switch value={ev} onValueChange={setEv} />
      </Row>

      <Text style={styles.section}>מחיר מקסימלי (₪)</Text>
      <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
        {prices.map(p => (
          <Chip key={`p-${p}`} label={`₪${p}`} active={maxPrice === p} onPress={() => setMaxPrice(maxPrice === p ? null : p)} />
        ))}
      </View>

      <Text style={[styles.section, { marginTop:12 }]}>מרחק מקסימלי</Text>
      <View style={{ flexDirection:'row', flexWrap:'wrap' }}>
        {distances.map(d => (
          <Chip key={`d-${d}`} label={`${d} ק״מ`} active={maxDistance === d} onPress={() => setMaxDistance(maxDistance === d ? null : d)} />
        ))}
      </View>

      <Text style={[styles.section, { marginTop:12 }]}>טווח זמן</Text>
      <Row>
        <Text style={styles.label}>התחלה</Text>
        <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowStart(true)}>
          <Text style={styles.pickerText}>{start ? start.toLocaleString() : 'בחר תאריך/שעה'}</Text>
        </TouchableOpacity>
      </Row>
      {showStart && (
        <DateTimePicker
          value={start || new Date()}
          mode="datetime"
          is24Hour
          onChange={(_, date) => {
            setShowStart(Platform.OS === 'ios');
            if (date) {
              setStart(date);
              if (end && date >= end) {
                const e = new Date(date);
                e.setHours(e.getHours() + 1, 0, 0, 0);
                setEnd(e);
              }
            }
          }}
        />
      )}

      <Row>
        <Text style={styles.label}>סיום</Text>
        <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowEnd(true)}>
          <Text style={styles.pickerText}>{end ? end.toLocaleString() : 'בחר תאריך/שעה'}</Text>
        </TouchableOpacity>
      </Row>
      {showEnd && (
        <DateTimePicker
          value={end || (start ? new Date(start.getTime() + 60*60*1000) : new Date())}
          mode="datetime"
          is24Hour
          minimumDate={start || undefined}
          onChange={(_, date) => {
            setShowEnd(Platform.OS === 'ios');
            if (date) setEnd(date);
          }}
        />
      )}

      <View style={{ height: 12 }} />

      <TouchableOpacity style={styles.button} onPress={apply} activeOpacity={0.9}>
        <Text style={styles.buttonText}>הצג תוצאות</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.buttonGhost} onPress={clear} activeOpacity={0.9}>
        <Text style={styles.buttonGhostText}>איפוס מסננים</Text>
      </TouchableOpacity>

      <View style={{ height: 12 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:{ padding:16, backgroundColor:'#f7f9fb' },
  header:{ fontSize:22, fontWeight:'800', textAlign:'center', marginBottom:16 },
  label:{ fontSize:15, color:'#222' },
  section:{ fontSize:16, fontWeight:'700', marginBottom:8, marginTop:4 },

  chip:{
    paddingVertical:8, paddingHorizontal:12, borderRadius:999,
    borderWidth:1, borderColor:'#cfefff', backgroundColor:'#fff', marginRight:8, marginBottom:8
  },
  chipActive:{ backgroundColor:'#00C6FF', borderColor:'#00C6FF' },
  chipText:{ color:'#007acc', fontWeight:'700' },
  chipTextActive:{ color:'#fff' },

  pickerBtn:{ paddingVertical:10, paddingHorizontal:12, borderRadius:10, borderWidth:1, borderColor:'#e3e9f0', backgroundColor:'#fff' },
  pickerText:{ fontSize:14 },

  button:{ backgroundColor:'#00C6FF', paddingVertical:14, borderRadius:12, alignItems:'center', marginTop:8 },
  buttonText:{ color:'#fff', fontSize:16, fontWeight:'800' },
  buttonGhost:{ marginTop:10, paddingVertical:12, borderRadius:12, alignItems:'center', borderWidth:1, borderColor:'#00C6FF', backgroundColor:'#fff' },
  buttonGhostText:{ color:'#00C6FF', fontSize:15, fontWeight:'700' },
});
