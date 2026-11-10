import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import nodemailer from 'nodemailer'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ⭐ สร้าง Nodemailer Transporter สำหรับ Gmail
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(request: Request) {
  try {
    const { student_code, email } = await request.json()
    console.log('🔍 [Send OTP] รับข้อมูล:', { student_code, email })

    if (!student_code || !email) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    // ตรวจสอบว่าอีเมลซ้ำหรือไม่
    const { data: existingStudent } = await supabase
      .from('students')
      .select('id')
      .eq('email', email)
      .neq('student_code', student_code)
      .maybeSingle()

    if (existingStudent) {
      return NextResponse.json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' }, { status: 409 })
    }

    // สร้าง OTP และบันทึก
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 นาที
    await supabase
      .from('students')
      .update({ 
        otp_code: otp,
        otp_expires_at: expiresAt.toISOString()
      })
      .eq('student_code', student_code)

    // ⭐ ส่ง OTP ทางอีเมลผ่าน Nodemailer (Gmail)
    const fromName = process.env.SMTP_FROM_NAME || 'ระบบสอบออนไลน์'
    const fromEmail = process.env.SMTP_USER
    
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject: 'รหัส OTP สำหรับ - ระบบสอบออนไลน์',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">🔐 ตั้งค่ารหัสผ่านของคุณ</h2>
          <p style="font-size: 16px; color: #374151;">
            รหัสนักศึกษา: <strong>${student_code}</strong>
          </p>
          <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; border: 1px solid #fecaca;">
            <p style="font-size: 32px; font-weight: bold; color: #dc2626; letter-spacing: 4px; margin: 0;">
              ${otp}
            </p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            รหัสนี้จะหมดอายุใน <strong>10 นาที</strong>
          </p>
          <p style="font-size: 14px; color: #6b7280;">
            หากคุณไม่ได้ทำการร้องขอตั้งค่ารหัสผ่าน กรุณาเพิกเฉยต่ออีเมลนี้
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            © 2026 ระบบสอบออนไลน์
          </p>
        </div>
      `,
    })

    console.log('✅ [Send OTP] ส่ง OTP สำเร็จ:', { 
      email, 
      otp, 
      messageId: info.messageId 
    })

    return NextResponse.json({ 
      success: true,
      message: 'ส่งรหัส OTP ไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบ'
    })

  } catch (error: any) {
    console.error('❌ [Send OTP] Error:', error)
    return NextResponse.json({ error: error.message || 'ไม่สามารถส่ง OTP ได้' }, { status: 500 })
  }
}