"use strict";
/**
 * Response Formatter Middleware
 * מטרה: לאחיד את כל ה-JSON responses בפורמט אחיד
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiResponse = exports.responseFormatter = void 0;
/**
 * Middleware לאחידות responses
 */
const responseFormatter = (req, res, next) => {
    // פונקציה לתגובת הצלחה
    res.success = (data, message) => {
        const response = {
            success: true,
            timestamp: new Date().toISOString(),
        };
        if (message) {
            response.message = message;
        }
        if (data !== undefined) {
            response.data = data;
        }
        res.json(response);
    };
    // פונקציה לתגובת שגיאה
    res.error = (message, statusCode = 400, data) => {
        const response = {
            success: false,
            error: message,
            timestamp: new Date().toISOString(),
        };
        if (data !== undefined) {
            response.data = data;
        }
        res.status(statusCode).json(response);
    };
    next();
};
exports.responseFormatter = responseFormatter;
/**
 * פורמטים סטנדרטיים לתגובות נפוצות
 */
class ApiResponse {
    // תגובת הצלחה עם נתונים
    static success(res, data, message) {
        res.success(data, message);
    }
    // תגובת הצלחה פשוטה
    static ok(res, message = 'Success') {
        res.success(undefined, message);
    }
    // נתונים נוצרו בהצלחה
    static created(res, data, message = 'Created successfully') {
        res.status(201);
        res.success(data, message);
    }
    // לא נמצא
    static notFound(res, message = 'Not found') {
        res.error(message, 404);
    }
    // שגיאת validation
    static badRequest(res, message = 'Bad request', data) {
        res.error(message, 400, data);
    }
    // לא מורשה
    static unauthorized(res, message = 'Unauthorized') {
        res.error(message, 401);
    }
    // אסור
    static forbidden(res, message = 'Forbidden') {
        res.error(message, 403);
    }
    // שגיאת שרת
    static serverError(res, message = 'Internal server error') {
        res.error(message, 500);
    }
    // שגיאה מותאמת אישית
    static customError(res, message, statusCode, data) {
        res.error(message, statusCode, data);
    }
}
exports.ApiResponse = ApiResponse;
/**
 * דוגמאות לשימוש:
 *
 * // הצלחה עם נתונים
 * ApiResponse.success(res, users, 'Users retrieved successfully');
 *
 * // יצירה
 * ApiResponse.created(res, newUser, 'User created successfully');
 *
 * // לא נמצא
 * ApiResponse.notFound(res, 'User not found');
 *
 * // שגיאת validation
 * ApiResponse.badRequest(res, 'Invalid email format');
 */
