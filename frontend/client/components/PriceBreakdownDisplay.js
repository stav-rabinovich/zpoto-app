// components/PriceBreakdownDisplay.js - הצגת פירוט מחיר מתקדם
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@shopify/restyle';

export default function PriceBreakdownDisplay({ 
  serverPrice, 
  total, 
  exactHours, 
  hours, 
  pricingMethod, 
  priceLoading, 
  priceError 
}) {
  const theme = useTheme();
  const styles = makeStyles(theme);

  // Loading state
  if (priceLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>מחשב מחיר...</Text>
        </View>
      </View>
    );
  }

  // Error state
  if (priceError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>שגיאה בחישוב מחיר</Text>
          <Text style={styles.errorSubtext}>משתמש בחישוב מקומי</Text>
        </View>
      </View>
    );
  }

  // Proportional pricing display
  if (serverPrice && serverPrice.method === 'proportional') {
    return (
      <View style={styles.container}>
        <View style={styles.priceHeader}>
          <Text style={styles.totalPrice}>₪{serverPrice.totalPrice.toFixed(2)}</Text>
          <View style={styles.methodBadge}>
            <Text style={styles.methodBadgeText}>🆕 תמחור מדויק</Text>
          </View>
        </View>
        
        <Text style={styles.exactHours}>
          {serverPrice.exactHours.toFixed(2)} שעות מדויק
        </Text>
        
        {/* פירוט מפורט */}
        {serverPrice.breakdown && serverPrice.breakdown.length > 0 && (
          <View style={styles.breakdownContainer}>
            <Text style={styles.breakdownTitle}>פירוט:</Text>
            {serverPrice.breakdown.map((item, index) => (
              <View key={index} style={styles.breakdownLine}>
                <Text style={styles.breakdownText}>
                  שעה {item.hour}: ₪{item.price.toFixed(2)}
                  {item.isFractional && item.fractionalPart && (
                    <Text style={styles.fractionalText}>
                      {' '}({(item.fractionalPart * 100).toFixed(0)}%)
                    </Text>
                  )}
                </Text>
              </View>
            ))}
          </View>
        )}
        
        {serverPrice.formatted && (
          <Text style={styles.formattedText}>{serverPrice.formatted}</Text>
        )}
      </View>
    );
  }

  // Legacy pricing display
  return (
    <View style={styles.container}>
      <View style={styles.priceHeader}>
        <Text style={styles.totalPrice}>₪{total.toFixed(2)}</Text>
        {pricingMethod === 'legacy' && serverPrice && (
          <View style={styles.methodBadgeLegacy}>
            <Text style={styles.methodBadgeTextLegacy}>🔄 תמחור רגיל</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.hoursText}>
        {hours} שעות
        {exactHours && exactHours !== hours && (
          <Text style={styles.exactHoursText}>
            {' '}(מדויק: {exactHours.toFixed(2)})
          </Text>
        )}
      </Text>
      
      {pricingMethod === 'client-side' && (
        <Text style={styles.fallbackText}>חישוב מקומי</Text>
      )}
    </View>
  );
}

const makeStyles = (theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  totalPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  
  methodBadge: {
    backgroundColor: theme.colors.success + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  methodBadgeText: {
    fontSize: 12,
    color: theme.colors.success,
    fontWeight: '600',
  },
  
  methodBadgeLegacy: {
    backgroundColor: theme.colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  methodBadgeTextLegacy: {
    fontSize: 12,
    color: theme.colors.warning,
    fontWeight: '600',
  },
  
  exactHours: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 12,
    fontWeight: '500',
  },
  
  hoursText: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 4,
  },
  
  exactHoursText: {
    fontSize: 12,
    color: theme.colors.subtext,
    fontStyle: 'italic',
  },
  
  breakdownContainer: {
    backgroundColor: theme.colors.bg,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  
  breakdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.subtext,
    marginBottom: 8,
  },
  
  breakdownLine: {
    marginBottom: 4,
  },
  
  breakdownText: {
    fontSize: 12,
    color: theme.colors.text,
  },
  
  fractionalText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  
  formattedText: {
    fontSize: 11,
    color: theme.colors.subtext,
    marginTop: 8,
    fontStyle: 'italic',
  },
  
  fallbackText: {
    fontSize: 11,
    color: theme.colors.subtext,
    fontStyle: 'italic',
  },
  
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  
  loadingText: {
    fontSize: 14,
    color: theme.colors.subtext,
  },
  
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    fontWeight: '600',
  },
  
  errorSubtext: {
    fontSize: 11,
    color: theme.colors.subtext,
    marginTop: 2,
  },
});
