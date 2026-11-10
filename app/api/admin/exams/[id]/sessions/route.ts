import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ⭐ ฟังก์ชันตรวจสอบและเตรียมเวลา (ไม่แปลงเป็น UTC)
const prepareTime = (timeStr: string | null | undefined): string | null => {
  if (!timeStr) return null
  
  try {
    // ถ้ามี timezone อยู่แล้ว (เช่น +07:00 หรือ Z) ให้ตรวจสอบว่า valid ไหม
    if (timeStr.includes('Z') || /[+-]\d{2}:\d{2}$/.test(timeStr)) {
      const date = new Date(timeStr)
      if (isNaN(date.getTime())) {
        console.error('❌ Invalid date:', timeStr)
        return null
      }
      // ⭐ ส่ง string เดิมกลับไป (ไม่แปลงเป็น UTC)
      return timeStr
    }
    
    // ถ้าไม่มี timezone ให้เติม +07:00
    const withTimezone = timeStr + '+07:00'
    const date = new Date(withTimezone)
    if (isNaN(date.getTime())) {
      console.error('❌ Invalid date after adding timezone:', timeStr)
      return null
    }
    // ⭐ ส่ง string ที่มี +07:00 กลับไป (ไม่แปลงเป็น UTC)
    return withTimezone
  } catch (error) {
    console.error('❌ Error parsing time:', timeStr, error)
    return null
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params
    const body = await request.json()
    
    console.log('📥 [API Sessions] รับข้อมูล:', body)
    
    const {
      title,
      time_mode,
      start_time,
      end_time,
      target_sections,
      max_attempts_override,
    } = body

    if (!title || !start_time || !end_time) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    // ⭐ เตรียมเวลา (ไม่แปลงเป็น UTC)
    const preparedStartTime = prepareTime(start_time)
    const preparedEndTime = prepareTime(end_time)
    
    if (!preparedStartTime || !preparedEndTime) {
      return NextResponse.json({ 
        error: 'รูปแบบเวลาไม่ถูกต้อง',
        debug: { start_time, end_time, preparedStartTime, preparedEndTime }
      }, { status: 400 })
    }

    console.log('🕐 [API Sessions] เวลาที่จะบันทึก:', {
      start: preparedStartTime,
      end: preparedEndTime
    })

    // ตรวจสอบว่า end_time ต้องมากกว่า start_time
    if (new Date(preparedEndTime) <= new Date(preparedStartTime)) {
      return NextResponse.json({ error: 'เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม' }, { status: 400 })
    }

    // สร้าง session
    const { data: session, error } = await supabase
      .from('exam_sessions')
      .insert({
        exam_id: examId,
        title,
        time_mode: time_mode || 'fixed',
        start_time: preparedStartTime,  // ⭐ ส่งเวลาที่มี timezone ไปตรงๆ
        end_time: preparedEndTime,      // ⭐ ส่งเวลาที่มี timezone ไปตรงๆ
        target_sections: target_sections || ['*'],
        max_attempts_override: max_attempts_override || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('❌ [API Sessions] Error:', error)
      return NextResponse.json({ 
        error: 'สร้างรอบสอบไม่สำเร็จ: ' + error.message,
        details: error 
      }, { status: 500 })
    }

    console.log('✅ [API Sessions] สร้างรอบสอบสำเร็จ:', session)

    return NextResponse.json({
      success: true,
      session,
      message: 'สร้างรอบสอบสำเร็จ'
    })

  } catch (error: any) {
    console.error('💥 [API Sessions] CRITICAL ERROR:', error)
    return NextResponse.json({ 
      error: error.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' 
    }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params

    const { data: sessions, error } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('exam_id', examId)
      .order('start_time', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sessions })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params

    const { error } = await supabase
      .from('exam_sessions')
      .delete()
      .eq('id', sessionId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}