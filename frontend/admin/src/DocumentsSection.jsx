import React, { useState, useEffect } from 'react';

// Documents Section Component
export default function DocumentsSection({ owner, colors }) {
  const [documentsData, setDocumentsData] = useState({
    documents: [],
    documentTypes: [],
    loading: false,
    uploading: false,
    selectedFile: null,
    selectedDocType: '',
    showUploadForm: false
  });

  // Load documents and document types
  useEffect(() => {
    if (owner.id) {
      loadDocuments();
      loadDocumentTypes();
    }
  }, [owner.id]);

  const loadDocuments = async () => {
    if (!owner.id) {
      console.log('🚫 No owner.id found:', owner);
      return;
    }
    
    console.log(`📄 Loading documents for owner ID: ${owner.id}`);
    setDocumentsData(prev => ({ ...prev, loading: true }));
    
    try {
      const response = await fetch(`http://localhost:4000/api/documents/user/${owner.id}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });
      
      console.log(`📡 Documents API response status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📄 Documents loaded:`, data.documents);
        setDocumentsData(prev => ({
          ...prev,
          documents: data.documents || [],
          loading: false
        }));
      } else {
        const errorText = await response.text();
        console.error('📄 Documents API error:', response.status, errorText);
        throw new Error(`Failed to load documents: ${response.status}`);
      }
      
    } catch (error) {
      console.error('Error loading documents:', error);
      setDocumentsData(prev => ({ ...prev, loading: false }));
    }
  };

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

  const handleFileUpload = async () => {
    if (!documentsData.selectedFile || !documentsData.selectedDocType) {
      alert('אנא בחר קובץ וסוג מסמך');
      return;
    }

    if (!owner.id) {
      alert('לא נמצא זיהוי בעל החניה');
      console.error('Owner ID missing:', owner);
      return;
    }

    console.log(`🔄 Uploading document for owner ID: ${owner.id}`);
    setDocumentsData(prev => ({ ...prev, uploading: true }));

    try {
      const formData = new FormData();
      formData.append('document', documentsData.selectedFile);
      formData.append('userId', owner.id.toString());
      formData.append('documentType', documentsData.selectedDocType);
      
      console.log('📤 FormData contents:', {
        userId: owner.id,
        documentType: documentsData.selectedDocType,
        fileName: documentsData.selectedFile.name
      });

      const response = await fetch('http://localhost:4000/api/documents/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: formData,
      });

      console.log(`📡 Upload response status: ${response.status}`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Upload successful:', result);
        alert('מסמך הועלה בהצלחה!');
        
        // Reset form
        setDocumentsData(prev => ({
          ...prev,
          selectedFile: null,
          selectedDocType: '',
          showUploadForm: false,
          uploading: false
        }));
        
        // Reload documents
        loadDocuments();
      } else {
        const errorText = await response.text();
        console.error(`❌ Upload failed (${response.status}):`, errorText);
        try {
          const error = JSON.parse(errorText);
          alert(`שגיאה בהעלאת המסמך: ${error.error || 'שגיאה לא ידועה'}`);
        } catch {
          alert(`שגיאה בהעלאת המסמך: ${errorText || 'שגיאה לא ידועה'}`);
        }
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('שגיאה בהעלאת המסמך');
    } finally {
      setDocumentsData(prev => ({ ...prev, uploading: false }));
    }
  };

  const handleDocumentAction = async (documentId, action, data = {}) => {
    try {
      const response = await fetch(`http://localhost:4000/api/documents/${documentId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const actionText = action === 'approve' ? 'אושר' : 'נדחה';
        alert(`המסמך ${actionText} בהצלחה!`);
        loadDocuments(); // Reload
      } else {
        const error = await response.json();
        alert(`שגיאה: ${error.error || 'שגיאה לא ידועה'}`);
      }
      
    } catch (error) {
      console.error('Document action error:', error);
      alert('שגיאה בביצוע הפעולה');
    }
  };

  const viewDocument = async (documentId) => {
    try {
      const response = await fetch(`http://localhost:4000/api/documents/secure/${documentId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // נקה את ה-URL אחרי 5 שניות
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } else {
        const error = await response.json();
        alert(`שגיאה בצפייה במסמך: ${error.error || 'שגיאה לא ידועה'}`);
      }
    } catch (error) {
      console.error('Error viewing document:', error);
      alert('שגיאה בצפייה במסמך');
    }
  };

  return (
    <div style={{ background: 'white', borderRadius: 20, padding: 32, marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 24, fontWeight: '700', color: colors.text, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 32 }}>📄</span> מערכת מסמכים
        </h2>
        <button
          onClick={() => setDocumentsData(prev => ({ ...prev, showUploadForm: !prev.showUploadForm }))}
          style={{
            padding: '12px 20px',
            backgroundColor: colors.primary,
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
          <span>📎</span>
          {documentsData.showUploadForm ? 'ביטול' : 'העלה מסמך'}
        </button>
      </div>

      {/* Upload form */}
      {documentsData.showUploadForm && (
        <div style={{ 
          padding: 24, 
          background: '#f8fafc', 
          borderRadius: 12, 
          border: '2px solid #e2e8f0',
          marginBottom: 24,
          maxWidth: '600px',
          margin: '0 auto 24px auto'
        }}>
          <h3 style={{ 
            margin: '0 0 20px 0', 
            fontSize: 18, 
            fontWeight: '600', 
            color: '#1f2937',
            textAlign: 'center'
          }}>
            📎 העלאת מסמך חדש
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                fontSize: 14, 
                fontWeight: '600', 
                color: '#374151',
                textAlign: 'right'
              }}>
                סוג המסמך
              </label>
              <select
                value={documentsData.selectedDocType}
                onChange={(e) => setDocumentsData(prev => ({ ...prev, selectedDocType: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  backgroundColor: 'white',
                  color: '#111827',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="" style={{ color: '#6b7280' }}>בחר סוג מסמך...</option>
                {documentsData.documentTypes.map(type => (
                  <option key={type.id} value={type.name} style={{ color: '#111827' }}>
                    {type.nameHe} {type.isRequired ? '(חובה)' : '(אופציונלי)'}
                  </option>
                ))}
              </select>
            </div>

            {/* הנחיות מיוחדות לתמונות חניה */}
            {documentsData.selectedDocType && documentsData.selectedDocType.includes('parking_') && (
              <div style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                border: '2px solid #f59e0b',
                borderRadius: 12,
                padding: 16,
                textAlign: 'right'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8, 
                  marginBottom: 12,
                  justifyContent: 'flex-end'
                }}>
                  <span style={{ fontSize: 18 }}>📸</span>
                  <h4 style={{ 
                    color: '#92400e', 
                    fontSize: 14, 
                    fontWeight: '700', 
                    margin: 0 
                  }}>
                    הנחיות חשובות לתמונות החניה
                  </h4>
                </div>
                <div style={{ color: '#92400e', fontSize: 13, lineHeight: 1.5 }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong>⚠️ חובה לצלם באור יום בלבד!</strong>
                  </div>
                  {documentsData.selectedDocType === 'parking_entrance' && (
                    <div>• תמונה של הכניסה לחניה<br/>• חייב לכלול מספר בית, שער או שלט זפוטו</div>
                  )}
                  {documentsData.selectedDocType === 'parking_empty' && (
                    <div>• תמונה של החניה ריקה<br/>• חייב לכלול את כל גודל החניה וסימון הרצפה</div>
                  )}
                  {documentsData.selectedDocType === 'parking_with_car' && (
                    <div>• תמונה של רכב עומד בחניה<br/>• בדיוק כמו שבעל החניה רוצה</div>
                  )}
                  {documentsData.selectedDocType === 'parking_additional' && (
                    <div>• תמונה נוספת שחשובה לבעל החניה<br/>• באור יום בלבד</div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: 8, 
                fontSize: 14, 
                fontWeight: '600', 
                color: '#374151',
                textAlign: 'right'
              }}>
                קובץ
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(e) => setDocumentsData(prev => ({ ...prev, selectedFile: e.target.files[0] }))}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #d1d5db',
                  borderRadius: 8,
                  fontSize: 14,
                  backgroundColor: 'white',
                  color: '#111827',
                  cursor: 'pointer'
                }}
              />
              {documentsData.selectedFile && (
                <div style={{ 
                  marginTop: 8, 
                  fontSize: 12, 
                  color: '#059669',
                  fontWeight: '500',
                  textAlign: 'right'
                }}>
                  ✅ קובץ נבחר: {documentsData.selectedFile.name} ({Math.round(documentsData.selectedFile.size / 1024)} KB)
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'center' }}>
            <button
              onClick={handleFileUpload}
              disabled={documentsData.uploading || !documentsData.selectedFile || !documentsData.selectedDocType}
              style={{
                padding: '12px 24px',
                backgroundColor: documentsData.uploading || !documentsData.selectedFile || !documentsData.selectedDocType 
                  ? '#9ca3af' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: '600',
                cursor: documentsData.uploading || !documentsData.selectedFile || !documentsData.selectedDocType 
                  ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              {documentsData.uploading ? (
                <>
                  <span>⏳</span>
                  מעלה...
                </>
              ) : (
                <>
                  <span>📤</span>
                  העלה מסמך
                </>
              )}
            </button>
            
            <button
              onClick={() => setDocumentsData(prev => ({ 
                ...prev, 
                showUploadForm: false, 
                selectedFile: null, 
                selectedDocType: '' 
              }))}
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
      )}

      {/* Documents list */}
      {documentsData.loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.subtext }}>
          טוען מסמכים...
        </div>
      ) : documentsData.documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, color: colors.subtext }}>
          אין מסמכים עדיין. השתמש בכפתור "העלה מסמך" להוספת מסמכים.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {documentsData.documents.map(doc => (
            <div key={doc.id} style={{ 
              padding: 20, 
              background: colors.bg, 
              borderRadius: 12, 
              border: `2px solid ${colors.border}`,
              display: 'flex',
              alignItems: 'center',
              gap: 16
            }}>
              <div style={{ fontSize: 32 }}>
                {doc.documentType.includes('זהות') ? '🆔' :
                 doc.documentType.includes('בעלות') ? '🏠' :
                 doc.documentType.includes('תמונה') ? '📸' :
                 doc.documentType.includes('ועד') ? '✅' :
                 doc.documentType.includes('הסכם') ? '📋' : '📄'}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 }}>
                  {doc.documentType}
                </div>
                <div style={{ fontSize: 14, color: colors.subtext, marginBottom: 4 }}>
                  {doc.originalFileName}
                </div>
                <div style={{ fontSize: 12, color: colors.subtext }}>
                  הועלה: {new Date(doc.createdAt).toLocaleDateString('he-IL')}
                  {doc.uploadedBy && ` • על ידי: ${doc.uploadedBy}`}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: '600',
                  backgroundColor: 
                    doc.status === 'APPROVED' ? colors.success + '20' :
                    doc.status === 'REJECTED' ? colors.error + '20' :
                    doc.status === 'PROCESSING' ? colors.primary + '20' :
                    colors.subtext + '20',
                  color:
                    doc.status === 'APPROVED' ? colors.success :
                    doc.status === 'REJECTED' ? colors.error :
                    doc.status === 'PROCESSING' ? colors.primary :
                    colors.subtext
                }}>
                  {doc.status === 'APPROVED' ? '✅ אושר' :
                   doc.status === 'REJECTED' ? '❌ נדחה' :
                   doc.status === 'PROCESSING' ? '⏳ בעיבוד' :
                   '📋 ממתין'}
                </div>
                {doc.requiresSignature && (
                  <div style={{ fontSize: 10, color: colors.subtext, marginTop: 4 }}>
                    {doc.signatureStatus === 'SIGNED' ? '✍️ נחתם' : 
                     doc.signatureStatus === 'SENT' ? '📤 נשלח לחתימה' :
                     '✍️ דורש חתימה'}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => viewDocument(doc.id)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  👁️ צפה
                </button>

                {doc.status === 'UPLOADED' && (
                  <>
                    <button
                      onClick={() => handleDocumentAction(doc.id, 'approve')}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: colors.success,
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      ✅ אשר
                    </button>
                    
                    <button
                      onClick={() => {
                        const reason = prompt('סיבת הדחייה:');
                        if (reason) {
                          handleDocumentAction(doc.id, 'reject', { reason });
                        }
                      }}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: colors.error,
                        color: 'white',
                        border: 'none',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      ❌ דחה
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
