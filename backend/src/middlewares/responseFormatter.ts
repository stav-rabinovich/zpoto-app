/**
 * Response Formatter Middleware
 * מטרה: לאחיד את כל ה-JSON responses בפורמט אחיד
 */

import { Request, Response, NextFunction } from 'express';

// הרחבת Response type
declare global {
  namespace Express {
    interface Response {
      success: (data?: any, message?: string) => void;
      error: (message: string, statusCode?: number, data?: any) => void;
    }
  }
}

/**
 * Middleware לאחידות responses
 */
export const responseFormatter = (req: Request, res: Response, next: NextFunction) => {
  // פונקציה לתגובת הצלחה
  res.success = (data?: any, message?: string) => {
    const response: any = {
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
  res.error = (message: string, statusCode: number = 400, data?: any) => {
    const response: any = {
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

/**
 * פורמטים סטנדרטיים לתגובות נפוצות
 */
export class ApiResponse {
  // תגובת הצלחה עם נתונים
  static success(res: Response, data?: any, message?: string) {
    res.success(data, message);
  }

  // תגובת הצלחה פשוטה
  static ok(res: Response, message: string = 'Success') {
    res.success(undefined, message);
  }

  // נתונים נוצרו בהצלחה
  static created(res: Response, data?: any, message: string = 'Created successfully') {
    res.status(201);
    res.success(data, message);
  }

  // לא נמצא
  static notFound(res: Response, message: string = 'Not found') {
    res.error(message, 404);
  }

  // שגיאת validation
  static badRequest(res: Response, message: string = 'Bad request', data?: any) {
    res.error(message, 400, data);
  }

  // לא מורשה
  static unauthorized(res: Response, message: string = 'Unauthorized') {
    res.error(message, 401);
  }

  // אסור
  static forbidden(res: Response, message: string = 'Forbidden') {
    res.error(message, 403);
  }

  // שגיאת שרת
  static serverError(res: Response, message: string = 'Internal server error') {
    res.error(message, 500);
  }

  // שגיאה מותאמת אישית
  static customError(res: Response, message: string, statusCode: number, data?: any) {
    res.error(message, statusCode, data);
  }
}

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
