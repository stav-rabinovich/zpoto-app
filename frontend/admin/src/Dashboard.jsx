// Dashboard.jsx - דשבורד אדמין מקצועי
export default function Dashboard({ stats, users, rows, parkings, approve, reject, load, activeTab, setActiveTab }) {
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
    subtext: '#475569',
    border: '#E2E8F0',
  };

  const StatCard = ({ title, value, subtitle, icon, color }) => (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      border: `1px solid ${colors.border}`,
      flex: 1,
      minWidth: 200,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 14, color: colors.subtext, marginBottom: 4 }}>{title}</div>
          <div style={{ fontSize: 32, fontWeight: '700', color: colors.text }}>{value}</div>
          {subtitle && <div style={{ fontSize: 12, color: colors.subtext, marginTop: 4 }}>{subtitle}</div>}
        </div>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: `linear-gradient(135deg, ${color}22, ${color}44)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );

  const TabButton = ({ id, label, count }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: '12px 24px',
        border: 'none',
        background: activeTab === id ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` : colors.surface,
        color: activeTab === id ? 'white' : colors.text,
        borderRadius: 12,
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: 14,
        transition: 'all 0.2s',
        boxShadow: activeTab === id ? '0 4px 12px rgba(127, 147, 255, 0.3)' : 'none',
      }}
    >
      {label} {count !== undefined && `(${count})`}
    </button>
  );

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: 24, direction: 'rtl', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
        borderRadius: 20,
        padding: 32,
        marginBottom: 24,
        color: 'white',
        boxShadow: '0 10px 25px rgba(127, 147, 255, 0.3)',
      }}>
        <h1 style={{ margin: 0, fontSize: 32, fontWeight: '700' }}>🚗 Zpoto Admin</h1>
        <p style={{ margin: '8px 0 0 0', opacity: 0.9 }}>ניהול מערכת חניות</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <StatCard
            title="סה״כ משתמשים"
            value={stats.totalUsers || 0}
            subtitle={`${stats.totalOwners || 0} בעלי חניה`}
            icon="👥"
            color={colors.primary}
          />
          <StatCard
            title="סה״כ חניות"
            value={stats.totalParkings || 0}
            subtitle={`${stats.activeParkings || 0} פעילות`}
            icon="🅿️"
            color={colors.accent}
          />
          <StatCard
            title="סה״כ הזמנות"
            value={stats.totalBookings || 0}
            subtitle={`${stats.confirmedBookings || 0} מאושרות`}
            icon="📅"
            color={colors.success}
          />
          <StatCard
            title="הכנסות כוללות"
            value={`₪${(stats.totalRevenueCents / 100).toFixed(0)}`}
            subtitle="מהזמנות מאושרות"
            icon="💰"
            color={colors.warning}
          />
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <TabButton id="requests" label="בקשות חניה" count={rows.filter(r => r.status === 'PENDING').length} />
        <TabButton id="users" label="משתמשים" count={users.length} />
        <TabButton id="parkings" label="חניות" count={stats?.totalParkings} />
        <TabButton id="bookings" label="הזמנות" count={parkings.length} />
      </div>

      {/* Content */}
      <div style={{ background: 'white', borderRadius: 16, padding: 24, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
        {activeTab === 'requests' && (
          <RequestsTab rows={rows} approve={approve} reject={reject} load={load} colors={colors} />
        )}
        {activeTab === 'users' && (
          <UsersTab users={users} colors={colors} />
        )}
        {activeTab === 'parkings' && (
          <ParkingsTab stats={stats} colors={colors} />
        )}
        {activeTab === 'bookings' && (
          <BookingsTab parkings={parkings} colors={colors} />
        )}
      </div>
    </div>
  );
}

