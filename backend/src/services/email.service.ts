import nodemailer from 'nodemailer';

// יצירת transporter (בפיתוח - Ethereal, בפרודקשן - Gmail/SendGrid)
const createTransporter = () => {
  // בפיתוח - Ethereal (מייל מזויף לבדיקות)
  if (process.env.NODE_ENV !== 'production') {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: process.env.EMAIL_USER || 'test@ethereal.email',
        pass: process.env.EMAIL_PASS || 'test123',
      },
    });
  }

  // בפרודקשן - Gmail או SendGrid
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

interface OnboardingData {
  fullName: string;
  email: string;
  phone: string;
  idNumber: string;
  accountOwnerName: string;
  accountNumber: string;
  bankName: string;
  branchNumber: string;
  fullAddress: string;
  city: string;
  parkingType: string;
  declarationName: string;
  declarationDate: string;
}

/**
 * שליחת מייל לחתימה על טופס אונבורדינג
 */
export async function sendOnboardingSignatureEmail(
  to: string,
  onboardingData: OnboardingData,
  requestId: number
) {
  const transporter = createTransporter();

  const signatureUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/sign/${requestId}`;

  const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>אישור טופס אונבורדינג - Zpoto</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; direction: rtl;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #7F93FF; font-size: 32px; margin: 0;">🚗 Zpoto</h1>
      <p style="color: #64748B; font-size: 16px; margin-top: 8px;">ברוכים הבאים למשפחת בעלי החניות!</p>
    </div>

    <!-- Main Content -->
    <div style="background: linear-gradient(135deg, #7F93FF08, #A47BFF08); padding: 24px; border-radius: 12px; margin-bottom: 24px;">
      <h2 style="color: #334155; font-size: 20px; margin-top: 0;">שלום ${onboardingData.fullName},</h2>
      <p style="color: #475569; font-size: 16px; line-height: 1.6;">
        תודה שבחרת להצטרף ל-Zpoto כבעל חניה!<br>
        אנא עיין בפרטים הבאים ואשר את נכונותם על ידי חתימה על המסמך.
      </p>
    </div>

    <!-- Details Sections -->
    <div style="margin-bottom: 24px;">
      <h3 style="color: #7F93FF; font-size: 18px; border-bottom: 2px solid #7F93FF; padding-bottom: 8px;">📋 פרטים אישיים</h3>
      <table style="width: 100%; margin-top: 12px;">
        <tr><td style="padding: 8px 0; color: #64748B;">שם מלא:</td><td style="padding: 8px 0; color: #334155; font-weight: 600;">${onboardingData.fullName}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748B;">ת.ז / דרכון:</td><td style="padding: 8px 0; color: #334155; font-weight: 600;">${onboardingData.idNumber}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748B;">טלפון:</td><td style="padding: 8px 0; color: #334155; font-weight: 600;">${onboardingData.phone}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748B;">מייל:</td><td style="padding: 8px 0; color: #334155; font-weight: 600;">${onboardingData.email}</td></tr>
      </table>
    </div>

    <div style="margin-bottom: 24px;">
      <h3 style="color: #7F93FF; font-size: 18px; border-bottom: 2px solid #7F93FF; padding-bottom: 8px;">🏦 פרטי תשלום</h3>
      <table style="width: 100%; margin-top: 12px;">
        <tr><td style="padding: 8px 0; color: #64748B;">שם בעל החשבון:</td><td style="padding: 8px 0; color: #334155; font-weight: 600;">${onboardingData.accountOwnerName}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748B;">בנק:</td><td style="padding: 8px 0; color: #334155; font-weight: 600;">${onboardingData.bankName}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748B;">מספר סניף:</td><td style="padding: 8px 0; color: #334155; font-weight: 600;">${onboardingData.branchNumber}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748B;">מספר חשבון:</td><td style="padding: 8px 0; color: #334155; font-weight: 600;">${onboardingData.accountNumber}</td></tr>
      </table>
    </div>

    <div style="margin-bottom: 24px;">
      <h3 style="color: #7F93FF; font-size: 18px; border-bottom: 2px solid #7F93FF; padding-bottom: 8px;">🅿️ פרטי החניה</h3>
      <table style="width: 100%; margin-top: 12px;">
        <tr><td style="padding: 8px 0; color: #64748B;">כתובת:</td><td style="padding: 8px 0; color: #334155; font-weight: 600;">${onboardingData.fullAddress}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748B;">עיר:</td><td style="padding: 8px 0; color: #334155; font-weight: 600;">${onboardingData.city}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748B;">סוג חניה:</td><td style="padding: 8px 0; color: #334155; font-weight: 600;">${onboardingData.parkingType}</td></tr>
      </table>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${signatureUrl}" style="display: inline-block; background: linear-gradient(135deg, #7F93FF, #A47BFF); color: white; padding: 16px 48px; border-radius: 12px; text-decoration: none; font-size: 18px; font-weight: 700; box-shadow: 0 4px 12px rgba(127, 147, 255, 0.3);">
        📝 לחץ כאן לחתימה על המסמך
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 24px; border-top: 1px solid #E2E8F0;">
      <p style="color: #64748B; font-size: 14px; margin: 0;">
        אם יש לך שאלות, אנא צור קשר: <a href="mailto:support@zpoto.com" style="color: #7F93FF;">support@zpoto.com</a>
      </p>
      <p style="color: #94A3B8; font-size: 12px; margin-top: 8px;">
        © 2025 Zpoto. כל הזכויות שמורות.
      </p>
    </div>

  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: `"Zpoto" <${process.env.EMAIL_USER || 'noreply@zpoto.com'}>`,
    to,
    subject: '📋 אישור טופס אונבורדינג - Zpoto',
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent:', info.messageId);
    
    // בפיתוח - הדפס קישור לצפייה במייל
    if (process.env.NODE_ENV !== 'production') {
      console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error);
    throw error;
  }
}

/**
 * שליחת מייל אישור לאחר חתימה
 */
export async function sendSignatureConfirmationEmail(to: string, name: string) {
  const transporter = createTransporter();

  const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8">
  <title>אישור קבלת חתימה - Zpoto</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; padding: 20px; direction: rtl;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; padding: 32px;">
    <div style="text-align: center;">
      <h1 style="color: #22C55E; font-size: 48px; margin: 0;">✅</h1>
      <h2 style="color: #334155; font-size: 24px; margin-top: 16px;">המסמך נחתם בהצלחה!</h2>
      <p style="color: #64748B; font-size: 16px; margin-top: 12px;">
        שלום ${name},<br><br>
        קיבלנו את חתימתך על טופס האונבורדינג.<br>
        צוות Zpoto יבדוק את המסמכים ויאשר את חשבונך בקרוב.
      </p>
      <p style="color: #64748B; font-size: 14px; margin-top: 24px;">
        תודה שבחרת ב-Zpoto! 🚗
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const mailOptions = {
    from: `"Zpoto" <${process.env.EMAIL_USER || 'noreply@zpoto.com'}>`,
    to,
    subject: '✅ המסמך נחתם בהצלחה - Zpoto',
    html: htmlContent,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Confirmation email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Email error:', error);
    throw error;
  }
}
