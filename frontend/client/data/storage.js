// data/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getJSON(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[storage.getJSON] JSON parse error for', key, e);
    return fallback;
  }
}

export async function setJSON(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('[storage.setJSON] set error for', key, e);
    throw e;
  }
}

export async function remove(key) {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn('[storage.remove] error for', key, e);
  }
}
