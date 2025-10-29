// components/NavigationWrapper.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import BottomNavigationContainer from './BottomNavigationContainer';

const NavigationWrapper = ({ children }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      {/* תוכן המסכים */}
      <View style={styles.content}>
        {children}
      </View>
      
      {/* הסרגל התחתון - עם לוגיקה פנימית */}
      <BottomNavigationContainer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});

export default NavigationWrapper;
