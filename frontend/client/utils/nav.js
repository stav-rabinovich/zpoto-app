// utils/nav.js
import { Linking, Platform } from 'react-native';

function fixed(n, p = 6) {
  const num = typeof n === 'number' ? n : Number(n);
  if (Number.isNaN(num)) return '';
  return num.toFixed(p);
}

export async function openWaze(latitude, longitude, label = '') {
  try {
    const lat = fixed(latitude);
    const lon = fixed(longitude);
    
    console.log(`🗺️ Opening Waze navigation:`);
    console.log(`   📍 Coordinates: ${lat}, ${lon}`);
    console.log(`   🏷️ Label: ${label}`);
    
    // פורמט deep link של Waze
    const appUrl = `waze://?ll=${lat},${lon}&navigate=yes${label ? `&q=${encodeURIComponent(label)}` : ''}`;
    const webUrl = `https://waze.com/ul?ll=${lat},${lon}&navigate=yes${label ? `&q=${encodeURIComponent(label)}` : ''}`;

    console.log(`   📱 App URL: ${appUrl}`);
    console.log(`   🌐 Web URL: ${webUrl}`);

    const supported = await Linking.canOpenURL('waze://');
    console.log(`   ✅ Waze app available: ${supported ? 'YES' : 'NO'}`);
    
    await Linking.openURL(supported ? appUrl : webUrl);
    console.log(`   🚀 Navigation opened successfully`);
  } catch (e) {
    console.warn(`   ❌ Waze failed, using fallback:`, e);
    // fallback עדין
    const webUrl = `https://waze.com/ul?ll=${latitude},${longitude}&navigate=yes`;
    try { 
      await Linking.openURL(webUrl); 
      console.log(`   🔄 Fallback web URL opened`);
    } catch (fallbackError) {
      console.error(`   ❌ Fallback also failed:`, fallbackError);
    }
  }
}

// אופציונלי לעתיד: Apple/Google Maps
export async function openNativeMaps(latitude, longitude, label = '') {
  const lat = fixed(latitude);
  const lon = fixed(longitude);
  const geo = Platform.select({
    ios: `http://maps.apple.com/?daddr=${lat},${lon}${label ? `&q=${encodeURIComponent(label)}` : ''}`,
    android: `geo:0,0?q=${lat},${lon}${label ? `(${encodeURIComponent(label)})` : ''}`,
    default: `https://maps.google.com/?daddr=${lat},${lon}`,
  });
  try { await Linking.openURL(geo); } catch {}
}
