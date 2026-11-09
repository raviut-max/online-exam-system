import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

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
      .single()

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

    // ส่ง OTP ทางอีเมลผ่าน Resend
    const { data, error } = await resend.emails.send({
      from: 'ระบบสอบออนไลน์ <onboarding@resend.dev>',
      to: [email],
      subject: 'รหัส OTP สำหรับตั้งรหัสผ่าน - ระบบสอบออนไลน์',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🔐 รหัส OTP ของคุณ</h2>
          <p style="font-size: 16px; color: #374151;">
            รหัสนักศึกษา: <strong>${student_code}</strong>
          </p>
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 4px; margin: 0;">
              ${otp}
            </p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">
            รหัสนี้จะหมดอายุใน <strong>10 นาที</strong>
          </p>
          <p style="font-size: 14px; color: #6b7280;">
            หากคุณไม่ได้ทำการร้องขอรหัสนี้ กรุณาเพิกเฉยต่ออีเมลนี้
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            © 2026 ระบบสอบออนไลน์
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('❌ [Send OTP] Resend Error:', error)
      return NextResponse.json({ error: 'ไม่สามารถส่ง OTP ได้' }, { status: 500 })
    }

    console.log('✅ [Send OTP] ส่ง OTP สำเร็จ:', { email, otp, messageId: data?.id })

    return NextResponse.json({ 
      success: true,
      message: 'ส่ง OTP เรียบร้อยแล้ว กรุณาตรวจสอบอีเมล'
    })

  } catch (error: any) {
    console.error('❌ [Send OTP] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}