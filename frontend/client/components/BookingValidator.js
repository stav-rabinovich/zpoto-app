import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAvailability } from '../hooks';
import { convertFromUTC, formatForDisplay } from '../utils/timezone';

/**
 * Component לvalidation של הזמנות בזמן אמת
 * בודק אם ההזמנה תקינה ומציג הודעות מתאימות
 */
const BookingValidator = ({ 
  parkingId, 
  startTime, 
  endTime,
  onValidationChange,
  style,
  showDetails = true
}) => {
  const { validateBooking, loading, error } = useAvailability();
  const [validation, setValidation] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  /**
   * בדיקת תקינות ההזמנה
   */
  const validateSlot = async () => {
    if (!parkingId || !startTime || !endTime) {
      setValidation(null);
      return;
    }

    // בדוק שזמן הסיום אחרי זמן ההתחלה
    if (new Date(endTime) <= new Date(startTime)) {
      const invalidResult = {
        valid: false,
        error: 'זמן הסיום חייב להיות אחרי זמן ההתחלה'
      };
      setValidation(invalidResult);
      if (onValidationChange) {
        onValidationChange(invalidResult);
      }
      return;
    }

    setIsValidating(true);

    try {
      const result = await validateBooking(parkingId, startTime, endTime);
      
      setValidation(result);
      
      // קרא לcallback אם קיים
      if (onValidationChange) {
        onValidationChange(result);
      }
    } catch (err) {
      console.error('Error validating booking:', err);
      const errorResult = {
        valid: false,
        error: 'שגיאה בבדיקת תקינות ההזמנה'
      };
      setValidation(errorResult);
      if (onValidationChange) {
        onValidationChange(errorResult);
      }
    } finally {
      setIsValidating(false);
    }
  };

  /**
   * בדיקה מחדש כשהפרמטרים משתנים
   */
  useEffect(() => {
    // דחה את הבדיקה קצת כדי לא לעשות יותר מדי קריאות
    const timeoutId = setTimeout(() => {
      validateSlot();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [parkingId, startTime, endTime]);

  /**
   * עיצוב לפי תוצאת validation
   */
  const getValidationStyle = () => {
    if (isValidating || loading) return styles.validating;
    if (!validation) return styles.neutral;
    
    if (validation.valid) {
      return styles.valid;
    } else {
      return styles.invalid;
    }
  };

  /**
   * אייקון סטטוס - הוסר לפי בקשה
   */
  const getStatusIcon = () => {
    return ''; // הוסרו האימוג'ים
  };

  /**
   * טקסט סטטוס
   */
  const getStatusText = () => {
    if (isValidating || loading) return 'בודק תקינות...';
    if (error) return 'שגיאה בבדיקה';
    if (!validation) return 'ממתין לבדיקה';
    
    if (validation.valid) {
      return 'ההזמנה תקינה';
    } else {
      return validation.error || 'ההזמנה לא תקינה';
    }
  };

  /**
   * פרטים נוספים
   */
  const getDetailsText = () => {
    if (!validation || !showDetails) return null;
    
    if (validation.valid && validation.data?.message) {
      return validation.data.message;
    }
    
    if (!validation.valid && validation.suggestedEndTime) {
      try {
        // השרת שולח זמן ב-UTC, נמיר לזמן ישראל
        const israelTime = convertFromUTC(validation.suggestedEndTime);
        const displayTime = formatForDisplay(israelTime, 'time');
        
        console.log('🔍 Suggested end time:', {
          utc: validation.suggestedEndTime,
          israel: israelTime.toISOString(),
          display: displayTime
        });
        
        return `מומלץ לסיים עד ${displayTime}`;
      } catch (error) {
        console.error('❌ Error converting suggested time:', error);
        return 'מומלץ לבחור זמן אחר';
      }
    }
    
    return null;
  };

  // אל תציג כלום אם אין פרמטרים
  if (!parkingId || !startTime || !endTime) {
    return null;
  }

  // אל תציג כלום אם ההזמנה תקינה
  if (validation && validation.valid && !isValidating && !loading) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.validationContainer, getValidationStyle()]}>
        <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          {getDetailsText() && (
            <Text style={styles.detailsText}>{getDetailsText()}</Text>
          )}
        </View>
        
        {(isValidating || loading) && (
          <ActivityIndicator size="small" color="#666" style={styles.spinner} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  valid: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
  },
  invalid: {
    backgroundColor: '#ffeaea',
    borderColor: '#f44336',
  },
  validating: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
  },
  neutral: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
  },
  statusIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'left',
  },
  detailsText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    textAlign: 'left',
  },
  spinner: {
    marginLeft: 8,
  },
});

export default BookingValidator;
