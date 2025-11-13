/* eslint-disable no-unused-vars */
// DashboardNew.jsx - דשבורד אדמין מחודש
import React, { useState, useEffect, useCallback } from 'react';
import OnboardingForm from './OnboardingForm';
import DocumentsSection from './DocumentsSection';
import CouponsSection from './CouponsSection';

export default function Dashboard({ stats, users, rows, parkings, allBookings, approve, reject, load, activeTab, setActiveTab, logout }) {
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedParking, setSelectedParking] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [topTab, setTopTab] = useState('main');

  const colors = {
    primary: '#7F93FF',
    secondary: '#A47BFF',
    accent: '#6FD6FF',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    text: '#0F172A',
    subtext: '#64748B',
    border: '#E2E8F0',
  };

  // אם עורכים בקשה - הצג טופס אונבורדינג
  if (editingRequest) {
    return (
      <div style={{ minHeight: '100vh', width: '100%', background: colors.bg, padding: '24px 8px', direction: 'rtl' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, padding: '0 40px' }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: '700', color: colors.primary, borderBottom: `3px solid ${colors.primary}`, paddingBottom: 12 }}>
              עריכת נתוני אונבורדינג - {editingRequest.address}
            </h1>
          <button
            onClick={() => setEditingRequest(null)}
            style={{
              padding: '12px 24px',
              background: 'white',
              border: `2px solid ${colors.border}`,
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: '600',
              color: colors.text,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>←</span>
            <span>חזרה לבקשות</span>
          </button>
        </div>
        <OnboardingForm
          requestId={editingRequest.id}
          initialData={(() => {
            // אם יש onboarding - השתמש בו אבל אחד את הכתובת
            if (editingRequest.onboarding) {
              try {
                const parsed = JSON.parse(editingRequest.onboarding);
                // אם יש נתוני אונבורדינג ישנים עם שדות נפרדים, אחד אותם
                if (parsed.fullAddress && parsed.city && !parsed.fullAddress.includes(parsed.city)) {
                  parsed.fullAddress = `${parsed.fullAddress}, ${parsed.city}`;
                }
                return parsed;
              } catch (e) {
                console.error('Failed to parse onboarding:', e);
              }
            }
            // אחרת - מילוי אוטומטי מהבקשה
            // אחד את fullAddress ו-city לכתובת מלאה
            const streetAddress = editingRequest.fullAddress || editingRequest.address?.split(',')[0]?.trim() || '';
            const cityName = editingRequest.city || editingRequest.address?.split(',')[1]?.trim() || '';
            const combinedAddress = streetAddress && cityName ? `${streetAddress}, ${cityName}` : streetAddress || editingRequest.address || '';
            
            return {
              fullName: editingRequest.user?.name || '',
              email: editingRequest.user?.email || '',
              phone: editingRequest.phone || '',
              fullAddress: combinedAddress,
              city: cityName,
            };
          })()}
          onSave={async (data) => {
            try {
              await fetch(`http://localhost:4000/api/admin/listing-requests/${editingRequest.id}/onboarding`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
                },
                body: JSON.stringify({ onboarding: JSON.stringify(data) }),
              });
              alert('נתוני האונבורדינג נשמרו בהצלחה!');
              setEditingRequest(null);
              load();
            } catch (error) {
              console.error('Error saving onboarding:', error);
              alert('שגיאה בשמירת הנתונים');
            }
          }}
          onCancel={() => setEditingRequest(null)}
          colors={colors}
          approve={approve}
          reject={reject}
          onParkingCreated={(parking) => {
            setEditingRequest(null);
            setSelectedParking(parking);
            setActiveTab('parkings'); // מעבר לטאב חניות
            load(); // רענון נתונים
          }}
        />
      </div>
    );
  }

  // אם יש משתמש נבחר - הצג את הפרטים שלו
  if (selectedUser) {
    return <UserDetailView user={selectedUser} onBack={() => setSelectedUser(null)} colors={colors} />;
  }

  // אם יש חניה נבחרת - הצג את הפרטים שלה
  if (selectedParking) {
    return <ParkingDetailView parking={selectedParking} onBack={() => setSelectedParking(null)} colors={colors} />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: colors.bg,
      direction: 'rtl',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    }}>
      {/* Top Bar */}
      <div style={{
        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
        padding: '16px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 28 }}>🚗</div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: '700', color: 'white' }}>Zpoto Admin</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <TopTabButton label="ראשי" active={topTab === 'main'} onClick={() => setTopTab('main')} />
            <TopTabButton label="סטטיסטיקות" active={topTab === 'stats'} onClick={() => setTopTab('stats')} />
            <TopTabButton label="הכנסות" active={topTab === 'revenue'} onClick={() => setTopTab('revenue')} />
            <TopTabButton label="תשלומים" active={topTab === 'payouts'} onClick={() => setTopTab('payouts')} />
            <TopTabButton label="דיוור" active={topTab === 'emails'} onClick={() => setTopTab('emails')} />
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            padding: '10px 20px',
            background: 'rgba(239, 68, 68, 0.95)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: 14,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          🚪 התנתק
        </button>
      </div>
          
      {/* Main Container */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{
          width: '100%',
          minWidth: 240,
          background: `linear-gradient(180deg, ${colors.primary}15, ${colors.secondary}10)`,
          borderRight: `1px solid ${colors.border}`,
          padding: 24,
          overflowY: 'auto',
          height: 'calc(100vh - 72px)',
        }}>
        {/* Navigation */}
        <div>
          <div style={{ fontSize: 12, fontWeight: '600', color: colors.subtext, marginBottom: 12, textTransform: 'uppercase' }}>
            תפריט
          </div>
          <NavItem
            icon="📋"
            label="בקשות בעלי חניות"
            count={rows.filter(r => r.status === 'PENDING').length}
            active={activeTab === 'requests'}
            onClick={() => {
              setTopTab('main');
              setActiveTab('requests');
            }}
            colors={colors}
          />
          <NavItem
            icon="👥"
            label="משתמשים"
            count={users.filter(u => u.role !== 'ADMIN').length}
            active={activeTab === 'users'}
            onClick={() => {
              setTopTab('main');
              setActiveTab('users');
            }}
            colors={colors}
          />
          <NavItem
            icon="🅿️"
            label="חניות"
            count={stats?.totalParkings}
            active={activeTab === 'parkings'}
            onClick={() => {
              setTopTab('main');
              setActiveTab('parkings');
            }}
            colors={colors}
          />
          <NavItem
            icon="📅"
            label="הזמנות"
            count={parkings.length}
            active={activeTab === 'bookings'}
            onClick={() => {
              setActiveTab('bookings');
              setEditingRequest(null);
              setSelectedOwner(null);
            }}
          />
          <NavItem
            icon="💬"
            label="צ'אט"
            count={0}
            active={activeTab === 'chat'}
            onClick={() => {
              setActiveTab('chat');
              setEditingRequest(null);
              setSelectedOwner(null);
            }}
          />
          <NavItem
            icon="🎟️"
            label="קופונים"
            count={0}
            active={activeTab === 'coupons'}
            onClick={() => {
              setActiveTab('coupons');
              setEditingRequest(null);
              setSelectedOwner(null);
            }}
          />
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, padding: '24px 16px', minWidth: 0, width: '100%' }}>
          {topTab === 'main' && (
            <>
              {activeTab === 'requests' && (
                <RequestsView rows={rows} approve={approve} reject={reject} load={load} colors={colors} onEdit={setEditingRequest} />
              )}
              {activeTab === 'users' && (
                <UsersView users={users} onSelectUser={setSelectedUser} colors={colors} />
              )}
              {activeTab === 'parkings' && (
                <ParkingsView parkings={parkings} onSelectParking={setSelectedParking} colors={colors} />
              )}
              {activeTab === 'bookings' && (
                <BookingsView bookings={allBookings} colors={colors} />
              )}
              {activeTab === 'chat' && (
                <ChatView colors={colors} />
              )}
              {activeTab === 'coupons' && (
                <CouponsSection colors={colors} />
              )}
            </>
          )}
          {topTab === 'stats' && (
            <StatsView stats={stats} users={users} parkings={parkings} colors={colors} />
          )}
          {topTab === 'revenue' && (
            <RevenueView stats={stats} colors={colors} />
          )}
          {topTab === 'payouts' && (
            <PayoutsView colors={colors} />
          )}
          {topTab === 'emails' && (
            <EmailsView users={users} colors={colors} />
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

function TopTabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 20px',
        background: active ? 'rgba(255,255,255,0.25)' : 'transparent',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontWeight: active ? '700' : '500',
        fontSize: 14,
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        if (!active) e.target.style.background = 'rgba(255,255,255,0.15)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.target.style.background = 'transparent';
      }}
    >
      {label}
    </button>
  );
}

// Mini Stat Card for Sidebar
function StatMiniCard({ icon, label, value, colors }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      background: colors.bg,
      borderRadius: 8,
    }}>
      <div style={{ fontSize: 20 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: colors.subtext, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>{value}</div>
      </div>
    </div>
  );
}

