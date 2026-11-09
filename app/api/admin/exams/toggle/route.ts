import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST: เปิด/ปิดข้อสอบ
export async function POST(request: Request) {
  try {
    const { id, is_active } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ไม่พบ ID ข้อสอบ' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('exams')
      .update({ is_active: is_active })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, exam: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}