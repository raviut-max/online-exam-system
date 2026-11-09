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
    const body = await request.json()
    
    const { 
      title, 
      time_mode, 
      start_time, 
      end_time, 
      max_attempts_override,
      section 
    } = body

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
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน (ต้องมีชื่อ, เวลาเริ่ม, เวลาสิ้นสุด)' }, { status: 400 })
    }

    // 1. ตรวจสอบว่าข้อสอบมีอยู่จริง
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('id')
      .eq('id', examId)
      .single()

    if (examError || !exam) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลข้อสอบ' }, { status: 404 })
    }

    // 2. สร้าง session
    const { data: session, error: createError } = await supabase
      .from('exam_sessions')
      .insert({
        exam_id: examId,
        title,
        time_mode: time_mode || 'flexible',
        start_time: new Date(start_time).toISOString(),
        end_time: new Date(end_time).toISOString(),
        is_active: true,
        max_attempts_override: max_attempts_override ? parseInt(max_attempts_override) : null,
        section: section || null,
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ [Create Session API] สร้าง session ไม่สำเร็จ:', createError)
      // ส่ง error message กลับไปให้หน้าเว็บแสดงให้ผู้ใช้เห็น
      return NextResponse.json({ error: `ไม่สามารถสร้างรอบสอบได้: ${createError.message}` }, { status: 500 })
    }

    console.log('✅ [Create Session API] สร้างรอบสอบสำเร็จ:', session)
    return NextResponse.json({ success: true, session })

  } catch (error: any) {
    console.error('❌ [Create Session API] Error:', error)
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 })
  }
}