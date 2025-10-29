// OnboardingForm.jsx - טופס אונבורדינג מלא לבעל חניה
import { useState, useEffect } from 'react';

export default function OnboardingForm({ initialData, onSave, onCancel, colors, requestId, approve, reject, onParkingCreated }) {
  // Add CSS for spinner animation
  const spinnerStyle = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  
  // Inject CSS
  if (typeof document !== 'undefined' && !document.getElementById('spinner-style')) {
    const style = document.createElement('style');
    style.id = 'spinner-style';
    style.textContent = spinnerStyle;
    document.head.appendChild(style);
  }
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
  
  // Geocoding state
  const [geocoding, setGeocoding] = useState(false);
  const [coordinates, setCoordinates] = useState({ lat: null, lng: null });
  const [geocodingError, setGeocodingError] = useState('');

  // Documents system state
  const [documentsData, setDocumentsData] = useState({
    documentTypes: [],
    uploadedDocuments: [],
    loading: false,
    uploading: false
  });

  const handleFileUpload = (field, file) => {
    setUploadedFiles(prev => ({ ...prev, [field]: file }));
    handleChange(field, file.name);
  };

  // Load document types on component mount
  useEffect(() => {
    loadDocumentTypes();
  }, []);

  const loadDocumentTypes = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/documents/types', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocumentsData(prev => ({
          ...prev,
          documentTypes: data.documentTypes || []
        }));
      }
    } catch (error) {
      console.error('Error loading document types:', error);
    }
  };

  // Upload document to new system
  const uploadDocumentToSystem = async (file, documentType, userId) => {
    if (!file || !documentType || !userId) return null;

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('userId', userId.toString());
      formData.append('documentType', documentType);

      const response = await fetch('http://localhost:4000/api/documents/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        return result.document;
      } else {
        const error = await response.json();
        console.error('Upload error:', error);
        return null;
      }
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  // Geocoding function
  const performGeocoding = async (address) => {
    if (!address || address.trim().length < 5) {
      setCoordinates({ lat: null, lng: null });
      setGeocodingError('');
      return;
    }

    setGeocoding(true);
    setGeocodingError('');

    try {
      // Using OpenStreetMap Nominatim (same as the app)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address.trim())}&format=jsonv2&accept-language=he&addressdetails=1&limit=1`,
        {
          headers: {
            'User-Agent': 'ZpotoAdmin/1.0 (onboarding)'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }

      const results = await response.json();
      
      if (results && results.length > 0) {
        const result = results[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        setCoordinates({ lat, lng });
        console.log(`🗺️ Geocoded "${address}" to: ${lat}, ${lng}`);
        console.log(`📍 Full result: ${result.display_name}`);
      } else {
        setCoordinates({ lat: null, lng: null });
        setGeocodingError('לא נמצא מיקום מתאים לכתובת זו');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      setCoordinates({ lat: null, lng: null });
      setGeocodingError('שגיאה בחיפוש מיקום');
    } finally {
      setGeocoding(false);
    }
  };

  // Auto-geocoding when address changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (data.fullAddress) {
        performGeocoding(data.fullAddress);
      }
    }, 1000); // 1 second delay

    return () => clearTimeout(timeoutId);
  }, [data.fullAddress]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Include coordinates in the data
    const dataWithCoordinates = {
      ...data,
      lat: coordinates.lat,
      lng: coordinates.lng
    };
    
    // Save the onboarding data first
    await onSave(dataWithCoordinates, uploadedFiles);
    
    // Upload documents to the new system if we have the user ID
    if (documentsData.uploadedDocuments.length > 0) {
      try {
        console.log(`📄 Starting document upload for ${documentsData.uploadedDocuments.length} documents`);
        console.log('📋 Documents to upload:', documentsData.uploadedDocuments.map(doc => ({
          name: doc.docTypeData.nameHe,
          type: doc.documentType,
          fileName: doc.file.name,
          size: doc.file.size
        })));
        
        const response = await fetch(`http://localhost:4000/api/admin/listing-requests/${requestId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
          },
        });
        
        if (response.ok) {
          const requestData = await response.json();
          const userId = requestData.userId;
          console.log(`🔑 Got userId from request: ${userId} (requestId: ${requestId})`);
          
          // Upload each document
          let successCount = 0;
          let failCount = 0;
          
          for (const doc of documentsData.uploadedDocuments) {
            console.log(`📄 Uploading ${doc.docTypeData.nameHe} (${doc.file.name}, ${doc.file.size} bytes)...`);
            const result = await uploadDocumentToSystem(doc.file, doc.documentType, userId);
            if (result) {
              console.log(`✅ Uploaded ${doc.docTypeData.nameHe} successfully - Document ID: ${result.id}`);
              successCount++;
            } else {
              console.error(`❌ Failed to upload ${doc.docTypeData.nameHe}`);
              failCount++;
            }
          }
          
          console.log(`📊 Upload summary: ${successCount} success, ${failCount} failed`);
        } else {
          console.error('❌ Failed to get request data:', response.status, await response.text());
        }
        
        // Store document metadata in onboarding data for later use during approval
        dataWithCoordinates.uploadedDocumentIds = documentsData.uploadedDocuments.map(doc => ({
          documentType: doc.documentType,
          fileName: doc.file.name,
          docTypeData: doc.docTypeData
        }));
        
      } catch (error) {
        console.error('Error uploading documents:', error);
      }
    }
  };

  const handleSendForSignature = async (e) => {
    e.preventDefault();
    
    // בדיקת שדות חובה
    const requiredBankFields = ['accountOwnerName', 'bankName', 'branchNumber', 'accountNumber'];
    const missingBankFields = requiredBankFields.filter(field => !data[field] || data[field].trim() === '');
    
    if (missingBankFields.length > 0) {
      alert('❌ נדרש למלא את כל פרטי חשבון הבנק:\n- ' + 
        missingBankFields.map(field => {
          switch(field) {
            case 'accountOwnerName': return 'שם בעל החשבון';
            case 'bankName': return 'שם הבנק';
            case 'branchNumber': return 'מספר סניף';
            case 'accountNumber': return 'מספר חשבון';
            default: return field;
          }
        }).join('\n- '));
      setSendingForSignature(false);
      return;
    }
    
    setSendingForSignature(true);
    try {
      // שמירת הנתונים עם קואורדינטות
      const dataWithCoordinates = {
        ...data,
        lat: coordinates.lat,
        lng: coordinates.lng
      };
      await onSave(dataWithCoordinates, uploadedFiles);
      
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

  const handleCreateParking = async (e) => {
    e.preventDefault();
    
    // בדיקת שדות חובה
    const requiredBankFields = ['accountOwnerName', 'bankName', 'branchNumber', 'accountNumber'];
    const missingBankFields = requiredBankFields.filter(field => !data[field] || data[field].trim() === '');
    
    if (missingBankFields.length > 0) {
      alert('❌ נדרש למלא את כל פרטי חשבון הבנק:\n- ' + 
        missingBankFields.map(field => {
          switch(field) {
            case 'accountOwnerName': return 'שם בעל החשבון';
            case 'bankName': return 'שם הבנק';
            case 'branchNumber': return 'מספר סניף';
            case 'accountNumber': return 'מספר חשבון';
            default: return field;
          }
        }).join('\n- '));
      return;
    }
    
    setSendingForSignature(true);
    try {
      // שמירת הנתונים עם קואורדינטות
      const dataWithCoordinates = {
        ...data,
        lat: coordinates.lat,
        lng: coordinates.lng
      };
      
      // שמירת נתוני האונבורדינג
      await onSave(dataWithCoordinates, uploadedFiles);
      
      // יצירת חניה חדשה (אישור הבקשה)
      const approveResponse = await fetch(`http://localhost:4000/api/admin/listing-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        }
      });
      
      if (approveResponse.ok) {
        const result = await approveResponse.json();
        
        // הודעת הצלחה והפניה לדף החניה
        alert(`✅ החניה נוצרה בהצלחה!\n\n🔒 החניה נוצרה במצב חסום - יש למלא מסמכים ולהסיר חסימה\n\n📄 עכשיו תועבר לדף החניה למילוי מסמכים`);
        
        // הפניה לדף החניה באמצעות הקולבק החדש
        if (result.parking && result.parking.id && onParkingCreated) {
          onParkingCreated(result.parking);
        } else {
          // אם אין parking ID או קולבק, נחזור לדף הראשי
          onCancel();
        }
      } else {
        const errorData = await approveResponse.json();
        alert('❌ שגיאה ביצירת החניה: ' + (errorData.error || 'שגיאה לא ידועה'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('❌ שגיאה ביצירת החניה: ' + error.message);
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

      {/* פרטי החניה */}
      <Section title="פרטי החניה" colors={colors}>
        {/* כתובת מלאה מאוחדת */}
        <div style={{ marginBottom: '16px' }}>
          <InputField 
            label="כתובת החניה המלאה *" 
            value={data.fullAddress} 
            onChange={(v) => {
              handleChange('fullAddress', v);
              // אוטומטית עדכן את העיר כך שהקוד הקיים ימשיך לעבוד
              const parts = v.split(',');
              if (parts.length >= 2) {
                const city = parts[parts.length - 1].trim();
                handleChange('city', city);
              }
            }} 
            placeholder="רחוב ומספר בית, עיר - למשל: רוטשילד 21, תל אביב"
          />
          
          {/* Geocoding Status */}
          <div style={{ fontSize: '14px' }}>
            {geocoding && (
              <div style={{ color: colors.primary, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '16px', 
                  height: '16px', 
                  border: `2px solid ${colors.primary}`, 
                  borderTop: '2px solid transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                מחפש מיקום...
              </div>
            )}
            
            {!geocoding && coordinates.lat && coordinates.lng && (
              <div style={{ color: colors.success, display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✅ מיקום נמצא: {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
              </div>
            )}
            
            {!geocoding && geocodingError && (
              <div style={{ color: colors.error }}>
                ❌ {geocodingError}
              </div>
            )}
            
            {!geocoding && data.fullAddress && !coordinates.lat && !geocodingError && (
              <div style={{ color: colors.subtext }}>
                💡 הזן כתובת מלאה לחיפוש מיקום אוטומטי
              </div>
            )}
          </div>
          
          {/* Mini Map Preview */}
          {coordinates.lat && coordinates.lng && (
            <div style={{ 
              marginTop: '12px', 
              border: `1px solid ${colors.border}`, 
              borderRadius: '8px',
              overflow: 'hidden'
            }}>
              <iframe
                width="100%"
                height="200"
                frameBorder="0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${coordinates.lng-0.01},${coordinates.lat-0.01},${coordinates.lng+0.01},${coordinates.lat+0.01}&layer=mapnik&marker=${coordinates.lat},${coordinates.lng}`}
                style={{ border: 'none' }}
                title="מיקום החניה"
              />
              <div style={{ 
                padding: '8px', 
                backgroundColor: colors.bg, 
                fontSize: '12px', 
                color: colors.subtext,
                textAlign: 'center'
              }}>
                🗺️ תצוגה מקדימה של מיקום החניה
              </div>
            </div>
          )}
        </div>
        
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


      {/* כפתורים */}
      <div style={{ display: 'flex', gap: 16, marginTop: 32, flexDirection: 'row-reverse' }}>
        <button
          type="button"
          onClick={handleCreateParking}
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
          {sendingForSignature ? '🏗️ יוצר חניה...' : '🏗️ צור חניה והעבר לניהול מסמכים'}
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

// Component for document upload field
function DocumentUploadField({ documentType, colors, onFileUpload, uploadedFile }) {
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = JSON.parse(documentType.allowedMimeTypes);
      if (!allowedTypes.includes(file.type)) {
        alert(`סוג קובץ לא מתאים. סוגים מותרים: ${allowedTypes.join(', ')}`);
        return;
      }
      
      // Validate file size
      const maxSizeBytes = documentType.maxFileSizeKB * 1024;
      if (file.size > maxSizeBytes) {
        alert(`קובץ גדול מדי. גודל מקסימלי: ${documentType.maxFileSizeKB}KB`);
        return;
      }
      
      onFileUpload(file);
    }
  };

  return (
    <div style={{ 
      padding: '16px', 
      border: `2px solid ${uploadedFile ? colors.success : colors.border}`, 
      borderRadius: '8px',
      backgroundColor: uploadedFile ? colors.success + '10' : 'white'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{ fontSize: '24px' }}>
          {documentType.name.includes('identity') ? '🆔' :
           documentType.name.includes('ownership') ? '🏠' :
           documentType.name.includes('parking_photo') ? '📸' :
           documentType.name.includes('committee') ? '✅' :
           documentType.name.includes('service') ? '📋' : '📄'}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: '600', color: colors.text }}>
            {documentType.nameHe}
            {documentType.isRequired && <span style={{ color: colors.error }}> *</span>}
          </div>
          <div style={{ fontSize: '12px', color: colors.subtext }}>
            {documentType.description}
          </div>
        </div>
        {uploadedFile && (
          <div style={{ fontSize: '20px', color: colors.success }}>✅</div>
        )}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <input
          type="file"
          accept={JSON.parse(documentType.allowedMimeTypes).join(',')}
          onChange={handleFileChange}
          style={{ flex: 1, padding: '8px', fontSize: '14px' }}
        />
        <div style={{ fontSize: '12px', color: colors.subtext }}>
          מקס {documentType.maxFileSizeKB}KB
        </div>
      </div>
      
      {uploadedFile && (
        <div style={{ marginTop: '8px', fontSize: '14px', color: colors.success }}>
          📎 {uploadedFile.name} ({Math.round(uploadedFile.size / 1024)}KB)
        </div>
      )}
      
      {documentType.requiresSignature && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: colors.warning, fontWeight: '600' }}>
          ✍️ מסמך זה יישלח לחתימה דיגיטלית
        </div>
      )}
    </div>
  );
}
