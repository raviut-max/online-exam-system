import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: ดึงชุดข้อสอบทั้งหมด (พร้อม sessions)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseCode = searchParams.get('course_code') || ''

    let query = supabase
      .from('exams')
      .select(`
        *,
        courses(course_code, course_name),
        exam_sessions(id, title, time_mode, start_time, end_time, is_active, target_sections)
      `)
      .order('created_at', { ascending: false })

    if (courseCode) {
      query = query.eq('course_code', courseCode)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json({ exams: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: สร้างชุดข้อสอบใหม่
export async function POST(request: Request) {
  try {
    const {
      course_id,
      title,
      description,
      exam_type,
      duration_minutes,
      passing_score,
      max_attempts,
      shuffle_questions,
      shuffle_options,
    } = await request.json()

    if (!course_id || !title || !duration_minutes || !passing_score) {
      return NextResponse.json({ 
        error: 'กรุณากรอกข้อมูลให้ครบถ้วน (วิชา, ชื่อข้อสอบ, เวลา, คะแนนผ่าน)' 
      }, { status: 400 })
    }

    // ดึง course_code จาก course_id
    const { data: course } = await supabase
      .from('courses')
      .select('course_code')
      .eq('id', course_id)
      .single()

    if (!course) {
      return NextResponse.json({ error: 'ไม่พบวิชา' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('exams')
      .insert([{
        course_id,
        course_code: course.course_code,
        title,
        description: description || '',
        exam_type: exam_type || 'midterm',
        duration_minutes: parseInt(duration_minutes),
        passing_score: parseInt(passing_score),
        max_attempts: max_attempts || 1,
        shuffle_questions: shuffle_questions || false,
        shuffle_options: shuffle_options || false,
        is_active: true,
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, exam: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: ลบชุดข้อสอบ
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ไม่พบ ID ข้อสอบ' }, { status: 400 })
    }

    const { error } = await supabase
      .from('exams')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}