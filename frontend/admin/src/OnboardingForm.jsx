// OnboardingForm.jsx - טופס אונבורדינג מלא לבעל חניה
import { useState } from 'react';

export default function OnboardingForm({ initialData, onSave, onCancel, colors, requestId }) {
  const defaultData = {
    // פרטים אישיים
    fullName: '',
    idNumber: '',
    phone: '',
    email: '',
    
    // פרטי תשלום
    accountOwnerName: '',
    bankName: '',
    branchNumber: '',
    accountNumber: '',
    
    // מסמכים
    hasIdCopy: false,
    idCopyFile: null,
    hasPropertyRights: false,
    propertyRightsFile: null,
    hasCommitteeApproval: false,
    committeeApprovalFile: null,
    hasAccountManagement: false,
    accountManagementFile: null,
    
    // פרטי החניה
    fullAddress: '',
    city: '',
    parkingType: '', // מקורה, פתוחה, תת־קרקעי, ברחוב
    accessType: [], // שער עם קוד, שלט רחוק, שומר, פתוחה
    restrictions: [], // אין גז, אין אופנועים, אחר
    restrictionsOther: '',
    vehicleTypes: [], // מיני, משפחתי, SUV, גדול
    
    // בטיחות
    hasLighting: false,
    hasSafeAccess: false,
    hasClearMarking: false,
    noHazards: false,
    
    // הצהרה
    declarationName: '',
    declarationDate: '',
  };
  
  const [data, setData] = useState({ ...defaultData, ...initialData });

  const handleChange = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleCheckboxArray = (field, value) => {
    setData(prev => ({
      ...prev,
      [field]: prev[field]?.includes(value)
        ? prev[field].filter(v => v !== value)
        : [...(prev[field] || []), value]
    }));
  };

  const [uploadedFiles, setUploadedFiles] = useState({});
  const [sendingForSignature, setSendingForSignature] = useState(false);

  const handleFileUpload = (field, file) => {
    setUploadedFiles(prev => ({ ...prev, [field]: file }));
    handleChange(field, file.name);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(data, uploadedFiles);
  };

  const handleSendForSignature = async (e) => {
    e.preventDefault();
    setSendingForSignature(true);
    try {
      // שמירת הנתונים
      await onSave(data, uploadedFiles);
      
      // שליחת מייל לחתימה
      const response = await fetch(`http://localhost:4000/api/admin/listing-requests/${requestId}/send-for-signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ onboardingData: data }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.note) {
          alert('✅ הנתונים נשמרו בהצלחה!\n\n⚠️ שליחת מייל דורשת הגדרות:\n' + result.note);
        } else {
          alert('✅ המסמך נשלח ללקוח לחתימה במייל!');
        }
        onCancel();
      } else {
        alert('❌ שגיאה בשליחת המייל');
      }
    } catch (error) {
      console.error('Error sending for signature:', error);
      alert('❌ שגיאה בשליחת המסמך לחתימה');
    } finally {
      setSendingForSignature(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
    <form onSubmit={handleSubmit} style={{ 
      width: '100%',
      background: `linear-gradient(135deg, ${colors.primary}08, ${colors.secondary}08)`,
      borderRadius: 8,
      direction: 'rtl',
    }}>
      {/* פרטים אישיים */}
      <Section title="פרטים אישיים" colors={colors}>
        <InputField label="שם מלא *" value={data.fullName} onChange={(v) => handleChange('fullName', v)} />
        <InputField label="תעודת זהות / דרכון *" value={data.idNumber} onChange={(v) => handleChange('idNumber', v)} />
        <InputField label="טלפון *" value={data.phone} onChange={(v) => handleChange('phone', v)} type="tel" />
        <InputField label="דוא״ל *" value={data.email} onChange={(v) => handleChange('email', v)} type="email" />
      </Section>

      {/* פרטי תשלום */}
      <Section title="פרטי תשלום" colors={colors}>
        <InputField label="שם בעל החשבון *" value={data.accountOwnerName} onChange={(v) => handleChange('accountOwnerName', v)} />
        <InputField label="בנק *" value={data.bankName} onChange={(v) => handleChange('bankName', v)} />
        <InputField label="מספר סניף *" value={data.branchNumber} onChange={(v) => handleChange('branchNumber', v)} />
        <InputField label="מספר חשבון *" value={data.accountNumber} onChange={(v) => handleChange('accountNumber', v)} />
      </Section>

      {/* מסמכים */}
      <Section title="מסמכים מצורפים" colors={colors}>
        <FileUploadField 
          label="צילום תעודת זהות / דרכון *" 
          checked={data.hasIdCopy}
          onCheckChange={(v) => handleChange('hasIdCopy', v)}
          onFileChange={(file) => handleFileUpload('idCopyFile', file)}
          fileName={uploadedFiles.idCopyFile?.name}
          colors={colors}
        />
        <FileUploadField 
          label="מסמך זכויות (טאבו / אישור זכויות / חוזה שכירות) *" 
          checked={data.hasPropertyRights}
          onCheckChange={(v) => handleChange('hasPropertyRights', v)}
          onFileChange={(file) => handleFileUpload('propertyRightsFile', file)}
          fileName={uploadedFiles.propertyRightsFile?.name}
          colors={colors}
        />
        <FileUploadField 
          label="אישור ועד / חברת ניהול (אם נדרש)" 
          checked={data.hasCommitteeApproval}
          onCheckChange={(v) => handleChange('hasCommitteeApproval', v)}
          onFileChange={(file) => handleFileUpload('committeeApprovalFile', file)}
          fileName={uploadedFiles.committeeApprovalFile?.name}
          colors={colors}
        />
        <FileUploadField 
          label="אישור ניהול חשבון" 
          checked={data.hasAccountManagement}
          onCheckChange={(v) => handleChange('hasAccountManagement', v)}
          onFileChange={(file) => handleFileUpload('accountManagementFile', file)}
          fileName={uploadedFiles.accountManagementFile?.name}
          colors={colors}
        />
      </Section>

      {/* פרטי החניה */}
      <Section title="פרטי החניה" colors={colors}>
        <InputField label="כתובת מלאה *" value={data.fullAddress} onChange={(v) => handleChange('fullAddress', v)} />
        <InputField label="עיר *" value={data.city} onChange={(v) => handleChange('city', v)} />
        
        <RadioGroup 
          label="סוג החניה *" 
          options={['מקורה', 'פתוחה', 'חניון תת־קרקעי', 'חניה ברחוב']}
          selected={data.parkingType}
          onChange={(v) => handleChange('parkingType', v)}
        />

        <CheckboxGroup 
          label="גישה" 
          options={['שער עם קוד', 'שלט רחוק', 'שומר בכניסה', 'פתוחה ללא שער']}
          selected={data.accessType || []}
          onChange={(v) => handleCheckboxArray('accessType', v)}
        />

        <CheckboxGroup 
          label="מגבלות" 
          options={['אין כניסת רכבי גז', 'אין כניסת אופנועים', 'אחר']}
          selected={data.restrictions || []}
          onChange={(v) => handleCheckboxArray('restrictions', v)}
        />
        {data.restrictions?.includes('אחר') && (
          <InputField label="פרט מגבלות אחרות" value={data.restrictionsOther} onChange={(v) => handleChange('restrictionsOther', v)} />
        )}

        <CheckboxGroup 
          label="סוגי רכבים מתאימים" 
          options={['רכב מיני (קטן)', 'רכב משפחתי (סטנדרטי)', 'SUV / קרוסאובר', 'רכב גדול (וואן / מסחרי)']}
          selected={data.vehicleTypes || []}
          onChange={(v) => handleCheckboxArray('vehicleTypes', v)}
        />
      </Section>

      {/* תנאי בטיחות */}
      <Section title="תנאי בטיחות" colors={colors}>
        <CheckboxField label="תאורה תקינה בחניה" checked={data.hasLighting} onChange={(v) => handleChange('hasLighting', v)} />
        <CheckboxField label="כניסה ויציאה בטוחות" checked={data.hasSafeAccess} onChange={(v) => handleChange('hasSafeAccess', v)} />
        <CheckboxField label="סימון ברור של החניה" checked={data.hasClearMarking} onChange={(v) => handleChange('hasClearMarking', v)} />
        <CheckboxField label="אין מפגעים בשטח" checked={data.noHazards} onChange={(v) => handleChange('noHazards', v)} />
      </Section>

      {/* הצהרה */}
      <Section title="הצהרת בעל החניה" colors={colors}>
        <InputField label="שם *" value={data.declarationName} onChange={(v) => handleChange('declarationName', v)} />
        <div style={{ maxWidth: 400 }}>
          <InputField label="תאריך *" value={data.declarationDate} onChange={(v) => handleChange('declarationDate', v)} type="date" />
        </div>
      </Section>

      {/* כפתורים */}
      <div style={{ display: 'flex', gap: 16, marginTop: 32, flexDirection: 'row-reverse' }}>
        <button
          type="button"
          onClick={handleSendForSignature}
          disabled={sendingForSignature}
          style={{
            flex: 1,
            padding: '16px 32px',
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontSize: 18,
            fontWeight: '700',
            cursor: sendingForSignature ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'transform 0.2s',
            opacity: sendingForSignature ? 0.7 : 1,
          }}
          onMouseEnter={(e) => !sendingForSignature && (e.target.style.transform = 'translateY(-2px)')}
          onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
        >
          {sendingForSignature ? '📧 שולח...' : '📧 שלח ללקוח לחתימה'}
        </button>
        <button
          type="submit"
          style={{
            padding: '16px 32px',
            background: colors.success,
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          💾 שמור טיוטה
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '16px 32px',
            background: 'white',
            color: colors.text,
            border: `2px solid ${colors.border}`,
            borderRadius: 12,
            fontSize: 16,
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          ביטול
        </button>
      </div>
    </form>
    </div>

  );
}

// Helper Components
function Section({ title, children, colors }) {
  return (
    <div style={{ 
      marginBottom: 24,
      background: 'white', 
      padding: 24,
      width: '100%', 
      borderRadius: 12, 
      border: `2px solid ${colors.border}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <h2 style={{ 
        margin: '0 0 24px 0', 
        fontSize: 22, 
        fontWeight: '700', 
        color: colors.primary,
        borderBottom: `3px solid ${colors.primary}`,
        paddingBottom: 12,
        textAlign: 'right',
      }}>{title}</h2>
      <div style={{ display: 'grid', gap: 20 }}>
        {children}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = 'text' }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: 8, 
        fontSize: 15, 
        fontWeight: '600',
        color: '#1F2937',
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: '2px solid #E2E8F0',
          borderRadius: 10,
          fontSize: 15,
          transition: 'border-color 0.2s',
          direction: 'rtl',
          backgroundColor: '#FFFFFF',
          color: '#000000',
        }}
        onFocus={(e) => e.target.style.borderColor = '#7F93FF'}
        onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: 8, 
        fontSize: 15, 
        fontWeight: '600',
        color: '#1F2937',
      }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: '2px solid #E2E8F0',
          borderRadius: 10,
          fontSize: 15,
          direction: 'rtl',
          backgroundColor: '#FFFFFF',
          color: '#000000',
          cursor: 'pointer',
        }}
      >
        <option value="">בחר...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function FileUploadField({ label, checked, onCheckChange, onFileChange, fileName, colors }) {
  return (
    <div style={{ 
      padding: 16, 
      background: checked ? `${colors.success}10` : '#F8FAFC',
      borderRadius: 12,
      border: `2px solid ${checked ? colors.success : colors.border}`,
      textAlign: 'right',
    }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flexDirection: 'row-reverse' }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckChange(e.target.checked)}
          style={{ width: 20, height: 20, cursor: 'pointer' }}
        />
        <span style={{ fontSize: 15, fontWeight: '600', color: '#334155', flex: 1 }}>{label}</span>
      </label>
      {checked && (
        <div style={{ marginTop: 12 }}>
          <input
            type="file"
            onChange={(e) => onFileChange(e.target.files[0])}
            style={{ display: 'none' }}
            id={`file-${label}`}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
          <label
            htmlFor={`file-${label}`}
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              background: colors.primary,
              color: 'white',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: '600',
            }}
          >
            📎 בחר קובץ
          </label>
          {fileName && (
            <span style={{ marginRight: 12, fontSize: 14, color: colors.success, fontWeight: '600' }}>
              ✓ {fileName}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function CheckboxField({ label, checked, onChange }) {
  return (
    <label style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 12, 
      cursor: 'pointer',
      flexDirection: 'row-reverse',
      justifyContent: 'flex-end',
    }}>
      <span style={{ fontSize: 15, color: '#334155', fontWeight: '500' }}>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 20, height: 20, cursor: 'pointer' }}
      />
    </label>
  );
}

