import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

/**
 * Loading State מלא למסך
 */
export const FullScreenLoading = ({ message = 'טוען...' }) => (
  <View style={styles.fullScreen}>
    <ActivityIndicator size="large" color="#2196F3" />
    <Text style={styles.loadingText}>{message}</Text>
  </View>
);

/**
 * Loading State לכרטיסים
 */
export const CardLoading = ({ height = 120 }) => (
  <View style={[styles.cardLoading, { height }]}>
    <View style={styles.shimmer} />
  </View>
);

/**
 * Loading State לרשימות
 */
export const ListLoading = ({ itemCount = 5, itemHeight = 80 }) => (
  <View style={styles.listContainer}>
    {Array.from({ length: itemCount }).map((_, index) => (
      <CardLoading key={index} height={itemHeight} />
    ))}
  </View>
);

/**
 * Loading State קטן לכפתורים
 */
export const ButtonLoading = ({ color = '#fff', size = 'small' }) => (
  <ActivityIndicator size={size} color={color} />
);

/**
 * Empty State - כשאין נתונים
 */
export const EmptyState = ({ 
  icon = 'document-outline', 
  title = 'אין נתונים', 
  message = 'לא נמצאו פריטים להצגה',
  actionText,
  onAction 
}) => (
  <View style={styles.emptyState}>
    <Ionicons name={icon} size={64} color="#ccc" />
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptyMessage}>{message}</Text>
    {actionText && onAction && (
      <TouchableOpacity style={styles.emptyAction} onPress={onAction}>
        <Text style={styles.emptyActionText}>{actionText}</Text>
      </TouchableOpacity>
    )}
  </View>
);

/**
 * Error State - כשיש שגיאה
 */
export const ErrorState = ({ 
  message = 'אירעה שגיאה', 
  onRetry,
  retryText = 'נסה שוב' 
}) => (
  <View style={styles.errorState}>
    <Ionicons name="alert-circle-outline" size={64} color="#F44336" />
    <Text style={styles.errorTitle}>שגיאה</Text>
    <Text style={styles.errorMessage}>{message}</Text>
    {onRetry && (
      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Ionicons name="refresh" size={16} color="#fff" />
        <Text style={styles.retryButtonText}>{retryText}</Text>
      </TouchableOpacity>
    )}
  </View>
);

/**
 * Skeleton Loading - אנימציה יפה
 */
export const SkeletonLoading = ({ width: w = '100%', height = 20, borderRadius = 4 }) => (
  <View style={[styles.skeleton, { width: w, height, borderRadius }]}>
    <View style={styles.skeletonShimmer} />
  </View>
);

const styles = StyleSheet.create({
  // Full Screen Loading
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },

  // Card Loading
  cardLoading: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    marginVertical: 4,
    overflow: 'hidden',
  },
  shimmer: {
    flex: 1,
    backgroundColor: '#e0e0e0',
  },

  // List Loading
  listContainer: {
    padding: 16,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyAction: {
    marginTop: 20,
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Error State
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#F44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Skeleton
  skeleton: {
    backgroundColor: '#f0f0f0',
    overflow: 'hidden',
  },
  skeletonShimmer: {
    flex: 1,
    backgroundColor: '#e0e0e0',
  },
});