function RequestsTab({ rows, approve, reject, load, colors }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: '700' }}>בקשות להיות בעל חניה</h2>
        <button
          onClick={load}
          style={{
            padding: '8px 16px',
            background: colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: '600',
          }}
        >
          🔄 רענון
        </button>
      </div>
      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.subtext }}>
          אין בקשות ממתינות
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {rows.map(r => (
            <div key={r.id} style={{
              padding: 20,
              border: `2px solid ${r.status === 'PENDING' ? colors.warning : r.status === 'APPROVED' ? colors.success : colors.error}`,
              borderRadius: 12,
              background: colors.bg,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: '700' }}>{r.title}</h3>
                  <div style={{ fontSize: 14, color: colors.subtext, marginBottom: 4 }}>
                    📍 {r.address}
                  </div>
                  <div style={{ fontSize: 14, color: colors.subtext, marginBottom: 4 }}>
                    💰 ₪{r.priceHr}/שעה
                  </div>
                  <div style={{ fontSize: 14, color: colors.subtext }}>
                    👤 {r.user?.email}
                  </div>
                  {r.description && (
                    <div style={{ fontSize: 14, color: colors.text, marginTop: 8, padding: 12, background: 'white', borderRadius: 8 }}>
                      {r.description}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginRight: 16 }}>
                  {r.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => approve(r.id)}
                        style={{
                          padding: '8px 20px',
                          background: colors.success,
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: '600',
                        }}
                      >
                        ✓ אשר
                      </button>
                      <button
                        onClick={() => reject(r.id)}
                        style={{
                          padding: '8px 20px',
                          background: colors.error,
                          color: 'white',
                          border: 'none',
                          borderRadius: 8,
                          cursor: 'pointer',
                          fontWeight: '600',
                        }}
                      >
                        ✗ דחה
                      </button>
                    </>
                  )}
                  {r.status === 'APPROVED' && (
                    <span style={{ padding: '8px 16px', background: colors.success, color: 'white', borderRadius: 8, fontWeight: '600' }}>
                      ✓ מאושר
                    </span>
                  )}
                  {r.status === 'REJECTED' && (
                    <span style={{ padding: '8px 16px', background: colors.error, color: 'white', borderRadius: 8, fontWeight: '600' }}>
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

function UsersTab({ users, colors }) {
  const owners = users.filter(u => u.role === 'OWNER');
  const regularUsers = users.filter(u => u.role === 'USER');

  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', fontSize: 24, fontWeight: '700' }}>משתמשים</h2>
      
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>בעלי חניה ({owners.length})</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {owners.map(u => (
            <div key={u.id} style={{ padding: 16, background: colors.bg, borderRadius: 12, border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: 4 }}>{u.email}</div>
                  <div style={{ fontSize: 14, color: colors.subtext }}>
                    {u._count?.parkings || 0} חניות • {u._count?.listingRequests || 0} בקשות
                  </div>
                </div>
                <span style={{ padding: '4px 12px', background: colors.accent, color: 'white', borderRadius: 6, fontSize: 12, fontWeight: '600' }}>
                  OWNER
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: 18, fontWeight: '600', marginBottom: 12 }}>משתמשים רגילים ({regularUsers.length})</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {regularUsers.map(u => (
            <div key={u.id} style={{ padding: 16, background: colors.bg, borderRadius: 12, border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: 4 }}>{u.email}</div>
                  <div style={{ fontSize: 14, color: colors.subtext }}>
                    {u._count?.bookings || 0} הזמנות
                  </div>
                </div>
                <span style={{ padding: '4px 12px', background: colors.primary, color: 'white', borderRadius: 6, fontSize: 12, fontWeight: '600' }}>
                  USER
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ParkingsTab({ stats, colors }) {
  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', fontSize: 24, fontWeight: '700' }}>סטטיסטיקות חניות</h2>
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ padding: 20, background: colors.bg, borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>סה״כ חניות במערכת</div>
          <div style={{ fontSize: 32, fontWeight: '700', color: colors.primary }}>{stats?.totalParkings || 0}</div>
        </div>
        <div style={{ padding: 20, background: colors.bg, borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>חניות פעילות</div>
          <div style={{ fontSize: 32, fontWeight: '700', color: colors.success }}>{stats?.activeParkings || 0}</div>
        </div>
        <div style={{ padding: 20, background: colors.bg, borderRadius: 12 }}>
          <div style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>ממוצע מחיר לשעה</div>
          <div style={{ fontSize: 32, fontWeight: '700', color: colors.warning }}>₪15</div>
          <div style={{ fontSize: 14, color: colors.subtext, marginTop: 4 }}>מחושב על בסיס כל החניות</div>
        </div>
      </div>
    </div>
  );
}

function BookingsTab({ parkings, colors }) {
  return (
    <div>
      <h2 style={{ margin: '0 0 20px 0', fontSize: 24, fontWeight: '700' }}>הזמנות</h2>
      {parkings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.subtext }}>
          אין הזמנות עדיין
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {parkings.map(b => (
            <div key={b.id} style={{ padding: 16, background: colors.bg, borderRadius: 12, border: `1px solid ${colors.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <div style={{ fontWeight: '600', marginBottom: 4 }}>הזמנה #{b.id}</div>
                  <div style={{ fontSize: 14, color: colors.subtext }}>
                    {b.parking?.title || 'חניה'} • {b.user?.email}
                  </div>
                  <div style={{ fontSize: 14, color: colors.subtext, marginTop: 4 }}>
                    {new Date(b.startTime).toLocaleDateString('he-IL')} - {new Date(b.endTime).toLocaleDateString('he-IL')}
                  </div>
                </div>
                <span style={{
                  padding: '4px 12px',
                  background: b.status === 'CONFIRMED' ? colors.success : b.status === 'PENDING' ? colors.warning : colors.error,
                  color: 'white',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: '600',
                }}>
                  {b.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
