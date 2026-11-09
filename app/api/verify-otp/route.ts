import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { student_code, otp } = await request.json()

    if (!student_code || !otp) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    const { data: student, error } = await supabase
      .from('students')
      .select('otp_code, otp_expires_at')
      .eq('student_code', student_code)
      .single()

    if (error || !student) {
      return NextResponse.json({ error: 'ไม่พบข้อมูล' }, { status: 404 })
    }

    if (student.otp_code !== otp) {
      return NextResponse.json({ error: 'OTP ไม่ถูกต้อง' }, { status: 401 })
    }

    const expiresAt = new Date(student.otp_expires_at)
    if (new Date() > expiresAt) {
      return NextResponse.json({ error: 'OTP หมดอายุ' }, { status: 401 })
    }

    // ลบ OTP ที่ใช้แล้ว
    await supabase
      .from('students')
      .update({ otp_code: null, otp_expires_at: null })
      .eq('student_code', student_code)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Verify OTP error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}