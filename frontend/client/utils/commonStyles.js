/**
 * Common Styles - עיצובים משותפים לכל האפליקציה
 * מטרה: לצמצם כפילויות בעיצוב
 */

/**
 * כרטיס בסיסי עם צללים
 */
export const createCard = (theme, additionalStyles = {}) => ({
  backgroundColor: theme.colors.cardBackground || '#ffffff',
  borderRadius: 12,
  padding: 16,
  marginVertical: 8,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
  ...additionalStyles
});

/**
 * כפתור בסיסי
 */
export const createButton = (theme, variant = 'primary', additionalStyles = {}) => {
  const baseButton = {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  };

  const variants = {
    primary: {
      backgroundColor: theme.colors.primary || '#007AFF',
    },
    secondary: {
      backgroundColor: theme.colors.secondary || '#6C757D',
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: theme.colors.primary || '#007AFF',
    },
    danger: {
      backgroundColor: '#DC3545',
    }
  };

  return {
    ...baseButton,
    ...variants[variant],
    ...additionalStyles
  };
};

/**
 * טקסט כפתור
 */
export const createButtonText = (theme, variant = 'primary', additionalStyles = {}) => {
  const baseText = {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  };

  const textColors = {
    primary: { color: '#FFFFFF' },
    secondary: { color: '#FFFFFF' },
    outline: { color: theme.colors.primary || '#007AFF' },
    danger: { color: '#FFFFFF' }
  };

  return {
    ...baseText,
    ...textColors[variant],
    ...additionalStyles
  };
};

/**
 * אינפוט בסיסי
 */
export const createInput = (theme, hasError = false, additionalStyles = {}) => ({
  borderWidth: 1,
  borderColor: hasError 
    ? '#DC3545' 
    : theme.colors.border || '#E1E5E9',
  borderRadius: 8,
  paddingHorizontal: 16,
  paddingVertical: 12,
  fontSize: 16,
  backgroundColor: theme.colors.inputBackground || '#FFFFFF',
  color: theme.colors.text || '#000000',
  minHeight: 48,
  ...additionalStyles
});

/**
 * הודעת שגיאה
 */
export const createErrorText = (theme, additionalStyles = {}) => ({
  color: '#DC3545',
  fontSize: 14,
  marginTop: 4,
  textAlign: 'right',
  ...additionalStyles
});

/**
 * כותרת מסך
 */
export const createScreenTitle = (theme, additionalStyles = {}) => ({
  fontSize: 24,
  fontWeight: '700',
  color: theme.colors.text || '#000000',
  marginBottom: 16,
  textAlign: 'right',
  ...additionalStyles
});

/**
 * רווח סטנדרטי
 */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

/**
 * צבעים משותפים
 */
export const colors = {
  success: '#28A745',
  warning: '#FFC107',
  error: '#DC3545',
  info: '#17A2B8',
  light: '#F8F9FA',
  dark: '#343A40'
};
