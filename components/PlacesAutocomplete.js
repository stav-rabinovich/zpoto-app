// components/PlacesAutocomplete.js
import React, { useEffect, useRef, useState } from 'react';
import { View, TextInput, StyleSheet, FlatList, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { osmAutocomplete } from '../utils/osm';
import { Ionicons } from '@expo/vector-icons';

export default function PlacesAutocomplete({
  placeholder = 'הזן כתובת…',
  initialText = '',
  value,                // ✅ טקסט נשלט מבחוץ (אופציונלי)
  aroundLocation = null,
  onSelect,             // (item) -> void
  onChangeText,         // ✅ ידווח החוצה על שינויי טקסט
  inputStyle,
  containerStyle,
  listMaxHeight = 220,
  debounceMs = 250,
}) {
  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);

  // ✅ סנכרון פנימי עם value/initialText אם משתנים מבחוץ
  useEffect(() => {
    if (typeof value === 'string') {
      setText(value);
    } else if (initialText) {
      setText(initialText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, initialText]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!text || text.trim().length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const results = await osmAutocomplete(text.trim(), { aroundLocation });
        setItems(results);
        setOpen(true);
      } catch {
        setItems([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, [text, aroundLocation, debounceMs]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => {
        setOpen(false);
        setItems([]);
        // ✅ מעדכן גם את הטקסט הנראה וגם מדווח להורה
        setText(item.description);
        onChangeText?.(item.description);
        onSelect?.(item);
      }}
    >
      <Ionicons name="location-outline" size={16} color="#0b6aa8" style={{ marginEnd: 8 }} />
      <Text numberOfLines={2} style={styles.rowText}>{item.description}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.wrap, containerStyle]}>
      <View style={styles.inputWrap}>
        <Ionicons name="search" size={18} color="#00A7E6" style={{ marginEnd: 6 }} />
        <TextInput
          value={text}
          onChangeText={(t) => { setText(t); onChangeText?.(t); }}
          placeholder={placeholder}
          style={[styles.input, inputStyle]}
          onFocus={() => { if (items.length > 0) setOpen(true); }}
        />
        {loading && <ActivityIndicator size="small" />}
      </View>

      {open && items.length > 0 && (
        <View style={[styles.dropdown, { maxHeight: listMaxHeight }]}>
          <FlatList
            data={items}
            keyExtractor={(it, idx) => it.id || String(idx)}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:{ position:'relative' },
  inputWrap:{
    flexDirection:'row', alignItems:'center',
    backgroundColor:'#fff', borderRadius:12, borderWidth:1, borderColor:'#cdefff',
    paddingHorizontal:12, height:50
  },
  input:{ flex:1, fontSize:16, paddingVertical:8 },
  dropdown:{
    position:'absolute', zIndex:10, left:0, right:0, top:52,
    backgroundColor:'#fff', borderWidth:1, borderColor:'#e6f3ff', borderRadius:12,
    shadowColor:'#000', shadowOpacity:0.08, shadowRadius:8, shadowOffset:{ width:0, height:4 }
  },
  row:{ padding:12, flexDirection:'row', alignItems:'center' },
  rowText:{ flex:1, color:'#0b6aa8' },
});
