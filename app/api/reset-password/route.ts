import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { student_code, otp, new_password } = await request.json()
    console.log('🔍 [Reset Password] รับข้อมูล:', { student_code })

    if (!student_code || !otp || !new_password) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    // 1. ดึงข้อมูลนักศึกษาเพื่อตรวจสอบ OTP
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, student_code, otp_code, otp_expires_at')
      .eq('student_code', student_code)
      .maybeSingle()

    if (studentError || !student) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลนักศึกษา' }, { status: 404 })
    }

    // 2. ตรวจสอบความถูกต้องของ OTP
    if (student.otp_code !== otp) {
      return NextResponse.json({ error: 'รหัส OTP ไม่ถูกต้อง' }, { status: 400 })
    }

    // 3. ตรวจสอบว่า OTP หมดอายุหรือยัง
    const expiresAt = new Date(student.otp_expires_at)
    if (new Date() > expiresAt) {
      return NextResponse.json({ error: 'รหัส OTP หมดอายุแล้ว กรุณาขอใหม่' }, { status: 400 })
    }

    // 4. อัพเดทรหัสผ่านและล้าง OTP
    const { error: updateError } = await supabase
      .from('students')
      .update({ 
        password: new_password,
        otp_code: null,
        otp_expires_at: null
      })
      .eq('student_code', student_code)

    if (updateError) {
      console.error('❌ [Reset Password] Update Error:', updateError)
      return NextResponse.json({ error: 'ไม่สามารถอัพเดทรหัสผ่านได้' }, { status: 500 })
    }

    console.log('✅ [Reset Password] อัพเดทรหัสผ่านสำเร็จ:', student_code)

    return NextResponse.json({ 
      success: true,
      message: 'ตั้งรหัสผ่านใหม่สำเร็จแล้ว กรุณาเข้าสู่ระบบ'
    })

  } catch (error: any) {
    console.error('❌ [Reset Password] CRITICAL Error:', error)
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 })
  }
}