// [MOBILE] src/config/api.js
import { Platform } from "react-native";

export const API_BASE =
  Platform.OS === "android"
    ? "http://10.0.2.2:4000" // אמולטור אנדרואיד
    : "http://localhost:4000"; // סימולטור iOS
