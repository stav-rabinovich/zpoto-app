/**
 * useCoupon Hook - ניהול מצב קופונים
 * מכיל את כל הלוגיקה של קופונים במקום אחד
 */

import { useState, useCallback, useEffect } from 'react';
import {
  validateCouponAPI,
  calculateDiscountAPI,
  formatCouponError,
  calculateOperationalFee
} from '../utils/couponUtils';

export const useCoupon = (paymentAmount, apiBaseUrl = 'http://10.0.0.23:4000') => {
  // State
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponValid, setCouponValid] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discount, setDiscount] = useState(null);

  // פונקציית validation
  const validateCoupon = useCallback(async (code) => {
    if (!code.trim()) {
      setCouponError('נא להזין קוד קופון');
      return false;
    }

    setCouponLoading(true);
    setCouponError('');
    setCouponValid(null);

    try {
      console.log('🎟️ [useCoupon] Validating coupon:', code);
      const result = await validateCouponAPI(code, apiBaseUrl);

      if (result.isValid) {
        setCouponValid(true);
        setCouponError('');
        console.log('✅ [useCoupon] Coupon valid, calculating discount...');
        
        // חישוב ההנחה
        const discountResult = await calculateDiscount(code.trim().toUpperCase());
        return discountResult;
      } else {
        setCouponValid(false);
        const errorMessage = formatCouponError(result.errorCode, result.error);
        setCouponError(errorMessage);
        setAppliedCoupon(null);
        setDiscount(null);
        console.log('❌ [useCoupon] Coupon invalid:', errorMessage);
        return false;
      }
    } catch (error) {
      console.error('[useCoupon] Validation error:', error);
      setCouponValid(false);
      setCouponError('שגיאה בבדיקת הקופון');
      setAppliedCoupon(null);
      setDiscount(null);
      return false;
    } finally {
      setCouponLoading(false);
    }
  }, [apiBaseUrl]);

  // פונקציית חישוב הנחה
  const calculateDiscount = useCallback(async (code) => {
    if (!paymentAmount) {
      console.log('❌ [useCoupon] No payment amount provided');
      return false;
    }

    try {
      // פירוק המחיר הכולל לעלות חניה + דמי תפעול
      const totalAmountCents = Math.round(paymentAmount * 100); // המחיר הכולל
      const parkingCostCents = Math.round(totalAmountCents / 1.1); // עלות חניה בלבד
      const operationalFeeCents = totalAmountCents - parkingCostCents; // דמי תפעול (10%)

      console.log('💰 [useCoupon] Calculating discount for:', {
        code,
        parkingCostCents,
        operationalFeeCents,
        totalCents: parkingCostCents + operationalFeeCents
      });

      const result = await calculateDiscountAPI(
        code, 
        parkingCostCents, 
        operationalFeeCents, 
        apiBaseUrl
      );

      if (result.isValid) {
        setAppliedCoupon(result.coupon);
        setDiscount(result.discount);
        console.log('💸 [useCoupon] Discount calculated:', {
          original: result.discount.originalAmountCents / 100,
          discount: result.discount.discountAmountCents / 100,
          final: result.discount.finalAmountCents / 100,
          percentage: result.discount.discountPercentage + '%'
        });
        return true;
      } else {
        console.log('❌ [useCoupon] Discount calculation failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[useCoupon] Discount calculation error:', error);
      return false;
    }
  }, [paymentAmount, apiBaseUrl]);

  // פונקציית הסרת קופון
  const removeCoupon = useCallback(() => {
    console.log('🗑️ [useCoupon] Removing coupon');
    setCouponCode('');
    setCouponValid(null);
    setCouponError('');
    setAppliedCoupon(null);
    setDiscount(null);
  }, []);

  // פונקציית רענון הנחה
  const refreshDiscount = useCallback(async () => {
    if (appliedCoupon && couponCode && paymentAmount) {
      console.log('🔄 [useCoupon] Refreshing discount calculation');
      return await calculateDiscount(couponCode);
    }
    return false;
  }, [appliedCoupon, couponCode, paymentAmount, calculateDiscount]);

  // עדכון אוטומטי של הנחה כשמשתנה המחיר
  useEffect(() => {
    if (appliedCoupon && paymentAmount) {
      const timeoutId = setTimeout(() => {
        refreshDiscount();
      }, 500); // דיליי קטן למניעת קריאות מיותרות

      return () => clearTimeout(timeoutId);
    }
  }, [paymentAmount, appliedCoupon, refreshDiscount]);

  // חישוב מחיר סופי
  const finalAmount = discount ? discount.finalAmountCents / 100 : paymentAmount;

  // פונקציית איפוס מצב כשמשנים את הקוד
  const handleCodeChange = useCallback((text) => {
    setCouponCode(text.toUpperCase());
    // איפוס מצב קודם כשמשנים את הטקסט
    if (couponValid !== null) {
      setCouponValid(null);
      setCouponError('');
      setAppliedCoupon(null);
      setDiscount(null);
    }
  }, [couponValid]);

  // פונקציית בדיקה מהירה
  const quickValidate = useCallback(async () => {
    if (couponCode.trim()) {
      return await validateCoupon(couponCode);
    }
    return false;
  }, [couponCode, validateCoupon]);

  return {
    // State
    couponCode,
    couponLoading,
    couponValid,
    couponError,
    appliedCoupon,
    discount,
    finalAmount,
    
    // Actions
    setCouponCode: handleCodeChange,
    validateCoupon,
    calculateDiscount,
    removeCoupon,
    refreshDiscount,
    quickValidate,
    
    // Computed
    hasDiscount: !!discount,
    isValid: couponValid === true,
    isInvalid: couponValid === false,
    savings: discount ? discount.discountAmountCents / 100 : 0,
    savingsPercentage: discount ? discount.discountPercentage : 0
  };
};

export default useCoupon;
