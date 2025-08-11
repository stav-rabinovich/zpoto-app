// data/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getJSON(key, fallback = null) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.warn('getJSON error for key:', key, e);
    return fallback;
  }
}

export async function setJSON(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('setJSON error for key:', key, e);
    throw e;
  }
}