// Navigation Item
function NavItem({ icon, label, count, active, onClick, colors }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        marginBottom: 4,
        background: active ? `linear-gradient(135deg, ${colors?.primary || '#2563EB'}, ${colors?.secondary || '#A47BFF'})` : 'transparent',
        color: active ? 'white' : '#0F172A',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: active ? '600' : '500',
        transition: 'all 0.2s',
        textAlign: 'right',
      }}
      onMouseEnter={(e) => {
        if (!active) e.target.style.background = colors?.bg || '#f8f9fa';
      }}
      onMouseLeave={(e) => {
        if (!active) e.target.style.background = 'transparent';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span>{label}</span>
      </div>
      {count !== undefined && (
        <span style={{
          padding: '2px 8px',
          background: active ? 'rgba(255,255,255,0.2)' : colors?.primary,
          color: active ? 'white' : 'white',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: '600',
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

// Requests View
function RequestsView({ rows, approve, reject, load, colors, onEdit }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: '700', color: colors.text }}>בקשות בעלי חניות</h1>
        <button
          onClick={load}
          style={{
            padding: '10px 20px',
            background: colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: 14,
          }}
        >
          🔄 רענון
        </button>
      </div>

      {rows.length === 0 ? (
        <div style={{
          background: 'white',
          borderRadius: 16,
          padding: 60,
          textAlign: 'center',
          color: colors.subtext,
        }}>
          אין בקשות ממתינות
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {rows.map(r => (
            <div key={r.id} style={{
              background: 'white',
              borderRadius: 16,
              padding: 24,
              border: `2px solid ${r.status === 'PENDING' ? colors.warning : r.status === 'APPROVED' ? colors.success : colors.error}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: 20, fontWeight: '700', color: colors.text }}>
                    {r.address}
                  </h3>
                  <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
                    <InfoRow 
                      icon="👤" 
                      label="שם הלקוח" 
                      value={(() => {
                        // 1. נסה user.name קודם
                        if (r.user?.name && r.user.name.trim() !== '') {
                          return r.user.name;
                        }
                        
                        // 2. נסה onboarding.fullName
                        if (r.onboarding) {
                          try {
                            const onboardingData = JSON.parse(r.onboarding);
                            if (onboardingData.fullName && onboardingData.fullName.trim() !== '') {
                              return onboardingData.fullName;
                            }
                          } catch (e) {
                            // שקט, נמשיך הלאה
                          }
                        }
                        
                        // 3. ברירת מחדל - המייל או 'לא זמין'
                        return r.user?.email || 'לא זמין';
                      })()} 
                      colors={colors} 
                    />
                    <InfoRow icon="💰" label="מחיר" value={`₪${r.firstHourPrice || 10}/שעה`} colors={colors} />
                    <InfoRow icon="📧" label="מייל" value={r.user?.email} colors={colors} />
                    <InfoRow icon="📞" label="טלפון" value={r.phone || 'לא סופק'} colors={colors} />
                  </div>
                  {r.description && (
                    <div style={{
                      padding: 12,
                      background: colors.bg,
                      borderRadius: 8,
                      fontSize: 14,
                      color: colors.text,
                      marginTop: 12,
                    }}>
                      {r.description}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginRight: 24 }}>
                  {r.status === 'PENDING' && (
                    <button
                      onClick={() => onEdit(r)}
                      style={{
                        padding: '12px 24px',
                        background: colors.accent,
                        color: 'white',
                        border: 'none',
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: '600',
                        fontSize: 14,
                      }}
                    >
                      ✎ ערוך אונבורדינג
                    </button>
                  )}
                  {r.status === 'APPROVED' && (
                    <span style={{
                      padding: '10px 20px',
                      background: colors.success,
                      color: 'white',
                      borderRadius: 8,
                      fontWeight: '600',
                      textAlign: 'center',
                    }}>
                      ✓ מאושר
                    </span>
                  )}
                  {r.status === 'REJECTED' && (
                    <span style={{
                      padding: '10px 20px',
                      background: colors.error,
                      color: 'white',
                      borderRadius: 8,
                      fontWeight: '600',
                      textAlign: 'center',
                    }}>
                      ✗ נדחה
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Users View - כל המשתמשים כולל בעלי חניות
function UsersView({ users, onSelectUser, colors }) {
  const allUsers = users.filter(u => u.role !== 'ADMIN'); // הכל חוץ מאדמינים
  const regularUsers = allUsers.filter(u => u.role === 'USER');
  const ownerUsers = allUsers.filter(u => u.role === 'OWNER');

  return (
    <div>
      <h1 style={{ margin: '0 0 24px 0', fontSize: 28, fontWeight: '700', color: colors.text }}>
        כל המשתמשים ({allUsers.length})
      </h1>

      {/* סטטיסטיקות מהירות */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{
          background: '#E3F2FD',
          border: '1px solid #1976D2',
          borderRadius: 12,
          padding: 16,
          textAlign: 'center',
          minWidth: 120
        }}>
          <div style={{ fontSize: 20, fontWeight: '700', color: '#1976D2' }}>{regularUsers.length}</div>
          <div style={{ fontSize: 12, color: '#1976D2' }}>מחפשי חניות</div>
        </div>
        <div style={{
          background: '#E8F5E8',
          border: '1px solid #388E3C',
          borderRadius: 12,
          padding: 16,
          textAlign: 'center',
          minWidth: 120
        }}>
          <div style={{ fontSize: 20, fontWeight: '700', color: '#388E3C' }}>{ownerUsers.length}</div>
          <div style={{ fontSize: 12, color: '#388E3C' }}>בעלי חניות</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {allUsers.map(u => (
          <UserCard 
            key={u.id} 
            user={u} 
            onClick={() => onSelectUser(u)} 
            colors={colors} 
            isOwner={u.role === 'OWNER'} 
          />
        ))}
      </div>
    </div>
  );
}

function UserCard({ user, onClick, colors, isOwner }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: 12,
        padding: 20,
        border: `1px solid ${colors.border}`,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
            {user.name || user.email}
          </div>
          <div style={{ fontSize: 12, color: colors.subtext, marginBottom: 8 }}>
            {user.email}
          </div>
          
          {/* רמז קצר על הפעילות */}
          <div style={{ fontSize: 12, color: colors.subtext }}>
            {user.phone && (
              <div style={{ marginBottom: 4 }}>📞 {user.phone}</div>
            )}
            {user.stats && user.stats.confirmedBookings > 0 && (
              <div>פעיל • {user.stats.confirmedBookings} הזמנות מאושרות</div>
            )}
            {isOwner && user.stats?.totalParkings > 0 && (
              <div>בעל {user.stats.totalParkings} חניות פעילות</div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' }}>
          <span style={{
            padding: '4px 12px',
            background: isOwner ? '#E8F5E8' : '#E3F2FD',
            color: isOwner ? '#388E3C' : '#1976D2',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: '600',
          }}>
            {isOwner ? '🏢 בעל חניה' : '👤 מחפש חניה'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Parkings View
function ParkingsView({ parkings, onSelectParking, colors }) {
  return (
    <div>
      <h1 style={{ margin: '0 0 24px 0', fontSize: 28, fontWeight: '700', color: colors.text }}>חניות</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
        {parkings.map(p => (
          <ParkingCard key={p.id} parking={p} onClick={() => onSelectParking(p)} colors={colors} />
        ))}
      </div>
    </div>
  );
}

function ParkingCard({ parking, onClick, colors }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'white',
        borderRadius: 12,
        padding: 20,
        border: `1px solid ${colors.border}`,
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            {parking.address || parking.title}
          </div>
        </div>
        <span style={{
          padding: '8px 16px',
          background: parking.isActive ? colors.success : colors.error,
          color: 'white',
          borderRadius: 8,
          fontSize: 13,
          fontWeight: '600',
        }}>
          {parking.isActive ? 'פעיל' : 'כבוי'}
        </span>
      </div>
    </div>
  );
}

// Bookings View - מחולק לבוצעו ובוטלו (ללא ממתינות כי הורדנו אישור ידני)
function BookingsView({ bookings, colors }) {
  const completed = bookings.filter(b => b.status === 'CONFIRMED');
  const cancelled = bookings.filter(b => b.status === 'CANCELED' || b.status === 'CANCELLED');
  
  return (
    <div>
      <h1 style={{ margin: '0 0 32px 0', fontSize: 28, fontWeight: '700', color: colors.text }}>הזמנות</h1>
      
      {/* הזמנות שבוצעו */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
          ✅ הזמנות שבוצעו ({completed.length})
        </h2>
        {completed.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: 24, textAlign: 'center', color: colors.subtext }}>
            אין הזמנות שבוצעו עדיין
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {completed.map(b => <BookingCard key={b.id} booking={b} colors={colors} />)}
          </div>
        )}
      </div>

      {/* הזמנות שבוטלו */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
          ❌ הזמנות שבוטלו ({cancelled.length})
        </h2>
        {cancelled.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: 24, textAlign: 'center', color: colors.subtext }}>
            אין הזמנות מבוטלות
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {cancelled.map(b => <BookingCard key={b.id} booking={b} colors={colors} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({ booking, colors }) {
  // פורמט נוח של תאריכים ושעות
  const formatDateTime = (date) => {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
  };

  // חישוב משך הזמנה - אחיד ומדויק
  const calculateDuration = () => {
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    // עיגול לרבע שעה הקרוב (0.25, 0.5, 0.75, 1.0)
    return Math.round(diffHours * 4) / 4;
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 24,
      border: `1px solid ${colors.border}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
            הזמנה #{booking.id}
          </div>
          
          <div style={{ display: 'grid', gap: 8, marginBottom: 16 }}>
            <InfoRow icon="🅿️" label="חניה" value={booking.parking?.title || 'לא זמין'} colors={colors} />
            <InfoRow icon="👤" label="לקוח" value={booking.user?.email || 'לא זמין'} colors={colors} />
          </div>
          
          {/* פרטי זמנים מפורטים */}
          <div style={{ 
            background: colors.bg, 
            borderRadius: 12, 
            padding: 16,
            border: `1px solid ${colors.border}`
          }}>
            <h4 style={{ 
              margin: '0 0 12px 0', 
              fontSize: 14, 
              fontWeight: '600', 
              color: colors.text,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <span>⏰</span>
              פרטי זמנים
            </h4>
            
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: colors.subtext, fontWeight: '500' }}>🟢 התחלה:</span>
                <span style={{ fontSize: 13, fontWeight: '600', color: colors.success }}>
                  {formatDateTime(booking.startTime)}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: colors.subtext, fontWeight: '500' }}>🔴 סיום:</span>
                <span style={{ fontSize: 13, fontWeight: '600', color: colors.error }}>
                  {formatDateTime(booking.endTime)}
                </span>
              </div>
              
              <div style={{ 
                borderTop: `1px solid ${colors.border}`, 
                paddingTop: 8, 
                marginTop: 4,
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center' 
              }}>
                <span style={{ fontSize: 12, color: colors.subtext, fontWeight: '500' }}>⏱️ משך:</span>
                <span style={{ fontSize: 14, fontWeight: '700', color: colors.primary }}>
                  {calculateDuration()} שעות
                </span>
              </div>
              
              {booking.totalPriceCents && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: colors.subtext, fontWeight: '500' }}>💰 עלות:</span>
                  <span style={{ fontSize: 14, fontWeight: '700', color: colors.success }}>
                    ₪{(booking.totalPriceCents / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div style={{ marginRight: 20 }}>
          <span style={{
            padding: '8px 16px',
            background: booking.status === 'CONFIRMED' ? colors.success : booking.status === 'PENDING' ? colors.warning : colors.error,
            color: 'white',
            borderRadius: 10,
            fontSize: 12,
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            textTransform: 'uppercase',
          }}>
            {booking.status === 'CONFIRMED' && '✅'}
            {booking.status === 'PENDING' && '⏳'}
            {booking.status === 'CANCELED' && '❌'}
            {booking.status}
          </span>
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate user parking hours - מדויק לרבעי שעה
function calculateUserParkingHours(user) {
  if (!user.bookings || user.bookings.length === 0) return '0 שעות';
  
  const totalMs = user.bookings.reduce((sum, booking) => {
    const start = new Date(booking.startTime).getTime();
    const end = new Date(booking.endTime).getTime();
    return sum + (end - start);
  }, 0);
  
  const hours = totalMs / (1000 * 60 * 60);
  // עיגול לרבע שעה הקרוב (0.25, 0.5, 0.75, 1.0)
  const roundedHours = Math.round(hours * 4) / 4;
  return `${roundedHours} שעות`;
}

// User Detail View
function UserDetailView({ user, onBack, colors }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: user.name || '',
    phone: user.phone || '',
    email: user.email || '',
  });
  
  const handleSave = async () => {
    try {
      console.log('Saving user data:', editData);
      const response = await fetch(`http://localhost:4000/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify(editData),
      });
      
      const result = await response.json();
      console.log('Server response:', result);
      
      if (response.ok) {
        alert('✅ השינויים נשמרו בהצלחה!');
        setIsEditing(false);
        window.location.reload();
      } else {
        console.error('Error response:', result);
        alert('❌ שגיאה בשמירת השינויים: ' + (result.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('❌ שגיאה בשמירת השינויים: ' + error.message);
    }
  };
  
  return (
    <div style={{ minHeight: '100vh', width: '100%', background: colors.bg, padding: '32px 16px', direction: 'rtl' }}>
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <button
            onClick={onBack}
            style={{
              padding: '12px 24px',
              background: 'white',
              border: `2px solid ${colors.border}`,
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: '600',
              color: colors.text,
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
          >
            ← חזרה
          </button>
          
          <div style={{ display: 'flex', gap: 12 }}>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  padding: '12px 24px',
                  background: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: '600',
                }}
              >
                ✏️ ערוך
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  style={{
                    padding: '12px 24px',
                    background: colors.success,
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                >
                  💾 שמור
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  style={{
                    padding: '12px 24px',
                    background: colors.subtext,
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                >
                  ביטול
                </button>
              </>
            )}
          </div>
        </div>
        
        <div style={{ background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`, borderRadius: 20, padding: 40, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%', 
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              color: 'white',
            }}>
              👤
            </div>
            <div>
              <h1 style={{ margin: '0 0 8px 0', fontSize: 32, fontWeight: '700', color: colors.text }}>
                {user.name || user.email}
              </h1>
              <div style={{ fontSize: 16, color: colors.subtext }}>{user.email}</div>
            </div>
          </div>
        </div>
      
        {/* חלק 1: פרטים יבשים */}
        <div style={{ background: 'white', borderRadius: 20, padding: 32, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>📋</span> פרטי משתמש
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <InfoCard icon="🆔" label="מזהה" value={user.id} colors={colors} />
            {!isEditing ? (
              <>
                <InfoCard icon="👤" label="שם מלא" value={user.name || 'לא זמין'} colors={colors} />
                <InfoCard icon="📞" label="טלפון" value={user.phone || 'לא סופק'} colors={colors} />
                <InfoCard icon="📧" label="מייל" value={user.email} colors={colors} />
              </>
            ) : (
              <>
                <div style={{ background: 'white', borderRadius: 16, padding: 24, border: `2px solid ${colors.border}` }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
                  <div style={{ fontSize: 13, color: colors.subtext, marginBottom: 8, fontWeight: '600' }}>שם מלא</div>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                    style={{ width: '100%', padding: 12, fontSize: 16, fontWeight: '600', border: `2px solid ${colors.border}`, borderRadius: 8 }}
                    placeholder="שם מלא"
                  />
                </div>
                <div style={{ background: 'white', borderRadius: 16, padding: 24, border: `2px solid ${colors.border}` }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📞</div>
                  <div style={{ fontSize: 13, color: colors.subtext, marginBottom: 8, fontWeight: '600' }}>טלפון</div>
                  <input
                    type="tel"
                    value={editData.phone}
                    onChange={(e) => setEditData({...editData, phone: e.target.value})}
                    style={{ width: '100%', padding: 12, fontSize: 16, fontWeight: '600', border: `2px solid ${colors.border}`, borderRadius: 8 }}
                    placeholder="050-1234567"
                  />
                </div>
                <div style={{ background: 'white', borderRadius: 16, padding: 24, border: `2px solid ${colors.border}` }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>📧</div>
                  <div style={{ fontSize: 13, color: colors.subtext, marginBottom: 8, fontWeight: '600' }}>מייל</div>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({...editData, email: e.target.value})}
                    style={{ width: '100%', padding: 12, fontSize: 16, fontWeight: '600', border: `2px solid ${colors.border}`, borderRadius: 8 }}
                    placeholder="example@email.com"
                  />
                </div>
              </>
            )}
            <InfoCard icon="📆" label="תאריך הצטרפות" value={new Date(user.createdAt).toLocaleDateString('he-IL')} colors={colors} />
          </div>
        </div>

        {/* חלק 2: אנליטיקות חניה מסונכרנות */}
        <div style={{ background: 'white', borderRadius: 20, padding: 32, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>📊</span> אנליטיקות חניה
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <InfoCard 
              icon="⏱️" 
              label="שעות חניה שהשלים" 
              value={user.stats?.totalParkingHours ? `${user.stats.totalParkingHours} שעות` : '0 שעות'} 
              colors={colors} 
            />
            <InfoCard 
              icon="📏" 
              label="ממוצע משך חניה" 
              value={user.stats?.averageParkingDuration ? `${user.stats.averageParkingDuration} שעות` : '0 שעות'} 
              colors={colors} 
            />
            <InfoCard 
              icon="💵" 
              label="עלות ממוצעת לחניה" 
              value={user.stats?.averageCostPerBooking ? `₪${user.stats.averageCostPerBooking}` : '₪0'} 
              colors={colors} 
            />
            <InfoCard 
              icon="📅" 
              label="סה״כ הזמנות" 
              value={user.stats?.totalBookings || 0} 
              colors={colors} 
            />
            <InfoCard 
              icon="💰" 
              label="סה״כ סכום שהוציא עד כה" 
              value={user.stats?.totalSpentILS ? `₪${user.stats.totalSpentILS}` : '₪0'} 
              colors={colors} 
            />
            <InfoCard 
              icon="📋" 
              label="בקשות שהגיש" 
              value="" 
              colors={colors} 
            />
          </div>
        </div>

        {/* היסטוריית הזמנות המשתמש */}
        <UserBookingHistorySection userId={user.id} colors={colors} />
      </div>
    </div>
  );
}

// Parking Detail View - עם פרטי בעל החניה
function ParkingDetailView({ parking, onBack, colors }) {
  // בדיקה שהחניה קיימת
  if (!parking || !parking.id) {
    console.error('❌ ParkingDetailView: No parking data provided');
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h2>שגיאה: לא נמצאו נתוני חניה</h2>
        <button onClick={onBack} style={{ padding: '10px 20px', marginTop: 10 }}>
          חזור
        </button>
      </div>
    );
  }

  // Error boundary wrapper
  try {

  const owner = parking.owner || {};
  
  // Debug owner information
  console.log('🏗️ ParkingDetailView rendered with:', {
    parkingId: parking.id,
    ownerId: owner.id,
    ownerEmail: owner.email,
    ownerName: owner.name,
    hasOwner: !!owner.id,
    parkingData: parking
  });

  console.log('🔍 ParkingDetailView: Starting component render');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    isActive: parking.isActive !== false,
  });
  
  const [analyticsView, setAnalyticsView] = useState('daily'); // daily, weekly, monthly
  const [showPricing, setShowPricing] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
    updating: false
  });

  // ניהול חסימת משתמש
  const [blockingData, setBlockingData] = useState({
    loading: false
  });

  // Commission data for this parking
  const [parkingCommissions, setParkingCommissions] = useState(null);
  const [commissionsLoading, setCommissionsLoading] = useState(false);
  
  // פענוח מחירון
  let pricingData = null;
  if (parking.pricing) {
    try {
      pricingData = JSON.parse(parking.pricing);
    } catch {
      console.log('Could not parse pricing');
    }
  }
  
  // נסה לקבל טלפון ושם מלא מהאונבורדינג אם קיים
  let ownerPhone = owner.phone || 'לא סופק';
  let ownerFullName = 'לא זמין';
  let onboardingData = null;
  if (owner.listingRequests && owner.listingRequests.length > 0) {
    const request = owner.listingRequests[0];
    if (request.onboarding) {
      try {
        onboardingData = JSON.parse(request.onboarding);
        if (onboardingData.phone) {
          ownerPhone = onboardingData.phone;
        }
        if (onboardingData.fullName) {
          ownerFullName = onboardingData.fullName;
        }
      } catch (e) {
        console.log('Could not parse onboarding data');
      }
    }
  }
  
  const [ownerEditData, setOwnerEditData] = useState({
    name: ownerFullName !== 'לא זמין' ? ownerFullName : '',
    email: owner.email || '',
    phone: owner.phone || '',
  });

  // טעינת עמלות החניה
  const loadParkingCommissions = useCallback(async () => {
    if (!owner.id || !parking.id) {
      console.log('💰 Missing owner ID or parking ID, skipping commission load', {
        ownerId: owner.id,
        parkingId: parking.id
      });
      return;
    }
    
    setCommissionsLoading(true);
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      console.log('💰 Loading commissions for:', { ownerId: owner.id, parkingId: parking.id, year, month });
      
      const response = await fetch(
        `http://localhost:4000/api/commissions/owner/${owner.id}/commissions?year=${year}&month=${month}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.commissions) {
          // סינון עמלות רק לחניה הספציפית
          const parkingSpecificCommissions = data.data.commissions.filter(
            commission => commission.booking && commission.booking.parkingId === parking.id
          );
          
          // חישוב סיכום לחניה הספציפית
          const totalCommissionCents = parkingSpecificCommissions.reduce((sum, c) => sum + (c.commissionCents || 0), 0);
          const totalNetOwnerCents = parkingSpecificCommissions.reduce((sum, c) => sum + (c.netOwnerCents || 0), 0);
          const totalRevenueCents = parkingSpecificCommissions.reduce((sum, c) => sum + (c.totalPriceCents || 0), 0);
          
          setParkingCommissions({
            commissions: parkingSpecificCommissions,
            summary: {
              count: parkingSpecificCommissions.length,
              totalCommissionCents,
              totalNetOwnerCents,
              totalRevenueCents,
              totalCommissionILS: (totalCommissionCents / 100).toFixed(2),
              totalNetOwnerILS: (totalNetOwnerCents / 100).toFixed(2),
              totalRevenueILS: (totalRevenueCents / 100).toFixed(2)
            }
          });
          
          console.log('💰 Parking commissions loaded:', {
            parkingId: parking.id,
            commissions: parkingSpecificCommissions.length,
            totalNet: (totalNetOwnerCents / 100).toFixed(2)
          });
        } else {
          // אין עמלות - זה בסדר
          console.log('💰 No commissions found for this parking');
          setParkingCommissions({
            commissions: [],
            summary: {
              count: 0,
              totalCommissionCents: 0,
              totalNetOwnerCents: 0,
              totalRevenueCents: 0,
              totalCommissionILS: '0.00',
              totalNetOwnerILS: '0.00',
              totalRevenueILS: '0.00'
            }
          });
        }
      } else {
        console.log('💰 Failed to load commissions, response not ok');
        // במקרה של שגיאה, נגדיר ערכים ריקים
        setParkingCommissions({
          commissions: [],
          summary: {
            count: 0,
            totalCommissionCents: 0,
            totalNetOwnerCents: 0,
            totalRevenueCents: 0,
            totalCommissionILS: '0.00',
            totalNetOwnerILS: '0.00',
            totalRevenueILS: '0.00'
          }
        });
      }
    } catch (error) {
      console.error('💰 Error loading parking commissions:', error);
      // במקרה של שגיאה, נגדיר ערכים ריקים
      setParkingCommissions({
        commissions: [],
        summary: {
          count: 0,
          totalCommissionCents: 0,
          totalNetOwnerCents: 0,
          totalRevenueCents: 0,
          totalCommissionILS: '0.00',
          totalNetOwnerILS: '0.00',
          totalRevenueILS: '0.00'
        }
      });
    } finally {
      setCommissionsLoading(false);
    }
  }, [owner.id, parking.id]);

  // טעינת עמלות בטעינה ראשונית
  React.useEffect(() => {
    console.log('🔄 useEffect for commissions triggered');
    if (owner.id && parking.id) {
      console.log('🔄 Loading parking commissions on mount');
      try {
        loadParkingCommissions();
      } catch (error) {
        console.error('❌ Error calling loadParkingCommissions:', error);
      }
    } else {
      console.log('⚠️ Missing owner.id or parking.id:', { ownerId: owner.id, parkingId: parking.id });
    }
  }, []); // רץ רק פעם אחת בטעינה
  
  const handleSave = async () => {
    try {
      // שמירת פרטי החניה
      const parkingResponse = await fetch(`http://localhost:4000/api/admin/parkings/${parking.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify(editData),
      });
      
      // שמירת פרטי בעל החניה
      const ownerResponse = await fetch(`http://localhost:4000/api/admin/users/${owner.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify(ownerEditData),
      });
      
      // עדכון onboarding אם קיים
      if (owner.listingRequests && owner.listingRequests.length > 0) {
        const request = owner.listingRequests[0];
        if (request.onboarding) {
          try {
            const onboardingData = JSON.parse(request.onboarding);
            onboardingData.fullName = ownerEditData.name;
            onboardingData.phone = ownerEditData.phone;
            
            await fetch(`http://localhost:4000/api/admin/listing-requests/${request.id}/onboarding`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
              },
              body: JSON.stringify({ onboarding: JSON.stringify(onboardingData) }),
            });
          } catch (e) {
            console.log('Could not update onboarding');
          }
        }
      }
      
      if (parkingResponse.ok && ownerResponse.ok) {
        alert('✅ השינויים נשמרו בהצלחה!');
        setIsEditing(false);
        window.location.reload();
      } else {
        alert('❌ שגיאה בשמירת השינויים');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('❌ שגיאה בשמירת השינויים');
    }
  };

  // פונקציית חסימת/ביטול חסימת בעל חניה
  const handleBlockToggle = async () => {
    const isBlocked = parking.owner?.isBlocked;
    const action = isBlocked ? 'ביטול חסימה' : 'חסימה';
    
    if (!window.confirm(
      isBlocked 
        ? `האם להסיר את החסימה מהמשתמש ${owner.email}?\n\nהחניות יופעלו מחדש אך שעות הפעילות יאופסו.`
        : `האם לחסום את המשתמש ${owner.email}?\n\nהחניות יוסרו מהחיפוש והמשתמש לא יוכל להתחבר.`
    )) {
      return;
    }

    setBlockingData({ loading: true });

    try {
      const response = await fetch(`http://localhost:4000/api/admin/users/${owner.id}/block`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ block: !isBlocked }),
      });

      if (response.ok) {
        const result = await response.json();
        const message = isBlocked 
          ? `✅ חסימת המשתמש ${owner.email} בוטלה בהצלחה!\n\nהחניות הופעלו מחדש אך שעות הפעילות אופסו - הבעלים יצטרך להגדיר אותן מחדש.`
          : `🚫 המשתמש ${owner.email} נחסם בהצלחה!\n\nהחניות הוסרו מהחיפוש והמשתמש לא יוכל להתחבר.`;
        
        alert(message);
        
        // רענון הדף כדי לראות את השינויים
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`❌ שגיאה ב${action}: ${error.error || 'שגיאה לא ידועה'}`);
      }
    } catch (error) {
      console.error(`Error ${action}:`, error);
      alert(`❌ שגיאה ב${action}`);
    } finally {
      setBlockingData({ loading: false });
    }
  };
  
  const handleDelete = async () => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק חניה זו?\n\nפעולה זו תגרום ל:\n• מחיקת החניה לחלוטין\n• המשתמש יחזור להיות מחפש חניה\n• יצטרך להגיש בקשה חדשה כדי להיות בעל חניה שוב\n\nפעולה זו בלתי הפיכה!')) {
      return;
    }
    
    try {
      // מחיקת החניה והחזרת המשתמש למצב מחפש חניה
      const response = await fetch(`http://localhost:4000/api/admin/parkings/${parking.id}/delete-and-reset-owner`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      
      if (response.ok) {
        alert('✅ החניה נמחקה בהצלחה!\n• המשתמש חזר להיות מחפש חניה\n• יצטרך להגיש בקשה חדשה להיות בעל חניה');
        onBack();
      } else {
        alert('❌ שגיאה במחיקת החניה');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('❌ שגיאה במחיקת החניה');
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('הסיסמאות אינן תואמות');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      alert('הסיסמה חייבת להכיל לפחות 6 תווים');
      return;
    }
    
    setPasswordData(prev => ({ ...prev, updating: true }));
    
    try {
      const response = await fetch(`http://localhost:4000/api/admin/parkings/${parking.id}/owner-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ newPassword: passwordData.newPassword }),
      });
      
      if (response.ok) {
        alert('✅ הסיסמה עודכנה בהצלחה!');
        setShowPasswordChange(false);
        setPasswordData({ newPassword: '', confirmPassword: '', updating: false });
      } else {
        const error = await response.json();
        alert(`❌ שגיאה בעדכון הסיסמה: ${error.error || 'שגיאה לא ידועה'}`);
      }
    } catch (error) {
      console.error('Error updating password:', error);
      alert('❌ שגיאה בעדכון הסיסמה');
    } finally {
      setPasswordData(prev => ({ ...prev, updating: false }));
    }
  };
  
  return (
    <div style={{ minHeight: '100vh', width: '100%', background: colors.bg, padding: '32px 16px', direction: 'rtl' }}>
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <button
            onClick={onBack}
            style={{
              padding: '12px 24px',
              background: 'white',
              border: `2px solid ${colors.border}`,
              borderRadius: 10,
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: '600',
              color: colors.text,
              boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
            }}
          >
            ← חזרה
          </button>
          
          <div style={{ display: 'flex', gap: 12 }}>
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    padding: '12px 24px',
                    background: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                >
                  ✏️ ערוך
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    padding: '12px 24px',
                    background: colors.error,
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                >
                  🗑️ מחק
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  style={{
                    padding: '12px 24px',
                    background: colors.success,
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                >
                  💾 שמור
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  style={{
                    padding: '12px 24px',
                    background: colors.subtext,
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 15,
                    fontWeight: '600',
                  }}
                >
                  ביטול
                </button>
              </>
            )}
          </div>
        </div>
      
      {/* כרטיס החניה */}
      <div style={{ background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`, borderRadius: 20, padding: 40, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ 
            width: 80, 
            height: 80, 
            borderRadius: '50%', 
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 36,
            color: 'white',
          }}>
            🅿️
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: '0 0 8px 0', fontSize: 32, fontWeight: '700', color: colors.text }}>
              {parking.address}
            </h1>
          </div>
          <span style={{
            padding: '8px 16px',
            background: editData.isActive ? colors.success : colors.error,
            color: 'white',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: '600',
          }}>
            {editData.isActive ? 'פעיל' : 'כבוי'}
          </span>
        </div>
      </div>
      
      {/* חלק 1: פרטי החניה */}
      <div style={{ background: 'white', borderRadius: 20, padding: 32, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>🅿️</span> פרטי החניה
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          <InfoCard icon="🆔" label="מספר סידורי" value={`#${parking.id}`} colors={colors} />
          <InfoCard icon="📍" label="כתובת" value={parking.address} colors={colors} />
          <InfoCard icon="📆" label="תאריך יצירה" value={new Date(parking.createdAt).toLocaleDateString('he-IL')} colors={colors} />
          <div 
            onClick={() => pricingData && setShowPricing(true)}
            style={{ cursor: pricingData ? 'pointer' : 'default' }}
          >
            <InfoCard icon="💰" label="מחירון" value={parking.pricing ? 'הוגדר - לחץ לצפייה' : 'לא הוגדר'} colors={colors} />
          </div>
          
          {/* פרטים נוספים מאונבורדינג */}
          {onboardingData && (
            <>
              <InfoCard 
                icon="🏠" 
                label="סוג החניה" 
                value={onboardingData.parkingType ? 
                  (() => {
                    const types = {
                      'covered': 'מקורה',
                      'open': 'פתוחה',
                      'underground': 'תת־קרקעי',
                      'street': 'ברחוב'
                    };
                    return types[onboardingData.parkingType] || onboardingData.parkingType;
                  })() : 'לא צוין'
                } 
                colors={colors} 
              />
              <InfoCard 
                icon="🔐" 
                label="סוג גישה" 
                value={onboardingData.accessType && onboardingData.accessType.length > 0 ? 
                  onboardingData.accessType.map(type => {
                    const types = {
                      'gate_code': 'שער עם קוד',
                      'remote': 'שלט רחוק',
                      'guard': 'שומר',
                      'open': 'פתוחה'
                    };
                    return types[type] || type;
                  }).join(', ') : 'לא צוין'
                } 
                colors={colors} 
              />
              <InfoCard 
                icon="🚫" 
                label="מגבלות" 
                value={onboardingData.restrictions && onboardingData.restrictions.length > 0 ? 
                  onboardingData.restrictions.map(restriction => {
                    const restrictions = {
                      'no_gas': 'אין גז',
                      'no_motorcycles': 'אין אופנועים',
                      'other': onboardingData.restrictionsOther || 'אחר'
                    };
                    return restrictions[restriction] || restriction;
                  }).join(', ') : 'אין מגבלות'
                } 
                colors={colors} 
              />
              <InfoCard 
                icon="🚗" 
                label="סוגי רכבים מתאימים" 
                value={onboardingData.vehicleTypes && onboardingData.vehicleTypes.length > 0 ? 
                  onboardingData.vehicleTypes.map(type => {
                    const types = {
                      'mini': 'מיני',
                      'family': 'משפחתי',
                      'suv': 'SUV',
                      'large': 'גדול'
                    };
                    return types[type] || type;
                  }).join(', ') : 'לא צוין'
                } 
                colors={colors} 
              />
              <InfoCard 
                icon="🛡️" 
                label="תנאי בטיחות" 
                value={(() => {
                  const safetyChecks = [
                    { key: 'hasLighting', label: 'תאורה' },
                    { key: 'hasSafeAccess', label: 'גישה בטוחה' },
                    { key: 'hasClearMarking', label: 'סימון ברור' },
                    { key: 'noHazards', label: 'ללא סכנות' }
                  ];
                  
                  const passed = safetyChecks.filter(check => onboardingData[check.key]);
                  const allPassed = passed.length === safetyChecks.length;
                  
                  if (allPassed) {
                    return '✅ עומד בכל תנאי הבטיחות';
                  } else if (passed.length === 0) {
                    return '❌ לא עומד בתנאי הבטיחות';
                  } else {
                    return `⚠️ עומד ב-${passed.length}/${safetyChecks.length} תנאים: ${passed.map(p => p.label).join(', ')}`;
                  }
                })()} 
                colors={colors} 
              />
            </>
          )}
          
          {isEditing && (
            <div style={{ background: 'white', borderRadius: 16, padding: 24, border: `2px solid ${colors.border}` }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔄</div>
              <div style={{ fontSize: 13, color: colors.subtext, marginBottom: 8, fontWeight: '600' }}>סטטוס</div>
              <select
                value={editData.isActive ? 'active' : 'inactive'}
                onChange={(e) => setEditData({...editData, isActive: e.target.value === 'active'})}
                style={{ width: '100%', padding: 12, fontSize: 16, fontWeight: '600', border: `2px solid ${colors.border}`, borderRadius: 8 }}
              >
                <option value="active">פעיל</option>
                <option value="inactive">כבוי</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* אזהרת חניה לא פעילה */}
      {!parking.isActive && (
        <div style={{ 
          background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)', 
          borderRadius: 20, 
          padding: 32, 
          marginBottom: 24, 
          border: '3px solid #F59E0B',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
            <div style={{ 
              fontSize: 48, 
              background: '#F59E0B', 
              borderRadius: '50%', 
              width: 80, 
              height: 80, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              🚫
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 24, fontWeight: '700', color: '#92400E', marginBottom: 8 }}>
                חניה לא פעילה
              </h3>
              <p style={{ margin: 0, fontSize: 16, color: '#B45309' }}>
                החניה נוצרה במצב חסום ולא מופיעה בחיפוש ללקוחות
              </p>
            </div>
          </div>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.8)', 
            borderRadius: 12, 
            padding: 20,
            border: '2px solid rgba(245, 158, 11, 0.3)'
          }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: 18, fontWeight: '600', color: '#92400E' }}>
              📋 מה צריך לעשות כדי להפעיל את החניה:
            </h4>
            <ul style={{ margin: 0, paddingRight: 20, color: '#B45309' }}>
              <li style={{ marginBottom: 8 }}>📄 <strong>העלה את כל המסמכים הנדרשים</strong> באזור "מערכת מסמכים" למטה</li>
              <li style={{ marginBottom: 8 }}>✅ <strong>אשר את המסמכים</strong> לאחר בדיקה</li>
              <li style={{ marginBottom: 8 }}>🔓 <strong>הסר את החסימה</strong> באזור "פרטי בעל החניה" → "סטטוס משתמש"</li>
              <li>🟢 <strong>הפעל את החניה</strong> באזור "פרטי החניה" → "סטטוס"</li>
            </ul>
          </div>
        </div>
      )}

      {/* פרטי בעל החניה */}
      <div style={{ background: `linear-gradient(135deg, ${colors.primary}08, ${colors.secondary}08)`, borderRadius: 20, padding: 32, marginBottom: 24 }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>👤</span> בעל החניה
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {!isEditing ? (
            <InfoCard icon="👤" label="שם מלא" value={ownerFullName} colors={colors} />
          ) : (
            <div style={{ background: 'white', borderRadius: 16, padding: 24, border: `2px solid ${colors.border}` }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>👤</div>
              <div style={{ fontSize: 13, color: colors.subtext, marginBottom: 8, fontWeight: '600' }}>שם מלא</div>
              <input
                type="text"
                value={ownerEditData.name}
                onChange={(e) => setOwnerEditData({...ownerEditData, name: e.target.value})}
                style={{ width: '100%', padding: 12, fontSize: 16, fontWeight: '600', border: `2px solid ${colors.border}`, borderRadius: 8 }}
                placeholder="שם מלא"
              />
            </div>
          )}
          {!isEditing ? (
            <>
              <InfoCard icon="📧" label="אימייל" value={owner.email || 'לא זמין'} colors={colors} />
              <InfoCard icon="📞" label="טלפון" value={ownerPhone} colors={colors} />
            </>
          ) : (
            <>
              <div style={{ background: 'white', borderRadius: 16, padding: 24, border: `2px solid ${colors.border}` }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📧</div>
                <div style={{ fontSize: 13, color: colors.subtext, marginBottom: 8, fontWeight: '600' }}>אימייל</div>
                <input
                  type="email"
                  value={ownerEditData.email}
                  onChange={(e) => setOwnerEditData({...ownerEditData, email: e.target.value})}
                  style={{ width: '100%', padding: 12, fontSize: 16, fontWeight: '600', border: `2px solid ${colors.border}`, borderRadius: 8 }}
                  placeholder="example@email.com"
                />
              </div>
              <div style={{ background: 'white', borderRadius: 16, padding: 24, border: `2px solid ${colors.border}` }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>📞</div>
                <div style={{ fontSize: 13, color: colors.subtext, marginBottom: 8, fontWeight: '600' }}>טלפון</div>
                <input
                  type="tel"
                  value={ownerEditData.phone}
                  onChange={(e) => setOwnerEditData({...ownerEditData, phone: e.target.value})}
                  style={{ width: '100%', padding: 12, fontSize: 16, fontWeight: '600', border: `2px solid ${colors.border}`, borderRadius: 8 }}
                  placeholder="050-1234567"
                />
              </div>
            </>
          )}
          <InfoCard icon="🆔" label="מזהה משתמש" value={owner.id || 'לא זמין'} colors={colors} />
          <InfoCard icon="📆" label="תאריך הצטרפות" value={owner.createdAt ? new Date(owner.createdAt).toLocaleDateString('he-IL') : 'לא זמין'} colors={colors} />
          
          {/* כרטיס חסימת משתמש */}
          <div style={{ background: 'white', borderRadius: 16, padding: 24, border: `2px solid ${colors.border}` }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>
              {parking.owner?.isBlocked ? '🚫' : '✅'}
            </div>
            <div style={{ fontSize: 13, color: colors.subtext, marginBottom: 8, fontWeight: '600' }}>
              סטטוס משתמש
            </div>
            
            <div style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 }}>
              {parking.owner?.isBlocked ? (
                <span style={{ color: colors.error }}>🚫 משתמש חסום</span>
              ) : (
                <span style={{ color: colors.success }}>✅ משתמש פעיל</span>
              )}
            </div>
            
            <button
              onClick={handleBlockToggle}
              disabled={blockingData.loading}
              style={{
                padding: '8px 16px',
                backgroundColor: parking.owner?.isBlocked ? colors.success : colors.error,
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: '600',
                cursor: blockingData.loading ? 'not-allowed' : 'pointer',
                opacity: blockingData.loading ? 0.7 : 1
              }}
            >
              {blockingData.loading 
                ? (parking.owner?.isBlocked ? 'מבטל חסימה...' : 'חוסם...')
                : (parking.owner?.isBlocked ? 'בטל חסימה' : 'חסום משתמש')
              }
            </button>
          </div>
        </div>
      </div>

      {/* אזור שינוי סיסמה */}
      <div style={{ background: 'white', borderRadius: 20, padding: 32, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>🔐</span> ניהול סיסמת המשתמש
          </h2>
          {!showPasswordChange && (
            <button
              onClick={() => setShowPasswordChange(true)}
              style={{
                padding: '12px 20px',
                backgroundColor: colors.warning,
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <span>🔑</span>
              שנה סיסמה
            </button>
          )}
        </div>

        {showPasswordChange ? (
          <div style={{ 
            padding: 24, 
            background: '#fff7ed', 
            borderRadius: 12, 
            border: '2px solid #fed7aa'
          }}>
            <h3 style={{ 
              margin: '0 0 20px 0', 
              fontSize: 18, 
              fontWeight: '600', 
              color: '#ea580c',
              textAlign: 'center'
            }}>
              🔑 הגדרת סיסמה חדשה
            </h3>
            
            <div style={{ display: 'grid', gap: 16, maxWidth: '400px', margin: '0 auto' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 8, 
                  fontSize: 14, 
                  fontWeight: '600', 
                  color: '#9a3412',
                  textAlign: 'right'
                }}>
                  סיסמה חדשה
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="הזן סיסמה חדשה (לפחות 6 תווים)"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #fed7aa',
                    borderRadius: 8,
                    fontSize: 14,
                    backgroundColor: 'white',
                    color: '#111827'
                  }}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 8, 
                  fontSize: 14, 
                  fontWeight: '600', 
                  color: '#9a3412',
                  textAlign: 'right'
                }}>
                  אישור סיסמה
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="הזן שוב את הסיסמה החדשה"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #fed7aa',
                    borderRadius: 8,
                    fontSize: 14,
                    backgroundColor: 'white',
                    color: '#111827'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16, justifyContent: 'center' }}>
                <button
                  onClick={handlePasswordChange}
                  disabled={passwordData.updating || !passwordData.newPassword || !passwordData.confirmPassword}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: passwordData.updating ? '#9ca3af' : '#ea580c',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: '600',
                    cursor: passwordData.updating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  {passwordData.updating ? (
                    <>
                      <span>⏳</span>
                      מעדכן...
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      עדכן סיסמה
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setShowPasswordChange(false);
                    setPasswordData({ newPassword: '', confirmPassword: '', updating: false });
                  }}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    fontSize: 14,
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', color: colors.subtext, padding: 20 }}>
            <div style={{ fontSize: 16, marginBottom: 8 }}>🔐 ניהול סיסמת המשתמש</div>
            <div style={{ fontSize: 14 }}>לחץ על "שנה סיסמה" כדי להגדיר סיסמה חדשה למשתמש</div>
          </div>
        )}
      </div>

      {/* פרטי חשבון בנק */}
      {onboardingData && (onboardingData.accountOwnerName || onboardingData.bankName) && (
        <div style={{ background: 'white', borderRadius: 20, padding: 32, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>🏦</span> פרטי חשבון בנק
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <InfoCard icon="👤" label="שם בעל החשבון" value={onboardingData.accountOwnerName || 'לא זמין'} colors={colors} />
            <InfoCard icon="🏦" label="שם הבנק" value={onboardingData.bankName || 'לא זמין'} colors={colors} />
            <InfoCard icon="🔢" label="מספר סניף" value={onboardingData.branchNumber || 'לא זמין'} colors={colors} />
            <InfoCard icon="💳" label="מספר חשבון" value={onboardingData.accountNumber || 'לא זמין'} colors={colors} />
          </div>
        </div>
      )}

      {/* מערכת מסמכים חדשה */}
      <DocumentsSection 
        owner={owner} 
        colors={colors} 
      />
      
      {/* חלק 3: אנליטיקות */}
      <div style={{ background: 'white', borderRadius: 20, padding: 32, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>📊</span> אנליטיקות וסטטיסטיקות
          </h2>
          <div style={{ display: 'flex', gap: 8 }}>
            {['daily', 'weekly', 'monthly'].map(view => (
              <button
                key={view}
                onClick={() => setAnalyticsView(view)}
                style={{
                  padding: '8px 16px',
                  background: analyticsView === view ? colors.primary : 'white',
                  color: analyticsView === view ? 'white' : colors.text,
                  border: `2px solid ${colors.primary}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                {view === 'daily' ? 'יומי' : view === 'weekly' ? 'שבועי' : 'חודשי'}
              </button>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
          <InfoCard 
            icon="⏱️" 
            label="שעות חניה שהושכרו" 
            value={parking.stats?.totalParkingHours ? `${parking.stats.totalParkingHours} שעות` : '0 שעות'} 
            colors={colors} 
          />
          <InfoCard 
            icon="🕐" 
            label="שעות פנויות" 
            value={parking.stats?.utilizationRate ? `${(100 - parseFloat(parking.stats.utilizationRate)).toFixed(1)}%` : '100%'} 
            colors={colors} 
          />
          <InfoCard 
            icon="📊" 
            label="אחוז תפוסה" 
            value={parking.stats?.utilizationRate ? `${parking.stats.utilizationRate}%` : '0%'} 
            colors={colors} 
          />
          <InfoCard 
            icon="📏" 
            label="משך חניה ממוצע" 
            value={parking.stats?.averageParkingDuration ? `${parking.stats.averageParkingDuration} שעות` : '0 שעות'} 
            colors={colors} 
          />
          <InfoCard 
            icon="💵" 
            label="הכנסה ממוצעת לשעה" 
            value={parking.stats?.averageRevenuePerHour ? `₪${parking.stats.averageRevenuePerHour}` : '₪0'} 
            colors={colors} 
          />
          <InfoCard 
            icon="📈" 
            label="סה״כ הזמנות מאושרות" 
            value={parking.stats?.confirmedBookings || 0} 
            colors={colors} 
          />
          <InfoCard 
            icon="💰" 
            label="הכנסה נטו לבעל החניה" 
            value={commissionsLoading ? 'טוען...' : `₪${parkingCommissions?.summary?.totalNetOwnerILS || '0.00'}`} 
            colors={colors} 
          />
          <InfoCard 
            icon="🏢" 
            label="עמלת זפוטו מהחניה" 
            value={commissionsLoading ? 'טוען...' : `₪${parkingCommissions?.summary?.totalCommissionILS || '0.00'}`} 
            colors={colors} 
          />
          <InfoCard 
            icon="📅" 
            label="הזמנות השבוע" 
            value={parking.stats?.recentBookingsWeek || 0} 
            colors={colors} 
          />
        </div>
        
        {/* פירוט עמלות החניה */}
        {parkingCommissions && parkingCommissions.commissions && parkingCommissions.commissions.length > 0 && (
          <div style={{ background: colors.bg, borderRadius: 12, padding: 24, marginTop: 20 }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 18, fontWeight: '700', color: colors.text }}>
              💰 פירוט עמלות החודש ({parkingCommissions.summary.count} הזמנות)
            </h3>
            <div style={{ display: 'grid', gap: 12, maxHeight: 300, overflowY: 'auto' }}>
              {parkingCommissions.commissions.map((commission, index) => (
                <div 
                  key={commission.id}
                  style={{ 
                    background: 'white',
                    padding: 12,
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                      הזמנה #{commission.bookingId}
                    </div>
                    <div style={{ fontSize: 12, color: colors.subtext }}>
                      {new Date(commission.calculatedAt).toLocaleDateString('he-IL')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: '700', color: colors.success }}>
                      ₪{(commission.netOwnerCents / 100).toFixed(2)} נטו
                    </div>
                    <div style={{ fontSize: 12, color: colors.subtext }}>
                      עמלה: ₪{(commission.commissionCents / 100).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ background: colors.bg, borderRadius: 12, padding: 24, textAlign: 'center', marginTop: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
          <div style={{ fontSize: 18, color: colors.subtext }}>גרף שעות פעילות יתווסף בקרוב</div>
          <div style={{ fontSize: 14, color: colors.subtext, marginTop: 8 }}>
            יציג את השעות החזקות והחלשות במהלך היום
          </div>
        </div>
      </div>
      
      {/* חלון קופץ - מחירון */}
      {showPricing && pricingData && (
        <div 
          onClick={() => setShowPricing(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 20,
              padding: 40,
              maxWidth: 600,
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              direction: 'rtl',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: '700', color: colors.text }}>
                💰 מחירון החניה
              </h2>
              <button
                onClick={() => setShowPricing(false)}
                style={{
                  padding: '8px 16px',
                  background: colors.error,
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                ✕ סגור
              </button>
            </div>
            
            <div style={{ display: 'grid', gap: 12 }}>
              {Object.entries(pricingData).map(([key, value]) => (
                <div key={key} style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: 16, 
                  background: colors.bg, 
                  borderRadius: 12,
                  border: `2px solid ${colors.border}`,
                }}>
                  <span style={{ fontWeight: '600', color: colors.text }}>
                    {key.replace('hour', 'שעה ')}
                  </span>
                  <span style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>
                    ₪{value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* היסטוריית השכרות */}
      <BookingHistorySection parkingId={parking.id} colors={colors} />
      
      </div>
    </div>
  );

  } catch (error) {
    console.error('❌ ParkingDetailView crashed:', error);
    return (
      <div style={{ padding: 20, textAlign: 'center' }}>
        <h2>שגיאה בטעינת פרטי החניה</h2>
        <p>שגיאה: {error.message}</p>
        <button onClick={onBack} style={{ padding: '10px 20px', marginTop: 10 }}>
          חזור
        </button>
      </div>
    );
  }
}

// Booking History Section Component
function BookingHistorySection({ parkingId, colors }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadBookingHistory();
  }, [parkingId]);

  const loadBookingHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:4000/api/admin/parkings/${parkingId}?includeFullBookingHistory=true`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load booking history');
      }

      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (err) {
      console.error('Error loading booking history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    // עיגול לרבע שעה הקרוב (0.25, 0.5, 0.75, 1.0)
    return Math.round(diffHours * 4) / 4;
  };

  const formatPrice = (priceCents) => {
    return `₪${(priceCents / 100).toFixed(2)}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED': return colors.success;
      case 'PENDING': return colors.warning;
      case 'CANCELLED': return colors.error;
      default: return colors.subtext;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'CONFIRMED': return 'מאושר';
      case 'PENDING': return 'ממתין';
      case 'CANCELLED': return 'בוטל';
      case 'PENDING_APPROVAL': return 'ממתין לאישור';
      case 'REJECTED': return 'נדחה';
      case 'EXPIRED': return 'פג תוקף';
      default: return status;
    }
  };

  const displayedBookings = showAll ? bookings : bookings.slice(0, 10);
  const totalRevenue = bookings
    .filter(b => b.status === 'CONFIRMED')
    .reduce((sum, b) => sum + (b.totalPriceCents || 0), 0);

  if (loading) {
    return (
      <div style={{
        background: colors.surface,
        borderRadius: 16,
        padding: 24,
        marginTop: 24,
        border: `2px solid ${colors.border}`,
      }}>
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 16, color: colors.subtext }}>טוען היסטוריית השכרות...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: colors.surface,
        borderRadius: 16,
        padding: 24,
        marginTop: 24,
        border: `2px solid ${colors.error}`,
      }}>
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 16, color: colors.error, marginBottom: 12 }}>
            שגיאה בטעינת היסטוריית השכרות
          </div>
          <button
            onClick={loadBookingHistory}
            style={{
              padding: '8px 16px',
              background: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: colors.surface,
      borderRadius: 16,
      padding: 24,
      marginTop: 24,
      border: `2px solid ${colors.border}`,
    }}>
      {/* כותרת וסטטיסטיקות */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: '700', color: colors.text }}>
          📊 היסטוריית השכרות
        </h3>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: colors.subtext }}>סה"כ הזמנות</div>
            <div style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>
              {bookings.length}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: colors.subtext }}>הכנסות כוללות</div>
            <div style={{ fontSize: 18, fontWeight: '700', color: colors.success }}>
              {formatPrice(totalRevenue)}
            </div>
          </div>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.subtext }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <div style={{ fontSize: 16 }}>אין עדיין היסטוריית השכרות לחניה זו</div>
        </div>
      ) : (
        <>
          {/* טבלת השכרות */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: '600', color: colors.subtext }}>
                    תאריך
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: '600', color: colors.subtext }}>
                    שעות
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: '600', color: colors.subtext }}>
                    משך
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: '600', color: colors.subtext }}>
                    מזמין
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: '600', color: colors.subtext }}>
                    סכום
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: 14, fontWeight: '600', color: colors.subtext }}>
                    סטטוס
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedBookings.map((booking, index) => (
                  <tr key={booking.id} style={{ 
                    borderBottom: `1px solid ${colors.border}`,
                    backgroundColor: index % 2 === 0 ? colors.bg : 'transparent'
                  }}>
                    <td style={{ padding: '12px 8px', fontSize: 14, color: colors.text }}>
                      {formatDate(booking.startTime)}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 14, color: colors.text }}>
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 14, color: colors.text }}>
                      {calculateDuration(booking.startTime, booking.endTime)} שעות
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 14, color: colors.text }}>
                      <div>{booking.user?.name || 'לא ידוע'}</div>
                      <div style={{ fontSize: 12, color: colors.subtext }}>
                        {booking.user?.email || ''}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 14, fontWeight: '600', color: colors.text }}>
                      {formatPrice(booking.totalPriceCents || 0)}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: '600',
                        backgroundColor: getStatusColor(booking.status) + '20',
                        color: getStatusColor(booking.status),
                      }}>
                        {getStatusText(booking.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* כפתור הצג הכל */}
          {bookings.length > 10 && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                onClick={() => setShowAll(!showAll)}
                style={{
                  padding: '8px 16px',
                  background: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                {showAll ? `הצג פחות (10 מתוך ${bookings.length})` : `הצג הכל (${bookings.length} הזמנות)`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// User Booking History Section Component
function UserBookingHistorySection({ userId, colors }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadUserBookingHistory();
  }, [userId]);

  const loadUserBookingHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Loading user booking history for userId:', userId);
      
      const response = await fetch(`http://localhost:4000/api/admin/users/${userId}?includeFullBookingHistory=true`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to load user booking history');
      }

      const response_data = await response.json();
      console.log('📊 Full API Response:', response_data);
      
      // ה-API מחזיר את הנתונים תחת 'data'
      const userData = response_data.data || response_data;
      console.log('👤 User data:', userData);
      console.log('📋 Bookings data:', userData.bookings);
      console.log('📈 Number of bookings:', userData.bookings ? userData.bookings.length : 0);
      
      setBookings(userData.bookings || []);
    } catch (err) {
      console.error('❌ Error loading user booking history:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (startTime, endTime) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end - start;
    const diffHours = diffMs / (1000 * 60 * 60);
    // עיגול לרבע שעה הקרוב (0.25, 0.5, 0.75, 1.0)
    return Math.round(diffHours * 4) / 4;
  };

  const formatPrice = (priceCents) => {
    return `₪${(priceCents / 100).toFixed(2)}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'CONFIRMED': return colors.success;
      case 'PENDING': return colors.warning;
      case 'CANCELLED': return colors.error;
      default: return colors.subtext;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'CONFIRMED': return 'מאושר';
      case 'PENDING': return 'ממתין';
      case 'CANCELLED': return 'בוטל';
      case 'PENDING_APPROVAL': return 'ממתין לאישור';
      case 'REJECTED': return 'נדחה';
      case 'EXPIRED': return 'פג תוקף';
      default: return status;
    }
  };

  const displayedBookings = showAll ? bookings : bookings.slice(0, 10);
  const totalSpent = bookings
    .filter(b => b.status === 'CONFIRMED')
    .reduce((sum, b) => sum + (b.totalPriceCents || 0), 0);

  console.log('🎯 Component render - bookings:', bookings.length);
  console.log('📋 Displayed bookings:', displayedBookings.length);
  console.log('💰 Total spent:', totalSpent);

  if (loading) {
    return (
      <div style={{
        background: colors.surface,
        borderRadius: 16,
        padding: 24,
        marginTop: 24,
        border: `2px solid ${colors.border}`,
      }}>
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 16, color: colors.subtext }}>טוען היסטוריית הזמנות...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        background: colors.surface,
        borderRadius: 16,
        padding: 24,
        marginTop: 24,
        border: `2px solid ${colors.error}`,
      }}>
        <div style={{ textAlign: 'center', padding: 20 }}>
          <div style={{ fontSize: 16, color: colors.error, marginBottom: 12 }}>
            שגיאה בטעינת היסטוריית הזמנות
          </div>
          <button
            onClick={loadUserBookingHistory}
            style={{
              padding: '8px 16px',
              background: colors.primary,
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            נסה שוב
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: colors.surface,
      borderRadius: 16,
      padding: 24,
      marginTop: 24,
      border: `2px solid ${colors.border}`,
    }}>
      {/* כותרת וסטטיסטיקות */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: '700', color: colors.text }}>
          🚗 היסטוריית הזמנות המשתמש
        </h3>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: colors.subtext }}>סה"כ הזמנות</div>
            <div style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>
              {bookings.length}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: colors.subtext }}>סה"כ הוציא</div>
            <div style={{ fontSize: 18, fontWeight: '700', color: colors.success }}>
              {formatPrice(totalSpent)}
            </div>
          </div>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.subtext }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🚫</div>
          <div style={{ fontSize: 16 }}>המשתמש עדיין לא ביצע הזמנות</div>
        </div>
      ) : (
        <>
          {/* טבלת הזמנות */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${colors.border}` }}>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: '600', color: colors.subtext }}>
                    תאריך
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: '600', color: colors.subtext }}>
                    שעות
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: '600', color: colors.subtext }}>
                    משך
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: '600', color: colors.subtext }}>
                    חניה
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'right', fontSize: 14, fontWeight: '600', color: colors.subtext }}>
                    סכום
                  </th>
                  <th style={{ padding: '12px 8px', textAlign: 'center', fontSize: 14, fontWeight: '600', color: colors.subtext }}>
                    סטטוס
                  </th>
                </tr>
              </thead>
              <tbody>
                {displayedBookings.map((booking, index) => (
                  <tr key={booking.id} style={{ 
                    borderBottom: `1px solid ${colors.border}`,
                    backgroundColor: index % 2 === 0 ? colors.bg : 'transparent'
                  }}>
                    <td style={{ padding: '12px 8px', fontSize: 14, color: colors.text }}>
                      {formatDate(booking.startTime)}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 14, color: colors.text }}>
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 14, color: colors.text }}>
                      {calculateDuration(booking.startTime, booking.endTime)} שעות
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 14, color: colors.text }}>
                      <div>{booking.parking?.title || 'לא ידוע'}</div>
                      <div style={{ fontSize: 12, color: colors.subtext }}>
                        {booking.parking?.address || ''}
                      </div>
                    </td>
                    <td style={{ padding: '12px 8px', fontSize: 14, fontWeight: '600', color: colors.text }}>
                      {formatPrice(booking.totalPriceCents || 0)}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: '600',
                        backgroundColor: getStatusColor(booking.status) + '20',
                        color: getStatusColor(booking.status),
                      }}>
                        {getStatusText(booking.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* כפתור הצג הכל */}
          {bookings.length > 10 && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <button
                onClick={() => setShowAll(!showAll)}
                style={{
                  padding: '8px 16px',
                  background: colors.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: '600',
                }}
              >
                {showAll ? `הצג רק 10 ראשונות` : `הצג את כל ה-${bookings.length} הזמנות`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Info Row Component
function InfoRow({ icon, label, value, colors }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: colors.subtext, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{value}</div>
      </div>
    </div>
  );
}

// Info Card Component - כרטיס מידע מעוצב
function InfoCard({ icon, label, value, colors }) {
  return (
    <div style={{ 
      background: 'white', 
      borderRadius: 16, 
      padding: 24,
      border: `2px solid ${colors.border}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      transition: 'transform 0.2s',
    }}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 13, color: colors.subtext, marginBottom: 8, fontWeight: '600' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>{value}</div>
    </div>
  );
}

// Stats View
function StatsView({ stats, users, parkings, colors }) {
  // סינון משתמשים
  const regularUsers = users?.filter(u => u.role !== 'OWNER' && u.role !== 'ADMIN') || [];
  const owners = users?.filter(u => u.role === 'OWNER') || [];
  
  // אנליטיקות חניות - ממוצעים
  const totalParkings = parkings?.length || 0;
  const activeParkings = parkings?.filter(p => p.isActive).length || 0;
  
  // חישוב ממוצע שעות חניה שהושכרו לכל חניה
  const avgHoursPerParking = totalParkings > 0 ? (0).toFixed(1) : 0; // TODO: חישוב אמיתי
  
  // חישוב ממוצע הכנסה לחניה
  const avgRevenuePerParking = totalParkings > 0 ? Math.floor((stats?.totalRevenueCents || 0) / 100 / totalParkings) : 0;
  
  // אנליטיקות מחפשי חניות - ממוצעים
  const totalUsers = regularUsers.length;
  const totalBookings = stats?.totalBookings || 0;
  
  // חישוב ממוצע הזמנות למשתמש
  const avgBookingsPerUser = totalUsers > 0 ? (totalBookings / totalUsers).toFixed(1) : 0;
  
  // חישוב ממוצע עלות לחניה
  const avgCostPerBooking = totalBookings > 0 ? Math.floor((stats?.totalRevenueCents || 0) / 100 / totalBookings) : 0;

  return (
    <div>
      <h1 style={{ margin: '0 0 24px 0', fontSize: 28, fontWeight: '700', color: colors.text }}>סטטיסטיקות ואנליטיקות</h1>
      
      {/* חלק 1: אנליטיקות חניות */}
      <div style={{ background: 'white', borderRadius: 20, padding: 32, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>🅿️</span> אנליטיקות חניות - ממוצעים
        </h2>
        <div style={{ display: 'grid', gap: 20 }}>
          <InfoCard icon="🅿️" label="סה״כ חניות" value={totalParkings} colors={colors} />
          <InfoCard icon="✅" label="חניות פעילות" value={activeParkings} colors={colors} />
          <InfoCard icon="⏱️" label="ממוצע שעות השכרה" value={`${avgHoursPerParking} שעות`} colors={colors} />
          <InfoCard icon="📏" label="ממוצע משך חניה" value="0 שעות" colors={colors} />
          <InfoCard icon="💵" label="ממוצע הכנסה לחניה" value={`₪${avgRevenuePerParking}`} colors={colors} />
          <InfoCard icon="📈" label="ממוצע הזמנות לחניה" value={(totalParkings > 0 ? (totalBookings / totalParkings).toFixed(1) : 0)} colors={colors} />
        </div>
      </div>

      {/* חלק 2: אנליטיקות מחפשי חניות */}
      <div style={{ background: 'white', borderRadius: 20, padding: 32, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>👥</span> אנליטיקות מחפשי חניות - ממוצעים
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
          <InfoCard icon="👥" label="סה״כ מחפשי חניות" value={totalUsers} colors={colors} />
          <InfoCard icon="📅" label="סה״כ הזמנות" value={totalBookings} colors={colors} />
          <InfoCard icon="📊" label="ממוצע הזמנות למשתמש" value={avgBookingsPerUser} colors={colors} />
          <InfoCard icon="⏱️" label="ממוצע שעות חניה" value="0 שעות" colors={colors} />
          <InfoCard icon="💵" label="ממוצע עלות לחניה" value={`₪${avgCostPerBooking}`} colors={colors} />
          <InfoCard icon="📏" label="ממוצע משך חניה" value="0 שעות" colors={colors} />
        </div>
      </div>
      
      {/* סטטיסטיקות כלליות */}
      <div style={{ background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`, borderRadius: 20, padding: 32, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>📊</span> סטטיסטיקות כלליות
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
          <InfoCard icon="💵" label="סה״כ סכומי עסקאות" value={`₪${Math.floor((stats?.totalRevenueCents || 0) / 100)}`} colors={colors} />
          <InfoCard icon="👤" label="בעלי חניות" value={owners.length} colors={colors} />
          <InfoCard icon="📈" label="אחוז תפוסה כללי" value="0%" colors={colors} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, colors }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 32,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 14, color: colors.subtext, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 36, fontWeight: '700', color: colors.text }}>{value}</div>
    </div>
  );
}

// Revenue Overview Component - סקירת הכנסות מפורטת
function RevenueOverview({ colors }) {
  const [commissionData, setCommissionData] = useState(null);
  const [operationalFeesData, setOperationalFeesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  // טעינת נתוני עמלות ודמי תפעול
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // טעינת נתוני עמלות
        const commissionResponse = await fetch(
          `http://localhost:4000/api/commissions/admin/commissions?year=${selectedMonth.year}&month=${selectedMonth.month}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
            },
          }
        );
        
        // טעינת נתוני דמי תפעול
        const startDate = new Date(selectedMonth.year, selectedMonth.month - 1, 1);
        const endDate = new Date(selectedMonth.year, selectedMonth.month, 0);
        const operationalFeesResponse = await fetch(
          `http://localhost:4000/api/operational-fees/stats?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
            },
          }
        );
        
        if (commissionResponse.ok) {
          const data = await commissionResponse.json();
          setCommissionData(data.data);
          console.log('💰 Commission data loaded:', data.data);
        }
        
        if (operationalFeesResponse.ok) {
          const data = await operationalFeesResponse.json();
          setOperationalFeesData(data.data);
          console.log('💳 Operational fees data loaded:', data.data);
        }
      } catch (error) {
        console.error('💰 Error loading revenue data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedMonth]);

  const revenueData = commissionData ? {
    zpotoRevenue: {
      total: parseFloat(commissionData.totalZpotoRevenueILS),
      owners: commissionData.ownerSummaries.length,
      averagePerOwner: commissionData.ownerSummaries.length > 0 
        ? (parseFloat(commissionData.totalZpotoRevenueILS) / commissionData.ownerSummaries.length).toFixed(2)
        : 0
    },
    ownersRevenue: {
      total: commissionData.ownerSummaries.reduce((sum, owner) => sum + parseFloat(owner.totalNetOwnerILS), 0),
      owners: commissionData.ownerSummaries.length,
      averagePerOwner: commissionData.ownerSummaries.length > 0
        ? (commissionData.ownerSummaries.reduce((sum, owner) => sum + parseFloat(owner.totalNetOwnerILS), 0) / commissionData.ownerSummaries.length).toFixed(2)
        : 0
    },
    operationalFees: operationalFeesData ? {
      total: (() => {
        // חישוב דמי תפעול בפועל לפי כללי הברזל
        if (!operationalFeesData.fees) return 0;
        
        const actualTotal = operationalFeesData.fees.reduce((sum, fee) => {
          const totalPaid = fee.totalPaymentCents; // מה שהמשתמש שילם בפועל
          const parkingCost = fee.parkingCostCents; // עלות החניה
          const actualOperationalFee = totalPaid - parkingCost; // דמי תפעול בפועל
          return sum + actualOperationalFee;
        }, 0);
        
        return actualTotal / 100; // המרה לשקלים
      })(),
      transactions: operationalFeesData.stats.totalTransactions || 0,
      average: operationalFeesData.stats.averageOperationalFee ? (operationalFeesData.stats.averageOperationalFee / 100).toFixed(2) : 0,
      monthly: (() => {
        // חישוב חודשי בפועל
        if (!operationalFeesData.fees) return 0;
        
        const actualMonthly = operationalFeesData.fees.reduce((sum, fee) => {
          const totalPaid = fee.totalPaymentCents;
          const parkingCost = fee.parkingCostCents;
          const actualOperationalFee = totalPaid - parkingCost;
          return sum + actualOperationalFee;
        }, 0);
        
        return actualMonthly / 100;
      })()
    } : {
      total: 0,
      transactions: 0,
      average: 0,
      monthly: 0
    },
    totalTransactions: commissionData.ownerSummaries.reduce((sum, owner) => sum + owner.commissionsCount, 0)
  } : {
    zpotoRevenue: { total: 0, owners: 0, averagePerOwner: 0 },
    ownersRevenue: { total: 0, owners: 0, averagePerOwner: 0 },
    operationalFees: { total: 0, transactions: 0, average: 0, monthly: 0 },
    totalTransactions: 0
  };

  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ 
        margin: '0 0 24px 0', 
        fontSize: 24, 
        fontWeight: '700', 
        color: colors.text,
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }}>
        <span style={{ fontSize: 32 }}>💰</span>
        סקירת הכנסות מפורטת
      </h2>
      
      {/* בחירת חודש */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 24,
        gap: 16
      }}>
        <button
          onClick={() => setSelectedMonth(prev => {
            let newMonth = prev.month - 1;
            let newYear = prev.year;
            if (newMonth < 1) { newMonth = 12; newYear--; }
            return { year: newYear, month: newMonth };
          })}
          style={{
            padding: '8px 12px',
            background: colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          ← חודש קודם
        </button>
        
        <div style={{ 
          fontSize: 18, 
          fontWeight: '600', 
          color: colors.text,
          minWidth: 150,
          textAlign: 'center'
        }}>
          {new Date(selectedMonth.year, selectedMonth.month - 1).toLocaleDateString('he-IL', {
            month: 'long',
            year: 'numeric'
          })}
        </div>
        
        <button
          onClick={() => setSelectedMonth(prev => {
            let newMonth = prev.month + 1;
            let newYear = prev.year;
            if (newMonth > 12) { newMonth = 1; newYear++; }
            return { year: newYear, month: newMonth };
          })}
          style={{
            padding: '8px 12px',
            background: colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          חודש הבא →
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div>טוען נתוני עמלות...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          {/* הכנסות זפוטו (עמלות מבעלי חניות) */}
          <RevenueCard
            title="עמלות מבעלי חניות (15%)"
            icon="🏢"
            color={colors.success}
            mainValue={`₪${revenueData.zpotoRevenue.total.toLocaleString()}`}
            subtitle={`מ-${revenueData.zpotoRevenue.owners} בעלי חניות`}
            details={[
              { label: "ממוצע לבעל חניה", value: `₪${revenueData.zpotoRevenue.averagePerOwner}` },
              { label: "סה״כ עסקאות", value: revenueData.totalTransactions.toString() },
            ]}
            colors={colors}
            isTotal={false}
          />

          {/* דמי תפעול ממחפשי חניה */}
          <RevenueCard
            title="דמי תפעול ממחפשי חניה (10%)"
            icon="💳"
            color={colors.accent}
            mainValue={`₪${(revenueData.operationalFees?.total || 0).toLocaleString()}`}
            subtitle={`מ-${revenueData.operationalFees?.transactions || 0} עסקאות`}
            details={[
              { label: "ממוצע לעסקה", value: `₪${revenueData.operationalFees?.average || 0}` },
              { label: "הכנסה חודשית", value: `₪${(revenueData.operationalFees?.monthly || 0).toLocaleString()}` },
            ]}
            colors={colors}
            isTotal={false}
          />

          {/* סה"כ הכנסות זפוטו */}
          <RevenueCard
            title="סה״כ הכנסות זפוטו"
            icon="💰"
            color={colors.warning}
            mainValue={`₪${((revenueData.zpotoRevenue.total || 0) + (revenueData.operationalFees?.total || 0)).toLocaleString()}`}
            subtitle="עמלות + דמי תפעול"
            details={[
              { label: "עמלות בעלי חניות", value: `₪${revenueData.zpotoRevenue.total.toLocaleString()}` },
              { label: "דמי תפעול מחפשים", value: `₪${(revenueData.operationalFees?.total || 0).toLocaleString()}` },
            ]}
            colors={colors}
            isTotal={true}
          />

          {/* הכנסות בעלי חניות (נטו) */}
          <RevenueCard
            title="הכנסות בעלי חניות (נטו)"
            icon="🏠"
            color={colors.primary}
            mainValue={`₪${revenueData.ownersRevenue.total.toLocaleString()}`}
            subtitle={`מ-${revenueData.ownersRevenue.owners} בעלי חניות`}
            details={[
              { label: "ממוצע לבעל חניה", value: `₪${revenueData.ownersRevenue.averagePerOwner}` },
              { label: "בעלי חניות פעילים", value: revenueData.ownersRevenue.owners.toString() },
            ]}
            colors={colors}
          />

          {/* סיכום כולל */}
          <RevenueCard
            title="סיכום כולל"
            icon="📊"
            color={colors.secondary}
            mainValue={`₪${(revenueData.zpotoRevenue.total + revenueData.ownersRevenue.total).toLocaleString()}`}
            subtitle="סה״כ מחזור החודש"
            details={[
              { label: "עמלת זפוטו", value: `₪${revenueData.zpotoRevenue.total.toLocaleString()}` },
              { label: "נטו לבעלים", value: `₪${revenueData.ownersRevenue.total.toLocaleString()}` },
            ]}
            colors={colors}
          />
        </div>
      )}

      {/* פירוט לפי בעל חניה */}
      {commissionData && commissionData.ownerSummaries.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ 
            fontSize: 20, 
            fontWeight: '600', 
            color: colors.text, 
            marginBottom: 16 
          }}>
            פירוט לפי בעל חניה
          </h3>
          <div style={{ 
            background: 'white', 
            borderRadius: 12, 
            overflow: 'hidden',
            border: `1px solid ${colors.border}`
          }}>
            {commissionData.ownerSummaries.map((owner, index) => (
              <div 
                key={owner.owner.id}
                style={{ 
                  padding: 16, 
                  borderBottom: index < commissionData.ownerSummaries.length - 1 ? `1px solid ${colors.border}` : 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: colors.text }}>
                    {owner.owner.name || owner.owner.email}
                  </div>
                  <div style={{ fontSize: 14, color: colors.subtext }}>
                    {owner.commissionsCount} עסקאות
                  </div>
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', color: colors.success }}>
                    ₪{owner.totalCommissionILS} עמלה
                  </div>
                  <div style={{ fontSize: 14, color: colors.subtext }}>
                    ₪{owner.totalNetOwnerILS} נטו
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Revenue Card Component - כרטיס הכנסה
function RevenueCard({ title, icon, color, mainValue, subtitle, details, colors, isTotal = false }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 24,
      border: `2px solid ${isTotal ? color : colors.border}`,
      boxShadow: isTotal ? `0 4px 20px ${color}20` : '0 2px 8px rgba(0,0,0,0.05)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* רקע דקורטיבי */}
      <div style={{
        position: 'absolute',
        top: -20,
        left: -20,
        width: 60,
        height: 60,
        background: `${color}15`,
        borderRadius: '50%',
        zIndex: 1,
      }} />
      
      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* כותרת */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}>
            {icon}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: '600', color: colors.text }}>
              {title}
            </h3>
          </div>
        </div>

        {/* ערך ראשי */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ 
            fontSize: isTotal ? 32 : 28, 
            fontWeight: '700', 
            color: color,
            marginBottom: 4
          }}>
            {mainValue}
          </div>
          <div style={{ fontSize: 14, color: colors.subtext, fontWeight: '500' }}>
            {subtitle}
          </div>
        </div>

        {/* פרטים נוספים */}
        <div style={{ 
          borderTop: `1px solid ${colors.border}`, 
          paddingTop: 16, 
          marginTop: 16,
          display: 'grid',
          gap: 8
        }}>
          {details.map((detail, index) => (
            <div key={index} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center' 
            }}>
              <span style={{ fontSize: 13, color: colors.subtext }}>
                {detail.label}
              </span>
              <span style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                {detail.value}
              </span>
            </div>
          ))}
        </div>

        {isTotal && (
          <div style={{
            position: 'absolute',
            top: 16,
            left: 16,
            background: color,
            color: 'white',
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: 11,
            fontWeight: '700',
            textTransform: 'uppercase',
            zIndex: 3,
          }}>
            ✨ סה״כ
          </div>
        )}
      </div>
    </div>
  );
}

