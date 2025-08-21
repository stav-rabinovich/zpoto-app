// theme/zpotoThemeRestyle.js
import { createTheme } from '@shopify/restyle';

const rtlTextBase = { textAlign: 'right', writingDirection: 'rtl' };

export const theme = createTheme({
  colors: {
    // מותג
    primary: '#7F93FF',
    secondary: '#A47BFF',
    accent: '#6FD6FF',
    gradientStart: '#6FD6FF',
    gradientEnd:   '#A47BFF',

    // נייטרלים
    text: '#0F172A',
    subtext: '#475569',
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    border: '#E2E8F0',

    // פידבק
    success: '#22C55E',
    warning: '#F59E0B',
    error:   '#EF4444',
  },
  spacing: {
    xs: 4, sm: 8, md: 12, lg: 16, xl: 24, x2l: 32,
  },
  borderRadii: {
    sm: 12, md: 16, lg: 24, pill: 999,
  },
  textVariants: {
    defaults: { ...rtlTextBase, fontSize: 16, color: 'text' },
    h1:       { ...rtlTextBase, fontSize: 28, fontWeight: '600', color: 'text' },
    h2:       { ...rtlTextBase, fontSize: 22, fontWeight: '600', color: 'text' },
    h3:       { ...rtlTextBase, fontSize: 18, fontWeight: '600', color: 'text' },
    body:     { ...rtlTextBase, fontSize: 16, color: 'text' },
    small:    { ...rtlTextBase, fontSize: 14, color: 'subtext' },
    caption:  { ...rtlTextBase, fontSize: 12, color: 'subtext' },
  },
});

// אופציונלי: Dark theme ל־RTL
export const darkTheme = createTheme({
  ...theme,
  colors: {
    ...theme.colors,
    bg: '#0B1020',
    surface: '#131A2E',
    text: '#E6E8EE',
    subtext: '#A5B0C4',
    border: '#1F2740',
  },
});
