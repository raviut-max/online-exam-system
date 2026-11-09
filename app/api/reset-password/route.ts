import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { student_code, email, password } = await request.json()

    console.log('🔍 [Reset Password] รับข้อมูล:', { student_code, email, hasPassword: !!password })

    if (!student_code || !email || !password) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 })
    }

    // 1. ตรวจสอบว่ารหัสนักศึกษามีอยู่และมีอีเมลนี้จริง
    const { data: student, error } = await supabase
      .from('students')
      .select('id, student_code, email')
      .eq('student_code', student_code)
      .eq('email', email)
      .single()

    if (error || !student) {
      return NextResponse.json({ 
        error: 'รหัสนักศึกษาหรืออีเมลไม่ถูกต้อง' 
      }, { status: 404 })
    }

    // 2. Hash รหัสผ่านใหม่
    const passwordHash = await bcrypt.hash(password, 10)

    // 3. อัพเดตรหัสผ่านและล้าง OTP
    await supabase
      .from('students')
      .update({ 
        password_hash: passwordHash,
        must_change_password: false,
        otp_code: null,
        otp_expires_at: null
      })
      .eq('student_code', student_code)

    console.log('✅ [Reset Password] ตั้งรหัสผ่านใหม่สำเร็จ')

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('❌ [Reset Password] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}