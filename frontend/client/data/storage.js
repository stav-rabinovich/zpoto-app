// data/storage.js - DISABLED
// המערכת עובדת כעת 100% מול השרת

export async function getJSON(key, fallback = null) {
  console.log(' Local storage disabled - returning fallback');
  return fallback;
}

export async function setJSON(key, value) {
  console.log(' Local storage disabled - not saving');
  // לא שומר כלום
}

export async function remove(key) {
  console.log(' Local storage disabled - nothing to remove');
  // לא מוחק כלום
}
