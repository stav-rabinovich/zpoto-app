// components/PlacesAutocomplete.js
import React, { useEffect, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, ScrollView } from 'react-native';
import { osmAutocomplete } from '../../utils/osm';

function useDebounced(value, delay = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

/**
 * Props:
 *  - value (string)
 *  - onChangeText(text)
 *  - onSelect({ id, placeId, description, lat, lon })
 *  - placeholder?
 *  - aroundLocation? { latitude, longitude }
 */
export default function PlacesAutocomplete({ value, onChangeText, onSelect, placeholder, aroundLocation }) {
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounced = useDebounced(value, 400);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!debounced || debounced.trim().length < 2) {
        setResults([]);
        return;
      }
      setLoading(true);
      const items = await osmAutocomplete(debounced, { aroundLocation, limit: 7, language: 'he' }).catch(() => []);
      if (!alive) return;
      setResults(items || []);
      setLoading(false);
    };
    run();
    return () => { alive = false; };
  }, [debounced, aroundLocation]);

  function pick(item) {
    setOpen(false);
    onSelect?.(item);
  }

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <TextInput
        value={value}
        onChangeText={(t) => { onChangeText?.(t); setOpen(true); }}
        placeholder={placeholder || 'כתובת...'}
        style={styles.input}
      />

      {open && (results.length > 0 || loading) && (
        <View style={styles.dropdown} pointerEvents="box-none">
          {loading ? (
            <Text style={styles.hint}>מחפש…</Text>
          ) : (
            <ScrollView
              style={styles.scroll}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {results.map((item) => (
                <TouchableOpacity key={String(item.id)} style={styles.item} onPress={() => pick(item)}>
                  <Text style={styles.itemText} numberOfLines={2}>{item.description}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
          {!loading && results.length === 0 && <Text style={styles.hint}>לא נמצאו תוצאות</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  dropdown: {
    position: 'absolute', top: 48, left: 0, right: 0,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, maxHeight: 220, zIndex: 999,
    // צל קל מעל הטופס
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  scroll: { maxHeight: 220 },
  item: { paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  itemText: { fontSize: 13, color: '#111827' },
  hint: { padding: 10, fontSize: 12, color: '#6b7280' },
});
