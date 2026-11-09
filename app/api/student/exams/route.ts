import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: ดึงรอบสอบที่เปิดอยู่สำหรับนักศึกษา
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('student_id')

    if (!studentId) {
      return NextResponse.json({ error: 'ต้องระบุ student_id' }, { status: 400 })
    }

    // 1. ดึงข้อมูลนักศึกษา
    const { data: student } = await supabase
      .from('students')
      .select('id, student_code, full_name')
      .eq('id', studentId)
      .single()

    if (!student) {
      return NextResponse.json({ error: 'ไม่พบนักศึกษา' }, { status: 404 })
    }

    // 2. ดึงวิชาที่นักศึกษาลงทะเบียน
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('course_id, section, courses(course_code, course_name)')
      .eq('student_id', studentId)

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ exams: [], student })
    }

    const enrolledCourseIds = enrollments.map((e: any) => e.course_id)

    // 3. ดึงข้อสอบที่นักศึกษาลงทะเบียนวิชา
    const { data: exams } = await supabase
      .from('exams')
      .select(`
        id,
        course_code,
        title,
        description,
        exam_type,
        duration_minutes,
        passing_score,
        max_attempts,
        shuffle_questions,
        shuffle_options,
        courses(course_code, course_name),
        exam_sessions(
          id,
          title,
          time_mode,
          start_time,
          end_time,
          target_sections,
          max_attempts_override,
          is_active
        )
      `)
      .in('course_id', enrolledCourseIds)
      .eq('is_active', true)

    if (!exams) {
      return NextResponse.json({ exams: [], student })
    }

    // 4. กรอง sessions ที่ active, อยู่ในช่วงเวลา, และ ⭐ ยังทำไม่ครบจำนวนครั้ง
    const now = new Date()
    const availableExams = []

    for (const exam of exams) {
      const availableSessions = []
      
      for (const session of exam.exam_sessions || []) {
        if (!session.is_active) continue

        const startTime = new Date(session.start_time)
        const endTime = new Date(session.end_time)

        // 4.1 ตรวจสอบเวลา
        const isTimeValid = now >= startTime && now <= endTime
        if (!isTimeValid) continue

        // 4.2 ⭐ ตรวจสอบจำนวนครั้งที่ทำไปแล้ว
        const maxAttempts = session.max_attempts_override || exam.max_attempts
        
        const { count: attemptCount, error: countError } = await supabase
          .from('exam_attempts')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id)
          .eq('student_id', studentId)

        if (countError) {
          console.error('Error counting attempts:', countError)
          continue
        }

        // ถ้าจำนวนครั้งที่ทำ (attemptCount) น้อยกว่า จำนวนครั้งที่อนุญาต (maxAttempts)
        // ให้แสดงรอบสอบนี้
        if ((attemptCount || 0) < maxAttempts) {
          availableSessions.push(session)
        }
      }

      // ถ้ามี session ที่ยังทำได้อยู่ ให้เพิ่มข้อสอบนี้ลงในรายการที่จะส่งกลับ
      if (availableSessions.length > 0) {
        availableExams.push({
          ...exam,
          exam_sessions: availableSessions
        })
      }
    }

    return NextResponse.json({ 
      exams: availableExams,
      student: student 
    })
  } catch (error: any) {
    console.error('GET student exams error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}