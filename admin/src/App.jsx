// [ADMIN] admin/src/App.jsx
import { useEffect, useState } from "react";
import axios from "axios";
const API = "http://localhost:4000";

export default function App() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API}/api/admin/listing-requests`);
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  const approve = async (id) => {
    await axios.post(`${API}/api/admin/listing-requests/${id}/approve`);
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: "APPROVED" } : r));
  };

  const reject = async (id) => {
    await axios.post(`${API}/api/admin/listing-requests/${id}/reject`);
    setRows(prev => prev.map(r => r.id === id ? { ...r, status: "REJECTED" } : r));
  };

  useEffect(() => { load(); }, []);

  return (
    <div style={{ padding: 24, direction: "rtl", fontFamily: "sans-serif", maxWidth: 1100, margin: "0 auto" }}>
      <h1>בקשות מודעות חניה</h1>
      <button onClick={load} disabled={loading} style={{ marginBottom: 12 }}>
        {loading ? "טוען..." : "רענון"}
      </button>
      <table border="1" cellPadding="8" style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr>
            <th>כותרת</th>
            <th>כתובת</th>
            <th>₪/שעה</th>
            <th>סטטוס</th>
            <th>פעולות</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan="5" style={{ textAlign:"center" }}>אין בקשות עדיין</td></tr>
          )}
          {rows.map(r => (
            <tr key={r.id}>
              <td>{r.title}</td>
              <td>{r.address}</td>
              <td>{r.pricePerHour}</td>
              <td>{r.status}</td>
              <td>
                {r.status !== "APPROVED" && <button onClick={() => approve(r.id)}>אשר</button>}
                {" "}
                {r.status !== "REJECTED" && <button onClick={() => reject(r.id)}>דחה</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
