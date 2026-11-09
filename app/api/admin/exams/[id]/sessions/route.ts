import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: ดึง sessions ทั้งหมดของข้อสอบนี้
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params

    const { data, error } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('exam_id', examId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ sessions: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: สร้าง session ใหม่
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
      target_sections,
      max_attempts_override,
    } = body

    if (!title || !time_mode) {
      return NextResponse.json({ 
        error: 'กรุณากรอกชื่อรอบสอบและโหมดเวลา' 
      }, { status: 400 })
    }

    // ตรวจสอบเวลาตามโหมด
    if (time_mode === 'fixed' && (!start_time || !end_time)) {
      return NextResponse.json({ 
        error: 'โหมด fixed ต้องมีเวลาเริ่มและสิ้นสุด' 
      }, { status: 400 })
    }

    if (time_mode === 'flexible' && (!start_time || !end_time)) {
      return NextResponse.json({ 
        error: 'โหมด flexible ต้องมีวันเริ่มและวันสิ้นสุด' 
      }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('exam_sessions')
      .insert([{
        exam_id: examId,
        title,
        time_mode,
        start_time: start_time || null,
        end_time: end_time || null,
        target_sections: target_sections || ['*'],
        max_attempts_override: max_attempts_override || null,
        is_active: false,
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, session: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: ลบ session
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

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}