import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useAvailability } from '../hooks';
import { convertFromUTC, formatForDisplay } from '../utils/timezone';

/**
 * Component להצגת זמינות חניה
 * מציג את הזמינות הנוכחית ומאפשר רענון
 */
const ParkingAvailability = ({ 
  parkingId, 
  startTime, 
  onAvailabilityChange,
  style,
  showRefreshButton = true,
  autoRefresh = false,
  refreshInterval = 60000 // דקה
}) => {
  const { checkAvailability, loading, error } = useAvailability();
  const [availability, setAvailability] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  /**
   * בדיקת זמינות
   */
  const fetchAvailability = async (forceRefresh = false) => {
    if (!parkingId || !startTime) return;

    try {
      const result = await checkAvailability(parkingId, startTime, forceRefresh);
      
      if (result.success && result.data) {
        setAvailability(result.data);
        setLastUpdated(new Date());
        
        // קרא לcallback אם קיים
        if (onAvailabilityChange) {
          onAvailabilityChange(result.data);
        }
      }
    } catch (err) {
      console.error('Error fetching availability:', err);
    }
  };

  /**
   * רענון ידני
   */
  const handleRefresh = () => {
    fetchAvailability(true);
  };

  /**
   * טעינה ראשונית
   */
  useEffect(() => {
    fetchAvailability();
  }, [parkingId, startTime]);

  /**
   * רענון אוטומטי
   */
  useEffect(() => {
    if (!autoRefresh || !refreshInterval) return;

    const interval = setInterval(() => {
      fetchAvailability(true);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, parkingId, startTime]);

  /**
   * עיצוב לפי סטטוס זמינות
   */
  const getAvailabilityStyle = () => {
    if (!availability) return styles.unavailable;
    
    if (availability.canBook) {
      return styles.available;
    } else {
      return styles.unavailable;
    }
  };

  /**
   * טקסט סטטוס
   */
  const getStatusText = () => {
    if (loading) return 'בודק זמינות...';
    if (error) return 'שגיאה בבדיקת זמינות';
    if (!availability) return 'לא ניתן לבדוק זמינות';
    
    if (availability.canBook) {
      // השרת כבר מחזיר הודעה מעוצבת עם זמנים בזמן ישראל
      return availability.message || 'זמינה להזמנה';
    } else {
      return availability.message || 'לא זמינה כרגע';
    }
  };

  /**
   * אייקון סטטוס - הוסר לפי בקשה
   */
  const getStatusIcon = () => {
    return ''; // הוסרו האימוג'ים
  };

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.statusContainer, getAvailabilityStyle()]}>
        <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
          {availability && availability.canBook && availability.limitedBy && (
            <Text style={styles.detailsText}>
              {availability.limitedBy === 'schedule' ? 'לפי שעות פעילות' : 
               availability.limitedBy === 'booking' ? 'עד הזמנה הבאה' : ''}
            </Text>
          )}
        </View>
        
        {showRefreshButton && (
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <Text style={styles.refreshIcon}>🔄</Text>
            )}
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  available: {
    backgroundColor: '#f3f0ff',
    borderColor: '#8B5CF6',
  },
  unavailable: {
    backgroundColor: '#ffeaea',
    borderColor: '#f44336',
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
    color: '#8B5CF6',
    textAlign: 'left',
  },
  detailsText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
    textAlign: 'left',
  },
  timestampText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  refreshButton: {
    padding: 8,
    marginLeft: 8,
  },
  refreshIcon: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    color: '#f44336',
    marginTop: 4,
    textAlign: 'right',
  },
});

export default ParkingAvailability;
