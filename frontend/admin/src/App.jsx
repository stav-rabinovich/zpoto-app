// [ADMIN] admin/src/App.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import Dashboard from "./Dashboard";
const API = "http://localhost:4000";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("adminToken") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("requests"); // requests, users, parkings, bookings, chat, coupons
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [parkings, setParkings] = useState([]);
  const [allBookings, setAllBookings] = useState([]);

  // Axios instance עם token
  const api = axios.create({
    baseURL: API,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const login = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const { data } = await axios.post(`${API}/api/auth/login`, { email, password });
      setToken(data.token);
      localStorage.setItem("adminToken", data.token);
    } catch (err) {
      setLoginError(err.response?.data?.error || "שגיאת התחברות");
    }
  };

  const logout = () => {
    setToken("");
    localStorage.removeItem("adminToken");
  };

  const load = async () => {
    setLoading(true);
    try {
      const [requestsRes, statsRes, usersRes] = await Promise.all([
        api.get("/api/admin/listing-requests"),
        api.get("/api/admin/stats"),
        api.get("/api/admin/users"),
      ]);
      setRows(requestsRes.data);
      setStats(statsRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.status === 401) {
        alert("אין לך הרשאות Admin");
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadParkings = async () => {
    try {
      // טעינת חניות - דרך ה-admin API לנתונים מסונכרנים
      const parkingsRes = await api.get("/api/admin/parkings");
      const parkingsData = Array.isArray(parkingsRes.data?.data) ? parkingsRes.data.data : (Array.isArray(parkingsRes.data) ? parkingsRes.data : []);
      console.log('🏢 Loaded parkings from admin API:', parkingsData.length, parkingsData);
      setParkings(parkingsData);
      
      // טעינת הזמנות
      try {
        const bookingsRes = await api.get("/api/admin/bookings");
        const bookingsData = Array.isArray(bookingsRes.data?.data) ? bookingsRes.data.data : (Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
        console.log('📊 Loaded bookings:', bookingsData.length, bookingsData);
        setAllBookings(bookingsData);
      } catch (bookingError) {
        console.warn('Failed to load bookings:', bookingError);
        setAllBookings([]); // fallback לarray ריק
      }
    } catch (err) {
      console.error(err);
    }
  };

  const approve = async (id) => {
    try {
      await api.post(`/api/admin/listing-requests/${id}/approve`);
      setRows(prev => prev.map(r => r.id === id ? { ...r, status: "APPROVED" } : r));
    } catch (err) {
      alert(err.response?.data?.error || "שגיאה באישור");
    }
  };

  const reject = async (id) => {
    const reason = prompt("סיבת דחייה (אופציונלי):");
    try {
      await api.post(`/api/admin/listing-requests/${id}/reject`, { reason });
      setRows(prev => prev.map(r => r.id === id ? { ...r, status: "REJECTED", rejectionReason: reason } : r));
    } catch (err) {
      alert(err.response?.data?.error || "שגיאה בדחייה");
    }
  };

  useEffect(() => {
    if (token) {
      load();
      loadParkings();
    }
  }, [token]);

  // אם אין token - מסך התחברות
  if (!token) {
    return (
      <div style={{
        minHeight: '100vh',
        width: '100vw',
        background: 'linear-gradient(135deg, #7F93FF, #A47BFF)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        overflow: 'hidden',
      }}>
        <div style={{
          background: 'white',
          borderRadius: 0,
          padding: '80px 60px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: 'none',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚗</div>
            <h1 style={{ margin: 0, fontSize: 32, fontWeight: '700', color: '#0F172A' }}>Zpoto Admin</h1>
            <p style={{ margin: '8px 0 0 0', color: '#475569' }}>כניסה למערכת ניהול</p>
          </div>
          <form onSubmit={login} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: '600', color: '#0F172A' }}>
                אימייל
              </label>
              <input
                type="email"
                placeholder="admin@zpoto.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 16,
                  border: '2px solid #E2E8F0',
                  borderRadius: 12,
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#7F93FF'}
                onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: '600', color: '#0F172A' }}>
                סיסמה
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 16,
                  border: '2px solid #E2E8F0',
                  borderRadius: 12,
                  outline: 'none',
                  transition: 'border 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#7F93FF'}
                onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>
            <button
              type="submit"
              style={{
                padding: '14px 24px',
                fontSize: 16,
                fontWeight: '600',
                color: 'white',
                background: 'linear-gradient(135deg, #7F93FF, #A47BFF)',
                border: 'none',
                borderRadius: 12,
                cursor: 'pointer',
                marginTop: 8,
                boxShadow: '0 4px 12px rgba(127, 147, 255, 0.4)',
                transition: 'transform 0.2s',
              }}
              onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
            >
              🔐 התחבר
            </button>
            {loginError && (
              <div style={{
                padding: 12,
                background: '#FEF2F2',
                border: '1px solid #FCA5A5',
                borderRadius: 8,
                color: '#DC2626',
                fontSize: 14,
                textAlign: 'center',
              }}>
                {loginError}
              </div>
            )}
          </form>
          <div style={{
            marginTop: 24,
            padding: 16,
            background: '#F8FAFC',
            borderRadius: 12,
            fontSize: 13,
            color: '#475569',
            textAlign: 'center',
          }}>
            <div style={{ fontWeight: '600', marginBottom: 4 }}>משתמש ברירת מחדל:</div>
            <div><strong>admin@zpoto.com</strong> / <strong>admin123</strong></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      <Dashboard
        stats={stats}
        users={users}
        rows={rows}
        parkings={parkings}
        allBookings={allBookings}
        approve={approve}
        reject={reject}
        load={load}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        logout={logout}
      />
    </div>
  );
}
