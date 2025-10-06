/**
 * רכיב לניטור ביצועים - מחליף את כל מנגנוני המעקב המקומיים
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@shopify/restyle';
import { getCacheStats } from '../utils/memory-cache';
import { getStats as getAPIStats } from '../utils/optimized-api';
import { getQueueStatus } from '../utils/request-queue';
import { useOfflineMode } from '../hooks/useOfflineMode';

export default function PerformanceMonitor({ visible = false, onToggle }) {
  const theme = useTheme();
  const styles = makeStyles(theme);
  
  const [stats, setStats] = useState({
    cache: { size: 0, maxSize: 0, totalAccess: 0 },
    api: { pendingRequests: 0 },
    queue: { total: 0, pending: 0, processing: 0, failed: 0 },
    memory: { used: 0, total: 0 }
  });

  const { isFullyOnline, queueStatus } = useOfflineMode();

  // עדכון סטטיסטיקות
  const updateStats = () => {
    try {
      const cacheStats = getCacheStats();
      const apiStats = getAPIStats();
      const queueStats = getQueueStatus();

      setStats({
        cache: cacheStats,
        api: apiStats,
        queue: queueStats,
        memory: {
          used: Math.round(performance.memory?.usedJSHeapSize / 1024 / 1024) || 0,
          total: Math.round(performance.memory?.totalJSHeapSize / 1024 / 1024) || 0
        }
      });
    } catch (error) {
      console.warn('Failed to update performance stats:', error);
    }
  };

  // עדכון תקופתי
  useEffect(() => {
    if (visible) {
      updateStats();
      const interval = setInterval(updateStats, 1000);
      return () => clearInterval(interval);
    }
  }, [visible]);

  if (!visible) {
    return (
      <TouchableOpacity 
        style={styles.toggleButton}
        onPress={onToggle}
      >
        <Ionicons name="speedometer-outline" size={20} color={theme.colors.primary} />
      </TouchableOpacity>
    );
  }

  const getCacheHitRate = () => {
    const { totalAccess, size } = stats.cache;
    if (totalAccess === 0) return 0;
    return Math.round((totalAccess / (totalAccess + size)) * 100);
  };

  const getMemoryUsage = () => {
    const { used, total } = stats.memory;
    if (total === 0) return 0;
    return Math.round((used / total) * 100);
  };

  const getStatusColor = (value, thresholds) => {
    if (value < thresholds.good) return theme.colors.success;
    if (value < thresholds.warning) return theme.colors.warning;
    return theme.colors.error;
  };

  return (
    <View style={styles.container}>
      {/* כותרת */}
      <View style={styles.header}>
        <Text style={styles.title}>ביצועים</Text>
        <TouchableOpacity onPress={onToggle}>
          <Ionicons name="close" size={20} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* מצב חיבור */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>חיבור</Text>
        <View style={styles.row}>
          <Text style={styles.label}>סטטוס:</Text>
          <View style={[
            styles.statusBadge, 
            { backgroundColor: isFullyOnline ? theme.colors.success : theme.colors.error }
          ]}>
            <Text style={styles.statusText}>
              {isFullyOnline ? 'מחובר' : 'לא מחובר'}
            </Text>
          </View>
        </View>
      </View>

      {/* Cache */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cache</Text>
        <View style={styles.row}>
          <Text style={styles.label}>גודל:</Text>
          <Text style={styles.value}>
            {stats.cache.size}/{stats.cache.maxSize}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Hit Rate:</Text>
          <Text style={[
            styles.value,
            { color: getStatusColor(getCacheHitRate(), { good: 70, warning: 50 }) }
          ]}>
            {getCacheHitRate()}%
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>גישות:</Text>
          <Text style={styles.value}>{stats.cache.totalAccess}</Text>
        </View>
      </View>

      {/* API */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API</Text>
        <View style={styles.row}>
          <Text style={styles.label}>בקשות פעילות:</Text>
          <Text style={[
            styles.value,
            { color: getStatusColor(stats.api.pendingRequests, { good: 2, warning: 5 }) }
          ]}>
            {stats.api.pendingRequests}
          </Text>
        </View>
      </View>

      {/* תור בקשות */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>תור בקשות</Text>
        <View style={styles.row}>
          <Text style={styles.label}>סה"כ:</Text>
          <Text style={styles.value}>{stats.queue.total}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>ממתינות:</Text>
          <Text style={[
            styles.value,
            { color: getStatusColor(stats.queue.pending, { good: 0, warning: 3 }) }
          ]}>
            {stats.queue.pending}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>מעובדות:</Text>
          <Text style={styles.value}>{stats.queue.processing}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>נכשלו:</Text>
          <Text style={[
            styles.value,
            { color: stats.queue.failed > 0 ? theme.colors.error : theme.colors.text }
          ]}>
            {stats.queue.failed}
          </Text>
        </View>
      </View>

      {/* זיכרון */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>זיכרון</Text>
        <View style={styles.row}>
          <Text style={styles.label}>בשימוש:</Text>
          <Text style={[
            styles.value,
            { color: getStatusColor(getMemoryUsage(), { good: 50, warning: 75 }) }
          ]}>
            {stats.memory.used}MB ({getMemoryUsage()}%)
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>סה"כ:</Text>
          <Text style={styles.value}>{stats.memory.total}MB</Text>
        </View>
      </View>

      {/* פעולות */}
      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            // ניקוי cache
            const cleared = require('../utils/optimized-api').default.clearCache();
            console.log(`Cleared ${cleared} cache entries`);
            updateStats();
          }}
        >
          <Ionicons name="trash-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.actionText}>נקה Cache</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            // רענון סטטיסטיקות
            updateStats();
          }}
        >
          <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.actionText}>רענן</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(theme) {
  const { colors, spacing, borderRadii } = theme;
  
  return StyleSheet.create({
    toggleButton: {
      position: 'absolute',
      top: 50,
      right: 20,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      zIndex: 1000,
    },
    container: {
      position: 'absolute',
      top: 50,
      right: 20,
      width: 280,
      backgroundColor: colors.surface,
      borderRadius: borderRadii.lg,
      padding: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 5,
      zIndex: 1000,
      maxHeight: '80%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
    },
    section: {
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: spacing.sm,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    label: {
      fontSize: 12,
      color: colors.subtext,
    },
    value: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: borderRadii.sm,
    },
    statusText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#fff',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.sm,
      borderRadius: borderRadii.md,
      backgroundColor: colors.primary + '10',
    },
    actionText: {
      fontSize: 12,
      color: colors.primary,
      marginLeft: spacing.xs,
      fontWeight: '600',
    },
  });
}
