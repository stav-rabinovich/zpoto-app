/**
 * מנגנון Queue לבקשות שנכשלו - בזיכרון בלבד (לא AsyncStorage!)
 * מחליף את כל מנגנוני ה-fallback המקומיים
 */

class RequestQueue {
  constructor() {
    this.queue = []; // רק בזיכרון!
    this.isProcessing = false;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 שניה
    this.maxQueueSize = 50; // מקסימום 50 בקשות בתור
  }

  /**
   * הוספת בקשה לתור
   */
  addRequest(request) {
    // בדיקת גודל התור
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('🚫 Request queue is full, dropping oldest request');
      this.queue.shift(); // הסרת הבקשה הישנה ביותר
    }

    const queueItem = {
      id: Date.now() + Math.random(),
      request,
      retries: 0,
      addedAt: new Date(),
      lastAttempt: null,
      status: 'pending' // pending, processing, failed, completed
    };

    this.queue.push(queueItem);
    console.log(`📥 Added request to queue: ${request.method} ${request.url}`);
    
    // התחלת עיבוד אוטומטי
    this.processQueue();
    
    return queueItem.id;
  }

  /**
   * עיבוד התור
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 Processing queue with ${this.queue.length} items`);

    while (this.queue.length > 0) {
      const item = this.queue[0];
      
      if (item.status === 'completed') {
        this.queue.shift();
        continue;
      }

      if (item.retries >= this.maxRetries) {
        console.error(`❌ Request failed after ${this.maxRetries} retries:`, item.request.url);
        item.status = 'failed';
        this.queue.shift();
        continue;
      }

      try {
        item.status = 'processing';
        item.lastAttempt = new Date();
        item.retries++;

        console.log(`🔄 Attempting request (${item.retries}/${this.maxRetries}):`, item.request.url);
        
        // ביצוע הבקשה
        const result = await this.executeRequest(item.request);
        
        console.log(`✅ Request completed:`, item.request.url);
        item.status = 'completed';
        this.queue.shift();

        // קריאה ל-callback אם קיים
        if (item.request.onSuccess) {
          item.request.onSuccess(result);
        }

      } catch (error) {
        console.warn(`⚠️ Request failed (attempt ${item.retries}):`, error.message);
        item.status = 'pending';

        if (item.retries < this.maxRetries) {
          // המתנה לפני ניסיון הבא
          await this.sleep(this.retryDelay * item.retries);
        } else {
          // כישלון סופי
          if (item.request.onError) {
            item.request.onError(error);
          }
        }
      }
    }

    this.isProcessing = false;
    console.log('✅ Queue processing completed');
  }

  /**
   * ביצוע בקשה בודדת
   */
  async executeRequest(request) {
    const { method, url, data, headers } = request;
    
    // כאן נשתמש ב-API client הרגיל
    const api = require('./api').default;
    
    const config = {
      method,
      url,
      ...(data && { data }),
      ...(headers && { headers })
    };

    const response = await api(config);
    return response.data;
  }

  /**
   * המתנה
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ניקוי התור
   */
  clearQueue() {
    const clearedCount = this.queue.length;
    this.queue = [];
    console.log(`🧹 Cleared ${clearedCount} items from queue`);
    return clearedCount;
  }

  /**
   * קבלת מצב התור
   */
  getQueueStatus() {
    const pending = this.queue.filter(item => item.status === 'pending').length;
    const processing = this.queue.filter(item => item.status === 'processing').length;
    const failed = this.queue.filter(item => item.status === 'failed').length;

    return {
      total: this.queue.length,
      pending,
      processing,
      failed,
      isProcessing: this.isProcessing
    };
  }

  /**
   * הסרת בקשה ספציפית
   */
  removeRequest(requestId) {
    const index = this.queue.findIndex(item => item.id === requestId);
    if (index !== -1) {
      const removed = this.queue.splice(index, 1)[0];
      console.log(`🗑️ Removed request from queue:`, removed.request.url);
      return true;
    }
    return false;
  }

  /**
   * בדיקה אם התור ריק
   */
  isEmpty() {
    return this.queue.length === 0;
  }

  /**
   * קבלת רשימת הבקשות הכושלות
   */
  getFailedRequests() {
    return this.queue.filter(item => item.status === 'failed');
  }
}

// יצירת instance יחיד (singleton)
const requestQueue = new RequestQueue();

export default requestQueue;

/**
 * פונקציות עזר לשימוש קל
 */

/**
 * הוספת בקשה לתור עם callback
 */
export const queueRequest = (method, url, data = null, options = {}) => {
  const request = {
    method: method.toUpperCase(),
    url,
    data,
    headers: options.headers,
    onSuccess: options.onSuccess,
    onError: options.onError
  };

  return requestQueue.addRequest(request);
};

/**
 * הוספת בקשה POST לתור
 */
export const queuePost = (url, data, options = {}) => {
  return queueRequest('POST', url, data, options);
};

/**
 * הוספת בקשה PUT לתור
 */
export const queuePut = (url, data, options = {}) => {
  return queueRequest('PUT', url, data, options);
};

/**
 * הוספת בקשה DELETE לתור
 */
export const queueDelete = (url, options = {}) => {
  return queueRequest('DELETE', url, null, options);
};

/**
 * קבלת מצב התור
 */
export const getQueueStatus = () => {
  return requestQueue.getQueueStatus();
};

/**
 * ניקוי התור
 */
export const clearQueue = () => {
  return requestQueue.clearQueue();
};
