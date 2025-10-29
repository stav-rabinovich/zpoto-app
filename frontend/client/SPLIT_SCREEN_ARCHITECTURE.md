# 🏗️ **SplitHomeScreen Architecture Plan**

## 📋 **מבנה הקומפוננטים החדש**

```
SplitHomeScreen.js (מסך ראשי חדש)
├── SearchSection.js (חלק עליון - מתכווץ)
│   ├── SearchBar (שדה חיפוש + הצעות)
│   ├── ActiveBookingBanner (הזמנה פעילה)
│   ├── RecentSearches (חיפושים אחרונים)
│   └── QuickActions (חיפוש סביבי)
│
├── MapSection.js (חלק תחתון - מפה)
│   ├── MapView (מפה עם סמנים)
│   ├── ParkingCards (רשימת חניות)
│   ├── LocationControls (כפתורי מיקום)
│   └── AvailabilityFilter (פילטר זמינות)
│
└── CollapsiblePanel.js (מנגנון הקטנה/הגדלה)
    ├── PanelHeader (כותרת עם כפתור כיווץ)
    ├── AnimatedContainer (קונטיינר עם אנימציות)
    └── GestureHandler (מחוות למשיכה)
```

## 🔄 **State Management Strategy**

### **Global State (SplitHomeScreen)**
```javascript
// UI State
const [panelCollapsed, setPanelCollapsed] = useState(false);
const [panelHeight, setPanelHeight] = useState(new Animated.Value(0.4)); // 40% מהמסך

// Search State
const [query, setQuery] = useState('');
const [searchCenter, setSearchCenter] = useState(null);
const [currentLocation, setCurrentLocation] = useState(null);

// Data State
const [nearbyParkings, setNearbyParkings] = useState([]);
const [activeBooking, setActiveBooking] = useState(null);
const [recentSearches, setRecentSearches] = useState([]);
```

### **SearchSection State**
```javascript
// Search Suggestions
const [suggestions, setSuggestions] = useState([]);
const [suggestOpen, setSuggestOpen] = useState(false);
const [suggestLoading, setSuggestLoading] = useState(false);

// Owner Status
const [ownerStatus, setOwnerStatus] = useState('none');
```

### **MapSection State**
```javascript
// Map State
const [region, setRegion] = useState(null);
const [selectedParking, setSelectedParking] = useState(null);
const [mapRef, setMapRef] = useState(null);

// Filters
const [showOnlyAvailable, setShowOnlyAvailable] = useState(true);
const [availabilityFilter, setAvailabilityFilter] = useState('next_hour'); // next_hour, next_2hours
```

## 🎨 **UI/UX Design Principles**

### **Panel Behavior**
1. **Default State**: 40% חיפוש, 60% מפה
2. **Collapsed State**: 15% חיפוש (רק שורת חיפוש), 85% מפה  
3. **Expanded State**: 70% חיפוש, 30% מפה
4. **Smooth Animations**: 300ms duration עם easing
5. **Gesture Support**: משיכה למעלה/למטה

### **Search Section Features**
- ✅ שדה חיפוש עם הצעות בזמן אמת
- ✅ באנר הזמנה פעילה (אם קיימת)
- ✅ חיפושים אחרונים (ללא מקומות שמורים)
- ✅ כפתור חיפוש סביבי
- ❌ **הסרת מקומות שמורים** (לפי הדרישה)

### **Map Section Features**
- ✅ מפה עם חניות בזמן אמת
- ✅ **פילטר זמינות לשעה הקרובה** (700m רדיוס)
- ✅ כרטיסי חניות עם פרטים
- ✅ WebSocket לעדכונים
- ✅ כפתורי מיקום ומרכוז

## 🔧 **Technical Implementation**

### **Core Technologies**
- **React Native Animated API** - אנימציות חלקות
- **PanGestureHandler** (react-native-gesture-handler) - מחוות
- **React Native Maps** - מפה
- **WebSocket** - עדכונים בזמן אמת
- **AsyncStorage** - שמירת העדפות

### **Performance Optimizations**
- **useMemo** לחישובים כבדים
- **useCallback** לפונקציות
- **React.memo** לקומפוננטים
- **Lazy Loading** לחניות
- **Debounced Search** (300ms)

### **Accessibility**
- **Screen Reader Support**
- **Voice Over Navigation**
- **High Contrast Support**
- **Large Text Support**

## 📱 **Responsive Design**

### **Screen Sizes**
- **Small (< 350px)**: Panel 50%/50%
- **Medium (350-400px)**: Panel 40%/60% (default)
- **Large (> 400px)**: Panel 35%/65%

### **Orientation Support**
- **Portrait**: Default behavior
- **Landscape**: Auto-collapse panel to 20%/80%

## 🔄 **Data Flow**

### **Location Updates**
```
User Location → SearchCenter → API Call → Filter Available → Update Map
```

### **Search Flow**
```
User Input → Suggestions API → Selection → Navigation → Map Update
```

### **Booking Updates**
```
WebSocket → Real-time Updates → Map Refresh → Card Updates
```

## 🎯 **Key Features**

### **Immediate Availability Focus**
- ✅ רק חניות זמינות לשעה הקרובה
- ✅ פילטר אוטומטי של חניות תפוסות
- ✅ עדכון בזמן אמת של זמינות
- ✅ אינדיקטור ויזואלי לזמינות

### **Smart Location Detection**
- ✅ GPS אוטומטי בהפעלה
- ✅ רדיוס 700m כברירת מחדל
- ✅ עדכון אוטומטי בתנועה
- ✅ fallback למיקום ידני

### **Seamless UX**
- ✅ מעבר חלק בין מצבי פאנל
- ✅ שמירת מצב בין סשנים
- ✅ אנימציות מותאמות
- ✅ feedback הפטי

## 🚀 **Implementation Phases**

### **Phase 1.2**: יצירת קומפוננטים בסיסיים
1. `SplitHomeScreen.js` - מסגרת עיקרית
2. `SearchSection.js` - חלק חיפוש
3. `MapSection.js` - חלק מפה
4. `CollapsiblePanel.js` - מנגנון כיווץ

### **Phase 1.3**: פיתוח SearchSection
1. העברת לוגיקת חיפוש
2. הסרת מקומות שמורים
3. אופטימיזציה לתצוגה קומפקטית
4. אנימציות

### **Phase 1.4**: פיתוח MapSection
1. העברת לוגיקת מפה
2. פילטור זמינות לשעה הקרובה
3. אינטגרציה עם מיקום נוכחי
4. אופטימיזציה לביצועים

### **Phase 1.5**: אינטגרציה ובדיקות
1. שילוב קומפוננטים
2. עדכון Navigation
3. בדיקות פונקציונליות
4. אופטימיזציה סופית

---

*תכנית זו מבוססת על עקרונות Clean Architecture עם דגש על ביצועים, נגישות וחוויית משתמש מיטבית.*
