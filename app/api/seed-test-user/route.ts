import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashPassword } from '@/lib/password'

// ⚠️ Hardcode ชั่วคราวเพื่อทดสอบ - อย่าลืมลบออกทีหลัง!
const SUPABASE_URL = 'https://envmjcqkyrhpbpctqirr.supabase.co' // ← ใส่ URL จริงของคุณ
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVudm1qY3FreXJocGJwY3RxaXJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5Mzk0NTc5MywiZXhwIjoyMTA5NTIxNzkzfQ.Bcr6NbJqar-AJqeV6zJG-ojQhNycA-jocjxy2oxxsXg' // ← ใส่ service_role key จริงของคุณ

export async function GET() {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    const defaultPassword = '12345678'
    const hashedPassword = await hashPassword(defaultPassword)

    const { data, error } = await supabase
      .from('students')
      .insert([
        {
          student_code: '6501001',
          full_name: 'สมชาย ทดสอบ',
          email: null,
          department: 'คอมพิวเตอร์',
          year: 1,
          password_hash: hashedPassword,
          must_change_password: true,
        },
      ])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ 
          message: 'นักศึกษารหัสนี้มีอยู่แล้ว',
          login_info: { student_code: '6501001', password: '12345678' }
        })
      }
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'สร้างนักศึกษาทดลองสำเร็จ!',
      student: data,
      login_info: { student_code: '6501001', password: '12345678' }
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}