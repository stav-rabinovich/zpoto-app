// SignaturePage.jsx - דף חתימה דיגיטלית
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

export default function SignaturePage() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [signature, setSignature] = useState('');
  const [signed, setSigned] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const response = await fetch(`http://localhost:4000/api/public/listing-requests/${id}/onboarding`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async () => {
    if (!signature.trim()) {
      alert('נא להזין את שמך המלא לחתימה');
      return;
    }

    try {
      await fetch(`http://localhost:4000/api/public/listing-requests/${id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature, signedAt: new Date().toISOString() }),
      });
      
      setSigned(true);
    } catch (error) {
      console.error('Error signing:', error);
      alert('שגיאה בחתימה. נסה שוב.');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>⏳</div>
          <p style={{ color: '#64748B', marginTop: 16 }}>טוען...</p>
        </div>
      </div>
    );
  }

  if (signed) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 600, background: 'white', borderRadius: 20, padding: 48, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 80, marginBottom: 24 }}>✅</div>
          <h1 style={{ color: '#22C55E', fontSize: 32, margin: 0 }}>המסמך נחתם בהצלחה!</h1>
          <p style={{ color: '#64748B', fontSize: 18, marginTop: 16 }}>
            תודה על חתימתך. צוות Zpoto יבדוק את המסמכים ויאשר את חשבונך בקרוב.
          </p>
          <div style={{ marginTop: 32, padding: 20, background: '#F0FDF4', borderRadius: 12 }}>
            <p style={{ color: '#15803D', margin: 0, fontSize: 14 }}>
              📧 נשלח אליך מייל אישור
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#F8FAFC' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48 }}>❌</div>
          <p style={{ color: '#EF4444', marginTop: 16 }}>לא נמצאו נתונים</p>
        </div>
      </div>
    );
  }

  const onboardingData = JSON.parse(data.onboarding || '{}');

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #7F93FF08, #A47BFF08)', padding: 40, direction: 'rtl' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', background: 'white', borderRadius: 20, padding: 48, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ color: '#7F93FF', fontSize: 36, margin: 0 }}>🚗 Zpoto</h1>
          <p style={{ color: '#64748B', fontSize: 18, marginTop: 8 }}>טופס אונבורדינג - אישור וחתימה</p>
        </div>

        {/* Content */}
        <div style={{ marginBottom: 40 }}>
          <Section title="📋 פרטים אישיים">
            <Row label="שם מלא" value={onboardingData.fullName} />
            <Row label="ת.ז / דרכון" value={onboardingData.idNumber} />
            <Row label="טלפון" value={onboardingData.phone} />
            <Row label="מייל" value={onboardingData.email} />
          </Section>

          <Section title="🏦 פרטי תשלום">
            <Row label="שם בעל החשבון" value={onboardingData.accountOwnerName} />
            <Row label="בנק" value={onboardingData.bankName} />
            <Row label="מספר סניף" value={onboardingData.branchNumber} />
            <Row label="מספר חשבון" value={onboardingData.accountNumber} />
          </Section>

          <Section title="🅿️ פרטי החניה">
            <Row label="כתובת" value={onboardingData.fullAddress} />
            <Row label="עיר" value={onboardingData.city} />
            <Row label="סוג חניה" value={onboardingData.parkingType} />
          </Section>
        </div>

        {/* Signature */}
        <div style={{ background: '#F8FAFC', padding: 32, borderRadius: 16, marginBottom: 24 }}>
          <h3 style={{ color: '#334155', fontSize: 20, marginTop: 0 }}>✍️ חתימה דיגיטלית</h3>
          <p style={{ color: '#64748B', fontSize: 14, marginBottom: 16 }}>
            אני החתום מטה מאשר כי כל המידע שמסרתי נכון ומדויק, וכי החניה חוקית, בטוחה לשימוש ונמצאת בבעלותי/שכירותי כדין.
          </p>
          <input
            type="text"
            value={signature}
            onChange={(e) => setSignature(e.target.value)}
            placeholder="הזן את שמך המלא לחתימה"
            style={{
              width: '100%',
              padding: '16px',
              border: '2px solid #E2E8F0',
              borderRadius: 12,
              fontSize: 18,
              fontFamily: 'cursive',
              textAlign: 'center',
              direction: 'rtl',
            }}
          />
          <p style={{ color: '#94A3B8', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
            תאריך: {new Date().toLocaleDateString('he-IL')}
          </p>
        </div>

        {/* Button */}
        <button
          onClick={handleSign}
          disabled={!signature.trim()}
          style={{
            width: '100%',
            padding: '18px',
            background: signature.trim() ? 'linear-gradient(135deg, #7F93FF, #A47BFF)' : '#E2E8F0',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontSize: 20,
            fontWeight: '700',
            cursor: signature.trim() ? 'pointer' : 'not-allowed',
            boxShadow: signature.trim() ? '0 4px 12px rgba(127, 147, 255, 0.3)' : 'none',
          }}
        >
          ✅ אשר וחתום על המסמך
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ color: '#7F93FF', fontSize: 18, borderBottom: '2px solid #7F93FF', paddingBottom: 8, marginBottom: 16 }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F1F5F9' }}>
      <span style={{ color: '#64748B', fontSize: 15 }}>{label}:</span>
      <span style={{ color: '#334155', fontSize: 15, fontWeight: '600' }}>{value || '—'}</span>
    </div>
  );
}
