/**
 * Profile Mapping Service
 * מטפל בהמרת נתוני OAuth לפרופיל משתמש מלא
 */

/**
 * מיפוי נתוני Google לפרופיל משתמש
 */
export const mapGoogleProfile = (googleData) => {
  const profile = {
    // שדות בסיסיים
    name: googleData.name || '',
    email: googleData.email || '',
    profilePicture: googleData.photo || null,
    
    // שדות נוספים שניתן לחלץ
    firstName: googleData.givenName || extractFirstName(googleData.name),
    lastName: googleData.familyName || extractLastName(googleData.name),
    
    // מטאדאטה
    provider: 'google',
    providerId: googleData.id,
    isEmailVerified: true, // Google תמיד מאמת אימייל
    
    // שדות חסרים שצריכים השלמה
    missingFields: []
  };
  
  // זיהוי שדות חסרים
  if (!profile.name) profile.missingFields.push('name');
  if (!profile.email) profile.missingFields.push('email');
  
  return profile;
};

/**
 * מיפוי נתוני Facebook לפרופיל משתמש
 */
export const mapFacebookProfile = (facebookData) => {
  const profile = {
    // שדות בסיסיים
    name: facebookData.name || '',
    email: facebookData.email || '',
    profilePicture: facebookData.picture?.data?.url || null,
    
    // שדות נוספים
    firstName: facebookData.first_name || extractFirstName(facebookData.name),
    lastName: facebookData.last_name || extractLastName(facebookData.name),
    
    // מטאדאטה
    provider: 'facebook',
    providerId: facebookData.id,
    isEmailVerified: !!facebookData.email, // Facebook לא תמיד נותן אימייל
    
    // שדות חסרים
    missingFields: []
  };
  
  // זיהוי שדות חסרים
  if (!profile.name) profile.missingFields.push('name');
  if (!profile.email) profile.missingFields.push('email');
  
  return profile;
};

/**
 * מיפוי נתוני Apple לפרופיל משתמש
 */
export const mapAppleProfile = (appleData) => {
  const fullName = appleData.fullName;
  const name = fullName ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim() : '';
  
  const profile = {
    // שדות בסיסיים
    name: name || '',
    email: appleData.email || '',
    profilePicture: null, // Apple לא נותן תמונת פרופיל
    
    // שדות נוספים
    firstName: fullName?.givenName || '',
    lastName: fullName?.familyName || '',
    
    // מטאדאטה
    provider: 'apple',
    providerId: appleData.user,
    isEmailVerified: true, // Apple תמיד מאמת אימייל
    
    // שדות חסרים
    missingFields: []
  };
  
  // Apple לעיתים לא נותן שם או אימייל
  if (!profile.name) profile.missingFields.push('name');
  if (!profile.email) profile.missingFields.push('email');
  
  return profile;
};

/**
 * פונקציה מרכזית למיפוי פרופיל לפי provider
 */
export const mapSocialProfile = (provider, socialData) => {
  switch (provider) {
    case 'google':
      return mapGoogleProfile(socialData);
    case 'facebook':
      return mapFacebookProfile(socialData);
    case 'apple':
      return mapAppleProfile(socialData);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

/**
 * בדיקה אם הפרופיל שלם או חסרים שדות
 */
export const isProfileComplete = (profile) => {
  const requiredFields = ['name', 'email'];
  const missingFields = requiredFields.filter(field => !profile[field]);
  
  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completionPercentage: Math.round(((requiredFields.length - missingFields.length) / requiredFields.length) * 100)
  };
};

/**
 * יצירת הודעה למשתמש על שדות חסרים
 */
export const getMissingFieldsMessage = (missingFields) => {
  if (missingFields.length === 0) {
    return 'הפרופיל שלך מלא! 🎉';
  }
  
  const fieldNames = {
    name: 'שם מלא',
    email: 'כתובת אימייל',
    phone: 'מספר טלפון',
    address: 'כתובת'
  };
  
  const missingNames = missingFields.map(field => fieldNames[field] || field);
  
  if (missingFields.length === 1) {
    return `נא להשלים: ${missingNames[0]}`;
  }
  
  return `נא להשלים: ${missingNames.join(', ')}`;
};

/**
 * פונקציות עזר לחילוץ שם פרטי ומשפחה
 */
const extractFirstName = (fullName) => {
  if (!fullName) return '';
  return fullName.split(' ')[0] || '';
};

const extractLastName = (fullName) => {
  if (!fullName) return '';
  const parts = fullName.split(' ');
  return parts.length > 1 ? parts.slice(1).join(' ') : '';
};

/**
 * המרת פרופיל למבנה שהשרת מצפה לו
 */
export const formatProfileForServer = (profile) => {
  return {
    name: profile.name,
    email: profile.email,
    phone: profile.phone || null,
    profilePicture: profile.profilePicture || null,
    // שדות OAuth
    [`${profile.provider}Id`]: profile.providerId,
    // מטאדאטה
    isEmailVerified: profile.isEmailVerified || false
  };
};

export default {
  mapSocialProfile,
  mapGoogleProfile,
  mapFacebookProfile,
  mapAppleProfile,
  isProfileComplete,
  getMissingFieldsMessage,
  formatProfileForServer
};
