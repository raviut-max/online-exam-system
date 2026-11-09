import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params
    const { 
      title, 
      time_mode, 
      start_time, 
      end_time, 
      max_attempts_override,
      section 
    } = await request.json()

    console.log('📝 [Create Session API] รับข้อมูล:', {
      examId,
      title,
      time_mode,
      start_time,
      end_time,
      max_attempts_override,
      section
    })

    if (!title || !start_time || !end_time) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    // ⭐ ตรวจสอบว่าข้อสอบมีอยู่จริง
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id')
      .eq('id', examId)
      .single()

    if (examError || !exam) {
      return NextResponse.json({ error: 'ไม่พบข้อสอบ' }, { status: 404 })
    }

    // ⭐ สร้าง session
    const { data: session, error: createError } = await supabase
      .from('exam_sessions')
      .insert({
        exam_id: examId,
        title,
        time_mode: time_mode || 'flexible',
        start_time: new Date(start_time).toISOString(),  // ⭐ แปลงเป็น ISO string
        end_time: new Date(end_time).toISOString(),      // ⭐ แปลงเป็น ISO string
        is_active: true,
        max_attempts_override: max_attempts_override || null,
        section: section || null,
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ [Create Session API] สร้าง session ไม่สำเร็จ:', createError)
      return NextResponse.json({ error: 'ไม่สามารถสร้างรอบสอบได้' }, { status: 500 })
    }

    console.log('✅ [Create Session API] สร้างรอบสอบสำเร็จ:', session)

    return NextResponse.json({ success: true, session })

  } catch (error: any) {
    console.error('❌ [Create Session API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}