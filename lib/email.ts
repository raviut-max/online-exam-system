import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendOTPEmail(email: string, otp: string) {
  const { data, error } = await resend.emails.send({
    from: 'ระบบสอบออนไลน์ <onboarding@resend.dev>',
    to: email,
    subject: 'รหัส OTP สำหรับยืนยันอีเมล - ระบบสอบออนไลน์',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">รหัส OTP สำหรับยืนยันอีเมล</h2>
        <p>กรุณาใช้รหัสนี้เพื่อยืนยันอีเมลของคุณในการเข้าใช้งานระบบสอบออนไลน์:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h1 style="font-size: 32px; letter-spacing: 8px; color: #2563eb; margin: 0;">
            ${otp}
          </h1>
        </div>
        <p>รหัสนี้มีอายุ <strong>5 นาที</strong></p>
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          หากคุณไม่ได้ร้องขอรหัส OTP นี้ กรุณาเพิกเฉยต่ออีเมลนี้
        </p>
      </div>
    `,
  })

  if (error) {
    console.error('Error sending email:', error)
    throw new Error('Failed to send OTP email')
  }
  
  return data
}