// utils/availability.js
// מודל זמינות בסיסי + בדיקה אם טווח זמן זמין לפי שבוע

export const HEB_DAYS = [
  { key: 'sun', label: 'א׳' },
  { key: 'mon', label: 'ב׳' },
  { key: 'tue', label: 'ג׳' },
  { key: 'wed', label: 'ד׳' },
  { key: 'thu', label: 'ה׳' },
  { key: 'fri', label: 'ו׳' },
  { key: 'sat', label: 'ש׳' },
];

export function defaultAlwaysAvailable() {
  return {
    mode: 'always', // 'always' | 'weekly'
    weekly: HEB_DAYS.reduce((acc, d) => {
      acc[d.key] = { enabled: true, from: '00:00', to: '23:59' };
      return acc;
    }, {}),
  };
}

// הסרה של פריסט ימי חול 08:00–20:00 – כבר לא בשימוש
export function defaultWeekdayPreset() {
  return defaultAlwaysAvailable();
}

const pad2 = (n) => String(n).padStart(2, '0');

export function isValidHHmm(s) {
  return typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

function minutesOfDay(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function keyForDow(d) {
  // d: Date (local)
  const dow = d.getDay(); // 0=Sun
  return ['sun','mon','tue','wed','thu','fri','sat'][dow];
}

function cloneDate(d) {
  return new Date(d.getTime());
}

// האם טווח מסוים ביום נתון מכוסה ע"י חלון ה-Weekly של אותו יום
function isDayWindowCovered(weekly, date, startMin, endMin) {
  const key = keyForDow(date);
  const rule = weekly[key];
  if (!rule || !rule.enabled) return false;

  const open = minutesOfDay(rule.from);
  const close = minutesOfDay(rule.to);

  // טווח סגור (start<=x<end). אם close<open נחשב כ-24/7 בפשטות
  if (close < open) return true;

  return startMin >= open && endMin <= close;
}

// בודק אם זמינות מכסה את כל הטווח [start,end)
export function isAvailableForRange(availability, startISO, endISO) {
  if (!availability || availability.mode === 'always') return true;
  if (!startISO || !endISO) return true;

  const start = new Date(startISO);
  const end   = new Date(endISO);
  if (!(start < end)) return false;

  // נבדוק יום-יום. כל מקטע ביום חייב להיות מכוסה.
  let dayStart = new Date(start);
  while (dayStart < end) {
    const nextDay = new Date(dayStart);
    nextDay.setHours(23, 59, 59, 999);
    const segmentEnd = end < nextDay ? end : nextDay;

    const segStartMin = dayStart.getHours() * 60 + dayStart.getMinutes();
    const segEndMin   = segmentEnd.getHours() * 60 + segmentEnd.getMinutes() + 1; // לכלול את הדקה האחרונה
    if (!isDayWindowCovered(availability.weekly, dayStart, segStartMin, segEndMin)) {
      return false;
    }

    // מעבר ליום הבא 00:00
    const next = cloneDate(dayStart);
    next.setDate(next.getDate() + 1);
    next.setHours(0,0,0,0);
    dayStart = next;
  }
  return true;
}

// כלי נוח לעדכון כל הימים יחד
export function setAllDays(availability, enabled, from='00:00', to='23:59') {
  const next = { ...availability, mode: 'weekly', weekly: { ...availability.weekly } };
  HEB_DAYS.forEach(d => {
    next.weekly[d.key] = { enabled, from, to };
  });
  return next;
}
