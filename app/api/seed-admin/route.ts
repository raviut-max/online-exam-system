import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashPassword } from '@/lib/password'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const defaultPassword = 'admin@1234'
    const hashedPassword = await hashPassword(defaultPassword)

    const { data, error } = await supabase
      .from('admins')
      .insert([
        {
          email: 'ravi.ut@ssru.ac.th',
          full_name: 'อาจารย์ ravi',
          password_hash: hashedPassword,
        },
      ])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ 
          message: 'Admin มีอยู่แล้วในฐานข้อมูล',
          login_info: {
            email: 'ravi.ut@ssru.ac.th',
            password: 'admin@1234'
          }
        })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'สร้าง Admin สำเร็จ!',
      admin: data,
      login_info: {
        email: 'ravi.ut@ssru.ac.th',
        password: 'admin@1234'
      }
    })
    
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}