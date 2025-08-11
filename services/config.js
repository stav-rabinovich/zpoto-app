// services/config.js
// נקודת קונפיג מרכזית להחלפה קלה בין "לוקלי" ל"שרת".
export const DATA_SOURCE = 'local'; // 'local' | 'remote'

// אם ו/כשתעברו לשרת – עדכנו כאן:
export const API_BASE = 'https://api.zpoto.example.com'; // דוגמה בלבד
// ואפשר להחזיק כאן גם token/JWT וכו' (באפליקציה אמיתי – מאובטח יותר)