// Revenue View
function RevenueView({ stats, colors }) {
  const [operationalFeesData, setOperationalFeesData] = useState(null);
  const [loading, setLoading] = useState(true);

  // טעינת נתוני דמי תפעול
  useEffect(() => {
    const loadOperationalFees = async () => {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:4000/api/operational-fees/stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setOperationalFeesData(data.data);
          console.log('💳 Operational fees data loaded:', data.data);
        }
      } catch (error) {
        console.error('💳 Error loading operational fees:', error);
      } finally {
        setLoading(false);
      }
    };

    loadOperationalFees();
  }, []);

  return (
    <div>
      <h1 style={{ margin: '0 0 24px 0', fontSize: 28, fontWeight: '700', color: colors.text }}>הכנסות העסק</h1>
      
      {/* אזור הכנסות מפורט */}
      <RevenueOverview colors={colors} />
      
      {/* פירוט מחפשי חניה */}
      <div 
        style={{ 
          background: `linear-gradient(135deg, ${colors.accent}20, ${colors.primary}20)`, 
          borderRadius: 20, 
          padding: 32, 
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          marginTop: 32
        }}
      >
        <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>🚗</span> פירוט מחפשי חניה
        </h2>
        
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: colors.subtext }}>
            טוען נתוני מחפשי חניה...
          </div>
        ) : operationalFeesData && operationalFeesData.fees ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
            {operationalFeesData.fees.slice(0, 10).map((fee, index) => (
              <div 
                key={fee.id}
                style={{
                  background: 'white',
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                  border: `1px solid ${colors.border}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: '600', color: colors.text }}>
                    הזמנה #{fee.bookingId}
                  </div>
                  <div style={{ fontSize: 16, fontWeight: '700', color: colors.accent }}>
                    ₪{(fee.totalPaymentCents / 100).toFixed(2)}
                  </div>
                </div>
                
                <div style={{ fontSize: 12, color: colors.subtext, marginBottom: 4 }}>
                  {fee.booking?.user?.name || fee.booking?.user?.email || 'משתמש לא ידוע'}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: colors.subtext }}>
                  <span>עלות חניה: ₪{(fee.parkingCostCents / 100).toFixed(2)}</span>
                  <span>דמי תפעול: ₪{(() => {
                    // חישוב דמי תפעול בפועל לפי כללי הברזל
                    const totalPaid = fee.totalPaymentCents; // מה שהמשתמש שילם בפועל
                    const parkingCost = fee.parkingCostCents; // עלות החניה
                    const actualOperationalFee = totalPaid - parkingCost; // דמי תפעול בפועל
                    return (actualOperationalFee / 100).toFixed(2);
                  })()}</span>
                </div>
                
                <div style={{ fontSize: 11, color: colors.subtext, marginTop: 4 }}>
                  {new Date(fee.calculatedAt).toLocaleDateString('he-IL')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: colors.subtext }}>
            אין נתוני דמי תפעול זמינים
          </div>
        )}
      </div>
    </div>
  );
}

// Payouts View - ניהול תשלומים חודשיים
function PayoutsView({ colors }) {
  const [payoutsData, setPayoutsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [processingPayout, setProcessingPayout] = useState(null);
  const [testingPayouts, setTestingPayouts] = useState(false);
  const [testingCommissions, setTestingCommissions] = useState(false);
  const [fixingSystem, setFixingSystem] = useState(false);

  // טעינת נתוני תשלומים
  const loadPayouts = async () => {
    setLoading(true);
    try {
      // קבלת עמלות החודש לכל בעלי החניות
      const response = await fetch(
        `http://localhost:4000/api/commissions/admin/commissions?year=${selectedMonth.year}&month=${selectedMonth.month}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setPayoutsData(data.data.ownerSummaries);
          console.log('💰 Payouts data loaded:', data.data.ownerSummaries);
        }
      }
    } catch (error) {
      console.error('💰 Error loading payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  // בדיקה ידנית של מערכת תשלומים חודשיים
  const testMonthlyPayouts = async () => {
    if (!confirm('האם אתה בטוח שאתה רוצה להריץ בדיקה ידנית של מערכת התשלומים החודשיים?')) {
      return;
    }

    setTestingPayouts(true);
    try {
      const response = await fetch('http://localhost:4000/api/jobs/monthly-payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          alert(`✅ בדיקת תשלומים הושלמה בהצלחה!\n\n${data.message}\n\nנוצרו ${data.data.payoutsCreated.length} תשלומים`);
          loadPayouts(); // רענון הנתונים
        } else {
          alert(`❌ שגיאה בבדיקת תשלומים: ${data.error}`);
        }
      } else {
        alert('❌ שגיאה בקריאה לשרת');
      }
    } catch (error) {
      console.error('❌ Error testing monthly payouts:', error);
      alert('❌ שגיאה בבדיקת תשלומים');
    } finally {
      setTestingPayouts(false);
    }
  };

  // בדיקה מקיפה של מערכת העמלות
  const testCommissionSystem = async () => {
    if (!confirm('האם אתה בטוח שאתה רוצה להריץ בדיקות מקיפות של מערכת העמלות?')) {
      return;
    }

    setTestingCommissions(true);
    try {
      const response = await fetch('http://localhost:4000/api/jobs/test-commission-system', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const results = data.data;
          const passedTests = Object.values(results).filter(r => r.success).length;
          const totalTests = Object.keys(results).length;
          
          alert(`✅ בדיקות מערכת העמלות הושלמו!\n\n${data.message}\n\nתוצאות:\n${passedTests}/${totalTests} בדיקות עברו בהצלחה`);
        } else {
          alert(`❌ שגיאה בבדיקות: ${data.error}`);
        }
      } else {
        alert('❌ שגיאה בקריאה לשרת');
      }
    } catch (error) {
      console.error('❌ Error testing commission system:', error);
      alert('❌ שגיאה בבדיקת מערכת העמלות');
    } finally {
      setTestingCommissions(false);
    }
  };

  // תיקון מערכת - משתמשים שנשארו OWNER ללא חניות
  const fixSystemIssues = async () => {
    if (!confirm('האם אתה בטוח שאתה רוצה לתקן בעיות במערכת?\n\nזה יתקן משתמשים שנשארו עם סטטוס בעל חניה אבל בלי חניות.')) {
      return;
    }

    setFixingSystem(true);
    try {
      const response = await fetch('http://localhost:4000/api/admin/system/auto-fix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const fixedCount = data.results?.[0]?.result?.fixedUsers?.length || 0;
          alert(`✅ תיקון המערכת הושלם בהצלחה!\n\n${data.message}\n\nתוקנו ${fixedCount} משתמשים`);
        } else {
          alert(`❌ שגיאה בתיקון המערכת: ${data.error}`);
        }
      } else {
        alert('❌ שגיאה בקריאה לשרת');
      }
    } catch (error) {
      console.error('❌ Error fixing system:', error);
      alert('❌ שגיאה בתיקון המערכת');
    } finally {
      setFixingSystem(false);
    }
  };

  // עיבוד תשלום
  const processPayout = async (ownerId, ownerData) => {
    if (!confirm(`האם אתה בטוח שאתה רוצה לעבד תשלום עבור ${ownerData.owner.name || ownerData.owner.email}?`)) {
      return;
    }

    setProcessingPayout(ownerId);
    try {
      const response = await fetch('http://localhost:4000/api/commissions/admin/process-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({
          ownerId,
          year: selectedMonth.year,
          month: selectedMonth.month,
          paymentMethod: 'bank_transfer',
          paymentReference: `PAYOUT_${ownerId}_${selectedMonth.year}_${selectedMonth.month}`,
          notes: `תשלום חודשי עבור ${selectedMonth.month}/${selectedMonth.year}`
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert(`תשלום עובד בהצלחה! סכום: ₪${result.data.netPayoutILS}`);
          loadPayouts(); // רענון נתונים
        } else {
          alert('שגיאה בעיבוד התשלום: ' + result.error);
        }
      } else {
        alert('שגיאה בעיבוד התשלום');
      }
    } catch (error) {
      console.error('💰 Error processing payout:', error);
      alert('שגיאה בעיבוד התשלום');
    } finally {
      setProcessingPayout(null);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, [selectedMonth]);

  return (
    <div>
      <h1 style={{ margin: '0 0 24px 0', fontSize: 28, fontWeight: '700', color: colors.text }}>
        ניהול תשלומים חודשיים
      </h1>
      
      {/* בחירת חודש */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        marginBottom: 32,
        gap: 16
      }}>
        <button
          onClick={() => setSelectedMonth(prev => {
            let newMonth = prev.month - 1;
            let newYear = prev.year;
            if (newMonth < 1) { newMonth = 12; newYear--; }
            return { year: newYear, month: newMonth };
          })}
          style={{
            padding: '8px 16px',
            background: colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          ← חודש קודם
        </button>
        
        <div style={{ 
          fontSize: 20, 
          fontWeight: '700', 
          color: colors.text,
          minWidth: 200,
          textAlign: 'center'
        }}>
          {new Date(selectedMonth.year, selectedMonth.month - 1).toLocaleDateString('he-IL', {
            month: 'long',
            year: 'numeric'
          })}
        </div>
        
        <button
          onClick={() => setSelectedMonth(prev => {
            let newMonth = prev.month + 1;
            let newYear = prev.year;
            if (newMonth > 12) { newMonth = 1; newYear++; }
            return { year: newYear, month: newMonth };
          })}
          style={{
            padding: '8px 16px',
            background: colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          חודש הבא →
        </button>
        
        {/* כפתור בדיקה ידנית */}
        <button
          onClick={testMonthlyPayouts}
          disabled={testingPayouts}
          style={{
            padding: '8px 16px',
            background: testingPayouts ? '#ccc' : colors.success,
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: testingPayouts ? 'not-allowed' : 'pointer',
            fontSize: 14,
            marginLeft: 16,
          }}
        >
          {testingPayouts ? '⏳ מעבד...' : '🧪 בדיקה ידנית'}
        </button>
        
        {/* כפתור בדיקת מערכת עמלות */}
        <button
          onClick={testCommissionSystem}
          disabled={testingCommissions}
          style={{
            padding: '8px 16px',
            background: testingCommissions ? '#ccc' : '#ff6b35',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: testingCommissions ? 'not-allowed' : 'pointer',
            fontSize: 14,
            marginLeft: 8,
          }}
        >
          {testingCommissions ? '⏳ בודק...' : '🔬 בדיקת מערכת'}
        </button>
        
        {/* כפתור תיקון מערכת */}
        <button
          onClick={fixSystemIssues}
          disabled={fixingSystem}
          style={{
            padding: '8px 16px',
            background: fixingSystem ? '#ccc' : '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: fixingSystem ? 'not-allowed' : 'pointer',
            fontSize: 14,
            marginLeft: 8,
          }}
        >
          {fixingSystem ? '⏳ מתקן...' : '🔧 תיקון מערכת'}
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div>טוען נתוני תשלומים...</div>
        </div>
      ) : payoutsData.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.subtext }}>
          אין תשלומים לחודש זה
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {payoutsData.map(ownerData => (
            <div 
              key={ownerData.owner.id}
              style={{ 
                background: 'white',
                borderRadius: 12,
                padding: 24,
                border: `1px solid ${colors.border}`,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 4 }}>
                    {ownerData.owner.name || ownerData.owner.email}
                  </div>
                  <div style={{ fontSize: 14, color: colors.subtext, marginBottom: 8 }}>
                    {ownerData.commissionsCount} עסקאות החודש
                  </div>
                  <div style={{ display: 'flex', gap: 24 }}>
                    <div>
                      <div style={{ fontSize: 12, color: colors.subtext }}>עמלת זפוטו</div>
                      <div style={{ fontSize: 16, fontWeight: '600', color: colors.primary }}>
                        ₪{ownerData.totalCommissionILS}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 12, color: colors.subtext }}>נטו לתשלום</div>
                      <div style={{ fontSize: 20, fontWeight: '700', color: colors.success }}>
                        ₪{ownerData.totalNetOwnerILS}
                      </div>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={() => processPayout(ownerData.owner.id, ownerData)}
                  disabled={processingPayout === ownerData.owner.id}
                  style={{
                    padding: '12px 24px',
                    background: processingPayout === ownerData.owner.id ? colors.subtext : colors.success,
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: processingPayout === ownerData.owner.id ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: '600',
                    minWidth: 120
                  }}
                >
                  {processingPayout === ownerData.owner.id ? 'מעבד...' : '💰 עבד תשלום'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Emails View
function EmailsView({ users, colors }) {
  const regularUsers = users?.filter(u => u.role !== 'OWNER' && u.role !== 'ADMIN') || [];
  const owners = users?.filter(u => u.role === 'OWNER') || [];

  return (
    <div>
      <h1 style={{ margin: '0 0 24px 0', fontSize: 28, fontWeight: '700', color: colors.text }}>רשימת תפוצה</h1>
      
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
          מחפשי חניות ({regularUsers.length})
        </h2>
        <div style={{ background: 'white', borderRadius: 16, padding: 24 }}>
          {regularUsers.map(u => (
            <div key={u.id} style={{ padding: '12px 0', borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ fontWeight: '600', color: colors.text }}>{u.email}</div>
              {u.phone && <div style={{ fontSize: 14, color: colors.subtext, marginTop: 4 }}>📞 {u.phone}</div>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
          בעלי חניות ({owners.length})
        </h2>
        <div style={{ background: 'white', borderRadius: 16, padding: 24 }}>
          {owners.map(u => (
            <div key={u.id} style={{ padding: '12px 0', borderBottom: `1px solid ${colors.border}` }}>
              <div style={{ fontWeight: '600', color: colors.text }}>{u.email}</div>
              {u.phone && <div style={{ fontSize: 14, color: colors.subtext, marginTop: 4 }}>📞 {u.phone}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ChatView Component
function ChatView({ colors }) {
  return (
    <div>
      <h1 style={{ margin: '0 0 32px 0', fontSize: 28, fontWeight: '700', color: colors.text }}>צ'אט עם לקוחות</h1>
      
      <div style={{ background: 'white', borderRadius: 12, padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
        <h3 style={{ fontSize: 18, fontWeight: '600', color: colors.text, marginBottom: 8 }}>
          צ'אט לקוחות
        </h3>
        <p style={{ color: colors.subtext, fontSize: 14 }}>
          כאן יופיעו הודעות מלקוחות שצריכים עזרה במהלך השימוש בחניה
        </p>
        <div style={{ marginTop: 24, padding: 16, background: colors.bg, borderRadius: 8 }}>
          <p style={{ color: colors.subtext, fontSize: 13, margin: 0 }}>
            🚧 הפיצ'ר בפיתוח - יושלם בגרסה הבאה
          </p>
        </div>
      </div>
    </div>
  );
}