function CheckboxGroup({ label, options, selected, onChange }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: 12, 
        fontSize: 15, 
        fontWeight: '600',
        color: '#334155',
      }}>{label}</label>
      <div style={{ display: 'grid', gap: 12 }}>
        {options.map(opt => (
          <CheckboxField
            key={opt}
            label={opt}
            checked={selected.includes(opt)}
            onChange={() => onChange(opt)}
          />
        ))}
      </div>
    </div>
  );
}

function RadioGroup({ label, options, selected, onChange }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: 12, 
        fontSize: 15, 
        fontWeight: '600',
        color: '#334155',
      }}>{label}</label>
      <div style={{ display: 'grid', gap: 12 }}>
        {options.map(opt => (
          <label 
            key={opt}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              cursor: 'pointer',
              flexDirection: 'row-reverse',
              justifyContent: 'flex-end',
              padding: '12px 16px',
              background: selected === opt ? '#7F93FF15' : '#F8FAFC',
              borderRadius: 10,
              border: `2px solid ${selected === opt ? '#7F93FF' : '#E2E8F0'}`,
              transition: 'all 0.2s',
            }}
          >
            <span style={{ fontSize: 15, color: '#334155', fontWeight: '500' }}>{opt}</span>
            <input
              type="radio"
              name={label}
              checked={selected === opt}
              onChange={() => onChange(opt)}
              style={{ width: 20, height: 20, cursor: 'pointer', accentColor: '#7F93FF' }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
