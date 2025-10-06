/* eslint-disable no-unused-vars */
// DashboardNew.jsx - דשבורד אדמין מחודש
import { useState } from 'react';
import OnboardingForm from './OnboardingForm';

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
            // אם יש onboarding - השתמש בו
            if (editingRequest.onboarding) {
              try {
                return JSON.parse(editingRequest.onboarding);
              } catch (e) {
                console.error('Failed to parse onboarding:', e);
              }
            }
            // אחרת - מילוי אוטומטי מהבקשה
            return {
              fullName: editingRequest.user?.name || '',
              email: editingRequest.user?.email || '',
              phone: editingRequest.phone || '',
              fullAddress: editingRequest.fullAddress || editingRequest.address?.split(',')[0]?.trim() || '',
              city: editingRequest.city || editingRequest.address?.split(',')[1]?.trim() || '',
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
            count={users.filter(u => u.role === 'USER').length}
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
            </>
          )}
          {topTab === 'stats' && (
            <StatsView stats={stats} users={users} parkings={parkings} colors={colors} />
          )}
          {topTab === 'revenue' && (
            <RevenueView stats={stats} colors={colors} />
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
        background: active ? `linear-gradient(135deg, ${colors?.primary}, ${colors?.secondary})` : 'transparent',
        color: active ? 'white' : colors?.text,
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 14,
        fontWeight: active ? '600' : '500',
        transition: 'all 0.2s',
        textAlign: 'right',
      }}
      onMouseEnter={(e) => {
        if (!active) e.target.style.background = colors.bg;
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
                    <InfoRow icon="👤" label="שם הלקוח" value={r.user?.name || r.user?.email || 'לא זמין'} colors={colors} />
                    <InfoRow icon="💰" label="מחיר" value={`₪${r.priceHr}/שעה`} colors={colors} />
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
                    <>
                      <button
                        onClick={() => onEdit(r)}
                        style={{
                          padding: '10px 24px',
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
                      <button
                        onClick={() => approve(r.id)}
                        style={{
                          padding: '10px 24px',
                          background: colors.success,
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: 14,
                        }}
                      >
                        ✓ אשר
                      </button>
                      <button
                        onClick={() => reject(r.id)}
                        style={{
                          padding: '10px 24px',
                          background: colors.error,
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: '600',
                          fontSize: 14,
                        }}
                      >
                        ✗ דחה
                      </button>
                    </>
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

// Users View - רק מחפשי חניות
function UsersView({ users, onSelectUser, colors }) {
  const regularUsers = users.filter(u => u.role !== 'OWNER' && u.role !== 'ADMIN');

  return (
    <div>
      <h1 style={{ margin: '0 0 24px 0', fontSize: 28, fontWeight: '700', color: colors.text }}>
        מחפשי חניות ({regularUsers.length})
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {regularUsers.map(u => (
          <UserCard key={u.id} user={u} onClick={() => onSelectUser(u)} colors={colors} />
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
        <div>
          <div style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
            {user.email}
          </div>
          <div style={{ fontSize: 13, color: colors.subtext }}>
            {isOwner ? `${user._count?.parkings || 0} חניות` : `${user._count?.bookings || 0} הזמנות`}
          </div>
        </div>
        <span style={{
          padding: '4px 12px',
          background: isOwner ? colors.accent : colors.primary,
          color: 'white',
          borderRadius: 6,
          fontSize: 11,
          fontWeight: '600',
        }}>
          {isOwner ? 'OWNER' : 'USER'}
        </span>
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

// Bookings View - מחולק לפי סטטוס
function BookingsView({ bookings, colors }) {
  const confirmed = bookings.filter(b => b.status === 'CONFIRMED');
  const pending = bookings.filter(b => b.status === 'PENDING');
  const cancelled = bookings.filter(b => b.status === 'CANCELED' || b.status === 'CANCELLED');
  
  return (
    <div>
      <h1 style={{ margin: '0 0 32px 0', fontSize: 28, fontWeight: '700', color: colors.text }}>הזמנות</h1>
      
      {/* הזמנות פעילות */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
          ✅ הזמנות פעילות ({confirmed.length})
        </h2>
        {confirmed.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: 24, textAlign: 'center', color: colors.subtext }}>
            אין הזמנות פעילות
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {confirmed.map(b => <BookingCard key={b.id} booking={b} colors={colors} />)}
          </div>
        )}
      </div>

      {/* הזמנות ממתינות */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 20, fontWeight: '600', color: colors.text, marginBottom: 16 }}>
          ⏳ הזמנות ממתינות ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: 24, textAlign: 'center', color: colors.subtext }}>
            אין הזמנות ממתינות
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {pending.map(b => <BookingCard key={b.id} booking={b} colors={colors} />)}
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
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: 20,
      border: `1px solid ${colors.border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
            הזמנה #{booking.id}
          </div>
          <div style={{ fontSize: 13, color: colors.subtext }}>
            {booking.parking?.title} • {booking.user?.email}
          </div>
          <div style={{ fontSize: 13, color: colors.subtext, marginTop: 4 }}>
            {new Date(booking.startTime).toLocaleDateString('he-IL')} - {new Date(booking.endTime).toLocaleDateString('he-IL')}
          </div>
        </div>
        <span style={{
          padding: '6px 16px',
          background: booking.status === 'CONFIRMED' ? colors.success : booking.status === 'PENDING' ? colors.warning : colors.error,
          color: 'white',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: '600',
        }}>
          {booking.status}
        </span>
      </div>
    </div>
  );
}

// Helper function to calculate user parking hours
function calculateUserParkingHours(user) {
  if (!user.bookings || user.bookings.length === 0) return '0 שעות';
  
  const totalMs = user.bookings.reduce((sum, booking) => {
    const start = new Date(booking.startTime).getTime();
    const end = new Date(booking.endTime).getTime();
    return sum + (end - start);
  }, 0);
  
  const hours = Math.round(totalMs / (1000 * 60 * 60) * 10) / 10;
  return `${hours} שעות`;
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

        {/* חלק 2: אנליטיקות */}
        <div style={{ background: 'white', borderRadius: 20, padding: 32, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>📊</span> אנליטיקות חניה
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            <InfoCard icon="⏱️" label="שעות חניה שהשלים" value={calculateUserParkingHours(user)} colors={colors} />
            <InfoCard icon="📏" label="ממוצע משך חניה" value="0 שעות" colors={colors} />
            <InfoCard icon="💵" label="עלות ממוצעת לחניה" value="₪0" colors={colors} />
            <InfoCard icon="📅" label="סה״כ הזמנות" value={user._count?.bookings || 0} colors={colors} />
            <InfoCard icon="📋" label="בקשות שהגיש" value={user._count?.listingRequests || 0} colors={colors} />
          </div>
        </div>
      </div>
    </div>
  );
}

// Parking Detail View - עם פרטי בעל החניה
function ParkingDetailView({ parking, onBack, colors }) {
  const owner = parking.owner || {};
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    isActive: parking.isActive !== false,
  });
  
  const [analyticsView, setAnalyticsView] = useState('daily'); // daily, weekly, monthly
  const [showPricing, setShowPricing] = useState(false);
  
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
  
  const handleDelete = async () => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק חניה זו? פעולה זו בלתי הפיכה!')) {
      return;
    }
    
    try {
      const response = await fetch(`http://localhost:4000/api/admin/parkings/${parking.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      
      if (response.ok) {
        alert('✅ החניה נמחקה בהצלחה!');
        onBack();
      } else {
        alert('❌ שגיאה במחיקת החניה');
      }
    } catch (error) {
      console.error('Error deleting:', error);
      alert('❌ שגיאה במחיקת החניה');
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
        </div>
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

      {/* מסמכים מצורפים */}
      {onboardingData && (onboardingData.hasIdCopy || onboardingData.hasPropertyRights || onboardingData.hasCommitteeApproval || onboardingData.hasAccountManagement) && (
        <div style={{ background: 'white', borderRadius: 20, padding: 32, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
          <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>📄</span> מסמכים מצורפים
          </h2>
          <div style={{ display: 'grid', gap: 12 }}>
            {onboardingData.hasIdCopy && (
              <div style={{ padding: 16, background: colors.bg, borderRadius: 12, border: `2px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>📋</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: colors.text }}>צילום תעודת זהות</div>
                  <div style={{ fontSize: 14, color: colors.subtext }}>{onboardingData.idCopyFile || 'קובץ מצורף'}</div>
                </div>
                {onboardingData.idCopyFile && (
                  <a 
                    href={onboardingData.idCopyFile} 
                    download 
                    style={{ 
                      padding: '8px 16px', 
                      background: colors.primary, 
                      color: 'white', 
                      borderRadius: 8, 
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: '600'
                    }}
                  >
                    הורד
                  </a>
                )}
                <span style={{ fontSize: 20, color: colors.success }}>✓</span>
              </div>
            )}
            {onboardingData.hasPropertyRights && (
              <div style={{ padding: 16, background: colors.bg, borderRadius: 12, border: `2px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>🏠</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: colors.text }}>אישור זכויות במקרקעין</div>
                  <div style={{ fontSize: 14, color: colors.subtext }}>{onboardingData.propertyRightsFile || 'קובץ מצורף'}</div>
                </div>
                {onboardingData.propertyRightsFile && (
                  <a 
                    href={onboardingData.propertyRightsFile} 
                    download 
                    style={{ 
                      padding: '8px 16px', 
                      background: colors.primary, 
                      color: 'white', 
                      borderRadius: 8, 
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: '600'
                    }}
                  >
                    הורד
                  </a>
                )}
                <span style={{ fontSize: 20, color: colors.success }}>✓</span>
              </div>
            )}
            {onboardingData.hasCommitteeApproval && (
              <div style={{ padding: 16, background: colors.bg, borderRadius: 12, border: `2px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>✅</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: colors.text }}>אישור ועד / חברת ניהול</div>
                  <div style={{ fontSize: 14, color: colors.subtext }}>{onboardingData.committeeApprovalFile || 'קובץ מצורף'}</div>
                </div>
                {onboardingData.committeeApprovalFile && (
                  <a 
                    href={onboardingData.committeeApprovalFile} 
                    download 
                    style={{ 
                      padding: '8px 16px', 
                      background: colors.primary, 
                      color: 'white', 
                      borderRadius: 8, 
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: '600'
                    }}
                  >
                    הורד
                  </a>
                )}
                <span style={{ fontSize: 20, color: colors.success }}>✓</span>
              </div>
            )}
            {onboardingData.hasAccountManagement && (
              <div style={{ padding: 16, background: colors.bg, borderRadius: 12, border: `2px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 24 }}>🏦</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: colors.text }}>אישור ניהול חשבון</div>
                  <div style={{ fontSize: 14, color: colors.subtext }}>{onboardingData.accountManagementFile || 'קובץ מצורף'}</div>
                </div>
                {onboardingData.accountManagementFile && (
                  <a 
                    href={onboardingData.accountManagementFile} 
                    download 
                    style={{ 
                      padding: '8px 16px', 
                      background: colors.primary, 
                      color: 'white', 
                      borderRadius: 8, 
                      textDecoration: 'none',
                      fontSize: 14,
                      fontWeight: '600'
                    }}
                  >
                    הורד
                  </a>
                )}
                <span style={{ fontSize: 20, color: colors.success }}>✓</span>
              </div>
            )}
          </div>
        </div>
      )}
      
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
          <InfoCard icon="⏱️" label="שעות חניה שהושכרו" value="0 שעות" colors={colors} />
          <InfoCard icon="🕐" label="שעות פנויות" value="0 שעות" colors={colors} />
          <InfoCard icon="📊" label="אחוז תפוסה" value="0%" colors={colors} />
          <InfoCard icon="📏" label="משך חניה ממוצע" value="0 שעות" colors={colors} />
          <InfoCard icon="💵" label="הכנסה ממוצעת" value="₪0" colors={colors} />
          <InfoCard icon="📈" label="סה״כ הזמנות" value="0" colors={colors} />
        </div>
        
        <div style={{ background: colors.bg, borderRadius: 12, padding: 24, textAlign: 'center' }}>
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
      </div>
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

// Revenue View
function RevenueView({ stats, colors }) {
  return (
    <div>
      <h1 style={{ margin: '0 0 24px 0', fontSize: 28, fontWeight: '700', color: colors.text }}>הכנסות העסק</h1>
      
      {/* הכנסות העסק */}
      <div 
        style={{ 
          background: `linear-gradient(135deg, ${colors.success}20, ${colors.primary}20)`, 
          borderRadius: 20, 
          padding: 32, 
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        <h2 style={{ margin: '0 0 24px 0', fontSize: 24, fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>💰</span> סיכום הכנסות
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 20 }}>
          <InfoCard icon="💰" label="סה״כ הכנסות" value={`₪${Math.floor((stats?.totalRevenueCents || 0) / 100)}`} colors={colors} />
        </div>
      </div>
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
