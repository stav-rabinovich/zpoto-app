// components/ui/RtlChevron.js
import React, { memo } from 'react';
import { I18nManager } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * חץ "סמנטי" שמתהפך אוטומטית לפי RTL/LTR.
 *
 * props:
 * - semantic: "forward" | "back" | "left" | "right" | "up" | "down"
 * - size, color, style: יועברו ל-Ionicons
 * - rtl:     אופציונלי, לאנוס כיוון (true=RTL, false=LTR). אם לא ניתן, נלקח מ-I18nManager.isRTL
 * - nameOverride: אופציונלי, לאנוס שם אייקון ספציפי ב-Ionicons
 * - ...rest: כל prop נוסף עובר הלאה ל-Ionicons (למשל testID, accessibilityLabel וכו')
 */
function RtlChevron({
  semantic = 'forward',
  size = 16,
  color = '#000',
  style,
  nameOverride,
  rtl, // optional override
  ...rest
}) {
  const isRTL = typeof rtl === 'boolean' ? rtl : I18nManager.isRTL;

  let name = 'chevron-forward';

  if (nameOverride) {
    name = nameOverride;
  } else {
    switch (semantic) {
      case 'back':
        // חזרה: RTL → ימינה, LTR → שמאלה
        name = isRTL ? 'chevron-forward' : 'chevron-back';
        break;
      case 'forward':
        // קדימה: RTL → שמאלה, LTR → ימינה
        name = isRTL ? 'chevron-back' : 'chevron-forward';
        break;
      case 'left':
        name = 'chevron-back';      // כיוון מוחלט שמאלה
        break;
      case 'right':
        name = 'chevron-forward';   // כיוון מוחלט ימינה
        break;
      case 'up':
        name = 'chevron-up';
        break;
      case 'down':
        name = 'chevron-down';
        break;
      default:
        name = isRTL ? 'chevron-back' : 'chevron-forward';
    }
  }

  return <Ionicons name={name} size={size} color={color} style={style} {...rest} />;
}

export default memo(RtlChevron);
