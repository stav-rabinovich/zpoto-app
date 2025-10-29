// CouponsSection.jsx - ניהול קופונים בפאנל האדמין
import React, { useState, useEffect } from 'react';

const API = "http://localhost:4000";

export default function CouponsSection({ colors }) {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  // טופס יצירת/עריכת קופון
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENTAGE',
    discountValue: '',
    applyTo: 'TOTAL_AMOUNT',
    validUntil: '',
    maxUsage: '',
    isActive: true
  });

  // API client עם token
  const api = {
    get: async (url) => {
      const response = await fetch(`${API}${url}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    post: async (url, data) => {
      const response = await fetch(`${API}${url}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    put: async (url, data) => {
      const response = await fetch(`${API}${url}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    delete: async (url) => {
      const response = await fetch(`${API}${url}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(await response.text());
    }
  };

  // טעינת נתונים
  const loadData = async () => {
    setLoading(true);
    try {
      const [couponsData, statsData] = await Promise.all([
        api.get('/api/admin/coupons'),
        api.get('/api/admin/coupons/stats')
      ]);
      setCoupons(couponsData);
      setStats(statsData);
    } catch (err) {
      setError('שגיאה בטעינת הנתונים: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // איפוס טופס
  const resetForm = () => {
    setFormData({
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      applyTo: 'TOTAL_AMOUNT',
      validUntil: '',
      maxUsage: '',
      isActive: true
    });
    setShowCreateForm(false);
    setEditingCoupon(null);
    setError('');
  };

  // יצירת קופון
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        discountValue: parseFloat(formData.discountValue),
        maxUsage: formData.maxUsage ? parseInt(formData.maxUsage) : null
      };
      await api.post('/api/admin/coupons', data);
      resetForm();
      loadData();
    } catch (err) {
      setError('שגיאה ביצירת הקופון: ' + err.message);
    }
  };

  // עדכון קופון
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        discountValue: parseFloat(formData.discountValue),
        maxUsage: formData.maxUsage ? parseInt(formData.maxUsage) : null
      };
      await api.put(`/api/admin/coupons/${editingCoupon.id}`, data);
      resetForm();
      loadData();
    } catch (err) {
      setError('שגיאה בעדכון הקופון: ' + err.message);
    }
  };

  // מחיקת קופון
  const handleDelete = async (coupon) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הקופון "${coupon.code}"?`)) return;
    
    try {
      await api.delete(`/api/admin/coupons/${coupon.id}`);
      loadData();
    } catch (err) {
      setError('שגיאה במחיקת הקופון: ' + err.message);
    }
  };

  // עריכת קופון
  const handleEdit = (coupon) => {
    setFormData({
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue.toString(),
      applyTo: coupon.applyTo,
      validUntil: new Date(coupon.validUntil).toISOString().slice(0, 16),
      maxUsage: coupon.maxUsage ? coupon.maxUsage.toString() : '',
      isActive: coupon.isActive
    });
    setEditingCoupon(coupon);
    setShowCreateForm(true);
  };

  // פורמט תאריך
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // פורמט הנחה
  const formatDiscount = (coupon) => {
    if (coupon.discountType === 'PERCENTAGE') {
      return `${coupon.discountValue}%`;
    } else {
      return `₪${coupon.discountValue}`;
    }
  };

  // פורמט יישום הנחה
  const formatApplyTo = (applyTo) => {
    return applyTo === 'SERVICE_FEE' ? 'דמי תפעול' : 'סכום כולל';
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <div style={{ fontSize: '18px', color: colors.subtext }}>טוען נתונים...</div>
      </div>
    );
  }

  return (
    <div style={{ direction: 'rtl' }}>
      {/* כותרת וסטטיסטיקות */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: colors.text }}>
            🎟️ ניהול קופונים
          </h2>
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: '12px 24px',
              background: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>➕</span>
            <span>קופון חדש</span>
          </button>
        </div>

        {/* סטטיסטיקות */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div style={{ background: colors.surface, padding: '20px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: '14px', color: colors.subtext, marginBottom: '4px' }}>סה״כ קופונים</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: colors.text }}>{stats.totalCoupons}</div>
            </div>
            <div style={{ background: colors.surface, padding: '20px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: '14px', color: colors.subtext, marginBottom: '4px' }}>קופונים פעילים</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: colors.success }}>{stats.activeCoupons}</div>
            </div>
            <div style={{ background: colors.surface, padding: '20px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: '14px', color: colors.subtext, marginBottom: '4px' }}>סה״כ שימושים</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: colors.primary }}>{stats.totalUsages}</div>
            </div>
            <div style={{ background: colors.surface, padding: '20px', borderRadius: '12px', border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: '14px', color: colors.subtext, marginBottom: '4px' }}>סה״כ הנחות</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: colors.warning }}>₪{stats.totalDiscountAmount}</div>
            </div>
          </div>
        )}
      </div>

      {/* הודעת שגיאה */}
      {error && (
        <div style={{
          background: colors.error + '10',
          border: `1px solid ${colors.error}`,
          color: colors.error,
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px'
        }}>
          {error}
        </div>
      )}

      {/* טופס יצירת/עריכת קופון */}
      {showCreateForm && (
        <div style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px'
        }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: '600', color: colors.text }}>
            {editingCoupon ? 'עריכת קופון' : 'יצירת קופון חדש'}
          </h3>
          
          <form onSubmit={editingCoupon ? handleUpdate : handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              
              {/* קוד קופון */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                  קוד קופון *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="SAVE20"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    direction: 'ltr',
                    textAlign: 'center'
                  }}
                />
              </div>

              {/* סוג הנחה */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                  סוג הנחה *
                </label>
                <select
                  value={formData.discountType}
                  onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="PERCENTAGE">אחוז הנחה (%)</option>
                  <option value="FIXED">סכום קבוע (₪)</option>
                </select>
              </div>

              {/* ערך הנחה */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                  ערך הנחה *
                </label>
                <input
                  type="number"
                  value={formData.discountValue}
                  onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                  placeholder={formData.discountType === 'PERCENTAGE' ? '20' : '50'}
                  min="0"
                  max={formData.discountType === 'PERCENTAGE' ? '100' : undefined}
                  step="0.01"
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* יישום הנחה */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                  יישום הנחה *
                </label>
                <select
                  value={formData.applyTo}
                  onChange={(e) => setFormData({ ...formData, applyTo: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                >
                  <option value="TOTAL_AMOUNT">סכום כולל</option>
                  <option value="SERVICE_FEE">דמי תפעול בלבד</option>
                </select>
              </div>

              {/* תאריך תפוגה */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                  תאריך ושעת תפוגה *
                </label>
                <input
                  type="datetime-local"
                  value={formData.validUntil}
                  onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* מגבלת שימושים */}
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                  מגבלת שימושים (אופציונלי)
                </label>
                <input
                  type="number"
                  value={formData.maxUsage}
                  onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value })}
                  placeholder="100"
                  min="1"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: '6px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* קופון פעיל */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
                <span style={{ fontSize: '14px', fontWeight: '600', color: colors.text }}>קופון פעיל</span>
              </label>
            </div>

            {/* כפתורי פעולה */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                style={{
                  padding: '12px 24px',
                  background: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {editingCoupon ? 'עדכן קופון' : 'צור קופון'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '12px 24px',
                  background: colors.surface,
                  color: colors.text,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                ביטול
              </button>
            </div>
          </form>
        </div>
      )}

      {/* רשימת קופונים */}
      <div style={{
        background: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px 20px',
          background: colors.bg,
          borderBottom: `1px solid ${colors.border}`,
          fontSize: '16px',
          fontWeight: '600',
          color: colors.text
        }}>
          רשימת קופונים ({coupons.length})
        </div>

        {coupons.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: colors.subtext }}>
            אין קופונים במערכת
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: colors.bg }}>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: colors.text, borderBottom: `1px solid ${colors.border}` }}>קוד</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: colors.text, borderBottom: `1px solid ${colors.border}` }}>הנחה</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: colors.text, borderBottom: `1px solid ${colors.border}` }}>יישום</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: colors.text, borderBottom: `1px solid ${colors.border}` }}>תפוגה</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: colors.text, borderBottom: `1px solid ${colors.border}` }}>שימושים</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '14px', fontWeight: '600', color: colors.text, borderBottom: `1px solid ${colors.border}` }}>סטטוס</th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: colors.text, borderBottom: `1px solid ${colors.border}` }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
                      {coupon.code}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: colors.text }}>
                      {formatDiscount(coupon)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: colors.text }}>
                      {formatApplyTo(coupon.applyTo)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: colors.text }}>
                      {formatDate(coupon.validUntil)}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: colors.text }}>
                      {coupon.usageCount}{coupon.maxUsage ? `/${coupon.maxUsage}` : ''}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: coupon.isActive && new Date(coupon.validUntil) > new Date() 
                          ? colors.success + '20' 
                          : colors.error + '20',
                        color: coupon.isActive && new Date(coupon.validUntil) > new Date() 
                          ? colors.success 
                          : colors.error
                      }}>
                        {coupon.isActive && new Date(coupon.validUntil) > new Date() ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEdit(coupon)}
                          style={{
                            padding: '6px 12px',
                            background: colors.warning + '20',
                            color: colors.warning,
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          ✏️ עריכה
                        </button>
                        <button
                          onClick={() => handleDelete(coupon)}
                          style={{
                            padding: '6px 12px',
                            background: colors.error + '20',
                            color: colors.error,
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          🗑️ מחק
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
