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

    if (!student_code || !email || !password) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    await supabase
      .from('students')
      .update({ 
        email,
        password_hash: passwordHash,
        must_change_password: false
      })
      .eq('student_code', student_code)

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('Set password error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}