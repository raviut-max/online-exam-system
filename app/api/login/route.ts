import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { student_code, password } = await request.json()

    console.log('🔍 [Login API] รับข้อมูล:', { student_code, hasPassword: !!password })

    if (!student_code) {
      return NextResponse.json({ error: 'กรุณากรอกรหัสนักศึกษา' }, { status: 400 })
    }

    // 1. ดึงข้อมูลนักศึกษา (รวม section)
    const { data: student, error } = await supabase
      .from('students')
      .select('id, student_code, full_name, email, password_hash, must_change_password, section')
      .eq('student_code', student_code)
      .single()

    console.log('📦 [Login API] ผลจาก DB:', { 
      found: !!student, 
      hasEmail: !!student?.email,
      hasPassword: !!student?.password_hash,
      section: student?.section,
      error: error?.message 
    })

    if (error || !student) {
      return NextResponse.json({ error: 'รหัสนักศึกษาไม่ถูกต้อง' }, { status: 404 })
    }

    // 2. ถ้าไม่มีอีเมล → ถือว่ายังไม่มีรหัสผ่าน → ให้ไป Setup Email
    if (!student.email) {
      console.log('✅ [Login API] ไม่มีอีเมล → Redirect ไป setup-email')
      return NextResponse.json({
        success: true,
        student: {
          id: student.id,
          student_code: student.student_code,
          full_name: student.full_name,
          email: null,
          must_change_password: true,
          section: student.section,
        },
      })
    }

    // 3. ถ้ามีอีเมลแล้ว → ตรวจสอบรหัสผ่าน
    if (!student.password_hash) {
      return NextResponse.json({ 
        error: 'ยังไม่มีรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบ' 
      }, { status: 403 })
    }

    const isPasswordValid = await bcrypt.compare(password, student.password_hash)
    console.log('🔐 [Login API] ตรวจสอบรหัสผ่าน:', { valid: isPasswordValid })
    
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'รหัสผ่านไม่ถูกต้อง' }, { status: 401 })
    }

    // 4. Login สำเร็จ
    return NextResponse.json({
      success: true,
      student: {
        id: student.id,
        student_code: student.student_code,
        full_name: student.full_name,
        email: student.email,
        must_change_password: student.must_change_password,
        section: student.section,
      },
    })

  } catch (error: any) {
    console.error('❌ [Login API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}