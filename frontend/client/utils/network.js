import { API_BASE } from '../consts';

/**
 * בדיקת חיבור לשרת
 * @returns {Promise<boolean>} האם השרת זמין
 */
export const checkServerConnection = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 שניות timeout
    
    const response = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error('Server connection check failed:', error);
    return false;
  }
};

/**
 * בדיקת חיבור אינטרנט כללי
 * @returns {Promise<boolean>} האם יש חיבור אינטרנט
 */
export const checkInternetConnection = async () => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch('https://www.google.com/favicon.ico', {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors',
    });
    
    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    console.error('Internet connection check failed:', error);
    return false;
  }
};

/**
 * בדיקה מקיפה של מצב החיבור
 * @returns {Promise<Object>} מידע על מצב החיבור
 */
export const getConnectionStatus = async () => {
  console.log('🔍 Checking connection status...');
  
  const [hasInternet, serverAvailable] = await Promise.all([
    checkInternetConnection(),
    checkServerConnection()
  ]);
  
  const status = {
    hasInternet,
    serverAvailable,
    apiBase: API_BASE,
    timestamp: new Date().toISOString()
  };
  
  console.log('📊 Connection status:', status);
  return status;
};

/**
 * המתנה עד שהשרת יהיה זמין
 * @param {number} maxAttempts - מספר ניסיונות מקסימלי
 * @param {number} delay - השהיה בין ניסיונות (מילישניות)
 * @returns {Promise<boolean>} האם השרת זמין
 */
export const waitForServer = async (maxAttempts = 10, delay = 2000) => {
  console.log(`⏳ Waiting for server to be available (max ${maxAttempts} attempts)...`);
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    console.log(`🔄 Attempt ${attempt}/${maxAttempts}`);
    
    const isAvailable = await checkServerConnection();
    if (isAvailable) {
      console.log('✅ Server is available!');
      return true;
    }
    
    if (attempt < maxAttempts) {
      console.log(`⏱️ Waiting ${delay}ms before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.log('❌ Server is not available after all attempts');
  return false;
};

/**
 * פונקציה לדיבוג בעיות רשת
 * @returns {Promise<Object>} מידע מפורט לדיבוג
 */
export const debugNetworkIssues = async () => {
  console.log('🔧 Starting network debugging...');
  
  const debug = {
    timestamp: new Date().toISOString(),
    apiBase: API_BASE,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown'
  };
  
  // בדיקת חיבור אינטרנט
  try {
    debug.internetCheck = await checkInternetConnection();
  } catch (error) {
    debug.internetError = error.message;
  }
  
  // בדיקת חיבור לשרת
  try {
    debug.serverCheck = await checkServerConnection();
  } catch (error) {
    debug.serverError = error.message;
  }
  
  // בדיקת DNS resolution
  try {
    const url = new URL(API_BASE);
    debug.hostname = url.hostname;
    debug.port = url.port;
    debug.protocol = url.protocol;
  } catch (error) {
    debug.urlError = error.message;
  }
  
  // בדיקת ping לשרת
  try {
    const start = Date.now();
    await fetch(`${API_BASE}/health`, { method: 'HEAD' });
    debug.pingTime = Date.now() - start;
  } catch (error) {
    debug.pingError = error.message;
  }
  
  console.log('🔧 Network debug results:', debug);
  return debug;
};
